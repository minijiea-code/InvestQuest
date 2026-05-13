import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'
import { getDailyQuestCount } from '../lib/streakUtils'
import { getQuest, QUEST_SEQUENCE } from '../data/quests'

const GRADE_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

const MARKET_ITEMS = [
  { label: '코스피', value: '2,845', change: '+0.8%', up: true },
  { label: '코스닥', value: '842', change: '+1.2%', up: true },
  { label: '원/달러', value: '1,380원', change: '-0.3%', up: false },
]

export function Home() {
  const navigate = useNavigate()
  const { user, questProgress } = useAppStore()

  const streak = user?.streak ?? 0
  const dailyCount = getDailyQuestCount(user?.last_quest_date ?? null, user?.daily_quest_count)
  const limitReached = dailyCount >= 2

  const currentQuestId = QUEST_SEQUENCE[Math.min(user?.total_quest_count ?? 0, QUEST_SEQUENCE.length - 1)]
  const currentQuest = getQuest(currentQuestId)
  const inProgress = questProgress?.questId === currentQuestId && !limitReached

  const showPersonalityCard =
    (user?.total_quest_count ?? 0) >= 2 &&
    !user?.personality_diagnosis_completed &&
    localStorage.getItem('personality_dismissed') === 'true'

  return (
    <PageLayout>
      <div className="px-4 pt-6 space-y-4">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-gray-500 text-sm">안녕하세요!</p>
            <h1 className="text-xl font-bold text-gray-900">오늘도 퀘스트 도전해볼까요?</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            {user?.grade && (
              <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full font-medium">
                {GRADE_LABEL[user.grade]}
              </span>
            )}
            <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-2xl">
              <span className="text-base">🔥</span>
              <span className="font-bold text-amber-600 text-sm">{streak}일</span>
            </div>
          </div>
        </div>

        {/* 성향 진단 카드 (나중에 선택 후 노출) */}
        {showPersonalityCard && (
          <button onClick={() => navigate('/personality')} className="w-full text-left">
            <Card padding="lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-2xl">🎯</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-primary mb-0.5">맞춤 학습 준비</p>
                  <p className="text-sm font-bold text-gray-900">투자 성향 진단하기</p>
                  <p className="text-xs text-gray-400 mt-0.5">5가지 질문 · 약 1분</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-300 shrink-0">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Card>
          </button>
        )}

        {/* 오늘의 퀘스트 카드 */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">오늘의 퀘스트</p>
            {limitReached && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ 완료</span>
            )}
            {inProgress && !limitReached && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">진행 중</span>
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {currentQuest?.title ?? '오늘의 퀘스트'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">{currentQuest?.description ?? ''}</p>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs bg-primary-50 text-primary px-2 py-1 rounded-full font-medium">
              {currentQuest?.category ?? '기초'}
            </span>
            <span className="text-xs text-gray-400">⏱ {currentQuest?.estimatedMinutes ?? 5}분</span>
          </div>
          {limitReached ? (
            <div className="w-full py-3 rounded-2xl bg-gray-100 text-sm font-medium text-gray-400 text-center">
              오늘 퀘스트 완료 ✅
            </div>
          ) : inProgress ? (
            <Button fullWidth onClick={() => navigate(`/quest/${currentQuestId}`)}>
              이어서 하기 →
            </Button>
          ) : dailyCount > 0 ? (
            <Button fullWidth onClick={() => navigate(`/quest/${currentQuestId}`)}>
              하나 더 할까요? →
            </Button>
          ) : (
            <Button fullWidth onClick={() => navigate(`/quest/${currentQuestId}`)}>
              퀘스트 시작하기 →
            </Button>
          )}
        </Card>

        {/* 스트릭 카드 */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">나의 학습 스트릭</h3>
            <span className="text-2xl">🔥</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${i < Math.min(streak, 7) ? 'bg-amber-400' : 'bg-gray-100'}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {streak === 0 ? '오늘 첫 퀘스트를 완료해보세요!' : `${streak}일 연속 학습 중!`}
          </p>
        </Card>

        {/* 시장 요약 */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">오늘의 시장</h3>
            <span className="text-xs text-gray-400">더미 데이터</span>
          </div>
          <div className="space-y-2">
            {MARKET_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  <span className={`text-xs font-semibold ${item.up ? 'text-red-500' : 'text-blue-500'}`}>
                    {item.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">시장 데이터 실시간 연동 예정</p>
        </Card>

      </div>
    </PageLayout>
  )
}
