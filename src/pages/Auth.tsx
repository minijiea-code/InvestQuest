import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'

export function Auth() {
  const [params] = useSearchParams()
  const isLogin = params.get('mode') !== 'signup'
  const navigate = useNavigate()
  const { setUser } = useAppStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (profile) setUser(profile)
          navigate(profile?.onboarding_done ? '/home' : '/onboarding/step1')
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        navigate('/onboarding/step1')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-lg mx-auto w-full">
        <button
          onClick={() => navigate('/')}
          className="self-start mb-8 p-2 -ml-2 text-gray-400 hover:text-gray-600"
        >
          ← 뒤로
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isLogin ? '다시 만나서 반가워요!' : '투자 공부를 시작해볼까요?'}
        </h2>
        <p className="text-gray-500 mb-8">
          {isLogin ? '이메일로 로그인하세요' : '이메일로 가입하세요'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6자 이상"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          {' '}
          <button
            onClick={() => navigate(`/auth?mode=${isLogin ? 'signup' : 'login'}`)}
            className="text-primary font-semibold"
          >
            {isLogin ? '가입하기' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  )
}
