import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StockSearch } from './StockSearch'
import { usePortfolio } from '../../hooks/usePortfolio'
import { useAppStore } from '../../store/useAppStore'
import { Stock } from '../../types'
import { Button } from '../ui/Button'

export function PortfolioInput() {
  const { user } = useAppStore()
  const { portfolio, addStocks } = usePortfolio(user?.id)
  const navigate = useNavigate()
  const [pendingStocks, setPendingStocks] = useState<Stock[]>([])
  const [saving, setSaving] = useState(false)

  const handleSelect = (stock: Stock) => {
    const alreadyPending = pendingStocks.some(s => s.code === stock.code)
    const alreadyExists = portfolio.some(p => p.stockCode === stock.code)
    if (!alreadyPending && !alreadyExists) {
      setPendingStocks(prev => [...prev, stock])
    }
  }

  const handleRemovePending = (code: string) => {
    setPendingStocks(prev => prev.filter(s => s.code !== code))
  }

  const handleSave = async () => {
    setSaving(true)
    if (pendingStocks.length > 0) {
      await addStocks(pendingStocks)
    }
    setSaving(false)
    navigate('/portfolio')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/portfolio')}
          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">종목 추가</h1>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        {/* 검색 */}
        <div>
          <p className="text-sm text-gray-500 mb-3">보유 종목을 검색해서 추가하세요</p>
          <StockSearch onSelect={handleSelect} />
        </div>

        {/* 추가할 종목 */}
        {pendingStocks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              추가할 종목 ({pendingStocks.length}개)
            </h3>
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {pendingStocks.map(stock => (
                <div key={stock.code} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                      stock.market === 'KR'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-orange-50 text-orange-600'
                    }`}>
                      {stock.market}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">{stock.name}</span>
                    {stock.nameKo && (
                      <span className="text-xs text-gray-400 shrink-0">{stock.nameKo}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemovePending(stock.code)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 shrink-0 ml-2 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 이미 등록된 종목 */}
        {portfolio.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              이미 등록된 종목 ({portfolio.length}개)
            </h3>
            <div className="flex flex-wrap gap-2">
              {portfolio.map(item => (
                <span
                  key={item.id}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-500 rounded-full"
                >
                  {item.stockName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 완료 버튼 */}
      <div className="max-w-lg mx-auto w-full px-4 pb-8 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          fullWidth
        >
          {saving
            ? '저장 중...'
            : pendingStocks.length > 0
              ? `${pendingStocks.length}개 종목 추가`
              : '완료'}
        </Button>
      </div>
    </div>
  )
}
