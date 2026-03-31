import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { calculateSpriteScore, SPRITE_CATEGORIES, getDailyGoal } from '../utils/spriteCalc'
import { toDateString, getDayOfWeek } from '../utils/dateHelpers'

export function useSpriteScores() {
  const { user } = useAuth()
  const [scores, setScores] = useState({ S: 0, P: 0, R: 0, I: 0, T: 0, E: 0 })
  const [timeLogs, setTimeLogs] = useState([])
  const [foodLog, setFoodLog] = useState([])
  const [loading, setLoading] = useState(true)

  const today = toDateString(new Date())
  const dayOfWeek = getDayOfWeek()

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [tasksRes, timeRes, foodRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('sprite_time_logs').select('*').eq('user_id', user.id).eq('date', today),
      supabase.from('food_log').select('*').eq('user_id', user.id).eq('date', today),
    ])

    const allTasks = tasksRes.data || []
    const todayTimeLogs = timeRes.data || []
    const todayFoodLog = foodRes.data || []

    setTimeLogs(todayTimeLogs)
    setFoodLog(todayFoodLog)

    const newScores = {}
    for (const cat of SPRITE_CATEGORIES) {
      const catTasks = allTasks.filter(t =>
        t.sprite_category === cat.key &&
        (t.due_date === today || (!t.due_date && t.status !== 'done') || (t.status === 'done' && t.completed_at?.startsWith(today)))
      )
      const catTimeLogs = todayTimeLogs.filter(l => l.sprite_category === cat.key)

      newScores[cat.key] = calculateSpriteScore(cat.key, {
        tasks: catTasks,
        timeLogs: catTimeLogs,
        foodLog: cat.key === 'P' ? todayFoodLog : [],
        dayOfWeek,
      })
    }

    setScores(newScores)
    setLoading(false)
  }, [user, today, dayOfWeek])

  useEffect(() => { fetchData() }, [fetchData])

  const addTimeLog = async (log) => {
    const { data, error } = await supabase
      .from('sprite_time_logs')
      .insert({ ...log, user_id: user.id, date: today })
      .select()
      .single()
    if (!error) await fetchData()
    return { data, error }
  }

  const deleteTimeLog = async (id) => {
    const { error } = await supabase.from('sprite_time_logs').delete().eq('id', id)
    if (!error) await fetchData()
    return { error }
  }

  const addFoodEntry = async (entry) => {
    const penalty = entry.health_rating === 'unhealthy' ? (entry.penalty || -10) :
                    entry.health_rating === 'healthy' ? 3 : 0
    const { data, error } = await supabase
      .from('food_log')
      .insert({ ...entry, penalty, user_id: user.id, date: today })
      .select()
      .single()
    if (!error) await fetchData()
    return { data, error }
  }

  const deleteFoodEntry = async (id) => {
    const { error } = await supabase.from('food_log').delete().eq('id', id)
    if (!error) await fetchData()
    return { error }
  }

  return {
    scores, timeLogs, foodLog, loading,
    addTimeLog, deleteTimeLog, addFoodEntry, deleteFoodEntry,
    refetch: fetchData
  }
}
