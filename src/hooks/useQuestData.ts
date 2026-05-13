import { useState, useEffect } from 'react'
import { getQuest, loadAutoQuest } from '../data/quests'
import type { Quest } from '../types'

export function useQuestData(questId: string | undefined) {
  const isAuto = questId?.startsWith('quest_auto_') ?? false
  const staticQuest = !isAuto && questId ? getQuest(questId) : null

  const [quest, setQuest] = useState<Quest | null>(staticQuest)
  const [loading, setLoading] = useState(isAuto)

  useEffect(() => {
    if (!isAuto || !questId) return
    setLoading(true)
    loadAutoQuest(questId).then((q) => {
      setQuest(q)
      setLoading(false)
    })
  }, [questId, isAuto])

  return { quest, loading }
}
