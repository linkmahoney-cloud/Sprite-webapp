import { SPRITE_CATEGORIES } from '../../utils/spriteCalc'

const priorityColors = { high: '#e74c3c', medium: '#f0c864', low: '#5a5a6e' }

export default function TaskItem({ task, onComplete, onDelete }) {
  const cat = SPRITE_CATEGORIES.find(c => c.key === task.sprite_category)
  const isDone = task.status === 'done'

  return (
    <div className={`task-item ${isDone ? 'done' : ''}`}>
      <button
        className="task-check"
        onClick={() => !isDone && onComplete(task.id, task.estimated_minutes)}
        style={{ borderColor: cat?.color || '#888' }}
      >
        {isDone && '✓'}
      </button>

      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.description && <div className="task-desc">{task.description}</div>}
        <div className="task-meta">
          <span className="task-tag" style={{ color: cat?.color }}>{cat?.key}</span>
          <span className="task-tag">{task.type}</span>
          <span className="task-tag" style={{ color: priorityColors[task.priority] }}>{task.priority}</span>
          <span className="task-tag">{task.estimated_minutes}m</span>
          {task.due_date && <span className="task-tag">{task.due_date}</span>}
        </div>
      </div>

      <button className="task-delete" onClick={() => onDelete(task.id)}>×</button>

      <style>{`
        .task-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          transition: opacity 0.2s;
        }
        .task-item.done { opacity: 0.5; }
        .task-check {
          width: 24px;
          height: 24px;
          min-width: 24px;
          border-radius: 50%;
          border: 2px solid;
          background: none;
          color: var(--accent-gold);
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .task-body { flex: 1; min-width: 0; }
        .task-title {
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
        }
        .task-desc {
          color: var(--text-muted);
          font-size: 13px;
          margin-top: 2px;
        }
        .task-meta {
          display: flex;
          gap: 8px;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .task-tag {
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg-primary);
          padding: 2px 8px;
          border-radius: 4px;
        }
        .task-delete {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 20px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .task-delete:hover { color: #e74c3c; }
      `}</style>
    </div>
  )
}
