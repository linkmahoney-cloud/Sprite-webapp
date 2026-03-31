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
          position: relative;
        }

        .main-area::after {
          content: '';
          position: fixed;
          right: -40px;
          top: 50%;
          transform: translateY(-50%);
          width: 500px;
          height: 700px;
          background: url('/resurrection-bg.png') no-repeat center;
          background-size: contain;
          opacity: 0.15;
          pointer-events: none;
          z-index: 0;
        }

        .content {
          flex: 1;
          padding: 28px 32px;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}
