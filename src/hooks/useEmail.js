import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useEmail() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(true)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const fetchEmails = useCallback(async (category = 'all') => {
    const token = await getToken()
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '40' })
      if (category !== 'all') params.set('category', category)

      const res = await fetch(`/api/email/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setEmails(await res.json())
        setConnected(true)
      } else {
        const err = await res.json()
        if (err.error?.includes('not connected')) setConnected(false)
      }
    } catch (e) {
      console.error('Email fetch error:', e)
    }
    setLoading(false)
  }, [])

  const getEmail = async (id) => {
    const token = await getToken()
    const res = await fetch(`/api/email/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  }

  const updateEmail = async (id, updates) => {
    const token = await getToken()
    await fetch(`/api/email/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    })
  }

  const sendEmail = async ({ to, subject, body, replyTo, threadId }) => {
    const token = await getToken()
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, subject, body, replyTo, threadId }),
    })
    return res.json()
  }

  const markRead = (id) => updateEmail(id, { read: true })
  const markUnread = (id) => updateEmail(id, { read: false })
  const toggleStar = (id, starred) => updateEmail(id, { star: !starred })
  const archive = async (id) => {
    await updateEmail(id, { archive: true })
    setEmails(prev => prev.filter(e => e.id !== id))
  }

  return {
    emails, loading, connected, fetchEmails,
    getEmail, sendEmail, markRead, markUnread, toggleStar, archive,
  }
}
