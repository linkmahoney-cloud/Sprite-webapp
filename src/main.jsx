import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
    this.setState({ info })
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#0a0a0f', color: '#ff6b6b', padding: 32, minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#ffaaaa' }}>{this.state.error.message}</p>
          <h3 style={{ color: '#888', marginTop: 24 }}>Stack</h3>
          <pre style={{ color: '#888', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error.stack}</pre>
          {this.state.info && (
            <>
              <h3 style={{ color: '#888', marginTop: 24 }}>Component Stack</h3>
              <pre style={{ color: '#888', fontSize: 11, whiteSpace: 'pre-wrap' }}>{this.state.info.componentStack}</pre>
            </>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
