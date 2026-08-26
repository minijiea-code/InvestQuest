import { supabase } from './supabase'

const STORAGE_KEY = 'hunter_profile'

export interface HunterProfile {
  id: string
  cohort: string
  name: string
  gender: 'male' | 'female' | 'unspecified'
  email?: string
}

export function loadCachedHunterProfile(): HunterProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HunterProfile) : null
  } catch {
    return null
  }
}

function cacheHunterProfile(profile: HunterProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export async function logoutHunterProfile(): Promise<void> {
  await supabase.auth.signOut()
  localStorage.removeItem(STORAGE_KEY)
}

export async function signUpHunterProfile(input: {
  cohort: string
  name: string
  gender: HunterProfile['gender']
  email: string
  password: string
}): Promise<HunterProfile> {
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password })
  if (error) throw error
  const userId = data.session?.user.id ?? data.user?.id
  if (!userId) throw new Error('세션 생성에 실패했습니다. 이메일 인증이 필요한 상태일 수 있어요.')

  const profile: HunterProfile = {
    id: userId,
    cohort: input.cohort,
    name: input.name,
    gender: input.gender,
    email: input.email,
  }

  const { error: upsertError } = await supabase
    .from('hunter_profiles')
    .upsert({ id: profile.id, cohort: profile.cohort, name: profile.name, gender: profile.gender, email: profile.email })
  if (upsertError) throw upsertError

  cacheHunterProfile(profile)
  return profile
}

export async function loginHunterProfile(input: { email: string; password: string }): Promise<HunterProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password })
  if (error) throw error
  const userId = data.session?.user.id
  if (!userId) throw new Error('로그인에 실패했습니다')

  const { data: row, error: fetchError } = await supabase
    .from('hunter_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (fetchError || !row) throw new Error('프로필을 찾을 수 없어요. 회원가입을 먼저 진행해주세요.')

  const profile: HunterProfile = {
    id: row.id,
    cohort: row.cohort,
    name: row.name,
    gender: row.gender,
    email: row.email ?? input.email,
  }
  cacheHunterProfile(profile)
  return profile
}

// 앱 시작 시 기존 세션이 남아있으면 hunter_profiles에서 프로필을 다시 불러온다.
export async function loadHunterProfileFromSession(): Promise<HunterProfile | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const cached = loadCachedHunterProfile()
  if (cached && cached.id === session.user.id) return cached

  const { data: row } = await supabase
    .from('hunter_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()
  if (!row) return null

  const profile: HunterProfile = {
    id: row.id,
    cohort: row.cohort,
    name: row.name,
    gender: row.gender,
    email: row.email ?? undefined,
  }
  cacheHunterProfile(profile)
  return profile
}
