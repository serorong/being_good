import { useSyncExternalStore } from 'react'
import type { AuthState } from './types'

const KEY = 'divine-classroom.auth.v1'

type Listener = () => void

class AuthStore {
  private snapshot: AuthState | null = this.load()
  private listeners = new Set<Listener>()

  private load(): AuthState | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as AuthState) : null
    } catch {
      return null
    }
  }

  get = (): AuthState | null => this.snapshot

  set = (v: AuthState | null) => {
    this.snapshot = v
    try {
      if (v) localStorage.setItem(KEY, JSON.stringify(v))
      else localStorage.removeItem(KEY)
    } catch {}
    this.listeners.forEach(l => l())
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }
}

const store = new AuthStore()

export function useAuth() {
  const auth = useSyncExternalStore(store.subscribe, store.get, () => null)
  return [auth, store.set] as const
}
