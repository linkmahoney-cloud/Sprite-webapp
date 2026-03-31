import { getGreeting, formatDate } from '../../utils/dateHelpers'
import { useAuth } from '../../contexts/AuthContext'

export default function Header() {
  const { user, signOut } = useAuth()
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Link'
  const initial = firstName[0]?.toUpperCase() || 'L'
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="greeting">{getGreeting()}, {firstName}!</h1>
        <p className="date">{formatDate()}</p>
      </div>
      <div className="header-right">
        <button className="sign-out-btn" onClick={signOut}>Sign out</button>
        {avatarUrl ? (
          <img src={avatarUrl} alt={firstName} className="avatar" />
        ) : (
          <div className="avatar">{initial}</div>
        )}
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

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sign-out-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sign-out-btn:hover {
          border-color: var(--accent-gold);
          color: var(--accent-gold);
        }

        img.avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        div.avatar {
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
