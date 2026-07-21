/* ──────────────────────────────────────────────────────────────
   마인드맵 — 단순 탭 편집기 + 뷰어.
   노드를 탭해 고르고, 버튼으로 가지 추가/글자 고치기/지우기.
   색은 깊이에 따라 자동. 드래그·이미지 없음 (일부러 단순하게).
   ────────────────────────────────────────────────────────────── */
import { useMemo, useState } from 'react'
import { MC, MiniBtn } from '../minihompy/parts'
import type { MindNode } from './types'

const DEPTH_COLORS = ['#d6457f', '#2e7d52', '#b26b24', '#4a7fc1', '#8a5fc0']
const colorAt = (depth: number) => DEPTH_COLORS[depth % DEPTH_COLORS.length]

const mkId = () => `mn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
export const newMindRoot = (text: string): MindNode => ({ id: mkId(), text, children: [] })

/* ── 레이아웃: 잎 수에 비례해 각도를 나누는 방사형 배치 ── */

interface Placed { node: MindNode; depth: number; x: number; y: number; parent?: Placed }

function leafCount(n: MindNode): number {
  return n.children.length === 0 ? 1 : n.children.reduce((a, c) => a + leafCount(c), 0)
}

function layout(root: MindNode, cx: number, cy: number, ringGap: number): Placed[] {
  const out: Placed[] = []
  const rootPlaced: Placed = { node: root, depth: 0, x: cx, y: cy }
  out.push(rootPlaced)
  const place = (n: MindNode, depth: number, a0: number, a1: number, parent: Placed) => {
    const mid = (a0 + a1) / 2
    const r = depth * ringGap
    const p: Placed = { node: n, depth, x: cx + r * Math.cos(mid), y: cy + r * Math.sin(mid), parent }
    out.push(p)
    let acc = a0
    const total = leafCount(n)
    for (const c of n.children) {
      const span = ((a1 - a0) * leafCount(c)) / total
      place(c, depth + 1, acc, acc + span, p)
      acc += span
    }
  }
  let acc = -Math.PI / 2
  const total = leafCount(root)
  for (const c of root.children) {
    const span = (Math.PI * 2 * leafCount(c)) / total
    place(c, 1, acc, acc + span, rootPlaced)
    acc += span
  }
  return out
}

/* ── 트리 조작 (불변) ── */

function mapTree(n: MindNode, fn: (n: MindNode) => MindNode): MindNode {
  return fn({ ...n, children: n.children.map(c => mapTree(c, fn)) })
}
function removeNode(n: MindNode, id: string): MindNode {
  return { ...n, children: n.children.filter(c => c.id !== id).map(c => removeNode(c, id)) }
}
function findDepth(n: MindNode, id: string, d = 0): number | null {
  if (n.id === id) return d
  for (const c of n.children) {
    const r = findDepth(c, id, d + 1)
    if (r !== null) return r
  }
  return null
}

/* ── SVG 렌더 (편집기·뷰어 공용) ── */

function MindSvg({ root, selectedId, onTap }: { root: MindNode; selectedId?: string | null; onTap?: (id: string) => void }) {
  const W = 660, H = 480
  const placed = useMemo(() => layout(root, W / 2, H / 2, 105), [root])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', background: '#fffdf6', borderRadius: 10, touchAction: 'manipulation' }}>
      {placed.filter(p => p.parent).map(p => (
        <line key={`l_${p.node.id}`} x1={p.parent!.x} y1={p.parent!.y} x2={p.x} y2={p.y}
          stroke={colorAt(p.depth)} strokeWidth={p.depth === 1 ? 3 : 2} strokeLinecap="round" opacity={0.55} />
      ))}
      {placed.map(p => {
        const isRoot = p.depth === 0
        const text = p.node.text || '…'
        const w = Math.max(46, Math.min(150, text.length * 11 + 22))
        const h = isRoot ? 40 : 30
        const sel = selectedId === p.node.id
        return (
          <g key={p.node.id} onClick={() => onTap?.(p.node.id)} style={{ cursor: onTap ? 'pointer' : 'default' }}>
            <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx={h / 2}
              fill={isRoot ? colorAt(0) : '#fff'}
              stroke={sel ? '#f0b429' : colorAt(p.depth)} strokeWidth={sel ? 4 : 2} />
            <text x={p.x} y={p.y + 4} textAnchor="middle"
              fontSize={isRoot ? 14 : 12} fontWeight={700}
              fill={isRoot ? '#fff' : colorAt(p.depth)}
              style={{ fontFamily: "'Galmuri11','Pretendard',sans-serif" }}>
              {text.length > 12 ? `${text.slice(0, 12)}…` : text}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function MindMapViewer({ root }: { root: MindNode }) {
  return <MindSvg root={root} />
}

/* ── 편집기 ── */

export function MindMapEditor({ initial, bookTitle, onSave, onCancel }: {
  initial?: MindNode; bookTitle: string
  onSave: (root: MindNode) => void; onCancel: () => void
}) {
  const [root, setRoot] = useState<MindNode>(() => initial ?? newMindRoot(bookTitle.slice(0, 12)))
  const [selectedId, setSelectedId] = useState<string>(root.id)
  const [draft, setDraft] = useState('')

  const selectedDepth = findDepth(root, selectedId) ?? 0

  const select = (id: string) => {
    setSelectedId(id)
    setDraft('')
  }

  const addChild = () => {
    if (selectedDepth >= 3) { alert('가지는 3단계까지만 뻗을 수 있어요!'); return }
    const child = { id: mkId(), text: '새 가지', children: [] }
    setRoot(r => mapTree(r, n => (n.id === selectedId ? { ...n, children: [...n.children, child] } : n)))
    setSelectedId(child.id)
    setDraft('새 가지')
  }

  const rename = (text: string) => {
    setDraft(text)
    const t = text.trim()
    if (!t) return
    setRoot(r => mapTree(r, n => (n.id === selectedId ? { ...n, text: t.slice(0, 20) } : n)))
  }

  const del = () => {
    if (selectedId === root.id) { alert('가운데(책 제목)는 지울 수 없어요!'); return }
    setRoot(r => removeNode(r, selectedId))
    setSelectedId(root.id)
    setDraft('')
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ border: `2px solid ${MC.ink}`, borderRadius: 12, overflow: 'hidden' }}>
        <MindSvg root={root} selectedId={selectedId} onTap={select} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#fff', border: `2px solid ${MC.ink}`, borderRadius: 10, padding: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: MC.deep }}>고른 가지:</span>
        <input value={draft} placeholder="글자를 고치려면 여기에 입력"
          onChange={e => rename(e.target.value)} maxLength={20}
          style={{ flex: 1, minWidth: 160, padding: 8, border: `2px solid ${MC.line}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }} />
        <MiniBtn small onClick={addChild}>🌿 가지 추가</MiniBtn>
        <MiniBtn small kind="ghost" onClick={del}>🗑 지우기</MiniBtn>
      </div>
      <p style={{ fontSize: 12, color: '#a06', margin: 0 }}>
        가지를 <b>탭</b>해서 고르고, 글자를 바꾸거나 새 가지를 뻗어 보세요. 색은 자동으로 정해져요.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <MiniBtn kind="ghost" onClick={onCancel}>취소</MiniBtn>
        <MiniBtn kind="primary" onClick={() => onSave(root)}>💾 저장하기</MiniBtn>
      </div>
    </div>
  )
}
