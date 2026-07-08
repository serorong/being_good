import { useRef, useState } from 'react'
import { useAuth } from '../auth'
import { SANCTUARY_THEMES, SHOP_ITEMS, levelFromXp, rollDailyOffering, todayStr, type SanctuaryTheme } from '../data'
import { claimDailyOffering, useRoster, useStudentStateMap } from '../state'
import type { SanctuaryPlacement } from '../types'
import Sprite from '../components/Sprite'
import PixelEditor from '../components/PixelEditor'
import { PixelIcon } from '../pixel-art'

const SANCTUARY_W = 920
const SANCTUARY_H = 480

export default function SanctuaryPage() {
  const [auth] = useAuth()
  const { get, update } = useStudentStateMap()
  const MOCK_STUDENTS = useRoster()

  const sid = auth?.role === 'student' ? auth.studentId : MOCK_STUDENTS[0]?.id
  const student = MOCK_STUDENTS.find(s => s.id === sid) ?? MOCK_STUDENTS[0]
  const state = sid ? get(sid) : null
  const placements = state?.sanctuary ?? []
  const [editorOpen, setEditorOpen] = useState(false)

  const xp = state?.xp ?? 0
  const lvl = levelFromXp(xp)
  const today = todayStr()
  const claimedToday = state?.lastOfferingAt === today
  const theme = SANCTUARY_THEMES.find(t => t.id === (state?.currentTheme ?? 'paper')) ?? SANCTUARY_THEMES[0]

  const saveAvatar = (dataUrl: string) => {
    if (!sid) return
    update(sid, s => ({ ...s, customAvatar: dataUrl }))
    setEditorOpen(false)
  }
  const clearAvatar = () => {
    if (!sid) return
    if (!confirm('내가 그린 아바타를 지우고 기본 아바타로 돌아갈까요?')) return
    update(sid, s => { const { customAvatar, ...rest } = s; return rest as typeof s })
  }

  const setTheme = (themeId: string) => {
    if (!sid) return
    update(sid, s => ({ ...s, currentTheme: themeId }))
  }

  const claimOffering = () => {
    if (!sid) return
    if (claimedToday) { alert('오늘은 이미 신의 제물을 받았어요.'); return }
    const itemId = rollDailyOffering()
    const ok = claimDailyOffering(sid, today, itemId)
    if (!ok) return
    const item = SHOP_ITEMS.find(s => s.id === itemId)
    alert(`🪔 신의 제물을 받았어요!\n\n${item?.icon ?? '✨'} ${item?.name ?? itemId}\n\n「내 소품」에서 신전에 배치할 수 있어요.`)
  }

  const placeFromInventory = (itemId: string) => {
    if (!sid) return
    const instanceId = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    update(sid, s => ({
      ...s,
      sanctuary: [
        ...s.sanctuary,
        {
          instanceId,
          itemId,
          x: 120 + Math.floor(Math.random() * (SANCTUARY_W - 240)),
          y: 200 + Math.floor(Math.random() * (SANCTUARY_H - 280)),
        },
      ],
    }))
  }

  const setItemPos = (instanceId: string, x: number, y: number) => {
    if (!sid) return
    update(sid, s => ({
      ...s,
      sanctuary: s.sanctuary.map(p => (p.instanceId === instanceId ? { ...p, x, y } : p)),
    }))
  }

  const removeItem = (instanceId: string) => {
    if (!sid) return
    update(sid, s => ({ ...s, sanctuary: s.sanctuary.filter(p => p.instanceId !== instanceId) }))
  }

  const shuffle = () => {
    if (!sid) return
    update(sid, s => ({
      ...s,
      sanctuary: s.sanctuary.map(p => ({
        ...p,
        x: 60 + Math.floor(Math.random() * (SANCTUARY_W - 160)),
        y: 60 + Math.floor(Math.random() * (SANCTUARY_H - 160)),
      })),
    }))
  }

  return (
    <div className="space-y-5">
      <section className="card-temple p-6 sm:p-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative">
            <Sprite seed={student.avatarSeed} size={72} customSrc={state?.customAvatar} />
            {state?.customAvatar && (
              <span className="absolute -top-1 -right-1 chip text-[10px] px-1.5 py-0.5">
                <PixelIcon kind="feather" size={10} /> 직접 그림
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="chip mb-2"><PixelIcon kind="shrine" size={12} /> 자신의 신전</div>
            <h1 className="font-display text-2xl font-bold gold-text truncate">{student.heroName}의 신전</h1>
            <p className="text-sm text-moss-deep/80 mt-1">소품을 끌어 배치하고, 픽셀 아바타도 직접 그려보세요. (더블클릭: 소품 치우기)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setEditorOpen(true)} className="btn-honey text-sm">
            <PixelIcon kind="feather" size={14} /> 픽셀 아바타 그리기
          </button>
          {state?.customAvatar && (
            <button onClick={clearAvatar} className="btn-ghost text-sm">기본 아바타로</button>
          )}
          <button onClick={shuffle} className="btn-ghost text-sm">🎲 위치 섞기</button>
        </div>
      </section>

      {editorOpen && (
        <div
          onClick={() => setEditorOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-3 sm:p-6 overflow-y-auto"
        >
          <div onClick={e => e.stopPropagation()} className="card-temple p-4 sm:p-6 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold gold-text flex items-center gap-2">
                <PixelIcon kind="feather" size={18} /> 픽셀 아바타 그리기
              </h2>
              <button onClick={() => setEditorOpen(false)} className="btn-ghost text-xs">✕ 닫기</button>
            </div>
            <PixelEditor
              size={24}
              initialDataUrl={state?.customAvatar}
              onSave={saveAvatar}
              onCancel={() => setEditorOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 매일 1회 신의 제물 */}
      <section className="card-temple p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="chip mb-2"><PixelIcon kind="star" size={12} /> 매일 1회 · 신의 제물</div>
          <p className="text-sm text-moss-deep/80">하루에 한 번 신께서 작은 선물을 내려주십니다. 무엇을 받을지는 아무도 모릅니다.</p>
        </div>
        <button onClick={claimOffering} disabled={claimedToday} className="btn-honey disabled:opacity-50 disabled:cursor-not-allowed">
          <PixelIcon kind="star" size={14} /> {claimedToday ? '오늘 받음' : '제물 받기'}
        </button>
      </section>

      {/* 신전 테마 */}
      <section className="card-temple p-5">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="chip"><PixelIcon kind="shrine" size={12} /> 신전 테마</span>
          <span className="chip chip-blue text-[10px]">Lv.{lvl.level}</span>
          <span className="text-xs text-moss-deep/70">레벨이 오를수록 새 테마가 잠금해제돼요.</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SANCTUARY_THEMES.map(t => {
            const unlocked = lvl.level >= t.minLevel
            const active = theme.id === t.id
            return (
              <button
                key={t.id}
                disabled={!unlocked}
                onClick={() => setTheme(t.id)}
                className={`p-2 border-2 border-moss-darkest text-left transition ${
                  active ? 'bg-gold-200 shadow-pixel-sm' :
                  unlocked ? 'bg-white hover:bg-moss-mist' : 'bg-moss-paper/40 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="h-10 border-2 border-moss-darkest mb-1.5" style={{ background: t.background }} />
                <div className="font-display text-xs sm:text-sm text-moss-darkest">{t.name}</div>
                <div className="text-[10px] text-moss-deep/70 mt-0.5 leading-tight">
                  {unlocked ? t.description : `Lv.${t.minLevel} 잠금해제`}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 신전 무대 */}
      <div className="-mx-3 sm:mx-0 overflow-x-auto px-3 sm:px-0">
        <SanctuaryStage
          placements={placements}
          avatarSeed={student.avatarSeed}
          customAvatar={state?.customAvatar}
          theme={theme}
          onMove={setItemPos}
          onRemove={removeItem}
        />
      </div>

      {/* 내 소품 인벤토리 */}
      <section className="card-temple p-5">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="chip"><PixelIcon kind="bag" size={12} /> 내 소품</span>
          <span className="chip chip-green text-[10px]">{state?.ownedItemIds.length ?? 0}개 보유</span>
          <span className="text-xs text-moss-deep/70">클릭하면 신전에 놓여요. 더블클릭으로 치울 수 있어요.</span>
        </div>
        {(!state?.ownedItemIds || state.ownedItemIds.length === 0) ? (
          <p className="text-sm text-moss-deep/70">
            아직 소품이 없어요. 매일 「신의 제물」을 받거나, 레벨업으로 새 소품이 잠금해제돼요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {state.ownedItemIds.map((id, i) => {
              const item = SHOP_ITEMS.find(s => s.id === id)
              if (!item) return null
              return (
                <button
                  key={`${id}-${i}`}
                  onClick={() => placeFromInventory(id)}
                  className="px-3 py-2 bg-white border-2 border-moss-darkest hover:bg-moss-mist font-display text-sm shadow-pixel-sm hover:shadow-pixel"
                  title="신전에 놓기"
                >
                  <span className="mr-1">{item.icon}</span> {item.name}
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function SanctuaryStage({
  placements,
  avatarSeed,
  customAvatar,
  theme,
  onMove,
  onRemove,
}: {
  placements: SanctuaryPlacement[]
  avatarSeed: string
  customAvatar?: string
  theme: SanctuaryTheme
  onMove: (id: string, x: number, y: number) => void
  onRemove: (id: string) => void
}) {
  return (
    <section
      className="relative overflow-hidden flex-shrink-0"
      style={{
        width: SANCTUARY_W,
        minWidth: SANCTUARY_W,
        height: SANCTUARY_H,
        margin: '0 auto',
        background: theme.background,
        outline: '3px solid #0d2419',
        outlineOffset: '-3px',
        boxShadow: '4px 4px 0 0 #0d2419',
      }}
    >
      <TempleBackdrop />

      {/* 아바타 (중앙) */}
      <div
        className="absolute pointer-events-none"
        style={{ left: '50%', bottom: 64, transform: 'translateX(-50%)' }}
      >
        <Sprite seed={avatarSeed} size={140} customSrc={customAvatar} />
      </div>

      {/* 소품들 */}
      {placements.map(p => (
        <DraggableItem
          key={p.instanceId}
          placement={p}
          onMove={onMove}
          onRemove={onRemove}
        />
      ))}
    </section>
  )
}

function TempleBackdrop() {
  return (
    <svg
      viewBox={`0 0 ${SANCTUARY_W} ${SANCTUARY_H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 pointer-events-none"
    >
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fffdf6" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#fdf6dc" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#fdf6dc" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="col" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#fbf5e6" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e6d6a8" />
        </linearGradient>
      </defs>

      {/* 하늘 */}
      <rect x="0" y="0" width={SANCTUARY_W} height={SANCTUARY_H * 0.45} fill="url(#sky)" />

      {/* 페디먼트(지붕) */}
      <polygon
        points={`160,140 760,140 460,40`}
        fill="#fbf5e6"
        stroke="#b8862a"
        strokeWidth="1.5"
      />
      <rect x="150" y="140" width="620" height="14" fill="#d4a83f" stroke="#8a6420" />
      <rect x="160" y="154" width="600" height="6" fill="#b8862a" />

      {/* 기둥 */}
      {[200, 320, 440, 560, 680].map((cx, i) => (
        <g key={i}>
          <rect x={cx} y="160" width="34" height="220" fill="url(#col)" stroke="#b8862a" strokeWidth="0.8" />
          <rect x={cx - 4} y="156" width="42" height="6" fill="#d4a83f" />
          <rect x={cx - 4} y="378" width="42" height="6" fill="#d4a83f" />
        </g>
      ))}

      {/* 바닥 */}
      <rect x="0" y={SANCTUARY_H - 96} width={SANCTUARY_W} height="96" fill="#ecdcae" />
      <rect x="0" y={SANCTUARY_H - 96} width={SANCTUARY_W} height="2" fill="#b8862a" opacity="0.4" />
      {/* 바닥 타일 라인 */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={i} x1={i * 100} y1={SANCTUARY_H - 96} x2={i * 100 - 60} y2={SANCTUARY_H} stroke="#b8862a" strokeOpacity="0.18" />
      ))}
    </svg>
  )
}

function DraggableItem({
  placement,
  onMove,
  onRemove,
}: {
  placement: SanctuaryPlacement
  onMove: (id: string, x: number, y: number) => void
  onRemove: (id: string) => void
}) {
  const item = SHOP_ITEMS.find(s => s.id === placement.itemId)
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({ startX: 0, startY: 0, baseX: placement.x, baseY: placement.y, active: false })

  if (!item) return null

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current!
    el.setPointerCapture(e.pointerId)
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: placement.x,
      baseY: placement.y,
      active: true,
    }
    el.style.cursor = 'grabbing'
    el.style.zIndex = '20'
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    const el = ref.current!
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    const x = Math.max(0, Math.min(SANCTUARY_W - 60, drag.current.baseX + dx))
    const y = Math.max(0, Math.min(SANCTUARY_H - 60, drag.current.baseY + dy))
    el.style.transform = `translate(${x}px, ${y}px)`
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    const el = ref.current!
    drag.current.active = false
    el.releasePointerCapture(e.pointerId)
    el.style.cursor = 'grab'
    el.style.zIndex = '10'
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    const x = Math.max(0, Math.min(SANCTUARY_W - 60, drag.current.baseX + dx))
    const y = Math.max(0, Math.min(SANCTUARY_H - 60, drag.current.baseY + dy))
    onMove(placement.instanceId, x, y)
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => onRemove(placement.instanceId)}
      title={`${item.name} (더블클릭하여 치우기)`}
      className="absolute top-0 left-0 grid place-items-center select-none transition hover:scale-110"
      style={{
        transform: `translate(${placement.x}px, ${placement.y}px)`,
        width: 56,
        height: 56,
        cursor: 'grab',
        zIndex: 10,
        touchAction: 'none',
        fontSize: 44,
        lineHeight: 1,
        filter: 'drop-shadow(0 3px 4px rgba(60,40,10,0.35)) drop-shadow(0 8px 8px rgba(60,40,10,0.18))',
      }}
    >
      <span style={{ display: 'block' }}>{item.icon}</span>
    </div>
  )
}
