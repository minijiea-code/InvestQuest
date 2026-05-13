import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import type { Interest, UserProfile } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { supabase } from '../../lib/supabase'
import { calculateGrade } from '../../lib/gradeCalculator'

const INTERESTS: { id: Interest; label: string; emoji: string }[] = [
  { id: 'us_large_cap', label: '미국 대형주', emoji: '🇺🇸' },
  { id: 'kr_blue_chip', label: '한국 우량주', emoji: '🇰🇷' },
  { id: 'etf', label: 'ETF', emoji: '📦' },
  { id: 'dividend', label: '배당주', emoji: '💰' },
  { id: 'sector', label: '섹터주', emoji: '🏭' },
  { id: 'short_term', label: '단기 트레이딩', emoji: '⚡' },
]

export function Step3Interests() {
  const navigate = useNavigate()
  const { onboarding, setOnboarding, setUser } = useAppStore()
  const [selected, setSelected] = useState<Interest[]>([])
  const [loading, setLoading] = useState(false)

  function toggle(id: Interest) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  async function handleComplete(interests: Interest[]) {
    setLoading(true)
    const finalOnboarding = { ...onboarding, interests }
    setOnboarding({ interests })

    const grade = calculateGrade(finalOnboarding)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/auth')
      return
    }

    const profile: UserProfile = {
      id: session.user.id,
      email: session.user.email ?? '',
      grade,
      interests,
      streak: 0,
      last_quest_date: null,
      onboarding_done: true,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').upsert(profile)
    if (error) {
      console.error('profiles upsert 실패:', error.message, error.details)
      setLoading(false)
      return
    }
    setUser(profile)
    navigate('/onboarding/result')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6 pt-12">
      <div className="mb-2 flex gap-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-1.5 rounded-full bg-primary" />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2 mb-8">3 / 3단계</p>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">관심 분야를 선택해주세요</h2>
      <p className="text-gray-500 mb-8">맞춤 퀘스트를 추천해드려요. 건너뛰어도 괜찮아요.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {INTERESTS.map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => toggle(id)}
            className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-2 font-medium transition-all ${
              selected.includes(id)
                ? 'border-primary bg-primary-50 text-primary'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="text-3xl">{emoji}</span>
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto pb-8 space-y-3">
        <Button fullWidth size="lg" disabled={loading} onClick={() => handleComplete(selected)}>
          {loading ? '저장 중...' : selected.length > 0 ? `${selected.length}개 선택 완료` : '완료'}
        </Button>
        <button
          onClick={() => handleComplete([])}
          disabled={loading}
          className="w-full text-center text-sm text-gray-400 py-2 disabled:opacity-50"
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}
