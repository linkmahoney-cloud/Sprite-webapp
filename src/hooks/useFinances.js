import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFinances() {
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const fetchSummary = useCallback(async (month) => {
    const token = await getToken()
    if (!token) return
    setLoading(true)
    try {
      const params = month ? `?month=${month}` : ''
      const res = await fetch(`/api/finances/summary${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setSummary(await res.json())
    } catch (e) {
      console.error('Summary fetch error:', e)
    }
    setLoading(false)
  }, [])

  const fetchExpenses = useCallback(async (month) => {
    const token = await getToken()
    if (!token) return
    try {
      const params = month ? `?month=${month}` : ''
      const res = await fetch(`/api/finances/expenses${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setExpenses(await res.json())
    } catch (e) {
      console.error('Expenses fetch error:', e)
    }
  }, [])

  const saveIncome = async (month, income) => {
    const token = await getToken()
    await fetch('/api/finances/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...income, month }),
    })
    await fetchSummary(month)
  }

  const saveCategories = async (month, categories) => {
    const token = await getToken()
    await fetch('/api/finances/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ categories, month }),
    })
    await fetchSummary(month)
  }

  const addExpense = async (expense) => {
    const token = await getToken()
    const res = await fetch('/api/finances/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(expense),
    })
    if (res.ok) {
      await fetchExpenses(expense.month)
      await fetchSummary(expense.month)
    }
  }

  const deleteExpense = async (id, month) => {
    const token = await getToken()
    await fetch(`/api/finances/expenses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchExpenses(month)
    await fetchSummary(month)
  }

  return {
    summary, expenses, loading,
    fetchSummary, fetchExpenses, saveIncome, saveCategories, addExpense, deleteExpense,
  }
}
