/* 모두의 도서관 전용 페이지 — 로그인 화면 (이름 선택 + 비밀번호) */
import { useState } from 'react'
import { ROSTER } from '../../data'
import { TEACHER_NAME, TEACHER_SID } from '../types'
import { loginLib, registerLib, useLibAuthDocs } from './auth'
import { LBtn, LModal } from './ui'

const ENTRIES: Array<{ sid: string; name: string }> = [
  ...ROSTER.map(r => ({ sid: r.id, name: r.name })),
  { sid: TEACHER_SID, name: TEACHER_NAME },
]

export default function LoginScreen() {
  const authDocs = useLibAuthDocs()
  const [picked, setPicked] = useState<{ sid: string; name: string } | null>(null)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 16px 80px' }}>
      <header style={{ textAlign: 'center', marginBottom: 28 }}>
        <p style={{ fontSize: 13, color: 'var(--lib-sub)', letterSpacing: 4, margin: 0 }}>여름 방학 · 우리 반 독서실</p>
        <h1 style={{ fontSize: 34, margin: '8px 0 6px' }}>모두의 도서관</h1>
        <p style={{ fontSize: 15, color: 'var(--lib-sub)', margin: 0 }}>
          이름을 누르고 비밀번호로 들어와요. 처음이라면 나만의 비밀번호를 만들어요.
        </p>
      </header>

      <div className="lib-card" style={{ padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(108px,1fr))', gap: 8 }}>
          {ENTRIES.map(e => {
            const registered = !!authDocs[e.sid]?.uid
            return (
              <button key={e.sid} onClick={() => setPicked(e)} className="lib-seat" style={{ minHeight: 74, display: 'grid', placeItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{e.name}</span>
                <span style={{ fontSize: 11, color: registered ? 'var(--lib-green)' : 'var(--lib-sub)' }}>
                  {registered ? '비밀번호로 입장' : '처음 왔어요'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--lib-sub)', marginTop: 18 }}>
        비밀번호를 잊어버렸다면 선생님께 말해 주세요. 선생님이 다시 만들 수 있게 해 줘요.
      </p>

      {picked && (
        <EnterModal sid={picked.sid} name={picked.name}
          registered={!!authDocs[picked.sid]?.uid}
          onClose={() => setPicked(null)} />
      )}
    </div>
  )
}

function EnterModal({ sid, name, registered, onClose }: {
  sid: string; name: string; registered: boolean; onClose: () => void
}) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (pw.length < 6) { setError('비밀번호는 6자 이상이어야 해요.'); return }
    if (!registered && pw !== pw2) { setError('두 비밀번호가 서로 달라요. 똑같이 적어 주세요.'); return }
    setBusy(true)
    try {
      if (registered) await loginLib(sid, name, pw)
      else await registerLib(sid, name, pw)
      // 성공하면 세션이 생겨 화면이 바뀐다
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <LModal open onClose={onClose} maxWidth={420}
      title={registered ? `${name} 님, 어서 오세요` : `${name} 님, 반가워요`}>
      <form onSubmit={e => { e.preventDefault(); void submit() }} style={{ display: 'grid', gap: 14 }}>
        {!registered && (
          <p style={{ fontSize: 13, color: 'var(--lib-sub)', margin: 0, lineHeight: 1.6 }}>
            도서관에서 쓸 나만의 비밀번호를 만들어요. <b>6자 이상</b>, 잊어버리지 않을 것으로!
          </p>
        )}
        <div>
          <label className="lib-label" htmlFor="lib-pw">{registered ? '비밀번호' : '새 비밀번호 (6자 이상)'}</label>
          <input id="lib-pw" className="lib-input" type="password" value={pw} autoFocus
            autoComplete={registered ? 'current-password' : 'new-password'}
            onChange={e => setPw(e.target.value)} />
        </div>
        {!registered && (
          <div>
            <label className="lib-label" htmlFor="lib-pw2">비밀번호 다시 한번</label>
            <input id="lib-pw2" className="lib-input" type="password" value={pw2}
              autoComplete="new-password" onChange={e => setPw2(e.target.value)} />
          </div>
        )}
        {error && <p role="alert" style={{ fontSize: 13, color: 'var(--lib-red)', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <LBtn kind="quiet" onClick={onClose}>돌아가기</LBtn>
          <LBtn kind="primary" type="submit" disabled={busy}>
            {busy ? '들어가는 중…' : registered ? '도서관 입장' : '비밀번호 만들고 입장'}
          </LBtn>
        </div>
      </form>
    </LModal>
  )
}
