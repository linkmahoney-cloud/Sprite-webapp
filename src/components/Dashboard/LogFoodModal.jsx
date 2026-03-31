import { useState } from 'react'

export default function LogFoodModal({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: '',
    health_rating: 'neutral',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit(form)
    onClose()
  }

  const ratingLabels = {
    healthy: { label: 'Healthy (+3)', color: '#27ae60' },
    neutral: { label: 'Neutral (0)', color: '#f0c864' },
    unhealthy: { label: 'Unhealthy (-10)', color: '#e74c3c' },
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Log Food</h3>
        <form onSubmit={handleSubmit}>
          <label>
            What did you eat?
            <input
              type="text"
              placeholder='e.g. "Grilled chicken salad"'
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </label>

          <label>How healthy was it?</label>
          <div className="rating-options">
            {Object.entries(ratingLabels).map(([key, { label, color }]) => (
              <button
                key={key}
                type="button"
                className={`rating-btn ${form.health_rating === key ? 'active' : ''}`}
                style={{ borderColor: form.health_rating === key ? color : 'var(--border)', color: form.health_rating === key ? color : 'var(--text-muted)' }}
                onClick={() => setForm(f => ({ ...f, health_rating: key }))}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">Log Food</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
