import { useCallback, useContext, useSyncExternalStore } from 'react'
import {
  collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, writeBatch,
  type CollectionReference, type DocumentReference,
} from 'firebase/firestore'
import { db, onSignedIn } from './firebase'
import {
  DEFAULT_AGORA_TOPICS, DEFAULT_CUSTOM_TITLES, DEFAULT_MISSIONS,
  DAILY_TASKS, SHOP_REAL_ITEMS,
  DIVINE_CLASS_ID, MOCK_STUDENTS, levelFromXp, themesUnlockedAt, itemsUnlockedAt,
} from './data'
import type {
  AgoraPost, AgoraTopic, CustomShopItem, CustomTitle, DailyFeature, DailyTaskDef, JoinRequest,
  MiniGroup, Mission, Notice, Offering, Student, StudentState, StudentStateMap,
} from './types'
import { ClassStoresContext, type ClassStoresShape, registerDivineStores } from './classStores'

type Listener = () => void

function stripUndefined<T>(value: T): T {
  if (value === undefined) return value
  if (value === null) return value
  if (Array.isArray(value)) return value.map(v => stripUndefined(v)) as unknown as T
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

/** Firestore + LocalStorage 캐시 하이브리드 스토어. docRef를 외부에서 받는다. */
class Store<T> {
  private listeners = new Set<Listener>()
  private snapshot: T
  private listening = false

  constructor(
    private cacheKey: string,
    private fallback: T,
    private docRef: DocumentReference,
  ) {
    this.snapshot = this.loadCache() ?? fallback
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
            setDoc(this.docRef, { value: stripUndefined(this.snapshot) }).catch(err =>
              console.error(`[state] seed ${this.cacheKey} failed:`, err)
            )
          }
        },
        err => console.error(`[state] listen ${this.cacheKey} error:`, err)
      )
    } catch (e) {
      console.error(`[state] onSnapshot setup ${this.cacheKey}:`, e)
    }
  }

  private loadCache(): T | null {
    try {
      const raw = localStorage.getItem(this.cacheKey)
      return raw ? (JSON.parse(raw) as T) : null
    } catch { return null }
  }
  private saveCache(v: T) {
    try { localStorage.setItem(this.cacheKey, JSON.stringify(v)) } catch {}
  }
  private notify() { this.listeners.forEach(l => l()) }

  get = (): T => this.snapshot
  set = (updater: T | ((prev: T) => T), onError?: (e: unknown) => void) => {
    const next = typeof updater === 'function' ? (updater as (p: T) => T)(this.snapshot) : updater
    this.snapshot = next
    this.saveCache(next)
    this.notify()
    setDoc(this.docRef, { value: stripUndefined(next) }).catch(err => {
      console.error(`[state] write ${this.cacheKey} failed:`, err)
      onError?.(err)
    })
  }
  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }
}

/* ── divine class 스토어 인스턴스 (루트 경로 — 절대 변경 없음) ── */

const noticesStore     = new Store<Notice[]>('divine.notices', [], doc(db, 'state', 'notices'))
const offeringsStore   = new Store<Offering[]>('divine.offerings', [], doc(db, 'state', 'offerings'))
const titlesStore      = new Store<CustomTitle[]>('divine.titles', DEFAULT_CUSTOM_TITLES, doc(db, 'state', 'titles'))
const missionsStore    = new Store<Mission[]>('divine.missions', DEFAULT_MISSIONS, doc(db, 'state', 'missions'))
const agoraTopicsStore = new Store<AgoraTopic[]>('divine.agora_topics', DEFAULT_AGORA_TOPICS, doc(db, 'state', 'agora_topics'))
const agoraPostsStore  = new Store<AgoraPost[]>('divine.agora_posts', [], doc(db, 'state', 'agora_posts'))
const rosterStore      = new Store<Student[]>('divine.roster', MOCK_STUDENTS, doc(db, 'state', 'roster'))
const studentEmailMapStore = new Store<Record<string, string>>('divine.student_email_map', {}, doc(db, 'state', 'student_email_map'))
const dailyFeatureStore = new Store<DailyFeature | null>('divine.daily_feature', null, doc(db, 'state', 'daily_feature'))
const miniGroupsStore  = new Store<MiniGroup[]>('divine.miniroom_groups', [], doc(db, 'state', 'miniroom_groups'))
const dailyTasksStore  = new Store<DailyTaskDef[]>('divine.daily_tasks', DAILY_TASKS, doc(db, 'state', 'daily_tasks'))
const shopItemsStore   = new Store<CustomShopItem[]>('divine.shop_items', SHOP_REAL_ITEMS, doc(db, 'state', 'shop_items'))

/* ── divine 학생 상태 — 하이브리드 스토어 (legacy 마이그레이션 포함) ── */

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

  constructor(private getRoster: () => Student[]) {
    this.snapshot = this.loadCache() ?? {}
    this.colRef = collection(db, 'students_v2')
    this.legacyDocRef = doc(db, 'state', 'students_state')
    onSignedIn(() => this.startListening())
  }

  private startListening() {
    if (this.listening) return
    this.listening = true
    try {
      onSnapshot(this.colRef, snap => {
        const map: StudentStateMap = {}
        snap.forEach(d => { map[d.id] = d.data() as StudentState })
        this.collectionMap = map
        this.collectionReceived = true
        this.recompute()
        this.maybeMigrateAndCutover()
      }, err => console.error('[state] students_v2 listen error:', err))
    } catch (e) { console.error('[state] students_v2 onSnapshot setup:', e) }

    try {
      this.legacyUnsub = onSnapshot(this.legacyDocRef, snap => {
        this.legacyMap = snap.exists() ? ((snap.data()?.value as StudentStateMap) ?? {}) : {}
        this.legacyReceived = true
        this.recompute()
        this.maybeMigrateAndCutover()
      }, err => console.error('[state] students_state(legacy) listen error:', err))
    } catch (e) { console.error('[state] legacy onSnapshot setup:', e) }
  }

  private isCollectionPopulated() {
    return this.collectionReceived && Object.keys(this.collectionMap).length > 0
  }

  private recompute() {
    // students_v2 컬렉션이 도착하기 전에는 기존 스냅샷(캐시)을 유지한다.
    // 옛 단일 문서(students_state)가 먼저 도착해도 절대 화면·캐시에 채택하지 않음 —
    // 옛 문서는 소수 학생만 담긴 낡은 데이터라 나머지 학생이 '초기화'된 것처럼 보인다.
    if (!this.collectionReceived) return
    const next: StudentStateMap = this.isCollectionPopulated() ? this.collectionMap : this.legacyMap
    if (next === this.snapshot) return
    this.snapshot = next
    this.saveCache(next)
    this.notify()
  }

  private async maybeMigrateAndCutover() {
    if (
      !this.migrationAttempted &&
      this.collectionReceived && Object.keys(this.collectionMap).length === 0 &&
      this.legacyReceived && Object.keys(this.legacyMap).length > 0
    ) {
      this.migrationAttempted = true
      try {
        const entries = Object.entries(this.legacyMap)
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
        this.migrationAttempted = false
      }
    }
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
    // 서버 데이터가 도착하기 전의 쓰기는 거부 — 빈 스냅샷 기준으로 만든 기본 상태가
    // 실제 학생 문서(쿠키·일기)를 덮어쓰는 사고를 막는다.
    if (!this.collectionReceived) {
      const err = new Error('학생 데이터를 아직 불러오는 중이에요. 잠시 후 다시 시도해 주세요.')
      console.warn('[state] students write blocked before initial load')
      onError?.(err)
      return
    }
    const prev = this.snapshot
    const next = typeof updater === 'function' ? (updater as (p: StudentStateMap) => StudentStateMap)(prev) : updater
    this.snapshot = next
    this.saveCache(next)
    this.notify()

    const prevKeys = new Set(Object.keys(prev))
    const nextKeys = new Set(Object.keys(next))
    const ops: Promise<unknown>[] = []
    for (const sid of nextKeys) {
      if (prev[sid] !== next[sid])
        ops.push(setDoc(doc(this.colRef, sid), stripUndefined(next[sid]) as unknown as Record<string, unknown>))
    }
    for (const sid of prevKeys) {
      if (!nextKeys.has(sid)) ops.push(deleteDoc(doc(this.colRef, sid)))
    }
    Promise.all(ops).catch(err => {
      console.error('[state] students_v2 write failed:', err)
      onError?.(err)
    })
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }
}

/* ── 비-divine 반용 단순 학생 스토어 ── */

class SimpleStudentsStore {
  private listeners = new Set<Listener>()
  private snapshot: StudentStateMap = {}
  private colRef: CollectionReference
  private cacheKey: string
  private listening = false

  constructor(private classId: string) {
    this.cacheKey = `class.${classId}.students`
    this.colRef = collection(db, 'classes', classId, 'students_v2')
    try {
      const raw = localStorage.getItem(this.cacheKey)
      if (raw) this.snapshot = JSON.parse(raw) as StudentStateMap
    } catch {}
    onSignedIn(() => this.startListening())
  }

  private startListening() {
    if (this.listening) return
    this.listening = true
    try {
      onSnapshot(this.colRef, snap => {
        const map: StudentStateMap = {}
        snap.forEach(d => { map[d.id] = d.data() as StudentState })
        this.snapshot = map
        try { localStorage.setItem(this.cacheKey, JSON.stringify(map)) } catch {}
        this.notify()
      }, err => console.error(`[state] ${this.classId} students listen error:`, err))
    } catch (e) { console.error(`[state] ${this.classId} students onSnapshot setup:`, e) }
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
    try { localStorage.setItem(this.cacheKey, JSON.stringify(next)) } catch {}
    this.notify()

    const prevKeys = new Set(Object.keys(prev))
    const nextKeys = new Set(Object.keys(next))
    const ops: Promise<unknown>[] = []
    for (const sid of nextKeys) {
      if (prev[sid] !== next[sid])
        ops.push(setDoc(doc(this.colRef, sid), stripUndefined(next[sid]) as unknown as Record<string, unknown>))
    }
    for (const sid of prevKeys) {
      if (!nextKeys.has(sid)) ops.push(deleteDoc(doc(this.colRef, sid)))
    }
    Promise.all(ops).catch(err => {
      console.error(`[state] ${this.classId} students write failed:`, err)
      onError?.(err)
    })
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }
}

/* ── 입장 신청 스토어 ── */

class JoinRequestsStore {
  private listeners = new Set<Listener>()
  private snapshot: Record<string, JoinRequest> = {}
  private unsub: (() => void) | null = null

  constructor(private colRef: CollectionReference) {}

  startListening() {
    if (this.unsub) return
    try {
      this.unsub = onSnapshot(this.colRef, snap => {
        const m: Record<string, JoinRequest> = {}
        snap.forEach(d => { m[d.id] = d.data() as JoinRequest })
        this.snapshot = m
        this.notify()
      }, err => console.error('[state] join_requests listen error:', err))
    } catch (e) { console.error('[state] join_requests onSnapshot setup:', e) }
  }

  private notify() { this.listeners.forEach(l => l()) }
  get = (): Record<string, JoinRequest> => this.snapshot
  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }
}

const divineJoinRequestsStore = new JoinRequestsStore(collection(db, 'join_requests'))
onSignedIn(() => divineJoinRequestsStore.startListening())

const divineStudentsStore = new StudentsHybridStore(() => rosterStore.get())

/* ── divine ClassStores 등록 ── */

const divineShapeStores: ClassStoresShape = {
  classId: DIVINE_CLASS_ID,
  notices: noticesStore,
  offerings: offeringsStore,
  titles: titlesStore,
  missions: missionsStore,
  agoraTopics: agoraTopicsStore,
  agoraPosts: agoraPostsStore,
  roster: rosterStore,
  studentEmailMap: studentEmailMapStore,
  dailyFeature: dailyFeatureStore,
  miniGroups: miniGroupsStore,
  dailyTasks: dailyTasksStore,
  shopItems: shopItemsStore,
  students: divineStudentsStore,
  joinRequests: divineJoinRequestsStore,
}
registerDivineStores(divineShapeStores)

/* ── 비-divine 클래스 스토어 팩토리 + 레지스트리 ── */

const classStoresRegistry = new Map<string, ClassStoresShape>()
classStoresRegistry.set(DIVINE_CLASS_ID, divineShapeStores)

export function getOrCreateClassStores(classId: string): ClassStoresShape {
  if (classStoresRegistry.has(classId)) return classStoresRegistry.get(classId)!
  const stateDoc = (key: string) => doc(db, 'classes', classId, 'state', key)
  const classRoster = new Store<Student[]>(`class.${classId}.roster`, [], stateDoc('roster'))
  const classEmailMap = new Store<Record<string, string>>(`class.${classId}.emailmap`, {}, stateDoc('student_email_map'))
  const classJoinReqs = new JoinRequestsStore(collection(db, 'classes', classId, 'join_requests'))
  onSignedIn(() => classJoinReqs.startListening())

  const stores: ClassStoresShape = {
    classId,
    notices:     new Store<Notice[]>(`class.${classId}.notices`, [], stateDoc('notices')),
    offerings:   new Store<Offering[]>(`class.${classId}.offerings`, [], stateDoc('offerings')),
    titles:      new Store<CustomTitle[]>(`class.${classId}.titles`, DEFAULT_CUSTOM_TITLES, stateDoc('titles')),
    missions:    new Store<Mission[]>(`class.${classId}.missions`, DEFAULT_MISSIONS, stateDoc('missions')),
    agoraTopics: new Store<AgoraTopic[]>(`class.${classId}.agora_topics`, DEFAULT_AGORA_TOPICS, stateDoc('agora_topics')),
    agoraPosts:  new Store<AgoraPost[]>(`class.${classId}.agora_posts`, [], stateDoc('agora_posts')),
    roster:      classRoster,
    studentEmailMap: classEmailMap,
    dailyFeature: new Store<DailyFeature | null>(`class.${classId}.daily_feature`, null, stateDoc('daily_feature')),
    miniGroups:  new Store<MiniGroup[]>(`class.${classId}.miniroom_groups`, [], stateDoc('miniroom_groups')),
    dailyTasks:  new Store<DailyTaskDef[]>(`class.${classId}.daily_tasks`, DAILY_TASKS, stateDoc('daily_tasks')),
    shopItems:   new Store<CustomShopItem[]>(`class.${classId}.shop_items`, SHOP_REAL_ITEMS, stateDoc('shop_items')),
    students:    new SimpleStudentsStore(classId),
    joinRequests: classJoinReqs,
  }
  classStoresRegistry.set(classId, stores)
  return stores
}

/* ── 액티브 스토어 참조 (비-hook 함수용) ── */

let _activeStores: ClassStoresShape = divineShapeStores
export function setActiveClassStores(stores: ClassStoresShape) {
  _activeStores = stores
}

/* ── Context-aware hooks (useContext + module-level fallback) ── */

function useStores(): ClassStoresShape {
  const ctx = useContext(ClassStoresContext)
  return ctx ?? _activeStores
}

export function useNotices() {
  const { notices } = useStores()
  const value = useSyncExternalStore<Notice[]>(notices.subscribe, notices.get, () => [])
  return [value, notices.set] as const
}
export function useOfferings() {
  const { offerings } = useStores()
  const value = useSyncExternalStore<Offering[]>(offerings.subscribe, offerings.get, () => [])
  return [value, offerings.set] as const
}
export function useCustomTitles() {
  const { titles } = useStores()
  const value = useSyncExternalStore(titles.subscribe, titles.get, () => DEFAULT_CUSTOM_TITLES)
  return [value, titles.set] as const
}
export function useMissions() {
  const { missions } = useStores()
  const value = useSyncExternalStore(missions.subscribe, missions.get, () => DEFAULT_MISSIONS)
  return [value, missions.set] as const
}
export function useAgoraTopics() {
  const { agoraTopics } = useStores()
  const value = useSyncExternalStore(agoraTopics.subscribe, agoraTopics.get, () => DEFAULT_AGORA_TOPICS)
  return [value, agoraTopics.set] as const
}
export function useAgoraPosts() {
  const { agoraPosts } = useStores()
  const value = useSyncExternalStore<AgoraPost[]>(agoraPosts.subscribe, agoraPosts.get, () => [])
  return [value, agoraPosts.set] as const
}

export function useRoster() {
  const { roster } = useStores()
  return useSyncExternalStore(roster.subscribe, roster.get, () => MOCK_STUDENTS)
}
export function setRoster(updater: Student[] | ((prev: Student[]) => Student[]), onError?: (e: unknown) => void) {
  _activeStores.roster.set(updater, onError)
}
export function currentRoster(): Student[] {
  return _activeStores.roster.get()
}

export function useStudentEmailMap() {
  const { studentEmailMap } = useStores()
  const value = useSyncExternalStore<Record<string, string>>(
    studentEmailMap.subscribe, studentEmailMap.get, () => ({}),
  )
  return [value, studentEmailMap.set] as const
}
export function currentStudentEmailMap(): Record<string, string> {
  return _activeStores.studentEmailMap.get()
}
export function setStudentEmailMap(
  updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  onError?: (e: unknown) => void,
) {
  _activeStores.studentEmailMap.set(updater, onError)
}

export function useDailyFeature() {
  const { dailyFeature } = useStores()
  return useSyncExternalStore<DailyFeature | null>(dailyFeature.subscribe, dailyFeature.get, () => null)
}
export function setDailyFeature(
  updater: DailyFeature | null | ((prev: DailyFeature | null) => DailyFeature | null),
  onError?: (e: unknown) => void,
) {
  _activeStores.dailyFeature.set(updater, onError)
}

export function useDailyTasks() {
  const { dailyTasks } = useStores()
  return useSyncExternalStore<DailyTaskDef[]>(dailyTasks.subscribe, dailyTasks.get, () => DAILY_TASKS)
}
export function setDailyTasks(updater: DailyTaskDef[] | ((prev: DailyTaskDef[]) => DailyTaskDef[]), onError?: (e: unknown) => void) {
  _activeStores.dailyTasks.set(updater, onError)
}

export function useShopItems() {
  const { shopItems } = useStores()
  return useSyncExternalStore<CustomShopItem[]>(shopItems.subscribe, shopItems.get, () => SHOP_REAL_ITEMS)
}
export function setShopItems(updater: CustomShopItem[] | ((prev: CustomShopItem[]) => CustomShopItem[]), onError?: (e: unknown) => void) {
  _activeStores.shopItems.set(updater, onError)
}

export function useMiniGroups() {
  const { miniGroups } = useStores()
  return useSyncExternalStore<MiniGroup[]>(miniGroups.subscribe, miniGroups.get, () => [])
}
export function setMiniGroups(updater: MiniGroup[] | ((prev: MiniGroup[]) => MiniGroup[]), onError?: (e: unknown) => void) {
  _activeStores.miniGroups.set(updater, onError)
}
export function currentMiniGroups(): MiniGroup[] {
  return _activeStores.miniGroups.get()
}

/* ── 입장 신청 ── */

export function useJoinRequests(): Record<string, JoinRequest> {
  const { joinRequests } = useStores()
  return useSyncExternalStore(joinRequests.subscribe, joinRequests.get, () => ({}))
}

export async function getMappedSid(email: string, classId?: string): Promise<string | null> {
  try {
    const cid = classId ?? _activeStores.classId
    const docRef = cid === DIVINE_CLASS_ID
      ? doc(db, 'state', 'student_email_map')
      : doc(db, 'classes', cid, 'state', 'student_email_map')
    const snap = await getDoc(docRef)
    const map = (snap.exists() ? (snap.data()?.value as Record<string, string>) : null) ?? {}
    return map[email] ?? null
  } catch (e) {
    console.error('[state] getMappedSid failed:', e)
    return null
  }
}

export async function submitJoinRequest(req: JoinRequest, classId?: string): Promise<void> {
  const cid = classId ?? _activeStores.classId
  const docRef = cid === DIVINE_CLASS_ID
    ? doc(db, 'join_requests', req.email)
    : doc(db, 'classes', cid, 'join_requests', req.email)
  await setDoc(docRef, stripUndefined(req) as unknown as Record<string, unknown>)
}

export async function getMyJoinRequest(email: string, classId?: string): Promise<JoinRequest | null> {
  try {
    const cid = classId ?? _activeStores.classId
    const docRef = cid === DIVINE_CLASS_ID
      ? doc(db, 'join_requests', email)
      : doc(db, 'classes', cid, 'join_requests', email)
    const snap = await getDoc(docRef)
    return snap.exists() ? (snap.data() as JoinRequest) : null
  } catch (e) {
    console.error('[state] getMyJoinRequest failed:', e)
    return null
  }
}

export async function approveJoinRequest(req: JoinRequest): Promise<void> {
  setStudentEmailMap(prev => {
    const next: Record<string, string> = {}
    for (const [em, sid] of Object.entries(prev)) {
      if (sid === req.studentId) continue
      if (em === req.email) continue
      next[em] = sid
    }
    next[req.email] = req.studentId
    return next
  })
  const cid = _activeStores.classId
  const docRef = cid === DIVINE_CLASS_ID
    ? doc(db, 'join_requests', req.email)
    : doc(db, 'classes', cid, 'join_requests', req.email)
  await deleteDoc(docRef).catch(e => console.error('[state] approve: delete request failed:', e))
}

export async function rejectJoinRequest(email: string): Promise<void> {
  const cid = _activeStores.classId
  const docRef = cid === DIVINE_CLASS_ID
    ? doc(db, 'join_requests', email)
    : doc(db, 'classes', cid, 'join_requests', email)
  await deleteDoc(docRef).catch(e => console.error('[state] reject failed:', e))
}

/* ── 학생 상태 훅 ── */

const emptyState = (): StudentState => ({
  ownedItemIds: [], ownedTitleIds: [], missions: [], sanctuary: [],
})

export function useStudentStateMap() {
  const { students } = useStores()
  const map = useSyncExternalStore<StudentStateMap>(students.subscribe, students.get, () => ({} as StudentStateMap))
  const setMap = students.set

  const get = useCallback((id: string): StudentState => map[id] ?? emptyState(), [map])
  const update = useCallback((id: string, updater: (s: StudentState) => StudentState, onError?: (e: unknown) => void) => {
    setMap(prev => {
      const cur = prev[id] ?? emptyState()
      return { ...prev, [id]: updater(cur) }
    }, onError)
  }, [setMap])

  return { map, setMap, get, update } as const
}

/* ── 쿠키 / XP / 기타 헬퍼 (비-hook) ── */

export function effectiveCookies(studentId: string, map: StudentStateMap): number {
  const base = _activeStores.roster.get().find(s => s.id === studentId)?.cookies ?? 0
  const ov = map[studentId]?.cookies
  return ov ?? base
}

export function lifetimeCookiesOf(studentId: string, map: StudentStateMap): number {
  const cur = map[studentId]
  const cookies = effectiveCookies(studentId, map)
  if (!cur) return cookies
  const spent = (cur.purchases ?? []).reduce((sum, p) => sum + (p.cost ?? 0), 0)
  const minimum = cookies + spent
  return Math.max(cur.lifetimeCookies ?? cookies, minimum)
}

export function gainCookies(sid: string, amount: number) {
  if (!sid || !amount) return
  _activeStores.students.set(prev => {
    const cur = prev[sid] ?? emptyState()
    const baseCookies = _activeStores.roster.get().find(s => s.id === sid)?.cookies ?? 0
    const oldCookies = cur.cookies ?? baseCookies
    const oldLife    = cur.lifetimeCookies ?? oldCookies
    return { ...prev, [sid]: { ...cur, cookies: oldCookies + amount, lifetimeCookies: oldLife + amount } }
  })
}

export function spendCookies(sid: string, amount: number): boolean {
  if (!sid || amount <= 0) return false
  const cur = _activeStores.students.get()[sid] ?? emptyState()
  const baseCookies = _activeStores.roster.get().find(s => s.id === sid)?.cookies ?? 0
  if ((cur.cookies ?? baseCookies) < amount) return false
  _activeStores.students.set(prev => {
    const c = prev[sid] ?? emptyState()
    const base = _activeStores.roster.get().find(s => s.id === sid)?.cookies ?? 0
    const oc = c.cookies ?? base
    return { ...prev, [sid]: { ...c, cookies: Math.max(0, oc - amount) } }
  })
  return true
}

export function purchaseShopItem(sid: string, item: { id: string; name: string; icon?: string; cost: number }): boolean {
  if (!sid || item.cost <= 0) return false
  const cur = _activeStores.students.get()[sid] ?? emptyState()
  const baseCookies = _activeStores.roster.get().find(s => s.id === sid)?.cookies ?? 0
  if ((cur.cookies ?? baseCookies) < item.cost) return false

  _activeStores.students.set(prev => {
    const c = prev[sid] ?? emptyState()
    const base = _activeStores.roster.get().find(s => s.id === sid)?.cookies ?? 0
    const oc = c.cookies ?? base
    if (oc < item.cost) return prev
    const ol = c.lifetimeCookies ?? oc
    return {
      ...prev,
      [sid]: {
        ...c,
        cookies: Math.max(0, oc - item.cost),
        lifetimeCookies: ol,
        purchases: [
          ...(c.purchases ?? []),
          {
            id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            itemId: item.id, itemName: item.name, icon: item.icon, cost: item.cost,
            purchasedAt: new Date().toISOString(),
          },
        ],
      },
    }
  })
  return true
}

export function gainXp(sid: string, amount: number): { from: number; to: number } | null {
  if (!sid || !amount) return null
  let result: { from: number; to: number } | null = null
  _activeStores.students.set(prev => {
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

export function claimDailyOffering(sid: string, today: string, itemId: string): boolean {
  const cur = _activeStores.students.get()[sid] ?? emptyState()
  if (cur.lastOfferingAt === today) return false
  _activeStores.students.set(prev => {
    const c = prev[sid] ?? emptyState()
    if (c.lastOfferingAt === today) return prev
    return { ...prev, [sid]: { ...c, lastOfferingAt: today, ownedItemIds: [...c.ownedItemIds, itemId] } }
  })
  return true
}

export function studentLevelInfo(sid: string) {
  const cur = _activeStores.students.get()[sid] ?? emptyState()
  const info = levelFromXp(cur.xp ?? 0)
  return { ...info, xp: cur.xp ?? 0 }
}
