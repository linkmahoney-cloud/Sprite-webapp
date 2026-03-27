// Daily goal minutes per category per day of week
// Index: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DEFAULT_GOALS = {
  S: [300, 30, 30, 30, 30, 30, 30],   // Sun=5hr, Mon-Sat=30min
  P: [60, 60, 60, 60, 60, 60, 60],    // 60min every day
  R: [240, 30, 30, 30, 30, 30, 180],  // Sun=4hr, Mon-Fri=30min, Sat=3hr
  I: [60, 60, 60, 60, 60, 60, 60],    // 60min every day
  T: [30, 480, 480, 480, 480, 480, 270], // Sun=30min, Mon-Fri=8hr, Sat=4.5hr
  E: [120, 30, 30, 30, 30, 30, 180],  // Sun=2hr, Mon-Fri=30min, Sat=3hr
}

export const SPRITE_CATEGORIES = [
  { key: 'S', label: 'Spiritual', color: '#a855f7' },
  { key: 'P', label: 'Physical', color: '#ec4899' },
  { key: 'R', label: 'Relationships', color: '#f97316' },
  { key: 'I', label: 'Intellectual', color: '#3b82f6' },
  { key: 'T', label: 'Temporal', color: '#eab308' },
  { key: 'E', label: 'Enjoyment', color: '#f59e0b' },
]

export function getDailyGoal(category, dayOfWeek, customGoals) {
  if (customGoals && customGoals[category]) {
    return customGoals[category][dayOfWeek] ?? DEFAULT_GOALS[category][dayOfWeek]
  }
  return DEFAULT_GOALS[category][dayOfWeek]
}

export function calculateSpriteScore(category, { tasks, timeLogs, foodLog, dayOfWeek, customGoals }) {
  const goalMinutes = getDailyGoal(category, dayOfWeek, customGoals)

  // Task completion component
  const catTasks = tasks.filter(t => t.sprite_category === category)
  const completedTasks = catTasks.filter(t => t.status === 'done').length
  const completionPct = catTasks.length > 0
    ? (completedTasks / catTasks.length) * 100
    : 0

  // Time component (tasks + manual time logs)
  const taskMinutes = catTasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0)
  const logMinutes = timeLogs
    .filter(l => l.sprite_category === category)
    .reduce((sum, l) => sum + l.minutes, 0)
  const totalMinutes = taskMinutes + logMinutes
  const timePct = goalMinutes > 0
    ? Math.min((totalMinutes / goalMinutes) * 100, 100)
    : 0

  // Base score
  let score
  if (catTasks.length === 0) {
    score = timePct // No tasks — score based entirely on time
  } else {
    score = (0.4 * completionPct) + (0.6 * timePct)
  }

  // Physical ring food penalty
  if (category === 'P' && foodLog) {
    let foodBonus = 0
    let foodPenalty = 0
    for (const entry of foodLog) {
      if (entry.health_rating === 'healthy') {
        foodBonus += 3
      } else if (entry.health_rating === 'unhealthy') {
        foodPenalty += Math.abs(entry.penalty || 10)
      }
    }
    foodBonus = Math.min(foodBonus, 15) // Cap bonus at +15
    score = score + foodBonus - foodPenalty
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}
