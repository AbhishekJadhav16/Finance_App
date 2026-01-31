/**
 * Currency Conversion Microservice
 * Handles currency conversion and exchange rate management
 */

class CurrencyService {
  constructor() {
    this.baseCurrency = localStorage.getItem('selectedCurrency') || 'USD'
    this.exchangeRates = this.loadExchangeRates()
    this.lastUpdate = localStorage.getItem('exchangeRatesLastUpdate')
    
    // Default exchange rates (fallback if API fails)
    this.defaultRates = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 150.0,
      INR: 83.0,
      AUD: 1.52,
      CAD: 1.35,
      CHF: 0.88,
      CNY: 7.20,
      NZD: 1.64,
      BRL: 4.95,
      MXN: 17.0,
      KRW: 1320.0,
      SGD: 1.34,
      HKD: 7.82,
      ZAR: 18.5
    }
  }

  /**
   * Get list of supported currencies
   */
  getSupportedCurrencies() {
    return [
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'EUR', symbol: '€', name: 'Euro' },
      { code: 'GBP', symbol: '£', name: 'British Pound' },
      { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
      { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
      { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
      { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
      { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
      { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
      { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
      { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
      { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
      { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
      { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
      { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
      { code: 'ZAR', symbol: 'R', name: 'South African Rand' }
    ]
  }

  /**
   * Load exchange rates from localStorage or use defaults
   */
  loadExchangeRates() {
    const stored = localStorage.getItem('exchangeRates')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        return this.defaultRates
      }
    }
    return this.defaultRates
  }

  /**
   * Fetch latest exchange rates from API (using free tier ExchangeRate-API)
   * Fallback to default rates if API call fails
   */
  async fetchExchangeRates(baseCurrency = 'USD') {
    try {
      // Using a free exchange rate API (alternative approach)
      // In production, use a proper API key
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`)
      
      if (response.ok) {
        const data = await response.json()
        const rates = { [baseCurrency]: 1.0, ...data.rates }
        
        // Store rates
        localStorage.setItem('exchangeRates', JSON.stringify(rates))
        localStorage.setItem('exchangeRatesLastUpdate', new Date().toISOString())
        
        this.exchangeRates = rates
        this.lastUpdate = new Date().toISOString()
        
        return rates
      } else {
        throw new Error('API request failed')
      }
    } catch (error) {
      console.warn('Failed to fetch exchange rates, using defaults:', error)
      // Use default rates if API fails
      this.exchangeRates = this.defaultRates
      return this.defaultRates
    }
  }

  /**
   * Convert amount from one currency to another
   */
  convert(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount
    
    const rates = this.exchangeRates || this.defaultRates
    
    // Convert to base currency (USD) first
    const usdAmount = amount / (rates[fromCurrency] || 1)
    
    // Convert from base currency to target
    const convertedAmount = usdAmount * (rates[toCurrency] || 1)
    
    return convertedAmount
  }

  /**
   * Format number in Indian numbering system (Lakhs/Crores)
   */
  formatIndianNumber(amount) {
    if (amount >= 10000000) {
      // Crores
      const crores = amount / 10000000
      return `${crores.toFixed(2)} Crore${crores !== 1 ? 's' : ''}`
    } else if (amount >= 100000) {
      // Lakhs
      const lakhs = amount / 100000
      return `${lakhs.toFixed(2)} Lakh${lakhs !== 1 ? 's' : ''}`
    } else if (amount >= 1000) {
      // Thousands
      const thousands = amount / 1000
      return `${thousands.toFixed(2)}K`
    }
    return amount.toFixed(2)
  }

  /**
   * Format currency value with symbol
   */
  format(amount, currencyCode) {
    const currency = this.getSupportedCurrencies().find(c => c.code === currencyCode) || 
                     { code: 'USD', symbol: '$', name: 'US Dollar' }
    
    // For INR, use Indian numbering system for large numbers
    if (currencyCode === 'INR' && Math.abs(amount) >= 100000) {
      const sign = amount < 0 ? '-' : ''
      const absAmount = Math.abs(amount)
      const formatted = this.formatIndianNumber(absAmount)
      
      // For some currencies, symbol comes after
      return `${sign}${formatted} ${currency.symbol}`
    }
    
    // Format number with proper decimals
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
    
    // For some currencies, symbol comes after
    if (['EUR', 'GBP', 'INR'].includes(currencyCode)) {
      return `${formatted} ${currency.symbol}`
    }
    
    return `${currency.symbol}${formatted}`
  }

  /**
   * Get currency symbol
   */
  getSymbol(currencyCode) {
    const currency = this.getSupportedCurrencies().find(c => c.code === currencyCode)
    return currency ? currency.symbol : '$'
  }

  /**
   * Set base currency
   */
  setBaseCurrency(currencyCode) {
    this.baseCurrency = currencyCode
    localStorage.setItem('selectedCurrency', currencyCode)
  }

  /**
   * Get base currency
   */
  getBaseCurrency() {
    return this.baseCurrency
  }

  /**
   * Check if rates need updating (older than 24 hours)
   */
  shouldUpdateRates() {
    if (!this.lastUpdate) return true
    
    const lastUpdateTime = new Date(this.lastUpdate).getTime()
    const now = new Date().getTime()
    const hoursDiff = (now - lastUpdateTime) / (1000 * 60 * 60)
    
    return hoursDiff > 24
  }

  /**
   * Initialize service and fetch rates if needed
   */
  async initialize() {
    if (this.shouldUpdateRates()) {
      await this.fetchExchangeRates('USD')
    }
  }
}

// Export singleton instance
export default new CurrencyService()
