const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function getEventTimes(event) {
  const start = new Date(event.start?.dateTime || event.start?.date)
  const end = new Date(event.end?.dateTime || event.end?.date)
  const startMin = start.getHours() * 60 + start.getMinutes()
  const endMin = end.getHours() * 60 + end.getMinutes()
  return { startMin, endMin: Math.max(endMin, startMin + 15) }
}

function getEventColor(event) {
  const colorMap = {
    '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
    '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
    '9': '#3f51b5', '10': '#0b8043', '11': '#d50000',
  }
  return colorMap[event.colorId] || event.color || '#3b82f6'
}

function layoutEvents(events) {
  const items = events
    .filter(e => e.start?.dateTime)
    .map(e => ({ event: e, ...getEventTimes(e) }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  if (items.length === 0) return []

  const clusters = []
  let currentCluster = [items[0]]
  let clusterEnd = items[0].endMin

  for (let i = 1; i < items.length; i++) {
    if (items[i].startMin < clusterEnd) {
      currentCluster.push(items[i])
      clusterEnd = Math.max(clusterEnd, items[i].endMin)
    } else {
      clusters.push(currentCluster)
      currentCluster = [items[i]]
      clusterEnd = items[i].endMin
    }
  }
  clusters.push(currentCluster)

  const result = []
  for (const cluster of clusters) {
    const columns = []
    const clusterItems = []

    for (const item of cluster) {
      let placed = false
      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1]
        if (item.startMin >= lastInCol.endMin) {
          columns[col].push(item)
          clusterItems.push({ ...item, col })
          placed = true
          break
        }
      }
      if (!placed) {
        columns.push([item])
        clusterItems.push({ ...item, col: columns.length - 1 })
      }
    }

    const totalCols = columns.length
    for (const ci of clusterItems) {
      result.push({ ...ci, totalCols })
    }
  }

  return result
}

export default function DayView({ events, date, onEventClick, onSlotClick }) {
  const dayEvents = events.filter(e => {
    const eDate = new Date(e.start?.dateTime || e.start?.date)
    return eDate.toDateString() === date.toDateString()
  })

  const layouted = layoutEvents(dayEvents)

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

        <div className="events-container">
          {layouted.map(({ event, startMin, endMin, col, totalCols }) => {
            const color = getEventColor(event)
            const sprite = event.extendedProperties?.private?.sprite_category
            const height = Math.max(endMin - startMin, 20)
            const leftPct = (col / totalCols) * 100
            const widthPct = (1 / totalCols) * 100

            return (
              <div
                key={event.id}
                className="cal-event"
                style={{
                  top: `${startMin}px`,
                  height: `${height}px`,
                  left: `${leftPct}%`,
                  width: `calc(${widthPct}% - 4px)`,
                  borderLeft: `3px solid ${color}`,
                  background: `${color}22`,
                }}
                onClick={(e) => { e.stopPropagation(); onEventClick?.(event) }}
              >
                <div className="cal-event-title">{event.summary || '(No title)'}</div>
                {height >= 30 && (
                  <div className="cal-event-time">
                    {new Date(event.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {' – '}
                    {new Date(event.end.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
                {sprite && <span className="cal-event-sprite">{sprite}</span>}
              </div>
            )
          })}
        </div>
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
        .events-container {
          position: absolute;
          top: 0;
          left: 78px;
          right: 8px;
          bottom: 0;
          pointer-events: none;
        }
        .cal-event {
          position: absolute;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          overflow: hidden;
          z-index: 1;
          transition: opacity 0.15s;
          box-sizing: border-box;
          pointer-events: auto;
        }
        .cal-event:hover { opacity: 0.85; z-index: 2; }
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
