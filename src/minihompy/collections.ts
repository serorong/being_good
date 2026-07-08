/* ──────────────────────────────────────────────────────────────
   미니룸 전용 Firestore 컬렉션 스토어 (선물 / 방명록)
   - /state/* 는 교사만 쓰기, students_v2/{sid} 는 본인만 쓰기 →
     "남의 방에 남기는" 선물·방명록은 별도 컬렉션이 필요.
   - 학급 규모가 작아 컬렉션 전체를 구독하고 클라이언트에서 방별 필터.
   ────────────────────────────────────────────────────────────── */
import { useSyncExternalStore } from 'react'
import { collection, deleteDoc, doc, onSnapshot, setDoc, type CollectionReference } from 'firebase/firestore'
import { db, onSignedIn } from '../firebase'
import type { Gift } from '../types'

type Listener = () => void

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
        err => console.error(`[mini] ${this.path} listen error:`, err),
      )
    } catch (e) {
      console.error(`[mini] ${this.path} onSnapshot setup:`, e)
    }
  }
  get = (): T[] => this.snapshot
  subscribe = (l: Listener) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }

  put = async (item: T) => {
    try { await setDoc(doc(this.colRef, item.id), item as unknown as Record<string, unknown>) }
    catch (e) { console.error(`[mini] ${this.path} put failed:`, e) }
  }
  remove = async (id: string) => {
    try { await deleteDoc(doc(this.colRef, id)) }
    catch (e) { console.error(`[mini] ${this.path} delete failed:`, e) }
  }
}

const giftsStore = new CollectionStore<Gift>('gifts')

const mkId = (p: string) => `${p}_${Date.now().toString(36)}_${Math.floor(performance.now() % 1 * 1e6).toString(36)}${Math.floor(performance.now()).toString(36)}`

/* ── 선물 ── */
export function useGifts(): Gift[] {
  return useSyncExternalStore(giftsStore.subscribe, giftsStore.get, () => [])
}
export function sendGift(g: Omit<Gift, 'id' | 'createdAt'>): Promise<void> {
  const gift: Gift = { ...g, id: mkId('gift'), createdAt: new Date().toISOString() }
  return giftsStore.put(gift)
}
/** 받은 선물을 방에 걸었으면 삭제로 정리. */
export const removeGift = (id: string) => giftsStore.remove(id)
