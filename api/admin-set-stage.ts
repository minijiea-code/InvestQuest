/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'

// 회장 전용 커리큘럼 잠금해제 관리자 API.
// PIN은 서버 환경변수(ADMIN_PIN)로만 검증하고, 실제 DB 갱신은
// service role key로 처리해 RLS(authenticated는 SELECT만 허용)를 우회한다.
// 이 키는 절대 클라이언트 번들에 포함되면 안 되므로 반드시 이 서버리스 함수 안에서만 사용한다.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { pin, stage } = req.body ?? {}
  const adminPin = process.env.ADMIN_PIN

  if (!adminPin) {
    return res.status(500).json({ error: 'ADMIN_PIN이 설정되지 않았습니다' })
  }
  if (typeof pin !== 'string' || pin !== adminPin) {
    return res.status(401).json({ error: 'PIN이 올바르지 않습니다' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase 서버 인증 정보가 설정되지 않았습니다' })
  }
  const admin = createClient(supabaseUrl, serviceKey)

  // stage가 없으면 조회만 수행 (PIN 확인 + 현재 단계 반환)
  if (stage === undefined) {
    const { data, error } = await admin
      .from('curriculum_settings')
      .select('current_stage')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ current_stage: data.current_stage })
  }

  const stageNum = Number(stage)
  if (!Number.isInteger(stageNum) || stageNum < 1 || stageNum > 5) {
    return res.status(400).json({ error: '올바르지 않은 단계 값입니다' })
  }

  const { data, error } = await admin
    .from('curriculum_settings')
    .update({ current_stage: stageNum, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select('current_stage')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ current_stage: data.current_stage })
}
