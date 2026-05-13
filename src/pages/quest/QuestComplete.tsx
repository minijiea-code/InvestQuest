import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { useQuestData } from '../../hooks/useQuestData'
import { supabase } from '../../lib/supabase'
import { calcNewStreak, isCompletedToday, getDailyQuestCount } from '../../lib/streakUtils'
import { subscribePush, isPushSupported, isPushAlreadyGranted } from '../../hooks/usePushSubscription'

export function QuestComplete() {
  const { questId } = useParams<{ questId: string }>()
  const navigate = useNavigate()
  const { user, setUser } = useAppStore()
  const { quest } = useQuestData(questId)

  const isAutoQuest = questId?.startsWith('quest_auto_') ?? false

  const alreadyDoneToday = isCompletedToday(user?.last_quest_date ?? null)
  const newStreak = user ? calcNewStreak(user.streak, user.last_quest_date) : 1

  // 일일 한도 비활성화 (MVP 데모)
  const currentDailyCount = getDailyQuestCount(user?.last_quest_date ?? null, user?.daily_quest_count)
  const newDailyCount = alreadyDoneToday ? currentDailyCount + 1 : 1
  const fixedLimitReached = false && !isAutoQuest && newDailyCount >= 2

  const [displayStreak, setDisplayStreak] = useState(
    alreadyDoneToday ? (user?.streak ?? 1) : newStreak,
  )
  const [showPersonalityPrompt, setShowPersonalityPrompt] = useState(false)
  const [showPushBanner, setShowPushBanner] = useState(false)

  const updatedRef = useRef(false)

  // 알림 배너 노출 여부 결정 (최대 2회, 이미 허용한 경우 숨김)
  useEffect(() => {
    if (!isPushSupported() || isPushAlreadyGranted()) return
    const count = parseInt(localStorage.getItem('push_prompt_count') ?? '0', 10)
    if (count < 2) setShowPushBanner(true)
  }, [])

  useEffect(() => {
    if (updatedRef.current || !user) return
    updatedRef.current = true

    const today = new Date().toISOString().split('T')[0]
    const newTotalCount = (user.total_quest_count ?? 0) + 1

    if (isAutoQuest) {
      // 뉴스 퀘스트: localStorage에 완료 날짜 저장 + 통합 daily_quest_count 증가
      // total_quest_count는 고정 퀘스트 진행도 전용이므로 뉴스 퀘스트에서는 증가시키지 않음
      localStorage.setItem('news_quest_completed_date', today)

      const updateData: Record<string, unknown> = {
        daily_quest_count: newDailyCount,
      }
      const updatedUser = {
        ...user,
        daily_quest_count: newDailyCount,
      }

      if (!alreadyDoneToday) {
        updateData.streak = newStreak
        updateData.last_quest_date = today
        updatedUser.streak = newStreak
        updatedUser.last_quest_date = today
      }

      supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .then(() => {
          setUser(updatedUser)
          if (!alreadyDoneToday) setDisplayStreak(newStreak)
        })
    } else {
      // 고정 퀘스트: daily_quest_count 증가
      const updatedUser = {
        ...user,
        daily_quest_count: newDailyCount,
        total_quest_count: newTotalCount,
      }
      const updateData: Record<string, unknown> = {
        daily_quest_count: newDailyCount,
        total_quest_count: newTotalCount,
      }

      if (!alreadyDoneToday) {
        updateData.streak = newStreak
        updateData.last_quest_date = today
        updatedUser.streak = newStreak
        updatedUser.last_quest_date = today
      }

      supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .then(() => {
          setUser(updatedUser)
          if (!alreadyDoneToday) setDisplayStreak(newStreak)

          const alreadyDismissed = localStorage.getItem('personality_dismissed') === 'true'
          if (newTotalCount >= 2 && !user.personality_diagnosis_completed && !alreadyDismissed) {
            setTimeout(() => setShowPersonalityPrompt(true), 800)
          }
        })
    }
  }, [])

  function handlePersonalityDismiss() {
    localStorage.setItem('personality_dismissed', 'true')
    setShowPersonalityPrompt(false)
  }

  function handlePushDismiss() {
    const count = parseInt(localStorage.getItem('push_prompt_count') ?? '0', 10)
    localStorage.setItem('push_prompt_count', String(count + 1))
    setShowPushBanner(false)
  }

  async function handlePushAllow() {
    if (user) await subscribePush(user.id)
    setShowPushBanner(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6 pb-12 max-w-lg mx-auto">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-amber-50 rounded-3xl flex items-center justify-center mb-5 border-2 border-amber-100">
          <span className="text-5xl">🔥</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">퀘스트 완료!</h1>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl font-bold text-amber-500">+100 XP</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-8">
          <span>🔥</span>
          <span className="font-semibold text-gray-700">{displayStreak}일 연속 학습 달성!</span>
        </div>

        {quest && quest.keySummary.length > 0 && (
          <div className="w-full bg-white rounded-2xl border border-gray-100 p-5 text-left mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              오늘 배운 것
            </p>
            <ul className="space-y-3">
              {quest.keySummary.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                  <span className="text-green-500 shrink-0 font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 다음 안내 */}
        {isAutoQuest ? (
          <div className="w-full bg-emerald-50 rounded-2xl p-4 border border-emerald-100 text-left">
            <p className="text-xs font-semibold text-emerald-600 mb-1">뉴스 퀘스트 완료 📰</p>
            <p className="text-sm text-gray-700 font-medium">고정 퀘스트도 도전해볼까요?</p>
            <p className="text-xs text-gray-400 mt-1">홈 탭에서 오늘의 퀘스트를 확인하세요 →</p>
          </div>
        ) : fixedLimitReached ? (
          <div className="w-full bg-amber-50 rounded-2xl p-4 border border-amber-100 text-left">
            <p className="text-xs font-semibold text-amber-600 mb-1">오늘의 퀘스트 완료 🎉</p>
            <p className="text-sm text-gray-700 font-medium">내일 새로운 퀘스트가 기다려요!</p>
            <p className="text-xs text-gray-400 mt-1">프리미엄으로 오늘 더 배울 수 있어요</p>
          </div>
        ) : (
          <div className="w-full bg-primary-50 rounded-2xl p-4 border border-primary-100 text-left">
            <p className="text-xs font-semibold text-primary mb-1">다음 퀘스트 예고</p>
            <p className="text-sm text-gray-700 font-medium">
              {questId === 'quest_01'
                ? '투자 자산의 종류 — 주식·채권·ETF'
                : questId === 'quest_02'
                ? '시장 구조와 참여자 — 시장은 누가 움직이는가'
                : '다음 퀘스트 준비 중...'}
            </p>
            <p className="text-xs text-gray-400 mt-1">하나 더 할 수 있어요! →</p>
          </div>
        )}
      </div>

      <div className="space-y-3 mt-4">
        {isAutoQuest ? (
          <Button fullWidth size="lg" onClick={() => navigate('/explore')}>
            탐색 탭으로 →
          </Button>
        ) : (
          <Button
            fullWidth
            size="lg"
            onClick={() => navigate(fixedLimitReached ? '/paywall' : '/home')}
          >
            {fixedLimitReached ? '오늘 결과 보기 →' : '홈으로 돌아가기'}
          </Button>
        )}
        {!isAutoQuest && !fixedLimitReached && (
          <button
            onClick={() => alert('곧 출시 예정이에요!')}
            className="w-full text-center text-sm text-gray-400 py-2"
          >
            더 많은 퀘스트 보기 →
          </button>
        )}
      </div>

      {/* 알림 권한 요청 배너 */}
      {showPushBanner && !showPersonalityPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-0.5">매일 시장 소식을 받아보세요 📬</p>
            <p className="text-xs text-gray-400 mb-3">오전에 오늘의 뉴스, 저녁에 학습 리마인더를 보내드려요.</p>
            <div className="flex gap-2">
              <button
                onClick={handlePushAllow}
                className="flex-1 bg-primary text-white text-sm font-medium py-2 rounded-xl"
              >
                알림 받기
              </button>
              <button
                onClick={handlePushDismiss}
                className="flex-1 bg-gray-100 text-gray-500 text-sm font-medium py-2 rounded-xl"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 성향 진단 유도 팝업 (바텀시트) */}
      {showPersonalityPrompt && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={handlePersonalityDismiss} />
          <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl px-6 pt-5 pb-10 animate-slide-up">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              학습을 더 맞춤화할 수 있어요
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              5개 질문에 답하면 나에게 맞는 학습 순서로 바꿔드려요. 약 1분이면 끝나요.
            </p>
            <Button fullWidth size="lg" onClick={() => navigate('/personality')}>
              진행하기
            </Button>
            <button
              onClick={handlePersonalityDismiss}
              className="w-full text-center text-sm text-gray-400 py-3 mt-1"
            >
              나중에
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
