/* 가운데 떠오르는 모달 오버레이 (미니룸 공용) */
export function Modal({ open, onClose, title, children, maxWidth = 860 }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; maxWidth?: number }) {
  if (!open) return null
  return (
    <div
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(40,25,40,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 16 }}
    >
      <div style={{ background: '#fffdf9', border: '3px solid #3a2b3a', borderRadius: 18, padding: 18, width: '100%', maxWidth, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 16px 40px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#3a2b3a' }}>{title}</div>
          <button onClick={onClose} aria-label="닫기" style={{ border: '2px solid #3a2b3a', background: '#fff', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, fontWeight: 800 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
