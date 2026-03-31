import { useState } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import TaskForm from './TaskForm'
import TaskItem from './TaskItem'

export default function TasksPage() {
  const { tasks, loading, addTask, completeTask, deleteTask } = useTasks()
  const { projects } = useProjects()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all') // all, todo, done

  const filtered = tasks.filter(t => {
    if (filter === 'todo') return t.status !== 'done'
    if (filter === 'done') return t.status === 'done'
    return true
  })

  const handleAdd = async (task) => {
    await addTask(task)
    setShowForm(false)
  }

  return (
    <div>
      <div className="tasks-header">
        <h2>Tasks</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
        <TaskForm
          onSubmit={handleAdd}
          projects={projects}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="task-filters">
        {['all', 'todo', 'done'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'todo' ? 'To Do' : 'Done'}
            {f === 'all' && ` (${tasks.length})`}
            {f === 'todo' && ` (${tasks.filter(t => t.status !== 'done').length})`}
            {f === 'done' && ` (${tasks.filter(t => t.status === 'done').length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading tasks...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', marginTop: 20 }}>
          {filter === 'all' ? 'No tasks yet. Click "+ New Task" to get started.' : 'No tasks in this filter.'}
        </p>
      ) : (
        <div className="task-list">
          {filtered.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={completeTask}
              onDelete={deleteTask}
            />
          ))}
        </div>
      )}

      <style>{`
        .tasks-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .tasks-header h2 { margin: 0; }
        .task-filters {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .filter-btn {
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        .filter-btn.active {
          background: var(--accent-gold);
          color: #0d0a14;
          border-color: var(--accent-gold);
          font-weight: 600;
        }
        .task-list {
          display: flex;
          flex-direction: column;
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
      `}</style>
    </div>
  )
}
