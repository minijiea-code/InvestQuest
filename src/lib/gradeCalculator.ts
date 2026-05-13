import type { Grade, OnboardingState } from '../types'

export function calculateGrade(onboarding: OnboardingState): Grade {
  let points = 0

  if (onboarding.hasInvestmentExp) {
    points += 1
    if (onboarding.expYears === '1~3년') points += 1
    else if (onboarding.expYears === '3년 이상') points += 2
  }

  // Q2: 재무제표 경험 (index 1)
  const financialQ = onboarding.quizAnswers[1]
  if (financialQ === 2) points += 1
  else if (financialQ === 3) points += 2

  // Q3: 뉴스 습관 (index 2)
  const newsQ = onboarding.quizAnswers[2]
  if (newsQ === 2) points += 1
  else if (newsQ === 3) points += 2

  if (points <= 1) return 'beginner'
  if (points <= 3) return 'intermediate'
  return 'advanced'
}
