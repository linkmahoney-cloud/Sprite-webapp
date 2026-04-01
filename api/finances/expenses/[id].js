import { getUserFromRequest, supabaseAdmin } from '../../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query

  if (req.method === 'PATCH') {
    const { data, error } = await supabaseAdmin
      .from('expenses')
      .update(req.body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } else if (req.method === 'DELETE') {
    await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    res.json({ success: true })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
