import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react'
import CurrencyService from '../services/CurrencyService'
import './Stocks.css'

const Stocks = () => {
  const [stocks, setStocks] = useState([])
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showSellModal, setShowSellModal] = useState(false)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)
  const [selectedPriceStock, setSelectedPriceStock] = useState(null)
  const [currency, setCurrency] = useState(CurrencyService.getBaseCurrency())
  const [buyFormData, setBuyFormData] = useState({
    name: '',
    buyPrice: '',
    quantity: '',
    buyDate: new Date().toISOString().split('T')[0]
  })
  const [sellFormData, setSellFormData] = useState({
    sellPrice: '',
    sellDate: new Date().toISOString().split('T')[0]
  })
  const [priceFormData, setPriceFormData] = useState({
    currentPrice: ''
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const DataService = await import('../services/DataService')
      const saved = await DataService.getStocks()
      if (!cancelled) setStocks(Array.isArray(saved) ? saved : [])
    }
    load()

    CurrencyService.initialize()
    const handleCurrencyChange = (event) => setCurrency(event.detail)
    window.addEventListener('currencyChanged', handleCurrencyChange)
    return () => {
      cancelled = true
      window.removeEventListener('currencyChanged', handleCurrencyChange)
    }
  }, [])

  const saveStocks = async (newStocks) => {
    setStocks(newStocks)
    const DataService = await import('../services/DataService')
    await DataService.setStocks(newStocks)
  }

  const convertAmount = (amount) => {
    return CurrencyService.convert(amount, CurrencyService.getBaseCurrency(), currency)
  }

  const handleBuySubmit = async (e) => {
    e.preventDefault()
    const buyPrice = parseFloat(buyFormData.buyPrice)
    const quantity = parseFloat(buyFormData.quantity)
    const investedAmount = buyPrice * quantity

    const newStock = {
      id: Date.now(),
      name: buyFormData.name.trim(),
      buyPrice: buyPrice,
      quantity: quantity,
      investedAmount: investedAmount,
      buyDate: buyFormData.buyDate,
      status: 'HOLDING',
      sellPrice: null,
      sellDate: null,
      sellValue: null,
      profitOrLoss: null,
      currentPrice: null
    }

    await saveStocks([...stocks, newStock])
    resetBuyForm()
    setShowBuyModal(false)
  }

  const handleSellSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStock) return

    const sellPrice = parseFloat(sellFormData.sellPrice)
    const sellValue = sellPrice * selectedStock.quantity
    const profitOrLoss = sellValue - selectedStock.investedAmount

    const updatedStocks = stocks.map(stock =>
      stock.id === selectedStock.id
        ? {
            ...stock,
            status: 'SOLD',
            sellPrice: sellPrice,
            sellDate: sellFormData.sellDate,
            sellValue: sellValue,
            profitOrLoss: profitOrLoss
          }
        : stock
    )
    await saveStocks(updatedStocks)

    const DataService = await import('../services/DataService')
    const transactions = await DataService.getTransactions()
    const newTransaction = {
      id: Date.now(),
      description: `${selectedStock.name} - Stock ${profitOrLoss >= 0 ? 'Profit' : 'Loss'}`,
      amount: Math.abs(profitOrLoss),
      type: profitOrLoss >= 0 ? 'income' : 'expense',
      category: profitOrLoss >= 0 ? 'Stock Profit' : 'Stock Loss',
      date: sellFormData.sellDate
    }
    await DataService.setTransactions([...transactions, newTransaction])

    resetSellForm()
    setShowSellModal(false)
    setSelectedStock(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this stock? This action cannot be undone.')) {
      await saveStocks(stocks.filter(stock => stock.id !== id))
    }
  }

  const handleDeleteSold = async (id) => {
    if (window.confirm('Are you sure you want to remove this sold stock from the list?')) {
      const remaining = stocks.filter(stock => stock.id !== id)
      await saveStocks(remaining)
    }
  }

  const handleSellClick = (stock) => {
    setSelectedStock(stock)
    setSellFormData({
      sellPrice: '',
      sellDate: new Date().toISOString().split('T')[0]
    })
    setShowSellModal(true)
  }

  const resetBuyForm = () => {
    setBuyFormData({
      name: '',
      buyPrice: '',
      quantity: '',
      buyDate: new Date().toISOString().split('T')[0]
    })
  }

  const resetSellForm = () => {
    setSellFormData({
      sellPrice: '',
      sellDate: new Date().toISOString().split('T')[0]
    })
  }

  const handleUpdatePriceClick = (stock) => {
    setSelectedPriceStock(stock)
    setPriceFormData({
      currentPrice: stock.currentPrice != null ? stock.currentPrice.toString() : ''
    })
    setShowPriceModal(true)
  }

  const handlePriceSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPriceStock) return

    const currentPrice = parseFloat(priceFormData.currentPrice)
    if (Number.isNaN(currentPrice)) return

    const updatedStocks = stocks.map(stock =>
      stock.id === selectedPriceStock.id
        ? { ...stock, currentPrice }
        : stock
    )
    await saveStocks(updatedStocks)

    setShowPriceModal(false)
    setSelectedPriceStock(null)
    setPriceFormData({ currentPrice: '' })
  }

  const holdings = stocks.filter(s => s.status === 'HOLDING')
  const soldStocks = stocks.filter(s => s.status === 'SOLD')

  const totalInvested = holdings.reduce((sum, stock) => sum + convertAmount(stock.investedAmount), 0)
  const totalProfitLoss = soldStocks.reduce((sum, stock) => sum + convertAmount(stock.profitOrLoss || 0), 0)
  const totalUnrealized = holdings.reduce((sum, stock) => {
    if (stock.currentPrice == null) return sum
    const unrealizedBase = (stock.currentPrice - stock.buyPrice) * stock.quantity
    return sum + convertAmount(unrealizedBase)
  }, 0)

  return (
    <div className="stocks-page">
      <div className="stocks-header">
        <div>
          <h1>Stock Market</h1>
          <p>Track your stock investments and profits</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetBuyForm(); setShowBuyModal(true); }}>
          <Plus size={20} />
          Add Stock (Buy)
        </button>
      </div>

      <div className="stocks-summary">
        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
            <Package size={24} color="#6366f1" />
          </div>
          <div>
            <p className="summary-label">Total Invested</p>
            <h3 className="summary-value">{CurrencyService.format(totalInvested, currency)}</h3>
          </div>
        </div>
        <div className={`summary-card ${totalProfitLoss >= 0 ? 'profit' : 'loss'}`}>
          <div className="summary-icon" style={{ 
            background: totalProfitLoss >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' 
          }}>
            {totalProfitLoss >= 0 ? 
              <TrendingUp size={24} color="#10b981" /> : 
              <TrendingDown size={24} color="#ef4444" />
            }
          </div>
          <div>
            <p className="summary-label">Total Profit/Loss</p>
            <h3 className={`summary-value ${totalProfitLoss >= 0 ? 'profit' : 'loss'}`}>
              {totalProfitLoss >= 0 ? '+' : ''}{CurrencyService.format(totalProfitLoss, currency)}
            </h3>
          </div>
        </div>
        <div className={`summary-card ${totalUnrealized >= 0 ? 'profit' : 'loss'}`}>
          <div className="summary-icon" style={{ 
            background: totalUnrealized >= 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(248, 113, 113, 0.2)' 
          }}>
            {totalUnrealized >= 0 ? 
              <TrendingUp size={24} color="#3b82f6" /> : 
              <TrendingDown size={24} color="#f97373" />
            }
          </div>
          <div>
            <p className="summary-label">Unrealized Profit/Loss</p>
            <h3 className={`summary-value ${totalUnrealized >= 0 ? 'profit' : 'loss'}`}>
              {totalUnrealized >= 0 ? '+' : ''}{CurrencyService.format(totalUnrealized, currency)}
            </h3>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'rgba(148, 163, 184, 0.2)' }}>
            <DollarSign size={24} color="#94a3b8" />
          </div>
          <div>
            <p className="summary-label">Active Holdings</p>
            <h3 className="summary-value">{holdings.length}</h3>
          </div>
        </div>
      </div>

      {holdings.length > 0 && (
        <div className="stocks-section">
          <h2 className="section-title">
            <span className="status-badge holding">🟡</span>
            Holdings ({holdings.length})
          </h2>
          <div className="stocks-table-container">
            <table className="stocks-table">
              <thead>
                <tr>
                  <th>Stock Name</th>
                  <th>Buy Price</th>
                  <th>Quantity</th>
                  <th>Invested Amount</th>
                  <th>Buy Date</th>
                  <th>Current Price</th>
                  <th>Unrealized P/L</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((stock) => (
                  <tr key={stock.id}>
                    <td className="stock-name">{stock.name}</td>
                    <td>{CurrencyService.format(convertAmount(stock.buyPrice), currency)}</td>
                    <td>{stock.quantity}</td>
                    <td className="amount">{CurrencyService.format(convertAmount(stock.investedAmount), currency)}</td>
                    <td>{new Date(stock.buyDate).toLocaleDateString()}</td>
                    <td>
                      {stock.currentPrice != null
                        ? CurrencyService.format(convertAmount(stock.currentPrice), currency)
                        : '-'}
                    </td>
                    <td>
                      {stock.currentPrice != null ? (() => {
                        const unrealized = (stock.currentPrice - stock.buyPrice) * stock.quantity
                        return (
                          <span className={`profit-loss ${unrealized >= 0 ? 'profit' : 'loss'}`}>
                            {unrealized >= 0 ? '+' : ''}
                            {CurrencyService.format(convertAmount(unrealized), currency)}
                          </span>
                        )
                      })() : '-'}
                    </td>
                    <td>
                      <span className="status-badge holding">🟡 Holding</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn-icon btn-secondary" 
                          onClick={() => handleUpdatePriceClick(stock)}
                          title="Update Current Price"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-icon btn-success" 
                          onClick={() => handleSellClick(stock)}
                          title="Sell"
                        >
                          <TrendingUp size={16} />
                        </button>
                        <button 
                          className="btn-icon btn-danger" 
                          onClick={() => handleDelete(stock.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {soldStocks.length > 0 && (
        <div className="stocks-section">
          <h2 className="section-title">
            <span className="status-badge sold">✅</span>
            Sold Stocks ({soldStocks.length})
          </h2>
          <div className="stocks-table-container">
            <table className="stocks-table">
              <thead>
                <tr>
                  <th>Stock Name</th>
                  <th>Buy Price</th>
                  <th>Sell Price</th>
                  <th>Quantity</th>
                  <th>Invested</th>
                  <th>Sell Value</th>
                  <th>Profit/Loss</th>
                  <th>Buy Date</th>
                  <th>Sell Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {soldStocks.map((stock) => (
                  <tr key={stock.id}>
                    <td className="stock-name">{stock.name}</td>
                    <td>{CurrencyService.format(convertAmount(stock.buyPrice), currency)}</td>
                    <td>{CurrencyService.format(convertAmount(stock.sellPrice), currency)}</td>
                    <td>{stock.quantity}</td>
                    <td className="amount">{CurrencyService.format(convertAmount(stock.investedAmount), currency)}</td>
                    <td className="amount">{CurrencyService.format(convertAmount(stock.sellValue), currency)}</td>
                    <td className={`profit-loss ${stock.profitOrLoss >= 0 ? 'profit' : 'loss'}`}>
                      {stock.profitOrLoss >= 0 ? '+' : ''}{CurrencyService.format(convertAmount(stock.profitOrLoss), currency)}
                    </td>
                    <td>{new Date(stock.buyDate).toLocaleDateString()}</td>
                    <td>{new Date(stock.sellDate).toLocaleDateString()}</td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn-icon btn-danger" 
                          onClick={() => handleDeleteSold(stock.id)}
                          title="Remove from Sold List"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stocks.length === 0 && (
        <div className="empty-state-large">
          <Package size={64} color="var(--text-muted)" />
          <p>No stocks added yet</p>
          <p className="empty-subtitle">Start tracking your stock investments</p>
          <button className="btn btn-primary" onClick={() => { resetBuyForm(); setShowBuyModal(true); }}>
            <Plus size={20} />
            Add Your First Stock
          </button>
        </div>
      )}

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="modal-overlay" onClick={() => { setShowBuyModal(false); resetBuyForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Stock (Buy)</h2>
            <form onSubmit={handleBuySubmit}>
              <div className="form-group">
                <label>Stock Name / Symbol *</label>
                <input
                  type="text"
                  value={buyFormData.name}
                  onChange={(e) => setBuyFormData({ ...buyFormData, name: e.target.value })}
                  placeholder="e.g., AAPL, TSLA, Reliance"
                  required
                />
              </div>

              <div className="form-group">
                <label>Buy Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyFormData.buyPrice}
                  onChange={(e) => setBuyFormData({ ...buyFormData, buyPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={buyFormData.quantity}
                  onChange={(e) => setBuyFormData({ ...buyFormData, quantity: e.target.value })}
                  placeholder="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Buy Date</label>
                <input
                  type="date"
                  value={buyFormData.buyDate}
                  onChange={(e) => setBuyFormData({ ...buyFormData, buyDate: e.target.value })}
                  required
                />
              </div>

              {buyFormData.buyPrice && buyFormData.quantity && (
                <div className="calculated-amount">
                  <p>Invested Amount: <strong>{CurrencyService.format(
                    convertAmount(parseFloat(buyFormData.buyPrice || 0) * parseFloat(buyFormData.quantity || 0)), 
                    currency
                  )}</strong></p>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setShowBuyModal(false); resetBuyForm(); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && selectedStock && (
        <div className="modal-overlay" onClick={() => { setShowSellModal(false); resetSellForm(); setSelectedStock(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Sell Stock: {selectedStock.name}</h2>
            <div className="sell-stock-info">
              <p><strong>Buy Price:</strong> {CurrencyService.format(convertAmount(selectedStock.buyPrice), currency)}</p>
              <p><strong>Quantity:</strong> {selectedStock.quantity}</p>
              <p><strong>Invested Amount:</strong> {CurrencyService.format(convertAmount(selectedStock.investedAmount), currency)}</p>
            </div>
            <form onSubmit={handleSellSubmit}>
              <div className="form-group">
                <label>Sell Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellFormData.sellPrice}
                  onChange={(e) => setSellFormData({ ...sellFormData, sellPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Sell Date *</label>
                <input
                  type="date"
                  value={sellFormData.sellDate}
                  onChange={(e) => setSellFormData({ ...sellFormData, sellDate: e.target.value })}
                  required
                />
              </div>

              {sellFormData.sellPrice && (
                <div className="calculated-amount">
                  <p>Sell Value: <strong>{CurrencyService.format(
                    convertAmount(parseFloat(sellFormData.sellPrice || 0) * selectedStock.quantity), 
                    currency
                  )}</strong></p>
                  <p className={`profit-loss-preview ${(parseFloat(sellFormData.sellPrice || 0) * selectedStock.quantity - selectedStock.investedAmount) >= 0 ? 'profit' : 'loss'}`}>
                    Profit/Loss: <strong>
                      {(parseFloat(sellFormData.sellPrice || 0) * selectedStock.quantity - selectedStock.investedAmount) >= 0 ? '+' : ''}
                      {CurrencyService.format(
                        convertAmount(parseFloat(sellFormData.sellPrice || 0) * selectedStock.quantity - selectedStock.investedAmount), 
                        currency
                      )}
                    </strong>
                  </p>
                  <p className="info-text">
                    {parseFloat(sellFormData.sellPrice || 0) * selectedStock.quantity - selectedStock.investedAmount >= 0 
                      ? '✅ This profit will be added to Income' 
                      : '⚠️ This loss will be added to Expenses'}
                  </p>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setShowSellModal(false); resetSellForm(); setSelectedStock(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Sell Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Current Price Modal */}
      {showPriceModal && selectedPriceStock && (
        <div className="modal-overlay" onClick={() => { setShowPriceModal(false); setSelectedPriceStock(null); setPriceFormData({ currentPrice: '' }) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Update Current Price: {selectedPriceStock.name}</h2>
            <form onSubmit={handlePriceSubmit}>
              <div className="form-group">
                <label>Current Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceFormData.currentPrice}
                  onChange={(e) => setPriceFormData({ currentPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setShowPriceModal(false); setSelectedPriceStock(null); setPriceFormData({ currentPrice: '' }) }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Stocks
