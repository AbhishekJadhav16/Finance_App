import React, { useEffect, useState } from 'react'
import { Target, Calendar, TrendingUp, Info } from 'lucide-react'
import CurrencyService from '../services/CurrencyService'
import './GoalSetter.css'

const GoalSetter = () => {
  const [currency, setCurrency] = useState(CurrencyService.getBaseCurrency())
  const [transactions, setTransactions] = useState([])
  const [goalAmount, setGoalAmount] = useState('')
  const [results, setResults] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const DataService = await import('../services/DataService')
      const [savedTransactions, savedGoal] = await Promise.all([
        DataService.getTransactions(),
        DataService.getGoalSettings()
      ])
      if (!cancelled) {
        setTransactions(Array.isArray(savedTransactions) ? savedTransactions : [])
        if (savedGoal && typeof savedGoal.goalAmount === 'number' && savedGoal.goalAmount > 0) {
          setGoalAmount(savedGoal.goalAmount.toString())
        }
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

  // Recalculate results whenever currency, transactions, or saved goal change
  useEffect(() => {
    const target = parseFloat(goalAmount || 0)
    if (!target || target <= 0 || transactions.length === 0) {
      return
    }
    const computed = computeGoalResults(target, transactions, currency)
    setResults(computed)
  }, [currency, transactions, goalAmount])

  const calculate = async (e) => {
    e.preventDefault()
    const target = parseFloat(goalAmount || 0)
    if (!target || target <= 0) {
      setResults(null)
      return
    }

    const computed = computeGoalResults(target, transactions, currency)
    setResults(computed)

    const DataService = await import('../services/DataService')
    await DataService.setGoalSettings(target)
  }

  const handleClearGoal = async () => {
    setGoalAmount('')
    setResults(null)
    const DataService = await import('../services/DataService')
    await DataService.setGoalSettings(0)
  }

  return (
    <div className="goal-page">
      <div className="goal-header">
        <div>
          <h1>Goal Setter</h1>
          <p>Plan how to reach your big financial goals using your real income and expenses.</p>
        </div>
      </div>

      <div className="goal-layout">
        <div className="goal-input-card">
          <h3>Set Your Goal</h3>
          <form onSubmit={calculate}>
            <div className="form-group">
              <label>Goal Amount</label>
              <div className="goal-amount-row">
                <span className="currency-symbol">{CurrencyService.getSymbol(currency)}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  placeholder={currency === 'INR' ? "e.g. 10000000 (1 Crore)" : "Enter goal amount"}
                  required
                />
              </div>
            </div>
            <p className="helper-text">
              <Info size={14} /> We estimate using your net savings trend from roughly the last 3 months.
            </p>
            {goalAmount && parseFloat(goalAmount) > 0 && (
              <div className="goal-amount-display">
                <p>
                  <strong>Goal:</strong> {CurrencyService.format(parseFloat(goalAmount), currency)}
                </p>
              </div>
            )}
            <div className="goal-form-actions">
              <button type="submit" className="btn btn-primary">
                <Target size={18} />
                Calculate Plan
              </button>
              {(results || goalAmount) && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearGoal}
                >
                  Clear Goal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="goal-result-card">
          {results ? (
            <>
              <div className="result-header">
                <div className="result-main">
                  <Calendar size={32} />
                  <div>
                    <p className="label">Estimated Time to Goal</p>
                    {results.daysNeeded !== null ? (
                      <h2>
                        {results.daysNeeded} days
                        {results.yearsNeeded && results.yearsNeeded >= 1 && (
                          <span className="sub-label">
                            {' '}(~{results.yearsNeeded.toFixed(1)} years)
                          </span>
                        )}
                      </h2>
                    ) : (
                      <h2>Not achievable with current pattern</h2>
                    )}
                  </div>
                </div>
              </div>

              <p className="result-message">{results.message}</p>

              <div className="goal-stats">
                <div className="goal-stat">
                  <span className="stat-label">Required Daily Saving</span>
                  <span className="stat-value">
                    {CurrencyService.format(results.dailyRate, currency)}
                  </span>
                </div>
                <div className="goal-stat">
                  <span className="stat-label">Required Monthly Saving</span>
                  <span className="stat-value">
                    {CurrencyService.format(results.monthlyRate, currency)}
                  </span>
                </div>
                <div className="goal-stat">
                  <span className="stat-label">Required Yearly Saving</span>
                  <span className="stat-value">
                    {CurrencyService.format(results.yearlyRate, currency)}
                  </span>
                </div>
              </div>

              <div className="hint-banner">
                <TrendingUp size={18} />
                <span>
                  Increase income or reduce expenses to raise your saving rate and reach the goal faster.
                </span>
              </div>
            </>
          ) : (
            <div className="empty-state-large">
              <Target size={48} />
              <p>Enter a goal amount to see how long it will take to reach it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function computeGoalResults(target, transactions, currency) {
  // Compute average daily net savings from the last 90 days
  const now = new Date()
  const pastDate = new Date()
  pastDate.setDate(now.getDate() - 90)

  const recent = transactions.filter(t => {
    const d = new Date(t.date)
    return d >= pastDate && d <= now
  })

  const convertAmount = (amount) => {
    return CurrencyService.convert(amount, CurrencyService.getBaseCurrency(), currency)
  }

  const totalIncome = recent
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + convertAmount(parseFloat(t.amount || 0)), 0)

  const totalExpenses = recent
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + convertAmount(parseFloat(t.amount || 0)), 0)

  const netSavings = totalIncome - totalExpenses
  const daysConsidered = Math.max(
    1,
    Math.round((now.getTime() - pastDate.getTime()) / (1000 * 60 * 60 * 24))
  )
  const dailyRate = netSavings / daysConsidered

  if (dailyRate <= 0) {
    return {
      achievable: false,
      message: 'Your current income and expenses do not generate positive savings. Increase income or reduce expenses to reach this goal.',
      dailyRate: 0,
      monthlyRate: 0,
      yearlyRate: 0,
      daysNeeded: null,
      yearsNeeded: null
    }
  }

  const daysNeeded = Math.ceil(target / dailyRate)
  const yearsNeeded = daysNeeded / 365

  return {
    achievable: true,
    message: 'Based on your current saving pattern, here is how long it would take to reach this goal.',
    dailyRate,
    monthlyRate: dailyRate * 30,
    yearlyRate: dailyRate * 365,
    daysNeeded,
    yearsNeeded
  }
}

export default GoalSetter

