import { useState } from 'react'

export default function AgendaBar() {
  const [value, setValue] = useState('')

  return (
    <div className="agenda-bar">
      <input
        type="text"
        placeholder="What's on the agenda, Link?"
        value={value}
        onChange={e => setValue(e.target.value)}
        className="agenda-input"
      />
      <div className="agenda-tabs">
        <button className="agenda-tab agenda-tab--active">Tasks</button>
        <button className="agenda-tab">Projects</button>
        <button className="agenda-tab">Contacts</button>
      </div>

      <style>{`
        .agenda-bar {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 28px;
        }

        .agenda-input {
          width: 100%;
          background: transparent;
          border: none;
          font-size: 16px;
          color: var(--text-primary);
          margin-bottom: 14px;
          padding: 0;
        }

        .agenda-input::placeholder {
          color: var(--text-muted);
        }

        .agenda-input:focus {
          outline: none;
          border: none;
        }

        .agenda-tabs {
          display: flex;
          gap: 8px;
        }

        .agenda-tab {
          padding: 8px 18px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .agenda-tab:hover {
          border-color: var(--accent-gold);
          color: var(--text-primary);
        }

        .agenda-tab--active {
          background: var(--accent-gold);
          color: #0d0a14;
          border-color: var(--accent-gold);
        }
      `}</style>
    </div>
  )
}
