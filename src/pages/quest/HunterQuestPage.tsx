import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { HunterQuestRenderer } from '../../components/quest/HunterQuestRenderer'
import { HUNTER_QUEST_MAP } from '../../data/hunter-quest-map'
import { HUNTER_CURRICULUM } from '../../data/hunter-curriculum'
import { useAppStore } from '../../store/useAppStore'
import { useLectureProgress } from '../../hooks/useLectureProgress'
import { useCurriculumStage } from '../../hooks/useCurriculumStage'
import { supabase } from '../../lib/supabase'

export function HunterQuestPage() {
  const { lectureId } = useParams<{ lectureId: string }>()
  const navigate = useNavigate()
  const { hunterProfile } = useAppStore()
  const profileId = hunterProfile?.id ?? null
  const { startAttempt, recordAnswer, completeAttempt } = useLectureProgress(profileId)
  const { stage, loading: stageLoading } = useCurriculumStage()

  const screens = (lectureId && HUNTER_QUEST_MAP[lectureId]) || []
  const lecture = HUNTER_CURRICULUM.find((l) => l.id === lectureId)
  const isLocked = !stageLoading && !!lecture && lecture.stage > stage

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const attemptIdRef = useRef<string | null>(null)
  const attemptStartedRef = useRef<string | null>(null)

  const total = screens.length
  const screen = screens[currentIndex]
  const progress = total > 0 ? (currentIndex + 1) / total : 0

  useEffect(() => {
    if (!lectureId || attemptStartedRef.current === lectureId) return
    if (stageLoading || isLocked) return
    attemptStartedRef.current = lectureId
    startAttempt(lectureId).then((id) => {
      attemptIdRef.current = id
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId, stageLoading, isLocked])

  useEffect(() => {
    setSelectedIds([])
    setRevealed(false)
  }, [currentIndex])

  async function finish() {
    if (attemptIdRef.current) {
      await completeAttempt(attemptIdRef.current)
    }

    if (!profileId) {
      navigate('/home')
      return
    }

    const { data } = await supabase
      .from('quest_attempts')
      .select('lecture_id')
      .eq('profile_id', profileId)
      .eq('is_completed', true)
    const completedSet = new Set((data ?? []).map((row) => row.lecture_id as string))
    const allDone = HUNTER_CURRICULUM.every((l) => completedSet.has(l.id))

    if (allDone) {
      const { data: existing } = await supabase
        .from('hunter_completions')
        .select('id')
        .eq('profile_id', profileId)
        .limit(1)
      if (!existing || existing.length === 0) {
        await supabase.from('hunter_completions').insert({ profile_id: profileId })
      }
      navigate('/curriculum-complete')
    } else {
      navigate('/home')
    }
  }

  function goNext() {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      finish()
    }
  }

  function goBack() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }

  function handleSingleSelect(id: string) {
    if (revealed || !screen) return
    const isNoReveal =
      screen.noReveal ||
      (screen.explanation === '' && screen.correctAnswers?.length === (screen.choices?.length ?? 0))
    const isCorrect = screen.correctAnswers?.includes(id) ?? false
    if (attemptIdRef.current) {
      recordAnswer(attemptIdRef.current, screen.id, [id], isCorrect)
    }
    if (isNoReveal) {
      goNext()
      return
    }
    setSelectedIds([id])
    setRevealed(true)
  }

  function handleMultiToggle(id: string) {
    if (revealed) return
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleMultiConfirm() {
    if (selectedIds.length === 0 || !screen) return
    const correct = new Set(screen.correctAnswers ?? [])
    const isAllCorrect =
      [...correct].every((id) => selectedIds.includes(id)) &&
      selectedIds.every((id) => correct.has(id))
    if (attemptIdRef.current) {
      recordAnswer(attemptIdRef.current, screen.id, selectedIds, isAllCorrect)
    }
    setRevealed(true)
  }

  if (stageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">불러오는 중...</div>
      </div>
    )
  }

  if (isLocked) {
    return <Navigate to="/home" replace />
  }

  if (!screen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">퀘스트를 찾을 수 없습니다</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
        <div className="px-4 pt-4 pb-3 sticky top-0 bg-gray-50 z-10">
          <div className="flex items-center gap-3">
            {currentIndex > 0 ? (
              <button
                onClick={goBack}
                className="text-gray-400 hover:text-gray-600 shrink-0 text-lg leading-none"
              >
                ←
              </button>
            ) : (
              <button
                onClick={() => navigate('/home')}
                className="text-gray-400 hover:text-gray-600 shrink-0 text-lg leading-none"
              >
                ←
              </button>
            )}
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0 tabular-nums">
              {currentIndex + 1}/{total}
            </span>
          </div>
          {lecture && (
            <p className="text-xs text-gray-400 mt-2 pl-8">{lecture.title}</p>
          )}
        </div>

        <div className="flex-1 px-4 pb-10">
          <HunterQuestRenderer
            key={screen.id}
            screen={screen}
            selectedIds={selectedIds}
            revealed={revealed}
            onSingleSelect={handleSingleSelect}
            onMultiToggle={handleMultiToggle}
            onMultiConfirm={handleMultiConfirm}
            onNext={goNext}
          />
        </div>
      </div>
    </div>
  )
}
