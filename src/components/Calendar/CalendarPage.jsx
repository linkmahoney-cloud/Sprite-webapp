import { useState, useEffect } from 'react'
import { useCalendar } from '../../hooks/useCalendar'
import { supabase } from '../../lib/supabase'
import MiniCalendar from './MiniCalendar'
import DayView from './DayView'
import WeekView from './WeekView'
import EventModal from './EventModal'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState('day') // day, week
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [slotDate, setSlotDate] = useState(null)

  const { events, loading, connected, fetchEvents, createEvent } = useCalendar()

  // Refetch when date changes for week view
  useEffect(() => {
    if (!connected) return
    if (view === 'week') {
      const d = new Date(selectedDate)
      const day = d.getDay()
      const start = new Date(d)
      start.setDate(d.getDate() - day)
      const end = new Date(start)
      end.setDate(start.getDate() + 7)
      fetchEvents(start.toISOString(), end.toISOString())
    } else {
      const start = new Date(selectedDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(selectedDate)
      end.setHours(23, 59, 59, 999)
      fetchEvents(start.toISOString(), end.toISOString())
    }
  }, [selectedDate, view, connected])

  const connectGoogle = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      window.location.href = `/api/auth/google-services?token=${session.access_token}`
    }
  }

  const goToday = () => setSelectedDate(new Date())
  const goPrev = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - (view === 'week' ? 7 : 1))
    setSelectedDate(d)
  }
  const goNext = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + (view === 'week' ? 7 : 1))
    setSelectedDate(d)
  }

  const handleSlotClick = (date) => {
    setSlotDate(date)
    setSelectedEvent(null)
    setShowEventModal(true)
  }

  const handleEventClick = (event) => {
    setSelectedEvent(event)
    setSlotDate(null)
    setShowEventModal(true)
  }

  const handleSaveEvent = async (eventData) => {
    await createEvent(eventData)
  }

  const dateLabel = view === 'day'
    ? `${DAY_NAMES[selectedDate.getDay()]}, ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}`
    : `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`

  if (!connected && !loading) {
    return (
      <div>
        <h2 style={{ marginBottom: 20 }}>Calendar</h2>
        <div className="connect-card">
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            Connect Google Calendar to see your events, create new ones, and auto-track SPRITE time.
          </p>
          <button className="btn-primary" onClick={connectGoogle}>Connect Google Services</button>
        </div>
        <style>{`
          .connect-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            max-width: 480px;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="cal-page">
      <div className="cal-sidebar">
        <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />

        <div className="cal-sidebar-section">
          <h4>View</h4>
          <div className="view-switcher">
            {['day', 'week'].map(v => (
              <button
                key={v}
                className={`view-btn ${view === v ? 'active' : ''}`}
                onClick={() => setView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="cal-main">
        <div className="cal-toolbar">
          <div className="cal-nav">
            <button className="nav-btn" onClick={goPrev}>&lt;</button>
            <button className="nav-btn today-btn" onClick={goToday}>Today</button>
            <button className="nav-btn" onClick={goNext}>&gt;</button>
            <h2 className="cal-date-label">{dateLabel}</h2>
          </div>
          <button className="btn-primary" onClick={() => handleSlotClick(selectedDate)}>
            + New Event
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: 20 }}>Loading events...</p>
        ) : view === 'day' ? (
          <DayView
            events={events}
            date={selectedDate}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        ) : (
          <WeekView
            events={events}
            date={selectedDate}
            onDateSelect={(d) => { setSelectedDate(d); setView('day') }}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {showEventModal && (
        <EventModal
          event={selectedEvent}
          date={slotDate || selectedDate}
          onSave={handleSaveEvent}
          onClose={() => { setShowEventModal(false); setSelectedEvent(null); setSlotDate(null) }}
        />
      )}

      <style>{`
        .cal-page {
          display: flex;
          gap: 20px;
          height: calc(100vh - var(--header-height) - 56px);
        }
        .cal-sidebar {
          width: 220px;
          min-width: 220px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .cal-sidebar-section h4 {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .view-switcher { display: flex; gap: 4px; }
        .view-btn {
          flex: 1;
          padding: 6px;
          font-size: 13px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-muted);
          cursor: pointer;
        }
        .view-btn.active {
          background: var(--accent-gold);
          color: #0d0a14;
          border-color: var(--accent-gold);
          font-weight: 600;
        }
        .cal-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .cal-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .cal-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-btn {
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }
        .nav-btn:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
        .today-btn { font-size: 13px; }
        .cal-date-label {
          font-size: 18px;
          font-weight: 600;
          margin-left: 8px;
        }
      `}</style>
    </div>
  )
}
