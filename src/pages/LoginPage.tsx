import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc as fsDoc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth'
import { defaultClassInfo, DIVINE_CLASS_ID, isDajeongTeacherEmail, isTeacherEmail } from '../data'
import { SCHOOL_EMAIL_DOMAIN, signInStudentWithGoogle, signInWithGoogle, signOutFirebase } from '../firebase'
import { getMappedSid, getMyJoinRequest, submitJoinRequest, useRoster, useStudentEmailMap } from '../state'
import type { ClassInfo, MenuConfig, ClassTerms } from '../types'

type Tab = 'student' | 'teacher'
type StudentStep = 'pickClass' | 'choose' | 'waiting'
type TeacherStep = 'login' | 'createClass'

const INIT_TERMS: ClassTerms = { className: '', subtitle: '', studentTitle: '학생', cookieName: '쿠키' }

async function loadTeacherClasses(email: string): Promise<ClassInfo[]> {
  try {
    const q = query(collection(db, 'classes'), where('teacherEmail', '==', email))
    const snap = await getDocs(q)
    const result: ClassInfo[] = []
    snap.forEach(d => { if (d.data().classId) result.push(d.data() as ClassInfo) })
    return result
  } catch { return [] }
}

async function loadAllClasses(): Promise<ClassInfo[]> {
  try {
    const snap = await getDocs(collection(db, 'classes'))
    const result: ClassInfo[] = []
    snap.forEach(d => { if (d.data().classId) result.push(d.data() as ClassInfo) })
    return result
  } catch { return [] }
}

export default function LoginPage() {
  const [, setAuth] = useAuth()
  const nav = useNavigate()
  const divineRoster = useRoster()
  const [emailMap] = useStudentEmailMap()
  const [tab, setTab] = useState<Tab>('student')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  // 학생 상태
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [pendingDisplayName, setPendingDisplayName] = useState('')
  const [studentStep, setStudentStep] = useState<StudentStep>('pickClass')
  const [selectedSid, setSelectedSid] = useState('')
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classRoster, setClassRoster] = useState(divineRoster)

  // 교사 상태
  const [teacherStep, setTeacherStep] = useState<TeacherStep>('login')
  const [teacherEmail, setTeacherEmail] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [createTerms, setCreateTerms] = useState<ClassTerms>(INIT_TERMS)
  const [createMenus, setCreateMenus] = useState<MenuConfig[]>(defaultClassInfo('_', '_').menus)

  const usedSids = new Set(Object.values(emailMap))

  useEffect(() => {
    if (!selectedClassId || selectedClassId === DIVINE_CLASS_ID) { setClassRoster(divineRoster); return }
    getDoc(fsDoc(db, 'classes', selectedClassId, 'state', 'roster')).then(snap => {
      if (snap.exists()) {
        const val = snap.data()?.value
        if (Array.isArray(val)) setClassRoster(val)
      }
    }).catch(console.error)
  }, [selectedClassId, divineRoster])

  useEffect(() => {
    if (!pendingEmail) return
    const sid = emailMap[pendingEmail]
    if (!sid) return
    const student = classRoster.find(s => s.id === sid)
    if (student) {
      setAuth({ role: 'student', studentId: student.id, classId: selectedClassId || DIVINE_CLASS_ID })
      nav('/app', { replace: true })
    }
  }, [emailMap, pendingEmail, classRoster, setAuth, nav, selectedClassId])

  /* ── 학생 ── */

  const enterAsStudent = async () => {
    setErr(''); setBusy(true)
    try {
      const user = await signInStudentWithGoogle()
      const email = (user.email ?? '').toLowerCase()
      if (!email.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
        await signOutFirebase()
        setErr(`학교 구글 계정(@${SCHOOL_EMAIL_DOMAIN})으로 로그인해 주세요.`)
        return
      }
      if (isTeacherEmail(email)) {
        await signOutFirebase()
        setErr('선생님 계정이에요. 「교사」 탭에서 입장해 주세요.')
        return
      }
      // divine 매핑 먼저 확인
      const divSid = await getMappedSid(email, DIVINE_CLASS_ID)
      if (divSid && divineRoster.find(s => s.id === divSid)) {
        setAuth({ role: 'student', studentId: divSid, classId: DIVINE_CLASS_ID })
        nav('/app', { replace: true }); return
      }
      // 다른 반 확인
      const allClasses = await loadAllClasses()
      for (const ci of allClasses.filter(c => c.classId !== DIVINE_CLASS_ID)) {
        const sid = await getMappedSid(email, ci.classId)
        if (sid) {
          setAuth({ role: 'student', studentId: sid, classId: ci.classId })
          nav('/app', { replace: true }); return
        }
      }
      // 신규 → 반 선택
      setPendingEmail(email)
      setPendingDisplayName(user.displayName ?? '')
      const classes = [...allClasses]
      if (!classes.some(c => c.classId === DIVINE_CLASS_ID)) {
        const div = defaultClassInfo(DIVINE_CLASS_ID, 'imogen0716@dajeong.sjedues.kr')
        div.terms.className = '신의반 신전'
        classes.unshift(div)
      }
      setAvailableClasses(classes)
      setStudentStep('pickClass')
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') setErr('로그인 창이 닫혔어요.')
      else setErr(`구글 로그인에 실패했어요. (${code || (e as Error)?.message || '오류'})`)
    } finally { setBusy(false) }
  }

  const confirmClassPick = async () => {
    if (!selectedClassId || !pendingEmail) { setErr('반을 선택해 주세요.'); return }
    setBusy(true)
    try {
      const existing = await getMyJoinRequest(pendingEmail, selectedClassId)
      if (existing) { setSelectedSid(existing.studentId); setStudentStep('waiting') }
      else setStudentStep('choose')
    } finally { setBusy(false) }
  }

  const submitRequest = async () => {
    setErr('')
    if (!pendingEmail || !selectedSid) { setErr('명단에서 본인 이름을 선택해 주세요.'); return }
    const student = classRoster.find(s => s.id === selectedSid)
    if (!student) { setErr('선택한 자리를 찾을 수 없어요.'); return }
    setBusy(true)
    try {
      await submitJoinRequest({ email: pendingEmail, studentId: student.id, studentName: student.realName, displayName: pendingDisplayName, requestedAt: new Date().toISOString() }, selectedClassId)
      setStudentStep('waiting')
    } catch (e: unknown) {
      setErr(`신청에 실패했어요. (${(e as Error)?.message ?? '오류'})`)
    } finally { setBusy(false) }
  }

  const checkApproved = async () => {
    if (!pendingEmail) return
    setErr(''); setBusy(true)
    try {
      const sid = await getMappedSid(pendingEmail, selectedClassId)
      if (sid && classRoster.find(s => s.id === sid)) {
        setAuth({ role: 'student', studentId: sid, classId: selectedClassId || DIVINE_CLASS_ID })
        nav('/app', { replace: true }); return
      }
      setErr('아직 승인되지 않았어요. 선생님이 승인하면 바로 입장돼요.')
    } finally { setBusy(false) }
  }

  const cancelPending = async () => {
    setPendingEmail(null); setSelectedSid(''); setStudentStep('pickClass')
    setSelectedClassId(''); setErr(''); await signOutFirebase()
  }

  /* ── 교사 ── */

  const enterAsTeacher = async () => {
    setErr(''); setBusy(true)
    try {
      const user = await signInWithGoogle()
      const email = (user.email ?? '').toLowerCase()
      if (!isDajeongTeacherEmail(email)) {
        await signOutFirebase()
        setErr(`다정초 교사 계정(@${SCHOOL_EMAIL_DOMAIN})이 아니에요: ${email || '(이메일 없음)'}`)
        return
      }
      setTeacherEmail(email); setTeacherName(user.displayName ?? '선생님')
      const existing = await loadTeacherClasses(email)
      if (existing.length > 0) {
        setAuth({ role: 'teacher', teacherName: user.displayName ?? '선생님', teacherEmail: email, classId: existing[0].classId })
        nav('/app', { replace: true }); return
      }
      if (isTeacherEmail(email)) {
        setAuth({ role: 'teacher', teacherName: user.displayName ?? '선생님', teacherEmail: email, classId: DIVINE_CLASS_ID })
        nav('/app', { replace: true }); return
      }
      setTeacherStep('createClass')
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') setErr('로그인 창이 닫혔어요.')
      else setErr(`구글 로그인에 실패했어요. (${code || (e as Error)?.message || '오류'})`)
    } finally { setBusy(false) }
  }

  const createClass = async () => {
    if (!createTerms.className.trim()) { setErr('반 이름을 입력해 주세요.'); return }
    setBusy(true); setErr('')
    try {
      const newRef = fsDoc(collection(db, 'classes'))
      const classId = newRef.id
      const info: ClassInfo = { classId, teacherEmail, createdAt: new Date().toISOString(), terms: createTerms, menus: createMenus }
      await setDoc(fsDoc(db, 'classes', classId, 'info', 'data'), info)
      await setDoc(fsDoc(db, 'classes', classId), info)
      setAuth({ role: 'teacher', teacherName, teacherEmail, classId })
      nav('/app', { replace: true })
    } catch (e: unknown) {
      setErr(`반 개설에 실패했어요. (${(e as Error)?.message ?? '오류'})`)
    } finally { setBusy(false) }
  }

  /* ── 렌더 ── */

  const errBox = err ? <div style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--pink)', lineHeight: 1.5 }}>⚠ {err}</div> : null
  const selectedStudent = classRoster.find(s => s.id === selectedSid)

  return (
    <div className="sin-app" style={{ alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'var(--green-soft-2)' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img src="/assets/logo_mascot.png" alt="로고" style={{ width: 84, height: 84, objectFit: 'contain' }} />
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 32, color: 'var(--green)', marginTop: 6 }}>마음마을 교실</div>
          <div style={{ fontSize: 14, color: 'var(--muted-2)', marginTop: 4 }}>다정초등학교</div>
        </div>

        <div className="card">

          {teacherStep === 'createClass' ? (
            /* 반 개설 마법사 */
            <div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--text)', marginBottom: 14 }}>새 반 개설하기</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>{teacherName} 선생님 ({teacherEmail})</div>

              <label style={{ display: 'block', fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>반 이름 <span style={{ color: 'var(--pink)' }}>*</span></label>
              <input className="input" placeholder="예: 별빛반 우주기지" value={createTerms.className}
                onChange={e => setCreateTerms(p => ({ ...p, className: e.target.value }))} style={{ marginBottom: 12 }} autoFocus />

              <label style={{ display: 'block', fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>부제 (헤더 작은 글씨)</label>
              <input className="input" placeholder="예: 5학년 1반 마음마을" value={createTerms.subtitle}
                onChange={e => setCreateTerms(p => ({ ...p, subtitle: e.target.value }))} style={{ marginBottom: 12 }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>학생 호칭</label>
                  <input className="input" placeholder="예: 탐험가" value={createTerms.studentTitle}
                    onChange={e => setCreateTerms(p => ({ ...p, studentTitle: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>화폐 이름</label>
                  <input className="input" placeholder="예: 별조각" value={createTerms.cookieName}
                    onChange={e => setCreateTerms(p => ({ ...p, cookieName: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 11.5, color: 'var(--muted-3)', lineHeight: 1.5 }}>학생을 부르는 명칭이에요.<br/>예) 신민, 탐험가, 마을주민</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-3)', lineHeight: 1.5 }}>미션·퀘스트 보상으로 쌓이는<br/>학급 화폐 이름이에요.</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 10 }}>사용할 메뉴 선택 및 이름 설정</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {createMenus.map((m, i) => {
                    const desc: Record<string, string> = {
                      notice:    '선생님이 올리는 공지·숙제 안내',
                      quests:    '학생이 도전하는 퀘스트 목록',
                      missions:  '학급 전체가 함께하는 과제',
                      shop:      `화폐로 아이템을 구매하는 공간`,
                      offerings: '선생님이 학생에게 보내는 선물함',
                      shrine:    '모둠별 꾸미기 공간(미니룸)',
                    }
                    return (
                      <div key={m.key} style={{ marginBottom: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                          <input type="checkbox" checked={m.enabled}
                            onChange={e => setCreateMenus(prev => prev.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} />
                          <input className="input" value={m.label} style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                            onChange={e => setCreateMenus(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                        </label>
                        <div style={{ fontSize: 11.5, color: 'var(--muted-3)', marginTop: 3, marginLeft: 26, lineHeight: 1.4 }}>{desc[m.key]}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-3)', marginTop: 2 }}>체크 = 표시 / 텍스트 = 메뉴 이름 변경</div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--muted-2)', marginBottom: 12, lineHeight: 1.5 }}>
                💡 학생 명단은 반 개설 후 <b>학급관리 → 학생 명단</b>에서 추가할 수 있어요.
              </div>

              {errBox}
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 8 }} onClick={createClass} disabled={busy}>
                {busy ? '개설 중…' : '반 개설하고 시작하기'}
              </button>
              <button className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setTeacherStep('login')}>← 뒤로</button>
            </div>

          ) : pendingEmail && studentStep === 'waiting' ? (
            <div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>선생님 승인을 기다리는 중이에요</div>
              <div className="card--leaf" style={{ borderRadius: 'var(--r-md)', padding: 14, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
                <div><b>{selectedStudent?.realName ?? '학생'}</b> 자리로 입장을 신청했어요.</div>
                <div style={{ opacity: .8, marginTop: 4 }}>{pendingDisplayName} ({pendingEmail})</div>
                <div style={{ marginTop: 8 }}>담임 선생님이 승인하면 <b>자동으로 입장</b>돼요.</div>
              </div>
              {errBox}
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 16 }} onClick={checkApproved} disabled={busy}>{busy ? '확인 중…' : '승인됐는지 확인하기'}</button>
              <button className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => { setStudentStep('choose'); setErr('') }}>다른 자리로 다시 신청</button>
              <button className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={cancelPending}>← 다른 계정으로 다시 로그인</button>
            </div>

          ) : pendingEmail && studentStep === 'choose' ? (
            <div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>처음 입장하시네요!</div>
              <div className="card--leaf" style={{ borderRadius: 'var(--r-md)', padding: 14, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
                <div><b>{pendingDisplayName || '학생'}</b> 님 ({pendingEmail})</div>
                <div style={{ marginTop: 4 }}>명단에서 <b>본인 이름</b>을 선택해 신청하세요. 선생님 승인 후 연결돼요.</div>
              </div>
              <label style={{ display: 'block', fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>내 이름</label>
              <select className="input" value={selectedSid} onChange={e => setSelectedSid(e.target.value)} autoFocus>
                <option value="">— 이름을 선택하세요 —</option>
                {classRoster.map(s => (
                  <option key={s.id} value={s.id}>{s.realName}{usedSids.has(s.id) ? ' (이미 연결됨)' : ''}</option>
                ))}
              </select>
              {selectedSid && usedSids.has(selectedSid) && (
                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--pink)', lineHeight: 1.5 }}>
                  ※ 이미 다른 계정에 연결된 자리예요. 본인 자리가 맞다면 신청 후 선생님께 말씀드려요.
                </p>
              )}
              {errBox}
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 16 }} onClick={submitRequest} disabled={busy}>{busy ? '신청 중…' : '입장 신청하기'}</button>
              <button className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={cancelPending}>← 다른 계정으로 다시 로그인</button>
            </div>

          ) : pendingEmail && studentStep === 'pickClass' ? (
            <div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>어느 반에 들어갈까요?</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.6 }}>
                {pendingDisplayName} 님 ({pendingEmail})<br />담임 선생님의 반을 선택해 주세요.
              </div>
              <label style={{ display: 'block', fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>반 선택</label>
              <select className="input" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                <option value="">— 반을 선택하세요 —</option>
                {availableClasses.map(c => (<option key={c.classId} value={c.classId}>{c.terms.className}</option>))}
              </select>
              {errBox}
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 16 }} onClick={confirmClassPick} disabled={busy || !selectedClassId}>{busy ? '확인 중…' : '이 반으로 입장 신청'}</button>
              <button className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={cancelPending}>← 다른 계정으로 다시 로그인</button>
            </div>

          ) : (
            <>
              <div className="tabs tabs--filled" style={{ marginBottom: 18 }}>
                <button className={`tab ${tab === 'student' ? 'is-active' : ''}`} onClick={() => { setTab('student'); setErr('') }}>학생</button>
                <button className={`tab ${tab === 'teacher' ? 'is-active' : ''}`} onClick={() => { setTab('teacher'); setErr(''); setTeacherStep('login') }}>교사</button>
              </div>
              {tab === 'student' ? (
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 14 }}>
                    학교 구글 계정(<b>@{SCHOOL_EMAIL_DOMAIN}</b>)으로 로그인하세요.<br />
                    처음 한 번만 반과 이름을 골라 신청하면, 선생님 승인 후 자동으로 연결돼요.
                  </div>
                  {errBox}
                  <button className="btn btn--primary" style={{ width: '100%', marginTop: 4 }} onClick={enterAsStudent} disabled={busy}>{busy ? '로그인 중…' : '구글 계정으로 입장'}</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 14 }}>
                    다정초 구글 계정(<b>@{SCHOOL_EMAIL_DOMAIN}</b>)으로 로그인하세요.<br />
                    처음이라면 반 개설 마법사가 나타나요.
                  </div>
                  {errBox}
                  <button className="btn btn--primary" style={{ width: '100%', marginTop: 4 }} onClick={enterAsTeacher} disabled={busy}>{busy ? '로그인 중…' : '구글 계정으로 교사 입장'}</button>
                </div>
              )}
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted-3)', marginTop: 20, fontFamily: 'var(--font-title)' }}>
          © 다정초 마음마을 · MMXXVI
        </p>
      </div>
    </div>
  )
}
