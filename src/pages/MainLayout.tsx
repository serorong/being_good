import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../auth'
import { useRoster, useStudentStateMap, effectiveCookies } from '../state'
import { levelFromXp } from '../data'
import { signOutFirebase } from '../firebase'
import { useClassInfo } from '../ClassContext'
import type { MenuKey } from '../types'

const MENU_PATHS: Record<MenuKey, string> = {
  notice:    '/app/notice',
  quests:    '/app/quests',
  missions:  '/app/missions',
  shop:      '/app/shop',
  offerings: '/app/offerings',
  shrine:    '/app/shrine',
}

const MENU_ICONS: Record<MenuKey, string> = {
  notice:    'ic_notice',
  quests:    'ic_scroll',
  missions:  'ic_mission',
  shop:      'ic_shop',
  offerings: 'ic_offering',
  shrine:    'ic_shrine',
}

export default function MainLayout() {
  const [auth, setAuth] = useAuth()
  const { map } = useStudentStateMap()
  const roster = useRoster()
  const nav = useNavigate()
  const { classInfo } = useClassInfo()

  const me = auth?.role === 'student' && auth.studentId
    ? roster.find(s => s.id === auth.studentId)
    : null
  const myCookies = me ? effectiveCookies(me.id, map) : 0
  const myXp = me ? (map[me.id]?.xp ?? 0) : 0
  const myLevel = me ? levelFromXp(myXp) : null

  const cookieName = classInfo.terms.cookieName
  const visibleMenus = classInfo.menus.filter(m => m.enabled)

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
            <img src="/assets/logo_mascot.png" alt="로고" style={{ width: 46, height: 46, objectFit: 'contain' }} />
            <div>
              <div className="nav__brand-title">{classInfo.terms.className}</div>
              <div className="nav__brand-sub">{classInfo.terms.subtitle}</div>
            </div>
          </NavLink>

          <nav className="nav__menu">
            {visibleMenus.map(m => (
              <NavLink
                key={m.key}
                to={MENU_PATHS[m.key]}
                className={({ isActive }) => `nav__btn ${isActive ? 'is-active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <span className="nav__btn-label">
                  <img src={`/assets/${MENU_ICONS[m.key]}.png`} className="nav__icon" alt="" />
                  {m.label}
                </span>
              </NavLink>
            ))}
            {auth?.role === 'teacher' && (
              <NavLink
                to="/app/admin"
                className={({ isActive }) => `nav__btn ${isActive ? 'is-active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <span className="nav__btn-label">학급관리</span>
              </NavLink>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {auth?.role === 'teacher' ? (
              <span className="chip chip--blue">교사 모드</span>
            ) : me ? (
              <>
                <span className="chip chip--green">{me.heroName}</span>
                {myLevel && <span className="chip chip--gold">Lv.{myLevel.level}</span>}
                <span className="chip chip--gold">{cookieName === '쿠키' ? '🍪' : '✨'} {myCookies}</span>
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
