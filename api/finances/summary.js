import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const month = req.query.month || new Date().toISOString().slice(0, 7)

  // Get income
  const { data: income } = await supabaseAdmin
    .from('monthly_income')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', month)
    .single()

  const inc = income || {
    earned_income: 0, unearned_income: 0,
    tithe_pct: 10, save_pct: 2, invest_pct: 30, tax_pct: 35,
  }

  // Get categories
  const { data: categories } = await supabaseAdmin
    .from('expense_categories')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', month)

  // Get expenses
  const { data: expenses } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', month)

  // Compute
  const gross = (inc.earned_income || 0) + (inc.unearned_income || 0)
  const tithe = gross * (inc.tithe_pct || 0) / 100
  const save = gross * (inc.save_pct || 0) / 100
  const invest = gross * (inc.invest_pct || 0) / 100
  const tax = gross * (inc.tax_pct || 0) / 100
  const netSpendable = gross - tithe - save - invest - tax

  // Group expenses by category
  const expensesByCategory = {}
  for (const exp of (expenses || [])) {
    if (!expensesByCategory[exp.category]) {
      expensesByCategory[exp.category] = { current: 0, required: 0 }
    }
    expensesByCategory[exp.category].current += exp.amount
  }

  // Merge with category budgets
  const cats = (categories || []).map(c => {
    const actual = expensesByCategory[c.name] || { current: 0 }
    return {
      name: c.name,
      required: c.required_amount || 0,
      current: actual.current,
      pct: netSpendable > 0 ? (actual.current / netSpendable * 100) : 0,
      discretionary: Math.max(actual.current - (c.required_amount || 0), 0),
    }
  })

  const totalCurrent = cats.reduce((s, c) => s + c.current, 0)
  const totalRequired = cats.reduce((s, c) => s + c.required, 0)
  const totalDiscretionary = totalCurrent - totalRequired
  const surplus = netSpendable - totalRequired

  res.json({
    month,
    income: inc,
    gross,
    deductions: { tithe, save, invest, tax },
    netSpendable,
    categories: cats,
    totalCurrent,
    totalRequired,
    totalDiscretionary: Math.max(totalDiscretionary, 0),
    surplus,
  })
}
