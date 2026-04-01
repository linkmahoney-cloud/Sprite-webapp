import { useState } from 'react'
import { SPRITE_CATEGORIES } from '../../utils/spriteCalc'

const EVENT_COLORS = [
  { name: 'Red', value: '#e74c3c' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Gold', value: '#d4a853' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
]

export default function EventModal({ event, date, onSave, onClose }) {
  const defaultStart = new Date(date)
  defaultStart.setHours(9, 0, 0, 0)
  const defaultEnd = new Date(date)
  defaultEnd.setHours(10, 0, 0, 0)

  const [form, setForm] = useState({
    summary: event?.summary || '',
    description: event?.description || '',
    start: event?.start?.dateTime
      ? new Date(event.start.dateTime).toISOString().slice(0, 16)
      : defaultStart.toISOString().slice(0, 16),
    end: event?.end?.dateTime
      ? new Date(event.end.dateTime).toISOString().slice(0, 16)
      : defaultEnd.toISOString().slice(0, 16),
    color: event?.colorId || '#3b82f6',
    sprite_category: event?.extendedProperties?.private?.sprite_category || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.summary.trim()) return
    onSave({
      summary: form.summary,
      description: form.description,
      start: new Date(form.start).toISOString(),
      end: new Date(form.end).toISOString(),
      color: form.color,
      sprite_category: form.sprite_category || null,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <h3>{event ? 'Edit Event' : 'New Event'}</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input
              type="text"
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Event title..."
              required
              autoFocus
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              rows={2}
            />
          </label>

          <div className="event-form-row">
            <label>
              Start
              <input
                type="datetime-local"
                value={form.start}
                onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
              />
            </label>
            <label>
              End
              <input
                type="datetime-local"
                value={form.end}
                onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
              />
            </label>
          </div>

          <label>Color</label>
          <div className="color-picker">
            {EVENT_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                className={`color-dot ${form.color === c.value ? 'active' : ''}`}
                style={{ background: c.value }}
                onClick={() => setForm(f => ({ ...f, color: c.value }))}
                title={c.name}
              />
            ))}
          </div>

          <label>
            SPRITE Category (optional — adds time to your ring)
            <select
              value={form.sprite_category}
              onChange={e => setForm(f => ({ ...f, sprite_category: e.target.value }))}
            >
              <option value="">None</option>
              {SPRITE_CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.key} — {c.label}</option>
              ))}
            </select>
          </label>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">{event ? 'Save' : 'Create Event'}</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>

        <style>{`
          .event-form-row {
            display: flex;
            gap: 12px;
          }
          .event-form-row label { flex: 1; }
          .modal textarea {
            width: 100%;
            padding: 10px 14px;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
            margin-top: 4px;
          }
          .color-picker {
            display: flex;
            gap: 8px;
            margin-bottom: 14px;
          }
          .color-dot {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 3px solid transparent;
            cursor: pointer;
            transition: border-color 0.2s;
          }
          .color-dot.active {
            border-color: var(--text-primary);
          }
          .color-dot:hover { opacity: 0.8; }
        `}</style>
      </div>
    </div>
  )
}
