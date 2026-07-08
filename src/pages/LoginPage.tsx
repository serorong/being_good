import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { isTeacherEmail } from '../data'
import { SCHOOL_EMAIL_DOMAIN, signInStudentWithGoogle, signInWithGoogle, signOutFirebase } from '../firebase'
import {
  getMappedSid, getMyJoinRequest, submitJoinRequest, useRoster, useStudentEmailMap,
} from '../state'

type Tab = 'student' | 'teacher'
type StudentStep = 'choose' | 'waiting'

export default function LoginPage() {
  const [, setAuth] = useAuth()
  const nav = useNavigate()
  const MOCK_STUDENTS = useRoster()
  const [emailMap] = useStudentEmailMap()
  const [tab, setTab] = useState<Tab>('student')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [pendingDisplayName, setPendingDisplayName] = useState<string>('')
  const [step, setStep] = useState<StudentStep>('choose')
  const [selectedSid, setSelectedSid] = useState<string>('')

  const usedSids = new Set(Object.values(emailMap))

  useEffect(() => {
    if (!pendingEmail) return
    const sid = emailMap[pendingEmail]
    if (!sid) return
    const student = MOCK_STUDENTS.find(s => s.id === sid)
    if (student) {
      setAuth({ role: 'student', studentId: student.id })
      nav('/app', { replace: true })
    }
  }, [emailMap, pendingEmail, MOCK_STUDENTS, setAuth, nav])

  const enterAsStudent = async () => {
    setErr('')
    setBusy(true)
    try {
      const user = await signInStudentWithGoogle()
      const email = (user.email ?? '').toLowerCase()
      if (!email) {
        await signOutFirebase()
        setErr('구글 계정에서 이메일을 가져오지 못했어요. 다시 시도해 주세요.')
        return
      }
      if (!email.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
        await signOutFirebase()
        setErr(`학교 구글 계정(@${SCHOOL_EMAIL_DOMAIN})으로 로그인해 주세요. (현재: ${email})`)
        return
      }
      if (isTeacherEmail(email)) {
        await signOutFirebase()
        setErr('선생님 계정이에요. 「교사」 탭에서 입장해 주세요.')
        return
      }
      const mappedId = await getMappedSid(email)
      if (mappedId) {
        const student = MOCK_STUDENTS.find(s => s.id === mappedId)
        if (!student) {
          setErr(`연결된 자리(${mappedId})가 현재 명단에 없어요. 담임 선생님께 알려 주세요.`)
          return
        }
        setAuth({ role: 'student', studentId: student.id })
        nav('/app', { replace: true })
        return
      }
      setPendingEmail(email)
      setPendingDisplayName(user.displayName ?? '')
      const existing = await getMyJoinRequest(email)
      if (existing) {
        setSelectedSid(existing.studentId)
        setStep('waiting')
      } else {
        setSelectedSid('')
        setStep('choose')
      }
    } catch (e: unknown) {
      const errCode = (e as { code?: string })?.code ?? ''
      if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
        setErr('로그인 창이 닫혔어요. 다시 시도해 주세요.')
      } else {
        setErr(`구글 로그인에 실패했어요. (${errCode || (e as Error)?.message || '알 수 없는 오류'})`)
      }
    } finally {
      setBusy(false)
    }
  }

  const submitRequest = async () => {
    setErr('')
    if (!pendingEmail) return
    if (!selectedSid) {
      setErr('명단에서 본인 이름을 선택해 주세요.')
      return
    }
    const student = MOCK_STUDENTS.find(s => s.id === selectedSid)
    if (!student) {
      setErr('선택한 자리를 찾을 수 없어요. 다시 선택해 주세요.')
      return
    }
    setBusy(true)
    try {
      await submitJoinRequest({
        email: pendingEmail,
        studentId: student.id,
        studentName: student.realName,
        displayName: pendingDisplayName,
        requestedAt: new Date().toISOString(),
      })
      setStep('waiting')
    } catch (e: unknown) {
      setErr(`신청에 실패했어요. 다시 시도해 주세요. (${(e as Error)?.message ?? '오류'})`)
    } finally {
      setBusy(false)
    }
  }

  const checkApproved = async () => {
    if (!pendingEmail) return
    setErr('')
    setBusy(true)
    try {
      const sid = await getMappedSid(pendingEmail)
      if (sid) {
        const student = MOCK_STUDENTS.find(s => s.id === sid)
        if (student) {
          setAuth({ role: 'student', studentId: student.id })
          nav('/app', { replace: true })
          return
        }
      }
      setErr('아직 승인되지 않았어요. 선생님이 승인하면 바로 입장돼요.')
    } finally {
      setBusy(false)
    }
  }

  const cancelPending = async () => {
    setPendingEmail(null)
    setSelectedSid('')
    setStep('choose')
    setErr('')
    await signOutFirebase()
  }

  const enterAsTeacher = async () => {
    setErr('')
    setBusy(true)
    try {
      const user = await signInWithGoogle()
      const email = (user.email ?? '').toLowerCase()
      if (!isTeacherEmail(email)) {
        await signOutFirebase()
        setErr(`이 사이트의 교사 권한이 없는 계정입니다: ${email || '(이메일 없음)'}`)
        return
      }
      setAuth({
        role: 'teacher',
        teacherName: user.displayName ?? '신탁자 선생님',
        teacherEmail: email,
      })
      nav('/app', { replace: true })
    } catch (e: unknown) {
      const errCode = (e as { code?: string })?.code ?? ''
      if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
        setErr('로그인 창이 닫혔어요. 다시 시도해 주세요.')
      } else {
        setErr(`구글 로그인에 실패했어요. (${errCode || (e as Error)?.message || '알 수 없는 오류'})`)
      }
    } finally {
      setBusy(false)
    }
  }

  const selectedStudent = MOCK_STUDENTS.find(s => s.id === selectedSid)

  const errBox = err ? (
    <div style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--pink)', lineHeight: 1.5 }}>⚠ {err}</div>
  ) : null

  return (
    <div
      className="sin-app"
      style={{ alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'var(--green-soft-2)' }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* 브랜드 */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img src="/assets/logo_mascot.png" alt="신의반" style={{ width: 84, height: 84, objectFit: 'contain' }} />
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 32, color: 'var(--green)', marginTop: 6 }}>신의반 신전</div>
          <div style={{ fontSize: 14, color: 'var(--muted-2)', marginTop: 4 }}>6학년 우리 반 마음마을</div>
        </div>

        <div className="card">
          {!pendingEmail && (
            <div className="tabs tabs--filled" style={{ marginBottom: 18 }}>
              <button className={`tab ${tab === 'student' ? 'is-active' : ''}`} onClick={() => { setTab('student'); setErr('') }}>학생</button>
              <button className={`tab ${tab === 'teacher' ? 'is-active' : ''}`} onClick={() => { setTab('teacher'); setErr('') }}>교사</button>
            </div>
          )}

          {pendingEmail && step === 'waiting' ? (
            /* 승인 대기 */
            <div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
                선생님 승인을 기다리는 중이에요
              </div>
              <div className="card--leaf" style={{ borderRadius: 'var(--r-md)', padding: 14, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
                <div><b>{selectedStudent?.realName ?? '학생'}</b> 자리로 입장을 신청했어요.</div>
                <div style={{ opacity: .8, marginTop: 4 }}>{pendingDisplayName} ({pendingEmail})</div>
                <div style={{ marginTop: 8 }}>담임 선생님이 승인하면 <b>자동으로 입장</b>돼요.</div>
              </div>
              {errBox}
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 16 }} onClick={checkApproved} disabled={busy}>
                {busy ? '확인 중…' : '승인됐는지 확인하기'}
              </button>
              <button className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => { setStep('choose'); setErr('') }}>
                다른 자리로 다시 신청
              </button>
              <button className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={cancelPending}>
                ← 다른 계정으로 다시 로그인
              </button>
            </div>
          ) : pendingEmail && step === 'choose' ? (
            /* 이름 선택 → 신청 */
            <div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
                처음 입장하시네요!
              </div>
              <div className="card--leaf" style={{ borderRadius: 'var(--r-md)', padding: 14, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
                <div><b>{pendingDisplayName || '학생'}</b> 님 ({pendingEmail})</div>
                <div style={{ marginTop: 4 }}>명단에서 <b>본인 이름</b>을 선택해 신청하세요. 선생님 승인 후 연결돼요.</div>
              </div>
              <label style={{ display: 'block', fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>내 이름</label>
              <select className="input" value={selectedSid} onChange={e => setSelectedSid(e.target.value)} autoFocus>
                <option value="">— 이름을 선택하세요 —</option>
                {MOCK_STUDENTS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.realName}{usedSids.has(s.id) ? ' (이미 연결됨)' : ''}
                  </option>
                ))}
              </select>
              {selectedSid && usedSids.has(selectedSid) && (
                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--pink)', lineHeight: 1.5 }}>
                  ※ 이미 다른 계정에 연결된 자리예요. 본인 자리가 맞다면 신청 후 선생님께 말씀드리면 옮겨 드려요(기록 보존).
                </p>
              )}
              {errBox}
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 16 }} onClick={submitRequest} disabled={busy}>
                {busy ? '신청 중…' : '입장 신청하기'}
              </button>
              <button className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={cancelPending}>
                ← 다른 계정으로 다시 로그인
              </button>
            </div>
          ) : tab === 'student' ? (
            /* 학생 구글 로그인 */
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 14 }}>
                학교 구글 계정(<b>@{SCHOOL_EMAIL_DOMAIN}</b>)으로 로그인하세요.<br />
                처음 한 번만 명단에서 본인 이름을 골라 신청하면, 선생님 승인 후 자동으로 연결돼요.
              </div>
              {errBox}
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 4 }} onClick={enterAsStudent} disabled={busy}>
                {busy ? '로그인 중…' : '구글 계정으로 신전에 입장'}
              </button>
              <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                ※ 학교 구글 계정이 아니면 입장이 안 돼요. 담임 선생님께 확인해 주세요.
              </p>
            </div>
          ) : (
            /* 교사 구글 로그인 */
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 14 }}>
                <b>구글 계정</b>이면 학교·개인 상관없이 로그인할 수 있어요. 로그인 창에서 계정을 직접 고르세요.
                운영자로 <b>등록된 계정만</b> 교사 신전에 통과합니다.
              </div>
              {errBox}
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 4 }} onClick={enterAsTeacher} disabled={busy}>
                {busy ? '로그인 중…' : '구글 계정으로 교사 입장'}
              </button>
              <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                ※ 학급 운영자로 등록된 구글 계정만 입장할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted-3)', marginTop: 20, fontFamily: 'var(--font-title)' }}>
          © 신의반 · MMXXVI
        </p>
      </div>
    </div>
  )
}
