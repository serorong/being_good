/* ──────────────────────────────────────────────────────────────
   모두의 도서관 Firestore 스토어.
   - /state/* 는 교사만 쓰기라서, 학생 본인이 쓰는 좌석 상태·독서 기록은
     /gifts 와 같은 방식의 별도 루트 컬렉션을 쓴다 (collections.ts 패턴).
   - 학급 규모가 작아 컬렉션 전체를 구독하고 클라이언트에서 필터.
   ────────────────────────────────────────────────────────────── */
import { useEffect, useSyncExternalStore } from 'react'
import { collection, deleteDoc, doc, onSnapshot, setDoc, type CollectionReference } from 'firebase/firestore'
import { db, onSignedIn } from '../firebase'
import { AWAY_MS, STALE_MS, type LibActivity, type LibBook, type LibRecord, type LibSession, type LibStatus } from './types'

type Listener = () => void

function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(v => stripUndefined(v)) as unknown as T
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[k] = stripUndefined(v)
    }
    return out as unknown as T
  }
  return value
}

class CollectionStore<T extends { id: string }> {
  private listeners = new Set<Listener>()
  private snapshot: T[] = []
  private colRef: CollectionReference
  private listening = false

  constructor(private path: string) {
    this.colRef = collection(db, path)
    onSignedIn(() => this.start())
  }
  private start() {
    if (this.listening) return
    this.listening = true
    try {
      onSnapshot(
        this.colRef,
        snap => {
          const arr: T[] = []
          snap.forEach(d => arr.push({ ...(d.data() as T), id: d.id }))
          this.snapshot = arr
          this.listeners.forEach(l => l())
        },
        err => console.error(`[library] ${this.path} listen error:`, err),
      )
    } catch (e) {
      console.error(`[library] ${this.path} onSnapshot setup:`, e)
    }
  }
  get = (): T[] => this.snapshot
  subscribe = (l: Listener) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }

  put = async (item: T) => {
    try { await setDoc(doc(this.colRef, item.id), stripUndefined(item) as unknown as Record<string, unknown>) }
    catch (e) { console.error(`[library] ${this.path} put failed:`, e) }
  }
  merge = async (id: string, patch: Partial<T>) => {
    try { await setDoc(doc(this.colRef, id), stripUndefined(patch) as unknown as Record<string, unknown>, { merge: true }) }
    catch (e) { console.error(`[library] ${this.path} merge failed:`, e) }
  }
  remove = async (id: string) => {
    try { await deleteDoc(doc(this.colRef, id)) }
    catch (e) { console.error(`[library] ${this.path} delete failed:`, e) }
  }
}

const statusStore = new CollectionStore<LibStatus>('library_status')
const recordsStore = new CollectionStore<LibRecord>('library_records')
const activitiesStore = new CollectionStore<LibActivity>('library_activities')

const mkId = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const nowIso = () => new Date().toISOString()
export const todayYmd = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ── 구독 훅 ── */

export function useLibStatuses(): LibStatus[] {
  return useSyncExternalStore(statusStore.subscribe, statusStore.get, () => [])
}
export function useLibRecords(): LibRecord[] {
  return useSyncExternalStore(recordsStore.subscribe, recordsStore.get, () => [])
}
export function useLibActivities(): LibActivity[] {
  return useSyncExternalStore(activitiesStore.subscribe, activitiesStore.get, () => [])
}

/* ── 상태 판정 헬퍼 ── */

/** heartbeat 기준으로 화면에 보여줄 상태. stale이면 자리에 없다고 본다. */
export function liveness(st: LibStatus, now: number): 'reading' | 'idle' | 'away' | 'gone' {
  const hb = Date.parse(st.heartbeatAt || st.updatedAt || '') || 0
  if (st.seat === null || now - hb > STALE_MS) return 'gone'
  if (now - hb > AWAY_MS) return 'away'
  return st.mode
}

/** 타이머 경과(ms). 일시정지 시간은 뺀다. */
export function elapsedMs(st: LibStatus, now: number): number {
  if (!st.startedAt) return 0
  const start = Date.parse(st.startedAt)
  const paused = (st.pausedMs ?? 0) + (st.pausedAt ? now - Date.parse(st.pausedAt) : 0)
  return Math.max(0, now - start - paused)
}

/* ── 좌석·타이머 조작 (모두 "내" 문서만 만진다) ── */

export async function sitDown(sid: string, seat: number) {
  const prev = statusStore.get().find(s => s.sid === sid)
  // 타이머가 돌고 있으면 자리만 옮기고 독서는 계속
  await statusStore.put({
    ...(prev ?? {}),
    id: sid, sid, seat, mode: prev?.startedAt ? prev.mode : 'idle',
    heartbeatAt: nowIso(), updatedAt: nowIso(),
  } as LibStatus)
}

export async function leaveSeat(sid: string) {
  await statusStore.remove(sid)
}

export async function heartbeat(sid: string) {
  const cur = statusStore.get().find(s => s.sid === sid)
  if (!cur || cur.seat === null) return
  await statusStore.merge(sid, { heartbeatAt: nowIso() })
}

export async function startReading(sid: string, book: LibBook, recordId: string, targetMinutes: number) {
  await statusStore.merge(sid, {
    mode: 'reading', book, recordId,
    startedAt: nowIso(), targetMinutes,
    pausedAt: undefined, pausedMs: 0,
    heartbeatAt: nowIso(), updatedAt: nowIso(),
  } as Partial<LibStatus>)
}

export async function pauseReading(sid: string) {
  await statusStore.merge(sid, { pausedAt: nowIso(), heartbeatAt: nowIso(), updatedAt: nowIso() })
}

export async function resumeReading(sid: string) {
  const cur = statusStore.get().find(s => s.sid === sid)
  if (!cur?.pausedAt) return
  const add = Date.now() - Date.parse(cur.pausedAt)
  // merge는 undefined를 무시하므로 pausedAt 해제는 문서 전체 put으로
  await statusStore.put({ ...cur, pausedAt: undefined, pausedMs: (cur.pausedMs ?? 0) + add, heartbeatAt: nowIso(), updatedAt: nowIso() })
}

/** 타이머 종료 → 세션을 기록에 저장하고 좌석은 대기 모드로 */
export async function finishReading(sid: string, opts: { endPage?: number; finished?: boolean }) {
  const cur = statusStore.get().find(s => s.sid === sid)
  if (!cur?.startedAt || !cur.recordId) return
  const minutes = Math.max(1, Math.round(elapsedMs(cur, Date.now()) / 60000))
  const session: LibSession = { date: todayYmd(), minutes, ...(opts.endPage !== undefined ? { endPage: opts.endPage } : {}) }

  const rec = recordsStore.get().find(r => r.id === cur.recordId)
  if (rec) {
    await recordsStore.put({
      ...rec,
      sessions: [...rec.sessions, session],
      currentPage: opts.endPage ?? rec.currentPage,
      finished: opts.finished ?? rec.finished,
      updatedAt: nowIso(),
    })
  }
  await statusStore.put({
    id: sid, sid, seat: cur.seat, mode: 'idle', book: cur.book, recordId: cur.recordId,
    heartbeatAt: nowIso(), updatedAt: nowIso(),
  } as LibStatus)
}

/** 교사: 모든 자리 비우기 */
export async function clearAllSeats() {
  await Promise.all(statusStore.get().map(s => statusStore.remove(s.id)))
}

/* ── 독서 기록 ── */

/** 같은 책 기록이 있으면 재사용, 없으면 새로 만든다. */
export async function getOrCreateRecord(sid: string, book: LibBook): Promise<LibRecord> {
  const found = recordsStore.get().find(r =>
    r.sid === sid && (book.isbn ? r.book.isbn === book.isbn : r.book.title === book.title))
  if (found) return found
  const rec: LibRecord = {
    id: mkId('rec'), sid, book, sessions: [], currentPage: 0,
    createdAt: nowIso(), updatedAt: nowIso(),
  }
  await recordsStore.put(rec)
  return rec
}

export const removeRecord = (id: string) => recordsStore.remove(id)

/* ── 독후활동 ── */

export async function addActivity(a: Omit<LibActivity, 'id' | 'createdAt'>): Promise<void> {
  await activitiesStore.put({ ...a, id: mkId('act'), createdAt: nowIso() })
}
export async function updateActivity(a: LibActivity): Promise<void> {
  await activitiesStore.put(a)
}
export const removeActivity = (id: string) => activitiesStore.remove(id)

/* ── 하트비트 훅 — 자리에 앉아 있는 동안 1분마다 갱신 ── */

export function useHeartbeat(sid: string | undefined, seated: boolean) {
  useEffect(() => {
    if (!sid || !seated) return
    void heartbeat(sid)
    const t = setInterval(() => { void heartbeat(sid) }, 60_000)
    return () => clearInterval(t)
  }, [sid, seated])
}
