import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

const DEFAULT_CATEGORIES = [
  'Housing', 'Food', 'Automobile', 'Insurance', 'Entertainment',
  'Clothing', 'Medical', 'Debt Service', 'School/Child Care',
  'Travel/Vacation', 'Misc.'
]

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const month = req.query.month || req.body?.month || new Date().toISOString().slice(0, 7)

  if (req.method === 'GET') {
    const { data } = await supabaseAdmin
      .from('expense_categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)
      .order('name')

    // Return defaults if none set
    if (!data || data.length === 0) {
      return res.json(DEFAULT_CATEGORIES.map(name => ({
        name,
        month,
        required_amount: 0,
      })))
    }

    res.json(data)
  } else if (req.method === 'POST') {
    const { categories } = req.body // array of { name, required_amount }

    const rows = (categories || []).map(c => ({
      user_id: user.id,
      month,
      name: c.name,
      required_amount: c.required_amount || 0,
    }))

    const { error } = await supabaseAdmin
      .from('expense_categories')
      .upsert(rows, { onConflict: 'user_id,month,name' })

    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
