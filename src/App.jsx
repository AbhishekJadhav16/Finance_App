import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Budget from './components/Budget'
import GoalSetter from './components/GoalSetter'
import Stocks from './components/Stocks'
import Login from './components/Login'
import CurrencySelector from './components/CurrencySelector'
import CurrencyService from './services/CurrencyService'
import AuthService from './services/AuthService'
import { Home, DollarSign, Wallet, TrendingUp, LogOut, BarChart3 } from 'lucide-react'
import './App.css'

function Navigation({ onCurrencyChange, onLogout }) {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/transactions', icon: DollarSign, label: 'Transactions' },
    { path: '/budget', icon: Wallet, label: 'Budget' },
    { path: '/goals', icon: TrendingUp, label: 'Goal Setter' },
    { path: '/stocks', icon: BarChart3, label: 'Stocks' },
  ]

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src="/prime2.png" alt="Prime" className="navbar-brand-logo" />
        <span>PrimeWealth</span>
      </div>
      <div className="navbar-right">
        <CurrencySelector onCurrencyChange={onCurrencyChange} />
        <ul className="navbar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
        <button 
          className="btn-logout" 
          onClick={onLogout}
          title="Logout"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}

function ProtectedRoutes({ currency, onCurrencyChange, onLogout }) {
  return (
    <>
      <Navigation onCurrencyChange={onCurrencyChange} onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard key={currency} />} />
          <Route path="/transactions" element={<Transactions key={currency} />} />
          <Route path="/budget" element={<Budget key={currency} />} />
          <Route path="/goals" element={<GoalSetter key={currency} />} />
          <Route path="/stocks" element={<Stocks key={currency} />} />
        </Routes>
      </main>
    </>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currency, setCurrency] = useState(CurrencyService.getBaseCurrency())

  useEffect(() => {
    const authenticated = AuthService.isAuthenticated()
    setIsAuthenticated(authenticated)
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    AuthService.logout()
    setIsAuthenticated(false)
  }

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency)
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: newCurrency }))
  }

  // Without login, only the login page is shown — no dashboard or other routes
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Router>
      <div className="app">
        <ProtectedRoutes 
          currency={currency} 
          onCurrencyChange={handleCurrencyChange}
          onLogout={handleLogout}
        />
      </div>
    </Router>
  )
}

export default App
