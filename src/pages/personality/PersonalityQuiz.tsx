import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { supabase } from '../../lib/supabase'
import { getQuest, QUEST_SEQUENCE } from '../../data/quests'
import { getDailyQuestCount } from '../../lib/streakUtils'

type Answers = {
  investment_purpose: string
  investment_style_type: string
  fund_type: string
  study_time: string
  interest_style: string
}

const QUESTIONS: Array<{
  key: keyof Answers
  text: string
  options: Array<{ value: string; sub: string }>
}> = [
  {
    key: 'investment_purpose',
    text: '투자하는 가장 큰 이유는 무엇인가요?',
    options: [
      { value: '노후 대비 · 장기 자산 형성', sub: '10년 이상, 꾸준히 불리고 싶어요' },
      { value: '월급 외 추가 수입', sub: '월급만으로는 부족해서 투자로 보충하고 싶어요' },
      { value: '결혼 · 전세 등 목표 자금 마련', sub: '2~5년 안에 목돈이 필요해요' },
      { value: '단기 수익 추구', sub: '빠른 수익을 원해요' },
    ],
  },
  {
    key: 'investment_style_type',
    text: '나에게 더 가까운 쪽은?',
    options: [
      { value: '안정형', sub: '원금 손실에 민감해요. 큰 수익보다 큰 손실을 피하는 게 더 중요해요.' },
      { value: '중립형', sub: '적당한 손실은 감수할 수 있어요. 안정과 수익의 균형을 원해요.' },
      { value: '공격형', sub: '단기 변동성을 견딜 수 있어요. 높은 수익을 추구해요.' },
    ],
  },
  {
    key: 'fund_type',
    text: '투자에 쓰는 돈은 어떤 성격인가요?',
    options: [
      { value: '생활비 일부', sub: '' },
      { value: '비상금', sub: '' },
      { value: '당분간 쓸 일 없는 여유 자금', sub: '' },
      { value: '매달 적립하는 돈', sub: '' },
    ],
  },
  {
    key: 'study_time',
    text: '투자 공부에 하루 얼마나 쓸 수 있나요?',
    options: [
      { value: '하루 5분 정도, 가볍게', sub: '' },
      { value: '하루 10~15분, 꾸준히', sub: '' },
      { value: '하루 30분 이상, 진지하게', sub: '' },
    ],
  },
  {
    key: 'interest_style',
    text: '어떤 투자 스타일에 끌리나요?',
    options: [
      { value: '안정적인 배당주 · ETF 중심', sub: '' },
      { value: '성장 가능성 높은 기업 찾기', sub: '' },
      { value: '차트 · 단기 트레이딩', sub: '' },
      { value: '아직 잘 모르겠어요', sub: '' },
    ],
  },
]

function SlideIn({
  direction,
  children,
}: {
  direction: 'forward' | 'backward'
  children: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const from = direction === 'forward' ? 'translate-x-8' : '-translate-x-8'

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-x-0' : `opacity-0 ${from}`
      }`}
    >
      {children}
    </div>
  )
}

export function PersonalityQuiz() {
  const navigate = useNavigate()
  const { user, setUser } = useAppStore()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [answers, setAnswers] = useState<Partial<Answers>>({})
  const savedRef = useRef(false)

  const dailyCount = getDailyQuestCount(user?.last_quest_date ?? null, user?.daily_quest_count)
  const nextQuestId = QUEST_SEQUENCE[Math.min(dailyCount, QUEST_SEQUENCE.length - 1)]
  const nextQuest = getQuest(nextQuestId)
  const hasNextQuest = dailyCount < 2

  async function handleSelect(key: keyof Answers, value: string) {
    const newAnswers = { ...answers, [key]: value }
    setAnswers(newAnswers)

    if (step < QUESTIONS.length - 1) {
      setDirection('forward')
      setStep(prev => prev + 1)
    } else {
      await saveAndComplete(newAnswers as Answers)
    }
  }

  async function saveAndComplete(finalAnswers: Answers) {
    if (!user || savedRef.current) return
    savedRef.current = true

    const now = new Date().toISOString()
    const updateData = {
      ...finalAnswers,
      personality_diagnosis_completed: true,
      personality_diagnosis_date: now,
    }

    await supabase.from('profiles').update(updateData).eq('id', user.id)
    setUser({ ...user, ...updateData, personality_diagnosis_completed: true })
    setDirection('forward')
    setStep(5)
  }

  function handleBack() {
    if (step > 0) {
      setDirection('backward')
      setStep(prev => prev - 1)
    } else {
      navigate('/home')
    }
  }

  // 완료 화면
  if (step === 5) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col px-6 pb-12 max-w-lg mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mb-5">
            <span className="text-4xl">🎯</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">당신에게 맞는 순서로 바꿨어요</h1>
          <p className="text-sm text-gray-500 mb-8">학습 경험이 더 맞춤화됩니다</p>

          <div className="w-full bg-white rounded-2xl border border-gray-100 p-5 text-left mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">진단 결과</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5 shrink-0">목적</span>
                <span className="text-sm text-gray-700">{answers.investment_purpose}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5 shrink-0">성향</span>
                <span className="text-sm text-gray-700">{answers.investment_style_type}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5 shrink-0">스타일</span>
                <span className="text-sm text-gray-700">{answers.interest_style}</span>
              </div>
            </div>
          </div>

          {hasNextQuest && nextQuest ? (
            <div className="w-full bg-primary-50 rounded-2xl p-4 border border-primary-100 text-left">
              <p className="text-xs font-semibold text-primary mb-1">추천 다음 퀘스트</p>
              <p className="text-sm text-gray-700 font-medium">{nextQuest.title}</p>
              <p className="text-xs text-gray-400 mt-1">⏱ {nextQuest.estimatedMinutes}분</p>
            </div>
          ) : (
            <div className="w-full bg-primary-50 rounded-2xl p-4 border border-primary-100 text-left">
              <p className="text-xs font-semibold text-primary mb-1">다음 퀘스트</p>
              <p className="text-sm text-gray-700 font-medium">내일 새로운 퀘스트가 기다려요!</p>
              <p className="text-xs text-gray-400 mt-1">매일 꾸준히 학습해보세요</p>
            </div>
          )}
        </div>

        <Button fullWidth size="lg" onClick={() => navigate('/home')}>
          홈으로
        </Button>
      </div>
    )
  }

  const question = QUESTIONS[step]

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">
      {/* 헤더 */}
      <div className="px-4 pt-12 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex flex-1 gap-1.5">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${
                  i <= step ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 font-medium">{step + 1}/5</span>
        </div>
      </div>

      {/* 질문 + 선택지 */}
      <SlideIn key={step} direction={direction}>
        <div className="px-6 pt-2 pb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 leading-snug">{question.text}</h2>
          <div className="space-y-3">
            {question.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSelect(question.key, opt.value)}
                className="w-full text-left border-2 border-gray-200 rounded-2xl p-4 hover:border-primary hover:bg-primary-50 active:scale-[0.98] transition-all"
              >
                <p className="font-semibold text-gray-900 text-sm leading-snug">{opt.value}</p>
                {opt.sub && (
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{opt.sub}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </SlideIn>
    </div>
  )
}
