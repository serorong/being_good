/* 모두의 도서관 전용 페이지 — 공용 소품 (버튼·모달·진행률) */
import type { LibRecord } from '../types'

export function LBtn({ children, onClick, kind = 'default', sm, disabled, type = 'button' }: {
  children: React.ReactNode
  onClick?: () => void
  kind?: 'default' | 'primary' | 'quiet' | 'danger'
  sm?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const cls = ['lib-btn']
  if (kind !== 'default') cls.push(`lib-btn--${kind}`)
  if (sm) cls.push('lib-btn--sm')
  return (
    <button type={type} className={cls.join(' ')} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function LModal({ open, onClose, title, children, maxWidth = 640 }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode; maxWidth?: number
}) {
  if (!open) return null
  return (
    <div className="lib-modal-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="lib-modal" style={{ maxWidth }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="닫기" className="lib-btn lib-btn--quiet lib-btn--sm" style={{ minWidth: 34 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function LProgress({ rec }: { rec: LibRecord }) {
  const total = rec.book.totalPages ?? 0
  const pct = rec.finished ? 100 : total > 0 ? Math.min(100, Math.round((rec.currentPage / total) * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="lib-progress"><div className={rec.finished ? 'done' : ''} style={{ width: `${pct}%` }} /></div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lib-sub)', minWidth: 36, textAlign: 'right' }}>
        {rec.finished ? '완독' : total > 0 ? `${pct}%` : `${rec.currentPage}쪽`}
      </span>
    </div>
  )
}

export function BookCover({ title, thumbnail, size = 44 }: { title?: string; thumbnail?: string; size?: number }) {
  return thumbnail ? (
    <img src={thumbnail} alt={title ? `『${title}』 표지` : ''} style={{ width: size, height: size * 1.45, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--lib-line)', flexShrink: 0 }} />
  ) : (
    <div aria-hidden style={{ width: size, height: size * 1.45, borderRadius: 4, border: '1px solid var(--lib-line)', background: 'var(--lib-amber-soft)', display: 'grid', placeItems: 'center', fontSize: size / 2.6, flexShrink: 0 }}>📕</div>
  )
}
