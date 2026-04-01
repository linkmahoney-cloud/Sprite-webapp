import { useState } from 'react'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function MiniCalendar({ selectedDate, onDateSelect }) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const isToday = (day) => {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  }

  const isSelected = (day) => {
    const sel = new Date(selectedDate)
    return sel.getFullYear() === year && sel.getMonth() === month && sel.getDate() === day
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="mini-cal">
      <div className="mini-cal-header">
        <button onClick={prevMonth}>&lt;</button>
        <span>{MONTHS[month]} {year}</span>
        <button onClick={nextMonth}>&gt;</button>
      </div>
      <div className="mini-cal-grid">
        {DAYS.map(d => <div key={d} className="mini-cal-day-label">{d}</div>)}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`mini-cal-cell ${day ? 'has-day' : ''} ${day && isToday(day) ? 'today' : ''} ${day && isSelected(day) ? 'selected' : ''}`}
            onClick={() => day && onDateSelect(new Date(year, month, day))}
          >
            {day || ''}
          </div>
        ))}
      </div>

      <style>{`
        .mini-cal { width: 100%; }
        .mini-cal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .mini-cal-header button {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 16px;
          padding: 4px 8px;
          cursor: pointer;
        }
        .mini-cal-header button:hover { color: var(--accent-gold); }
        .mini-cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .mini-cal-day-label {
          text-align: center;
          font-size: 11px;
          color: var(--text-muted);
          padding: 4px 0;
        }
        .mini-cal-cell {
          text-align: center;
          font-size: 12px;
          padding: 4px 0;
          border-radius: 4px;
          color: var(--text-muted);
        }
        .mini-cal-cell.has-day {
          cursor: pointer;
          color: var(--text-secondary);
        }
        .mini-cal-cell.has-day:hover { background: var(--bg-secondary); }
        .mini-cal-cell.today {
          background: var(--accent-gold);
          color: #0d0a14;
          font-weight: 700;
        }
        .mini-cal-cell.selected {
          outline: 2px solid var(--accent-gold);
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
