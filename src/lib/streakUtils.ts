function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function calcNewStreak(currentStreak: number, lastQuestDate: string | null): number {
  const today = todayStr()
  if (lastQuestDate === today) return currentStreak

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (lastQuestDate === yesterday.toISOString().split('T')[0]) return currentStreak + 1

  return 1
}

export function isCompletedToday(lastQuestDate: string | null): boolean {
  return lastQuestDate === todayStr()
}

export function getDailyQuestCount(lastQuestDate: string | null, dailyQuestCount: number | undefined): number {
  if (lastQuestDate !== todayStr()) return 0
  return dailyQuestCount ?? 0
}
