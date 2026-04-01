import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useCalendar() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }, [])

  const fetchEvents = useCallback(async (timeMin, timeMax) => {
    const token = await getToken()
    if (!token) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (timeMin) params.set('timeMin', timeMin)
      if (timeMax) params.set('timeMax', timeMax)

      const res = await fetch(`/api/calendar/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setEvents(data)
        setConnected(true)
      } else {
        const err = await res.json()
        if (err.error?.includes('not connected')) setConnected(false)
      }
    } catch (e) {
      console.error('Calendar fetch error:', e)
    }
    setLoading(false)
  }, [getToken])

  const createEvent = async (event) => {
    const token = await getToken()
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(event),
    })
    if (res.ok) {
      await fetchEvents()
    }
    return res.json()
  }

  useEffect(() => { fetchEvents() }, [fetchEvents])

  return { events, loading, connected, fetchEvents, createEvent }
}
