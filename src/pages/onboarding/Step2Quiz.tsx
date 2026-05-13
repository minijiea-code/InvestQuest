import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAppStore } from '../../store/useAppStore'

const QUESTIONS = [
  {
    q: '급등주를 발견하면 어떤 마음이 드나요?',
    options: [
      '바로 사고 싶다',
      '왜 올랐는지 먼저 확인한다',
      '이미 늦었다고 생각한다',
      '관심 없다',
    ],
  },
  {
    q: '재무제표를 열어본 적 있나요?',
    options: [
      '없다',
      '들어봤지만 안 열어봤다',
      '열어봤지만 잘 모르겠다',
      '자주 본다',
    ],
  },
  {
    q: '일주일에 투자 관련 뉴스를 얼마나 보나요?',
    options: [
      '거의 안 본다',
      '가끔 본다',
      '매일 본다',
      '여러 매체를 비교한다',
    ],
  },
]

export function Step2Quiz() {
  const navigate = useNavigate()
  const { setOnboarding } = useAppStore()
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null])
  const [currentQ, setCurrentQ] = useState(0)

  function selectAnswer(optionIdx: number) {
    const next = [...answers]
    next[currentQ] = optionIdx
    setAnswers(next)

    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ(q => q + 1)
      }
    }, 300)
  }

  function handleNext() {
    setOnboarding({ quizAnswers: answers })
    navigate('/onboarding/step3')
  }

  const allAnswered = answers.every(a => a !== null)
  const question = QUESTIONS[currentQ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6 pt-12">
      <div className="mb-2 flex gap-1">
        {[1, 2, 3].map(i => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2 mb-8">2 / 3단계</p>

      <div className="flex gap-2 mb-6">
        {QUESTIONS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              i === currentQ ? 'bg-primary' : answers[i] !== null ? 'bg-primary/40' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-primary font-semibold mb-2">Q{currentQ + 1} / {QUESTIONS.length}</p>
      <h2 className="text-xl font-bold text-gray-900 mb-8">{question.q}</h2>

      <div className="space-y-3">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => selectAnswer(i)}
            className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium transition-all ${
              answers[currentQ] === i
                ? 'border-primary bg-primary-50 text-primary'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="mt-auto pb-8 pt-6">
        <Button
          fullWidth
          size="lg"
          disabled={!allAnswered}
          onClick={handleNext}
        >
          다음
        </Button>
        {!allAnswered && (
          <p className="text-center text-xs text-gray-400 mt-2">모든 질문에 답해주세요</p>
        )}
      </div>
    </div>
  )
}
