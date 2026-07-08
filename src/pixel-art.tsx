import { useMemo } from 'react'

/* =========================================================
   픽셀 SVG 라이브러리 — 그리스 신전 + 사이프러스 숲 + 픽셀아트
   ========================================================= */

const PAL = {
  sky:     '#cfe2c8',
  marble:  '#f4ecd8',
  face:    '#e6dcc0',
  shadow:  '#c8b896',
  deep:    '#9a8866',
  edge:    '#0d2419',
  gold:    '#d4b870',
  goldHi:  '#f7d56b',
  flute:   '#c8b896',
  leaf:    '#3f8a55',
  leafDk:  '#163828',
  leafLi:  '#7ab87a',
  wood:    '#8a5a3a',
  woodDk:  '#5a3a22',
}

const Rect = ({ x, y, w, h, c }: { x: number; y: number; w: number; h: number; c: string }) =>
  <rect x={x} y={y} width={w} height={h} fill={c} />

/* ────────── GreekFacade — 헤더용 신전 파사드 ────────── */
export function GreekFacade({
  width = '100%',
  height = 90,
  columns = 8,
}: { width?: number | string; height?: number; columns?: number }) {
  const W = 180, H = 72
  const p = PAL
  const friezeTop = 20, friezeBot = 28, colTop = friezeBot, colBot = H - 4, colW = 7
  const margin = 14, span = W - margin * 2, step = (span - colW) / (columns - 1)
  const colXs = Array.from({ length: columns }, (_, i) => margin + i * step)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={height} className="pixel"
      preserveAspectRatio="none" style={{ display: 'block' }}>
      {/* Pediment */}
      {Array.from({ length: friezeTop }, (_, y) => {
        const halfW = Math.floor((y + 1) * (W / 2 - 8) / friezeTop)
        const x0 = W / 2 - halfW
        return (
          <g key={y}>
            <Rect x={x0} y={y} w={halfW * 2} h={1} c={p.face} />
            <Rect x={x0} y={y} w={1} h={1} c={p.edge} />
            <Rect x={W - x0 - 1} y={y} w={1} h={1} c={p.edge} />
          </g>
        )
      })}
      {/* Cornice */}
      <Rect x={8} y={friezeTop} w={W - 16} h={2} c={p.edge} />
      <Rect x={6} y={friezeTop + 2} w={W - 12} h={2} c={p.deep} />
      <Rect x={6} y={friezeTop + 2} w={W - 12} h={1} c={p.marble} />
      {/* Pediment 중앙 장식 — 해/리스 */}
      <Rect x={W / 2 - 8} y={8} w={16} h={8} c={p.deep} />
      <Rect x={W / 2 - 6} y={10} w={12} h={4} c={p.gold} />
      <Rect x={W / 2 - 4} y={11} w={8} h={2} c={p.goldHi} />
      <Rect x={W / 2 - 1} y={9} w={2} h={6} c={p.marble} />
      {/* Acroteria */}
      <Rect x={2} y={friezeTop - 4} w={4} h={4} c={p.edge} />
      <Rect x={3} y={friezeTop - 6} w={2} h={2} c={p.edge} />
      <Rect x={W - 6} y={friezeTop - 4} w={4} h={4} c={p.edge} />
      <Rect x={W - 5} y={friezeTop - 6} w={2} h={2} c={p.edge} />
      <Rect x={W / 2 - 1} y={-2} w={2} h={4} c={p.edge} />
      {/* Frieze */}
      <Rect x={0} y={friezeBot - 6} w={W} h={6} c={p.face} />
      <Rect x={0} y={friezeBot - 6} w={W} h={1} c={p.marble} />
      <Rect x={0} y={friezeBot - 1} w={W} h={1} c={p.shadow} />
      {colXs.map((x, i) => (
        <g key={`trig-${i}`}>
          <Rect x={x + colW / 2 - 1.5} y={friezeBot - 5} w={3} h={4} c={p.deep} />
          <Rect x={x + colW / 2 - 1.5} y={friezeBot - 5} w={1} h={4} c={p.edge} />
          <Rect x={x + colW / 2 + 0.5} y={friezeBot - 5} w={1} h={4} c={p.edge} />
        </g>
      ))}
      {colXs.slice(0, -1).map((x, i) => {
        const mx = x + step / 2 + colW / 2
        return <Rect key={`metope-${i}`} x={mx - 1} y={friezeBot - 4} w={2} h={2} c={p.gold} />
      })}
      {/* Columns */}
      {colXs.map((x, i) => (
        <g key={`col-${i}`}>
          <Rect x={x - 1} y={colTop}     w={colW + 2} h={1} c={p.edge} />
          <Rect x={x - 1} y={colTop + 1} w={colW + 2} h={2} c={p.face} />
          <Rect x={x - 1} y={colTop + 1} w={colW + 2} h={1} c={p.marble} />
          <Rect x={x}     y={colTop + 3} w={colW}     h={2} c={p.face} />
          <Rect x={x}     y={colTop + 3} w={colW}     h={1} c={p.marble} />
          <Rect x={x}     y={colTop + 5} w={colW}     h={colBot - colTop - 8} c={p.face} />
          <Rect x={x + 1} y={colTop + 5} w={1} h={colBot - colTop - 8} c={p.flute} />
          <Rect x={x + 3} y={colTop + 5} w={1} h={colBot - colTop - 8} c={p.flute} />
          <Rect x={x + 5} y={colTop + 5} w={1} h={colBot - colTop - 8} c={p.flute} />
          <Rect x={x}            y={colTop + 5} w={1} h={colBot - colTop - 8} c={p.marble} />
          <Rect x={x + colW - 1} y={colTop + 5} w={1} h={colBot - colTop - 8} c={p.shadow} />
          <Rect x={x - 1} y={colBot - 3} w={colW + 2} h={2} c={p.face} />
          <Rect x={x - 1} y={colBot - 3} w={colW + 2} h={1} c={p.marble} />
          <Rect x={x - 1} y={colBot - 1} w={colW + 2} h={1} c={p.edge} />
        </g>
      ))}
      {/* Stylobate */}
      <Rect x={0} y={colBot}     w={W} h={1} c={p.edge} />
      <Rect x={2} y={colBot}     w={W - 4} h={1} c={p.shadow} />
      <Rect x={0} y={colBot + 1} w={W} h={2} c={p.face} />
      <Rect x={0} y={colBot + 1} w={W} h={1} c={p.marble} />
      <Rect x={0} y={colBot + 3} w={W} h={1} c={p.edge} />
    </svg>
  )
}

/* ────────── GreekColumn — 단일 기둥 ────────── */
export function GreekColumn({ height = 220, width = 36 }: { height?: number; width?: number }) {
  const p = PAL
  return (
    <svg viewBox="0 0 24 144" width={width} height={height} className="pixel"
      preserveAspectRatio="none" style={{ display: 'block' }}>
      {/* Capital */}
      <Rect x={1}  y={4}  w={22} h={2} c={p.edge} />
      <Rect x={2}  y={6}  w={20} h={3} c={p.face} />
      <Rect x={2}  y={6}  w={20} h={1} c={p.marble} />
      <Rect x={4}  y={9}  w={16} h={2} c={p.face} />
      <Rect x={4}  y={9}  w={16} h={1} c={p.marble} />
      {/* Shaft */}
      <Rect x={5}  y={12} w={14} h={120} c={p.face} />
      <Rect x={5}  y={12} w={1}  h={120} c={p.marble} />
      <Rect x={18} y={12} w={1}  h={120} c={p.shadow} />
      <Rect x={8}  y={12} w={1}  h={120} c={p.flute} />
      <Rect x={11} y={12} w={1}  h={120} c={p.flute} />
      <Rect x={14} y={12} w={1}  h={120} c={p.flute} />
      {/* Base */}
      <Rect x={2}  y={132} w={20} h={3} c={p.face} />
      <Rect x={2}  y={132} w={20} h={1} c={p.marble} />
      <Rect x={1}  y={135} w={22} h={2} c={p.face} />
      <Rect x={1}  y={137} w={22} h={1} c={p.edge} />
      <Rect x={0}  y={138} w={24} h={3} c={p.face} />
      <Rect x={0}  y={141} w={24} h={1} c={p.edge} />
    </svg>
  )
}

/* ────────── SideColumn — 페이지 양 옆 장식 기둥 ────────── */
export function SideColumn({ side = 'left', top = 0 }: { side?: 'left' | 'right'; top?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top,
        [side]: 0,
        width: 56,
        height: '100vh',
        pointerEvents: 'none',
        opacity: 0.55,
        zIndex: 0,
      } as React.CSSProperties}
    >
      <GreekColumn height={300} width={48} />
      <div style={{ marginTop: 12 }}><GreekColumn height={300} width={48} /></div>
    </div>
  )
}

/* ────────── OliveBranch — 헤딩 좌우 장식 ────────── */
export function OliveBranch({ flip = false, width = 96 }: { flip?: boolean; width?: number }) {
  const p = PAL
  return (
    <svg viewBox="0 0 48 12" width={width} height={width * (12 / 48)} className="pixel"
      style={{ transform: flip ? 'scaleX(-1)' : undefined, display: 'inline-block', verticalAlign: 'middle' }}>
      <Rect x={0}  y={6} w={48} h={1} c={p.leafDk} />
      {[3, 10, 17, 24, 31, 38].map((cx, i) => (
        <g key={i}>
          <Rect x={cx}     y={3} w={4} h={3} c={p.leaf} />
          <Rect x={cx}     y={3} w={4} h={1} c={p.leafLi} />
          <Rect x={cx + 1} y={2} w={2} h={1} c={p.leaf} />
          <Rect x={cx}     y={7} w={4} h={3} c={p.leaf} />
          <Rect x={cx}     y={9} w={4} h={1} c={p.leafDk} />
          <Rect x={cx + 1} y={10} w={2} h={1} c={p.leaf} />
        </g>
      ))}
      <Rect x={43} y={5} w={3} h={3} c={PAL.goldHi} />
      <Rect x={44} y={6} w={1} h={1} c={PAL.gold} />
    </svg>
  )
}

/* ────────── MeanderBand — 그리스 키 패턴 띠 (반복 배경) ────────── */
export function MeanderBand({
  width = '100%',
  height = 14,
  color = '#0d2419',
  bg = '#f7f1de',
}: { width?: number | string; height?: number; color?: string; bg?: string }) {
  const tile = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 8' shape-rendering='crispEdges'>
       <rect width='16' height='8' fill='${bg}'/>
       <rect x='0' y='0' width='12' height='1' fill='${color}'/>
       <rect x='11' y='0' width='1' height='5' fill='${color}'/>
       <rect x='3' y='2' width='9' height='1' fill='${color}'/>
       <rect x='3' y='2' width='1' height='3' fill='${color}'/>
       <rect x='3' y='4' width='5' height='1' fill='${color}'/>
       <rect x='7' y='4' width='1' height='2' fill='${color}'/>
       <rect x='0' y='7' width='16' height='1' fill='${color}'/>
     </svg>`
  )
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        backgroundImage: `url("data:image/svg+xml;utf8,${tile}")`,
        backgroundRepeat: 'repeat-x',
        backgroundSize: `${height * 2}px ${height}px`,
        imageRendering: 'pixelated',
      }}
    />
  )
}

/* ────────── LaurelWreath — 월계관 (로고 둘레) ────────── */
export function LaurelWreath({ size = 96, children }: { size?: number; children?: React.ReactNode }) {
  const p = PAL
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg viewBox="0 0 40 40" width={size} height={size} className="pixel" style={{ position: 'absolute', inset: 0 }}>
        {/* 왼쪽 잎 */}
        {[5, 11, 17, 23, 29].map((y, i) => (
          <g key={`l-${i}`}>
            <Rect x={3}  y={y}     w={5} h={3} c={p.leaf} />
            <Rect x={3}  y={y}     w={5} h={1} c={p.leafLi} />
            <Rect x={3}  y={y + 2} w={5} h={1} c={p.leafDk} />
          </g>
        ))}
        {/* 오른쪽 잎 */}
        {[5, 11, 17, 23, 29].map((y, i) => (
          <g key={`r-${i}`}>
            <Rect x={32} y={y}     w={5} h={3} c={p.leaf} />
            <Rect x={32} y={y}     w={5} h={1} c={p.leafLi} />
            <Rect x={32} y={y + 2} w={5} h={1} c={p.leafDk} />
          </g>
        ))}
        {/* 매듭 */}
        <Rect x={17} y={34} w={6} h={2} c={p.gold} />
        <Rect x={17} y={34} w={6} h={1} c={p.goldHi} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        {children}
      </div>
    </div>
  )
}

/* ────────── PixelTree (사이프러스) ────────── */
export function PixelTree({ size = 64 }: { size?: number }) {
  const p = PAL
  return (
    <svg viewBox="0 0 24 36" width={size} height={size * 1.5} className="pixel">
      {/* 둥치 */}
      <Rect x={10} y={28} w={4} h={6} c={p.wood} />
      <Rect x={10} y={28} w={1} h={6} c={p.woodDk} />
      {/* 잎 더미 */}
      {[
        { y: 24, w: 12, x: 6 },
        { y: 20, w: 14, x: 5 },
        { y: 16, w: 12, x: 6 },
        { y: 12, w: 10, x: 7 },
        { y: 8,  w: 8,  x: 8 },
        { y: 4,  w: 6,  x: 9 },
        { y: 2,  w: 4,  x: 10 },
      ].map((r, i) => (
        <g key={i}>
          <Rect x={r.x} y={r.y} w={r.w} h={4} c={p.leaf} />
          <Rect x={r.x} y={r.y} w={r.w} h={1} c={p.leafLi} />
          <Rect x={r.x} y={r.y + 3} w={r.w} h={1} c={p.leafDk} />
        </g>
      ))}
    </svg>
  )
}

/* ────────── Firefly + FireflySwarm ────────── */
export function Firefly({ size = 8, delay = 0, style }: { size?: number; delay?: number; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        background: PAL.goldHi,
        borderRadius: '50%',
        boxShadow: `0 0 6px ${PAL.goldHi}, 0 0 14px ${PAL.gold}`,
        animation: `firefly-float 6s ease-in-out ${delay}s infinite, firefly-glow 1.8s ease-in-out ${delay}s infinite`,
        ...style,
      }}
    />
  )
}

export function FireflySwarm({ count = 14 }: { count?: number }) {
  const flies = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        top: 10 + (i * 137) % 80,
        left: (i * 53) % 95,
        size: 5 + (i % 4),
        delay: (i * 0.7) % 6,
      })),
    [count]
  )
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {flies.map((f, i) => (
        <Firefly
          key={i}
          size={f.size}
          delay={f.delay}
          style={{ position: 'absolute', top: `${f.top}%`, left: `${f.left}%` }}
        />
      ))}
    </div>
  )
}

/* ────────── LeafField — 떨어지는 잎 ────────── */
export function LeafField({ count = 10 }: { count?: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 89) % 100,
        drift: 30 + (i * 17) % 90,
        delay: (i * 0.9) % 8,
        duration: 10 + (i % 7),
        size: 10 + (i % 5),
      })),
    [count]
  )
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {leaves.map((l, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: -20,
            left: `${l.left}%`,
            width: l.size,
            height: l.size,
            ['--drift' as string]: `${l.drift}px`,
            animation: `leaf-fall ${l.duration}s linear ${l.delay}s infinite`,
          }}
        >
          <svg viewBox="0 0 8 8" width={l.size} height={l.size} className="pixel">
            <Rect x={1} y={1} w={6} h={6} c={PAL.leaf} />
            <Rect x={1} y={1} w={6} h={1} c={PAL.leafLi} />
            <Rect x={1} y={6} w={6} h={1} c={PAL.leafDk} />
            <Rect x={3} y={1} w={2} h={6} c={PAL.leafDk} />
          </svg>
        </div>
      ))}
    </div>
  )
}

/* ────────── SunRays — 빛 줄기 ────────── */
export function SunRays({ position = 'left' }: { position?: 'left' | 'right' }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: -40,
        [position]: -40,
        width: 360,
        height: 360,
        pointerEvents: 'none',
        zIndex: 0,
        background: `conic-gradient(from ${position === 'left' ? 210 : -30}deg at ${position === 'left' ? '0% 0%' : '100% 0%'},
          rgba(247, 213, 107, 0) 0deg,
          rgba(247, 213, 107, 0.35) 30deg,
          rgba(247, 213, 107, 0) 60deg,
          rgba(247, 213, 107, 0.25) 90deg,
          rgba(247, 213, 107, 0) 120deg)`,
        filter: 'blur(8px)',
        animation: 'sunray-pulse 7s ease-in-out infinite',
      } as React.CSSProperties}
    />
  )
}

/* ────────── MistBand — 흐르는 안개 ────────── */
export function MistBand({ top = '20%', delay = 0, opacity = 0.4 }: { top?: string; delay?: number; opacity?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top,
        left: 0,
        right: 0,
        height: 90,
        pointerEvents: 'none',
        zIndex: 0,
        background: `linear-gradient(90deg,
          rgba(255,255,255,0) 0%,
          rgba(255,255,255,${opacity}) 50%,
          rgba(255,255,255,0) 100%)`,
        filter: 'blur(14px)',
        animation: `mist-drift 22s linear ${delay}s infinite`,
      }}
    />
  )
}

/* ────────── PixelIcon — 인라인 픽셀 아이콘 ────────── */
type IconKind =
  | 'leaf' | 'shrine' | 'scroll' | 'book' | 'sword'
  | 'target' | 'chat' | 'bag' | 'cookie' | 'feather'
  | 'sun' | 'moon' | 'plus' | 'check' | 'star' | 'key'

export function PixelIcon({ kind, size = 16, color = PAL.leafDk }: { kind: IconKind; size?: number; color?: string }) {
  const c = color, gold = PAL.goldHi
  const draw = (cells: [number, number, string?][]) =>
    cells.map(([x, y, cc], i) => <Rect key={i} x={x} y={y} w={1} h={1} c={cc ?? c} />)
  const M: Record<IconKind, [number, number, string?][]> = {
    leaf: [[3,1],[2,2],[4,2],[1,3],[3,3],[5,3],[2,4],[4,4],[3,5],[3,6],[3,7]],
    shrine: [[3,1],[2,2],[3,2],[4,2],[1,3],[2,3],[3,3],[4,3],[5,3],[1,4],[5,4],[1,5],[3,5],[5,5],[1,6],[3,6],[5,6],[0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    scroll: [[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[0,2],[1,2],[6,2],[7,2],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[1,4],[2,4],[5,4],[6,4],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[0,6],[1,6],[6,6],[7,6],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    book: [[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[1,2],[3,2],[4,2],[6,2],[1,3],[3,3],[4,3],[6,3],[1,4],[3,4],[4,4],[6,4],[1,5],[3,5],[4,5],[6,5],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6],[2,7],[3,7],[4,7],[5,7]],
    sword: [[5,1],[4,2],[5,2],[3,3],[4,3],[2,4],[3,4],[1,5],[2,5],[0,6],[1,6,gold],[6,6,gold],[5,6,gold],[1,7,gold]],
    target: [[2,1],[3,1],[4,1],[5,1],[1,2],[6,2],[0,3],[3,3],[4,3],[7,3],[0,4],[3,4],[4,4],[7,4],[1,5],[6,5],[2,6],[3,6],[4,6],[5,6]],
    chat: [[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[0,2],[7,2],[0,3],[7,3],[0,4],[7,4],[1,5],[6,5],[2,6],[3,6],[4,6],[5,6],[2,7],[3,7]],
    bag: [[3,1],[4,1],[2,2],[5,2],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[1,4],[6,4],[1,5],[6,5],[1,6],[6,6],[2,7],[3,7],[4,7],[5,7]],
    cookie: [[2,1],[3,1],[4,1],[5,1],[1,2],[6,2],[0,3],[3,3,gold],[7,3],[0,4],[5,4,gold],[7,4],[0,5],[2,5,gold],[7,5],[1,6],[6,6],[2,7],[3,7],[4,7],[5,7]],
    feather: [[5,1],[4,2],[5,2],[3,3],[4,3],[2,4],[3,4],[1,5],[2,5],[0,6],[1,6],[1,7]],
    sun: [[3,0],[4,0],[3,1,gold],[4,1,gold],[2,2,gold],[3,2,gold],[4,2,gold],[5,2,gold],[1,3],[2,3,gold],[3,3,gold],[4,3,gold],[5,3,gold],[6,3],[2,4,gold],[3,4,gold],[4,4,gold],[5,4,gold],[3,5,gold],[4,5,gold],[3,6],[4,6],[3,7],[4,7]],
    moon: [[3,1],[4,1],[5,1],[2,2],[5,2],[1,3],[4,3],[1,4],[4,4],[2,5],[5,5],[3,6],[4,6],[5,6]],
    plus: [[3,1],[4,1],[3,2],[4,2],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[3,5],[4,5],[3,6],[4,6]],
    check: [[6,1],[5,2],[6,2],[4,3],[5,3],[1,4],[3,4],[4,4],[1,5],[2,5],[3,5],[2,6]],
    star: [[3,1,gold],[4,1,gold],[2,2,gold],[3,2,gold],[4,2,gold],[5,2,gold],[1,3,gold],[2,3,gold],[3,3,gold],[4,3,gold],[5,3,gold],[6,3,gold],[2,4,gold],[3,4,gold],[4,4,gold],[5,4,gold],[1,5,gold],[2,5,gold],[5,5,gold],[6,5,gold]],
    key:  [[2,1,gold],[3,1,gold],[4,1,gold],[1,2,gold],[5,2,gold],[1,3,gold],[5,3,gold],[2,4,gold],[3,4,gold],[4,4,gold],[3,5,gold],[3,6,gold],[3,7,gold],[4,7,gold],[5,7,gold]],
  }
  const cells = M[kind] ?? []
  return (
    <svg viewBox="0 0 8 8" width={size} height={size} className="pixel" style={{ display: 'inline-block', verticalAlign: '-2px' }}>
      {draw(cells)}
    </svg>
  )
}

/* ────────── 작은 헤딩 장식 — OliveBranch x 텍스트 x OliveBranch ────────── */
export function OliveHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <OliveBranch width={72} />
      <span className="font-display text-base md:text-lg tracking-widest text-moss-deep">{children}</span>
      <OliveBranch flip width={72} />
    </div>
  )
}
