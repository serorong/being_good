import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import { DIVINE_CLASS_ID } from './data'
import { ClassProvider } from './ClassContext'
import LoginPage from './pages/LoginPage'
import MainLayout from './pages/MainLayout'
import HomePage from './pages/HomePage'
import NoticePage from './pages/NoticePage'
import QuestsPage from './pages/QuestsPage'
import MissionsPage from './pages/MissionsPage'
import DiaryPage from './pages/DiaryPage'
import OfferingsPage from './pages/OfferingsPage'
import ShopPage from './pages/ShopPage'
import ShrinePage from './pages/ShrinePage'
import AdminPage from './pages/AdminPage'
import LibraryPage from './library/LibraryPage'
import PortfolioPrintPage from './library/PortfolioPrintPage'
import LibrarySitePage from './library/site/LibrarySitePage'

function RequireAuth({ children }: { children: JSX.Element }) {
  const [auth] = useAuth()
  if (!auth) return <Navigate to="/" replace />
  return children
}

function RequireTeacher({ children }: { children: JSX.Element }) {
  const [auth] = useAuth()
  if (auth?.role !== 'teacher') return <Navigate to="/app" replace />
  return children
}

function AppWithClass() {
  const [auth] = useAuth()
  const classId = auth?.classId ?? DIVINE_CLASS_ID
  const teacherEmail = auth?.teacherEmail ?? ''

  return (
    <ClassProvider classId={classId} teacherEmail={teacherEmail}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route index             element={<HomePage />} />
          <Route path="notice"     element={<NoticePage />} />
          <Route path="quests"     element={<QuestsPage />} />
          <Route path="diary"      element={<DiaryPage />} />
          <Route path="missions"   element={<MissionsPage />} />
          <Route path="shop"       element={<ShopPage />} />
          <Route path="offerings"  element={<OfferingsPage />} />
          <Route path="shrine"     element={<ShrinePage />} />
          <Route path="library"    element={<LibraryPage />} />
          <Route path="admin"      element={<RequireTeacher><AdminPage /></RequireTeacher>} />
          <Route path="agora"      element={<Navigate to="/app" replace />} />
          <Route path="sanctuary"  element={<Navigate to="/app/shrine" replace />} />
        </Route>
        {/* 모두의 도서관 전용 페이지 — 비밀번호 로그인, 구글 로그인 불필요 */}
        <Route path="/library" element={<LibrarySitePage />} />
        {/* 인쇄용 보기 — 헤더 없이 전체 화면으로 (MainLayout 바깥) */}
        <Route path="/app/library-print/:sid" element={
          <RequireAuth><RequireTeacher><PortfolioPrintPage /></RequireTeacher></RequireAuth>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ClassProvider>
  )
}

export default function App() {
  return <AppWithClass />
}
