import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Header />
        <main className="content">
          {children}
        </main>
      </div>

      <style>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
        }

        .main-area {
          margin-left: var(--sidebar-width);
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .content {
          flex: 1;
          padding: 28px 32px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  )
}
