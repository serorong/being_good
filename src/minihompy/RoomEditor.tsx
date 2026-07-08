/* ──────────────────────────────────────────────────────────────
   미니룸 편집기 — RoomView + 가구 팔레트 + 선택 편집 + 벽지/바닥
   room 을 받고 onChange(next) 로 통째 갱신한다(상위에서 Firestore 저장).
   ────────────────────────────────────────────────────────────── */
import { useState } from 'react'
import { CATS, SPRITES } from './sprites'
import { PixelSprite, RoomView, WALLS, FLOORS, newId, type DragTarget } from './room'
import type { MiniRoom, MiniRoomItem, MiniWallItem } from '../types'

const C = { pink: '#ff7eb3', pinkSoft: '#ffd6e8', cream: '#fff7fb', ink: '#3a2b3a', line: '#e59ec0', mint: '#9be7c4', sky: '#bfe3ff' }

const Btn = ({ children, onClick, kind = 'default', small }: { children: React.ReactNode; onClick?: () => void; kind?: 'default' | 'primary' | 'ghost'; small?: boolean }) => {
  const bg = kind === 'primary' ? C.pink : kind === 'ghost' ? '#fff' : C.pinkSoft
  const color = kind === 'primary' ? '#fff' : C.ink
  return (
    <button onClick={onClick} style={{ background: bg, color, border: `2px solid ${C.ink}`, borderRadius: 8, padding: small ? '4px 8px' : '8px 12px', fontSize: small ? 12 : 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, boxShadow: '0 3px 0 rgba(0,0,0,0.15)' }}>
      {children}
    </button>
  )
}
const Swatch = ({ on, color, onClick, label }: { on: boolean; color: string; onClick: () => void; label?: string }) => (
  <button title={label} onClick={onClick} style={{ width: 34, height: 34, borderRadius: 8, cursor: 'pointer', border: on ? `3px solid ${C.pink}` : `2px solid ${C.ink}`, background: color, padding: 0 }} />
)

export interface RoomEditorProps {
  room: MiniRoom
  onChange: (next: MiniRoom) => void
  seed: string
  customAvatar?: string
  owner: string
  /** 액자 가구를 선택했을 때 '그림 그리기' 버튼을 누르면 호출. */
  onPaintFrame?: (item: MiniRoomItem | MiniWallItem) => void
  /** 그림이 들어간 액자를 선택했을 때 '선물' 버튼을 누르면 호출. */
  onGiftFrame?: (item: MiniRoomItem | MiniWallItem) => void
}

export function RoomEditor({ room, onChange, seed, customAvatar, owner, onPaintFrame, onGiftFrame }: RoomEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cat, setCat] = useState('가구')

  const addItem = (key: string) => {
    const sp = SPRITES[key]
    if (!sp) return
    if (sp.wall) {
      const wi: MiniWallItem = { id: newId(), key, wall: 'L', col: 2, row: 0, scale: 1, flip: false }
      onChange({ ...room, wallItems: [...(room.wallItems || []), wi] })
      setSelectedId(wi.id)
    } else {
      const it: MiniRoomItem = { id: newId(), key, gc: 3, gr: 3, scale: 1, flip: false }
      onChange({ ...room, items: [...room.items, it] })
      setSelectedId(it.id)
    }
  }

  const onMove = (d: DragTarget, pos: { gc: number; gr: number } | { wall: 'L' | 'R'; col: number; row: number }) => {
    if (d.kind === 'avatar' && 'gc' in pos) onChange({ ...room, avatarGc: pos.gc, avatarGr: pos.gr })
    else if (d.kind === 'wall' && 'wall' in pos) onChange({ ...room, wallItems: room.wallItems.map((w) => (w.id === d.id ? { ...w, ...pos } : w)) })
    else if (d.kind === 'item' && 'gc' in pos) onChange({ ...room, items: room.items.map((i) => (i.id === d.id ? { ...i, gc: pos.gc, gr: pos.gr } : i)) })
  }

  const selFloor = room.items.find((i) => i.id === selectedId)
  const selWall = (room.wallItems || []).find((w) => w.id === selectedId)
  const sel = selFloor || selWall
  const isFrame = sel ? SPRITES[sel.key]?.cat === '액자' : false

  const patchSel = (patch: Partial<MiniRoomItem & MiniWallItem>) =>
    onChange({
      ...room,
      items: room.items.map((i) => (i.id === selectedId ? { ...i, ...patch } : i)),
      wallItems: (room.wallItems || []).map((w) => (w.id === selectedId ? { ...w, ...patch } : w)),
    })
  const delSel = () => {
    onChange({ ...room, items: room.items.filter((i) => i.id !== selectedId), wallItems: (room.wallItems || []).filter((w) => w.id !== selectedId) })
    setSelectedId(null)
  }

  const activeCat = CATS.find((c) => c.name === cat) || CATS[0]

  const card: React.CSSProperties = { background: '#fff', border: `2px solid ${C.ink}`, borderRadius: 10, padding: 10 }
  const sideCol: React.CSSProperties = { flex: '1 1 220px', minWidth: 210, maxWidth: 300, display: 'grid', gap: 10, alignContent: 'start' }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center', fontFamily: "'Galmuri11','DungGeunMo',sans-serif", color: C.ink }}>
      {/* ◀ 왼쪽: 가구 팔레트 */}
      <div style={sideCol}>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>가구 · 소품</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {CATS.map((cc) => (
              <button key={cc.name} onClick={() => setCat(cc.name)} style={{ background: cat === cc.name ? C.mint : cc.wall ? C.sky : C.pinkSoft, border: `2px solid ${C.ink}`, borderRadius: 8, padding: '4px 9px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12 }}>
                {cc.wall ? '🖼 ' : ''}{cc.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {activeCat.keys.map((key) => (
              <button key={key} onClick={() => addItem(key)} title={key} style={{ width: 52, height: 52, background: C.cream, border: `2px solid ${C.line}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PixelSprite keyName={key} px={2.1} />
              </button>
            ))}
          </div>
          {activeCat.wall && <div style={{ fontSize: 11, color: '#a06', marginTop: 8 }}>벽걸이는 추가하면 왼쪽 벽에 붙어요. 드래그로 좌/우 벽·높이를 옮기거나, 선택 후 '벽 바꾸기'를 누르세요.</div>}
        </div>
      </div>

      {/* ● 가운데: 방 */}
      <div style={{ flex: '3 1 340px', minWidth: 300 }}>
        <RoomView room={room} seed={seed} customAvatar={customAvatar} owner={owner} editable selectedId={selectedId} onSelectItem={setSelectedId} onMove={onMove} />
      </div>

      {/* ▶ 오른쪽: 선택 편집 + 벽지/바닥 + 한마디 */}
      <div style={sideCol}>
        {sel ? (
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>선택한 물건 <PixelSprite keyName={sel.key} px={2} /></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Btn small onClick={() => patchSel({ scale: Math.min(1.8, (sel.scale || 1) + 0.2) })}>크게 ＋</Btn>
              <Btn small onClick={() => patchSel({ scale: Math.max(0.6, (sel.scale || 1) - 0.2) })}>작게 －</Btn>
              <Btn small onClick={() => patchSel({ flip: !sel.flip })}>좌우반전 ⇄</Btn>
              {selWall && <Btn small onClick={() => patchSel({ wall: selWall.wall === 'L' ? 'R' : 'L' })}>벽 바꾸기 ↔</Btn>}
              {isFrame && onPaintFrame && <Btn small kind="primary" onClick={() => onPaintFrame(sel)}>🎨 그림 그리기</Btn>}
              {isFrame && sel.sketch && onGiftFrame && <Btn small onClick={() => onGiftFrame(sel)}>🎁 친구 선물</Btn>}
              <Btn small kind="ghost" onClick={delSel}>삭제 🗑</Btn>
            </div>
          </div>
        ) : (
          <div style={{ ...card, fontSize: 12, color: '#a06' }}>물건을 클릭하면 크기·반전·삭제, 액자엔 그림 그리기를 할 수 있어요.</div>
        )}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>벽지</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{WALLS.map((w, i) => <Swatch key={i} label={w.name} color={w.color} on={room.wall === i} onClick={() => onChange({ ...room, wall: i })} />)}</div>
        </div>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>바닥재</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{FLOORS.map((f, i) => <Swatch key={i} label={f.name} color={f.a} on={room.floor === i} onClick={() => onChange({ ...room, floor: i })} />)}</div>
        </div>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>오늘 한마디</div>
          <input value={room.status || ''} onChange={(e) => onChange({ ...room, status: e.target.value })} maxLength={40} placeholder="기분/상태 메시지"
            style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: `2px solid ${C.ink}`, borderRadius: 8, fontFamily: 'inherit' }} />
        </div>
      </div>
    </div>
  )
}
