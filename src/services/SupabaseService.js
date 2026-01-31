/**
 * Supabase backend for PrimeWealth (free tier).
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in env.
 * Data is scoped by user_id (logged-in username from AuthService).
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let client = null
if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey)
}

export function isSupabaseConfigured() {
  return !!client
}

export function getSupabaseClient() {
  return client
}

/**
 * Get current user_id (must be set by AuthService after login)
 */
function getUserId(getCurrentUsername) {
  const username = getCurrentUsername ? getCurrentUsername() : (typeof window !== 'undefined' && localStorage.getItem('finance_app_username'))
  return username || null
}

// --- Transactions ---
export async function fetchTransactions(getCurrentUsername) {
  if (!client) return null
  const userId = getUserId(getCurrentUsername)
  if (!userId) return []
  const { data, error } = await client.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false })
  if (error) {
    console.error('Supabase fetchTransactions:', error)
    return []
  }
  return (data || []).map(row => ({
    id: row.id,
    description: row.description,
    amount: parseFloat(row.amount),
    type: row.type,
    category: row.category,
    date: row.date
  }))
}

export async function saveTransactions(transactions, getCurrentUsername) {
  if (!client) return false
  const userId = getUserId(getCurrentUsername)
  if (!userId) return false
  await client.from('transactions').delete().eq('user_id', userId)
  if (transactions.length === 0) return true
  const rows = transactions.map(t => ({
    id: t.id,
    user_id: userId,
    description: t.description,
    amount: t.amount,
    type: t.type,
    category: t.category,
    date: t.date
  }))
  const { error } = await client.from('transactions').upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error('Supabase saveTransactions:', error)
    return false
  }
  return true
}

// --- Budgets ---
export async function fetchBudgets(getCurrentUsername) {
  if (!client) return null
  const userId = getUserId(getCurrentUsername)
  if (!userId) return []
  const { data, error } = await client.from('budgets').select('*').eq('user_id', userId)
  if (error) {
    console.error('Supabase fetchBudgets:', error)
    return []
  }
  return (data || []).map(row => ({
    id: row.id,
    category: row.category,
    amount: parseFloat(row.amount),
    period: row.period || 'monthly'
  }))
}

export async function saveBudgets(budgets, getCurrentUsername) {
  if (!client) return false
  const userId = getUserId(getCurrentUsername)
  if (!userId) return false
  await client.from('budgets').delete().eq('user_id', userId)
  if (budgets.length === 0) return true
  const rows = budgets.map(b => ({
    id: b.id,
    user_id: userId,
    category: b.category,
    amount: b.amount,
    period: b.period || 'monthly'
  }))
  const { error } = await client.from('budgets').upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error('Supabase saveBudgets:', error)
    return false
  }
  return true
}

// --- Stocks ---
export async function fetchStocks(getCurrentUsername) {
  if (!client) return null
  const userId = getUserId(getCurrentUsername)
  if (!userId) return []
  const { data, error } = await client.from('stocks').select('*').eq('user_id', userId).order('id', { ascending: false })
  if (error) {
    console.error('Supabase fetchStocks:', error)
    return []
  }
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    buyPrice: parseFloat(row.buy_price),
    quantity: parseFloat(row.quantity),
    investedAmount: parseFloat(row.invested_amount),
    buyDate: row.buy_date,
    status: row.status || 'HOLDING',
    sellPrice: row.sell_price != null ? parseFloat(row.sell_price) : null,
    sellDate: row.sell_date,
    sellValue: row.sell_value != null ? parseFloat(row.sell_value) : null,
    profitOrLoss: row.profit_or_loss != null ? parseFloat(row.profit_or_loss) : null,
    currentPrice: row.current_price != null ? parseFloat(row.current_price) : null
  }))
}

export async function saveStocks(stocks, getCurrentUsername) {
  if (!client) return false
  const userId = getUserId(getCurrentUsername)
  if (!userId) return false
  await client.from('stocks').delete().eq('user_id', userId)
  if (stocks.length === 0) return true
  const rows = stocks.map(s => ({
    id: s.id,
    user_id: userId,
    name: s.name,
    buy_price: s.buyPrice,
    quantity: s.quantity,
    invested_amount: s.investedAmount,
    buy_date: s.buyDate,
    status: s.status || 'HOLDING',
    sell_price: s.sellPrice,
    sell_date: s.sellDate,
    sell_value: s.sellValue,
    profit_or_loss: s.profitOrLoss,
    current_price: s.currentPrice
  }))
  const { error } = await client.from('stocks').upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error('Supabase saveStocks:', error)
    return false
  }
  return true
}

// --- Custom categories ---
export async function fetchCustomCategories(getCurrentUsername) {
  if (!client) return null
  const userId = getUserId(getCurrentUsername)
  if (!userId) return { expense: [], income: [] }
  const { data, error } = await client.from('custom_categories').select('data').eq('user_id', userId).single()
  if (error || !data) return { expense: [], income: [] }
  return data.data || { expense: [], income: [] }
}

export async function saveCustomCategories(obj, getCurrentUsername) {
  if (!client) return false
  const userId = getUserId(getCurrentUsername)
  if (!userId) return false
  const { error } = await client.from('custom_categories').upsert({ user_id: userId, data: obj }, { onConflict: 'user_id' })
  if (error) {
    console.error('Supabase saveCustomCategories:', error)
    return false
  }
  return true
}

// --- Goal settings ---
export async function fetchGoalSettings(getCurrentUsername) {
  if (!client) return null
  const userId = getUserId(getCurrentUsername)
  if (!userId) return null
  const { data, error } = await client.from('goal_settings').select('goal_amount').eq('user_id', userId).single()
  if (error || !data) return null
  return { goalAmount: parseFloat(data.goal_amount) }
}

export async function saveGoalSettings(goalAmount, getCurrentUsername) {
  if (!client) return false
  const userId = getUserId(getCurrentUsername)
  if (!userId) return false
  const { error } = await client.from('goal_settings').upsert({ user_id: userId, goal_amount: goalAmount, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) {
    console.error('Supabase saveGoalSettings:', error)
    return false
  }
  return true
}
