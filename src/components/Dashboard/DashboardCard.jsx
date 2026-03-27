export default function DashboardCard({ title, children }) {
  return (
    <div className="dash-card">
      <h4 className="dash-card-title">{title}</h4>
      <div className="dash-card-body">{children}</div>

      <style>{`
        .dash-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          min-height: 200px;
        }

        .dash-card-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 2px;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .dash-card-body {
          color: var(--text-primary);
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}
