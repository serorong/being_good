/* 미니룸 페이지 보조 컴포넌트: 친구 고르기, 받은 선물함 */
import Sprite from '../components/Sprite'
import { Modal } from './Modal'
import type { Gift, Student, StudentState } from '../types'

export const MC = { pink: '#ff7eb3', pinkSoft: '#ffd6e8', cream: '#fff7fb', ink: '#3a2b3a', line: '#e59ec0', deep: '#d6457f' }

export function MiniBtn({ children, onClick, kind = 'default', small, disabled }: { children: React.ReactNode; onClick?: () => void; kind?: 'default' | 'primary' | 'ghost'; small?: boolean; disabled?: boolean }) {
  const bg = disabled ? '#e8d7df' : kind === 'primary' ? MC.pink : kind === 'ghost' ? '#fff' : MC.pinkSoft
  const color = kind === 'primary' ? '#fff' : MC.ink
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: bg, color, border: `2px solid ${MC.ink}`, borderRadius: 8, padding: small ? '4px 10px' : '8px 14px', fontSize: small ? 12 : 14, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, boxShadow: disabled ? 'none' : '0 3px 0 rgba(0,0,0,0.15)' }}>
      {children}
    </button>
  )
}

/* ── 친구 고르기 (선물 보낼 대상) ── */
export function FriendPicker({ open, onClose, students, stateOf, excludeSid, onPick }: {
  open: boolean; onClose: () => void; students: Student[]; stateOf: (sid: string) => StudentState; excludeSid?: string; onPick: (sid: string) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="🎁 누구에게 선물할까요?" maxWidth={520}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))', gap: 10 }}>
        {students.filter(s => s.id !== excludeSid).map(s => (
          <button key={s.id} onClick={() => onPick(s.id)}
            style={{ display: 'grid', placeItems: 'center', gap: 4, padding: 8, borderRadius: 12, border: `2px solid ${MC.line}`, background: MC.cream, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Sprite seed={s.avatarSeed} size={52} customSrc={stateOf(s.id)?.customAvatar} />
            <span style={{ fontSize: 12, fontWeight: 700, color: MC.ink }}>{s.heroName}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

/* ── 받은 선물함 ── */
export function GiftInbox({ gifts, onHang, onDiscard }: { gifts: Gift[]; onHang: (g: Gift) => void; onDiscard: (g: Gift) => void }) {
  if (!gifts.length) return null
  return (
    <div style={{ background: '#fff', border: `2px solid ${MC.ink}`, borderRadius: 12, padding: 12, marginTop: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 8, color: MC.deep }}>🎁 받은 선물 {gifts.length}개</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {gifts.map(g => (
          <div key={g.id} style={{ width: 150, border: `2px solid ${MC.line}`, borderRadius: 10, padding: 8, background: MC.cream }}>
            <div style={{ background: '#fff', border: '4px solid #caa86a', borderRadius: 6 }}>
              <img src={g.sketch} alt="" style={{ display: 'block', width: '100%', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }}><b style={{ color: MC.deep }}>{g.fromName}</b> 님의 선물</div>
            {g.sketchText && <div style={{ fontSize: 11, color: '#a06' }}>{g.sketchText}</div>}
            {g.message && <div style={{ fontSize: 11, color: '#7a5', marginTop: 2 }}>“{g.message}”</div>}
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              <MiniBtn small kind="primary" onClick={() => onHang(g)}>방에 걸기</MiniBtn>
              <MiniBtn small kind="ghost" onClick={() => onDiscard(g)}>버리기</MiniBtn>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
