import { useCalendar } from '../../hooks/useCalendar'
import { supabase } from '../../lib/supabase'

export default function CalendarPage() {
  const { events, loading, connected } = useCalendar()

  const connectGoogle = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      window.location.href = `/api/auth/google-services?token=${session.access_token}`
    }
  }

  if (!connected && !loading) {
    return (
      <div>
        <h2 style={{ marginBottom: 20 }}>Calendar</h2>
        <div className="connect-card">
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            Connect Google Calendar to see your events, create new ones, and sync with Notion Calendar.
          </p>
          <button className="btn-primary" onClick={connectGoogle}>
            Connect Google Services
          </button>
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

  const formatTime = (event) => {
    if (event.start?.dateTime) {
      return new Date(event.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    return 'All day'
  }

  const formatEnd = (event) => {
    if (event.end?.dateTime) {
      return new Date(event.end.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    return ''
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Calendar</h2>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading events...</p>
      ) : events.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No events today.</p>
      ) : (
        <div className="events-list">
          {events.map(event => (
            <div key={event.id} className="event-item">
              <div className="event-time">
                <span>{formatTime(event)}</span>
                {formatEnd(event) && <span className="event-end">– {formatEnd(event)}</span>}
              </div>
              <div className="event-details">
                <div className="event-title">{event.summary || '(No title)'}</div>
                {event.location && <div className="event-location">{event.location}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .event-item {
          display: flex;
          gap: 16px;
          padding: 14px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .event-time {
          min-width: 100px;
          font-size: 13px;
          color: var(--accent-gold);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .event-end { color: var(--text-muted); }
        .event-details { flex: 1; }
        .event-title {
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
        }
        .event-location {
          color: var(--text-muted);
          font-size: 12px;
          margin-top: 2px;
        }
      `}</style>
    </div>
  )
}
