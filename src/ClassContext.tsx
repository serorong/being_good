/**
 * ClassContext — 현재 반의 ClassInfo(용어·메뉴)와 ClassStores를 앱 전체에 제공한다.
 *
 * divine 반: /classes/divine/info 에서 classInfo 읽음 (없으면 기본값 생성).
 *            기존 stores(신의반 루트 경로) 그대로 사용 — 데이터 변경 없음.
 * 새 반:     /classes/{classId}/info 에서 classInfo 읽음.
 *            getOrCreateClassStores(classId)로 해당 반 전용 stores 사용.
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { defaultClassInfo, DIVINE_CLASS_ID } from './data'
import type { ClassInfo, MenuConfig, ClassTerms } from './types'
import { ClassStoresContext, type ClassStoresShape } from './classStores'
import { getOrCreateClassStores, setActiveClassStores } from './state'

interface ClassContextValue {
  classId: string
  classInfo: ClassInfo
  updateTerms: (terms: Partial<ClassTerms>) => Promise<void>
  updateMenus: (menus: MenuConfig[]) => Promise<void>
}

const ClassContext = createContext<ClassContextValue>({
  classId: DIVINE_CLASS_ID,
  classInfo: defaultClassInfo(DIVINE_CLASS_ID, ''),
  updateTerms: async () => {},
  updateMenus: async () => {},
})

export function useClassInfo() {
  return useContext(ClassContext)
}

interface Props {
  classId: string
  teacherEmail?: string
  children: React.ReactNode
}

export function ClassProvider({ classId, teacherEmail, children }: Props) {
  const [classInfo, setClassInfo] = useState<ClassInfo>(
    defaultClassInfo(classId, teacherEmail ?? '')
  )
  const [stores, setStores] = useState<ClassStoresShape>(() => getOrCreateClassStores(classId))

  // classId 바뀔 때 stores 교체 + active 업데이트
  useEffect(() => {
    const s = getOrCreateClassStores(classId)
    setStores(s)
    setActiveClassStores(s)
  }, [classId])

  // /classes/{classId}/info Firestore 구독
  useEffect(() => {
    if (!classId) return
    const infoRef = doc(db, 'classes', classId, 'info', 'data')
    const unsub = onSnapshot(infoRef, snap => {
      if (snap.exists()) {
        const info = { classId, ...snap.data() } as ClassInfo
        // 나중에 추가된 기본 메뉴(예: library)가 저장된 문서에 없으면 채워 넣는다
        const missing = defaultClassInfo(classId, teacherEmail ?? '').menus
          .filter(d => !info.menus?.some(m => m.key === d.key))
        setClassInfo(missing.length ? { ...info, menus: [...(info.menus ?? []), ...missing] } : info)
      } else {
        // 최초: 기본값으로 문서 생성
        const defaults = defaultClassInfo(classId, teacherEmail ?? '')
        setDoc(infoRef, defaults).catch(console.error)
        setClassInfo(defaults)
      }
    }, err => console.error('[ClassContext] info listen error:', err))
    return unsub
  }, [classId, teacherEmail])

  const updateTerms = async (terms: Partial<ClassTerms>) => {
    const infoRef = doc(db, 'classes', classId, 'info', 'data')
    const updated: ClassInfo = { ...classInfo, terms: { ...classInfo.terms, ...terms } }
    await setDoc(infoRef, updated, { merge: true })
  }

  const updateMenus = async (menus: MenuConfig[]) => {
    const infoRef = doc(db, 'classes', classId, 'info', 'data')
    const updated: ClassInfo = { ...classInfo, menus }
    await setDoc(infoRef, updated, { merge: true })
  }

  return (
    <ClassContext.Provider value={{ classId, classInfo, updateTerms, updateMenus }}>
      <ClassStoresContext.Provider value={stores}>
        {children}
      </ClassStoresContext.Provider>
    </ClassContext.Provider>
  )
}
