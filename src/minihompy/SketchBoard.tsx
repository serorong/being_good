/* ──────────────────────────────────────────────────────────────
   SketchBoard — 신의반 일력 스케치 도구(QuestsPage)의 그리기 엔진을 재사용한
   범용 그림판. 액자 그리기/선물 그림에 사용.
   - 펜/마커/색연필/스프레이/지우개 + 레이어
   - onSubmit(dataUrl, title): 결과를 maxStoreWidth로 다운스케일해 JPEG로 압축
   ────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react'

const PALETTE = [
  '#3a3a3a', '#7a7a7a', '#bcbcbc', '#ffffff',
  '#e23b3b', '#FF7A6B', '#F5A261', '#FFD75E', '#fff3a8',
  '#3fa34d', '#9AD95D', '#8EDCC8', '#2a6fdb', '#4dabf7',
  '#8FA8FF', '#7a5f99', '#C7A1F2', '#FFB7A5', '#f48fb1', '#8a5a2b',
]
const SIZES = [2, 4, 8, 16, 28]
const TOOLS = [
  { key: 'pen', label: '펜', icon: '✒️' },
  { key: 'marker', label: '마커', icon: '🖍️' },
  { key: 'pencil', label: '색연필', icon: '✏️' },
  { key: 'spray', label: '스프레이', icon: '💨' },
  { key: 'eraser', label: '지우개', icon: '🧽' },
] as const
type ToolKey = typeof TOOLS[number]['key']
type Pt = { x: number; y: number }

function strokeSeg(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, tool: ToolKey, color: string, size: number) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (tool === 'spray') {
    const n = Math.max(8, size * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = 0.5
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * size * 1.6
      ctx.fillRect(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r, 1.6, 1.6)
    }
    ctx.restore()
    return
  }
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.lineWidth = size * 2.2
  } else if (tool === 'marker') {
    ctx.globalAlpha = 0.32
    ctx.strokeStyle = color
    ctx.lineWidth = size * 2.4
  } else if (tool === 'pencil') {
    ctx.globalAlpha = 0.85
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1, size * 0.7)
  } else {
    ctx.strokeStyle = color
    ctx.lineWidth = size
  }
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  ctx.restore()
}

export interface SketchBoardProps {
  /** 그리기 해상도 (가로). 세로는 비율로. */
  width?: number
  height?: number
  /** 이어 그릴 기존 그림 */
  initialImage?: string
  /** 제목/한줄 입력칸 표시 + 기본값 */
  withTitle?: boolean
  initialTitle?: string
  titlePlaceholder?: string
  submitLabel?: string
  /** 저장용 다운스케일 가로 폭(작게 = 용량↓). 기본 460 */
  maxStoreWidth?: number
  quality?: number
  onSubmit: (dataUrl: string, title: string) => void
  onCancel?: () => void
}

export function SketchBoard({
  width = 720, height = 480, initialImage, withTitle = true, initialTitle = '',
  titlePlaceholder = '그림 제목/한줄 (예: 우리 반 최고!)', submitLabel = '완성',
  maxStoreWidth = 460, quality = 0.7, onSubmit, onCancel,
}: SketchBoardProps) {
  const [layers, setLayers] = useState<{ id: number; visible: boolean }[]>([{ id: 1, visible: true }])
  const [activeId, setActiveId] = useState(1)
  const seqRef = useRef(2)
  const canvasMap = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const drawing = useRef(false)
  const lastPt = useRef<Pt | null>(null)
  const restored = useRef(false)

  const [color, setColor] = useState('#3a3a3a')
  const [size, setSize] = useState(8)
  const [tool, setTool] = useState<ToolKey>('pen')
  const [title, setTitle] = useState(initialTitle)

  const setCanvasRef = (id: number) => (el: HTMLCanvasElement | null) => {
    if (el) canvasMap.current.set(id, el)
    else canvasMap.current.delete(id)
  }

  useEffect(() => {
    if (restored.current) return
    const c = canvasMap.current.get(1)
    if (!c) return
    restored.current = true
    if (initialImage) {
      const img = new Image()
      img.onload = () => c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      img.src = initialImage
    }
  }, [initialImage])

  const pos = (e: React.PointerEvent): Pt => {
    const r = overlayRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (width / r.width), y: (e.clientY - r.top) * (height / r.height) }
  }
  const start = (e: React.PointerEvent) => {
    const c = canvasMap.current.get(activeId)
    if (!c) return
    drawing.current = true
    const p = pos(e)
    lastPt.current = p
    strokeSeg(c.getContext('2d')!, p, p, tool, color, size)
    try { overlayRef.current!.setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const c = canvasMap.current.get(activeId)
    if (!c) return
    const p = pos(e)
    strokeSeg(c.getContext('2d')!, lastPt.current!, p, tool, color, size)
    lastPt.current = p
  }
  const end = () => { drawing.current = false; lastPt.current = null }

  const clearActive = () => {
    const c = canvasMap.current.get(activeId)
    if (c) c.getContext('2d')!.clearRect(0, 0, width, height)
  }
  const addLayer = () => { const id = seqRef.current++; setLayers((ls) => [...ls, { id, visible: true }]); setActiveId(id) }
  const removeLayer = (id: number) => {
    if (layers.length <= 1) return
    canvasMap.current.delete(id)
    setLayers((ls) => ls.filter((l) => l.id !== id))
    if (activeId === id) setActiveId(layers.find((l) => l.id !== id)!.id)
  }
  const toggleVisible = (id: number) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)))
  const moveLayer = (id: number, dir: 1 | -1) => setLayers((ls) => {
    const i = ls.findIndex((l) => l.id === id), j = i + dir
    if (i < 0 || j < 0 || j >= ls.length) return ls
    const next = [...ls]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const submit = () => {
    // 1) 레이어 합성
    const flat = document.createElement('canvas')
    flat.width = width; flat.height = height
    const fx = flat.getContext('2d')!
    fx.fillStyle = '#ffffff'
    fx.fillRect(0, 0, width, height)
    for (const l of layers) {
      if (!l.visible) continue
      const c = canvasMap.current.get(l.id)
      if (c) fx.drawImage(c, 0, 0)
    }
    // 2) 저장용으로 작게 다운스케일 (용량↓)
    const sw = Math.min(maxStoreWidth, width)
    const sh = Math.round(height * (sw / width))
    const small = document.createElement('canvas')
    small.width = sw; small.height = sh
    const sx = small.getContext('2d')!
    sx.fillStyle = '#ffffff'
    sx.fillRect(0, 0, sw, sh)
    sx.imageSmoothingQuality = 'high'
    sx.drawImage(flat, 0, 0, sw, sh)
    onSubmit(small.toDataURL('image/jpeg', quality), title.trim())
  }

  const toolBtn = (active: boolean): React.CSSProperties => ({
    height: 36, padding: '0 10px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
    color: active ? '#fff' : '#6b5b4a', background: active ? '#4a9d6b' : '#fff',
    border: `2px solid ${active ? '#3fa34d' : '#d9c7b5'}`, display: 'inline-flex', alignItems: 'center', gap: 4,
  })

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* 도구 + 굵기 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {TOOLS.map((t) => <button key={t.key} onClick={() => setTool(t.key)} style={toolBtn(tool === t.key)}>{t.icon} {t.label}</button>)}
        <div style={{ width: 1, height: 26, background: '#d9c7b5' }} />
        {SIZES.map((z) => (
          <button key={z} onClick={() => setSize(z)} aria-label={`굵기 ${z}`}
            style={{ width: 36, height: 36, borderRadius: 9, cursor: 'pointer', display: 'grid', placeItems: 'center', border: `2px solid ${size === z ? '#3fa34d' : '#d9c7b5'}`, background: '#fff' }}>
            <span style={{ width: Math.min(z, 20), height: Math.min(z, 20), background: '#3a3a3a', borderRadius: '50%', display: 'block' }} />
          </button>
        ))}
      </div>
      {/* 색 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        {PALETTE.map((c) => (
          <button key={c} onClick={() => setColor(c)} aria-label={`색 ${c}`}
            style={{ width: 26, height: 26, borderRadius: 7, cursor: 'pointer', background: c, border: color === c ? '3px solid #3fa34d' : '2px solid #d9c7b5' }} />
        ))}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 4, fontSize: 12, color: '#9a8a76', cursor: 'pointer' }}>
          🎨<input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 30, height: 30, border: '2px solid #d9c7b5', borderRadius: 7, background: 'none', cursor: 'pointer', padding: 0 }} />
        </label>
      </div>
      {/* 캔버스 + 레이어 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260, aspectRatio: `${width} / ${height}`, background: '#fff', border: '2px solid #d9c7b5', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,.08)' }}>
          {layers.map((l, i) => (
            <canvas key={l.id} ref={setCanvasRef(l.id)} width={width} height={height}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: l.visible ? 'block' : 'none', zIndex: i }} />
          ))}
          <div ref={overlayRef} style={{ position: 'absolute', inset: 0, zIndex: 999, touchAction: 'none', cursor: 'crosshair' }}
            onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
        </div>
        <div style={{ width: 168, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>레이어</span>
            <button onClick={addLayer} style={{ padding: '4px 10px', fontSize: 12, border: '2px solid #3fa34d', background: '#eafaf0', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>+ 추가</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[...layers].reverse().map((l, idx) => {
              const num = layers.length - idx, ai = num - 1
              const isActive = activeId === l.id, isTop = ai === layers.length - 1, isBottom = ai === 0
              const iconBtn = (en: boolean): React.CSSProperties => ({ border: 'none', background: 'none', fontSize: 13, cursor: en ? 'pointer' : 'not-allowed', opacity: en ? 1 : 0.25, lineHeight: 1 })
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 5, borderRadius: 8, border: `2px solid ${isActive ? '#3fa34d' : '#e7dccd'}`, background: isActive ? '#eafaf0' : '#faf6ef' }}>
                  <button onClick={() => setActiveId(l.id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>레이어 {num}{isActive ? ' ✏️' : ''}</button>
                  <button onClick={() => moveLayer(l.id, 1)} disabled={isTop} title="위로" style={iconBtn(!isTop)}>⬆️</button>
                  <button onClick={() => moveLayer(l.id, -1)} disabled={isBottom} title="아래로" style={iconBtn(!isBottom)}>⬇️</button>
                  <button onClick={() => toggleVisible(l.id)} title="표시/숨김" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }}>{l.visible ? '👁️' : '🚫'}</button>
                  <button onClick={() => removeLayer(l.id)} disabled={layers.length <= 1} title="삭제" style={iconBtn(layers.length > 1)}>🗑️</button>
                </div>
              )
            })}
          </div>
          <button onClick={clearActive} style={{ width: '100%', marginTop: 8, fontSize: 12, padding: '6px 0', border: '2px solid #d9c7b5', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>현재 레이어 비우기</button>
        </div>
      </div>
      {withTitle && (
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} placeholder={titlePlaceholder}
          style={{ padding: 9, border: '2px solid #d9c7b5', borderRadius: 9, fontFamily: 'inherit', fontSize: 14 }} />
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && <button onClick={onCancel} style={{ padding: '10px 16px', border: '2px solid #d9c7b5', background: '#fff', borderRadius: 9, cursor: 'pointer', fontWeight: 700 }}>취소</button>}
        <button onClick={submit} style={{ padding: '10px 20px', border: '2px solid #3fa34d', background: '#4a9d6b', color: '#fff', borderRadius: 9, cursor: 'pointer', fontWeight: 800, fontSize: 15 }}>{submitLabel}</button>
      </div>
    </div>
  )
}
