import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useRoster, useStudentStateMap, effectiveCookies, lifetimeCookiesOf, useDailyFeature } from '../state'
import { avatarUrl, beadSrc, emotionCategory, emotionCategoryOf, type EmotionCatKey } from '../data'

export default function HomePage() {
  const [auth] = useAuth()
  const { map } = useStudentStateMap()
  const roster = useRoster()
  const nav = useNavigate()
  const [picked, setPicked] = useState<EmotionCatKey | null>(null)

  const feature = useDailyFeature()

  const me = auth?.role === 'student' && auth.studentId
    ? roster.find(s => s.id === auth.studentId)
    : null
  const st = me ? map[me.id] : undefined
  const myCookies = me ? effectiveCookies(me.id, map) : 0
  const myAvatar = me ? (st?.customAvatar || avatarUrl(me.avatarSeed)) : '/assets/logo_mascot.png'
  const myName = me?.heroName ?? (auth?.role === 'teacher' ? '선생님' : '친구')

  // 우리반 전체 누적 쿠키 합
  const classTotal = useMemo(() => roster.reduce((a, s) => a + lifetimeCookiesOf(s.id, map), 0), [roster, map])

  // 일기 1개당 구슬 1개. 병이 꽉 차면 가장 오래된 것부터 제거(FIFO).
  const MAX_BEADS = 24
  const beadKeys = useMemo<EmotionCatKey[]>(() => {
    const out: EmotionCatKey[] = []
    const diaries = [...(st?.diaries ?? [])].sort((a, b) => a.date.localeCompare(b.date))
    for (const d of diaries) {
      let k = d.beadKey as EmotionCatKey | undefined
      if (!k) {
        const words = d.emotions && d.emotions.length > 0 ? d.emotions : (d.emotion ? [d.emotion] : [])
        for (const w of words) { const c = emotionCategoryOf(w); if (c) { k = c; break } }
      }
      if (k) out.push(k)
    }
    return out.slice(-MAX_BEADS)
  }, [st])

  const pickedCount = picked ? beadKeys.filter(k => k === picked).length : 0

  const latestReply = useMemo(() => {
    const withFb = (st?.diaries ?? []).filter(d => d.teacherFeedback?.trim())
    return withFb.sort((a, b) => (b.feedbackAt ?? b.date).localeCompare(a.feedbackAt ?? a.date))[0] ?? null
  }, [st])

  // 일력 그림의 평균색 → hero 배경 (파스텔로 부드럽게)
  const [heroBg, setHeroBg] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (!feature?.sketchUrl) { setHeroBg(undefined); return }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      try {
        const cv = document.createElement('canvas')
        cv.width = 24; cv.height = 24
        const cx = cv.getContext('2d'); if (!cx) return
        cx.drawImage(img, 0, 0, 24, 24)
        const d = cx.getImageData(0, 0, 24, 24).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
        r /= n; g /= n; b /= n
        const mix = (c: number) => Math.round(c * 0.45 + 255 * 0.55)
        setHeroBg(`rgb(${mix(r)},${mix(g)},${mix(b)})`)
      } catch { /* noop */ }
    }
    img.src = feature.sketchUrl
    return () => { cancelled = true }
  }, [feature?.sketchUrl])

  const now = new Date()
  const wdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const calMonth = `${now.getMonth() + 1}월`
  const calDay = String(now.getDate())
  const calWday = wdays[now.getDay()]

  const hasFeature = !!feature?.sketchUrl

  // 마음 구슬병 (재사용)
  const jar = (
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ width: 190 }}>
        <div className="jar">
          <div className="jar__fill">
            {beadKeys.map((k, i) => (
              <img key={i} src={beadSrc(k)} className="bead" title={emotionCategory(k).label} onClick={() => setPicked(k)} alt="" />
            ))}
          </div>
          <img src="/assets/jar.png" className="jar__glass" alt="마음 구슬병" />
        </div>
        <button className="btn-img" onClick={() => nav('/app/diary')} style={{ width: 150, margin: '8px auto 0' }} aria-label="감정일기 쓰기">
          <img src="/assets/btn_diary.png" alt="감정일기 쓰기" />
        </button>
      </div>
    </div>
  )

  const emoPanel = picked && (
    <div className="emo-panel" style={{ borderColor: emotionCategory(picked).color }}>
      <button className="emo-panel__close" onClick={() => setPicked(null)}>✕</button>
      <img src={beadSrc(picked)} style={{ width: 72, height: 72 }} className="anim-float" alt="" />
      <div className="emo-panel__label">{emotionCategory(picked).label}</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
        내 구슬병에 <b style={{ color: 'var(--green)' }}>{pickedCount}개</b> 담겨 있어요.
      </div>
    </div>
  )

  return (
    <section className="sin-screen">
      {/* ── HERO ── */}
      <div className="hero" style={{ background: heroBg, transition: 'background .4s ease' }}>
        {jar}

        {hasFeature ? (
          /* 일력 모드: 환영(좌상단) + 일력 크게 가운데 */
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(18px,2.6vh,26px)', color: 'var(--cal-ink)', flexShrink: 0 }}>
              {myName} 님, 환영해요!
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 6 }}>
              {picked ? emoPanel : (
                <>
                  <div style={{ fontFamily: 'var(--font-title)', color: 'var(--cal-ink)', lineHeight: 1, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 'clamp(13px,1.8vh,18px)', letterSpacing: 4 }}>{calMonth}</div>
                    <div style={{ fontSize: 'clamp(34px,6vh,56px)', margin: '2px 0' }}>{calDay}</div>
                    <div style={{ fontSize: 'clamp(12px,1.6vh,16px)', letterSpacing: 4 }}>{calWday}</div>
                  </div>
                  <img
                    src={feature!.sketchUrl}
                    alt="오늘의 일력"
                    style={{ height: '100%', maxWidth: '100%', aspectRatio: '5 / 3', objectFit: 'contain', borderRadius: 'var(--r-lg)', border: '2px solid rgba(0,0,0,.12)', background: '#fff' }}
                  />
                </>
              )}
            </div>
            {!picked && (
              <div style={{ flexShrink: 0, textAlign: 'center', marginTop: 4 }}>
                <div className="cal__caption">{feature!.text}</div>
                {feature!.author && <div style={{ fontSize: 14, color: '#5a6b78' }}>— {feature!.author}</div>}
              </div>
            )}
          </div>
        ) : (
          /* 기본 모드 */
          <>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10 }}>
              {picked ? emoPanel : (
                <>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(22px,3.4vh,34px)', color: 'var(--cal-ink)' }}>
                    {myName} 님, 환영해요!
                  </div>
                  <div style={{ fontSize: 15, color: '#5a6b78', lineHeight: 1.6 }}>
                    {beadKeys.length > 0
                      ? <>구슬을 눌러 내 마음을 살펴보거나,<br />아래 버튼으로 오늘의 마음을 기록해요.</>
                      : <>구슬병 아래 버튼을 눌러<br />오늘의 마음을 기록해 보세요.</>}
                  </div>
                </>
              )}
            </div>
            <div style={{ flexShrink: 0, alignSelf: 'center', width: 'clamp(240px,26vw,380px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div className="cal">
                <div className="cal__month">{calMonth}</div>
                <div className="cal__day">{calDay}</div>
                <div className="cal__wday">{calWday}</div>
              </div>
              <div style={{ margin: 'clamp(10px,2vh,22px) 0', fontSize: 'clamp(40px,8vh,72px)', lineHeight: 1 }}>🦕🎤</div>
              <div className="cal__caption">{feature?.text ?? '점수가 중요한 게 아니야, 그냥 즐기면 돼!'}</div>
              {feature?.author && <div style={{ fontSize: 14, color: '#5a6b78' }}>— {feature.author}</div>}
            </div>
          </>
        )}
      </div>

      {/* ── 하단 스탯바 ── */}
      <div style={{ flexShrink: 0, paddingTop: 12 }}>
        <div className="merge-box">
          <div className="merge-box__cell" style={{ flex: 1.3, flexDirection: 'row', alignItems: 'center', gap: 24 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted-2)' }}>보유 쿠키</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 24 }}>🍪</span>
                <span style={{ fontFamily: 'var(--font-title)', fontSize: 26, color: 'var(--gold-deep)' }}>{myCookies}</span>
              </div>
            </div>
            <div style={{ paddingLeft: 24, borderLeft: '2px dashed var(--border-strong)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted-2)' }}>우리반 전체</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 24 }}>🍪</span>
                <span style={{ fontFamily: 'var(--font-title)', fontSize: 26, color: 'var(--green)' }}>{classTotal}</span>
              </div>
            </div>
          </div>
          <div className="merge-box__divider" />
          <div className="merge-box__cell" style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <img
              src={myAvatar}
              alt="내 아바타"
              onError={e => { const t = e.currentTarget; if (!t.dataset.fb) { t.dataset.fb = '1'; t.src = '/assets/logo_mascot.png' } }}
              style={{ width: 54, height: 54, borderRadius: 12, objectFit: 'cover', background: '#fff', border: '2px solid var(--border)', flexShrink: 0, imageRendering: 'pixelated' }}
            />
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted-2)', marginBottom: 3 }}>최근 활동</div>
              <div style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.5 }}>
                <b style={{ color: 'var(--green)' }}>{myName}</b> 님, 오늘도 마음마을에 온 걸 환영해요!
              </div>
            </div>
          </div>
          {latestReply && (
            <>
              <div className="merge-box__divider" />
              <button
                className="merge-box__cell"
                style={{ flex: 1.4, cursor: 'pointer', textAlign: 'left', border: 'none', background: 'none' }}
                onClick={() => nav(`/app/diary?d=${latestReply.date}`)}
              >
                <div style={{ fontSize: 13, color: 'var(--muted-2)', marginBottom: 3 }}>🌿 선생님 답장</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {latestReply.teacherFeedback}
                </div>
                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3, fontFamily: 'var(--font-title)' }}>눌러서 내 일기·답장 보기 →</div>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
