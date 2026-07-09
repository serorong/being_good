import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { EMOTION_FOREST, todayStr } from '../data'
import { useCustomTitles, useNotices, useRoster, useStudentStateMap, effectiveCookies, lifetimeCookiesOf } from '../state'
import type { CustomTitle, DiaryEntry, ShopPurchase, Student, StudentState, TitleColor } from '../types'
import Sprite from '../components/Sprite'
import { MeanderBand, PixelIcon, OliveBranch } from '../pixel-art'
import { levelFromXp } from '../data'

type Sort = 'cookies' | 'today' | 'streak' | 'name'

export default function ClassDashboardPage() {
  const [auth] = useAuth()
  const [notices] = useNotices()
  const [titles] = useCustomTitles()
  const { map } = useStudentStateMap()
  const MOCK_STUDENTS = useRoster()

  const isTeacher = auth?.role === 'teacher'
  const me = auth?.role === 'student' && auth.studentId
    ? MOCK_STUDENTS.find(s => s.id === auth.studentId) ?? null
    : null

  const sortedNotices = useMemo(
    () => [...notices].sort((a, b) => b.postedAt.localeCompare(a.postedAt)),
    [notices]
  )

  const totals = useMemo(() => {
    // 누적(평생) 쿠키 — 상점에서 써도 줄어들지 않는 값의 합
    const cookies = MOCK_STUDENTS.reduce((a, s) => a + lifetimeCookiesOf(s.id, map), 0)
    return { cookies }
  }, [map, MOCK_STUDENTS])

  // 오늘 학생들이 일기에 적은 감정 단어 → 상위 그룹(예: '기쁨과 즐거움')으로 집계
  const todayEmotion = useMemo(() => {
    const today = todayStr()
    const wordToGroup = new Map<string, string>()
    for (const g of EMOTION_FOREST.positive) for (const w of g.words) wordToGroup.set(w, g.name)
    for (const g of EMOTION_FOREST.negative) for (const w of g.words) wordToGroup.set(w, g.name)

    const todaysDiaries: DiaryEntry[] = []
    for (const s of MOCK_STUDENTS) {
      const d = (map[s.id]?.diaries ?? []).find(d => d.date === today)
      if (d) todaysDiaries.push(d)
    }

    const groupCount = new Map<string, number>()
    for (const d of todaysDiaries) {
      const words = (d.emotions && d.emotions.length > 0) ? d.emotions : (d.emotion ? [d.emotion] : [])
      for (const w of words) {
        const g = wordToGroup.get(w)
        if (g) groupCount.set(g, (groupCount.get(g) ?? 0) + 1)
      }
    }

    if (todaysDiaries.length === 0 || groupCount.size === 0) {
      return { hasData: false as const, studentCount: todaysDiaries.length }
    }
    const sorted = [...groupCount.entries()].sort((a, b) => b[1] - a[1])
    return {
      hasData: true as const,
      groupName: sorted[0][0],
      groupCount: sorted[0][1],
      studentCount: todaysDiaries.length,
    }
  }, [map, MOCK_STUDENTS])

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <NoticeBoard notices={sortedNotices} />
        {isTeacher
          ? <TeacherShopActivity map={map} />
          : me ? <CookieBag student={me} map={map} /> : <div />}
      </div>

      <div className="flex items-center justify-center gap-3 select-none">
        <OliveBranch width={48} />
        <span className="font-display text-xs tracking-[0.3em] text-moss-deep">우리반 신탁</span>
        <OliveBranch flip width={48} />
      </div>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <TodayEmotionCard summary={todayEmotion} />
        </div>
        <SummaryCard icon="cookie" label="누적 쿠키" value={`${totals.cookies}`} hint="상점에서 써도 줄지 않는 평생 보상의 합" />
      </section>

      <ClassMotion map={map} titles={titles} myId={me?.id} />

      {isTeacher && (
        <TeacherStudentGrid map={map} titles={titles} myId={me?.id} />
      )}
    </div>
  )
}

/* ──────────────── 우리반 모션그래픽 — 자유 부유 + 벽/학생간 튕김 ──────────────── */
type Particle = { x: number; y: number; vx: number; vy: number }

function ClassMotion({ map, titles, myId }: { map: ReturnType<typeof useStudentStateMap>['map']; titles: CustomTitle[]; myId?: string }) {
  const MOCK_STUDENTS = useRoster()
  const [focusId, setFocusId] = useState<string | null>(null)

  const STAGE_H = 460
  const AVATAR_PX = 52              // 픽셀 박스 한 변 (대략)
  const RADIUS_PX = AVATAR_PX / 2

  const containerRef = useRef<HTMLDivElement>(null)
  const partsRef = useRef<Particle[]>([])
  const elsRef = useRef<Array<HTMLDivElement | null>>([])
  // 드래그 중인 학생 인덱스
  const dragRef = useRef<{ idx: number; startX: number; startY: number; dist: number } | null>(null)

  const n = MOCK_STUDENTS.length

  // 초기 위치/속도 (랜덤 흩뿌리기, 한 번만)
  if (partsRef.current.length !== n) {
    partsRef.current = MOCK_STUDENTS.map(() => {
      const angle = Math.random() * Math.PI * 2
      const speed = 18 + Math.random() * 26    // px/s
      return {
        x: 60 + Math.random() * 400,
        y: 60 + Math.random() * (STAGE_H - 120),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      }
    })
  }

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) // 초 단위, 50ms 캡
      last = now
      const container = containerRef.current
      const w = container?.clientWidth ?? 900
      const h = STAGE_H
      const parts = partsRef.current
      // 위치 갱신
      for (let i = 0; i < parts.length; i++) {
        if (dragRef.current?.idx === i) continue   // 드래그 중인 건 물리 비활성
        const p = parts[i]
        p.x += p.vx * dt
        p.y += p.vy * dt
        // 벽 튕김
        if (p.x < RADIUS_PX) { p.x = RADIUS_PX; p.vx = Math.abs(p.vx) }
        if (p.x > w - RADIUS_PX) { p.x = w - RADIUS_PX; p.vx = -Math.abs(p.vx) }
        if (p.y < RADIUS_PX) { p.y = RADIUS_PX; p.vy = Math.abs(p.vy) }
        if (p.y > h - RADIUS_PX) { p.y = h - RADIUS_PX; p.vy = -Math.abs(p.vy) }
      }
      // 학생끼리 충돌 (간단한 1D 탄성)
      const minDist = AVATAR_PX
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          if (dragRef.current?.idx === i || dragRef.current?.idx === j) continue
          const a = parts[i], b = parts[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const d2 = dx * dx + dy * dy
          if (d2 === 0 || d2 > minDist * minDist) continue
          const d = Math.sqrt(d2)
          const nx = dx / d, ny = dy / d
          const overlap = (minDist - d) / 2
          a.x -= nx * overlap; a.y -= ny * overlap
          b.x += nx * overlap; b.y += ny * overlap
          // 1D 탄성 충돌 (같은 질량)
          const va = a.vx * nx + a.vy * ny
          const vb = b.vx * nx + b.vy * ny
          a.vx += (vb - va) * nx; a.vy += (vb - va) * ny
          b.vx += (va - vb) * nx; b.vy += (va - vb) * ny
        }
      }
      // DOM 반영
      for (let i = 0; i < parts.length; i++) {
        const el = elsRef.current[i]
        if (!el) continue
        if (dragRef.current?.idx === i) continue  // 드래그 중인 건 별도 처리
        const p = parts[i]
        el.style.transform = `translate(${p.x - RADIUS_PX}px, ${p.y - RADIUS_PX}px)`
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [n])

  const DRAG_OPEN_PX = 24

  return (
    <section className="card-temple relative overflow-hidden" style={{ minHeight: STAGE_H }}>
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <span className="chip"><PixelIcon kind="shrine" size={12} /> 우리반 신탁</span>
        <span className="chip chip-green">자유롭게 부유 · 튕김 효과</span>
      </div>

      <div ref={containerRef} className="absolute inset-0" style={{ height: STAGE_H }}>
        {MOCK_STUDENTS.map((s, i) => {
          const st = map[s.id]
          const isMe = s.id === myId
          return (
            <div
              key={s.id}
              ref={el => { elsRef.current[i] = el }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: AVATAR_PX,
                height: AVATAR_PX,
                willChange: 'transform',
                zIndex: isMe ? 5 : 2,
              }}
            >
              <button
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                  dragRef.current = { idx: i, startX: e.clientX, startY: e.clientY, dist: 0 }
                  const el = elsRef.current[i]
                  if (el) el.style.zIndex = '30'
                }}
                onPointerMove={(e) => {
                  const d = dragRef.current
                  if (!d || d.idx !== i) return
                  const dx = e.clientX - d.startX
                  const dy = e.clientY - d.startY
                  d.dist = Math.sqrt(dx * dx + dy * dy)
                  // 시각적으로만 따라다님
                  const el = elsRef.current[i]
                  if (el) {
                    const p = partsRef.current[i]
                    el.style.transform = `translate(${p.x - RADIUS_PX + dx}px, ${p.y - RADIUS_PX + dy}px) scale(${1 + Math.min(1.4, d.dist / 60)})`
                  }
                }}
                onPointerUp={(e) => {
                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
                  const d = dragRef.current
                  dragRef.current = null
                  const el = elsRef.current[i]
                  if (el) {
                    el.style.zIndex = isMe ? '5' : '2'
                    // scale 초기화 (raf가 다음 프레임에 위치 다시 그림)
                    const p = partsRef.current[i]
                    el.style.transform = `translate(${p.x - RADIUS_PX}px, ${p.y - RADIUS_PX}px)`
                  }
                  if (!d) return
                  if (d.dist >= DRAG_OPEN_PX) setFocusId(s.id)
                  else setFocusId(focusId === s.id ? null : s.id)
                }}
                onPointerCancel={() => { dragRef.current = null }}
                className={`block pixel p-0.5 touch-none ${isMe ? 'bg-gold-200' : 'bg-white/85'}`}
                style={{
                  border: '2px solid #0d2419',
                  boxShadow: '2px 2px 0 0 #0d2419',
                  cursor: 'grab',
                  transition: 'transform 80ms ease-out',
                }}
                aria-label={`${s.heroName} 프로필 (눌러서 확대)`}
              >
                <Sprite seed={s.avatarSeed} size={AVATAR_PX - 4} customSrc={st?.customAvatar} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="absolute bottom-2 right-3 text-[10px] text-moss-deep/60 font-display tracking-wider z-20 pointer-events-none">
        ※ 친구의 픽셀을 누르거나 살짝 끌면 크게 펼쳐져요. 서로 부딪치면 튕겨요.
      </div>

      {focusId && (
        <ProfileFocus
          student={MOCK_STUDENTS.find(s => s.id === focusId)!}
          state={map[focusId]}
          titles={titles}
          isMe={focusId === myId}
          cookies={effectiveCookies(focusId, map)}
          onClose={() => setFocusId(null)}
        />
      )}
    </section>
  )
}

/* ────────── 풀스크린 프로필 카드 ────────── */
function ProfileFocus({
  student, state, titles, isMe, cookies, onClose,
}: {
  student: Student
  state?: StudentState
  titles: CustomTitle[]
  isMe: boolean
  cookies: number
  onClose: () => void
}) {
  const titleList = displayTitles(student, state, titles)
  const xp = state?.xp ?? 0
  const lvl = levelFromXp(xp)
  const xpPct = lvl.need > 0 ? Math.round((lvl.into / lvl.need) * 100) : 0
  const msg = state?.statusMessage?.trim()
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm grid place-items-center p-4 sm:p-6"
      style={{ animation: 'firefly-glow 1s ease-out' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card-temple p-5 sm:p-7 w-full max-w-md"
        style={{ animation: 'firefly-glow 0.45s ease-out' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="chip"><PixelIcon kind="shrine" size={12} /> 우리반 친구</span>
          <button onClick={onClose} className="btn-ghost text-xs px-2 py-1">✕ 닫기</button>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="pixel p-1 bg-white"
            style={{
              border: '3px solid #0d2419',
              outlineOffset: '-3px',
              boxShadow: '3px 3px 0 0 #0d2419',
            }}
          >
            <Sprite seed={student.avatarSeed} size={120} customSrc={state?.customAvatar} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl font-bold gold-text truncate">
              {student.heroName}{isMe && <span className="text-moss-deep/70 text-sm ml-2">(나)</span>}
            </div>
            <div className="text-xs text-moss-deep/70 mt-0.5 truncate">{student.realName}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {titleList.map((t, i) => (
                <span key={i} className={`${chipForColor(t.color)} text-[11px]`}>{t.icon} {t.name}</span>
              ))}
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-moss-deep">
                <span className="font-display">Lv.{lvl.level}</span>
                <span>{lvl.into} / {lvl.need} XP</span>
              </div>
              <div className="progress-bar mt-1"><div style={{ width: `${xpPct}%` }} /></div>
            </div>
          </div>
        </div>

        <div className="rune-divider my-4" />

        <div className="font-display text-sm text-moss-deep mb-1.5 flex items-center gap-1">
          <PixelIcon kind="chat" size={12} /> 한마디
        </div>
        <div className="p-3 bg-moss-paper border-2 border-moss-darkest text-sm text-moss-darkest whitespace-pre-wrap break-words min-h-[3.5em]">
          {msg ? `“${msg}”` : <span className="text-moss-deep/60">아직 한마디가 없어요.</span>}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat icon="cookie" label="쿠키" value={cookies} />
          <Stat icon="sword"  label="미션"  value={student.missionsDone} />
          <Stat icon="sun"    label="연속"  value={`${student.streak}일`} />
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: 'cookie' | 'sword' | 'sun' | 'leaf'; label: string; value: number | string }) {
  return (
    <div className="card-soft p-2">
      <div className="text-[10px] text-moss-deep/70 flex items-center justify-center gap-1">
        <PixelIcon kind={icon} size={10} /> {label}
      </div>
      <div className="font-display text-lg font-bold text-moss-darkest">{value}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   쿠키 보따리 (학생용) — 레벨/XP/누적/잔액
   ───────────────────────────────────────────── */
function CookieBag({ student, map }: { student: Student; map: ReturnType<typeof useStudentStateMap>['map'] }) {
  const state = map[student.id]
  const xp = state?.xp ?? 0
  const lvl = levelFromXp(xp)
  const pct = lvl.need > 0 ? Math.round((lvl.into / lvl.need) * 100) : 100
  const current = effectiveCookies(student.id, map)
  const lifetime = lifetimeCookiesOf(student.id, map)
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <section className="card-temple p-6 sm:p-7 relative">
      <MeanderBand height={8} color="#0d2419" bg="#f7f1de" />

      <div className="flex items-center gap-2 mt-4 mb-3 flex-wrap">
        <PixelIcon kind="cookie" size={22} />
        <h2 className="font-display text-2xl sm:text-3xl font-bold gold-text">쿠키 보따리</h2>
        <span className="chip chip-blue ml-2">
          <PixelIcon kind="star" size={12} /> Lv.{lvl.level}
        </span>
        <button
          onClick={() => setInfoOpen(true)}
          aria-label="레벨/경험치 기준 설명"
          className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-full bg-moss-paper border border-moss-darkest/30 text-moss-deep hover:bg-moss-mist font-display"
        >
          i
        </button>
      </div>

      {/* 레벨 + XP 진행 */}
      <div className="mt-1">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="font-display text-xl text-moss-darkest">레벨 {lvl.level}</div>
          <div className="text-xs text-moss-deep/70">
            <b>{lvl.into}</b> / {lvl.need} XP
          </div>
        </div>
        <div className="progress-bar"><div style={{ width: `${pct}%` }} /></div>
        <div className="text-[11px] text-moss-deep/70 mt-1">
          다음 레벨까지 <b>{lvl.need - lvl.into} XP</b> 남았어요.
        </div>
      </div>

      {/* 쿠키 수치 */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="card-soft p-4">
          <div className="text-[11px] text-moss-deep/70 flex items-center gap-1">
            <PixelIcon kind="cookie" size={12} /> 현재 쿠키
          </div>
          <div className="font-display text-3xl font-bold gold-text mt-1 leading-none">{current}</div>
          <div className="text-[11px] text-moss-deep/70 mt-1">상점에서 사용 가능</div>
        </div>
        <div className="card-soft p-4">
          <div className="text-[11px] text-moss-deep/70 flex items-center gap-1">
            <PixelIcon kind="star" size={12} /> 누적 쿠키
          </div>
          <div className="font-display text-3xl font-bold honey-text mt-1 leading-none">{lifetime}</div>
          <div className="text-[11px] text-moss-deep/70 mt-1">평생 모은 쿠키</div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Link to="/app/shop" className="btn-gold text-sm">
          <PixelIcon kind="bag" size={14} /> 상점으로
        </Link>
      </div>

      {infoOpen && <LevelXpInfoModal onClose={() => setInfoOpen(false)} />}
    </section>
  )
}

/* ─────────────────────────────────────────────
   레벨/XP 기준 설명 모달
   ───────────────────────────────────────────── */
function LevelXpInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm grid place-items-center p-4"
    >
      <div onClick={e => e.stopPropagation()} className="card-temple p-6 sm:p-7 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold gold-text flex items-center gap-2">
            <PixelIcon kind="star" size={16} /> 레벨 · 경험치 안내
          </h2>
          <button onClick={onClose} className="btn-ghost text-xs px-2 py-1">✕ 닫기</button>
        </div>

        <div className="space-y-3 text-sm text-moss-darkest">
          <p>
            매일 신탁의 미션을 완수할 때마다 <b>경험치(XP)</b>가 쌓이고, 일정량을 모으면 <b>레벨</b>이 올라가요.
          </p>

          <div className="card-soft p-3">
            <div className="font-display text-xs text-moss-deep mb-1">레벨 공식</div>
            <div className="text-[13px]">
              다음 레벨까지 필요한 XP = <b>50 + 레벨 × 30</b>
              <div className="text-[11px] text-moss-deep/70 mt-1">
                예: Lv.1→2 = 80 XP / Lv.5→6 = 200 XP / Lv.10→11 = 350 XP
              </div>
            </div>
          </div>

          <div className="card-soft p-3">
            <div className="font-display text-xs text-moss-deep mb-1">XP를 얻는 방법</div>
            <ul className="text-[13px] space-y-1">
              <li>• 두루마리 점수당 <b>+5 XP</b>, 만점 보너스 <b>+20 XP</b></li>
              <li>• 감정일기 작성 <b>+10 XP</b> <span className="text-moss-deep/70">(하루 한 번)</span></li>
              <li>• 미션 완료 <b>+30 XP</b></li>
            </ul>
          </div>

          <div className="card-soft p-3">
            <div className="font-display text-xs text-moss-deep mb-1">쿠키 적립</div>
            <ul className="text-[13px] space-y-1">
              <li>• 두루마리 9점 이하 <b>🍪 +1</b></li>
              <li>• 두루마리 10점 만점 <b>🍪 +2</b></li>
              <li>• 미션 완료 시 미션마다 정해진 보상 쿠키</li>
            </ul>
            <div className="text-[11px] text-moss-deep/70 mt-2">
              쿠키 <b>200개</b>가 모이면 <b>상점</b>에서 보상으로 교환할 수 있어요. (현재 쿠키만 차감, 누적은 그대로 유지)
            </div>
          </div>

          <div className="card-soft p-3">
            <div className="font-display text-xs text-moss-deep mb-1">레벨업 보상</div>
            <div className="text-[13px]">
              레벨이 오르면 <b>자신의 신전</b>에 새 테마와 소품이 자동으로 잠금 해제돼요.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   교사용 상점 활동 (어떤 학생이 무엇을 언제 샀는지)
   ───────────────────────────────────────────── */
function TeacherShopActivity({ map }: { map: ReturnType<typeof useStudentStateMap>['map'] }) {
  const MOCK_STUDENTS = useRoster()
  const rows = useMemo(() => {
    const out: Array<ShopPurchase & { studentId: string; heroName: string }> = []
    MOCK_STUDENTS.forEach(s => {
      const purchases = map[s.id]?.purchases ?? []
      purchases.forEach(p => out.push({ ...p, studentId: s.id, heroName: s.heroName }))
    })
    out.sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
    return out
  }, [map, MOCK_STUDENTS])

  return (
    <section className="card-temple p-6 sm:p-7">
      <MeanderBand height={8} color="#0d2419" bg="#f7f1de" />
      <div className="flex items-center gap-2 mt-4 mb-3 flex-wrap">
        <PixelIcon kind="bag" size={22} />
        <h2 className="font-display text-2xl sm:text-3xl font-bold gold-text">상점 활동</h2>
        <span className="chip chip-blue ml-2">총 {rows.length}건</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-moss-deep/70">
          아직 상점 구매 내역이 없어요. 학생이 쿠키 200개를 모으면 상점에서 보상을 교환할 수 있어요.
        </p>
      ) : (
        <div className="max-h-[280px] overflow-y-auto pr-1 -mr-1 space-y-2">
          {rows.map(r => (
            <div key={r.id} className="card-soft p-2.5 flex items-center gap-2.5">
              <div className="text-xl flex-shrink-0">{r.icon ?? '🎁'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-moss-darkest truncate">
                  <b>{r.heroName}</b> · {r.itemName}
                </div>
                <div className="text-[11px] text-moss-deep/70">
                  {new Date(r.purchasedAt).toLocaleString('ko-KR', {
                    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
              <div className="chip chip-rose text-[11px] flex-shrink-0">−🍪 {r.cost}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* ------------------ 알림장 ------------------ */
function NoticeBoard({ notices }: { notices: ReturnType<typeof useNotices>[0] }) {
  // 최근 2개까지 노출 (notices는 이미 최신순 정렬돼 들어옴)
  const recent = notices.slice(0, 2)
  return (
    <section className="card-temple p-6 sm:p-7 relative overflow-hidden">
      <MeanderBand height={8} color="#0d2419" bg="#f7f1de" />
      <div className="flex items-center gap-2 mt-4 mb-3 flex-wrap">
        <PixelIcon kind="scroll" size={22} />
        <h2 className="font-display text-2xl sm:text-3xl font-bold gold-text">알림장</h2>
        <span className="chip chip-blue ml-2"><PixelIcon kind="shrine" size={12} /> 신의반</span>
        <span className="chip chip-green">
          <PixelIcon kind="sun" size={12} /> {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
        </span>
      </div>
      {recent.length === 0 ? (
        <div className="text-ink-500 py-4">
          <div className="font-display text-lg text-ink-700 mb-1">아직 게시된 알림장이 없습니다.</div>
          <p className="text-sm">선생님이 <b>학급관리</b>에서 알림장을 작성하면 이곳에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recent.map(notice => (
            <article key={notice.id} className="border-l-4 border-gold-300 pl-4 py-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="font-display font-bold text-ink-900 text-lg">{notice.title}</h3>
                <span className="text-xs text-ink-500">
                  {new Date(notice.postedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                </span>
                <span className="text-xs text-ink-300">· {notice.author}</span>
              </div>
              <p className="text-sm text-ink-700 mt-1.5 whitespace-pre-wrap leading-relaxed">{notice.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function SummaryCard({ icon, label, value, hint }: { icon: 'leaf' | 'sword' | 'cookie' | 'shrine' | 'scroll'; label: string; value: string; hint: string }) {
  return (
    <div className="card-temple p-5">
      <div className="flex items-center gap-2 text-moss-deep text-xs font-display tracking-wide">
        <PixelIcon kind={icon} size={14} />
        <span>{label}</span>
      </div>
      <div className="font-display text-3xl font-bold gold-text mt-1">{value}</div>
      <div className="text-xs text-moss-deep/70 mt-1">{hint}</div>
    </div>
  )
}

function TodayEmotionCard({ summary }: {
  summary: { hasData: false; studentCount: number } | { hasData: true; groupName: string; groupCount: number; studentCount: number }
}) {
  return (
    <div className="card-temple p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 text-moss-deep text-xs font-display tracking-wide">
        <PixelIcon kind="leaf" size={14} />
        <span>오늘 우리반 감정</span>
      </div>
      {summary.hasData ? (
        <>
          <div className="mt-2 font-display text-lg sm:text-xl font-bold text-moss-darkest leading-snug">
            우리반의 주요 감정은 <span className="gold-text">「{summary.groupName}」</span> 이에요.
          </div>
          <div className="text-xs text-moss-deep/70 mt-2">
            오늘 {summary.studentCount}명의 일기에서 가장 많이 나온 감정 묶음이에요 (그룹 응답 {summary.groupCount}회).
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 font-display text-base sm:text-lg font-bold text-moss-deep/80 leading-snug">
            오늘은 아직 감정 일기가 모이지 않았어요.
          </div>
          <div className="text-xs text-moss-deep/70 mt-2">
            학생들이 「감정일기」를 적으면 가장 많은 감정 묶음이 여기에 표시돼요.
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------ 학생 그리드 (교사 전용) ------------------ */
function TeacherStudentGrid({ map, titles, myId }: { map: ReturnType<typeof useStudentStateMap>['map']; titles: CustomTitle[]; myId?: string }) {
  const [sort, setSort] = useState<Sort>('today')
  const [query, setQuery] = useState('')
  const MOCK_STUDENTS = useRoster()

  const students = useMemo(() => {
    const filtered = MOCK_STUDENTS.filter(s =>
      !query.trim() ||
      s.heroName.includes(query) ||
      s.realName.includes(query) ||
      s.title.includes(query)
    )
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'cookies': return effectiveCookies(b.id, map) - effectiveCookies(a.id, map)
        case 'today':   return b.todayScore - a.todayScore
        case 'streak':  return b.streak - a.streak
        case 'name':    return a.heroName.localeCompare(b.heroName)
      }
    })
  }, [query, sort, map, MOCK_STUDENTS])

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">우리반 용사들</h2>
          <p className="text-sm text-ink-500">아바타 · 호칭 · 오늘 미션을 한눈에 (교사 전용 뷰)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="🔎 이름·호칭 검색"
            className="px-3 py-2 text-sm rounded-full bg-white border border-gold-200/60 outline-none focus:border-gold-300"
          />
          <div className="flex items-center gap-1 p-1 rounded-full bg-cream-200/60 border border-gold-200/40">
            {([['today','오늘'],['cookies','쿠키'],['streak','연속'],['name','이름']] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-display transition ${sort === k ? 'bg-white shadow-temple text-ink-900' : 'text-ink-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map(s => (
          <StudentCard
            key={s.id}
            s={s}
            state={map[s.id]}
            titles={titles}
            highlighted={myId === s.id}
            cookies={effectiveCookies(s.id, map)}
          />
        ))}
      </section>
    </>
  )
}

function chipForColor(c?: TitleColor) {
  return c === 'blue'  ? 'chip chip-blue'
    : c === 'green' ? 'chip chip-green'
    : c === 'rose'  ? 'chip chip-rose'
    : 'chip'
}

function displayTitle(s: Student, state: StudentState | undefined, titles: CustomTitle[]) {
  const arr = displayTitles(s, state, titles)
  return arr[0]
}

function displayTitles(
  s: Student, state: StudentState | undefined, titles: CustomTitle[]
): Array<{ name: string; color: TitleColor; icon: string }> {
  const ids: string[] = state?.displayTitleIds
    ?? (state?.displayTitleId ? [state.displayTitleId] : [])
  const picked = ids.map(id => titles.find(t => t.id === id)).filter(Boolean) as CustomTitle[]
  if (picked.length > 0) {
    return picked.slice(0, 3).map(t => ({ name: t.name, color: t.color, icon: t.icon }))
  }
  return [{ name: s.title, color: s.titleColor ?? 'gold', icon: '🎖️' }]
}

function StudentCard({ s, state, titles, highlighted, cookies }: { s: Student; state?: StudentState; titles: CustomTitle[]; highlighted?: boolean; cookies: number }) {
  const t = state?.missions.find(m => m.date === todayStr())
  const todayScore = t ? Object.values(t.scores).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0 : s.todayScore
  const pct = Math.min(100, Math.round(((todayScore ?? 0) / 10) * 100))
  const titleList = displayTitles(s, state, titles)

  return (
    <div className={`card-temple p-5 relative overflow-hidden ${highlighted ? 'ring-2 ring-gold-300' : ''}`}>
      {highlighted && (
        <span className="absolute top-3 right-3 chip chip-rose text-[10px]">✦ 나</span>
      )}
      <div className="flex items-start gap-3">
        <Sprite seed={s.avatarSeed} size={88} customSrc={state?.customAvatar} />
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg font-bold text-ink-900 truncate">
            {s.heroName}
          </div>
          <div className="text-xs text-ink-500 mb-1.5">{s.realName} · Lv.{s.level}</div>
          <div className="flex flex-wrap gap-1.5">
            {titleList.map((t, i) => (
              <span key={i} className={`${chipForColor(t.color)} text-[10px]`}>{t.icon} {t.name}</span>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 progress-bar">
              <div style={{ width: `${pct}%` }} />
            </div>
            <div className="font-display text-sm text-ink-700 whitespace-nowrap">
              {todayScore}<span className="text-ink-300">/10</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-ink-500">
            <span>🍪 {cookies}</span>
            <span>🔥 {s.streak}일</span>
            <span>⚔️ {s.missionsDone}회</span>
          </div>
        </div>
      </div>
    </div>
  )
}

