import { useState } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'

export default function AgendaBar() {
  const [value, setValue] = useState('')
  const [tab, setTab] = useState('tasks')
  const { tasks, addTask } = useTasks()
  const { projects } = useProjects()

  const todayStr = new Date().toISOString().slice(0, 10)

  const todayTasks = tasks.filter(t => {
    if (t.status === 'done') return false
    if (t.due_date === todayStr) return true
    if (!t.due_date) return true
    return false
  }).slice(0, 5)

  const activeProjects = projects.filter(p => p.status === 'active').slice(0, 5)

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && value.trim()) {
      await addTask({
        title: value.trim(),
        sprite_category: 'T',
        type: 'work',
        priority: 'medium',
        estimated_minutes: 30,
        due_date: todayStr,
      })
      setValue('')
    }
  }

  return (
    <div className="agenda-bar">
      <input
        type="text"
        placeholder="Quick add task — press Enter..."
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="agenda-input"
      />
      <div className="agenda-tabs">
        {['tasks', 'projects'].map(t => (
          <button
            key={t}
            className={`agenda-tab ${tab === t ? 'agenda-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="agenda-items">
        {tab === 'tasks' && (
          todayTasks.length === 0
            ? <p className="agenda-empty">No pending tasks. Add one above.</p>
            : todayTasks.map(t => (
                <div key={t.id} className="agenda-item">
                  <span className="agenda-dot" style={{ background: getCatColor(t.sprite_category) }} />
                  <span className="agenda-item-title">{t.title}</span>
                  <span className="agenda-item-meta">{t.estimated_minutes}m</span>
                </div>
              ))
        )}
        {tab === 'projects' && (
          activeProjects.length === 0
            ? <p className="agenda-empty">No active projects.</p>
            : activeProjects.map(p => (
                <div key={p.id} className="agenda-item">
                  <span className="agenda-dot" style={{ background: 'var(--accent-gold)' }} />
                  <span className="agenda-item-title">{p.name}</span>
                </div>
              ))
        )}
      </div>

      <style>{`
        .agenda-bar {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 28px;
        }
        .agenda-input {
          width: 100%;
          background: transparent;
          border: none;
          font-size: 16px;
          color: var(--text-primary);
          margin-bottom: 14px;
          padding: 0;
        }
        .agenda-input::placeholder { color: var(--text-muted); }
        .agenda-input:focus { outline: none; }
        .agenda-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
        .agenda-tab {
          padding: 8px 18px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .agenda-tab:hover {
          border-color: var(--accent-gold);
          color: var(--text-primary);
        }
        .agenda-tab--active {
          background: var(--accent-gold);
          color: #0d0a14;
          border-color: var(--accent-gold);
        }
        .agenda-items {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .agenda-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
          border-bottom: 1px solid var(--border);
        }
        .agenda-item:last-child { border-bottom: none; }
        .agenda-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .agenda-item-title {
          flex: 1;
          font-size: 13px;
          color: var(--text-primary);
        }
        .agenda-item-meta {
          font-size: 11px;
          color: var(--text-muted);
        }
        .agenda-empty {
          color: var(--text-muted);
          font-size: 13px;
          margin: 0;
        }
      `}</style>
    </div>
  )
}

const CAT_COLORS = { S: '#a855f7', P: '#ec4899', R: '#f97316', I: '#3b82f6', T: '#eab308', E: '#f59e0b' }
function getCatColor(key) { return CAT_COLORS[key] || '#888' }
