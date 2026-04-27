import { getUserFromRequest, supabaseAdmin } from '../_lib/supabaseAdmin.js'

// Same daily goals as frontend spriteCalc.js
const DEFAULT_GOALS = {
  S: [300, 30, 30, 30, 30, 30, 30],
  P: [60, 60, 60, 60, 60, 60, 60],
  R: [240, 30, 30, 30, 30, 30, 180],
  I: [60, 60, 60, 60, 60, 60, 60],
  T: [30, 480, 480, 480, 480, 480, 270],
  E: [120, 30, 30, 30, 30, 30, 180],
}

const CATEGORIES = ['S', 'P', 'R', 'I', 'T', 'E']

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { days = '30' } = req.query
  const numDays = Math.min(parseInt(days) || 30, 365)

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - numDays + 1)

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  try {
    // Fetch all relevant data for the date range
    const [tasksRes, timeLogsRes, foodLogRes] = await Promise.all([
      supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', user.id),
      supabaseAdmin
        .from('sprite_time_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startStr)
        .lte('date', endStr),
      supabaseAdmin
        .from('food_log')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startStr)
        .lte('date', endStr),
    ])

    const allTasks = tasksRes.data || []
    const allTimeLogs = timeLogsRes.data || []
    const allFoodLog = foodLogRes.data || []

    // Group time logs and food log by date
    const timeLogsByDate = {}
    for (const log of allTimeLogs) {
      if (!timeLogsByDate[log.date]) timeLogsByDate[log.date] = []
      timeLogsByDate[log.date].push(log)
    }

    const foodLogByDate = {}
    for (const entry of allFoodLog) {
      if (!foodLogByDate[entry.date]) foodLogByDate[entry.date] = []
      foodLogByDate[entry.date].push(entry)
    }

    // Compute scores for each day
    const history = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      const dayOfWeek = current.getDay()
      const dayTimeLogs = timeLogsByDate[dateStr] || []
      const dayFoodLog = foodLogByDate[dateStr] || []

      const dayScores = {}
      for (const cat of CATEGORIES) {
        // Get tasks relevant to this day
        const catTasks = allTasks.filter(t =>
          t.sprite_category === cat && (
            t.due_date === dateStr ||
            (!t.due_date && t.status !== 'done') ||
            (t.status === 'done' && t.completed_at?.startsWith(dateStr))
          )
        )

        const goalMinutes = DEFAULT_GOALS[cat][dayOfWeek]

        // Task completion
        const completed = catTasks.filter(t => t.status === 'done').length
        const completionPct = catTasks.length > 0 ? (completed / catTasks.length) * 100 : 0

        // Time (uncapped — allow >100% for history view)
        const taskMinutes = catTasks.reduce((s, t) => s + (t.actual_minutes || 0), 0)
        const logMinutes = dayTimeLogs
          .filter(l => l.sprite_category === cat)
          .reduce((s, l) => s + l.minutes, 0)
        const totalMinutes = taskMinutes + logMinutes
        const timePct = goalMinutes > 0 ? (totalMinutes / goalMinutes) * 100 : 0

        let score
        if (catTasks.length === 0) {
          score = timePct
        } else {
          score = (0.4 * completionPct) + (0.6 * timePct)
        }

        // Physical food modifier
        if (cat === 'P') {
          let foodBonus = 0
          let foodPenalty = 0
          for (const entry of dayFoodLog) {
            if (entry.health_rating === 'healthy') foodBonus += 3
            else if (entry.health_rating === 'unhealthy') foodPenalty += Math.abs(entry.penalty || 10)
          }
          foodBonus = Math.min(foodBonus, 15)
          score = score + foodBonus - foodPenalty
        }

        // Allow scores above 100% (up to 200%) but floor at 0
        dayScores[cat] = Math.max(0, Math.round(score))
      }

      history.push({
        date: dateStr,
        dayOfWeek,
        ...dayScores,
      })

      current.setDate(current.getDate() + 1)
    }

    res.json(history)
  } catch (error) {
    console.error('SPRITE history error:', error.message)
    res.status(500).json({ error: error.message })
  }
}
