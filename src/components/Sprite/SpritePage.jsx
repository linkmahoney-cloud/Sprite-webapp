import { useState } from 'react'
import { useSpriteScores } from '../../hooks/useSpriteScores'
import { SPRITE_CATEGORIES, getDailyGoal } from '../../utils/spriteCalc'
import { getDayOfWeek } from '../../utils/dateHelpers'
import LogTimeModal from '../Dashboard/LogTimeModal'
import LogFoodModal from '../Dashboard/LogFoodModal'

export default function SpritePage() {
  const { scores, timeLogs, foodLog, addTimeLog, deleteTimeLog, addFoodEntry, deleteFoodEntry } = useSpriteScores()
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [showFoodModal, setShowFoodModal] = useState(false)
  const dayOfWeek = getDayOfWeek()

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div>
      <div className="sprite-header">
        <h2>SPRITE Breakdown</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => setShowTimeModal(true)}>Log Time</button>
          <button className="btn-secondary" onClick={() => setShowFoodModal(true)}>Log Food</button>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Today is {dayNames[dayOfWeek]}. Scores update as you complete tasks and log time.
      </p>

      <div className="sprite-grid">
        {SPRITE_CATEGORIES.map(cat => {
          const goal = getDailyGoal(cat.key, dayOfWeek)
          const logged = timeLogs.filter(l => l.sprite_category === cat.key).reduce((sum, l) => sum + l.minutes, 0)

          return (
            <div key={cat.key} className="sprite-detail-card">
              <div className="sprite-detail-header">
                <span className="sprite-letter" style={{ color: cat.color }}>{cat.key}</span>
                <span className="sprite-label">{cat.label}</span>
                <span className="sprite-score" style={{ color: cat.color }}>{Math.round(scores[cat.key])}%</span>
              </div>
              <div className="sprite-bar-bg">
                <div
                  className="sprite-bar-fill"
                  style={{ width: `${Math.min(scores[cat.key], 100)}%`, background: cat.color }}
                />
              </div>
              <div className="sprite-detail-meta">
                <span>{logged}m / {goal}m goal</span>
              </div>
            </div>
          )
        })}
      </div>

      {timeLogs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Today's Time Logs</h3>
          <div className="log-table">
            {timeLogs.map(log => (
              <div key={log.id} className="log-row">
                <span className="log-cat" style={{ color: SPRITE_CATEGORIES.find(c => c.key === log.sprite_category)?.color }}>
                  {log.sprite_category}
                </span>
                <span className="log-mins">{log.minutes}m</span>
                <span className="log-desc">{log.description || '—'}</span>
                <span className="log-type">{log.type}</span>
                <button className="chip-delete" onClick={() => deleteTimeLog(log.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {foodLog.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Today's Food Log</h3>
          <div className="log-table">
            {foodLog.map(entry => (
              <div key={entry.id} className="log-row">
                <span style={{ color: entry.health_rating === 'healthy' ? '#27ae60' : entry.health_rating === 'unhealthy' ? '#e74c3c' : 'var(--text-secondary)' }}>
                  {entry.health_rating}
                </span>
                <span className="log-desc">{entry.name}</span>
                <span className="log-mins">{entry.penalty > 0 ? `+${entry.penalty}` : entry.penalty}</span>
                <button className="chip-delete" onClick={() => deleteFoodEntry(entry.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTimeModal && <LogTimeModal onSubmit={addTimeLog} onClose={() => setShowTimeModal(false)} />}
      {showFoodModal && <LogFoodModal onSubmit={addFoodEntry} onClose={() => setShowFoodModal(false)} />}

      <style>{`
        .sprite-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .sprite-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .sprite-detail-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
        }
        .sprite-detail-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .sprite-letter {
          font-size: 20px;
          font-weight: 700;
        }
        .sprite-label {
          color: var(--text-secondary);
          font-size: 14px;
          flex: 1;
        }
        .sprite-score {
          font-size: 18px;
          font-weight: 700;
        }
        .sprite-bar-bg {
          height: 6px;
          background: var(--bg-primary);
          border-radius: 3px;
          overflow: hidden;
        }
        .sprite-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .sprite-detail-meta {
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .log-table {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .log-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 13px;
        }
        .log-cat { font-weight: 700; min-width: 20px; }
        .log-mins { color: var(--text-secondary); min-width: 40px; }
        .log-desc { color: var(--text-primary); flex: 1; }
        .log-type { color: var(--text-muted); }

        @media (max-width: 700px) {
          .sprite-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
