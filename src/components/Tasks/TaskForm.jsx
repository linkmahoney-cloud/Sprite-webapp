import { useState } from 'react'
import { SPRITE_CATEGORIES } from '../../utils/spriteCalc'

export default function TaskForm({ onSubmit, projects = [], onCancel }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    sprite_category: 'T',
    type: 'work',
    priority: 'medium',
    estimated_minutes: 30,
    due_date: '',
    project_id: null,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit({
      ...form,
      due_date: form.due_date || null,
      project_id: form.project_id || null,
    })
    setForm({ title: '', description: '', sprite_category: 'T', type: 'work', priority: 'medium', estimated_minutes: 30, due_date: '', project_id: null })
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Task title..."
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        required
      />

      <textarea
        placeholder="Description (optional)"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        rows={2}
      />

      <div className="form-row">
        <label>
          Category
          <select value={form.sprite_category} onChange={e => setForm(f => ({ ...f, sprite_category: e.target.value }))}>
            {SPRITE_CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>{c.key} — {c.label}</option>
            ))}
          </select>
        </label>

        <label>
          Type
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="work">Work</option>
            <option value="play">Play</option>
          </select>
        </label>

        <label>
          Priority
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label>
          Est. minutes
          <input
            type="number"
            min="1"
            value={form.estimated_minutes}
            onChange={e => setForm(f => ({ ...f, estimated_minutes: parseInt(e.target.value) || 0 }))}
          />
        </label>

        <label>
          Due date
          <input
            type="date"
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          />
        </label>

        {projects.length > 0 && (
          <label>
            Project
            <select value={form.project_id || ''} onChange={e => setForm(f => ({ ...f, project_id: e.target.value || null }))}>
              <option value="">None</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">Add Task</button>
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
      </div>

      <style>{`
        .task-form {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .task-form input[type="text"],
        .task-form textarea {
          width: 100%;
          padding: 10px 14px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }
        .form-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .form-row label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .form-row select,
        .form-row input[type="number"],
        .form-row input[type="date"] {
          padding: 8px 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 13px;
        }
        .form-actions {
          display: flex;
          gap: 8px;
        }
        .btn-primary {
          background: var(--accent-gold);
          color: #0d0a14;
          border: none;
          padding: 8px 20px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-primary:hover { opacity: 0.9; }
        .btn-secondary {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-secondary:hover { border-color: var(--text-muted); }
      `}</style>
    </form>
  )
}
