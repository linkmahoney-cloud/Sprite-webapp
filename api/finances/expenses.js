import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const month = req.query.month || new Date().toISOString().slice(0, 7)

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)
      .order('date', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } else if (req.method === 'POST') {
    const { category, description, amount, is_required, date, month } = req.body
    const expMonth = month || date?.slice(0, 7) || new Date().toISOString().slice(0, 7)

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        user_id: user.id,
        month: expMonth,
        category,
        description,
        amount,
        is_required: is_required ?? true,
        date: date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
