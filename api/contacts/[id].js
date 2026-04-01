import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query

  if (req.method === 'GET') {
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) return res.status(404).json({ error: 'Contact not found' })

    // Get interaction history
    const { data: interactions } = await supabaseAdmin
      .from('contact_interactions')
      .select('*')
      .eq('contact_id', id)
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .limit(20)

    res.json({ ...contact, interactions: interactions || [] })
  } else if (req.method === 'PATCH') {
    const updates = req.body
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } else if (req.method === 'DELETE') {
    await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    res.json({ success: true })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
