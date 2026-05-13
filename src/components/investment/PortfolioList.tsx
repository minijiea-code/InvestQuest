import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { PortfolioItem } from '../../types'

interface Props {
  portfolio: PortfolioItem[]
  editMode: boolean
  onToggleEdit: () => void
  onRemove: (id: string) => void
}

export function PortfolioList({ portfolio, editMode, onToggleEdit, onRemove }: Props) {
  const navigate = useNavigate()

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">보유 종목 {portfolio.length}개</h3>
        <button
          onClick={onToggleEdit}
          className="text-sm text-primary font-medium"
        >
          {editMode ? '완료' : '편집'}
        </button>
      </div>

      <div className="space-y-0">
        {portfolio.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                item.market === 'KR'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-orange-50 text-orange-600'
              }`}>
                {item.market}
              </span>
              <span className="text-sm font-medium text-gray-900 truncate">{item.stockName}</span>
              <span className="text-xs text-gray-400 shrink-0">{item.stockCode}</span>
            </div>
            {editMode && (
              <button
                onClick={() => onRemove(item.id)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 shrink-0 ml-2 text-sm font-bold"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/portfolio/register')}
        className="mt-3 w-full text-sm text-primary font-medium text-center py-2 border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
      >
        + 종목 추가
      </button>
    </Card>
  )
}
