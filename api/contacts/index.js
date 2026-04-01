import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { category, sort = 'recency' } = req.query

    let query = supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (sort === 'recency') {
      query = query.order('last_contacted_at', { ascending: true, nullsFirst: true })
    } else if (sort === 'frequency') {
      query = query.order('contact_frequency', { ascending: false })
    } else {
      query = query.order('name', { ascending: true })
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } else if (req.method === 'POST') {
    // Manual contact creation
    const { name, email, phone, company, job_title, birthday, category, notes } = req.body

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        user_id: user.id,
        source: 'manual',
        name,
        email,
        phone,
        company,
        job_title,
        birthday,
        category: category || 'personal',
        notes,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
