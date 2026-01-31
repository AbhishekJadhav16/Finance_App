import React, { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Sparkles, Shield } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts'
import CurrencyService from '../services/CurrencyService'
import AnalyticsService from '../services/AnalyticsService'
import AuthService from '../services/AuthService'
import './Dashboard.css'

const Dashboard = () => {
  const [transactions, setTransactions] = useState([])
  const [budgets, setBudgets] = useState([])
  const [currency, setCurrency] = useState(CurrencyService.getBaseCurrency())
  const [analytics, setAnalytics] = useState(null)
  const [period, setPeriod] = useState('monthly') // 'monthly' | 'yearly'
  const welcomeName = AuthService.getWelcomeDisplayName()

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      const DataService = await import('../services/DataService')
      const [savedTransactions, savedBudgets] = await Promise.all([
        DataService.getTransactions(),
        DataService.getBudgets()
      ])
      if (!cancelled) {
        setTransactions(Array.isArray(savedTransactions) ? savedTransactions : [])
        setBudgets(Array.isArray(savedBudgets) ? savedBudgets : [])
        if (savedTransactions && savedTransactions.length > 0) {
          const analyticsData = AnalyticsService.getFinancialHealthScore(savedTransactions, savedBudgets || [])
          setAnalytics(analyticsData)
        }
      }
    }
    loadData()

    CurrencyService.initialize()
    const handleCurrencyChange = (event) => setCurrency(event.detail)
    const handleTransactionsUpdate = () => loadData()
    window.addEventListener('currencyChanged', handleCurrencyChange)
    window.addEventListener('transactionsUpdated', handleTransactionsUpdate)
    return () => {
      cancelled = true
      window.removeEventListener('currencyChanged', handleCurrencyChange)
      window.removeEventListener('transactionsUpdated', handleTransactionsUpdate)
    }
  }, [])

  // Recalculate when currency changes
  useEffect(() => {
    if (transactions.length > 0) {
      const analyticsData = AnalyticsService.getFinancialHealthScore(transactions, budgets)
      setAnalytics(analyticsData)
    }
  }, [currency, transactions, budgets])

  // Convert amounts to selected currency
  const convertAmount = (amount) => {
    return CurrencyService.convert(amount, CurrencyService.getBaseCurrency(), currency)
  }

  // Calculate financial metrics
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + convertAmount(parseFloat(t.amount)), 0)

  // Calculate Emergency Fund (independent, from income category "Emergency Fund")
  const emergencyFund = transactions
    .filter(t => t.type === 'income' && t.category === 'Emergency Fund')
    .reduce((sum, t) => sum + convertAmount(parseFloat(t.amount)), 0)

  // Total income minus Emergency Fund
  const availableIncome = totalIncome - emergencyFund

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + convertAmount(parseFloat(t.amount)), 0)

  const balance = availableIncome - totalExpenses

  // Recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  // Data for chart with currency conversion based on selected period
  const chartData = period === 'monthly'
    ? getMonthlyData(transactions, currency)
    : getYearlyData(transactions, currency)

  // Category expenses for pie chart
  const categoryData = getCategoryData(transactions.filter(t => t.type === 'expense'), currency)

  // Enhanced color palette with gradients
  const COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ]

  const statsCards = [
    {
      title: 'Total Balance',
      value: CurrencyService.format(balance, currency),
      change: transactions.length > 0 ? null : 'N/A',
      trend: balance >= 0 ? 'up' : 'down',
      icon: DollarSign,
      gradient: 'gradient-1'
    },
    {
      title: 'Total Income',
      value: CurrencyService.format(totalIncome, currency),
      change: transactions.length > 0 ? null : 'N/A',
      trend: 'up',
      icon: TrendingUp,
      gradient: 'gradient-4'
    },
    {
      title: 'Total Expenses',
      value: CurrencyService.format(totalExpenses, currency),
      change: transactions.length > 0 ? null : 'N/A',
      trend: 'down',
      icon: TrendingDown,
      gradient: 'gradient-2'
    },
    {
      title: 'Savings Rate',
      value: availableIncome > 0 ? `${((balance / availableIncome) * 100).toFixed(1)}%` : (transactions.length > 0 ? 'N/A' : '0%'),
      change: transactions.length > 0 && availableIncome > 0 ? null : 'N/A',
      trend: balance >= 0 ? 'up' : 'down',
      icon: ArrowUpRight,
      gradient: 'gradient-3'
    }
  ]

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-welcome">Welcome {welcomeName}</p>
        </div>
        {analytics && (
          <div className="health-score-badge">
            <Sparkles size={20} />
            <div>
              <span className="score-value">{analytics.score}</span>
              <span className="score-grade">Grade: {analytics.grade}</span>
            </div>
          </div>
        )}
      </div>

      <div className="stats-grid">
        {statsCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className={`stat-card ${card.gradient} fade-in`} style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="stat-card-glow" />
              <div className="stat-card-header">
                <div className="stat-icon">
                  <Icon size={24} />
                </div>
                {card.change !== null && (
                  <span className={`stat-change stat-change-${card.trend}`}>
                    {card.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {card.change}
                  </span>
                )}
              </div>
              <h3 className="stat-value">{card.value}</h3>
              <p className="stat-title">{card.title}</p>
            </div>
          )
        })}
      </div>

      {/* Emergency Fund Box */}
      <div className="emergency-fund-card">
        <div className="emergency-fund-header">
          <div className="emergency-fund-icon">
            <Shield size={28} color="#f59e0b" />
          </div>
          <div>
            <h3>Emergency Fund</h3>
            <p className="emergency-fund-subtitle">Reserved for emergencies (excluded from available income)</p>
          </div>
        </div>
        <div className="emergency-fund-amount">
          <span className="emergency-fund-label">Total Emergency Fund:</span>
          <span className="emergency-fund-value">{CurrencyService.format(emergencyFund, currency)}</span>
        </div>
        {emergencyFund === 0 && (
          <p className="emergency-fund-note">Add income with category "Emergency Fund" to start building your emergency fund.</p>
        )}
      </div>

      <div className="charts-grid">
        <div className="chart-card chart-card-enhanced">
          <div className="chart-header">
            <div>
              <h3>Income vs Expenses</h3>
              <p className="chart-subtitle">
                View your {period === 'monthly' ? 'monthly' : 'yearly'} trends.
              </p>
            </div>
            <div className="chart-controls">
              <div className="period-toggle">
                <button
                  type="button"
                  className={period === 'monthly' ? 'active' : ''}
                  onClick={() => setPeriod('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={period === 'yearly' ? 'active' : ''}
                  onClick={() => setPeriod('yearly')}
                >
                  Yearly
                </button>
              </div>
              <div className="chart-legend-inline">
                <span className="legend-item"><span className="legend-color income"></span> Income</span>
                <span className="legend-item"><span className="legend-color expense"></span> Expenses</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                  <stop offset="50%" stopColor="#10b981" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                  <stop offset="50%" stopColor="#ef4444" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey={period === 'monthly' ? 'month' : 'year'} 
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
                labelStyle={{ color: '#f1f5f9', fontWeight: '600' }}
                formatter={(value) => CurrencyService.format(value, currency)}
                cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
              />
              <Area 
                type="monotone" 
                dataKey="income" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorIncome)"
                filter="url(#glow)"
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6, fill: '#10b981' }}
              />
              <Area 
                type="monotone" 
                dataKey="expense" 
                stroke="#ef4444" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorExpense)"
                filter="url(#glow)"
                dot={{ fill: '#ef4444', r: 4 }}
                activeDot={{ r: 6, fill: '#ef4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-card-enhanced">
          <div className="chart-header">
            <h3>Expense by Category</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <defs>
                {categoryData.map((entry, index) => (
                  <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1}/>
                    <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.7}/>
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => percent > 0.05 ? `${name}\n${(percent * 100).toFixed(0)}%` : ''}
                outerRadius={110}
                innerRadius={50}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {categoryData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#gradient-${index})`}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}
                formatter={(value) => CurrencyService.format(value, currency)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="category-legend">
            {categoryData.slice(0, 4).map((entry, index) => (
              <div key={index} className="category-legend-item">
                <span className="category-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="category-name">{entry.name}</span>
                <span className="category-value">{CurrencyService.format(entry.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="recent-transactions-card">
        <h3>Recent Transactions</h3>
        {recentTransactions.length > 0 ? (
          <div className="transactions-list">
            {recentTransactions.map((transaction, index) => (
              <div key={index} className="transaction-item">
                <div className="transaction-icon" style={{ background: transaction.type === 'income' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
                  {transaction.type === 'income' ? <ArrowUpRight size={20} color="#10b981" /> : <ArrowDownRight size={20} color="#ef4444" />}
                </div>
                <div className="transaction-details">
                  <h4>{transaction.description}</h4>
                  <p>{transaction.category} • {new Date(transaction.date).toLocaleDateString()}</p>
                </div>
                <div className={`transaction-amount ${transaction.type}`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {CurrencyService.format(convertAmount(parseFloat(transaction.amount)), currency)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No transactions yet. Start adding some!</p>
        )}
      </div>
    </div>
  )
}

function getMonthlyData(transactions, currency) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  return months.map(month => {
    const income = transactions
      .filter(t => t.type === 'income' && new Date(t.date).toLocaleDateString('en-US', { month: 'short' }) === month)
      .reduce((sum, t) => sum + CurrencyService.convert(parseFloat(t.amount), CurrencyService.getBaseCurrency(), currency), 0)
    
    const expense = transactions
      .filter(t => t.type === 'expense' && new Date(t.date).toLocaleDateString('en-US', { month: 'short' }) === month)
      .reduce((sum, t) => sum + CurrencyService.convert(parseFloat(t.amount), CurrencyService.getBaseCurrency(), currency), 0)
    
    return { month, income, expense }
  })
}

function getYearlyData(transactions, currency) {
  const yearMap = {}

  transactions.forEach(t => {
    const year = new Date(t.date).getFullYear()
    if (!yearMap[year]) {
      yearMap[year] = { income: 0, expense: 0 }
    }
    const amount = CurrencyService.convert(parseFloat(t.amount), CurrencyService.getBaseCurrency(), currency)
    if (t.type === 'income') {
      yearMap[year].income += amount
    } else if (t.type === 'expense') {
      yearMap[year].expense += amount
    }
  })

  return Object.entries(yearMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, values]) => ({
      year,
      income: values.income,
      expense: values.expense
    }))
}

function getCategoryData(expenses, currency) {
  const categoryMap = {}
  expenses.forEach(expense => {
    const category = expense.category || 'Other'
    categoryMap[category] = (categoryMap[category] || 0) + CurrencyService.convert(parseFloat(expense.amount), CurrencyService.getBaseCurrency(), currency)
  })
  
  return Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
}

export default Dashboard
