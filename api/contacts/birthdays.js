import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('id, name, birthday, photo_url, category')
      .eq('user_id', user.id)
      .not('birthday', 'is', null)

    if (!contacts || contacts.length === 0) return res.json([])

    const now = new Date()
    const upcoming = contacts
      .map(c => {
        const bday = new Date(c.birthday)
        // Set birthday to this year
        const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate())
        // If already passed, use next year
        if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1)
        const daysUntil = Math.ceil((thisYear - now) / (1000 * 60 * 60 * 24))
        return { ...c, daysUntil, nextBirthday: thisYear.toISOString().split('T')[0] }
      })
      .filter(c => c.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)

    res.json(upcoming)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
