import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const month = req.query.month || req.body?.month || new Date().toISOString().slice(0, 7)

  if (req.method === 'GET') {
    const { data } = await supabaseAdmin
      .from('monthly_income')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)
      .single()

    res.json(data || {
      month,
      earned_income: 0,
      unearned_income: 0,
      tithe_pct: 10,
      save_pct: 2,
      invest_pct: 30,
      tax_pct: 35,
    })
  } else if (req.method === 'POST') {
    const { earned_income, unearned_income, tithe_pct, save_pct, invest_pct, tax_pct } = req.body

    const { data, error } = await supabaseAdmin
      .from('monthly_income')
      .upsert({
        user_id: user.id,
        month,
        earned_income: earned_income || 0,
        unearned_income: unearned_income || 0,
        tithe_pct: tithe_pct ?? 10,
        save_pct: save_pct ?? 2,
        invest_pct: invest_pct ?? 30,
        tax_pct: tax_pct ?? 35,
      }, { onConflict: 'user_id,month' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
