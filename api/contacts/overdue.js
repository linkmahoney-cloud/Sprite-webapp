import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Contacts where last_contacted_at is null or older than 30 days
    const { data: neverContacted } = await supabaseAdmin
      .from('contacts')
      .select('id, name, email, phone, photo_url, category, last_contacted_at')
      .eq('user_id', user.id)
      .is('last_contacted_at', null)
      .order('name')

    const { data: staleContacted } = await supabaseAdmin
      .from('contacts')
      .select('id, name, email, phone, photo_url, category, last_contacted_at')
      .eq('user_id', user.id)
      .lt('last_contacted_at', thirtyDaysAgo)
      .order('last_contacted_at', { ascending: true })

    const overdue = [...(staleContacted || []), ...(neverContacted || [])]

    // Add days since last contact
    const now = new Date()
    const result = overdue.map(c => ({
      ...c,
      daysSince: c.last_contacted_at
        ? Math.floor((now - new Date(c.last_contacted_at)) / (1000 * 60 * 60 * 24))
        : null,
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
