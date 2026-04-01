import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { contact_id } = req.query

    let query = supabaseAdmin
      .from('contact_interactions')
      .select('*, contacts(name)')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .limit(50)

    if (contact_id) query = query.eq('contact_id', contact_id)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } else if (req.method === 'POST') {
    const { contact_id, type, description, occurred_at } = req.body

    const { data, error } = await supabaseAdmin
      .from('contact_interactions')
      .insert({
        user_id: user.id,
        contact_id,
        type,
        source: 'manual',
        description,
        occurred_at: occurred_at || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Update contact's last_contacted_at and frequency
    await supabaseAdmin.rpc('update_contact_last_contacted', {
      p_contact_id: contact_id,
      p_user_id: user.id,
    }).catch(() => {
      // Fallback if RPC doesn't exist
      supabaseAdmin
        .from('contacts')
        .update({
          last_contacted_at: occurred_at || new Date().toISOString(),
          contact_frequency: supabaseAdmin.raw('contact_frequency + 1'),
        })
        .eq('id', contact_id)
        .eq('user_id', user.id)
    })

    res.json(data)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
