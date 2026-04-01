import { useState, useEffect } from 'react'
import { useEmail } from '../../hooks/useEmail'
import { supabase } from '../../lib/supabase'

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'work', label: 'Work' },
  { key: 'personal', label: 'Personal' },
  { key: 'subscription', label: 'Subscriptions' },
]

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function EmailPage() {
  const { emails, loading, connected, fetchEmails, getEmail, sendEmail, markRead, toggleStar, archive } = useEmail()
  const [category, setCategory] = useState('all')
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [emailDetail, setEmailDetail] = useState(null)
  const [showCompose, setShowCompose] = useState(false)
  const [replyTo, setReplyTo] = useState(null)

  useEffect(() => { fetchEmails(category) }, [category, fetchEmails])

  const connectGoogle = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      window.location.href = `/api/auth/google-services?token=${session.access_token}`
    }
  }

  const openEmail = async (email) => {
    setSelectedEmail(email.id)
    if (email.isUnread) markRead(email.id)
    const detail = await getEmail(email.id)
    setEmailDetail(detail)
  }

  const handleReply = () => {
    if (!emailDetail) return
    setReplyTo(emailDetail)
    setShowCompose(true)
  }

  const handleSend = async ({ to, subject, body }) => {
    await sendEmail({
      to,
      subject,
      body,
      replyTo: replyTo?.id,
      threadId: replyTo?.threadId,
    })
    setShowCompose(false)
    setReplyTo(null)
    fetchEmails(category)
  }

  if (!connected && !loading) {
    return (
      <div>
        <h2 style={{ marginBottom: 20 }}>Email</h2>
        <div className="connect-card">
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            Connect Google Services to manage your Gmail inbox.
          </p>
          <button className="btn-primary" onClick={connectGoogle}>Connect Google Services</button>
        </div>
        <style>{`.connect-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; max-width: 480px; }`}</style>
      </div>
    )
  }

  const unreadCount = emails.filter(e => e.isUnread).length

  return (
    <div className="email-page">
      <div className="email-list-panel">
        <div className="email-toolbar">
          <h2>Email</h2>
          <button className="btn-primary" onClick={() => { setReplyTo(null); setShowCompose(true) }}>Compose</button>
        </div>

        <div className="email-filters">
          {CATEGORIES.map(c => {
            const count = c.key === 'all' ? emails.length : emails.filter(e => e.category === c.key).length
            return (
              <button
                key={c.key}
                className={`filter-btn ${category === c.key ? 'active' : ''}`}
                onClick={() => setCategory(c.key)}
              >
                {c.label} ({count})
              </button>
            )
          })}
        </div>

        {loading ? (
          <p className="email-empty">Loading emails...</p>
        ) : emails.length === 0 ? (
          <p className="email-empty">No emails found.</p>
        ) : (
          <div className="email-list">
            {emails.map(email => {
              const sender = parseSender(email.from)
              return (
                <div
                  key={email.id}
                  className={`email-row ${email.isUnread ? 'unread' : ''} ${selectedEmail === email.id ? 'selected' : ''}`}
                  onClick={() => openEmail(email)}
                >
                  <button
                    className={`star-btn ${email.isStarred ? 'starred' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleStar(email.id, email.isStarred) }}
                  >
                    {email.isStarred ? '★' : '☆'}
                  </button>
                  <div className="email-row-body">
                    <div className="email-row-top">
                      <span className="email-sender">{sender.name}</span>
                      <span className="email-date">{formatDate(email.date)}</span>
                    </div>
                    <div className="email-subject">{email.subject || '(No subject)'}</div>
                    <div className="email-snippet">{email.snippet}</div>
                  </div>
                  <span className={`email-cat-badge ${email.category}`}>{email.category}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="email-detail-panel">
        {emailDetail ? (
          <div className="email-detail">
            <div className="email-detail-header">
              <h3>{emailDetail.subject || '(No subject)'}</h3>
              <div className="email-detail-meta">
                <span>From: {emailDetail.from}</span>
                <span>To: {emailDetail.to}</span>
                <span>{new Date(emailDetail.date).toLocaleString()}</span>
              </div>
              <div className="email-detail-actions">
                <button className="btn-secondary" onClick={handleReply}>Reply</button>
                <button className="btn-secondary" onClick={() => archive(emailDetail.id)}>Archive</button>
              </div>
            </div>
            <div
              className="email-body"
              dangerouslySetInnerHTML={{ __html: emailDetail.body }}
            />
          </div>
        ) : (
          <div className="email-empty-detail">
            <p>Select an email to read</p>
          </div>
        )}
      </div>

      {showCompose && (
        <ComposeModal
          replyTo={replyTo}
          onSend={handleSend}
          onClose={() => { setShowCompose(false); setReplyTo(null) }}
        />
      )}

      <style>{`
        .email-page { display: flex; gap: 0; height: calc(100vh - var(--header-height) - 56px); }
        .email-list-panel {
          width: 420px;
          min-width: 420px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .email-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px 12px;
        }
        .email-toolbar h2 { margin: 0; font-size: 20px; }
        .email-filters {
          display: flex;
          gap: 4px;
          padding: 0 16px 12px;
        }
        .filter-btn {
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .filter-btn.active {
          background: var(--accent-gold);
          color: #0d0a14;
          border-color: var(--accent-gold);
          font-weight: 600;
        }
        .email-list { flex: 1; overflow-y: auto; }
        .email-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: background 0.1s;
        }
        .email-row:hover { background: var(--bg-secondary); }
        .email-row.selected { background: var(--bg-card); border-left: 3px solid var(--accent-gold); }
        .email-row.unread .email-sender { color: var(--text-primary); font-weight: 700; }
        .email-row.unread .email-subject { color: var(--text-primary); font-weight: 600; }
        .star-btn {
          background: none;
          border: none;
          font-size: 16px;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0;
          margin-top: 2px;
        }
        .star-btn.starred { color: #f6bf26; }
        .email-row-body { flex: 1; min-width: 0; }
        .email-row-top { display: flex; justify-content: space-between; align-items: center; }
        .email-sender { font-size: 13px; color: var(--text-secondary); }
        .email-date { font-size: 11px; color: var(--text-muted); }
        .email-subject {
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }
        .email-snippet {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }
        .email-cat-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--bg-primary);
          color: var(--text-muted);
          white-space: nowrap;
          margin-top: 2px;
        }
        .email-cat-badge.work { color: #3b82f6; border: 1px solid #3b82f644; }
        .email-cat-badge.personal { color: #22c55e; border: 1px solid #22c55e44; }
        .email-cat-badge.subscription { color: #6b7280; border: 1px solid #6b728044; }
        .email-detail-panel { flex: 1; overflow-y: auto; padding: 0 20px; }
        .email-detail-header { padding: 16px 0; border-bottom: 1px solid var(--border); }
        .email-detail-header h3 { font-size: 18px; margin-bottom: 8px; }
        .email-detail-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .email-detail-actions { display: flex; gap: 8px; margin-top: 12px; }
        .email-body {
          padding: 16px 0;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-primary);
          overflow-wrap: break-word;
        }
        .email-body img { max-width: 100%; }
        .email-body a { color: var(--accent-gold); }
        .email-empty { color: var(--text-muted); padding: 20px 16px; }
        .email-empty-detail {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}

function ComposeModal({ replyTo, onSend, onClose }) {
  const sender = replyTo ? parseSender(replyTo.from) : null
  const [to, setTo] = useState(sender?.email || '')
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '')
  const [body, setBody] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!to.trim() || !body.trim()) return
    onSend({ to, subject, body })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <h3>{replyTo ? 'Reply' : 'New Email'}</h3>
        <form onSubmit={handleSubmit}>
          <label>
            To
            <input type="email" value={to} onChange={e => setTo(e.target.value)} required />
          </label>
          <label>
            Subject
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} />
          </label>
          <label>
            Message
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              required
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical', marginTop: 4 }}
            />
          </label>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">Send</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function parseSender(from) {
  const match = from?.match(/^"?(.+?)"?\s*<(.+?)>$/)
  if (match) return { name: match[1], email: match[2] }
  return { name: from, email: from }
}
