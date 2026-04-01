import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '◉' },
  { path: '/tasks', label: 'Tasks', icon: '☑' },
  { path: '/sprite', label: 'SPRITE', icon: '◎' },
  { path: '/sprite/history', label: 'SPRITE History', icon: '📊' },
  { path: '/calendar', label: 'Calendar', icon: '▦' },
  { path: '/email', label: 'Email', icon: '✉' },
  { path: '/messages', label: 'Messages', icon: '💬' },
  { path: '/contacts', label: 'Contacts', icon: '⊕' },
  { path: '/finances', label: 'Finances', icon: '$' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">✦</span>
        <span className="logo-text">SPRITE</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item--active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border);
          position: fixed;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          padding: 24px 0;
          z-index: 100;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 24px;
          margin-bottom: 32px;
        }

        .logo-icon {
          font-size: 24px;
          color: var(--accent-gold);
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 2px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 12px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          text-decoration: none;
        }

        .nav-item:hover {
          background: var(--accent-gold-glow);
          color: var(--text-primary);
        }

        .nav-item--active {
          background: var(--accent-gold);
          color: #0d0a14;
        }

        .nav-item--active:hover {
          background: var(--accent-gold-light);
          color: #0d0a14;
        }

        .nav-icon {
          font-size: 16px;
          width: 20px;
          text-align: center;
        }
      `}</style>
    </aside>
  )
}
