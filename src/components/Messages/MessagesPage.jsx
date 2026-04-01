import { useState, useEffect, useRef } from 'react'
import { useMessages } from '../../hooks/useMessages'
import { supabase } from '../../lib/supabase'

export default function MessagesPage() {
  const {
    igConversations, fbConversations, slackConversations, slackWorkspaces,
    activeThread, loading, connected,
    checkStatus, fetchIgConversations, fetchFbConversations,
    fetchSlackWorkspaces, fetchSlackConversations,
    fetchThread, sendMessage, setActiveThread,
  } = useMessages()

  const [selectedWorkspace, setSelectedWorkspace] = useState(null)

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  useEffect(() => {
    if (connected.ig) fetchIgConversations()
    if (connected.fb) fetchFbConversations()
    if (connected.slack) {
      fetchSlackWorkspaces().then(ws => {
        if (ws.length > 0) {
          setSelectedWorkspace(ws[0].workspace_id)
          fetchSlackConversations(ws[0].workspace_id)
        }
      })
    }
  }, [connected, fetchIgConversations, fetchFbConversations, fetchSlackWorkspaces, fetchSlackConversations])

  const connectMeta = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      window.location.href = `/api/auth/meta?token=${session.access_token}`
    }
  }

  const connectSlack = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      window.location.href = `/api/auth/slack?token=${session.access_token}`
    }
  }

  const handleWorkspaceChange = (wsId) => {
    setSelectedWorkspace(wsId)
    fetchSlackConversations(wsId)
    setActiveThread(null)
  }

  const anyConnected = connected.ig || connected.fb || connected.slack

  return (
    <div className="messages-page">
      <div className="messages-header">
        <h2>Messages</h2>
        <div className="messages-connect-btns">
          {!connected.ig && !connected.fb && (
            <button className="btn-secondary" onClick={connectMeta}>Connect Instagram & Facebook</button>
          )}
          <button className="btn-secondary" onClick={connectSlack}>
            {connected.slack ? 'Add Slack Workspace' : 'Connect Slack'}
          </button>
        </div>
      </div>

      {!anyConnected ? (
        <div className="connect-card">
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            Connect your messaging platforms to see all conversations in one place.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={connectMeta}>Connect Instagram & Facebook</button>
            <button className="btn-primary" onClick={connectSlack}>Connect Slack</button>
          </div>
        </div>
      ) : (
        <div className="messages-columns">
          {/* Instagram Column */}
          {connected.ig && (
            <MessageColumn
              title="Instagram"
              icon="📸"
              conversations={igConversations}
              loading={loading.ig}
              platform="instagram"
              activeThread={activeThread}
              onSelectConversation={(c) => fetchThread('instagram', c.id)}
              onSend={(cId, text) => sendMessage('instagram', cId, text)}
            />
          )}

          {/* Facebook Column */}
          {connected.fb && (
            <MessageColumn
              title="Facebook"
              icon="💬"
              conversations={fbConversations}
              loading={loading.fb}
              platform="facebook"
              activeThread={activeThread}
              onSelectConversation={(c) => fetchThread('facebook', c.id)}
              onSend={(cId, text) => sendMessage('facebook', cId, text)}
            />
          )}

          {/* Slack Column */}
          {connected.slack && (
            <MessageColumn
              title="Slack"
              icon="⚡"
              conversations={slackConversations}
              loading={loading.slack}
              platform="slack"
              activeThread={activeThread}
              workspaceId={selectedWorkspace}
              onSelectConversation={(c) => fetchThread('slack', c.id, selectedWorkspace)}
              onSend={(cId, text) => sendMessage('slack', cId, text, selectedWorkspace)}
              headerExtra={
                slackWorkspaces.length > 0 && (
                  <select
                    className="workspace-select"
                    value={selectedWorkspace || ''}
                    onChange={(e) => handleWorkspaceChange(e.target.value)}
                  >
                    {slackWorkspaces.map(ws => (
                      <option key={ws.workspace_id} value={ws.workspace_id}>
                        {ws.workspace_name}
                      </option>
                    ))}
                  </select>
                )
              }
            />
          )}

          {/* Show placeholder columns if fewer than 3 connected */}
          {!connected.ig && (
            <div className="msg-column placeholder-col">
              <div className="msg-col-header"><span>📸 Instagram</span></div>
              <div className="msg-col-empty">
                <button className="btn-secondary" onClick={connectMeta}>Connect</button>
              </div>
            </div>
          )}
          {!connected.fb && (
            <div className="msg-column placeholder-col">
              <div className="msg-col-header"><span>💬 Facebook</span></div>
              <div className="msg-col-empty">
                <button className="btn-secondary" onClick={connectMeta}>Connect</button>
              </div>
            </div>
          )}
          {!connected.slack && (
            <div className="msg-column placeholder-col">
              <div className="msg-col-header"><span>⚡ Slack</span></div>
              <div className="msg-col-empty">
                <button className="btn-secondary" onClick={connectSlack}>Connect</button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .messages-page { height: calc(100vh - var(--header-height) - 56px); display: flex; flex-direction: column; }
        .messages-header {
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 16px;
        }
        .messages-header h2 { margin: 0; font-size: 20px; }
        .messages-connect-btns { display: flex; gap: 8px; }
        .connect-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 12px; padding: 24px; max-width: 480px;
        }
        .messages-columns {
          flex: 1; display: flex; gap: 0; overflow: hidden;
          border: 1px solid var(--border); border-radius: 12px;
        }
        .msg-column {
          flex: 1; display: flex; flex-direction: column;
          border-right: 1px solid var(--border); overflow: hidden;
          min-width: 0;
        }
        .msg-column:last-child { border-right: none; }
        .placeholder-col { opacity: 0.5; }
        .msg-col-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; border-bottom: 1px solid var(--border);
          font-weight: 600; font-size: 14px; background: var(--bg-card);
          flex-shrink: 0;
        }
        .msg-col-empty {
          flex: 1; display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
        }
        .workspace-select {
          background: var(--bg-primary); border: 1px solid var(--border);
          color: var(--text-primary); border-radius: 6px; padding: 3px 8px;
          font-size: 11px;
        }
        .msg-list { flex: 1; overflow-y: auto; }
        .msg-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          cursor: pointer; transition: background 0.1s;
        }
        .msg-item:hover { background: var(--bg-secondary); }
        .msg-item.active { background: var(--bg-card); border-left: 3px solid var(--accent-gold); }
        .msg-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--bg-secondary); display: flex; align-items: center;
          justify-content: center; font-size: 14px; flex-shrink: 0;
          overflow: hidden;
        }
        .msg-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .msg-item-body { flex: 1; min-width: 0; }
        .msg-item-name {
          font-size: 13px; font-weight: 600; color: var(--text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .msg-item-preview {
          font-size: 12px; color: var(--text-muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 2px;
        }
        .msg-unread-badge {
          background: var(--accent-gold); color: #0d0a14;
          font-size: 10px; font-weight: 700; border-radius: 10px;
          padding: 1px 6px; flex-shrink: 0;
        }
        .msg-thread {
          display: flex; flex-direction: column; height: 100%;
        }
        .msg-thread-header {
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          font-weight: 600; font-size: 13px; background: var(--bg-card);
          flex-shrink: 0;
        }
        .msg-thread-messages {
          flex: 1; overflow-y: auto; padding: 12px 14px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .msg-bubble {
          max-width: 80%; padding: 8px 12px; border-radius: 12px;
          font-size: 13px; line-height: 1.4; word-wrap: break-word;
        }
        .msg-bubble.mine {
          align-self: flex-end; background: var(--accent-gold);
          color: #0d0a14; border-bottom-right-radius: 4px;
        }
        .msg-bubble.theirs {
          align-self: flex-start; background: var(--bg-card);
          color: var(--text-primary); border-bottom-left-radius: 4px;
        }
        .msg-bubble-name {
          font-size: 10px; font-weight: 600; color: var(--text-muted);
          margin-bottom: 2px;
        }
        .msg-bubble-time {
          font-size: 10px; color: var(--text-muted); margin-top: 2px;
          text-align: right;
        }
        .msg-compose {
          display: flex; gap: 8px; padding: 10px 14px;
          border-top: 1px solid var(--border); flex-shrink: 0;
        }
        .msg-compose input {
          flex: 1; background: var(--bg-primary); border: 1px solid var(--border);
          border-radius: 8px; padding: 8px 12px; color: var(--text-primary);
          font-size: 13px;
        }
        .msg-compose button {
          background: var(--accent-gold); color: #0d0a14;
          border: none; border-radius: 8px; padding: 8px 16px;
          font-weight: 600; font-size: 13px; cursor: pointer;
        }
      `}</style>
    </div>
  )
}

function MessageColumn({ title, icon, conversations, loading, platform, activeThread, workspaceId, onSelectConversation, onSend, headerExtra }) {
  const [selectedId, setSelectedId] = useState(null)
  const showThread = activeThread?.platform === platform && activeThread?.conversationId === selectedId

  const handleSelect = (conv) => {
    setSelectedId(conv.id)
    onSelectConversation(conv)
  }

  return (
    <div className="msg-column">
      <div className="msg-col-header">
        <span>{icon} {title}</span>
        {headerExtra}
      </div>

      {!showThread ? (
        <div className="msg-list">
          {loading ? (
            <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</p>
          ) : conversations.length === 0 ? (
            <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>No conversations</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`msg-item ${selectedId === conv.id ? 'active' : ''}`}
                onClick={() => handleSelect(conv)}
              >
                <div className="msg-avatar">
                  {conv.avatar ? <img src={conv.avatar} alt="" /> : getInitial(conv)}
                </div>
                <div className="msg-item-body">
                  <div className="msg-item-name">{getConvName(conv, platform)}</div>
                  <div className="msg-item-preview">{getPreview(conv)}</div>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="msg-unread-badge">{conv.unreadCount}</span>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <ThreadView
          thread={activeThread}
          convName={getConvName(conversations.find(c => c.id === selectedId) || {}, platform)}
          onBack={() => { setSelectedId(null); setActiveThread?.(null) }}
          onSend={(text) => onSend(selectedId, text)}
        />
      )}
    </div>
  )
}

function ThreadView({ thread, convName, onBack, onSend }) {
  const [text, setText] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text)
    setText('')
  }

  return (
    <div className="msg-thread">
      <div className="msg-thread-header">
        <span style={{ cursor: 'pointer', marginRight: 8 }} onClick={onBack}>←</span>
        {convName}
      </div>
      <div className="msg-thread-messages">
        {(thread?.messages || []).map((msg, i) => (
          <div key={msg.id || i} className={`msg-bubble ${msg.isMe ? 'mine' : 'theirs'}`}>
            {!msg.isMe && msg.userName && (
              <div className="msg-bubble-name">{msg.userName || msg.from?.name}</div>
            )}
            {msg.text}
            <div className="msg-bubble-time">
              {formatMsgTime(msg.createdTime || msg.timestamp)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="msg-compose" onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}

function getConvName(conv, platform) {
  if (platform === 'slack') return conv.name || 'Conversation'
  const participants = conv.participants || []
  if (participants.length > 0) return participants.map(p => p.name).join(', ')
  return 'Conversation'
}

function getPreview(conv) {
  if (conv.lastMessage?.message) return conv.lastMessage.message
  return ''
}

function getInitial(conv) {
  const name = conv.name || conv.participants?.[0]?.name || '?'
  return name.charAt(0).toUpperCase()
}

function formatMsgTime(ts) {
  if (!ts) return ''
  // Slack timestamp is a float string like "1234567890.123456"
  const date = ts.includes('.') && !ts.includes('T')
    ? new Date(parseFloat(ts) * 1000)
    : new Date(ts)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
