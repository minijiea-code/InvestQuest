import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import type { NewsQuestMeta } from '../../hooks/useNewsQuest'

interface Props {
  quest: NewsQuestMeta
  disabled?: boolean
}

export function NewsQuestCard({ quest, disabled = false }: Props) {
  const navigate = useNavigate()

  const sourceDate = quest.newsSource?.date
    ? quest.newsSource.date.replace(/-/g, '.')
    : new Date().toISOString().slice(0, 10).replace(/-/g, '.')

  return (
    <Card padding="lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📰</span>
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
          오늘의 뉴스 퀘스트
        </p>
      </div>
      <h2 className="text-base font-bold text-gray-900 mb-1 leading-snug">{quest.title}</h2>
      <p className="text-sm text-gray-500 mb-4">{quest.description}</p>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">
          뉴스
        </span>
        <span className="text-xs text-gray-400">한국경제 · {sourceDate}</span>
        <span className="text-xs text-gray-400">⏱ {quest.estimatedMinutes}분</span>
      </div>
      {disabled ? (
        <div className="w-full py-3 rounded-2xl bg-gray-100 text-sm font-medium text-gray-400 text-center">
          오늘 퀘스트 완료 ✅
        </div>
      ) : (
        <Button fullWidth onClick={() => navigate(`/quest/${quest.id}`)}>
          시작하기 →
        </Button>
      )}
    </Card>
  )
}
