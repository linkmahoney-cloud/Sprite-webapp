const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function getWeekDays(date) {
  const d = new Date(date)
  const day = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start)
    dd.setDate(start.getDate() + i)
    return dd
  })
}

function getEventColor(event) {
  const colorMap = {
    '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
    '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
  }
  return colorMap[event.colorId] || event.color || '#3b82f6'
}

export default function WeekView({ events, date, onDateSelect, onEventClick }) {
  const weekDays = getWeekDays(date)
  const today = new Date()

  return (
    <div className="week-view">
      <div className="week-header">
        <div className="week-header-spacer" />
        {weekDays.map((d, i) => (
          <div
            key={i}
            className={`week-header-day ${d.toDateString() === today.toDateString() ? 'today' : ''}`}
            onClick={() => onDateSelect(d)}
          >
            <span className="week-day-name">{DAY_NAMES[d.getDay()]}</span>
            <span className="week-day-num">{d.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="week-body">
        {HOURS.map(h => (
          <div key={h} className="week-hour-row">
            <div className="week-hour-label">{formatHour(h)}</div>
            {weekDays.map((d, i) => {
              const dayEvents = events.filter(e => {
                const eDate = new Date(e.start?.dateTime || e.start?.date)
                return eDate.toDateString() === d.toDateString() &&
                       eDate.getHours() === h
              })
              return (
                <div key={i} className="week-cell" onClick={() => onDateSelect(d)}>
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="week-event"
                      style={{ borderLeft: `3px solid ${getEventColor(event)}`, background: `${getEventColor(event)}22` }}
                      onClick={(e) => { e.stopPropagation(); onEventClick?.(event) }}
                    >
                      {event.summary || '(No title)'}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <style>{`
        .week-view { flex: 1; overflow-y: auto; }
        .week-header {
          display: flex;
          border-bottom: 2px solid var(--border);
          position: sticky;
          top: 0;
          background: var(--bg-primary);
          z-index: 2;
        }
        .week-header-spacer { width: 60px; min-width: 60px; }
        .week-header-day {
          flex: 1;
          text-align: center;
          padding: 8px 0;
          cursor: pointer;
        }
        .week-header-day:hover { background: var(--bg-secondary); }
        .week-header-day.today .week-day-num {
          background: var(--accent-gold);
          color: #0d0a14;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .week-day-name { font-size: 11px; color: var(--text-muted); display: block; }
        .week-day-num { font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .week-body { position: relative; }
        .week-hour-row {
          display: flex;
          min-height: 48px;
          border-bottom: 1px solid var(--border);
        }
        .week-hour-label {
          width: 60px;
          min-width: 60px;
          font-size: 10px;
          color: var(--text-muted);
          padding: 2px 6px;
          text-align: right;
        }
        .week-cell {
          flex: 1;
          border-left: 1px solid var(--border);
          padding: 2px;
          cursor: pointer;
          min-height: 48px;
        }
        .week-cell:hover { background: var(--bg-secondary); }
        .week-event {
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 3px;
          margin-bottom: 1px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
