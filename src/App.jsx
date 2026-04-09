import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './components/Auth/LoginPage'

const Layout = lazy(() => import('./components/Layout/Layout'))
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'))
const TasksPage = lazy(() => import('./components/Tasks/TasksPage'))
const CalendarPage = lazy(() => import('./components/Calendar/CalendarPage'))
const SpritePage = lazy(() => import('./components/Sprite/SpritePage'))
const SpriteHistoryPage = lazy(() => import('./components/Sprite/SpriteHistoryPage'))
const FinancesPage = lazy(() => import('./components/Finances/FinancesPage'))
const EmailPage = lazy(() => import('./components/Email/EmailPage'))
const ContactsPage = lazy(() => import('./components/Contacts/ContactsPage'))
const MessagesPage = lazy(() => import('./components/Messages/MessagesPage'))

const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
    Loading...
  </div>
)

export default function App() {
  const { user, loading, error } = useAuth()

  if (loading) return <LoadingScreen />

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: '#ff6b6b', flexDirection: 'column', gap: 12 }}>
        <h2>Configuration Error</h2>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/sprite" element={<SpritePage />} />
          <Route path="/sprite/history" element={<SpriteHistoryPage />} />
          <Route path="/finances" element={<FinancesPage />} />
          <Route path="/email" element={<EmailPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
        </Routes>
      </Layout>
    </Suspense>
  )
}
