/**
 * Analytics Microservice
 * Provides advanced financial analytics and insights
 */

class AnalyticsService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Get spending trends over time
   */
  getSpendingTrends(transactions, period = 'monthly') {
    const cacheKey = `trends_${period}_${transactions.length}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    const trends = {
      income: [],
      expense: [],
      net: [],
      labels: []
    }

    if (period === 'monthly') {
      const monthlyData = this._groupByMonth(transactions)
      
      Object.keys(monthlyData).sort().forEach(month => {
        const data = monthlyData[month]
        const income = data.filter(t => t.type === 'income')
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
        const expense = data.filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
        
        trends.income.push(income)
        trends.expense.push(expense)
        trends.net.push(income - expense)
        trends.labels.push(month)
      })
    } else if (period === 'weekly') {
      const weeklyData = this._groupByWeek(transactions)
      
      Object.keys(weeklyData).sort().forEach(week => {
        const data = weeklyData[week]
        const income = data.filter(t => t.type === 'income')
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
        const expense = data.filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
        
        trends.income.push(income)
        trends.expense.push(expense)
        trends.net.push(income - expense)
        trends.labels.push(week)
      })
    }

    this.cache.set(cacheKey, trends)
    setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout)

    return trends
  }

  /**
   * Get category breakdown with insights
   */
  getCategoryInsights(transactions) {
    const cacheKey = `category_${transactions.length}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    const categoryMap = {}
    
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      const category = transaction.category || 'Other'
      if (!categoryMap[category]) {
        categoryMap[category] = {
          total: 0,
          count: 0,
          average: 0,
          transactions: []
        }
      }
      
      const amount = parseFloat(transaction.amount || 0)
      categoryMap[category].total += amount
      categoryMap[category].count += 1
      categoryMap[category].transactions.push(transaction)
    })

    // Calculate averages and percentages
    const totalExpenses = Object.values(categoryMap)
      .reduce((sum, cat) => sum + cat.total, 0)

    const insights = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count,
      average: data.total / data.count,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      trend: this._calculateTrend(data.transactions)
    })).sort((a, b) => b.total - a.total)

    this.cache.set(cacheKey, insights)
    setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout)

    return insights
  }

  /**
   * Get financial health score
   */
  getFinancialHealthScore(transactions, budgets) {
    let score = 100
    const insights = []

    // Calculate total income and expenses
    const totalIncome = transactions.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
    
    const totalExpenses = transactions.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

    // Savings rate (30% is ideal)
    if (totalIncome > 0) {
      const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100
      if (savingsRate < 0) {
        score -= 30
        insights.push({ type: 'error', message: 'Spending exceeds income' })
      } else if (savingsRate < 10) {
        score -= 15
        insights.push({ type: 'warning', message: 'Low savings rate' })
      } else if (savingsRate >= 30) {
        insights.push({ type: 'success', message: 'Excellent savings rate' })
      }
    }

    // Budget adherence
    budgets.forEach(budget => {
      const spent = this._getBudgetSpent(budget, transactions)
      const percentage = (spent / parseFloat(budget.amount)) * 100
      
      if (percentage > 100) {
        score -= 5
        insights.push({ 
          type: 'error', 
          message: `Exceeded ${budget.category} budget` 
        })
      } else if (percentage > 90) {
        score -= 2
        insights.push({ 
          type: 'warning', 
          message: `Approaching ${budget.category} budget limit` 
        })
      }
    })

    // Transaction frequency (too many transactions might indicate impulse spending)
    const recentTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return transactionDate >= thirtyDaysAgo
    })

    if (recentTransactions.length > 100) {
      score -= 10
      insights.push({ 
        type: 'warning', 
        message: 'High transaction frequency detected' 
      })
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      insights,
      grade: this._getGrade(score)
    }
  }

  /**
   * Get spending predictions
   */
  getSpendingPrediction(transactions, months = 3) {
    const monthlySpending = this._groupByMonth(transactions)
      .filter(t => t.type === 'expense')
    
    const averages = {}
    const predictions = []

    // Calculate average spending per category
    Object.values(monthlySpending).forEach(monthData => {
      monthData.forEach(transaction => {
        const category = transaction.category || 'Other'
        if (!averages[category]) {
          averages[category] = []
        }
        averages[category].push(parseFloat(transaction.amount || 0))
      })
    })

    // Predict future spending
    Object.entries(averages).forEach(([category, amounts]) => {
      const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
      predictions.push({
        category,
        predictedAmount: avg * months,
        monthlyAverage: avg,
        confidence: amounts.length > 3 ? 'high' : 'medium'
      })
    })

    return predictions
  }

  /**
   * Get top spending categories
   */
  getTopCategories(transactions, limit = 5) {
    const insights = this.getCategoryInsights(transactions)
    return insights.slice(0, limit)
  }

  // Private helper methods
  _groupByMonth(transactions) {
    const groups = {}
    transactions.forEach(transaction => {
      const date = new Date(transaction.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(transaction)
    })
    return groups
  }

  _groupByWeek(transactions) {
    const groups = {}
    transactions.forEach(transaction => {
      const date = new Date(transaction.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + 6 - weekStart.getDay()) / 7)).padStart(2, '0')}`
      
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(transaction)
    })
    return groups
  }

  _getBudgetSpent(budget, transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7)
    return transactions
      .filter(t => 
        t.type === 'expense' && 
        t.category === budget.category &&
        t.date.startsWith(currentMonth)
      )
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
  }

  _calculateTrend(transactions) {
    if (transactions.length < 2) return 'stable'
    
    const sorted = transactions.sort((a, b) => new Date(a.date) - new Date(b.date))
    const recent = sorted.slice(-3)
    const older = sorted.slice(0, Math.max(1, sorted.length - 3))
    
    const recentAvg = recent.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) / recent.length
    const olderAvg = older.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) / older.length
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100
    
    if (change > 10) return 'increasing'
    if (change < -10) return 'decreasing'
    return 'stable'
  }

  _getGrade(score) {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }
}

// Export singleton instance
export default new AnalyticsService()
