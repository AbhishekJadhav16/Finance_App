/**
 * DataService - single source for transactions, budgets, stocks, custom categories, goal settings.
 * Uses Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set; otherwise localStorage.
 */

import AuthService from './AuthService'
import * as Supabase from './SupabaseService'

function getCurrentUsername() {
  return AuthService.getCurrentUsername()
}

const isSupabase = Supabase.isSupabaseConfigured()

// --- Transactions ---
export async function getTransactions() {
  if (isSupabase) {
    const data = await Supabase.fetchTransactions(getCurrentUsername)
    return data != null ? data : []
  }
  const raw = localStorage.getItem('transactions') || '[]'
  return JSON.parse(raw)
}

export async function setTransactions(transactions) {
  if (isSupabase) {
    await Supabase.saveTransactions(transactions, getCurrentUsername)
  } else {
    localStorage.setItem('transactions', JSON.stringify(transactions))
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('transactionsUpdated'))
  }
}

// --- Budgets ---
export async function getBudgets() {
  if (isSupabase) {
    const data = await Supabase.fetchBudgets(getCurrentUsername)
    return data != null ? data : []
  }
  const raw = localStorage.getItem('budgets') || '[]'
  return JSON.parse(raw)
}

export async function setBudgets(budgets) {
  if (isSupabase) {
    await Supabase.saveBudgets(budgets, getCurrentUsername)
  } else {
    localStorage.setItem('budgets', JSON.stringify(budgets))
  }
}

// --- Stocks ---
export async function getStocks() {
  if (isSupabase) {
    const data = await Supabase.fetchStocks(getCurrentUsername)
    return data != null ? data : []
  }
  const raw = localStorage.getItem('stocks') || '[]'
  return JSON.parse(raw)
}

export async function setStocks(stocks) {
  if (isSupabase) {
    await Supabase.saveStocks(stocks, getCurrentUsername)
  } else {
    localStorage.setItem('stocks', JSON.stringify(stocks))
  }
}

// --- Custom categories ---
export async function getCustomCategories() {
  if (isSupabase) {
    const data = await Supabase.fetchCustomCategories(getCurrentUsername)
    return data != null ? data : { expense: [], income: [] }
  }
  const raw = localStorage.getItem('customCategories') || '{"expense":[],"income":[]}'
  return JSON.parse(raw)
}

export async function setCustomCategories(obj) {
  if (isSupabase) {
    await Supabase.saveCustomCategories(obj, getCurrentUsername)
  } else {
    localStorage.setItem('customCategories', JSON.stringify(obj))
  }
}

// --- Goal settings ---
export async function getGoalSettings() {
  if (isSupabase) {
    const data = await Supabase.fetchGoalSettings(getCurrentUsername)
    return data
  }
  const raw = localStorage.getItem('goalSettings') || 'null'
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed.goalAmount === 'number' ? parsed : null
  } catch {
    return null
  }
}

export async function setGoalSettings(goalAmount) {
  if (isSupabase) {
    await Supabase.saveGoalSettings(goalAmount, getCurrentUsername)
  } else {
    localStorage.setItem('goalSettings', JSON.stringify({ goalAmount }))
  }
}

export function isUsingSupabase() {
  return isSupabase
}
