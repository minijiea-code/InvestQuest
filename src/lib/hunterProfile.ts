import { supabase } from './supabase'

const STORAGE_KEY = 'hunter_profile'

export interface HunterProfile {
  id: string
  cohort: string
  name: string
  gender: 'male' | 'female' | 'unspecified'
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

export async function signUpHunterProfile(input: {
  cohort: string
  name: string
  gender: HunterProfile['gender']
}): Promise<HunterProfile> {
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  const userId = data.session?.user.id
  if (!userId) throw new Error('세션 생성에 실패했습니다')

  const profile: HunterProfile = { id: userId, ...input }

  const { error: upsertError } = await supabase
    .from('hunter_profiles')
    .upsert({ id: profile.id, cohort: profile.cohort, name: profile.name, gender: profile.gender })
  if (upsertError) throw upsertError

  cacheHunterProfile(profile)
  return profile
}

// 앱 시작 시 기존 익명 세션이 남아있으면 hunter_profiles에서 프로필을 다시 불러온다.
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
  }
  cacheHunterProfile(profile)
  return profile
}
