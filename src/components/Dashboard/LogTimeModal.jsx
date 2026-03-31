import { useState } from 'react'
import { SPRITE_CATEGORIES } from '../../utils/spriteCalc'

export default function LogTimeModal({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    sprite_category: 'T',
    minutes: 30,
    description: '',
    type: 'work',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.minutes <= 0) return
    onSubmit(form)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Log Time</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Category
            <select value={form.sprite_category} onChange={e => setForm(f => ({ ...f, sprite_category: e.target.value }))}>
              {SPRITE_CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.key} — {c.label}</option>
              ))}
            </select>
          </label>

          <label>
            Minutes
            <input
              type="number"
              min="1"
              value={form.minutes}
              onChange={e => setForm(f => ({ ...f, minutes: parseInt(e.target.value) || 0 }))}
              required
            />
          </label>

          <label>
            Description
            <input
              type="text"
              placeholder='e.g. "Read Atomic Habits"'
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </label>

          <label>
            Type
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="work">Work</option>
              <option value="play">Play</option>
            </select>
          </label>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">Log Time</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
