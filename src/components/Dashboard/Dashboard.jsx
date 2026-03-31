import { useState } from 'react'
import SpriteRings from './SpriteRings'
import AgendaBar from './AgendaBar'
import DashboardCard from './DashboardCard'
import LogTimeModal from './LogTimeModal'
import LogFoodModal from './LogFoodModal'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useSpriteScores } from '../../hooks/useSpriteScores'

export default function Dashboard() {
  const { tasks } = useTasks()
  const { projects } = useProjects()
  const { scores, timeLogs, foodLog, addTimeLog, deleteTimeLog, addFoodEntry, deleteFoodEntry } = useSpriteScores()
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [showFoodModal, setShowFoodModal] = useState(false)

  const todayTasks = tasks.filter(t => t.status !== 'done')
  const activeProjects = projects.filter(p => p.status === 'active')

  return (
    <div className="dashboard">
      <SpriteRings scores={scores} onRingClick={() => setShowTimeModal(true)} />

      <div className="log-buttons">
        <button className="btn-secondary" onClick={() => setShowTimeModal(true)}>Log Time</button>
        <button className="btn-secondary" onClick={() => setShowFoodModal(true)}>Log Food</button>
      </div>

      {timeLogs.length > 0 && (
        <div className="today-logs">
          <h4 style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>Today's Time Logs</h4>
          <div className="log-chips">
            {timeLogs.map(log => (
              <span key={log.id} className="log-chip">
                {log.sprite_category} · {log.minutes}m {log.description && `· ${log.description}`}
                <button className="chip-delete" onClick={() => deleteTimeLog(log.id)}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {foodLog.length > 0 && (
        <div className="today-logs">
          <h4 style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>Today's Food Log</h4>
          <div className="log-chips">
            {foodLog.map(entry => (
              <span key={entry.id} className={`log-chip food-${entry.health_rating}`}>
                {entry.name} ({entry.health_rating})
                <button className="chip-delete" onClick={() => deleteFoodEntry(entry.id)}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <AgendaBar />

      <div className="dashboard-grid">
        <DashboardCard title="Projects">
          {activeProjects.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No active projects.</p>
          ) : (
            <ul className="dash-list">
              {activeProjects.slice(0, 4).map(p => (
                <li key={p.id}>{p.name}</li>
              ))}
              {activeProjects.length > 4 && (
                <li style={{ color: 'var(--text-muted)' }}>+{activeProjects.length - 4} more</li>
              )}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Tasks">
          {todayTasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>All clear — no pending tasks.</p>
          ) : (
            <ul className="dash-list">
              {todayTasks.slice(0, 4).map(t => (
                <li key={t.id}>{t.title}</li>
              ))}
              {todayTasks.length > 4 && (
                <li style={{ color: 'var(--text-muted)' }}>+{todayTasks.length - 4} more</li>
              )}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Schedule">
          <p style={{ color: 'var(--text-muted)' }}>Connect Google Calendar to see today's events.</p>
        </DashboardCard>

        <DashboardCard title="Review">
          <p style={{ color: 'var(--text-muted)' }}>All clear — nothing to review.</p>
        </DashboardCard>
      </div>

      {showTimeModal && <LogTimeModal onSubmit={addTimeLog} onClose={() => setShowTimeModal(false)} />}
      {showFoodModal && <LogFoodModal onSubmit={addFoodEntry} onClose={() => setShowFoodModal(false)} />}

      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .dash-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .dash-list li {
          color: var(--text-primary);
          font-size: 13px;
          padding: 4px 0;
          border-bottom: 1px solid var(--border);
        }
        .dash-list li:last-child { border-bottom: none; }
        .log-buttons {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .today-logs {
          margin-bottom: 16px;
        }
        .log-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .log-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .log-chip.food-healthy { border-color: #27ae60; color: #27ae60; }
        .log-chip.food-unhealthy { border-color: #e74c3c; color: #e74c3c; }
        .chip-delete {
          background: none;
          border: none;
          color: inherit;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          opacity: 0.6;
        }
        .chip-delete:hover { opacity: 1; }

        @media (max-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
