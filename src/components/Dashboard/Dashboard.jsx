import { useState, useEffect, useCallback } from 'react'
import SpriteRings from './SpriteRings'
import AgendaBar from './AgendaBar'
import DashboardCard from './DashboardCard'
import LogTimeModal from './LogTimeModal'
import LogFoodModal from './LogFoodModal'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useSpriteScores } from '../../hooks/useSpriteScores'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const { tasks } = useTasks()
  const { projects } = useProjects()
  const { scores, timeLogs, foodLog, addTimeLog, deleteTimeLog, addFoodEntry, deleteFoodEntry } = useSpriteScores()
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [showFoodModal, setShowFoodModal] = useState(false)
  const [emailStats, setEmailStats] = useState(null)
  const [contactStats, setContactStats] = useState(null)
  const [financeStats, setFinanceStats] = useState(null)

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }, [])

  useEffect(() => {
    const loadStats = async () => {
      const token = await getToken()
      if (!token) return

      // Email stats
      try {
        const res = await fetch('/api/email/messages?limit=20', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const emails = await res.json()
          const unread = emails.filter(e => e.isUnread).length
          setEmailStats({ unread, total: emails.length })
        }
      } catch (e) {}

      // Contact stats
      try {
        const [bdayRes, overdueRes] = await Promise.all([
          fetch('/api/contacts/birthdays', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/contacts/overdue', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const bdays = bdayRes.ok ? await bdayRes.json() : []
        const overdue = overdueRes.ok ? await overdueRes.json() : []
        setContactStats({
          birthdaysToday: bdays.filter(b => b.daysUntil === 0).length,
          birthdaysSoon: bdays.length,
          overdueCount: overdue.length,
        })
      } catch (e) {}

      // Finance stats
      try {
        const res = await fetch('/api/finances/summary', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setFinanceStats({
            netSpendable: data.netSpendable,
            totalCurrent: data.totalCurrent,
            surplus: data.surplus,
          })
        }
      } catch (e) {}
    }
    loadStats()
  }, [getToken])

  const todayTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const activeProjects = projects.filter(p => p.status === 'active')

  // Work/Play balance
  const workMin = doneTasks.filter(t => t.type === 'work').reduce((s, t) => s + (t.actual_minutes || 0), 0)
    + timeLogs.filter(l => l.type === 'work').reduce((s, l) => s + l.minutes, 0)
  const playMin = doneTasks.filter(t => t.type === 'play').reduce((s, t) => s + (t.actual_minutes || 0), 0)
    + timeLogs.filter(l => l.type === 'play').reduce((s, l) => s + l.minutes, 0)
  const totalMin = workMin + playMin
  const workRatio = totalMin > 0 ? workMin / totalMin : 0.5

  let balanceLabel = 'Balanced'
  let balanceColor = '#22c55e'
  if (workRatio > 0.75) { balanceLabel = 'Too much work'; balanceColor = '#ef4444' }
  else if (workRatio < 0.25 && totalMin > 0) { balanceLabel = 'Too much play'; balanceColor = '#f59e0b' }

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

        {/* Work/Play Balance */}
        <DashboardCard title="Work / Play Balance">
          <div className="gauge-container">
            <div className="gauge-bar">
              <div className="gauge-fill" style={{ width: `${workRatio * 100}%` }} />
              <div className="gauge-marker" style={{ left: '25%' }} />
              <div className="gauge-marker" style={{ left: '75%' }} />
            </div>
            <div className="gauge-labels">
              <span>Play</span>
              <span style={{ color: balanceColor, fontWeight: 600 }}>{balanceLabel}</span>
              <span>Work</span>
            </div>
            <div className="gauge-stats">
              <span>{workMin}m work</span>
              <span>{playMin}m play</span>
            </div>
          </div>
        </DashboardCard>

        {/* Review / Daily Summary */}
        <DashboardCard title="Daily Review">
          <div className="review-stats">
            <div className="review-stat">
              <span className="review-num">{doneTasks.length}</span>
              <span className="review-label">Tasks Done</span>
            </div>
            <div className="review-stat">
              <span className="review-num">{totalMin}</span>
              <span className="review-label">Min Logged</span>
            </div>
            <div className="review-stat">
              <span className="review-num">{Math.round(scores.reduce((s, sc) => s + sc.score, 0) / 6)}%</span>
              <span className="review-label">Avg Score</span>
            </div>
          </div>
        </DashboardCard>

        {/* Email Summary */}
        <DashboardCard title="Email">
          {emailStats ? (
            <div className="summary-stat-row">
              <span className="summary-big-num" style={{ color: emailStats.unread > 0 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                {emailStats.unread}
              </span>
              <span className="summary-label">unread emails</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Connect Gmail to see inbox.</p>
          )}
        </DashboardCard>

        {/* Contacts Summary */}
        <DashboardCard title="Contacts">
          {contactStats ? (
            <div>
              {contactStats.birthdaysToday > 0 && (
                <div className="summary-stat-row">
                  <span className="summary-big-num" style={{ color: '#f59e0b' }}>{contactStats.birthdaysToday}</span>
                  <span className="summary-label">birthday(s) today!</span>
                </div>
              )}
              {contactStats.birthdaysSoon > 0 && contactStats.birthdaysToday === 0 && (
                <div className="summary-stat-row">
                  <span className="summary-big-num">{contactStats.birthdaysSoon}</span>
                  <span className="summary-label">upcoming birthdays</span>
                </div>
              )}
              <div className="summary-stat-row">
                <span className="summary-big-num" style={{ color: contactStats.overdueCount > 0 ? 'var(--sprite-P)' : 'var(--text-muted)' }}>
                  {contactStats.overdueCount}
                </span>
                <span className="summary-label">overdue reach-outs</span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sync contacts to see stats.</p>
          )}
        </DashboardCard>

        {/* Finances Summary */}
        <DashboardCard title="Finances">
          {financeStats ? (
            <div>
              <div className="summary-stat-row">
                <span className="summary-label">Net Spendable</span>
                <span className="summary-value">${(financeStats.netSpendable || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
              <div className="summary-stat-row">
                <span className="summary-label">Spent</span>
                <span className="summary-value">${(financeStats.totalCurrent || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
              <div className="summary-stat-row" style={{ marginTop: 4 }}>
                <span className="summary-label" style={{ fontWeight: 600 }}>{financeStats.surplus >= 0 ? 'Surplus' : 'Deficit'}</span>
                <span className="summary-value" style={{ color: financeStats.surplus >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                  ${Math.abs(financeStats.surplus || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Set up income to see budget.</p>
          )}
        </DashboardCard>

        {/* Schedule placeholder */}
        <DashboardCard title="Schedule">
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Connect Google Calendar to see today's events.</p>
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
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 6px;
        }
        .dash-list li {
          color: var(--text-primary); font-size: 13px;
          padding: 4px 0; border-bottom: 1px solid var(--border);
        }
        .dash-list li:last-child { border-bottom: none; }
        .log-buttons { display: flex; gap: 8px; margin-bottom: 16px; }
        .today-logs { margin-bottom: 16px; }
        .log-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .log-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--bg-card); border: 1px solid var(--border);
          padding: 4px 12px; border-radius: 16px; font-size: 12px;
          color: var(--text-secondary);
        }
        .log-chip.food-healthy { border-color: #27ae60; color: #27ae60; }
        .log-chip.food-unhealthy { border-color: #e74c3c; color: #e74c3c; }
        .chip-delete {
          background: none; border: none; color: inherit;
          font-size: 16px; cursor: pointer; padding: 0;
          line-height: 1; opacity: 0.6;
        }
        .chip-delete:hover { opacity: 1; }

        /* Gauge */
        .gauge-container { padding: 4px 0; }
        .gauge-bar {
          position: relative; height: 12px; background: var(--bg-primary);
          border-radius: 6px; overflow: hidden; margin-bottom: 6px;
        }
        .gauge-fill {
          height: 100%; border-radius: 6px;
          background: linear-gradient(90deg, #22c55e 0%, #f59e0b 50%, #ef4444 100%);
          transition: width 0.3s;
        }
        .gauge-marker {
          position: absolute; top: 0; width: 2px; height: 100%;
          background: var(--text-muted); opacity: 0.4;
        }
        .gauge-labels {
          display: flex; justify-content: space-between; font-size: 11px;
          color: var(--text-muted);
        }
        .gauge-stats {
          display: flex; justify-content: space-between; font-size: 11px;
          color: var(--text-muted); margin-top: 4px;
        }

        /* Review stats */
        .review-stats { display: flex; gap: 16px; }
        .review-stat { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .review-num { font-size: 20px; font-weight: 700; color: var(--accent-gold); }
        .review-label { font-size: 11px; color: var(--text-muted); }

        /* Summary cards */
        .summary-stat-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 3px 0; font-size: 13px;
        }
        .summary-big-num { font-size: 24px; font-weight: 700; color: var(--accent-gold); margin-right: 8px; }
        .summary-label { color: var(--text-muted); }
        .summary-value { color: var(--text-primary); font-weight: 500; }

        @media (max-width: 1200px) {
          .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 700px) {
          .dashboard-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
