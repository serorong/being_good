/* ──────────────────────────────────────────────────────────────
   미니룸 — 2.5D 아이소메트릭 방 렌더러 + 드래그 편집기
   (minihompy.jsx 의 RoomView 를 TS로 포팅. 아바타는 신의반 Sprite 사용)
   ────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Sprite from '../components/Sprite'
import { PAL, SPRITES } from './sprites'
import type { MiniRoom, MiniRoomItem, MiniWallItem } from '../types'

/* 벽지/바닥 테마 */
export const WALLS = [
  { name: '분홍', color: '#ffd0e2' }, { name: '하늘', color: '#cfe9ff' }, { name: '민트', color: '#cdeede' },
  { name: '라벤더', color: '#e2d4ff' }, { name: '크림', color: '#ffeccb' }, { name: '베이지', color: '#ece0cf' },
]
export const FLOORS = [
  { name: '원목 라이트', a: '#f0d9b5', b: '#e6c79b' }, { name: '원목 다크', a: '#b98a5e', b: '#a87b50' },
  { name: '분홍 타일', a: '#ffe0ee', b: '#ffd0e6' }, { name: '민트 타일', a: '#e3f6ec', b: '#cdeede' },
  { name: '회색 타일', a: '#eef1f6', b: '#dfe3ea' }, { name: '빨강 카펫', a: '#e2737f', b: '#d8636f' },
]

const C = { pink: '#ff7eb3', ink: '#3a2b3a' }

/* 기하 */
const N = 8, TILE_W = 56, TILE_H = 28, WALL_H = 150
const STAGE_W = 560, STAGE_H = 430, OX = STAGE_W / 2, OY = 160
const FLOOR_PX = 3.4, WALL_PX = 3
const WALL_COLS = 6, WALL_ROWS = 3
const WALL_ANGLE = (Math.atan(TILE_H / TILE_W) * 180) / Math.PI // ≈26.57°

type P = { x: number; y: number }
const tile = (c: number, r: number): P => ({ x: OX + (c - r) * (TILE_W / 2), y: OY + (c + r) * (TILE_H / 2) })
const corner = {
  N: { x: OX, y: OY - TILE_H / 2 },
  E: { x: OX + (N * TILE_W) / 2, y: OY + ((N - 1) * TILE_H) / 2 },
  S: { x: OX, y: OY + ((2 * N - 1) * TILE_H) / 2 },
  W: { x: OX - (N * TILE_W) / 2, y: OY + ((N - 1) * TILE_H) / 2 },
}
const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v))

function wallSlot(wall: 'L' | 'R', col: number, row: number): P {
  const End = wall === 'L' ? corner.W : corner.E
  const t = (col + 0.5) / WALL_COLS, v = (row + 0.5) / WALL_ROWS
  const baseX = corner.N.x + t * (End.x - corner.N.x)
  const floorY = corner.N.y + t * (End.y - corner.N.y)
  return { x: baseX, y: floorY - WALL_H + v * WALL_H }
}
function pointToWall(sx: number, sy: number) {
  const wall: 'L' | 'R' = sx <= corner.N.x ? 'L' : 'R'
  const End = wall === 'L' ? corner.W : corner.E
  const t = clamp(0, 1, (sx - corner.N.x) / (End.x - corner.N.x))
  const floorY = corner.N.y + t * (End.y - corner.N.y)
  const v = clamp(0, 1, (sy - (floorY - WALL_H)) / WALL_H)
  return { wall, col: clamp(0, WALL_COLS - 1, Math.round(t * WALL_COLS - 0.5)), row: clamp(0, WALL_ROWS - 1, Math.round(v * WALL_ROWS - 0.5)) }
}

/* 픽셀 스프라이트 렌더러 */
export function PixelSprite({ keyName, px = 3 }: { keyName: string; px?: number }) {
  const sp = SPRITES[keyName]
  if (!sp) return null
  const map = sp.map, h = map.length, w = map[0].length
  const rects: JSX.Element[] = []
  for (let y = 0; y < h; y++) {
    const row = map[y]
    for (let x = 0; x < w; x++) {
      const ch = row[x]
      if (ch === ' ' || ch === '.') continue
      const f = PAL[ch]
      if (!f) continue
      rects.push(<rect key={x + '_' + y} x={x} y={y} width={1.05} height={1.05} fill={f} shapeRendering="crispEdges" />)
    }
  }
  return (
    <svg width={w * px} height={h * px} viewBox={`0 0 ${w} ${h}`} style={{ imageRendering: 'pixelated', display: 'block', overflow: 'visible' }}>
      {rects}
    </svg>
  )
}

export type DragTarget = { kind: 'item' | 'wall' | 'avatar'; id?: string }

export interface RoomViewProps {
  room: MiniRoom
  seed: string                 // 아바타 seed (학생 코드/avatarSeed)
  customAvatar?: string        // 학생이 그린 픽셀 프로필
  owner: string                // 방 주인 이름 표시
  editable?: boolean
  selectedId?: string | null
  onSelectItem?: (id: string | null) => void
  onMove?: (target: DragTarget, pos: { gc: number; gr: number } | { wall: 'L' | 'R'; col: number; row: number }) => void
  onClickItem?: (item: MiniRoomItem | MiniWallItem) => void  // 비편집 모드에서 액자 클릭 등
  maxScale?: number            // 컨테이너가 넓을 때 최대 확대 배율(가독성). 기본 1.4
  fill?: boolean               // 부모의 높이까지 사용해 세로로 꽉 차게(가운데 정렬)
}

export function RoomView({ room, seed, customAvatar, owner, editable = false, selectedId, onSelectItem, onMove, onClickItem, maxScale = 1.4, fill = false }: RoomViewProps) {
  const outerRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<DragTarget | null>(null)
  const moved = useRef(false)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const update = () => {
      const el = outerRef.current
      if (!el) return
      const byW = el.clientWidth / STAGE_W
      const byH = fill && el.clientHeight ? el.clientHeight / STAGE_H : Infinity
      setScale(Math.min(maxScale, byW, byH))
    }
    update()
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined' && outerRef.current) { ro = new ResizeObserver(update); ro.observe(outerRef.current) }
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('resize', update); ro?.disconnect() }
  }, [maxScale, fill])

  useEffect(() => {
    if (!editable) return
    const mv = (e: PointerEvent) => {
      if (!drag.current || !stageRef.current || !onMove) return
      moved.current = true
      const rect = stageRef.current.getBoundingClientRect(), s = rect.width / STAGE_W
      const px = (e.clientX - rect.left) / s
      const py = (e.clientY - rect.top) / s
      if (drag.current.kind === 'wall') onMove(drag.current, pointToWall(px, py))
      else {
        const av = (px - OX) / (TILE_W / 2), bv = (py - OY) / (TILE_H / 2)
        onMove(drag.current, { gc: clamp(0, N - 1, Math.round((av + bv) / 2)), gr: clamp(0, N - 1, Math.round((bv - av) / 2)) })
      }
    }
    const upHandler = () => { drag.current = null }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', upHandler)
    return () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', upHandler) }
  }, [editable, onMove])

  const wall = WALLS[room.wall] || WALLS[0]
  const floor = FLOORS[room.floor] || FLOORS[0]
  const poly = (pts: P[]) => pts.map((p) => `${p.x},${p.y}`).join(' ')
  const up = (p: P): P => ({ x: p.x, y: p.y - WALL_H })

  const avatarGc = room.avatarGc ?? 3, avatarGr = room.avatarGr ?? 3
  type Obj =
    | { kind: 'item'; it: MiniRoomItem; gc: number; gr: number; z: number }
    | { kind: 'avatar'; gc: number; gr: number; z: number }
  const objs: Obj[] = [
    ...room.items.map((it) => ({ kind: 'item' as const, it, gc: it.gc ?? 3, gr: it.gr ?? 3 })),
    { kind: 'avatar' as const, gc: avatarGc, gr: avatarGr },
  ]
    .map((o) => ({ ...o, z: o.gc + o.gr + (o.kind === 'avatar' ? 0.1 : 0) }))
    .sort((a, b) => a.z - b.z) as Obj[]

  const startDrag = (e: React.PointerEvent, target: DragTarget) => {
    if (!editable) return
    e.stopPropagation()
    drag.current = target
    moved.current = false
    onSelectItem?.(target.kind === 'item' || target.kind === 'wall' ? target.id ?? null : null)
  }

  return (
    <div ref={outerRef} style={fill ? { width: '100%', height: '100%', position: 'relative' } : { width: '100%', height: STAGE_H * scale, position: 'relative' }}>
      <div
        ref={stageRef}
        onPointerDown={(e) => { if (editable && e.target === stageRef.current) onSelectItem?.(null) }}
        style={fill
          ? { position: 'absolute', top: '50%', left: '50%', width: STAGE_W, height: STAGE_H, transform: `translate(-50%,-50%) scale(${scale})`, transformOrigin: 'center center', touchAction: 'none' }
          : { position: 'absolute', top: 0, left: '50%', width: STAGE_W, height: STAGE_H, transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center', touchAction: 'none' }}
      >
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, display: 'block' }} onPointerDown={() => { if (editable) onSelectItem?.(null) }}>
          <defs>
            <linearGradient id="mr-wall-left" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff7fb" stopOpacity="0.62" />
              <stop offset="55%" stopColor={wall.color} />
              <stop offset="100%" stopColor="#d08aa8" stopOpacity="0.34" />
            </linearGradient>
            <linearGradient id="mr-wall-right" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff7fb" stopOpacity="0.44" />
              <stop offset="50%" stopColor={wall.color} />
              <stop offset="100%" stopColor="#9b637c" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          <polygon points={poly([corner.N, corner.W, up(corner.W), up(corner.N)])} fill="url(#mr-wall-left)" />
          <polygon points={poly([corner.N, corner.E, up(corner.E), up(corner.N)])} fill="url(#mr-wall-right)" />
          <polygon points={poly([corner.N, corner.E, up(corner.E), up(corner.N)])} fill="rgba(0,0,0,0.08)" />
          {Array.from({ length: WALL_COLS + 1 }).map((_, i) => {
            const t = i / WALL_COLS
            const left = { x: corner.N.x + t * (corner.W.x - corner.N.x), y: corner.N.y + t * (corner.W.y - corner.N.y) }
            const right = { x: corner.N.x + t * (corner.E.x - corner.N.x), y: corner.N.y + t * (corner.E.y - corner.N.y) }
            return (
              <g key={`wp-${i}`}>
                <polyline points={poly([left, up(left)])} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                <polyline points={poly([right, up(right)])} fill="none" stroke="rgba(80,42,60,0.13)" strokeWidth="1" />
              </g>
            )
          })}
          <g>
            <polyline points={poly([{ x: corner.W.x, y: corner.W.y - 7 }, { x: corner.N.x, y: corner.N.y - 7 }, { x: corner.E.x, y: corner.E.y - 7 }])} fill="none" stroke="rgba(255,255,255,0.74)" strokeWidth="5" />
            <polyline points={poly([{ x: corner.W.x, y: corner.W.y - 3 }, { x: corner.N.x, y: corner.N.y - 3 }, { x: corner.E.x, y: corner.E.y - 3 }])} fill="none" stroke="rgba(85,43,60,0.18)" strokeWidth="2" />
          </g>
          <polyline points={poly([up(corner.N), corner.N, corner.S])} fill="none" stroke="rgba(68,34,52,0.16)" strokeWidth="2" />
          {Array.from({ length: N }).map((_, c) =>
            Array.from({ length: N }).map((__, r) => {
              const ctr = tile(c, r)
              const north = { x: ctr.x, y: ctr.y - TILE_H / 2 }
              const east = { x: ctr.x + TILE_W / 2, y: ctr.y }
              const south = { x: ctr.x, y: ctr.y + TILE_H / 2 }
              const west = { x: ctr.x - TILE_W / 2, y: ctr.y }
              const d = poly([north, east, south, west])
              return (
                <g key={c + '-' + r}>
                  <polygon points={d} fill={(c + r) % 2 ? floor.b : floor.a} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                  <polyline points={poly([west, north, east])} fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="1" />
                  <polyline points={poly([east, south, west])} fill="none" stroke="rgba(75,43,35,0.10)" strokeWidth="1" />
                </g>
              )
            })
          )}
        </svg>

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* 벽걸이 (뒤쪽) */}
          {(room.wallItems || []).map((wi) => {
            const slot = wallSlot(wi.wall, wi.col, wi.row)
            const sel = editable && selectedId === wi.id
            const ang = wi.wall === 'L' ? -WALL_ANGLE : WALL_ANGLE
            const clickable = !editable && !!onClickItem && (!!wi.sketch || SPRITES[wi.key]?.cat === '액자')
            return (
              <div
                key={wi.id}
                onPointerDown={(e) => startDrag(e, { kind: 'wall', id: wi.id })}
                onClick={() => { if (editable) { if (!moved.current) onClickItem?.(wi) } else if (clickable) onClickItem?.(wi) }}
                style={{
                  position: 'absolute', left: slot.x, top: slot.y,
                  transform: `translate(-50%,-50%) skewY(${ang}deg) scaleX(${wi.flip ? -1 : 1})`, transformOrigin: 'center',
                  zIndex: 2 + (wi.row || 0), pointerEvents: editable || clickable ? 'auto' : 'none',
                  cursor: editable ? 'grab' : clickable ? 'pointer' : 'default',
                  filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.22))', outline: sel ? `3px dashed ${C.pink}` : 'none', borderRadius: 4,
                }}
              >
                <FrameOrSprite item={wi} px={WALL_PX * (wi.scale || 1)} />
              </div>
            )
          })}
          {/* 바닥 가구 + 아바타 */}
          {objs.map((o) => {
            const ctr = tile(o.gc, o.gr), z = Math.round(o.z * 10) + 10
            if (o.kind === 'avatar') {
              return (
                <div
                  key="avatar"
                  onPointerDown={(e) => startDrag(e, { kind: 'avatar' })}
                  style={{ position: 'absolute', left: ctr.x, top: ctr.y, transform: 'translate(-50%,-100%)', zIndex: z, pointerEvents: editable ? 'auto' : 'none', cursor: editable ? 'grab' : 'default' }}
                >
                  {room.status ? (
                    <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: `2px solid ${C.ink}`, borderRadius: 10, padding: '4px 8px', fontSize: 11, whiteSpace: 'nowrap', maxWidth: 180, marginBottom: 6, color: C.ink }}>
                      {room.status}
                      <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `8px solid ${C.ink}` }} />
                    </div>
                  ) : null}
                  <Sprite seed={seed} size={60} customSrc={customAvatar} />
                  <div style={{ textAlign: 'center', fontSize: 11, color: C.ink, fontWeight: 700, marginTop: -2 }}>{owner}</div>
                </div>
              )
            }
            const it = o.it
            const sel = editable && selectedId === it.id
            const clickable = !editable && !!onClickItem && !!it.sketch
            return (
              <div
                key={it.id}
                onPointerDown={(e) => startDrag(e, { kind: 'item', id: it.id })}
                onClick={() => { if (editable) { if (!moved.current) onClickItem?.(it) } else if (clickable) onClickItem?.(it) }}
                style={{
                  position: 'absolute', left: ctr.x, top: ctr.y, transform: `translate(-50%,-100%) scaleX(${it.flip ? -1 : 1})`,
                  zIndex: z, pointerEvents: editable || clickable ? 'auto' : 'none', cursor: editable ? 'grab' : clickable ? 'pointer' : 'default',
                  filter: 'drop-shadow(0 3px 1px rgba(0,0,0,0.28))', outline: sel ? `3px dashed ${C.pink}` : 'none', borderRadius: 4,
                }}
              >
                <FrameOrSprite item={it} px={FLOOR_PX * (it.scale || 1)} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** 액자류이고 안에 그림(sketch)이 있으면 도안 대신 그림을 액자 안에 보여준다. */
function FrameOrSprite({ item, px }: { item: MiniRoomItem | MiniWallItem; px: number }) {
  const sp = SPRITES[item.key]
  if (sp && item.sketch) {
    const w = sp.map[0].length * px, h = sp.map.length * px
    return (
      <div style={{ position: 'relative', width: w, height: h }}>
        <PixelSprite keyName={item.key} px={px} />
        <img
          src={item.sketch}
          alt=""
          draggable={false}
          style={{ position: 'absolute', inset: '14%', width: '72%', height: '72%', objectFit: 'cover', borderRadius: 2 }}
        />
      </div>
    )
  }
  return <PixelSprite keyName={item.key} px={px} />
}

/* ──────────────── 미니룸 정규화 헬퍼 ──────────────── */
export const EMPTY_ROOM: MiniRoom = { wall: 0, floor: 0, status: '', items: [], wallItems: [], avatarGc: 3, avatarGr: 3 }

export function normalizeRoom(r: MiniRoom | undefined | null): MiniRoom {
  if (!r) return { ...EMPTY_ROOM }
  return {
    wall: r.wall || 0,
    floor: r.floor || 0,
    status: r.status || '',
    items: (r.items || []).filter((i) => i.key && SPRITES[i.key]),
    wallItems: (r.wallItems || []).filter((w) => w.key && SPRITES[w.key]),
    avatarGc: r.avatarGc ?? 3,
    avatarGr: r.avatarGr ?? 3,
  }
}

let uidCounter = 1
export const newId = () => `mi_${Date.now().toString(36)}_${(uidCounter++).toString(36)}`

/** useCallback 으로 감싸 쓰기 좋은 이동 핸들러 팩토리는 페이지에서 정의. */
export { N as ROOM_N, WALL_COLS, WALL_ROWS }
