import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>SPRITE</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          Track your life balance across what matters most.
        </p>
        <button className="google-btn" onClick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 10 }}>
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58z"/>
          </svg>
          Sign in with Google
        </button>
      </div>

      <style>{`
        .login-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: var(--bg-primary);
        }
        .login-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          max-width: 400px;
          width: 100%;
        }
        .google-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #333;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
        }
        .google-btn:hover {
          background: #f0f0f0;
        }
      `}</style>
    </div>
  )
}
