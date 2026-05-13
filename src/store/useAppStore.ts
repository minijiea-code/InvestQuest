import { createContext, useContext, useState, useEffect } from 'react'
import type { UserProfile, OnboardingState, QuestProgress } from '../types'
import { supabase } from '../lib/supabase'

interface AppState {
  user: UserProfile | null
  sessionId: string | null
  authLoading: boolean
  onboarding: OnboardingState
  questProgress: QuestProgress | null
  setUser: (user: UserProfile | null) => void
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
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [onboarding, setOnboardingState] = useState<OnboardingState>(defaultOnboarding)
  const [questProgress, setQuestProgress] = useState<QuestProgress | null>(null)

  useEffect(() => {
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

  return { user, sessionId, authLoading, onboarding, questProgress, setUser, setOnboarding, setQuestProgress }
}
