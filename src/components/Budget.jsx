import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Target, AlertCircle, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import CurrencyService from '../services/CurrencyService'
import './Budget.css'

const Budget = () => {
  const [budgets, setBudgets] = useState([])
  const [transactions, setTransactions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [currency, setCurrency] = useState(CurrencyService.getBaseCurrency())
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly'
  })
  const [customCategories, setCustomCategories] = useState([])
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategoryInput, setCustomCategoryInput] = useState('')

  const baseCategories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other']

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const DataService = await import('../services/DataService')
      const [savedBudgets, savedTransactions, savedCustom] = await Promise.all([
        DataService.getBudgets(),
        DataService.getTransactions(),
        DataService.getCustomCategories()
      ])
      if (!cancelled) {
        setBudgets(Array.isArray(savedBudgets) ? savedBudgets : [])
        setTransactions(Array.isArray(savedTransactions) ? savedTransactions : [])
        setCustomCategories((savedCustom && savedCustom.expense) ? savedCustom.expense : [])
      }
    }
    load()

    CurrencyService.initialize()
    const handleCurrencyChange = (event) => setCurrency(event.detail)
    const handleTransactionsUpdate = () => {
      import('../services/DataService').then(m => m.getTransactions()).then(saved => {
        if (!cancelled) setTransactions(Array.isArray(saved) ? saved : [])
      })
    }
    window.addEventListener('currencyChanged', handleCurrencyChange)
    window.addEventListener('transactionsUpdated', handleTransactionsUpdate)
    return () => {
      cancelled = true
      window.removeEventListener('currencyChanged', handleCurrencyChange)
      window.removeEventListener('transactionsUpdated', handleTransactionsUpdate)
    }
  }, [])

  const saveBudgets = async (newBudgets) => {
    setBudgets(newBudgets)
    const DataService = await import('../services/DataService')
    await DataService.setBudgets(newBudgets)
  }

  const saveCustomExpenseCategories = async (updatedExpenseCategories) => {
    setCustomCategories(updatedExpenseCategories)
    const DataService = await import('../services/DataService')
    const current = await DataService.getCustomCategories()
    const merged = {
      ...(current || { expense: [], income: [] }),
      expense: updatedExpenseCategories
    }
    await DataService.setCustomCategories(merged)
  }

  const convertAmount = (amount) => {
    return CurrencyService.convert(amount, CurrencyService.getBaseCurrency(), currency)
  }

  const getBudgetSpent = (category) => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    return transactions
      .filter(t => 
        t.type === 'expense' && 
        t.category === category &&
        t.date.startsWith(currentMonth)
      )
      .reduce((sum, t) => sum + convertAmount(parseFloat(t.amount || 0)), 0)
  }

  const getBudgetStatus = (budget) => {
    // Use budgetAmount if available (from budgetData), otherwise convert
    const budgetAmount = budget.budgetAmount || convertAmount(parseFloat(budget.amount))
    const spent = budget.spent !== undefined ? budget.spent : getBudgetSpent(budget.category)
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
    
    if (percentage >= 100) return { status: 'exceeded', color: '#ef4444', icon: AlertCircle }
    if (percentage >= 80) return { status: 'warning', color: '#f59e0b', icon: AlertCircle }
    return { status: 'good', color: '#10b981', icon: CheckCircle }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let finalCategory = formData.category

    if (isCustomCategory && customCategoryInput.trim()) {
      const trimmed = customCategoryInput.trim()
      const existing = [...baseCategories, ...customCategories].map(c => c.toLowerCase())
      if (!existing.includes(trimmed.toLowerCase())) {
        const updated = [...customCategories, trimmed]
        await saveCustomExpenseCategories(updated)
      }
      finalCategory = trimmed
    }

    const newBudget = {
      ...formData,
      id: editingBudget?.id || Date.now(),
      amount: parseFloat(formData.amount),
      category: finalCategory
    }

    if (editingBudget) {
      const updated = budgets.map(b => b.id === editingBudget.id ? newBudget : b)
      await saveBudgets(updated)
    } else {
      await saveBudgets([...budgets, newBudget])
    }

    resetForm()
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      await saveBudgets(budgets.filter(b => b.id !== id))
    }
  }

  const handleEdit = (budget) => {
    setEditingBudget(budget)
    setFormData({
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      category: '',
      amount: '',
      period: 'monthly'
    })
    setEditingBudget(null)
    setIsCustomCategory(false)
    setCustomCategoryInput('')
  }

  const budgetData = budgets.map(budget => {
    const budgetAmount = convertAmount(parseFloat(budget.amount))
    const spent = getBudgetSpent(budget.category)
    const remaining = budgetAmount - spent
    return {
      ...budget,
      budgetAmount,
      spent,
      remaining,
      percentage: (spent / budgetAmount) * 100
    }
  })

  const chartData = budgets.map(budget => ({
    name: budget.category,
    budget: convertAmount(parseFloat(budget.amount)),
    spent: getBudgetSpent(budget.category)
  }))

  return (
    <div className="budget-page">
      <div className="budget-header">
        <div>
          <h1>Budget Management</h1>
          <p>Track and manage your spending limits</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={20} />
          Add Budget
        </button>
      </div>

      {budgets.length > 0 && (
        <div className="budget-chart-card">
          <h3>Budget Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8}/>
                </linearGradient>
                <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
              />
              <YAxis 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
                tickFormatter={(value) => CurrencyService.getSymbol(currency) + value.toFixed(0)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}
                formatter={(value) => CurrencyService.format(value, currency)}
              />
              <Bar 
                dataKey="budget" 
                fill="url(#budgetGradient)" 
                radius={[8, 8, 0, 0]}
                animationBegin={0}
                animationDuration={1000}
              />
              <Bar 
                dataKey="spent" 
                fill="url(#spentGradient)" 
                radius={[8, 8, 0, 0]}
                animationBegin={200}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="budgets-grid">
        {budgets.length > 0 ? (
          budgetData.map((budget) => {
            const status = getBudgetStatus(budget)
            const StatusIcon = status.icon
            return (
              <div key={budget.id} className="budget-card">
                <div className="budget-card-header">
                  <div className="budget-icon">
                    <Target size={24} color={status.color} />
                  </div>
                  <div className="budget-card-actions">
                    <button 
                      className="btn-icon btn-secondary" 
                      onClick={() => handleEdit(budget)}
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn-icon btn-danger" 
                      onClick={() => handleDelete(budget.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="budget-category">{budget.category}</h3>
                
                <div className="budget-amounts">
                  <div>
                    <p className="budget-label">Budget</p>
                    <p className="budget-value">{CurrencyService.format(budget.budgetAmount, currency)}</p>
                  </div>
                  <div>
                    <p className="budget-label">Spent</p>
                    <p className="budget-value spent">{CurrencyService.format(budget.spent, currency)}</p>
                  </div>
                  <div>
                    <p className="budget-label">Remaining</p>
                    <p className={`budget-value ${budget.remaining < 0 ? 'negative' : ''}`}>
                      {CurrencyService.format(budget.remaining, currency)}
                    </p>
                  </div>
                </div>

                <div className="budget-progress">
                  <div className="progress-bar-wrapper">
                    <div 
                      className="progress-bar" 
                      style={{ 
                        width: `${Math.min(budget.percentage, 100)}%`,
                        backgroundColor: status.color
                      }}
                    />
                  </div>
                  <div className="progress-stats">
                    <span className="progress-percentage">{budget.percentage.toFixed(1)}%</span>
                    <span className={`progress-status status-${status.status}`}>
                      <StatusIcon size={16} />
                      {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="empty-state-large">
            <Target size={64} color="var(--text-muted)" />
            <p>No budgets set yet</p>
            <p className="empty-subtitle">Create a budget to start tracking your spending</p>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus size={20} />
              Create Your First Budget
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingBudget ? 'Edit Budget' : 'Add Budget'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category</label>
                <div className="category-row">
                  <select
                    value={isCustomCategory ? 'custom' : formData.category}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomCategory(true)
                        setFormData({ ...formData, category: '' })
                      } else {
                        setIsCustomCategory(false)
                        setFormData({ ...formData, category: e.target.value })
                      }
                    }}
                    required={!isCustomCategory}
                    disabled={!!editingBudget}
                  >
                    <option value="">Select category</option>
                    {[...baseCategories, ...customCategories].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="custom">+ Add Custom</option>
                  </select>
                </div>
                {isCustomCategory && !editingBudget && (
                  <input
                    type="text"
                    className="mt-2"
                    placeholder="Enter custom category"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    required
                  />
                )}
              </div>

              <div className="form-group">
                <label>Budget Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Period</label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBudget ? 'Update' : 'Add'} Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Budget
