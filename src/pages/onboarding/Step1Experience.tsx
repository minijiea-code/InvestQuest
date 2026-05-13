import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAppStore } from '../../store/useAppStore'
import type { OnboardingState } from '../../types'

type ExpYears = OnboardingState['expYears']

export function Step1Experience() {
  const navigate = useNavigate()
  const { setOnboarding } = useAppStore()
  const [hasExp, setHasExp] = useState<boolean | null>(null)
  const [expYears, setExpYears] = useState<ExpYears>(null)
  const [hasAccount, setHasAccount] = useState<boolean | null>(null)

  function handleNext() {
    setOnboarding({ hasInvestmentExp: hasExp, expYears, hasAccount })
    navigate('/onboarding/step2')
  }

  const canProceed =
    hasExp === false
      ? hasAccount !== null
      : hasExp === true
        ? expYears !== null
        : false

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6 pt-12">
      <div className="mb-2 flex gap-1">
        {[1, 2, 3].map(i => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i === 1 ? 'bg-primary' : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2 mb-8">1 / 3단계</p>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">투자해본 적 있나요?</h2>
      <p className="text-gray-500 mb-8">솔직하게 알려주세요. 수준에 맞게 시작할 수 있어요.</p>

      <div className="space-y-3 mb-6">
        {[
          { value: true, label: '네, 해봤어요' },
          { value: false, label: '아직 없어요' },
        ].map(({ value, label }) => (
          <button
            key={String(value)}
            onClick={() => { setHasExp(value); setExpYears(null); setHasAccount(null) }}
            className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium transition-all ${
              hasExp === value
                ? 'border-primary bg-primary-50 text-primary'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {hasExp === true && (
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-gray-600 mb-2">얼마나 하셨나요?</p>
          {(['1년 미만', '1~3년', '3년 이상'] as const).map(year => (
            <button
              key={year}
              onClick={() => setExpYears(year)}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium transition-all ${
                expYears === year
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {hasExp === false && (
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-gray-600 mb-2">증권 계좌는 있나요?</p>
          {[
            { value: true, label: '있어요' },
            { value: false, label: '없어요' },
          ].map(({ value, label }) => (
            <button
              key={String(value)}
              onClick={() => setHasAccount(value)}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium transition-all ${
                hasAccount === value
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
          {hasAccount === false && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
              💡 계좌 개설 후 실전 연습을 할 수 있어요. 일단 학습부터 시작해도 좋아요!
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pb-8">
        <Button fullWidth size="lg" disabled={!canProceed} onClick={handleNext}>
          다음
        </Button>
      </div>
    </div>
  )
}
