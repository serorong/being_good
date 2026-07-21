/* ──────────────────────────────────────────────────────────────
   실시간 독서 상태바 — 웹사이트 하단 어디서든 친구들의 독서 상태를 보여준다.
   도서관 페이지에서는 숨김 (거기선 좌석으로 이미 보이니까).
   ────────────────────────────────────────────────────────────── */
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRoster } from '../state'
import { useClassInfo } from '../ClassContext'
import { liveness, useLibRecords, useLibStatuses } from './store'
import { TEACHER_NAME, TEACHER_SID } from './types'

const COLLAPSE_KEY = 'library.statusbar.collapsed'

export function LibraryStatusBar() {
  const statuses = useLibStatuses()
  const records = useLibRecords()
  const roster = useRoster()
  const { classInfo } = useClassInfo()
  const location = useLocation()
  const nav = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')

  const enabled = classInfo.menus.find(m => m.key === 'library')?.enabled ?? false
  const onLibrary = location.pathname.startsWith('/app/library')

  const now = Date.now()
  const active = useMemo(
    () => statuses.filter(s => (s.sid === TEACHER_SID || roster.some(r => r.id === s.sid)) && liveness(s, now) !== 'gone'),
    [statuses, roster, now])

  if (!enabled || onLibrary || active.length === 0) return null

  const toggle = () => {
    setCollapsed(c => {
      localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      return !c
    })
  }

  const nameOf = (sid: string) => sid === TEACHER_SID ? `👩‍🏫 ${TEACHER_NAME}` : roster.find(r => r.id === sid)?.heroName || sid
  const readingCount = active.filter(s => liveness(s, now) === 'reading').length

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 900,
      fontFamily: "'Galmuri11','DungGeunMo',sans-serif",
      background: '#fbf6ea', borderTop: '2px solid #3a2b3a',
      boxShadow: '0 -4px 12px rgba(58,43,58,0.12)',
    }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav('/app/library')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, color: '#2e7d52', flexShrink: 0, padding: 0 }}>
          📚 도서관 <span style={{ background: '#2e7d52', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 11 }}>{readingCount}명 독서 중</span>
        </button>

        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'thin', padding: '2px 0' }}>
            {active.map(s => {
              const live = liveness(s, now)
              const rec = records.find(r => r.id === s.recordId)
              const total = rec?.book.totalPages ?? 0
              const pct = rec && total > 0 ? Math.min(100, Math.round((rec.currentPage / total) * 100)) : null
              return (
                <span key={s.sid} style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 10px',
                  border: '1px solid #d3b98c', whiteSpace: 'nowrap',
                  background: live === 'reading' ? '#e6f2ea' : '#fff',
                  color: live === 'reading' ? '#2e7d52' : live === 'away' ? '#a08a62' : '#4a7fc1',
                }}>
                  {live === 'reading' ? '📖' : live === 'away' ? '😴' : '💭'} {nameOf(s.sid)}
                  {s.book && live !== 'away' && ` · ${s.book.title.length > 12 ? `${s.book.title.slice(0, 12)}…` : s.book.title}`}
                  {pct !== null && live === 'reading' && ` ${pct}%`}
                </span>
              )
            })}
          </div>
        )}
        {collapsed && <span style={{ flex: 1 }} />}

        <button onClick={toggle} aria-label={collapsed ? '상태바 펼치기' : '상태바 접기'}
          style={{ flexShrink: 0, background: '#fff', border: '1px solid #d3b98c', borderRadius: 6, width: 26, height: 22, cursor: 'pointer', fontSize: 11, color: '#8a6d4a', lineHeight: 1 }}>
          {collapsed ? '▲' : '▼'}
        </button>
      </div>
    </div>
  )
}
