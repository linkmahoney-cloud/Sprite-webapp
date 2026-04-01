import { useState, useEffect } from 'react'
import { useContacts } from '../../hooks/useContacts'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'work', label: 'Work' },
  { key: 'personal', label: 'Personal' },
]

const INTERACTION_TYPES = ['email', 'meeting', 'call', 'text', 'social', 'other']

export default function ContactsPage() {
  const {
    contacts, birthdays, overdue, loading, syncing,
    fetchContacts, fetchBirthdays, fetchOverdue, syncContacts,
    getContact, addContact, deleteContact, logInteraction,
  } = useContacts()

  const [tab, setTab] = useState('all')
  const [sort, setSort] = useState('recency')
  const [selectedContact, setSelectedContact] = useState(null)
  const [contactDetail, setContactDetail] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showLogInteraction, setShowLogInteraction] = useState(null)
  const [view, setView] = useState('contacts')

  useEffect(() => {
    fetchContacts(tab, sort)
  }, [tab, sort, fetchContacts])

  useEffect(() => {
    fetchBirthdays()
    fetchOverdue()
  }, [fetchBirthdays, fetchOverdue])

  const openContact = async (contact) => {
    setSelectedContact(contact.id)
    const detail = await getContact(contact.id)
    setContactDetail(detail)
  }

  const handleSync = async () => {
    const count = await syncContacts()
    if (count > 0) fetchBirthdays()
  }

  const handleLogInteraction = async (type, description) => {
    if (!showLogInteraction) return
    await logInteraction(showLogInteraction, type, description)
    setShowLogInteraction(null)
    if (selectedContact) {
      const detail = await getContact(selectedContact)
      setContactDetail(detail)
    }
    fetchOverdue()
  }

  return (
    <div className="contacts-page">
      <div className="contacts-list-panel">
        <div className="contacts-toolbar">
          <h2>Contacts</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-secondary" onClick={handleSync} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add</button>
          </div>
        </div>

        <div className="contacts-views">
          <button className={`view-btn ${view === 'contacts' ? 'active' : ''}`} onClick={() => setView('contacts')}>
            Contacts ({contacts.length})
          </button>
          <button className={`view-btn ${view === 'birthdays' ? 'active' : ''}`} onClick={() => setView('birthdays')}>
            Birthdays ({birthdays.length})
          </button>
          <button className={`view-btn ${view === 'overdue' ? 'active' : ''}`} onClick={() => setView('overdue')}>
            Reach Out ({overdue.length})
          </button>
        </div>

        {view === 'contacts' && (
          <>
            <div className="contacts-filters">
              <div style={{ display: 'flex', gap: 4 }}>
                {TABS.map(t => (
                  <button
                    key={t.key}
                    className={`filter-btn ${tab === t.key ? 'active' : ''}`}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="recency">Least Recent</option>
                <option value="frequency">Most Frequent</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>

            <div className="contacts-list">
              {loading ? (
                <p className="contacts-empty">Loading contacts...</p>
              ) : contacts.length === 0 ? (
                <p className="contacts-empty">No contacts yet. Sync from Google or add manually.</p>
              ) : (
                contacts.map(c => (
                  <div
                    key={c.id}
                    className={`contact-row ${selectedContact === c.id ? 'selected' : ''}`}
                    onClick={() => openContact(c)}
                  >
                    <div className="contact-avatar">
                      {c.photo_url ? <img src={c.photo_url} alt="" /> : c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="contact-row-body">
                      <div className="contact-name">{c.name}</div>
                      <div className="contact-sub">{c.company || c.email || c.phone || ''}</div>
                    </div>
                    <span className={`contact-cat ${c.category}`}>{c.category}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {view === 'birthdays' && (
          <div className="contacts-list">
            {birthdays.length === 0 ? (
              <p className="contacts-empty">No upcoming birthdays in the next 30 days.</p>
            ) : (
              birthdays.map(b => (
                <div key={b.id} className="contact-row" onClick={() => openContact(b)}>
                  <div className="contact-avatar">
                    {b.photo_url ? <img src={b.photo_url} alt="" /> : b.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="contact-row-body">
                    <div className="contact-name">{b.name}</div>
                    <div className="contact-sub">
                      {b.daysUntil === 0 ? 'Today!' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil} days`}
                      {' — '}{new Date(b.nextBirthday).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <span style={{ fontSize: 18 }}>{b.daysUntil === 0 ? '🎂' : '🎁'}</span>
                </div>
              ))
            )}
          </div>
        )}

        {view === 'overdue' && (
          <div className="contacts-list">
            {overdue.length === 0 ? (
              <p className="contacts-empty">You're all caught up!</p>
            ) : (
              overdue.map(c => (
                <div key={c.id} className="contact-row" onClick={() => openContact(c)}>
                  <div className="contact-avatar">
                    {c.photo_url ? <img src={c.photo_url} alt="" /> : c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="contact-row-body">
                    <div className="contact-name">{c.name}</div>
                    <div className="contact-sub" style={{ color: 'var(--sprite-P)' }}>
                      {c.daysSince ? `${c.daysSince} days ago` : 'Never contacted'}
                    </div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={(e) => { e.stopPropagation(); setShowLogInteraction(c.id) }}
                  >
                    Log
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="contact-detail-panel">
        {contactDetail ? (
          <div className="contact-detail">
            <div className="contact-detail-header">
              <div className="contact-detail-avatar">
                {contactDetail.photo_url
                  ? <img src={contactDetail.photo_url} alt="" />
                  : contactDetail.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3>{contactDetail.name}</h3>
                {contactDetail.job_title && contactDetail.company && (
                  <p className="contact-detail-role">{contactDetail.job_title} at {contactDetail.company}</p>
                )}
                {!contactDetail.job_title && contactDetail.company && (
                  <p className="contact-detail-role">{contactDetail.company}</p>
                )}
              </div>
            </div>

            <div className="contact-detail-info">
              {contactDetail.email && (
                <div className="info-row"><span className="info-label">Email</span><span>{contactDetail.email}</span></div>
              )}
              {contactDetail.phone && (
                <div className="info-row"><span className="info-label">Phone</span><span>{contactDetail.phone}</span></div>
              )}
              {contactDetail.birthday && (
                <div className="info-row"><span className="info-label">Birthday</span><span>{new Date(contactDetail.birthday).toLocaleDateString([], { month: 'long', day: 'numeric' })}</span></div>
              )}
              {contactDetail.last_contacted_at && (
                <div className="info-row"><span className="info-label">Last Contact</span><span>{new Date(contactDetail.last_contacted_at).toLocaleDateString()}</span></div>
              )}
              {contactDetail.notes && (
                <div className="info-row"><span className="info-label">Notes</span><span>{contactDetail.notes}</span></div>
              )}
            </div>

            <div className="contact-detail-actions">
              <button className="btn-primary" onClick={() => setShowLogInteraction(contactDetail.id)}>Log Interaction</button>
              <button className="btn-secondary" onClick={() => { deleteContact(contactDetail.id); setContactDetail(null); setSelectedContact(null) }}>Delete</button>
            </div>

            <div className="interaction-history">
              <h4>Interaction History</h4>
              {(contactDetail.interactions || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No interactions logged yet.</p>
              ) : (
                contactDetail.interactions.map(i => (
                  <div key={i.id} className="interaction-item">
                    <span className="interaction-type">{i.type}</span>
                    <span className="interaction-desc">{i.description || '—'}</span>
                    <span className="interaction-date">{new Date(i.occurred_at).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="contacts-empty-detail">
            <p>Select a contact to view details</p>
          </div>
        )}
      </div>

      {showAdd && <AddContactModal onAdd={addContact} onClose={() => setShowAdd(false)} />}

      {showLogInteraction && (
        <LogInteractionModal onLog={handleLogInteraction} onClose={() => setShowLogInteraction(null)} />
      )}

      <style>{`
        .contacts-page { display: flex; height: calc(100vh - var(--header-height) - 56px); }
        .contacts-list-panel {
          width: 400px; min-width: 400px; border-right: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .contacts-toolbar {
          display: flex; align-items: center; justify-content: space-between; padding: 0 16px 12px;
        }
        .contacts-toolbar h2 { margin: 0; font-size: 20px; }
        .contacts-views { display: flex; gap: 0; padding: 0 16px 12px; }
        .view-btn {
          flex: 1; background: var(--bg-card); border: 1px solid var(--border);
          color: var(--text-muted); padding: 6px 8px; font-size: 12px; cursor: pointer;
        }
        .view-btn:first-child { border-radius: 6px 0 0 6px; }
        .view-btn:last-child { border-radius: 0 6px 6px 0; }
        .view-btn.active {
          background: var(--accent-gold); color: #0d0a14;
          border-color: var(--accent-gold); font-weight: 600;
        }
        .contacts-filters {
          display: flex; justify-content: space-between; align-items: center; padding: 0 16px 10px;
        }
        .filter-btn {
          background: var(--bg-card); border: 1px solid var(--border);
          color: var(--text-muted); padding: 4px 10px; border-radius: 6px;
          font-size: 12px; cursor: pointer;
        }
        .filter-btn.active {
          background: var(--accent-gold); color: #0d0a14;
          border-color: var(--accent-gold); font-weight: 600;
        }
        .sort-select {
          background: var(--bg-primary); border: 1px solid var(--border);
          color: var(--text-primary); border-radius: 6px; padding: 4px 8px; font-size: 11px;
        }
        .contacts-list { flex: 1; overflow-y: auto; }
        .contact-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-bottom: 1px solid var(--border);
          cursor: pointer; transition: background 0.1s;
        }
        .contact-row:hover { background: var(--bg-secondary); }
        .contact-row.selected { background: var(--bg-card); border-left: 3px solid var(--accent-gold); }
        .contact-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--bg-secondary); display: flex; align-items: center;
          justify-content: center; font-size: 14px; font-weight: 600;
          color: var(--text-muted); overflow: hidden; flex-shrink: 0;
        }
        .contact-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .contact-row-body { flex: 1; min-width: 0; }
        .contact-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .contact-sub {
          font-size: 12px; color: var(--text-muted); margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .contact-cat {
          font-size: 10px; padding: 2px 6px; border-radius: 4px;
          background: var(--bg-primary); color: var(--text-muted);
        }
        .contact-cat.work { color: #3b82f6; border: 1px solid #3b82f644; }
        .contact-cat.personal { color: #22c55e; border: 1px solid #22c55e44; }
        .contacts-empty { color: var(--text-muted); padding: 20px 16px; font-size: 13px; }
        .contact-detail-panel { flex: 1; overflow-y: auto; padding: 0 24px; }
        .contacts-empty-detail {
          display: flex; align-items: center; justify-content: center;
          height: 100%; color: var(--text-muted);
        }
        .contact-detail-header {
          display: flex; align-items: center; gap: 16px;
          padding: 20px 0; border-bottom: 1px solid var(--border);
        }
        .contact-detail-avatar {
          width: 60px; height: 60px; border-radius: 50%;
          background: var(--bg-secondary); display: flex; align-items: center;
          justify-content: center; font-size: 24px; font-weight: 600;
          color: var(--text-muted); overflow: hidden; flex-shrink: 0;
        }
        .contact-detail-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .contact-detail-header h3 { margin: 0; font-size: 18px; }
        .contact-detail-role { color: var(--text-muted); font-size: 13px; margin-top: 2px; }
        .contact-detail-info { padding: 16px 0; }
        .info-row {
          display: flex; justify-content: space-between; padding: 6px 0;
          font-size: 13px; border-bottom: 1px solid var(--border);
        }
        .info-label { color: var(--text-muted); }
        .contact-detail-actions { display: flex; gap: 8px; padding: 12px 0; }
        .interaction-history { padding: 16px 0; }
        .interaction-history h4 { font-size: 14px; margin-bottom: 10px; }
        .interaction-item {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 12px;
        }
        .interaction-type {
          background: var(--bg-secondary); padding: 2px 8px; border-radius: 4px;
          font-weight: 600; text-transform: capitalize; color: var(--accent-gold);
        }
        .interaction-desc { flex: 1; color: var(--text-secondary); }
        .interaction-date { color: var(--text-muted); }
      `}</style>
    </div>
  )
}

function AddContactModal({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [category, setCategory] = useState('personal')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name, email, phone, company, category })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3>Add Contact</h3>
        <form onSubmit={handleSubmit}>
          <label>Name <input type="text" value={name} onChange={e => setName(e.target.value)} required /></label>
          <label>Email <input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>Phone <input type="text" value={phone} onChange={e => setPhone(e.target.value)} /></label>
          <label>Company <input type="text" value={company} onChange={e => setCompany(e.target.value)} /></label>
          <label>Category
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', marginTop: 4 }}>
              <option value="personal">Personal</option>
              <option value="work">Work</option>
            </select>
          </label>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">Add Contact</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LogInteractionModal({ onLog, onClose }) {
  const [type, setType] = useState('email')
  const [description, setDescription] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onLog(type, description)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <h3>Log Interaction</h3>
        <form onSubmit={handleSubmit}>
          <label>Type
            <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', marginTop: 4 }}>
              {INTERACTION_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </label>
          <label>Description (optional)
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Caught up over coffee" />
          </label>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">Log</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
