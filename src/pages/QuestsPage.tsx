import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth'
import { DAILY_TASKS, itemsUnlockedAt, lastNDays, levelFromXp, maxDailyScore, themesUnlockedAt, todayStr } from '../data'
import { useCustomTitles, useRoster, useStudentStateMap } from '../state'
import type { CustomTitle, DailyTaskKey, MissionRecord, TitleColor } from '../types'
import Sprite from '../components/Sprite'
import PixelEditor from '../components/PixelEditor'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

function dateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function totalOf(rec?: MissionRecord) {
  if (!rec) return 0
  return Object.values(rec.scores).reduce((a, b) => a + (b ?? 0), 0)
}

function rewardFor(score: number) {
  if (score >= 10) return 2
  if (score >= 1) return 1
  return 0
}

export default function QuestsPage() {
  const [auth] = useAuth()
  const { get, update } = useStudentStateMap()
  const MOCK_STUDENTS = useRoster()

  const sid = auth?.role === 'student' ? auth.studentId : MOCK_STUDENTS[0]?.id
  const student = MOCK_STUDENTS.find(s => s.id === sid)!
  const state = sid ? get(sid) : null

  const today = todayStr()
  const [selected, setSelected] = useState(today)
  const days = useMemo(() => lastNDays(7), [])

  const record = state?.missions.find(m => m.date === selected) ?? { date: selected, scores: {}, redeemed: false }
  const isToday = selected === today
  const total = totalOf(record)
  const max = maxDailyScore()
  const reward = rewardFor(total)

  const setTaskScore = (key: DailyTaskKey, value: number) => {
    if (!sid || !isToday) return
    update(sid, s => {
      const idx = s.missions.findIndex(m => m.date === selected)
      const recs = [...s.missions]
      if (idx >= 0) {
        recs[idx] = { ...recs[idx], scores: { ...recs[idx].scores, [key]: value } }
      } else {
        recs.push({ date: selected, scores: { [key]: value }, redeemed: false })
      }
      return { ...s, missions: recs }
    })
  }

  const redeem = () => {
    if (!sid || !isToday) return
    if (record.redeemed) return
    if (reward === 0) return
    const baseCookies = MOCK_STUDENTS.find(x => x.id === sid)?.cookies ?? 0
    const xpAmount = total * 5 + (total >= 10 ? 20 : 0)
    let levelUp: { from: number; to: number } | null = null

    update(sid, s => {
      const recs = s.missions.length > 0 ? s.missions.slice() : []
      const idx = recs.findIndex(m => m.date === selected)
      if (idx >= 0) {
        if (recs[idx].redeemed) return s
        recs[idx] = { ...recs[idx], redeemed: true }
      } else {
        recs.push({ ...record, redeemed: true })
      }
      const oldCookies = s.cookies ?? baseCookies
      const oldLife = s.lifetimeCookies ?? oldCookies
      const oldXp = s.xp ?? 0
      const newXp = Math.max(0, oldXp + xpAmount)
      const oldLvl = levelFromXp(oldXp).level
      const newLvl = levelFromXp(newXp).level
      let unlockedThemes = s.unlockedThemes ?? themesUnlockedAt(oldLvl)
      let ownedItemIds = s.ownedItemIds
      if (newLvl > oldLvl) {
        unlockedThemes = Array.from(new Set([...unlockedThemes, ...themesUnlockedAt(newLvl)]))
        const newItems = itemsUnlockedAt(newLvl).filter(id => !ownedItemIds.includes(id))
        if (newItems.length > 0) ownedItemIds = [...ownedItemIds, ...newItems]
        levelUp = { from: oldLvl, to: newLvl }
      }
      return { ...s, missions: recs, cookies: oldCookies + reward, lifetimeCookies: oldLife + reward, xp: newXp, unlockedThemes, ownedItemIds }
    })

    if (levelUp) {
      const lu = levelUp as { from: number; to: number }
      alert(`✨ 레벨업! Lv.${lu.from} → Lv.${lu.to}`)
    }
  }

  const questsContent = (
    <div className="stack">
      {/* 헤더 */}
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <span className="chip chip--green" style={{ marginBottom: 8 }}>📜 일곱 미션의 신전</span>
            <h2 className="card-title" style={{ fontSize: 26 }}>
              일일 퀘스트 — {selected}{isToday && <span style={{ fontSize: 15, color: 'var(--muted)', marginLeft: 8 }}>(오늘)</span>}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>
              <b style={{ color: 'var(--green)' }}>{student?.heroName}</b> 용사의 미션. 오늘 날짜에 스스로 체크하세요.
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 4 }}>
              ※ 9점 이하 🍪 1개 · 10점 🍪 2개
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 44, color: 'var(--green)', lineHeight: 1 }}>
              {total}<span style={{ color: 'var(--muted-3)', fontSize: 22 }}> / {max}</span>
            </div>
            <div className="progress" style={{ width: 180, marginTop: 8 }}>
              <div className="progress__fill" style={{ width: `${(total / max) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 최근 7일 */}
      <div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>📅 최근 7일</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {days.map(d => {
            const ds = dateStr(d)
            const rec = state?.missions.find(m => m.date === ds)
            const sum = totalOf(rec)
            const isSel = ds === selected
            const isT = ds === today
            return (
              <button
                key={ds}
                onClick={() => setSelected(ds)}
                style={{
                  minWidth: 84, padding: '10px 12px', borderRadius: 'var(--r-lg)', cursor: 'pointer', textAlign: 'center',
                  border: `2px solid ${isSel ? 'var(--green-line-2)' : 'var(--border)'}`,
                  background: isSel ? '#dcebbd' : 'var(--surface)',
                  fontFamily: 'var(--font-title)',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.getMonth() + 1}.{d.getDate()} ({DOW[d.getDay()]})</div>
                <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 2 }}>{isT ? '오늘' : sum > 0 ? `${sum}/10` : '—'}</div>
                {rec?.redeemed && <div style={{ fontSize: 10, color: 'var(--gold-deep)', marginTop: 2 }}>🍪 받음</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* 미션 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
        {DAILY_TASKS.map(task => {
          const score = record.scores[task.key] ?? 0
          return (
            <div key={task.key} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ fontSize: 30 }}>{task.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'var(--font-title)', fontSize: 17, color: 'var(--text)' }}>{task.label}</div>
                    <span className="chip chip--gold" style={{ fontSize: 11 }}>{task.maxScore}점</span>
                    {score === task.maxScore && <span className="chip chip--green" style={{ fontSize: 11 }}>✓ 완수</span>}
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '4px 0 0' }}>{task.description}</p>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {Array.from({ length: task.maxScore }, (_, i) => i + 1).map(slot => {
                      const filled = score >= slot
                      return (
                        <button
                          key={slot}
                          disabled={!isToday}
                          onClick={() => setTaskScore(task.key, filled ? slot - 1 : slot)}
                          style={{
                            width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center',
                            fontFamily: 'var(--font-title)', cursor: isToday ? 'pointer' : 'not-allowed',
                            border: `2px solid ${filled ? 'var(--green-line-2)' : 'var(--border-strong)'}`,
                            background: filled ? '#dcebbd' : '#fff', color: filled ? 'var(--green)' : 'var(--muted-3)',
                            opacity: isToday ? 1 : 0.6,
                          }}
                          aria-label={`${task.label} ${slot}점`}
                        >
                          {filled ? '✓' : '○'}
                        </button>
                      )
                    })}
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>{score} / {task.maxScore}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 보상 */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>오늘 받게 될 쿠키</div>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 24, color: 'var(--gold-deep)' }}>🍪 {reward}개</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {total === 0 ? '아직 체크가 없어요.' : reward === 1 ? `현재 ${total}점 — 1개 지급 예정` : '만점 달성! — 2개 지급 예정'}
          </div>
        </div>
        <button
          onClick={redeem}
          disabled={!isToday || record.redeemed || reward === 0}
          className="btn btn--primary"
          style={{ opacity: (!isToday || record.redeemed || reward === 0) ? 0.5 : 1 }}
        >
          {record.redeemed ? '🍪 수령 완료' : '🍪 쿠키 수령'}
        </button>
      </div>
    </div>
  )

  return <QuestsLayout sid={sid ?? null} questsContent={questsContent} />
}

/* ──────────────── 서브 탭 ──────────────── */
type QuestsMenuKey = 'quests' | 'sketch' | 'classmates' | 'status' | 'titles'

const QUESTS_MENU: Array<{ key: QuestsMenuKey; icon: string; label: string }> = [
  { key: 'quests', icon: '📜', label: '일일 퀘스트' },
  { key: 'sketch', icon: '🎨', label: '일력 도전' },
  { key: 'classmates', icon: '🌿', label: '우리반' },
  { key: 'status', icon: '💬', label: '상태 메시지' },
  { key: 'titles', icon: '⭐', label: '내 호칭' },
]

function QuestsLayout({ sid, questsContent }: { sid: string | null; questsContent: React.ReactNode }) {
  const [active, setActive] = useState<QuestsMenuKey>('quests')

  return (
    <section className="sin-screen">
      <div style={{ marginBottom: 14 }}>
        <h1 className="page-title">신탁 두루마리 <span style={{ fontSize: 28 }}>🌿</span></h1>
        <p className="page-subtitle">매일 미션을 완료하고 쿠키를 모아보세요!</p>
      </div>

      <div className="tabs tabs--filled" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {QUESTS_MENU.map(m => (
          <button key={m.key} className={`tab ${active === m.key ? 'is-active' : ''}`} onClick={() => setActive(m.key)}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {active === 'quests' && questsContent}
      {active === 'sketch' && sid && <SketchCard sid={sid} />}
      {active === 'classmates' && <ClassmatesCard />}
      {active === 'status' && sid && <StatusMessageCard sid={sid} />}
      {active === 'titles' && sid && <TitleVaultCard sid={sid} />}
    </section>
  )
}

/* ──────────────── 우리반 일력 도전 (레이어 스케치보드) ──────────────── */
const SKETCH_W = 1000
const SKETCH_H = 600
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

function SketchCard({ sid }: { sid: string }) {
  const { get, update } = useStudentStateMap()
  const today = todayStr()
  const existing = get(sid).dailySketch
  const submittedToday = existing?.date === today

  const [layers, setLayers] = useState<{ id: number; visible: boolean }[]>([{ id: 1, visible: true }])
  const [activeId, setActiveId] = useState(1)
  const seqRef = useRef(2)
  const canvasMap = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const drawing = useRef(false)
  const last = useRef<Pt | null>(null)
  const restored = useRef(false)

  const [color, setColor] = useState('#3a3a3a')
  const [size, setSize] = useState(8)
  const [tool, setTool] = useState<ToolKey>('pen')
  const [text, setText] = useState(submittedToday ? existing!.text : '')

  const setCanvasRef = (id: number) => (el: HTMLCanvasElement | null) => {
    if (el) canvasMap.current.set(id, el)
    else canvasMap.current.delete(id)
  }

  // 오늘 제출본을 레이어1에 1회 복원
  useEffect(() => {
    if (restored.current) return
    const c = canvasMap.current.get(1)
    if (!c) return
    restored.current = true
    if (submittedToday && existing?.imageDataUrl) {
      const img = new Image()
      img.onload = () => c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      img.src = existing.imageDataUrl
    }
  }, [submittedToday, existing?.imageDataUrl])

  const pos = (e: React.PointerEvent): Pt => {
    const r = overlayRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (SKETCH_W / r.width), y: (e.clientY - r.top) * (SKETCH_H / r.height) }
  }
  const start = (e: React.PointerEvent) => {
    const c = canvasMap.current.get(activeId)
    if (!c) return
    drawing.current = true
    const p = pos(e)
    last.current = p
    strokeSeg(c.getContext('2d')!, p, p, tool, color, size)
    try { overlayRef.current!.setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const c = canvasMap.current.get(activeId)
    if (!c) return
    const p = pos(e)
    strokeSeg(c.getContext('2d')!, last.current!, p, tool, color, size)
    last.current = p
  }
  const end = () => { drawing.current = false; last.current = null }

  const clearActive = () => {
    const c = canvasMap.current.get(activeId)
    if (c) c.getContext('2d')!.clearRect(0, 0, SKETCH_W, SKETCH_H)
  }
  const addLayer = () => {
    const id = seqRef.current++
    setLayers(ls => [...ls, { id, visible: true }])
    setActiveId(id)
  }
  const removeLayer = (id: number) => {
    if (layers.length <= 1) return
    canvasMap.current.delete(id)
    setLayers(ls => ls.filter(l => l.id !== id))
    if (activeId === id) setActiveId(layers.find(l => l.id !== id)!.id)
  }
  const toggleVisible = (id: number) => setLayers(ls => ls.map(l => (l.id === id ? { ...l, visible: !l.visible } : l)))
  // dir: +1 위로(더 앞에 그려짐), -1 아래로. 배열 뒤일수록 위(zIndex 큼).
  const moveLayer = (id: number, dir: 1 | -1) => {
    setLayers(ls => {
      const i = ls.findIndex(l => l.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= ls.length) return ls
      const next = [...ls]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const submit = () => {
    const flat = document.createElement('canvas')
    flat.width = SKETCH_W
    flat.height = SKETCH_H
    const fx = flat.getContext('2d')!
    fx.fillStyle = '#ffffff'
    fx.fillRect(0, 0, SKETCH_W, SKETCH_H)
    for (const l of layers) {
      if (!l.visible) continue
      const c = canvasMap.current.get(l.id)
      if (c) fx.drawImage(c, 0, 0)
    }
    const url = flat.toDataURL('image/jpeg', 0.85)
    update(sid, s => ({
      ...s,
      dailySketch: { date: today, imageDataUrl: url, text: text.trim(), submittedAt: new Date().toISOString() },
    }))
    alert('🎨 일력 도전 완료! 선생님께 전송됐어요. 뽑히면 우리반 일력에 실려요!')
  }

  const d = new Date()
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const wd = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]

  const toolBtn = (active: boolean): React.CSSProperties => ({
    height: 38, padding: '0 12px', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-title)', fontSize: 13,
    color: active ? '#fff' : 'var(--text-3)', background: active ? 'var(--green-btn)' : '#fff',
    border: `2px solid ${active ? 'var(--green)' : 'var(--border-strong)'}`, display: 'inline-flex', alignItems: 'center', gap: 5,
  })

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <div className="card-title">🎨 우리반 일력 도전</div>
        <span className="chip chip--gold">{mon} {d.getDate()} {wd}</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
        브러쉬·색·레이어를 활용해 자유롭게 그려요!
        {submittedToday && <b style={{ color: 'var(--green)' }}> · 오늘 제출 완료(다시 제출하면 덮어써요)</b>}
      </p>

      {/* 브러쉬 + 굵기 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TOOLS.map(t => (
            <button key={t.key} onClick={() => setTool(t.key)} style={toolBtn(tool === t.key)}>{t.icon} {t.label}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--border-strong)' }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {SIZES.map(z => (
            <button
              key={z}
              onClick={() => setSize(z)}
              style={{ width: 40, height: 38, borderRadius: 10, cursor: 'pointer', display: 'grid', placeItems: 'center', border: `2px solid ${size === z ? 'var(--green)' : 'var(--border-strong)'}`, background: '#fff' }}
              aria-label={`굵기 ${z}`}
            >
              <span style={{ width: Math.min(z, 22), height: Math.min(z, 22), background: '#3a3a3a', borderRadius: '50%', display: 'block' }} />
            </button>
          ))}
        </div>
      </div>

      {/* 색 팔레트 + 색상 선택기 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {PALETTE.map(c => (
          <button key={c} onClick={() => setColor(c)} className={`swatch ${color === c ? 'is-active' : ''}`} style={{ background: c }} aria-label={`색 ${c}`} />
        ))}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
          🎨 직접 고르기
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 32, height: 32, border: '2px solid var(--border-strong)', borderRadius: 8, background: 'none', cursor: 'pointer', padding: 0 }} />
        </label>
      </div>

      {/* 캔버스(레이어 스택) + 레이어 패널 */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div
          style={{ position: 'relative', flex: 1, minWidth: 280, aspectRatio: `${SKETCH_W} / ${SKETCH_H}`, background: '#fff', border: '2px solid var(--border-strong)', borderRadius: 'var(--r-md)', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,.08)' }}
        >
          {layers.map((l, i) => (
            <canvas
              key={l.id}
              ref={setCanvasRef(l.id)}
              width={SKETCH_W}
              height={SKETCH_H}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: l.visible ? 'block' : 'none', zIndex: i }}
            />
          ))}
          <div
            ref={overlayRef}
            style={{ position: 'absolute', inset: 0, zIndex: 999, touchAction: 'none', cursor: 'crosshair' }}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
        </div>

        {/* 레이어 패널 */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-title)', fontSize: 14, color: 'var(--text)' }}>레이어</span>
            <button onClick={addLayer} className="btn btn--leaf" style={{ padding: '4px 10px', fontSize: 12 }}>+ 추가</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...layers].reverse().map((l, idx) => {
              const num = layers.length - idx
              const ai = num - 1               // 원본 배열 인덱스
              const isActive = activeId === l.id
              const isTop = ai === layers.length - 1
              const isBottom = ai === 0
              const iconBtn = (enabled: boolean): React.CSSProperties => ({
                border: 'none', background: 'none', fontSize: 13, cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.25, lineHeight: 1,
              })
              return (
                <div
                  key={l.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 6, borderRadius: 8, border: `2px solid ${isActive ? 'var(--green)' : 'var(--border)'}`, background: isActive ? 'var(--green-soft)' : 'var(--surface-2)' }}
                >
                  <button onClick={() => setActiveId(l.id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-title)', fontSize: 13, color: 'var(--text)' }}>
                    레이어 {num}{isActive ? ' ✏️' : ''}
                  </button>
                  <button onClick={() => moveLayer(l.id, 1)} disabled={isTop} title="위로" style={iconBtn(!isTop)}>⬆️</button>
                  <button onClick={() => moveLayer(l.id, -1)} disabled={isBottom} title="아래로" style={iconBtn(!isBottom)}>⬇️</button>
                  <button onClick={() => toggleVisible(l.id)} title="표시/숨김" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }}>{l.visible ? '👁️' : '🚫'}</button>
                  <button onClick={() => removeLayer(l.id)} disabled={layers.length <= 1} title="삭제" style={iconBtn(layers.length > 1)}>🗑️</button>
                </div>
              )
            })}
          </div>
          <button onClick={clearActive} className="btn btn--ghost" style={{ width: '100%', marginTop: 10, fontSize: 12 }}>현재 레이어 비우기</button>
        </div>
      </div>

      <input
        className="input"
        style={{ marginTop: 12 }}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="한 줄 문구를 적어요 (예: 점수가 중요한 게 아니야, 그냥 즐기면 돼!)"
      />
      <button onClick={submit} className="btn btn--primary" style={{ width: '100%', marginTop: 12, padding: 14, fontSize: 18 }}>✏️ 도전하기</button>
    </div>
  )
}

/* ──────────────── 우리반 신전 (학생 픽셀 + 프로필 팝업) ──────────────── */
function ClassmatesCard() {
  const roster = useRoster()
  const { map } = useStudentStateMap()
  const [titles] = useCustomTitles()
  const [sel, setSel] = useState<string | null>(null)

  const selStudent = sel ? roster.find(s => s.id === sel) : null
  const selState = sel ? map[sel] : undefined
  const selTitles = ((selState?.displayTitleIds ?? (selState?.displayTitleId ? [selState.displayTitleId] : []))
    .map(id => titles.find(t => t.id === id))
    .filter(Boolean) as CustomTitle[])

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 4 }}>🌿 우리반 신전</div>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>친구를 누르면 한마디와 호칭을 볼 수 있어요.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 16 }}>
        {roster.map(s => (
          <button
            key={s.id}
            onClick={() => setSel(s.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer' }}
            aria-label={`${s.heroName} 프로필`}
          >
            <Sprite seed={s.avatarSeed} size={64} customSrc={map[s.id]?.customAvatar} />
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 13, color: 'var(--text)', textAlign: 'center' }}>{s.heroName}</div>
          </button>
        ))}
      </div>

      {selStudent && (
        <div className="modal-overlay" onClick={() => setSel(null)}>
          <div className="modal" style={{ maxWidth: 340, position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button className="emo-panel__close" onClick={() => setSel(null)}>✕</button>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Sprite seed={selStudent.avatarSeed} size={96} customSrc={selState?.customAvatar} />
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 22, color: 'var(--green)', marginTop: 8 }}>{selStudent.heroName}</div>
            {selTitles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                {selTitles.map(t => <span key={t.id} className="chip chip--gold">{t.icon} {t.name}</span>)}
              </div>
            )}
            <div className="bubble" style={{ marginTop: 14, textAlign: 'left' }}>
              {selState?.statusMessage?.trim()
                ? selState.statusMessage
                : '아직 남긴 한마디가 없어요. 🌱'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────── 상태 메시지 ──────────────── */
function StatusMessageCard({ sid }: { sid: string }) {
  const { get, update } = useStudentStateMap()
  const state = get(sid)
  const roster = useRoster()
  const me = roster.find(s => s.id === sid)
  const [msg, setMsg] = useState(state.statusMessage ?? '')
  const [savedAt, setSavedAt] = useState<string | null>(state.statusMessageAt ?? null)
  const [editorOpen, setEditorOpen] = useState(false)

  const save = () => {
    const next = msg.trim()
    const ts = new Date().toISOString()
    update(sid, s => ({ ...s, statusMessage: next, statusMessageAt: ts }))
    setSavedAt(ts)
  }
  const clear = () => {
    setMsg('')
    update(sid, s => ({ ...s, statusMessage: '', statusMessageAt: undefined }))
    setSavedAt(null)
  }

  const saveAvatar = (dataUrl: string) => {
    update(sid, s => ({ ...s, customAvatar: dataUrl }))
    setEditorOpen(false)
    alert('🎨 픽셀 프로필을 저장했어요!')
  }
  const clearAvatar = () => {
    if (!confirm('기본 아바타로 되돌릴까요?')) return
    update(sid, s => ({ ...s, customAvatar: undefined }))
  }

  return (
    <div className="stack">
      {/* 픽셀 프로필 꾸미기 */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 4 }}>🎨 내 픽셀 프로필</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>
          나만의 픽셀 아바타를 직접 그려요. 우리반 신전·홈 화면에 표시돼요.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {me && <Sprite seed={me.avatarSeed} size={80} customSrc={state.customAvatar} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => setEditorOpen(true)} className="btn btn--primary">✏️ 픽셀 아바타 꾸미기</button>
            {state.customAvatar && <button onClick={clearAvatar} className="btn btn--ghost">기본 아바타로</button>}
          </div>
        </div>
      </div>

      {/* 상태 메시지 */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <h2 className="card-title">💬 상태 메시지</h2>
          {savedAt && <span className="chip chip--green">✓ {new Date(savedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          <span className="chip chip--blue">{msg.length}/60</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>
          친구가 내 프로필을 누르면 보이는 한마디예요. (예: "오늘 컨디션 최고!")
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} value={msg} onChange={e => setMsg(e.target.value.slice(0, 60))} placeholder="오늘의 한마디" />
          <button onClick={save} className="btn btn--primary">저장</button>
          {msg && <button onClick={clear} className="btn btn--ghost">지우기</button>}
        </div>
      </div>

      {/* 픽셀 에디터 모달 */}
      {editorOpen && (
        <div className="modal-overlay" style={{ overflowY: 'auto', padding: 16 }} onClick={() => setEditorOpen(false)}>
          <div className="modal" style={{ maxWidth: 760, width: '100%', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 className="card-title">🎨 픽셀 아바타 그리기</h2>
              <button onClick={() => setEditorOpen(false)} className="btn btn--ghost">✕ 닫기</button>
            </div>
            <PixelEditor size={24} initialDataUrl={state.customAvatar} onSave={saveAvatar} onCancel={() => setEditorOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────── 호칭 보관함 ──────────────── */
const MAX_DISPLAY_TITLES = 3

function chipColor(c?: TitleColor): string {
  return c === 'blue' ? 'var(--blue-bg)' : c === 'green' ? 'var(--green-soft)' : c === 'rose' ? 'var(--pink-bg)' : 'var(--gold-bg)'
}

function TitleVaultCard({ sid }: { sid: string }) {
  const { get, update } = useStudentStateMap()
  const [titles] = useCustomTitles()
  const state = get(sid)

  const owned: CustomTitle[] = (state.ownedTitleIds ?? [])
    .map(id => titles.find(t => t.id === id))
    .filter(Boolean) as CustomTitle[]

  const displayIds: string[] = state.displayTitleIds ?? (state.displayTitleId ? [state.displayTitleId] : [])
  const isDisplayed = (id: string) => displayIds.includes(id)
  const reachedCap = displayIds.length >= MAX_DISPLAY_TITLES

  const toggle = (id: string) => {
    update(sid, s => {
      const cur = s.displayTitleIds ?? (s.displayTitleId ? [s.displayTitleId] : [])
      let next: string[]
      if (cur.includes(id)) next = cur.filter(x => x !== id)
      else { if (cur.length >= MAX_DISPLAY_TITLES) return s; next = [...cur, id] }
      return { ...s, displayTitleIds: next, displayTitleId: next[0] }
    })
  }
  const clearAll = () => update(sid, s => ({ ...s, displayTitleIds: [], displayTitleId: undefined }))

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 className="card-title">⭐ 내 호칭 보관함</h2>
        <span className="chip chip--blue">{owned.length}개 보유</span>
        <span className={`chip ${reachedCap ? 'chip--pink' : 'chip--green'}`}>노출 {displayIds.length} / {MAX_DISPLAY_TITLES}</span>
        {displayIds.length > 0 && <button onClick={clearAll} className="btn btn--ghost" style={{ marginLeft: 'auto' }}>노출 해제</button>}
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>
        노출할 호칭을 최대 <b>{MAX_DISPLAY_TITLES}개</b> 골라요. 친구가 내 프로필을 누르면 함께 보여요.
      </p>

      {owned.length === 0 ? (
        <div className="card--leaf" style={{ borderRadius: 'var(--r-md)', padding: 16, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          아직 받은 호칭이 없어요. 선생님이 미션·아고라에 호칭을 보상으로 걸면, 완수 시 여기에 모여요.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 12 }}>
          {owned.map(t => {
            const on = isDisplayed(t.id)
            const cantPick = !on && reachedCap
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                disabled={cantPick}
                style={{
                  position: 'relative', padding: 14, textAlign: 'center', cursor: cantPick ? 'not-allowed' : 'pointer',
                  border: `2px solid ${on ? 'var(--green)' : 'var(--border-strong)'}`, borderRadius: 'var(--r-lg)',
                  background: chipColor(t.color), opacity: cantPick ? 0.5 : 1,
                }}
              >
                {on && <span style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'var(--green-btn)', color: '#fff', fontSize: 12, display: 'grid', placeItems: 'center' }}>✓</span>}
                <div style={{ fontSize: 32, marginBottom: 6 }}>{t.icon}</div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 15, color: 'var(--text)', lineHeight: 1.25 }}>{t.name}</div>
                {t.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>{t.description}</div>}
                <div style={{ marginTop: 8, fontSize: 10, fontFamily: 'var(--font-title)', color: 'var(--muted-2)' }}>{on ? '노출 중' : cantPick ? '슬롯 가득' : '눌러서 노출'}</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
