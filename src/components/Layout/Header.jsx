import { getGreeting, formatDate } from '../../utils/dateHelpers'

export default function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="greeting">{getGreeting()}, Link!</h1>
        <p className="date">{formatDate()}</p>
      </div>
      <div className="header-right">
        <div className="avatar">L</div>
      </div>

      <style>{`
        .header {
          height: var(--header-height);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-primary);
        }

        .greeting {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .date {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--accent-gold);
          color: #0d0a14;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
        }
      `}</style>
    </header>
  )
}
