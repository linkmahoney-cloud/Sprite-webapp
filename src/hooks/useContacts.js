import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useContacts() {
  const [contacts, setContacts] = useState([])
  const [birthdays, setBirthdays] = useState([])
  const [overdue, setOverdue] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const fetchContacts = useCallback(async (category = 'all', sort = 'recency') => {
    const token = await getToken()
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort })
      if (category !== 'all') params.set('category', category)
      const res = await fetch(`/api/contacts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setContacts(await res.json())
    } catch (e) {
      console.error('Contacts fetch error:', e)
    }
    setLoading(false)
  }, [])

  const fetchBirthdays = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/contacts/birthdays', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setBirthdays(await res.json())
    } catch (e) {
      console.error('Birthdays fetch error:', e)
    }
  }, [])

  const fetchOverdue = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/contacts/overdue', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setOverdue(await res.json())
    } catch (e) {
      console.error('Overdue fetch error:', e)
    }
  }, [])

  const syncContacts = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    setSyncing(true)
    try {
      const res = await fetch('/api/contacts/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        await fetchContacts()
        return data.synced
      }
    } catch (e) {
      console.error('Sync error:', e)
    }
    setSyncing(false)
    return 0
  }, [fetchContacts])

  const getContact = async (id) => {
    const token = await getToken()
    const res = await fetch(`/api/contacts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  }

  const addContact = async (contact) => {
    const token = await getToken()
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(contact),
    })
    if (res.ok) await fetchContacts()
    return res.json()
  }

  const updateContact = async (id, updates) => {
    const token = await getToken()
    await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    })
  }

  const deleteContact = async (id) => {
    const token = await getToken()
    await fetch(`/api/contacts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const logInteraction = async (contactId, type, description) => {
    const token = await getToken()
    await fetch('/api/contacts/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contact_id: contactId, type, description }),
    })
    await fetchContacts()
  }

  return {
    contacts, birthdays, overdue, loading, syncing,
    fetchContacts, fetchBirthdays, fetchOverdue, syncContacts,
    getContact, addContact, updateContact, deleteContact, logInteraction,
  }
}
