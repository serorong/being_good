/**
 * 다반(multi-class) 스토어 컨텍스트.
 * 각 반(classId)마다 독립된 Firestore 경로를 가진 스토어 세트를 관리한다.
 *
 * divine 클래스: 기존 루트 경로 (/state/*, /students_v2/*, /join_requests/*) — 절대 변경 없음.
 * 다른 클래스: /classes/{classId}/state/*, /classes/{classId}/students_v2/*, 등.
 */
import { createContext, useContext } from 'react'
import type {
  AgoraPost, AgoraTopic, CustomShopItem, CustomTitle, DailyFeature, DailyTaskDef, JoinRequest,
  MiniGroup, Mission, Notice, Offering, Student, StudentStateMap,
} from './types'

type Listener = () => void

export interface IStore<T> {
  get: () => T
  set: (updater: T | ((prev: T) => T), onError?: (e: unknown) => void) => void
  subscribe: (listener: Listener) => () => void
}

export interface IStudentsStore {
  get: () => StudentStateMap
  set: (updater: StudentStateMap | ((prev: StudentStateMap) => StudentStateMap), onError?: (e: unknown) => void) => void
  subscribe: (listener: Listener) => () => void
}

export interface IJoinRequestsStore {
  get: () => Record<string, JoinRequest>
  subscribe: (listener: Listener) => () => void
}

export interface ClassStoresShape {
  classId: string
  notices: IStore<Notice[]>
  offerings: IStore<Offering[]>
  titles: IStore<CustomTitle[]>
  missions: IStore<Mission[]>
  agoraTopics: IStore<AgoraTopic[]>
  agoraPosts: IStore<AgoraPost[]>
  roster: IStore<Student[]>
  studentEmailMap: IStore<Record<string, string>>
  dailyFeature: IStore<DailyFeature | null>
  miniGroups: IStore<MiniGroup[]>
  dailyTasks: IStore<DailyTaskDef[]>
  shopItems: IStore<CustomShopItem[]>
  students: IStudentsStore
  joinRequests: IJoinRequestsStore
}

// divine 스토어 참조 — state.ts 가 초기화 후 등록
let _divine: ClassStoresShape | null = null
export function registerDivineStores(stores: ClassStoresShape) {
  _divine = stores
}
export function getDivineStores(): ClassStoresShape | null {
  return _divine
}

export const ClassStoresContext = createContext<ClassStoresShape | null>(null)

export function useActiveClassStores(): ClassStoresShape {
  const ctx = useContext(ClassStoresContext)
  const stores = ctx ?? _divine
  if (!stores) throw new Error('ClassStoresContext not provided')
  return stores
}
