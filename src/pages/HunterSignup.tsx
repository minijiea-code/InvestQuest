import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'
import { signUpHunterProfile, type HunterProfile } from '../lib/hunterProfile'

export function HunterSignup() {
  const navigate = useNavigate()
  const { setHunterProfile } = useAppStore()

  const [cohort, setCohort] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState<HunterProfile['gender']>('unspecified')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const profile = await signUpHunterProfile({ cohort, name, gender })
      setHunterProfile(profile)
      navigate('/home')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-lg mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">더헌터스에 오신 걸 환영해요!</h2>
        <p className="text-gray-500 mb-8">기수, 이름, 성별만 알려주세요</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">기수</label>
            <input
              type="text"
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              placeholder="예: 8기"
              required
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              required
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
            <div className="flex gap-2">
              {(
                [
                  { value: 'male', label: '남' },
                  { value: 'female', label: '여' },
                  { value: 'unspecified', label: '응답 안 함' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className={`flex-1 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                    gender === opt.value
                      ? 'border-primary bg-indigo-50 text-primary'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? '처리 중...' : '시작하기'}
          </Button>
        </form>
      </div>
    </div>
  )
}
