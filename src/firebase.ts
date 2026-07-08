/**
 * Firebase 초기화.
 * - Firestore: 모든 상태 (notices, missions, titles, agora, students)
 * - Auth: 구글 로그인 전용 (익명 로그인 미사용). 로그인한 계정만 Firestore에 접근한다.
 *
 * Firestore 구조:
 *   /state/notices          { value: Notice[] }
 *   /state/titles           { value: CustomTitle[] }
 *   /state/missions         { value: Mission[] }
 *   /state/agora_topics     { value: AgoraTopic[] }
 *   /state/agora_posts      { value: AgoraPost[] }
 *   /state/students_state   { value: StudentStateMap }
 *
 * (단일 학급용 단순 구조. 각 컬렉션을 하나의 doc에 통째로 저장 — 1MB 제한 내에서 충분.)
 */

import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyB4dBOHzHn9Zo19BqfkqS6nYPa4y9S0FSU',
  authDomain: 'divine-classroom.firebaseapp.com',
  projectId: 'divine-classroom',
  storageBucket: 'divine-classroom.firebasestorage.app',
  messagingSenderId: '516559821905',
  appId: '1:516559821905:web:8f228948dfdb604dd0ec70',
  measurementId: 'G-GSTGX6TN9Q',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

/**
 * 구글 로그인이 되어 있으면(또는 되는 순간) 콜백을 호출한다. 로그아웃 상태에서는 호출하지 않는다.
 * Firestore 구독은 모두 이 시점 이후에 시작해야 한다(익명 인증을 쓰지 않으므로
 * 로그인 전에는 어떤 문서도 읽을 권한이 없다). 반환값으로 구독을 해제한다.
 */
export function onSignedIn(cb: (user: User) => void): () => void {
  return onAuthStateChanged(auth, user => { if (user) cb(user) })
}

/** 하위 호환용 no-op. 익명 로그인을 더 이상 사용하지 않는다. */
export function ensureSignedIn(): Promise<void> {
  return Promise.resolve()
}

export const SCHOOL_EMAIL_DOMAIN = 'dajeong.sjedues.kr'

/**
 * 교사 구글 로그인. 도메인 힌트 없이 어떤 구글 계정으로든 로그인할 수 있게 하고,
 * 허용 여부는 호출 측에서 화이트리스트(TEACHER_EMAILS)로만 검증한다.
 * (학교 도메인이 아닌 외부 교사 계정도 화이트리스트에 있으면 입장 가능.)
 * prompt: 'select_account' 로 매번 로그인할 계정을 직접 고르게 한다.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({
    prompt: 'select_account',
  })
  const cred = await signInWithPopup(auth, provider)
  return cred.user
}

/** 학생 구글 로그인. 학교 도메인 힌트만 같이 보낸다. 도메인·교사 검증은 호출 측에서. */
export async function signInStudentWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({
    hd: SCHOOL_EMAIL_DOMAIN,
    prompt: 'select_account',
  })
  const cred = await signInWithPopup(auth, provider)
  return cred.user
}

export async function signOutFirebase() {
  try { await firebaseSignOut(auth) } catch (e) { console.error('[auth] signOut failed:', e) }
  // 익명 인증을 쓰지 않으므로 로그아웃 후에는 인증이 없는 상태가 된다(다시 로그인할 때까지).
}
