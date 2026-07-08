import { useMemo, useState } from 'react'
import { useNotices } from '../state'

const WD = ['일', '월', '화', '수', '목', '금', '토']

export default function NoticePage() {
  const [notices] = useNotices()
  const [day, setDay] = useState<number | 'all'>('all')

  // 이번 주 월요일 00:00 (월요일마다 새 주 시작)
  const weekStart = useMemo(() => {
    const now = new Date()
    const g = now.getDay()                 // 0=일 … 6=토
    const diffToMon = g === 0 ? -6 : 1 - g  // 이번 주 월요일까지의 일수
    const d = new Date(now)
    d.setDate(now.getDate() + diffToMon)
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const sorted = [...notices].sort((a, b) => b.postedAt.localeCompare(a.postedAt))
  // 전체: 모든 알림 누적 / 요일탭: 이번 주에 올라온 그 요일 알림만
  const filtered = day === 'all'
    ? sorted
    : sorted.filter(n => {
        const dt = new Date(n.postedAt)
        return dt >= weekStart && dt.getDay() === day
      })

  return (
    <section className="sin-screen" style={{ overflow: 'auto' }}>
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <h1 className="page-title">알림장 <span style={{ fontSize: 28 }}>🌿</span></h1>
        <p className="page-subtitle">요일을 선택하면 그날의 공지를 볼 수 있어요.</p>
      </div>

      <div className="tabs" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        <button className={`tab ${day === 'all' ? 'is-active' : ''}`} onClick={() => setDay('all')}>전체</button>
        {[1, 2, 3, 4, 5].map(d => (
          <button key={d} className={`tab ${day === d ? 'is-active' : ''}`} onClick={() => setDay(d)}>{WD[d]}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card card--empty">
          {day === 'all' ? '아직 등록된 알림이 없어요.' : `이번 주 ${WD[day as number]}요일 알림이 아직 없어요.`}
        </div>
      ) : (
        <div className="stack">
          {filtered.map(n => (
            <div key={n.id} className="card lift">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                <span className="chip chip--green">{WD[new Date(n.postedAt).getDay()]}요일</span>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--text)', lineHeight: 1.35 }}>{n.title}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                {new Date(n.postedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} · {n.author}
              </div>
              <div style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{n.body}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
