import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { emotionCategoryOf, itemsUnlockedAt, levelFromXp, themesUnlockedAt, todayStr, type EmotionCatKey } from '../data'
import { useRoster, useStudentStateMap } from '../state'
import type { DiaryEntry, Student } from '../types'
import EmotionPicker from '../components/EmotionPicker'

export default function DiaryPage() {
  const [auth] = useAuth()
  const roster = useRoster()
  const me = auth?.role === 'student' && auth.studentId
    ? roster.find(s => s.id === auth.studentId) ?? null
    : null

  return (
    <section className="sin-screen">
      <div style={{ marginBottom: 14 }}>
        <h1 className="page-title">감정일기 <span style={{ fontSize: 28 }}>🌿</span></h1>
        <p className="page-subtitle">오늘 하루, 내 마음을 차근차근 기록해요.</p>
      </div>

      {me ? <StudentDiary student={me} /> : auth?.role === 'teacher' ? <TeacherDiaryHint /> : null}
    </section>
  )
}

function StudentDiary({ student }: { student: Student }) {
  const { get, update } = useStudentStateMap()
  const state = get(student.id)
  const today = todayStr()
  const existing = state.diaries?.find(d => d.date === today)

  const [situation, setSituation] = useState(existing?.situation ?? '')
  const [emotions, setEmotions] = useState<string[]>(existing?.emotions ?? (existing?.emotion ? [existing.emotion] : []))
  const [reason, setReason] = useState(existing?.reason ?? '')
  const [savedAt, setSavedAt] = useState<string | null>(existing?.updatedAt ?? null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [params] = useSearchParams()
  const [openId, setOpenId] = useState<string | null>(() => params.get('d'))

  const past = useMemo(
    () => [...(state.diaries ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [state.diaries]
  )

  const save = () => {
    if (!situation.trim() && !reason.trim() && emotions.length === 0) {
      alert('상황·감정·이유 중 적어도 하나는 작성해 주세요.')
      return
    }
    // 고른 감정들의 중분류 중 하나만 랜덤 선정 → 마음구슬 1개
    const cats = Array.from(new Set(emotions.map(w => emotionCategoryOf(w)).filter(Boolean))) as EmotionCatKey[]
    const beadKey = cats.length > 0 ? cats[Math.floor(Math.random() * cats.length)] : undefined
    const entry: DiaryEntry = {
      date: today,
      situation: situation.trim(),
      emotion: emotions[0] ?? '',
      emotions,
      reason: reason.trim(),
      updatedAt: new Date().toISOString(),
      ...(beadKey ? { beadKey } : {}),
    }
    if (existing?.teacherFeedback) entry.teacherFeedback = existing.teacherFeedback
    if (existing?.feedbackAt) entry.feedbackAt = existing.feedbackAt
    const alreadyToday = !!existing
    let levelUp: { from: number; to: number } | null = null

    update(
      student.id,
      s => {
        const ds = (s.diaries ?? []).filter(d => d.date !== today)
        ds.push(entry)
        if (alreadyToday) return { ...s, diaries: ds }
        const oldXp = s.xp ?? 0
        const newXp = Math.max(0, oldXp + 10)
        const oldLvl = levelFromXp(oldXp).level
        const newLvl = levelFromXp(newXp).level
        let unlockedThemes = s.unlockedThemes ?? themesUnlockedAt(oldLvl)
        let ownedItemIds = s.ownedItemIds
        if (newLvl > oldLvl) {
          unlockedThemes = Array.from(new Set([...unlockedThemes, ...themesUnlockedAt(newLvl)]))
          const newItems = itemsUnlockedAt(newLvl).filter(id => !ownedItemIds.includes(id))
          if (newItems.length > 0) ownedItemIds = [...ownedItemIds, ...newItems]
          levelUp = { from: oldLvl, to: newLvl }
        }
        return { ...s, diaries: ds, xp: newXp, unlockedThemes, ownedItemIds }
      },
      (err) => {
        alert(`⚠ 일지 저장 중 문제가 생겼어요. 새로고침(Cmd+Shift+R) 후 다시 저장해 주세요.\n\n오류: ${String(err)}`)
      }
    )
    setSavedAt(entry.updatedAt)
    if (!alreadyToday) {
      if (levelUp) {
        const lu = levelUp as { from: number; to: number }
        alert(`✨ 일지 저장 완료! 레벨업! Lv.${lu.from} → Lv.${lu.to}`)
      } else {
        alert('🪶 오늘의 일지가 저장됐어요.')
      }
    } else {
      alert('🪶 오늘의 일지를 다시 저장했어요.')
    }
  }

  return (
    <div className="diary-grid">
      <div className="stack">
        {/* 1. 상황 */}
        <div className="card">
          <StepHead n={1} title="상황" hint="오늘 어떤 일이 있었나요?" />
          <textarea
            className="textarea"
            style={{ height: 96, marginTop: 12 }}
            value={situation}
            onChange={e => setSituation(e.target.value)}
            placeholder="예) 친구와 다퉜어요."
          />
        </div>

        {/* 2. 감정 */}
        <div className="card">
          <StepHead n={2} title="감정 고르기" hint="감정단어의 숲에서 최대 4개까지 골라요." />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button className="btn btn--leaf" onClick={() => setPickerOpen(true)}>🌳 감정단어의 숲 ({emotions.length}/4)</button>
            {emotions.length === 0 ? (
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>아직 고르지 않았어요.</span>
            ) : (
              emotions.map(w => (
                <span key={w} className="chip chip--green">
                  {w}
                  <button onClick={() => setEmotions(prev => prev.filter(x => x !== w))} style={{ marginLeft: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pink)' }} aria-label={`${w} 제거`}>✕</button>
                </span>
              ))
            )}
          </div>
        </div>
        {pickerOpen && <EmotionPicker values={emotions} onChange={setEmotions} onClose={() => setPickerOpen(false)} />}

        {/* 3. 이유 */}
        <div className="card">
          <StepHead n={3} title="이유" hint="그 감정을 느낀 이유를 적어보세요." />
          <textarea
            className="textarea"
            style={{ height: 84, marginTop: 12 }}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="예) 친구가 내 말을 이해해 주지 않아서 속상했어요."
          />
        </div>

        <button className="btn btn--primary" style={{ padding: 16, fontSize: 18 }} onClick={save}>🌱 선생님께 제출하기</button>

        {/* 지난 일지 */}
        <div className="stack">
          <h2 className="card-title">📚 지난 일지</h2>
          {past.length === 0 ? (
            <div className="card--leaf" style={{ borderRadius: 'var(--r-md)', padding: 16, fontSize: 14, color: 'var(--text-2)' }}>
              아직 작성한 일지가 없어요. 오늘 첫 일지를 남겨볼까요?
            </div>
          ) : (
            past.map(d => {
              const hasFb = !!d.teacherFeedback
              const isOpen = openId === d.date
              return (
                <div key={d.date} className="card" style={{ padding: 0 }}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : d.date)}
                    style={{ width: '100%', textAlign: 'left', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-title)', fontSize: 15, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {d.date}
                        {hasFb
                          ? <span className="chip chip--pink" style={{ fontSize: 10 }}>🌿 답장 도착</span>
                          : d.read && <span className="chip chip--green" style={{ fontSize: 10 }}>👀 읽음</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {emotionsOf(d).length > 0 && <span style={{ marginRight: 8 }}>🌳 {emotionsOf(d).join(', ')}</span>}
                        {d.situation || d.reason || '(내용 없음)'}
                      </div>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '4px 16px 16px', borderTop: '1.5px dashed var(--border-strong)', fontSize: 14 }}>
                      <Block label="상황" body={d.situation} />
                      <Block label="감정" body={emotionsOf(d).join(', ')} />
                      <Block label="이유" body={d.reason} />
                      {hasFb && (
                        <div className="card--leaf" style={{ marginTop: 12, padding: 12, borderRadius: 'var(--r-md)' }}>
                          <div style={{ fontFamily: 'var(--font-title)', fontSize: 12, color: 'var(--green)', marginBottom: 4 }}>
                            🌿 선생님 피드백 {d.feedbackAt && <span style={{ color: 'var(--muted)' }}>· {new Date(d.feedbackAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</span>}
                          </div>
                          <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', margin: 0 }}>{d.teacherFeedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 사이드: 기록 팁 */}
      <div className="card" style={{ position: 'sticky', top: 18 }}>
        <div className="card-title" style={{ marginBottom: 14 }}>🌱 기록 팁</div>
        <div className="stack">
          <Tip emoji="💗" title="있는 그대로 적어요" body="좋은 감정·힘든 감정 모두 솔직하게." />
          <div className="divider--dash" />
          <Tip emoji="🌱" title="자세히 적어요" body="어떤 일이 있었고 어떻게 느꼈는지 자세할수록 좋아요." />
          <div className="divider--dash" />
          <Tip emoji="🌸" title="나에게 친절하게" body="나를 비난하지 말고 따뜻하게 이해하는 마음으로." />
        </div>
        {savedAt && (
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
            ✓ 저장됨 · {new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  )
}

function TeacherDiaryHint() {
  return (
    <div className="card">
      <h2 className="card-title" style={{ marginBottom: 8 }}>교사 안내</h2>
      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
        학생 감정일기는 <b>학급관리 → 감정일기</b>에서 모아 보고 피드백을 남길 수 있어요. 피드백 등록 시 학생 화면에 <b>!</b> 표시가 붙어요.
      </p>
      <div style={{ marginTop: 16 }}>
        <Link to="/app/admin" className="btn btn--primary" style={{ textDecoration: 'none' }}>학급관리로 이동</Link>
      </div>
    </div>
  )
}

function StepHead({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
      <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--green-btn)', color: '#fff', fontFamily: 'var(--font-title)', fontSize: 16, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{n}</span>
      <span style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--text)' }}>{title}</span>
      <span style={{ fontSize: 13, color: 'var(--muted-2)' }}>{hint}</span>
    </div>
  )
}

function Tip({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-title)', fontSize: 15, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>{body}</div>
      </div>
    </div>
  )
}

function emotionsOf(d: DiaryEntry): string[] {
  if (d.emotions && d.emotions.length > 0) return d.emotions
  return d.emotion ? [d.emotion] : []
}

function Block({ label, body }: { label: string; body?: string }) {
  if (!body) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontFamily: 'var(--font-title)', fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', margin: '2px 0 0' }}>{body}</p>
    </div>
  )
}
