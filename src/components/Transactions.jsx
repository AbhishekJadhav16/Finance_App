import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import CurrencyService from '../services/CurrencyService'
import './Transactions.css'

const Transactions = () => {
  const [transactions, setTransactions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [currency, setCurrency] = useState(CurrencyService.getBaseCurrency())
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [customCategories, setCustomCategories] = useState({
    expense: [],
    income: []
  })
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategoryInput, setCustomCategoryInput] = useState('')

  const baseCategories = {
    expense: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'],
    income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Emergency Fund', 'Other']
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [saved, savedCustom] = await Promise.all([
        import('../services/DataService').then(m => m.getTransactions()),
        import('../services/DataService').then(m => m.getCustomCategories())
      ])
      if (!cancelled) {
        setTransactions(Array.isArray(saved) ? saved : [])
        setCustomCategories(savedCustom && typeof savedCustom === 'object' ? savedCustom : { expense: [], income: [] })
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

  const saveTransactions = async (newTransactions) => {
    setTransactions(newTransactions)
    const DataService = await import('../services/DataService')
    await DataService.setTransactions(newTransactions)
  }

  const saveCustomCategories = async (updated) => {
    setCustomCategories(updated)
    const DataService = await import('../services/DataService')
    await DataService.setCustomCategories(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let finalCategory = formData.category

    if (isCustomCategory && customCategoryInput.trim()) {
      const typeKey = formData.type === 'income' ? 'income' : 'expense'
      const trimmed = customCategoryInput.trim()
      const existingForType = [
        ...baseCategories[typeKey],
        ...(customCategories[typeKey] || [])
      ].map(c => c.toLowerCase())

      if (!existingForType.includes(trimmed.toLowerCase())) {
        const updated = {
          ...customCategories,
          [typeKey]: [...(customCategories[typeKey] || []), trimmed]
        }
        await saveCustomCategories(updated)
      }
      finalCategory = trimmed
    }

    const newTransaction = {
      ...formData,
      id: editingTransaction?.id || Date.now(),
      amount: parseFloat(formData.amount),
      category: finalCategory
    }

    if (editingTransaction) {
      const updated = transactions.map(t => t.id === editingTransaction.id ? newTransaction : t)
      await saveTransactions(updated)
    } else {
      await saveTransactions([...transactions, newTransaction])
    }

    resetForm()
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      await saveTransactions(transactions.filter(t => t.id !== id))
    }
  }

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction)
    setFormData({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      date: transaction.date.split('T')[0]
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      type: 'expense',
      category: '',
      date: new Date().toISOString().split('T')[0]
    })
    setEditingTransaction(null)
    setIsCustomCategory(false)
    setCustomCategoryInput('')
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || t.type === filterType
    return matchesSearch && matchesType
  })

  const sortedTransactions = [...filteredTransactions].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  )

  const convertAmount = (amount) => {
    return CurrencyService.convert(amount, CurrencyService.getBaseCurrency(), currency)
  }

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + convertAmount(parseFloat(t.amount || 0)), 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + convertAmount(parseFloat(t.amount || 0)), 0)

  return (
    <div className="transactions-page">
      <div className="transactions-header">
        <div>
          <h1>Transactions</h1>
          <p>Manage your income and expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={20} />
          Add Transaction
        </button>
      </div>

      <div className="transactions-summary">
        <div className="summary-card income">
          <div className="summary-icon" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
            <ArrowUpRight size={24} color="#10b981" />
          </div>
          <div>
            <p className="summary-label">Total Income</p>
            <h3 className="summary-value">{CurrencyService.format(totalIncome, currency)}</h3>
          </div>
        </div>
        <div className="summary-card expense">
          <div className="summary-icon" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
            <ArrowDownRight size={24} color="#ef4444" />
          </div>
          <div>
            <p className="summary-label">Total Expenses</p>
            <h3 className="summary-value">{CurrencyService.format(totalExpenses, currency)}</h3>
          </div>
        </div>
        <div className="summary-card balance">
          <div className="summary-icon" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
            <ArrowUpRight size={24} color="#6366f1" />
          </div>
          <div>
            <p className="summary-label">Balance</p>
            <h3 className="summary-value">{CurrencyService.format(totalIncome - totalExpenses, currency)}</h3>
          </div>
        </div>
      </div>

      <div className="transactions-filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <div className="transactions-list-container">
        {sortedTransactions.length > 0 ? (
          sortedTransactions.map((transaction) => (
            <div key={transaction.id} className="transaction-card">
              <div className="transaction-card-icon" style={{ 
                background: transaction.type === 'income' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' 
              }}>
                {transaction.type === 'income' ? 
                  <ArrowUpRight size={24} color="#10b981" /> : 
                  <ArrowDownRight size={24} color="#ef4444" />
                }
              </div>
              <div className="transaction-card-content">
                <div>
                  <h4>{transaction.description}</h4>
                  <p>{transaction.category} • {new Date(transaction.date).toLocaleDateString()}</p>
                </div>
                <div className={`transaction-card-amount ${transaction.type}`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {CurrencyService.format(convertAmount(parseFloat(transaction.amount)), currency)}
                </div>
              </div>
              <div className="transaction-card-actions">
                <button 
                  className="btn-icon btn-secondary" 
                  onClick={() => handleEdit(transaction)}
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  className="btn-icon btn-danger" 
                  onClick={() => handleDelete(transaction.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state-large">
            <p>No transactions found</p>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus size={20} />
              Add Your First Transaction
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    setFormData({ ...formData, type: e.target.value, category: '' })
                  }}
                  required
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description"
                  required
                />
              </div>

              <div className="form-group">
                <label>Amount</label>
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
                  >
                    <option value="">Select category</option>
                    {[...baseCategories[formData.type], ...(customCategories[formData.type] || [])].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="custom">+ Add Custom</option>
                  </select>
                </div>
                {isCustomCategory && (
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
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
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
                  {editingTransaction ? 'Update' : 'Add'} Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Transactions
