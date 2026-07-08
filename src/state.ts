import { useCallback, useSyncExternalStore } from 'react'
import {
  collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, writeBatch,
  type CollectionReference, type DocumentReference,
} from 'firebase/firestore'
import { db, onSignedIn } from './firebase'
import { DEFAULT_AGORA_TOPICS, DEFAULT_CUSTOM_TITLES, DEFAULT_MISSIONS, MOCK_STUDENTS, levelFromXp, themesUnlockedAt, itemsUnlockedAt } from './data'
import type { AgoraPost, AgoraTopic, CustomTitle, DailyFeature, JoinRequest, MiniGroup, Mission, Notice, Offering, Student, StudentState, StudentStateMap } from './types'

type Listener = () => void

/**
 * Firestore는 `undefined` 값을 가진 필드를 거부한다.
 * 객체/배열 트리에서 undefined 값을 재귀적으로 제거한 새 구조를 반환.
 * (null, 0, '', false 등은 보존)
 */
function stripUndefined<T>(value: T): T {
  if (value === undefined) return value
  if (value === null) return value
  if (Array.isArray(value)) {
    return value.map(v => stripUndefined(v)) as unknown as T
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as Record<string, unknown>)) {
      const v = (value as Record<string, unknown>)[k]
      if (v === undefined) continue
      out[k] = stripUndefined(v)
    }
    return out as unknown as T
  }
  return value
}

/**
 * Firestore + LocalStorage 캐시 하이브리드 스토어.
 *  - 부팅 시 LocalStorage 캐시로 즉시 UI 채우기
 *  - Firestore onSnapshot으로 실시간 동기화
 *  - set() 호출 시: 로컬 스냅샷 즉시 반영(낙관) → Firestore 쓰기
 *
 * Firestore 컬렉션: /state/{key}  (각 키마다 { value: T } 단일 문서)
 */
class Store<T> {
  private listeners = new Set<Listener>()
  private snapshot: T
  private docRef: DocumentReference
  private cacheKey: string
  private listening = false

  constructor(private key: string, private fallback: T) {
    this.cacheKey = `divine-classroom.${key}.v1`
    this.snapshot = this.loadCache() ?? fallback
    this.docRef = doc(db, 'state', key)

    // 구글 로그인 이후에만 구독을 시작한다(익명 인증 미사용 → 로그인 전엔 읽기 권한 없음).
    onSignedIn(() => this.startListening())
  }

  private startListening() {
    if (this.listening) return
    this.listening = true
    try {
      onSnapshot(
        this.docRef,
        snap => {
          if (snap.exists()) {
            const v = (snap.data()?.value as T) ?? this.fallback
            this.snapshot = v
            this.saveCache(v)
            this.notify()
          } else {
            // 최초 1회: 현재(캐시 또는 fallback) 값으로 시드
            setDoc(this.docRef, { value: stripUndefined(this.snapshot) }).catch(err =>
              console.error(`[state] seed ${this.key} failed:`, err)
            )
          }
        },
        err => console.error(`[state] listen ${this.key} error:`, err)
      )
    } catch (e) {
      console.error(`[state] onSnapshot setup ${this.key}:`, e)
    }
  }

  private loadCache(): T | null {
    try {
      const raw = localStorage.getItem(this.cacheKey)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }

  private saveCache(v: T) {
    try { localStorage.setItem(this.cacheKey, JSON.stringify(v)) } catch {}
  }

  private notify() {
    this.listeners.forEach(l => l())
  }

  get = (): T => this.snapshot

  set = (updater: T | ((prev: T) => T), onError?: (e: unknown) => void) => {
    const next = typeof updater === 'function' ? (updater as (p: T) => T)(this.snapshot) : updater
    this.snapshot = next
    this.saveCache(next)
    this.notify()
    // Firestore는 undefined 필드를 거부하므로 재귀적으로 제거 후 전송
    setDoc(this.docRef, { value: stripUndefined(next) }).catch(err => {
      console.error(`[state] write ${this.key} failed:`, err)
      onError?.(err)
    })
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }
}

const noticesStore     = new Store<Notice[]>('notices', [])
const offeringsStore   = new Store<Offering[]>('offerings', [])
const titlesStore      = new Store<CustomTitle[]>('titles', DEFAULT_CUSTOM_TITLES)
const missionsStore    = new Store<Mission[]>('missions', DEFAULT_MISSIONS)
const agoraTopicsStore = new Store<AgoraTopic[]>('agora_topics', DEFAULT_AGORA_TOPICS)
const agoraPostsStore  = new Store<AgoraPost[]>('agora_posts', [])
const rosterStore      = new Store<Student[]>('roster', MOCK_STUDENTS)
const studentEmailMapStore = new Store<Record<string, string>>('student_email_map', {})
const dailyFeatureStore = new Store<DailyFeature | null>('daily_feature', null)
const miniGroupsStore  = new Store<MiniGroup[]>('miniroom_groups', [])

/**
 * 학생 상태 — 단일 문서 → 학생별 문서 컬렉션으로 전환된 하이브리드 스토어.
 *
 *  - 신: students_v2/{sid} 컬렉션 (학생당 한 문서)
 *  - 구: state/students_state 단일 문서 (legacy fallback)
 *
 *  동작:
 *   1) 두 곳을 동시에 onSnapshot으로 구독한다. 새 컬렉션이 비어 있는 동안은
 *      legacy 단일 문서를 그대로 보여준다 (데이터가 사라지는 순간이 없음).
 *   2) 새 컬렉션이 비어 있고 legacy에 데이터가 있으면, 첫 응답을 받자마자
 *      자동으로 1회 batch 복사 (마이그레이션).
 *   3) 새 컬렉션이 채워지면 legacy 구독을 자동으로 unsubscribe (cutover).
 *      이후 모든 read/write는 학생별 문서만 대상으로 한다.
 *   4) set 호출 시 prev/next를 비교해 변경/추가/삭제된 sid만 학생별 문서에 write.
 *      30명 중 1명이 변경되어도 1개 문서만 전송된다 (기존: 전체 30명 페이로드 재전송).
 */
class StudentsHybridStore {
  private listeners = new Set<Listener>()
  private cacheKey = 'divine-classroom.students_state.v1'
  private snapshot: StudentStateMap

  private colRef: CollectionReference
  private legacyDocRef: DocumentReference

  private collectionMap: StudentStateMap = {}
  private collectionReceived = false
  private legacyMap: StudentStateMap = {}
  private legacyReceived = false

  private legacyUnsub: (() => void) | null = null
  private migrationAttempted = false
  private listening = false

  constructor() {
    this.snapshot = this.loadCache() ?? {}
    this.colRef = collection(db, 'students_v2')
    this.legacyDocRef = doc(db, 'state', 'students_state')
    // 구글 로그인 이후에만 구독을 시작한다(익명 인증 미사용).
    onSignedIn(() => this.startListening())
  }

  private startListening() {
    if (this.listening) return
    this.listening = true
    // 컬렉션 구독 — 항상 활성
    try {
      onSnapshot(
        this.colRef,
        snap => {
          const map: StudentStateMap = {}
          snap.forEach(d => { map[d.id] = d.data() as StudentState })
          this.collectionMap = map
          this.collectionReceived = true
          this.recompute()
          this.maybeMigrateAndCutover()
        },
        err => console.error('[state] students_v2 listen error:', err),
      )
    } catch (e) {
      console.error('[state] students_v2 onSnapshot setup:', e)
    }

    // legacy 단일 문서 구독 — 컬렉션이 채워지면 unsubscribe
    try {
      this.legacyUnsub = onSnapshot(
        this.legacyDocRef,
        snap => {
          this.legacyMap = snap.exists() ? ((snap.data()?.value as StudentStateMap) ?? {}) : {}
          this.legacyReceived = true
          this.recompute()
          this.maybeMigrateAndCutover()
        },
        err => console.error('[state] students_state(legacy) listen error:', err),
      )
    } catch (e) {
      console.error('[state] legacy onSnapshot setup:', e)
    }
  }

  private isCollectionPopulated() {
    return this.collectionReceived && Object.keys(this.collectionMap).length > 0
  }

  private recompute() {
    const next: StudentStateMap = this.isCollectionPopulated() ? this.collectionMap : this.legacyMap
    if (next === this.snapshot) return
    this.snapshot = next
    this.saveCache(next)
    this.notify()
  }

  private async maybeMigrateAndCutover() {
    // 마이그: 컬렉션 비어있고 legacy에 데이터 있음 → 1회 자동 복사
    if (
      !this.migrationAttempted &&
      this.collectionReceived && Object.keys(this.collectionMap).length === 0 &&
      this.legacyReceived && Object.keys(this.legacyMap).length > 0
    ) {
      this.migrationAttempted = true
      try {
        const entries = Object.entries(this.legacyMap)
        // Firestore batch 한도 500. 30명 학급에선 한 번에 처리되지만 안전하게 500개씩 끊음.
        for (let i = 0; i < entries.length; i += 500) {
          const batch = writeBatch(db)
          for (const [sid, state] of entries.slice(i, i + 500)) {
            batch.set(doc(this.colRef, sid), stripUndefined(state) as unknown as Record<string, unknown>)
          }
          await batch.commit()
        }
        console.info(`[state] migrated ${entries.length} students to students_v2`)
      } catch (e) {
        console.error('[state] migration failed:', e)
        this.migrationAttempted = false // 다음 onSnapshot 호출 시 재시도
      }
    }

    // cutover: 컬렉션이 채워지면 legacy 구독 종료
    if (this.isCollectionPopulated() && this.legacyUnsub) {
      this.legacyUnsub()
      this.legacyUnsub = null
    }
  }

  private loadCache(): StudentStateMap | null {
    try {
      const raw = localStorage.getItem(this.cacheKey)
      return raw ? (JSON.parse(raw) as StudentStateMap) : null
    } catch { return null }
  }
  private saveCache(v: StudentStateMap) {
    try { localStorage.setItem(this.cacheKey, JSON.stringify(v)) } catch {}
  }
  private notify() { this.listeners.forEach(l => l()) }

  get = (): StudentStateMap => this.snapshot

  set = (
    updater: StudentStateMap | ((prev: StudentStateMap) => StudentStateMap),
    onError?: (e: unknown) => void,
  ) => {
    const prev = this.snapshot
    const next = typeof updater === 'function' ? (updater as (p: StudentStateMap) => StudentStateMap)(prev) : updater
    this.snapshot = next
    this.saveCache(next)
    this.notify()

    // 학생별 문서에 변경분만 write
    const prevKeys = new Set(Object.keys(prev))
    const nextKeys = new Set(Object.keys(next))
    const ops: Promise<unknown>[] = []
    for (const sid of nextKeys) {
      if (prev[sid] !== next[sid]) {
        ops.push(setDoc(doc(this.colRef, sid), stripUndefined(next[sid]) as unknown as Record<string, unknown>))
      }
    }
    for (const sid of prevKeys) {
      if (!nextKeys.has(sid)) ops.push(deleteDoc(doc(this.colRef, sid)))
    }
    Promise.all(ops).catch(err => {
      console.error('[state] students_v2 write failed:', err)
      onError?.(err)
    })

    // legacy double-write — 컬렉션이 아직 채워지지 않은 transition 동안만
    if (!this.isCollectionPopulated()) {
      setDoc(this.legacyDocRef, { value: stripUndefined(next) }).catch(err =>
        console.error('[state] students_state(legacy) write failed:', err),
      )
    }
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }
}

const studentsStore = new StudentsHybridStore()

export function useNotices() {
  const value = useSyncExternalStore<Notice[]>(noticesStore.subscribe, noticesStore.get, () => [])
  return [value, noticesStore.set] as const
}

export function useOfferings() {
  const value = useSyncExternalStore<Offering[]>(offeringsStore.subscribe, offeringsStore.get, () => [])
  return [value, offeringsStore.set] as const
}

export function useCustomTitles() {
  const value = useSyncExternalStore(titlesStore.subscribe, titlesStore.get, () => DEFAULT_CUSTOM_TITLES)
  return [value, titlesStore.set] as const
}

export function useMissions() {
  const value = useSyncExternalStore(missionsStore.subscribe, missionsStore.get, () => DEFAULT_MISSIONS)
  return [value, missionsStore.set] as const
}

export function useAgoraTopics() {
  const value = useSyncExternalStore(agoraTopicsStore.subscribe, agoraTopicsStore.get, () => DEFAULT_AGORA_TOPICS)
  return [value, agoraTopicsStore.set] as const
}

export function useAgoraPosts() {
  const value = useSyncExternalStore<AgoraPost[]>(agoraPostsStore.subscribe, agoraPostsStore.get, () => [])
  return [value, agoraPostsStore.set] as const
}

// 명단 (학급관리에서 추가/삭제 가능). Firestore에 저장됨.
export function useRoster() {
  return useSyncExternalStore(rosterStore.subscribe, rosterStore.get, () => MOCK_STUDENTS)
}
export const setRoster = rosterStore.set
export const currentRoster = (): Student[] => rosterStore.get()

/* ──────────────── 학생 구글 계정 ↔ 학생 코드 매핑 ────────────────
 * key: 이메일(소문자) → value: 학생 코드 (예: "god01")
 * 학생이 처음 구글 로그인할 때 본인 코드를 입력해 매핑을 만들고, 다음부터 자동 입장.
 */
export function useStudentEmailMap() {
  const value = useSyncExternalStore<Record<string, string>>(
    studentEmailMapStore.subscribe, studentEmailMapStore.get, () => ({}),
  )
  return [value, studentEmailMapStore.set] as const
}
export const currentStudentEmailMap = (): Record<string, string> => studentEmailMapStore.get()
export const setStudentEmailMap = studentEmailMapStore.set

/* ──────────────── 오늘의 일력 명언 (교사 선정) ──────────────── */
export function useDailyFeature() {
  return useSyncExternalStore<DailyFeature | null>(dailyFeatureStore.subscribe, dailyFeatureStore.get, () => null)
}
export const setDailyFeature = dailyFeatureStore.set

/* ──────────────── 미니룸 모둠 (교사 지정) ──────────────── */
export function useMiniGroups() {
  return useSyncExternalStore<MiniGroup[]>(miniGroupsStore.subscribe, miniGroupsStore.get, () => [])
}
export const setMiniGroups = miniGroupsStore.set
export const currentMiniGroups = (): MiniGroup[] => miniGroupsStore.get()

/* ──────────────── 학생 입장 신청 (승인 대기열) ────────────────
 * /join_requests/{email} 컬렉션. 학생은 자기 이메일 문서만 작성하고,
 * 교사가 승인하면 student_email_map에 매핑이 확정된 뒤 신청이 삭제된다.
 * 데이터(students_v2/{sid})는 자리(sid)에 묶여 있으므로 이메일이 바뀌어도 보존된다.
 */
class JoinRequestsStore {
  private listeners = new Set<Listener>()
  private snapshot: Record<string, JoinRequest> = {}
  private colRef: CollectionReference = collection(db, 'join_requests')
  private unsub: (() => void) | null = null
  private authUnsub: (() => void) | null = null

  // 첫 구독 시에만 컬렉션 전체를 리슨한다(전체 list 권한은 교사만 — 교사 화면에서만 마운트됨).
  private startListening() {
    if (this.unsub) return
    try {
      this.unsub = onSnapshot(
        this.colRef,
        snap => {
          const m: Record<string, JoinRequest> = {}
          snap.forEach(d => { m[d.id] = d.data() as JoinRequest })
          this.snapshot = m
          this.notify()
        },
        err => console.error('[state] join_requests listen error:', err),
      )
    } catch (e) {
      console.error('[state] join_requests onSnapshot setup:', e)
    }
  }

  private notify() { this.listeners.forEach(l => l()) }

  get = (): Record<string, JoinRequest> => this.snapshot

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    // 로그인(교사) 이후에 컬렉션 구독을 시작한다.
    if (!this.authUnsub) this.authUnsub = onSignedIn(() => this.startListening())
    return () => { this.listeners.delete(l) }
  }
}
const joinRequestsStore = new JoinRequestsStore()

/** 구글 세션으로 student_email_map을 직접 읽어, 이 이메일에 매핑된 자리(sid)를 반환. 없으면 null.
 *  스토어 구독 타이밍과 무관하게 항상 최신 매핑을 확인할 수 있다. */
export async function getMappedSid(email: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'state', 'student_email_map'))
    const map = (snap.exists() ? (snap.data()?.value as Record<string, string>) : null) ?? {}
    return map[email] ?? null
  } catch (e) {
    console.error('[state] getMappedSid failed:', e)
    return null
  }
}

/** 교사용 — 대기 중인 입장 신청 전체 구독. */
export function useJoinRequests(): Record<string, JoinRequest> {
  return useSyncExternalStore(joinRequestsStore.subscribe, joinRequestsStore.get, () => ({}))
}

/** 학생용 — 입장 신청 제출(본인 이메일 문서). */
export async function submitJoinRequest(req: JoinRequest): Promise<void> {
  await setDoc(doc(db, 'join_requests', req.email), stripUndefined(req) as unknown as Record<string, unknown>)
}

/** 학생용 — 본인 신청을 직접 조회(대기 중인지 확인). 없으면 null. */
export async function getMyJoinRequest(email: string): Promise<JoinRequest | null> {
  try {
    const snap = await getDoc(doc(db, 'join_requests', email))
    return snap.exists() ? (snap.data() as JoinRequest) : null
  } catch (e) {
    console.error('[state] getMyJoinRequest failed:', e)
    return null
  }
}

/**
 * 교사용 — 입장 승인. 매핑을 확정하고 신청을 삭제한다.
 * 같은 자리(sid)를 쓰던 기존 이메일과 같은 이메일의 기존 자리는 자동으로 정리(재지정)된다.
 * → 데이터(students_v2/{sid})는 그대로 두고 "출입 열쇠"만 교체한다.
 */
export async function approveJoinRequest(req: JoinRequest): Promise<void> {
  setStudentEmailMap(prev => {
    const next: Record<string, string> = {}
    for (const [em, sid] of Object.entries(prev)) {
      if (sid === req.studentId) continue   // 이 자리에 묶인 기존 열쇠 회수
      if (em === req.email) continue          // 이 이메일의 기존 자리 해제
      next[em] = sid
    }
    next[req.email] = req.studentId
    return next
  })
  await deleteDoc(doc(db, 'join_requests', req.email)).catch(e =>
    console.error('[state] approve: delete request failed:', e))
}

/** 교사용 — 입장 거절. 신청만 삭제한다. */
export async function rejectJoinRequest(email: string): Promise<void> {
  await deleteDoc(doc(db, 'join_requests', email)).catch(e =>
    console.error('[state] reject failed:', e))
}

export function useStudentStateMap() {
  const map = useSyncExternalStore<StudentStateMap>(studentsStore.subscribe, studentsStore.get, () => ({} as StudentStateMap))
  const setMap = studentsStore.set

  const emptyState = (): StudentState => ({
    ownedItemIds: [],
    ownedTitleIds: [],
    missions: [],
    sanctuary: [],
  })

  const get = useCallback((id: string): StudentState => map[id] ?? emptyState(), [map])

  const update = useCallback((id: string, updater: (s: StudentState) => StudentState, onError?: (e: unknown) => void) => {
    setMap(prev => {
      const cur = prev[id] ?? emptyState()
      return { ...prev, [id]: updater(cur) }
    }, onError)
  }, [setMap])

  return { map, setMap, get, update } as const
}

export function effectiveCookies(studentId: string, map: StudentStateMap): number {
  const base = rosterStore.get().find(s => s.id === studentId)?.cookies ?? 0
  const ov = map[studentId]?.cookies
  return ov ?? base
}

/** 누적(평생) 쿠키.
 *  - 상점 구매로는 줄지 않음 (purchaseShopItem이 lifetime을 건드리지 않음).
 *  - 교사 쿠키 조정으로는 +/- 양쪽 모두 반영됨.
 *  - 데이터 정합성: 최소한 (현재 잔액 + 지금까지 상점에서 쓴 쿠키 합) 이상이어야 한다.
 *    과거 race로 stored 값이 작아진 경우를 자동 보정한다.
 */
export function lifetimeCookiesOf(studentId: string, map: StudentStateMap): number {
  const cur = map[studentId]
  const cookies = effectiveCookies(studentId, map)
  if (!cur) return cookies
  const spent = (cur.purchases ?? []).reduce((sum, p) => sum + (p.cost ?? 0), 0)
  const minimum = cookies + spent
  return Math.max(cur.lifetimeCookies ?? cookies, minimum)
}

/** 쿠키 획득. cookies(잔액) + lifetimeCookies(누적) 둘 다 증가. */
export function gainCookies(sid: string, amount: number) {
  if (!sid || !amount) return
  studentsStore.set(prev => {
    const cur = prev[sid] ?? emptyState()
    const baseCookies = rosterStore.get().find(s => s.id === sid)?.cookies ?? 0
    const oldCookies = cur.cookies ?? baseCookies
    const oldLife    = cur.lifetimeCookies ?? oldCookies
    return {
      ...prev,
      [sid]: {
        ...cur,
        cookies: oldCookies + amount,
        lifetimeCookies: oldLife + amount,
      },
    }
  })
}

/** 쿠키 차감 (상점 구매). 잔액만 감소, 누적은 그대로. 잔액 부족이면 false 반환. */
export function spendCookies(sid: string, amount: number): boolean {
  if (!sid || amount <= 0) return false
  const cur = studentsStore.get()[sid] ?? emptyState()
  const baseCookies = rosterStore.get().find(s => s.id === sid)?.cookies ?? 0
  const oldCookies = cur.cookies ?? baseCookies
  if (oldCookies < amount) return false
  studentsStore.set(prev => {
    const c = prev[sid] ?? emptyState()
    const base = rosterStore.get().find(s => s.id === sid)?.cookies ?? 0
    const oc = c.cookies ?? base
    const ol = c.lifetimeCookies ?? oc
    return {
      ...prev,
      [sid]: {
        ...c,
        cookies: Math.max(0, oc - amount),
        lifetimeCookies: ol,                  // 누적은 유지
      },
    }
  })
  return true
}

/** 상점 구매 기록. cost 만큼 차감 + 구매 이력에 추가. 성공 여부 반환.
 *
 * 한 번의 set 호출로 차감과 기록 추가를 동시에 처리한다.
 * 학생별 문서 분리 후엔 set마다 별도 Firestore write가 발사되므로,
 * 두 번 나눠 쓰면 동시 write 도착 순서에 따라 purchases가 덮어써져 사라지는 race condition이 있었다.
 */
export function purchaseShopItem(sid: string, item: { id: string; name: string; icon?: string; cost: number }): boolean {
  if (!sid || item.cost <= 0) return false
  const cur = studentsStore.get()[sid] ?? emptyState()
  const baseCookies = rosterStore.get().find(s => s.id === sid)?.cookies ?? 0
  const oldCookies = cur.cookies ?? baseCookies
  if (oldCookies < item.cost) return false

  studentsStore.set(prev => {
    const c = prev[sid] ?? emptyState()
    const base = rosterStore.get().find(s => s.id === sid)?.cookies ?? 0
    const oc = c.cookies ?? base
    if (oc < item.cost) return prev  // 동시 호출 방어
    const ol = c.lifetimeCookies ?? oc
    return {
      ...prev,
      [sid]: {
        ...c,
        cookies: Math.max(0, oc - item.cost),
        lifetimeCookies: ol,  // 누적 유지
        purchases: [
          ...(c.purchases ?? []),
          {
            id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            itemId: item.id,
            itemName: item.name,
            icon: item.icon,
            cost: item.cost,
            purchasedAt: new Date().toISOString(),
          },
        ],
      },
    }
  })
  return true
}

/* ──────────────── 레벨/XP 헬퍼 ──────────────── */

const emptyState = (): StudentState => ({
  ownedItemIds: [], ownedTitleIds: [], missions: [], sanctuary: [],
})

/** XP 누적. 레벨업 시 잠금해제 테마/아이템을 자동으로 추가. 마지막 새 레벨을 반환 (없으면 null). */
export function gainXp(sid: string, amount: number): { from: number; to: number } | null {
  if (!sid || !amount) return null
  let result: { from: number; to: number } | null = null
  studentsStore.set(prev => {
    const cur = prev[sid] ?? emptyState()
    const oldXp = cur.xp ?? 0
    const newXp = Math.max(0, oldXp + amount)
    const oldLvl = levelFromXp(oldXp).level
    const newLvl = levelFromXp(newXp).level
    let unlockedThemes = cur.unlockedThemes ?? themesUnlockedAt(oldLvl)
    let ownedItemIds = cur.ownedItemIds
    if (newLvl > oldLvl) {
      const themes = themesUnlockedAt(newLvl)
      unlockedThemes = Array.from(new Set([...unlockedThemes, ...themes]))
      const items = itemsUnlockedAt(newLvl).filter(id => !ownedItemIds.includes(id))
      if (items.length > 0) ownedItemIds = [...ownedItemIds, ...items]
      result = { from: oldLvl, to: newLvl }
    }
    return { ...prev, [sid]: { ...cur, xp: newXp, unlockedThemes, ownedItemIds } }
  })
  return result
}

/** 학생이 매일 1회 받을 수 있는 제물 송가. 오늘 이미 받았으면 null 반환. */
export function claimDailyOffering(sid: string, today: string, itemId: string): boolean {
  const cur = studentsStore.get()[sid] ?? emptyState()
  if (cur.lastOfferingAt === today) return false
  studentsStore.set(prev => {
    const c = prev[sid] ?? emptyState()
    if (c.lastOfferingAt === today) return prev
    return {
      ...prev,
      [sid]: {
        ...c,
        lastOfferingAt: today,
        ownedItemIds: [...c.ownedItemIds, itemId],
      }
    }
  })
  return true
}

/** 학생의 현재 레벨 정보 반환. */
export function studentLevelInfo(sid: string) {
  const cur = studentsStore.get()[sid] ?? emptyState()
  const info = levelFromXp(cur.xp ?? 0)
  return { ...info, xp: cur.xp ?? 0 }
}
