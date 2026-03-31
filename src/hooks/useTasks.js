import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setTasks(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const addTask = async (task) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: user.id })
      .select()
      .single()
    if (!error && data) setTasks(prev => [data, ...prev])
    return { data, error }
  }

  const updateTask = async (id, updates) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) setTasks(prev => prev.map(t => t.id === id ? data : t))
    return { data, error }
  }

  const deleteTask = async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) setTasks(prev => prev.filter(t => t.id !== id))
    return { error }
  }

  const completeTask = async (id, actualMinutes) => {
    return updateTask(id, {
      status: 'done',
      actual_minutes: actualMinutes,
      completed_at: new Date().toISOString()
    })
  }

  return { tasks, loading, addTask, updateTask, deleteTask, completeTask, refetch: fetchTasks }
}
