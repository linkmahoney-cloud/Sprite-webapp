import { useState, useEffect } from 'react'
import { useFinances } from '../../hooks/useFinances'

const DEFAULT_CATEGORIES = [
  'Housing', 'Food', 'Automobile', 'Insurance', 'Entertainment',
  'Clothing', 'Medical', 'Debt Service', 'School/Child Care',
  'Travel/Vacation', 'Misc.'
]

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function formatMoney(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FinancesPage() {
  const { summary, expenses, loading, fetchSummary, fetchExpenses, saveIncome, saveCategories, addExpense, deleteExpense } = useFinances()
  const [month, setMonth] = useState(getCurrentMonth())
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingIncome, setEditingIncome] = useState(false)
  const [editingBudgets, setEditingBudgets] = useState(false)

  useEffect(() => {
    fetchSummary(month)
    fetchExpenses(month)
  }, [month, fetchSummary, fetchExpenses])

  const inc = summary?.income || {}
  const gross = summary?.gross || 0
  const ded = summary?.deductions || {}
  const net = summary?.netSpendable || 0
  const cats = summary?.categories || []

  return (
    <div className="finances-page">
      <div className="finances-header">
        <h2>Finances</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="month-picker"
          />
          <button className="btn-primary" onClick={() => setShowExpenseForm(true)}>+ Expense</button>
        </div>
      </div>

      {loading && !summary ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : (
        <div className="finances-grid">
          {/* Income Section */}
          <div className="fin-card income-card">
            <div className="fin-card-header">
              <h3>Income</h3>
              <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setEditingIncome(true)}>Edit</button>
            </div>
            <div className="income-rows">
              <div className="income-row"><span>Earned Income</span><span>{formatMoney(inc.earned_income)}</span></div>
              <div className="income-row"><span>Unearned Income</span><span>{formatMoney(inc.unearned_income)}</span></div>
              <div className="income-row total"><span>Gross Monthly Income</span><span>{formatMoney(gross)}</span></div>
            </div>
            <div className="deductions">
              <h4>Deductions</h4>
              <div className="income-row"><span>Tithe ({inc.tithe_pct || 10}%)</span><span className="deduction">-{formatMoney(ded.tithe)}</span></div>
              <div className="income-row"><span>Savings ({inc.save_pct || 2}%)</span><span className="deduction">-{formatMoney(ded.save)}</span></div>
              <div className="income-row"><span>Investing ({inc.invest_pct || 30}%)</span><span className="deduction">-{formatMoney(ded.invest)}</span></div>
              <div className="income-row"><span>Taxes ({inc.tax_pct || 35}%)</span><span className="deduction">-{formatMoney(ded.tax)}</span></div>
              <div className="income-row net"><span>Net Spendable Income</span><span>{formatMoney(net)}</span></div>
            </div>
          </div>

          {/* Expense Categories Table */}
          <div className="fin-card expenses-card">
            <div className="fin-card-header">
              <h3>Expense Categories</h3>
              <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setEditingBudgets(true)}>Edit Budgets</button>
            </div>
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Current</th>
                  <th>%</th>
                  <th>Required</th>
                  <th>Discretionary</th>
                </tr>
              </thead>
              <tbody>
                {cats.map(c => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>{formatMoney(c.current)}</td>
                    <td>{c.pct.toFixed(1)}%</td>
                    <td>{formatMoney(c.required)}</td>
                    <td>{formatMoney(c.discretionary)}</td>
                  </tr>
                ))}
                <tr className="totals-row">
                  <td>Total</td>
                  <td>{formatMoney(summary?.totalCurrent)}</td>
                  <td>{net > 0 ? ((summary?.totalCurrent || 0) / net * 100).toFixed(1) : 0}%</td>
                  <td>{formatMoney(summary?.totalRequired)}</td>
                  <td>{formatMoney(summary?.totalDiscretionary)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Budget Analysis */}
          <div className="fin-card analysis-card">
            <h3>Budget Analysis</h3>
            <div className="analysis-rows">
              <div className="analysis-row"><span>Net Spendable Income</span><span>{formatMoney(net)}</span></div>
              <div className="analysis-row"><span>Total Required Expenses</span><span className="deduction">-{formatMoney(summary?.totalRequired)}</span></div>
              <div className={`analysis-row result ${(summary?.surplus || 0) >= 0 ? 'positive' : 'negative'}`}>
                <span>{(summary?.surplus || 0) >= 0 ? 'Surplus' : 'Deficit'}</span>
                <span>{formatMoney(Math.abs(summary?.surplus || 0))}</span>
              </div>
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="fin-card recent-card">
            <h3>Recent Expenses</h3>
            {expenses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No expenses logged this month.</p>
            ) : (
              <div className="recent-list">
                {expenses.slice(0, 15).map(e => (
                  <div key={e.id} className="recent-item">
                    <div className="recent-item-body">
                      <span className="recent-cat">{e.category}</span>
                      <span className="recent-desc">{e.description || '—'}</span>
                    </div>
                    <span className="recent-amount">{formatMoney(e.amount)}</span>
                    <span className="recent-date">{new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    <button
                      className="recent-del"
                      onClick={() => deleteExpense(e.id, month)}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Income Edit Modal */}
      {editingIncome && (
        <IncomeModal
          income={inc}
          month={month}
          onSave={(data) => { saveIncome(month, data); setEditingIncome(false) }}
          onClose={() => setEditingIncome(false)}
        />
      )}

      {/* Budget Edit Modal */}
      {editingBudgets && (
        <BudgetModal
          categories={cats}
          month={month}
          onSave={(data) => { saveCategories(month, data); setEditingBudgets(false) }}
          onClose={() => setEditingBudgets(false)}
        />
      )}

      {/* Add Expense Modal */}
      {showExpenseForm && (
        <ExpenseModal
          month={month}
          onAdd={(data) => { addExpense(data); setShowExpenseForm(false) }}
          onClose={() => setShowExpenseForm(false)}
        />
      )}

      <style>{`
        .finances-page { overflow-y: auto; height: calc(100vh - var(--header-height) - 56px); padding-bottom: 24px; }
        .finances-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
        }
        .finances-header h2 { margin: 0; font-size: 20px; }
        .month-picker {
          background: var(--bg-card); border: 1px solid var(--border);
          color: var(--text-primary); border-radius: 8px; padding: 6px 12px;
          font-size: 13px;
        }
        .finances-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .fin-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 12px; padding: 20px;
        }
        .fin-card h3 { margin: 0 0 12px; font-size: 16px; }
        .fin-card-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
        }
        .fin-card-header h3 { margin: 0; }
        .expenses-card { grid-column: 1 / -1; }
        .income-rows { margin-bottom: 16px; }
        .income-row {
          display: flex; justify-content: space-between; padding: 5px 0;
          font-size: 13px; color: var(--text-secondary);
        }
        .income-row.total {
          border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px;
          font-weight: 600; color: var(--text-primary);
        }
        .income-row.net {
          border-top: 2px solid var(--accent-gold); padding-top: 8px; margin-top: 4px;
          font-weight: 700; color: var(--accent-gold); font-size: 14px;
        }
        .deduction { color: var(--sprite-P); }
        .deductions h4 { font-size: 13px; color: var(--text-muted); margin: 12px 0 8px; }
        .expense-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .expense-table th {
          text-align: left; padding: 8px 10px; color: var(--text-muted);
          border-bottom: 1px solid var(--border); font-weight: 600; font-size: 12px;
        }
        .expense-table td { padding: 7px 10px; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
        .expense-table td:first-child { color: var(--text-primary); font-weight: 500; }
        .totals-row td {
          font-weight: 700; color: var(--text-primary);
          border-top: 2px solid var(--border);
        }
        .analysis-rows { }
        .analysis-row {
          display: flex; justify-content: space-between; padding: 6px 0;
          font-size: 14px; color: var(--text-secondary);
        }
        .analysis-row.result {
          border-top: 2px solid var(--border); padding-top: 10px; margin-top: 6px;
          font-weight: 700; font-size: 16px;
        }
        .analysis-row.positive { color: #22c55e; }
        .analysis-row.negative { color: #ef4444; }
        .recent-card { }
        .recent-list { }
        .recent-item {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 12px;
        }
        .recent-item-body { flex: 1; display: flex; gap: 8px; min-width: 0; }
        .recent-cat {
          background: var(--bg-secondary); padding: 1px 6px; border-radius: 4px;
          font-weight: 600; color: var(--accent-gold); white-space: nowrap; font-size: 11px;
        }
        .recent-desc { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .recent-amount { font-weight: 600; color: var(--text-primary); white-space: nowrap; }
        .recent-date { color: var(--text-muted); white-space: nowrap; }
        .recent-del {
          background: none; border: none; color: var(--text-muted); cursor: pointer;
          font-size: 16px; padding: 0 4px;
        }
        .recent-del:hover { color: #ef4444; }
      `}</style>
    </div>
  )
}

function IncomeModal({ income, month, onSave, onClose }) {
  const [earned, setEarned] = useState(income.earned_income || 0)
  const [unearned, setUnearned] = useState(income.unearned_income || 0)
  const [tithe, setTithe] = useState(income.tithe_pct ?? 10)
  const [save, setSave] = useState(income.save_pct ?? 2)
  const [invest, setInvest] = useState(income.invest_pct ?? 30)
  const [tax, setTax] = useState(income.tax_pct ?? 35)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      earned_income: parseFloat(earned) || 0,
      unearned_income: parseFloat(unearned) || 0,
      tithe_pct: parseFloat(tithe) || 0,
      save_pct: parseFloat(save) || 0,
      invest_pct: parseFloat(invest) || 0,
      tax_pct: parseFloat(tax) || 0,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3>Edit Income — {month}</h3>
        <form onSubmit={handleSubmit}>
          <label>Earned Income ($)
            <input type="number" step="0.01" value={earned} onChange={e => setEarned(e.target.value)} />
          </label>
          <label>Unearned Income ($)
            <input type="number" step="0.01" value={unearned} onChange={e => setUnearned(e.target.value)} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            <label>Tithe %<input type="number" step="0.1" value={tithe} onChange={e => setTithe(e.target.value)} /></label>
            <label>Save %<input type="number" step="0.1" value={save} onChange={e => setSave(e.target.value)} /></label>
            <label>Invest %<input type="number" step="0.1" value={invest} onChange={e => setInvest(e.target.value)} /></label>
            <label>Tax %<input type="number" step="0.1" value={tax} onChange={e => setTax(e.target.value)} /></label>
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BudgetModal({ categories, month, onSave, onClose }) {
  const [budgets, setBudgets] = useState(
    (categories.length > 0 ? categories : DEFAULT_CATEGORIES.map(n => ({ name: n, required: 0 }))).map(c => ({
      name: c.name,
      required_amount: c.required || 0,
    }))
  )

  const handleChange = (i, val) => {
    setBudgets(prev => prev.map((b, j) => j === i ? { ...b, required_amount: parseFloat(val) || 0 } : b))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(budgets)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3>Edit Budget — {month}</h3>
        <form onSubmit={handleSubmit}>
          {budgets.map((b, i) => (
            <label key={b.name}>
              {b.name} — Required ($)
              <input type="number" step="0.01" value={b.required_amount} onChange={e => handleChange(i, e.target.value)} />
            </label>
          ))}
          <div className="modal-actions">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExpenseModal({ month, onAdd, onClose }) {
  const [category, setCategory] = useState('Food')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [isRequired, setIsRequired] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!amount) return
    onAdd({
      category,
      description,
      amount: parseFloat(amount),
      is_required: isRequired,
      date,
      month,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3>Log Expense</h3>
        <form onSubmit={handleSubmit}>
          <label>Category
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', marginTop: 4 }}>
              {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Description<input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Grocery run" /></label>
          <label>Amount ($)<input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></label>
          <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row', cursor: 'pointer' }}>
            <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
            Required expense
          </label>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">Add Expense</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
