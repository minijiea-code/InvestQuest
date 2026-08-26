import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'

export function CurriculumComplete() {
  const navigate = useNavigate()
  const { hunterProfile } = useAppStore()

  useEffect(() => {
    const duration = 1500
    const end = Date.now() + duration
    ;(function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 } })
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 } })
      if (Date.now() < end) requestAnimationFrame(frame)
    })()
  }, [])

  const dateStr = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replace(/\. /g, '.')
    .replace(/\.$/, '')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl mb-4">🎉</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        {hunterProfile?.name ? `${hunterProfile.name}님, ` : ''}커리큘럼 완주를 축하드립니다!
      </h1>
      <p className="text-gray-600 leading-relaxed mb-1">이제 본격적인 투자자의 여정이 시작됩니다.</p>
      <p className="text-sm text-gray-400 mb-8">더헌터스 신입 부원 · {dateStr} 완주</p>
      <Button size="lg" onClick={() => navigate('/home')}>
        홈으로 돌아가기
      </Button>
    </div>
  )
}
