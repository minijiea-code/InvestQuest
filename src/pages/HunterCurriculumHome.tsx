import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { Card } from '../components/ui/Card'
import { CurriculumTree, type LectureStatus } from '../components/CurriculumTree'
import { HUNTER_CURRICULUM, type CurriculumLecture } from '../data/hunter-curriculum'
import { useAppStore } from '../store/useAppStore'
import { useCurriculumStage } from '../hooks/useCurriculumStage'
import { useLectureProgress } from '../hooks/useLectureProgress'
import { useMarketIndices } from '../hooks/useMarketIndices'
import { logoutHunterProfile } from '../lib/hunterProfile'

// 오늘의 시장 — 실시간 조회 실패 시 폴백으로 쓰는 더미 값
const FALLBACK_MARKET_ITEMS = [
  { label: '다우', value: '43,120', change: '+0.4%', up: true },
  { label: '나스닥', value: '18,650', change: '+0.9%', up: true },
  { label: 'S&P 500', value: '5,890', change: '+0.6%', up: true },
  { label: '유가 (WTI)', value: '$78.20', change: '-1.1%', up: false },
  { label: '코스피', value: '2,845', change: '+0.8%', up: true },
  { label: '코스닥', value: '842', change: '+1.2%', up: true },
  { label: '원/달러', value: '1,380원', change: '-0.3%', up: false },
]

export function HunterCurriculumHome() {
  const navigate = useNavigate()
  const { hunterProfile, setHunterProfile } = useAppStore()
  const { stage } = useCurriculumStage()
  const { completedLectureIds, loading } = useLectureProgress(hunterProfile?.id ?? null)
  const { items: marketItems, loading: marketLoading } = useMarketIndices()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const completedCount = HUNTER_CURRICULUM.filter((l) => completedLectureIds.includes(l.id)).length
  const allCompleted = completedCount === HUNTER_CURRICULUM.length

  let currentAssigned = false
  const nodes = HUNTER_CURRICULUM.map((lecture) => {
    const isCompleted = completedLectureIds.includes(lecture.id)
    const unlocked = lecture.stage <= stage
    let status: LectureStatus
    if (isCompleted) {
      status = 'completed'
    } else if (unlocked && !currentAssigned) {
      status = 'current'
      currentAssigned = true
    } else if (unlocked) {
      status = 'current'
    } else {
      status = 'locked'
    }
    return { lecture, status }
  })

  function handleSelect(lecture: CurriculumLecture, status: LectureStatus) {
    if (status === 'locked') {
      setToast('회장님 강의 후 열려요')
      return
    }
    navigate(`/quest/lecture/${lecture.id}`)
  }

  async function handleLogout() {
    await logoutHunterProfile()
    setHunterProfile(null)
    navigate('/')
  }

  return (
    <PageLayout showNav={false}>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">더헌터스 신입 부원 커리큘럼</h1>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">
            {hunterProfile?.name ? `${hunterProfile.name}님 · ` : ''}로그아웃
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / HUNTER_CURRICULUM.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 font-medium shrink-0">
            {completedCount}/{HUNTER_CURRICULUM.length} 완료
          </span>
        </div>
      </div>

      {!loading && (
        <CurriculumTree
          lectures={nodes}
          allCompleted={allCompleted}
          onSelect={handleSelect}
          onTrophy={() => navigate('/curriculum-complete')}
        />
      )}

      <div className="px-4 pb-10 space-y-4">
        {/* 오늘의 시장 */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">오늘의 시장</h3>
            <span className="text-xs text-gray-400">
              {marketLoading ? '불러오는 중...' : marketItems ? 'Yahoo Finance' : '더미 데이터'}
            </span>
          </div>
          <div className="space-y-2">
            {(marketItems ?? FALLBACK_MARKET_ITEMS).map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  <span className={`text-xs font-semibold ${item.up ? 'text-red-500' : 'text-blue-500'}`}>
                    {item.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {!marketItems && !marketLoading && (
            <p className="text-xs text-gray-400 mt-3">실시간 조회 실패 — 임시 값을 표시하고 있어요</p>
          )}
        </Card>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </PageLayout>
  )
}
