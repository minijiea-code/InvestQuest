import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { getDailyQuestCount } from '../../lib/streakUtils'
import { useQuestData } from '../../hooks/useQuestData'

export function QuestEntry() {
  const { questId } = useParams<{ questId: string }>()
  const navigate = useNavigate()
  const { questProgress, setQuestProgress, user } = useAppStore()
  const { quest, loading } = useQuestData(questId)

  const isAutoQuest = questId?.startsWith('quest_auto_') ?? false
  const today = new Date().toISOString().split('T')[0]

  // 일일 한도 비활성화 (MVP 데모)
  const dailyCount = getDailyQuestCount(user?.last_quest_date ?? null, user?.daily_quest_count)
  const limitReached = false && dailyCount >= 2

  // auto 퀘스트 완료 여부 (localStorage 기반)
  const newsQuestDoneToday = isAutoQuest && localStorage.getItem('news_quest_completed_date') === today

  const inProgress = questProgress?.questId === questId && !limitReached && !newsQuestDoneToday

  // 일일 한도 초과 → 퀘스트 유형별 리다이렉트
  if (limitReached) {
    if (isAutoQuest) return <Navigate to="/explore" replace />
    const dismissed = localStorage.getItem('paywall_dismissed_date') === today
    return <Navigate to={dismissed ? '/home' : '/paywall'} replace />
  }

  // 뉴스 퀘스트 이미 완료 → 탐색 탭으로
  if (newsQuestDoneToday) return <Navigate to="/explore" replace />

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        퀘스트 불러오는 중...
      </div>
    )
  }

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-gray-400 mb-4">퀘스트를 찾을 수 없어요.</p>
          <Button onClick={() => navigate(isAutoQuest ? '/explore' : '/home')}>
            {isAutoQuest ? '탐색 탭으로' : '홈으로'}
          </Button>
        </div>
      </div>
    )
  }

  function startFresh() {
    setQuestProgress(null)
    navigate(`/quest/${questId}/play`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6">
      <button
        onClick={() => navigate(isAutoQuest ? '/explore' : '/home')}
        className="self-start mt-12 mb-8 p-2 -ml-2 text-gray-400 hover:text-gray-600"
      >
        ← {isAutoQuest ? '탐색' : '홈'}
      </button>

      <div className="flex-1 flex flex-col justify-center">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
          {quest.category}
        </span>

        <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-snug">{quest.title}</h1>

        <div className="flex items-center gap-4 mb-10">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>⏱</span>
            <span>약 {quest.estimatedMinutes}분</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>📝</span>
            <span>
              퀴즈{' '}
              {
                quest.screens.filter(
                  (s) =>
                    s.type === 'single_choice' ||
                    s.type === 'multi_choice' ||
                    s.type === 'drag_match',
                ).length
              }
              문항
            </span>
          </div>
        </div>

        {quest.learningPoints && quest.learningPoints.length > 0 && (
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 mb-10">
            <p className="text-sm font-semibold text-primary mb-2">이 퀘스트에서 배우는 것</p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              {quest.learningPoints.map((point, i) => (
                <li key={i}>• {point}</li>
              ))}
            </ul>
          </div>
        )}

        {inProgress && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <span className="text-xl">⏸</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">진행 중인 퀘스트가 있어요</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {questProgress!.currentScreenIndex + 1}번 화면까지 진행했어요
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pb-12 space-y-3">
        {inProgress ? (
          <>
            <Button fullWidth size="lg" onClick={() => navigate(`/quest/${questId}/play`)}>
              이어서 하기 →
            </Button>
            <button
              onClick={startFresh}
              className="w-full text-center text-sm text-gray-400 py-2"
            >
              처음부터 다시 하기
            </button>
          </>
        ) : (
          <Button fullWidth size="lg" onClick={startFresh}>
            퀘스트 시작하기 →
          </Button>
        )}
      </div>
    </div>
  )
}
