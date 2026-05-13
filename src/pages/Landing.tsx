import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mb-8 shadow-lg">
          <span className="text-4xl">📈</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          InvestQuest
        </h1>

        <p className="text-lg text-gray-600 mb-2 leading-relaxed">
          매일 5분, 퀘스트를 풀면서
        </p>
        <p className="text-lg font-semibold text-primary mb-12">
          진짜 투자 판단력을 키워요
        </p>

        <div className="space-y-3 w-full max-w-sm">
          <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm text-left">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">퀘스트 기반 학습</p>
              <p className="text-gray-500 text-xs">읽는 것이 아닌, 풀면서 체득</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm text-left">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">매일 스트릭</p>
              <p className="text-gray-500 text-xs">연속 학습으로 투자 습관 형성</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm text-left">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">내 수준 맞춤</p>
              <p className="text-gray-500 text-xs">초급부터 고급까지 단계별 성장</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-12 space-y-3 max-w-lg mx-auto w-full">
        <Button fullWidth size="lg" onClick={() => navigate('/auth?mode=signup')}>
          무료로 시작하기
        </Button>
        <Button fullWidth size="lg" variant="ghost" onClick={() => navigate('/auth?mode=login')}>
          이미 계정이 있어요
        </Button>
      </div>
    </div>
  )
}
