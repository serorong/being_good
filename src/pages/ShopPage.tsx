import { useMemo, useState } from 'react'
import { useAuth } from '../auth'
import { SHOP_REAL_ITEMS } from '../data'
import { effectiveCookies, lifetimeCookiesOf, purchaseShopItem, useRoster, useStudentStateMap } from '../state'

export default function ShopPage() {
  const [auth] = useAuth()
  const { map } = useStudentStateMap()
  const MOCK_STUDENTS = useRoster()

  const sid = auth?.role === 'student' ? auth.studentId : MOCK_STUDENTS[0]?.id
  const student = sid ? MOCK_STUDENTS.find(s => s.id === sid) : undefined
  const current = sid ? effectiveCookies(sid, map) : 0
  const lifetime = sid ? lifetimeCookiesOf(sid, map) : 0
  const purchases = sid ? (map[sid]?.purchases ?? []) : []

  const [working, setWorking] = useState(false)
  const isTeacher = auth?.role === 'teacher'

  const recent = useMemo(
    () => [...purchases].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)).slice(0, 6),
    [purchases]
  )

  const buy = (itemId: string) => {
    if (!sid || working) return
    if (isTeacher) { alert('교사 모드에서는 직접 구매할 수 없어요. 학생 계정으로 로그인해 주세요.'); return }
    const item = SHOP_REAL_ITEMS.find(i => i.id === itemId)
    if (!item) return
    if (current < item.cost) { alert(`현재 쿠키가 부족해요. (필요 ${item.cost} / 보유 ${current})`); return }
    const ok = confirm(`「${item.name}」 구입을 희망하시나요?\n\n비용: 🍪 ${item.cost}개\n구매 후 현재 쿠키에서 ${item.cost}개 차감 (누적 쿠키 유지)\n\n[확인]을 눌러주세요.`)
    if (!ok) return
    setWorking(true)
    const success = purchaseShopItem(sid, { id: item.id, name: item.name, icon: item.icon, cost: item.cost })
    setWorking(false)
    if (success) alert(`✨ 구매 완료!\n\n${item.icon} ${item.name}\n\n선생님께 보여주고 보상을 받으세요.`)
    else alert('구매에 실패했어요. 쿠키가 부족하거나 일시적인 문제일 수 있어요.')
  }

  return (
    <section className="sin-screen">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
        <div>
          <h1 className="page-title">상점 <span style={{ fontSize: 28 }}>🛍️</span></h1>
          <p className="page-subtitle">쿠키를 모아 선생님께 받을 보상을 교환해요!</p>
        </div>
        <div style={{ textAlign: 'right', background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 18px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>현재 쿠키</div>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 28, color: 'var(--gold-deep)', lineHeight: 1 }}>🍪 {current}</div>
          <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>누적 {lifetime}</div>
        </div>
      </div>

      {student && current < 200 && (
        <p style={{ fontSize: 14, color: 'var(--pink)', marginBottom: 12 }}>아직 {200 - current}개 더 모아야 해요.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {SHOP_REAL_ITEMS.map(item => {
          const canBuy = !isTeacher && current >= item.cost
          return (
            <div key={item.id} className="card lift" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 44, flexShrink: 0, lineHeight: 1 }}>{item.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 17, color: 'var(--text)' }}>{item.name}</div>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.6 }}>{item.description}</p>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="chip chip--gold">🍪 {item.cost}</span>
                  <button onClick={() => buy(item.id)} disabled={!canBuy || working} className="btn btn--primary" style={{ opacity: (!canBuy || working) ? 0.5 : 1 }}>
                    구매
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!isTeacher && recent.length > 0 && (
        <div className="card" style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="card-title" style={{ fontSize: 18 }}>🧾 최근 구매</span>
            <span className="chip chip--blue">{purchases.length}건</span>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {recent.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '2px solid var(--border)', borderRadius: 'var(--r-md)', padding: 10 }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{p.icon ?? '🎁'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--text)' }}>{p.itemName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(p.purchasedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <span className="chip chip--pink">−🍪 {p.cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
