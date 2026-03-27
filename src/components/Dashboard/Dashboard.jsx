import SpriteRings from './SpriteRings'
import AgendaBar from './AgendaBar'
import DashboardCard from './DashboardCard'

export default function Dashboard() {
  // Placeholder scores — will be computed from Supabase data later
  const scores = { S: 70, P: 75, R: 68, I: 85, T: 60, E: 55 }

  return (
    <div className="dashboard">
      <SpriteRings scores={scores} />
      <AgendaBar />

      <div className="dashboard-grid">
        <DashboardCard title="Projects">
          <p style={{ color: 'var(--text-muted)' }}>No projects yet — connect Supabase to get started.</p>
        </DashboardCard>

        <DashboardCard title="Tasks">
          <p style={{ color: 'var(--text-muted)' }}>No tasks yet.</p>
        </DashboardCard>

        <DashboardCard title="Schedule">
          <p style={{ color: 'var(--text-muted)' }}>Connect Google Calendar to see today's events.</p>
        </DashboardCard>

        <DashboardCard title="Review">
          <p style={{ color: 'var(--text-muted)' }}>All clear — nothing to review.</p>
        </DashboardCard>
      </div>

      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

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
