import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const ERASER = '__erase__'

const PALETTE: string[] = [
  '#000000', '#3a3a3a', '#7a7a7a', '#bfbfbf', '#ffffff',
  '#5a3a1f', '#8c6a4f', '#c6a081', '#f0d2b4', '#ffe6cf',
  '#d44a4a', '#e88a3a', '#f0c93a', '#7eb05e', '#4f9d6b',
  '#5a9bd4', '#3a6dc0', '#7d6cc9', '#b35cad', '#d96fa6',
]

type Cell = string  // hex color, '' = empty

function freshGrid(size: number): Cell[][] {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(''))
}

function gridFromDataUrl(dataUrl: string, size: number): Promise<Cell[][] | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = size; c.height = size
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, size, size)
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        const grid: Cell[][] = Array.from({ length: size }, () => Array<Cell>(size).fill(''))
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4
            const a = data[i + 3]
            if (a > 30) {
              const r = data[i], g = data[i + 1], b = data[i + 2]
              grid[y][x] = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
            }
          }
        }
        resolve(grid)
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

function gridToDataUrl(grid: Cell[][], size: number, scale = 8): string {
  const c = document.createElement('canvas')
  c.width = size * scale
  c.height = size * scale
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = grid[y][x]
      if (cell) {
        ctx.fillStyle = cell
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }
  return c.toDataURL('image/png')
}

function useResponsiveCellPx() {
  const [px, setPx] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 12 : 16))
  useEffect(() => {
    const onR = () => setPx(window.innerWidth < 640 ? 12 : 16)
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])
  return px
}

export default function PixelEditor({
  size = 24,
  initialDataUrl,
  onSave,
  onCancel,
}: {
  size?: number
  initialDataUrl?: string
  onSave: (dataUrl: string) => void
  onCancel?: () => void
}) {
  const cellPx = useResponsiveCellPx()
  const [grid, setGrid] = useState<Cell[][]>(() => freshGrid(size))
  const [color, setColor] = useState<string>(PALETTE[0])
  const drawing = useRef(false)
  const lastPaint = useRef<string>('')

  // 초기값 로드
  useEffect(() => {
    let alive = true
    if (initialDataUrl) {
      gridFromDataUrl(initialDataUrl, size).then(g => {
        if (alive && g) setGrid(g)
      })
    }
    return () => { alive = false }
  }, [initialDataUrl, size])

  const paintAt = useCallback((x: number, y: number) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const key = `${x},${y}:${color}`
    if (lastPaint.current === key) return
    lastPaint.current = key
    setGrid(prev => {
      const cur = prev[y][x]
      const next = color === ERASER ? '' : color
      if (cur === next) return prev
      const out = prev.map(r => r.slice())
      out[y][x] = next
      return out
    })
  }, [color, size])

  const cellFromEvent = (e: PointerEvent | React.PointerEvent): { x: number; y: number } | null => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    if (!el) return null
    const cell = el.closest('[data-cell]') as HTMLElement | null
    if (!cell) return null
    const parts = cell.getAttribute('data-cell')!.split(',')
    return { x: Number(parts[0]), y: Number(parts[1]) }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    drawing.current = true
    lastPaint.current = ''
    const p = cellFromEvent(e); if (p) paintAt(p.x, p.y)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const p = cellFromEvent(e); if (p) paintAt(p.x, p.y)
  }
  const stop = () => { drawing.current = false; lastPaint.current = '' }

  const previewUrl = useMemo(() => gridToDataUrl(grid, size, 6), [grid, size])

  return (
    <div className="p-1">
      <div className="flex flex-wrap items-start gap-5 justify-center">
        {/* 캔버스 */}
        <div className="flex-shrink-0">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            className="select-none bg-white overflow-hidden"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
              gridTemplateRows: `repeat(${size}, ${cellPx}px)`,
              touchAction: 'none',
              backgroundImage:
                'linear-gradient(45deg, #f5ead0 25%, transparent 25%, transparent 75%, #f5ead0 75%),' +
                'linear-gradient(45deg, #f5ead0 25%, transparent 25%, transparent 75%, #f5ead0 75%)',
              backgroundSize: `${cellPx * 2}px ${cellPx * 2}px`,
              backgroundPosition: `0 0, ${cellPx}px ${cellPx}px`,
              cursor: color === ERASER ? 'crosshair' : 'cell',
              width: size * cellPx,
              height: size * cellPx,
              outline: '3px solid #0d2419',
              outlineOffset: '-3px',
              boxShadow: '3px 3px 0 0 #0d2419',
            }}
          >
            {grid.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x},${y}`}
                  data-cell={`${x},${y}`}
                  style={{
                    width: cellPx,
                    height: cellPx,
                    background: cell || 'transparent',
                    boxShadow: 'inset 0 0 0 0.5px rgba(184,134,42,0.15)',
                  }}
                />
              ))
            )}
          </div>
          <div className="text-[11px] text-ink-500 mt-1">📐 {size} × {size} 픽셀</div>
        </div>

        {/* 도구·미리보기 */}
        <div className="flex-1 min-w-[220px] space-y-4">
          <div>
            <div className="text-xs text-ink-500 mb-1.5">🎨 색상</div>
            <div className="grid grid-cols-10 gap-1.5">
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  className={`w-6 h-6 rounded border-2 transition ${color === c ? 'border-ink-900 scale-110' : 'border-white/60'}`}
                  style={{ background: c, boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' }}
                />
              ))}
              <button
                onClick={() => setColor(ERASER)}
                title="지우개"
                className={`w-6 h-6 rounded border-2 grid place-items-center text-xs transition
                  ${color === ERASER ? 'border-ink-900 scale-110 bg-rose2-100' : 'border-white/60 bg-white'}`}
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' }}
              >🧽</button>
            </div>
            <div className="mt-1.5 text-[11px] text-ink-500">
              현재: <span className="inline-block w-3 h-3 rounded align-middle"
                style={{ background: color === ERASER ? '#fff' : color, border: '1px solid #00000033' }} />
              <span className="ml-1">{color === ERASER ? '지우개' : color}</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-ink-500 mb-1.5">👁 미리보기 (실제 크기 96px)</div>
            <div className="flex items-center gap-3">
              <img
                src={previewUrl}
                alt="preview"
                className="bg-cream-100 rounded-md"
                style={{ width: 96, height: 96, imageRendering: 'pixelated' }}
              />
              <img
                src={previewUrl}
                alt="preview small"
                className="bg-cream-100 rounded-md"
                style={{ width: 48, height: 48, imageRendering: 'pixelated' }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setGrid(freshGrid(size))} className="btn-ghost text-xs">🗑 모두 지우기</button>
            <button onClick={() => onCancel?.()} className="btn-ghost text-xs">취소</button>
            <button
              onClick={() => onSave(gridToDataUrl(grid, size, 4))}
              className="btn-gold text-sm"
            >
              ✦ 아바타로 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
