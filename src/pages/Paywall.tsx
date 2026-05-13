import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'

export function Paywall() {
  const navigate = useNavigate()
  const { user } = useAppStore()

  function handleClose() {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('paywall_dismissed_date', today)
    navigate('/home')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6 pb-12 max-w-lg mx-auto">
      <div className="flex-1 flex flex-col items-center justify-center text-center pt-6">
        <div className="w-24 h-24 bg-primary-50 rounded-3xl flex items-center justify-center mb-5 border-2 border-primary-100">
          <span className="text-5xl">🏆</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">오늘 퀘스트 완료!</h1>
        <p className="text-gray-500 mb-1">오늘의 퀘스트 2개를 모두 마쳤어요.</p>
        <p className="text-gray-500 mb-6">내일 새로운 퀘스트가 기다리고 있어요 🔒</p>

        {(user?.streak ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 text-sm bg-amber-50 px-4 py-2 rounded-full mb-6 border border-amber-100">
            <span>🔥</span>
            <span className="font-semibold text-amber-700">{user!.streak}일 연속 학습 중!</span>
          </div>
        )}

        <div className="w-full bg-white rounded-2xl border border-gray-100 p-5 mb-2 text-left">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
            프리미엄으로 더 배우기
          </p>
          <ul className="space-y-2.5">
            {[
              '하루 퀘스트 무제한',
              '뉴스 퀘스트 매일 업데이트',
              '포트폴리오 심화 분석',
            ].map(item => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-white text-xs">✓</span>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <Button fullWidth size="lg" onClick={() => alert('곧 출시 예정이에요! 🚀')}>
          프리미엄 시작하기
        </Button>
        <button
          onClick={handleClose}
          className="w-full text-center text-sm text-gray-400 py-2"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
