import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface NewsQuestMeta {
  id: string
  title: string
  description: string
  estimatedMinutes: number
  newsSource: {
    title: string
    url: string
    date: string
    summary: string
  } | null
}

export function useNewsQuest() {
  const [newsQuest, setNewsQuest] = useState<NewsQuestMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const questId = `quest_auto_${today}`

    supabase
      .from('quests')
      .select('id, title, description, estimated_minutes, news_source')
      .eq('id', questId)
      .eq('quest_type', 'auto')
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = 데이터 없음 (오늘 퀘스트 미생성) → 에러가 아닌 빈 상태로 처리
          setError(true)
        } else if (data) {
          setNewsQuest({
            id: data.id,
            title: data.title,
            description: data.description ?? '',
            estimatedMinutes: data.estimated_minutes ?? 5,
            newsSource: data.news_source ?? null,
          })
        }
        setLoading(false)
      })
  }, [])

  return { newsQuest, loading, error }
}
