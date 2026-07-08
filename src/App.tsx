import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
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

export default function App() {
  return (
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
        <Route path="admin"      element={<RequireTeacher><AdminPage /></RequireTeacher>} />
        {/* 옛 경로 호환: 아고라·개인 성소는 제거됨 → 홈으로 */}
        <Route path="agora"      element={<Navigate to="/app" replace />} />
        <Route path="sanctuary"  element={<Navigate to="/app/shrine" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
