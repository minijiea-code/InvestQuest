import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useCurriculumStage() {
  const [stage, setStage] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('curriculum_settings')
      .select('current_stage')
      .order('id', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        if (data) setStage(data.current_stage)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { stage, loading }
}
