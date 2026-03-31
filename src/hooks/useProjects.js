import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setProjects(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const addProject = async (project) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...project, user_id: user.id })
      .select()
      .single()
    if (!error && data) setProjects(prev => [data, ...prev])
    return { data, error }
  }

  const updateProject = async (id, updates) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) setProjects(prev => prev.map(p => p.id === id ? data : p))
    return { data, error }
  }

  const deleteProject = async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) setProjects(prev => prev.filter(p => p.id !== id))
    return { error }
  }

  return { projects, loading, addProject, updateProject, deleteProject, refetch: fetchProjects }
}
