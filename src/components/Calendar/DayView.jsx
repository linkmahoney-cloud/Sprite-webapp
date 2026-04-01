const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function getEventPosition(event) {
  const start = new Date(event.start?.dateTime || event.start?.date)
  const end = new Date(event.end?.dateTime || event.end?.date)
  const startMin = start.getHours() * 60 + start.getMinutes()
  const endMin = end.getHours() * 60 + end.getMinutes()
  const duration = Math.max(endMin - startMin, 15)
  return { top: startMin, height: duration }
}

function getEventColor(event) {
  const colorMap = {
    '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
    '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
    '9': '#3f51b5', '10': '#0b8043', '11': '#d50000',
  }
  return colorMap[event.colorId] || event.color || '#3b82f6'
}

export default function DayView({ events, date, onEventClick, onSlotClick }) {
  const dayEvents = events.filter(e => {
    const eDate = new Date(e.start?.dateTime || e.start?.date)
    return eDate.toDateString() === date.toDateString()
  })

  const handleSlotClick = (hour) => {
    const d = new Date(date)
    d.setHours(hour, 0, 0, 0)
    onSlotClick?.(d)
  }

  return (
    <div className="day-view">
      <div className="day-view-grid">
        {HOURS.map(h => (
          <div key={h} className="hour-row" onClick={() => handleSlotClick(h)}>
            <div className="hour-label">{formatHour(h)}</div>
            <div className="hour-cell" />
          </div>
        ))}

        {dayEvents.map(event => {
          if (!event.start?.dateTime) return null
          const { top, height } = getEventPosition(event)
          const color = getEventColor(event)
          const sprite = event.extendedProperties?.private?.sprite_category

          return (
            <div
              key={event.id}
              className="cal-event"
              style={{
                top: `${top}px`,
                height: `${Math.max(height, 20)}px`,
                borderLeft: `3px solid ${color}`,
                background: `${color}22`,
              }}
              onClick={(e) => { e.stopPropagation(); onEventClick?.(event) }}
            >
              <div className="cal-event-title">{event.summary || '(No title)'}</div>
              <div className="cal-event-time">
                {new Date(event.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                {' – '}
                {new Date(event.end.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
              {sprite && <span className="cal-event-sprite">{sprite}</span>}
            </div>
          )
        })}
      </div>

      <style>{`
        .day-view {
          flex: 1;
          overflow-y: auto;
          position: relative;
        }
        .day-view-grid {
          position: relative;
          min-height: ${24 * 60}px;
        }
        .hour-row {
          display: flex;
          height: 60px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
        }
        .hour-row:hover .hour-cell { background: var(--bg-secondary); }
        .hour-label {
          width: 70px;
          min-width: 70px;
          font-size: 11px;
          color: var(--text-muted);
          padding: 4px 8px;
          text-align: right;
        }
        .hour-cell { flex: 1; }
        .cal-event {
          position: absolute;
          left: 78px;
          right: 8px;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          overflow: hidden;
          z-index: 1;
          transition: opacity 0.15s;
        }
        .cal-event:hover { opacity: 0.85; }
        .cal-event-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cal-event-time {
          font-size: 10px;
          color: var(--text-secondary);
          margin-top: 1px;
        }
        .cal-event-sprite {
          position: absolute;
          top: 4px;
          right: 6px;
          font-size: 10px;
          font-weight: 700;
          color: var(--accent-gold);
          background: var(--bg-primary);
          padding: 1px 5px;
          border-radius: 3px;
        }
      `}</style>
    </div>
  )
}
