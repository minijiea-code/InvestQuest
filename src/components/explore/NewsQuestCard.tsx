import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import type { NewsQuestMeta } from '../../hooks/useNewsQuest'

interface Props {
  quest: NewsQuestMeta
  completed?: boolean
}

export function NewsQuestCard({ quest, completed = false }: Props) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">🎯</span>
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">관련 퀘스트</p>
        {completed && (
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            ✓ 완료
          </span>
        )}
      </div>
      <h2 className="text-base font-bold text-gray-900 mb-1 leading-snug">{quest.title}</h2>
      <p className="text-sm text-gray-500 mb-4">{quest.description}</p>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">
          뉴스
        </span>
        <span className="text-xs text-gray-400">⏱ {quest.estimatedMinutes}분</span>
      </div>
      {completed ? (
        <div className="w-full py-3 rounded-2xl bg-gray-100 text-sm font-medium text-gray-400 text-center">
          오늘 퀘스트 완료 ✅
        </div>
      ) : (
        <Button fullWidth onClick={() => navigate(`/quest/${quest.id}`)}>
          시작하기 →
        </Button>
      )}
    </div>
  )
}
