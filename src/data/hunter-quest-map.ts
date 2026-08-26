import type { QuestScreenExt } from '../components/quest/HunterQuestRenderer'
import { QUEST_DATA as CONDITIONAL_PROBABILITY } from './hunter-quest-conditional-probability'
import { QUEST_DATA as BASIC_1 } from './hunter-quest-basic-1'
import { QUEST_DATA as BASIC_2 } from './hunter-quest-basic-2'
import { QUEST_DATA as ADVANCED_1 } from './hunter-quest-advanced-1'
import { QUEST_DATA as ADVANCED_2 } from './hunter-quest-advanced-2'

// HUNTER_CURRICULUM[].id → QuestScreenExt[]
export const HUNTER_QUEST_MAP: Record<string, QuestScreenExt[]> = {
  'conditional-probability': CONDITIONAL_PROBABILITY,
  'basic-1': BASIC_1,
  'basic-2': BASIC_2,
  'advanced-1': ADVANCED_1,
  'advanced-2': ADVANCED_2,
}
