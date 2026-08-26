import { createContext, useContext, useState, useEffect } from 'react'
import type { UserProfile, OnboardingState, QuestProgress } from '../types'
import { supabase } from '../lib/supabase'
import { FEATURES } from '../config/features'
import { loadCachedHunterProfile, loadHunterProfileFromSession, type HunterProfile } from '../lib/hunterProfile'

interface AppState {
  user: UserProfile | null
  hunterProfile: HunterProfile | null
  sessionId: string | null
  authLoading: boolean
  onboarding: OnboardingState
  questProgress: QuestProgress | null
  setUser: (user: UserProfile | null) => void
  setHunterProfile: (profile: HunterProfile | null) => void
  setOnboarding: (data: Partial<OnboardingState>) => void
  setQuestProgress: (progress: QuestProgress | null) => void
}

const defaultOnboarding: OnboardingState = {
  hasInvestmentExp: null,
  expYears: null,
  hasAccount: null,
  quizAnswers: [null, null, null],
  interests: [],
}

export { defaultOnboarding }
export type { AppState }

export const AppContext = createContext<AppState | null>(null)

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppProvider')
  return ctx
}

export function useAppState() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [hunterProfile, setHunterProfile] = useState<HunterProfile | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [onboarding, setOnboardingState] = useState<OnboardingState>(defaultOnboarding)
  const [questProgress, setQuestProgress] = useState<QuestProgress | null>(null)

  useEffect(() => {
    if (FEATURES.minimalSignup) {
      // 러너 모드: 익명 세션 기반 hunter_profiles 조회 (localStorage 캐시 우선 사용)
      const cached = loadCachedHunterProfile()
      if (cached) setHunterProfile(cached)
      loadHunterProfileFromSession().then((profile) => {
        // profile이 null이면(세션 만료·삭제된 프로필 등) 캐시가 있었더라도 명시적으로 로그아웃 처리한다.
        setHunterProfile(profile)
        setAuthLoading(false)
      })
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSessionId(session.user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile) setUser(profile as UserProfile)
      }
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setSessionId(null)
        setUser(null)
      } else {
        setSessionId(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const setOnboarding = (data: Partial<OnboardingState>) =>
    setOnboardingState(prev => ({ ...prev, ...data }))

  return {
    user,
    hunterProfile,
    sessionId,
    authLoading,
    onboarding,
    questProgress,
    setUser,
    setHunterProfile,
    setOnboarding,
    setQuestProgress,
  }
}
