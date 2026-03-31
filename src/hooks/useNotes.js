import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotes = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (!error) setNotes(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const addNote = async (note) => {
    const { data, error } = await supabase
      .from('notes')
      .insert({ ...note, user_id: user.id })
      .select()
      .single()
    if (!error && data) setNotes(prev => [data, ...prev])
    return { data, error }
  }

  const updateNote = async (id, updates) => {
    const { data, error } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) setNotes(prev => prev.map(n => n.id === id ? data : n))
    return { data, error }
  }

  const deleteNote = async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) setNotes(prev => prev.filter(n => n.id !== id))
    return { error }
  }

  return { notes, loading, addNote, updateNote, deleteNote, refetch: fetchNotes }
}
