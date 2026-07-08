import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../auth'
import { useRoster, useStudentStateMap, effectiveCookies } from '../state'
import { levelFromXp } from '../data'
import { signOutFirebase } from '../firebase'

type Tab = { to: string; label: string; icon: string | null; end?: boolean; teacherOnly?: boolean }

const TABS: Tab[] = [
  { to: '/app/notice',    label: '알림장',       icon: 'ic_notice' },
  { to: '/app/quests',    label: '신탁 두루마리', icon: 'ic_scroll' },
  { to: '/app/missions',  label: '미션',         icon: 'ic_mission' },
  { to: '/app/shop',      label: '상점',         icon: 'ic_shop' },
  { to: '/app/offerings', label: '제물',         icon: 'ic_offering' },
  { to: '/app/shrine',    label: '모둠별 신전',   icon: 'ic_shrine' },
  { to: '/app/admin',     label: '학급관리',     icon: null, teacherOnly: true },
]

export default function MainLayout() {
  const [auth, setAuth] = useAuth()
  const { map } = useStudentStateMap()
  const roster = useRoster()
  const nav = useNavigate()

  const me = auth?.role === 'student' && auth.studentId
    ? roster.find(s => s.id === auth.studentId)
    : null
  const myCookies = me ? effectiveCookies(me.id, map) : 0
  const myXp = me ? (map[me.id]?.xp ?? 0) : 0
  const myLevel = me ? levelFromXp(myXp) : null

  const visibleTabs = TABS.filter(t => !t.teacherOnly || auth?.role === 'teacher')

  const logout = () => {
    const wasTeacher = auth?.role === 'teacher'
    setAuth(null)
    if (wasTeacher) void signOutFirebase()
    nav('/', { replace: true })
  }

  useEffect(() => {
    if (auth?.role === 'student' && auth.studentId && roster.length > 0) {
      if (!roster.find(s => s.id === auth.studentId)) {
        setAuth(null)
        nav('/', { replace: true })
      }
    }
  }, [auth, roster, setAuth, nav])

  return (
    <div className="sin-app">
      <header className="nav">
        <div className="nav__inner">
          <NavLink to="/app" end className="nav__brand" style={{ textDecoration: 'none' }}>
            <img src="/assets/logo_mascot.png" alt="신의반" style={{ width: 46, height: 46, objectFit: 'contain' }} />
            <div>
              <div className="nav__brand-title">신의반 신전</div>
              <div className="nav__brand-sub">6학년 우리 반 마음마을</div>
            </div>
          </NavLink>

          <nav className="nav__menu">
            {visibleTabs.map(t => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) => `nav__btn ${isActive ? 'is-active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <span className="nav__btn-label">
                  {t.icon && <img src={`/assets/${t.icon}.png`} className="nav__icon" alt="" />}
                  {t.label}
                </span>
              </NavLink>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {auth?.role === 'teacher' ? (
              <span className="chip chip--blue">교사 모드</span>
            ) : me ? (
              <>
                <span className="chip chip--green">{me.heroName}</span>
                {myLevel && <span className="chip chip--gold">Lv.{myLevel.level}</span>}
                <span className="chip chip--gold">🍪 {myCookies}</span>
              </>
            ) : null}
            <button onClick={logout} className="btn btn--ghost">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="sin-main">
        <Outlet />
      </main>
    </div>
  )
}
