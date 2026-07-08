import { useMemo, useState } from 'react'
import { useOfferings } from '../state'
import type { Offering } from '../types'

export default function OfferingsPage() {
  const [offerings] = useOfferings()
  const [selected, setSelected] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...offerings].sort((a, b) => b.postedAt.localeCompare(a.postedAt)),
    [offerings]
  )
  const current = sorted.find(o => o.id === selected) ?? sorted[0]

  return (
    <section className="sin-screen">
      <div style={{ marginBottom: 14 }}>
        <h1 className="page-title">제물 <span style={{ fontSize: 28 }}>🌿</span></h1>
        <p className="page-subtitle">선생님이 올린 미니게임·활동 자료·공지를 모아둔 곳이에요.</p>
      </div>

      {sorted.length === 0 ? (
        <div className="card card--empty" style={{ padding: '40px 30px' }}>
          아직 게시된 제물이 없어요. 선생님이 「학급관리」에서 올리면 표시돼요.
        </div>
      ) : (
        <div className="split-grid">
          <aside className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map(o => {
              const on = current?.id === o.id
              return (
                <button
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: 12, cursor: 'pointer', borderRadius: 'var(--r-md)',
                    border: `2px solid ${on ? 'var(--green-line-2)' : 'var(--border)'}`,
                    background: on ? '#dcebbd' : 'var(--surface-2)',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {new Date(o.postedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}{o.link ? ' · 🔗' : ''}
                  </div>
                </button>
              )
            })}
          </aside>
          {current && <OfferingDetail o={current} />}
        </div>
      )}
    </section>
  )
}

function OfferingDetail({ o }: { o: Offering }) {
  return (
    <article className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="chip chip--green">{new Date(o.postedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        <span className="chip chip--blue">{o.author}</span>
      </div>
      <h2 className="card-title" style={{ fontSize: 24, margin: '14px 0' }}>{o.title}</h2>
      <div className="divider" style={{ margin: '14px 0' }} />
      <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{o.body}</p>
      {o.link && (
        <div style={{ marginTop: 20 }}>
          <a href={o.link} target="_blank" rel="noopener noreferrer" className="btn btn--primary" style={{ textDecoration: 'none' }}>🔗 제물 받기 (열기)</a>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, wordBreak: 'break-all' }}>{o.link}</div>
        </div>
      )}
    </article>
  )
}
