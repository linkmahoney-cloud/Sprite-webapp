import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import TasksPage from './components/Tasks/TasksPage'
import CalendarPage from './components/Calendar/CalendarPage'
import SpritePage from './components/Sprite/SpritePage'
import FinancesPage from './components/Finances/FinancesPage'
import EmailPage from './components/Email/EmailPage'
import ContactsPage from './components/Contacts/ContactsPage'
import MessagesPage from './components/Messages/MessagesPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/sprite" element={<SpritePage />} />
        <Route path="/finances" element={<FinancesPage />} />
        <Route path="/email" element={<EmailPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
      </Routes>
    </Layout>
  )
}
