import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMessages() {
  const [igConversations, setIgConversations] = useState([])
  const [fbConversations, setFbConversations] = useState([])
  const [slackConversations, setSlackConversations] = useState([])
  const [slackWorkspaces, setSlackWorkspaces] = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [loading, setLoading] = useState({ ig: false, fb: false, slack: false })
  const [connected, setConnected] = useState({ ig: false, fb: false, slack: false })

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const checkStatus = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/auth/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setConnected({ ig: data.instagram, fb: data.facebook, slack: data.slack })
      }
    } catch (e) {
      console.error('Status check error:', e)
    }
  }, [])

  const fetchIgConversations = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    setLoading(prev => ({ ...prev, ig: true }))
    try {
      const res = await fetch('/api/messages/instagram', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setIgConversations(await res.json())
    } catch (e) {
      console.error('IG fetch error:', e)
    }
    setLoading(prev => ({ ...prev, ig: false }))
  }, [])

  const fetchFbConversations = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    setLoading(prev => ({ ...prev, fb: true }))
    try {
      const res = await fetch('/api/messages/facebook', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setFbConversations(await res.json())
    } catch (e) {
      console.error('FB fetch error:', e)
    }
    setLoading(prev => ({ ...prev, fb: false }))
  }, [])

  const fetchSlackWorkspaces = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/messages/slack-workspaces', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const ws = await res.json()
        setSlackWorkspaces(ws)
        return ws
      }
    } catch (e) {
      console.error('Slack workspaces error:', e)
    }
    return []
  }, [])

  const fetchSlackConversations = useCallback(async (workspaceId) => {
    const token = await getToken()
    if (!token) return
    setLoading(prev => ({ ...prev, slack: true }))
    try {
      const res = await fetch(`/api/messages/slack/conversations?workspace_id=${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setSlackConversations(await res.json())
    } catch (e) {
      console.error('Slack conversations error:', e)
    }
    setLoading(prev => ({ ...prev, slack: false }))
  }, [])

  const fetchThread = useCallback(async (platform, conversationId, workspaceId) => {
    const token = await getToken()
    if (!token) return null
    try {
      let url
      if (platform === 'instagram') url = `/api/messages/instagram/${conversationId}`
      else if (platform === 'facebook') url = `/api/messages/facebook/${conversationId}`
      else if (platform === 'slack') url = `/api/messages/slack/${conversationId}?workspace_id=${workspaceId}`

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setActiveThread({ platform, conversationId, workspaceId, messages: data.messages })
        return data
      }
    } catch (e) {
      console.error('Thread fetch error:', e)
    }
    return null
  }, [])

  const sendMessage = useCallback(async (platform, conversationId, text, workspaceId) => {
    const token = await getToken()
    if (!token) return
    try {
      let url, body
      if (platform === 'instagram') {
        url = '/api/messages/instagram'
        body = { conversationId, message: text }
      } else if (platform === 'facebook') {
        url = '/api/messages/facebook'
        body = { conversationId, message: text }
      } else if (platform === 'slack') {
        url = `/api/messages/slack/${conversationId}?workspace_id=${workspaceId}`
        body = { text }
      }

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

      // Refresh thread
      await fetchThread(platform, conversationId, workspaceId)
    } catch (e) {
      console.error('Send error:', e)
    }
  }, [fetchThread])

  return {
    igConversations, fbConversations, slackConversations, slackWorkspaces,
    activeThread, loading, connected,
    checkStatus, fetchIgConversations, fetchFbConversations,
    fetchSlackWorkspaces, fetchSlackConversations,
    fetchThread, sendMessage, setActiveThread,
  }
}
