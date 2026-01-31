import React, { useState, useEffect } from 'react'
import { Globe, RefreshCw, Check } from 'lucide-react'
import CurrencyService from '../services/CurrencyService'
import './CurrencySelector.css'

const CurrencySelector = ({ onCurrencyChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState(CurrencyService.getBaseCurrency())
  const [isLoading, setIsLoading] = useState(false)
  const currencies = CurrencyService.getSupportedCurrencies()

  useEffect(() => {
    // Initialize currency service and fetch rates
    CurrencyService.initialize()
  }, [])

  const handleCurrencySelect = async (currencyCode) => {
    setSelectedCurrency(currencyCode)
    CurrencyService.setBaseCurrency(currencyCode)
    setIsOpen(false)
    
    if (onCurrencyChange) {
      onCurrencyChange(currencyCode)
    }
  }

  const handleRefreshRates = async () => {
    setIsLoading(true)
    try {
      await CurrencyService.fetchExchangeRates('USD')
      // Trigger a refresh if callback exists
      if (onCurrencyChange) {
        onCurrencyChange(selectedCurrency)
      }
    } catch (error) {
      console.error('Failed to refresh rates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const currentCurrency = currencies.find(c => c.code === selectedCurrency) || currencies[0]

  return (
    <div className="currency-selector">
      <button 
        className="currency-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Change Currency"
      >
        <Globe size={18} />
        <span className="currency-code">{selectedCurrency}</span>
        <span className="currency-symbol">{currentCurrency.symbol}</span>
      </button>

      {isOpen && (
        <>
          <div className="currency-overlay" onClick={() => setIsOpen(false)} />
          <div className="currency-dropdown">
            <div className="currency-dropdown-header">
              <h3>Select Currency</h3>
              <button 
                className="refresh-rates-btn"
                onClick={handleRefreshRates}
                disabled={isLoading}
                title="Refresh Exchange Rates"
              >
                <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
              </button>
            </div>
            <div className="currency-list">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  className={`currency-option ${selectedCurrency === currency.code ? 'selected' : ''}`}
                  onClick={() => handleCurrencySelect(currency.code)}
                >
                  <div className="currency-info">
                    <span className="currency-symbol-large">{currency.symbol}</span>
                    <div>
                      <div className="currency-name">{currency.name}</div>
                      <div className="currency-code-small">{currency.code}</div>
                    </div>
                  </div>
                  {selectedCurrency === currency.code && (
                    <Check size={20} className="check-icon" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CurrencySelector
