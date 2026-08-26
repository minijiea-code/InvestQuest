import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useLectureProgress(profileId: string | null) {
  const [completedLectureIds, setCompletedLectureIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!profileId) {
      setCompletedLectureIds([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('quest_attempts')
      .select('lecture_id')
      .eq('profile_id', profileId)
      .eq('is_completed', true)
    setCompletedLectureIds(data ? [...new Set(data.map((row) => row.lecture_id as string))] : [])
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function startAttempt(lectureId: string): Promise<string | null> {
    if (!profileId) return null
    const { data, error } = await supabase
      .from('quest_attempts')
      .insert({ profile_id: profileId, lecture_id: lectureId })
      .select('id')
      .single()
    if (error || !data) return null
    return data.id as string
  }

  async function recordAnswer(
    attemptId: string,
    screenId: number,
    selectedAnswer: string[],
    isCorrect: boolean,
  ) {
    if (!attemptId) return
    await supabase.from('quest_answers').insert({
      attempt_id: attemptId,
      screen_id: screenId,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
    })
  }

  async function completeAttempt(attemptId: string) {
    if (!attemptId) return
    await supabase
      .from('quest_attempts')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', attemptId)
    await refresh()
  }

  return { completedLectureIds, loading, refresh, startAttempt, recordAnswer, completeAttempt }
}
