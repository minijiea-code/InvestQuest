import type { Quest } from '../types'
import quest01 from './quest_01.json'
import quest02 from './quest_02.json'
import quest03 from './quest_03.json'
import { supabase } from '../lib/supabase'

const QUESTS: Record<string, Quest> = {
  quest_01: quest01 as Quest,
  quest_02: quest02 as Quest,
  quest_03: quest03 as Quest,
}

export const QUEST_SEQUENCE = ['quest_01', 'quest_02', 'quest_03']

export function getQuest(id: string): Quest | null {
  return QUESTS[id] ?? null
}

// 세션 내 auto 퀘스트 캐시 (반복 Supabase 호출 방지)
const autoQuestCache: Record<string, Quest | null> = {}

export async function loadAutoQuest(questId: string): Promise<Quest | null> {
  if (questId in autoQuestCache) return autoQuestCache[questId]

  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .single()

  if (error || !data) {
    autoQuestCache[questId] = null
    return null
  }

  const quest: Quest = {
    id: data.id,
    title: data.title,
    description: data.description ?? undefined,
    estimatedMinutes: data.estimated_minutes ?? 5,
    category: data.category ?? '뉴스',
    keySummary: data.key_summary ?? [],
    learningPoints: data.learning_points ?? undefined,
    screens: data.screens ?? [],
    questType: 'auto',
    newsSource: data.news_source ?? undefined,
  }

  autoQuestCache[questId] = quest
  return quest
}
