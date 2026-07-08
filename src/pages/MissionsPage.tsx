import { useMemo } from 'react'
import { useAuth } from '../auth'
import { itemsUnlockedAt, levelFromXp, themesUnlockedAt } from '../data'
import { useCustomTitles, useMissions, useRoster, useStudentStateMap } from '../state'
import type { CustomTitle, Mission, TitleColor } from '../types'

function chipColor(c?: TitleColor): string {
  return c === 'blue' ? 'chip chip--blue' : c === 'green' ? 'chip chip--green' : c === 'rose' ? 'chip chip--pink' : 'chip chip--gold'
}

export default function MissionsPage() {
  const [auth] = useAuth()
  const [missions] = useMissions()
  const [titles] = useCustomTitles()
  const { get, update } = useStudentStateMap()
  const MOCK_STUDENTS = useRoster()

  const sid = auth?.role === 'student' ? auth.studentId : MOCK_STUDENTS[0]?.id
  const student = MOCK_STUDENTS.find(s => s.id === sid)
  const state = sid ? get(sid) : null
  const completedIds = new Set((state?.missionCompletions ?? []).map(c => c.missionId))

  const active = useMemo(() => missions.filter(m => m.active), [missions])
  const undone = active.filter(m => !completedIds.has(m.id))
  const done = active.filter(m => completedIds.has(m.id))
  const totalCount = active.length
  const doneCount = done.length
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  const complete = (m: Mission) => {
    if (!sid) return
    if (completedIds.has(m.id)) return
    const baseCookies = MOCK_STUDENTS.find(x => x.id === sid)?.cookies ?? 0
    let levelUp: { from: number; to: number } | null = null

    update(sid, s => {
      if ((s.missionCompletions ?? []).some(c => c.missionId === m.id)) return s
      const oldCookies = s.cookies ?? baseCookies
      const oldLife = s.lifetimeCookies ?? oldCookies
      const cookieDelta = m.rewardCookies ?? 0
      const oldXp = s.xp ?? 0
      const newXp = Math.max(0, oldXp + 30)
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
      const isNewTitle = !!m.rewardTitleId && !s.ownedTitleIds.includes(m.rewardTitleId)
      const newOwnedTitles = isNewTitle ? [...s.ownedTitleIds, m.rewardTitleId!] : s.ownedTitleIds
      const curDisplay = s.displayTitleIds ?? (s.displayTitleId ? [s.displayTitleId] : [])
      const newDisplay = isNewTitle && !curDisplay.includes(m.rewardTitleId!) && curDisplay.length < 3
        ? [...curDisplay, m.rewardTitleId!]
        : curDisplay
      return {
        ...s,
        cookies: oldCookies + cookieDelta,
        lifetimeCookies: oldLife + cookieDelta,
        xp: newXp,
        unlockedThemes,
        ownedItemIds,
        ownedTitleIds: newOwnedTitles,
        displayTitleIds: newDisplay,
        displayTitleId: newDisplay[0],
        missionCompletions: [...(s.missionCompletions ?? []), { missionId: m.id, completedAt: new Date().toISOString() }],
      }
    })

    const parts: string[] = []
    if (m.rewardCookies) parts.push(`🍪 ${m.rewardCookies}개`)
    parts.push('✨ XP +30')
    if (levelUp) parts.push(`🎉 Lv.${(levelUp as { from: number; to: number }).from}→Lv.${(levelUp as { from: number; to: number }).to}`)
    if (m.rewardTitleId) {
      const t = titles.find(t => t.id === m.rewardTitleId)
      if (t) parts.push(`🎖 「${t.name}」 호칭`)
    }
    if (parts.length > 0) alert(`✦ 미션 완수! 보상: ${parts.join(' · ')}`)
  }

  return (
    <section className="sin-screen">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
        <div>
          <h1 className="page-title">미션 <span style={{ fontSize: 28 }}>🌿</span></h1>
          <p className="page-subtitle">{student ? `${student.heroName} 용사의 미션` : '신탁자가 내린 오늘의 과제'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 28, color: 'var(--green)', lineHeight: 1 }}>
            {doneCount}<span style={{ color: 'var(--muted-3)', fontSize: 16 }}> / {totalCount}</span>
          </div>
          <div className="progress" style={{ width: 140, marginTop: 8 }}>
            <div className="progress__fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{pct}% 완수</div>
        </div>
      </div>

      {undone.length === 0 ? (
        <div className="card--empty card" style={{ padding: '40px 30px' }}>
          진행 중인 미션이 없어요. 선생님이 「학급관리 → 미션 관리」에서 등록하면 표시돼요.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {undone.map(m => (
            <MissionCard key={m.id} m={m} titles={titles} onComplete={complete} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <h3 className="card-title" style={{ fontSize: 18, margin: '22px 0 12px' }}>✓ 완료한 미션 — {done.length}개</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
            {done.map(m => (
              <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, opacity: 0.75 }}>
                <span style={{ color: 'var(--green)' }}>✓</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, color: 'var(--text)', textDecoration: 'line-through' }}>{m.title}</div>
                  {m.description && <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function MissionCard({ m, titles, onComplete }: { m: Mission; titles: CustomTitle[]; onComplete: (m: Mission) => void }) {
  const rewardTitle = m.rewardTitleId ? titles.find(t => t.id === m.rewardTitleId) : null
  return (
    <div className="card lift" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
        {m.deadline && <span className="chip chip--gold">🗓️ {m.deadline}</span>}
        {m.rewardCookies && <span className="chip chip--pink">🍪 +{m.rewardCookies}</span>}
        {rewardTitle && <span className={chipColor(rewardTitle.color)}>{rewardTitle.icon} 「{rewardTitle.name}」</span>}
      </div>
      <h3 style={{ fontFamily: 'var(--font-title)', fontSize: 18, color: 'var(--text)', lineHeight: 1.3, margin: 0 }}>{m.title}</h3>
      {m.description && <p style={{ fontSize: 14, color: 'var(--muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{m.description}</p>}
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <button onClick={() => onComplete(m)} className="btn btn--primary">✓ 완수했어요</button>
      </div>
    </div>
  )
}
