/* ──────────────────────────────────────────────────────────────
   모두의 도서관 전용 페이지 인증.
   - 학생은 "이름 선택 + 비밀번호"만 본다. 내부적으로는 Firebase
     이메일/비밀번호 인증을 sid 기반 가상 이메일로 사용한다.
   - /library_auth/{sid} = { sid, uid, ver, updatedAt }
     · uid: 그 자리를 소유한 Firebase 사용자 (null = 미등록/초기화됨)
     · ver: 비밀번호 초기화 때마다 +1 — 가상 이메일에 붙여 재가입 가능하게 함
   - 비밀번호를 잊으면 학급관리에서 선생님이 초기화(uid=null, ver+1).
   ────────────────────────────────────────────────────────────── */
import { useSyncExternalStore } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'

export interface LibAuthDoc {
  sid: string
  uid: string | null
  ver: number
  updatedAt: string
}

export interface LibSiteSession {
  sid: string
  name: string
}

const SESSION_KEY = 'divine-library.session.v1'

/** sid+버전으로 만드는 가상 이메일 — 학생에게는 절대 노출하지 않는다. */
const emailFor = (sid: string, ver: number) => `${sid}.v${ver}@library.divine-classroom.app`

const nowIso = () => new Date().toISOString()

/* ── 세션 (localStorage) ── */

type Listener = () => void

class SessionStore {
  private snapshot: LibSiteSession | null = this.load()
  private listeners = new Set<Listener>()

  private load(): LibSiteSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as LibSiteSession) : null
    } catch { return null }
  }
  get = () => this.snapshot
  set = (v: LibSiteSession | null) => {
    this.snapshot = v
    try {
      if (v) localStorage.setItem(SESSION_KEY, JSON.stringify(v))
      else localStorage.removeItem(SESSION_KEY)
    } catch {}
    this.listeners.forEach(l => l())
  }
  subscribe = (l: Listener) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
}

const sessionStore = new SessionStore()

export function useLibSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get, () => null)
}

// Firebase 인증이 풀렸는데(다른 페이지에서 로그아웃 등) 세션만 남아 있으면 정리한다.
let sawUser = false
onAuthStateChanged(auth, user => {
  if (user) { sawUser = true; return }
  if (sawUser && sessionStore.get()) sessionStore.set(null)
})

/* ── library_auth 구독 (로그인 화면 — 등록 여부 표시용, 인증 전에도 읽기 허용) ── */

class AuthDocsStore {
  private snapshot: Record<string, LibAuthDoc> = {}
  private listeners = new Set<Listener>()
  private started = false

  start() {
    if (this.started) return
    this.started = true
    onSnapshot(collection(db, 'library_auth'), snap => {
      const map: Record<string, LibAuthDoc> = {}
      snap.forEach(d => { map[d.id] = d.data() as LibAuthDoc })
      this.snapshot = map
      this.listeners.forEach(l => l())
    }, err => console.error('[library_auth] listen error:', err))
  }
  get = () => this.snapshot
  subscribe = (l: Listener) => {
    this.start()
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }
}

const authDocsStore = new AuthDocsStore()

export function useLibAuthDocs(): Record<string, LibAuthDoc> {
  return useSyncExternalStore(authDocsStore.subscribe, authDocsStore.get, () => ({}))
}

/* ── 등록·로그인·로그아웃 ── */

function friendly(code: string): string {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '비밀번호가 달라요. 다시 한번 확인해 봐요.'
    case 'auth/too-many-requests':
      return '너무 여러 번 틀렸어요. 잠깐 쉬었다가 다시 해 봐요.'
    case 'auth/weak-password':
      return '비밀번호는 6자 이상으로 만들어 주세요.'
    case 'auth/network-request-failed':
      return '인터넷 연결이 불안정해요. 잠시 후 다시 해 봐요.'
    default:
      return `로그인이 잘 안 돼요. 선생님께 알려 주세요. (${code})`
  }
}

async function fetchAuthDoc(sid: string): Promise<LibAuthDoc | null> {
  const snap = await getDoc(doc(db, 'library_auth', sid))
  return snap.exists() ? (snap.data() as LibAuthDoc) : null
}

async function claimDoc(sid: string, uid: string, ver: number) {
  await setDoc(doc(db, 'library_auth', sid), { sid, uid, ver, updatedAt: nowIso() } satisfies LibAuthDoc)
}

/** 첫 등록(또는 초기화 후 재등록): 비밀번호를 만들고 자리를 차지한다. */
export async function registerLib(sid: string, name: string, password: string): Promise<void> {
  const existing = await fetchAuthDoc(sid)
  if (existing?.uid) throw new Error('이미 비밀번호가 만들어져 있어요. 로그인으로 들어가 주세요.')
  const ver = existing?.ver ?? 1
  const email = emailFor(sid, ver)
  let uid: string
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    uid = cred.user.uid
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    if (code === 'auth/email-already-in-use') {
      // 이전 등록 시도가 도중에 끊긴 경우 — 같은 비밀번호면 이어서 복구
      const cred = await signInWithEmailAndPassword(auth, email, password)
        .catch(() => { throw new Error('이 자리는 이미 등록을 시작했어요. 선생님께 비밀번호 초기화를 부탁해 주세요.') })
      uid = cred.user.uid
    } else {
      throw new Error(friendly(code))
    }
  }
  await claimDoc(sid, uid, ver)
  sessionStore.set({ sid, name })
}

/** 등록된 자리에 비밀번호로 입장. */
export async function loginLib(sid: string, name: string, password: string): Promise<void> {
  const authDoc = await fetchAuthDoc(sid)
  if (!authDoc?.uid) throw new Error('아직 비밀번호가 없어요. 먼저 비밀번호를 만들어 주세요.')
  try {
    await signInWithEmailAndPassword(auth, emailFor(sid, authDoc.ver), password)
  } catch (e) {
    throw new Error(friendly((e as { code?: string }).code ?? ''))
  }
  sessionStore.set({ sid, name })
}

export async function logoutLib(): Promise<void> {
  sessionStore.set(null)
  try { await signOut(auth) } catch (e) { console.error('[library] signOut:', e) }
}

/** 교사(학급관리): 비밀번호 초기화 — 학생이 새 비밀번호를 만들 수 있게 된다. */
export async function resetLibPassword(sid: string): Promise<void> {
  const existing = await fetchAuthDoc(sid)
  await setDoc(doc(db, 'library_auth', sid), {
    sid, uid: null, ver: (existing?.ver ?? 1) + 1, updatedAt: nowIso(),
  } satisfies LibAuthDoc)
}
