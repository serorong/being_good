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
          <Route path="admin"      element={<RequireTeacher><AdminPage /></RequireTeacher>} />
          <Route path="agora"      element={<Navigate to="/app" replace />} />
          <Route path="sanctuary"  element={<Navigate to="/app/shrine" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ClassProvider>
  )
}

export default function App() {
  return <AppWithClass />
}
