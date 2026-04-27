import { getUserFromRequest, supabaseAdmin } from '../_lib/supabaseAdmin.js'

// ── Default categories (used by /categories) ──
const DEFAULT_CATEGORIES = [
  'Housing', 'Food', 'Automobile', 'Insurance', 'Entertainment',
  'Clothing', 'Medical', 'Debt Service', 'School/Child Care',
  'Travel/Vacation', 'Misc.'
]

// ── Route: /api/finances/income ──
async function handleIncome(req, res, user) {
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

// ── Route: /api/finances/categories ──
async function handleCategories(req, res, user) {
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

// ── Route: /api/finances/expenses ──
async function handleExpenses(req, res, user) {
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

// ── Route: /api/finances/expenses/:id ──
async function handleExpenseById(req, res, user, id) {
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

// ── Route: /api/finances/summary ──
async function handleSummary(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

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

// ── Main handler: route by path segments ──
export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const pathSegments = req.query.path || []
  const route = pathSegments[0]

  switch (route) {
    case 'income':
      return handleIncome(req, res, user)
    case 'categories':
      return handleCategories(req, res, user)
    case 'expenses':
      if (pathSegments.length >= 2) {
        // /api/finances/expenses/:id
        return handleExpenseById(req, res, user, pathSegments[1])
      }
      return handleExpenses(req, res, user)
    case 'summary':
      return handleSummary(req, res, user)
    default:
      return res.status(404).json({ error: 'Not found' })
  }
}
