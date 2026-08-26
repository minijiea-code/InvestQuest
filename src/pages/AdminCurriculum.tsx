import { useState } from 'react'
import { HUNTER_CURRICULUM } from '../data/hunter-curriculum'

// 회장 전용 커리큘럼 잠금해제 페이지. 링크는 어디에도 노출하지 않고 URL(/admin)을 아는 사람만 접근.
// 실제 DB 갱신은 api/admin-set-stage.ts가 PIN 검증 후 service role key로 처리한다.
export function AdminCurriculum() {
  const [pin, setPin] = useState('')
  const [verified, setVerified] = useState(false)
  const [currentStage, setCurrentStage] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function callApi(body: { pin: string; stage?: number }) {
    const res = await fetch('/api/admin-set-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? '요청에 실패했습니다')
    return data.current_stage as number
  }

  async function handleVerify() {
    setBusy(true)
    setError(null)
    try {
      const stage = await callApi({ pin })
      setCurrentStage(stage)
      setVerified(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '확인에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  async function handleSetStage(stage: number) {
    setBusy(true)
    setError(null)
    try {
      const newStage = await callApi({ pin, stage })
      setCurrentStage(newStage)
    } catch (e) {
      setError(e instanceof Error ? e.message : '변경에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h1 className="text-lg font-bold text-gray-900">커리큘럼 관리자</h1>
          <p className="text-sm text-gray-500">PIN을 입력하면 강의 잠금 단계를 조정할 수 있어요.</p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !busy && pin && handleVerify()}
            placeholder="PIN 입력"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-primary focus:outline-none"
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleVerify}
            disabled={busy || !pin}
            className="w-full bg-primary text-white font-semibold rounded-xl py-3 disabled:opacity-50"
          >
            {busy ? '확인 중...' : '확인'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-sm mx-auto space-y-4">
        <h1 className="text-lg font-bold text-gray-900">커리큘럼 관리자</h1>
        <p className="text-sm text-gray-500">
          강의를 누르면 해당 강의까지(그 이전 강의 포함) 열려요. 아래 강의보다 나중 강의는 자동으로 잠깁니다.
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="space-y-2">
          {HUNTER_CURRICULUM.map((lecture) => {
            const isActive = currentStage === lecture.stage
            const isUnlocked = currentStage !== null && lecture.stage <= currentStage
            return (
              <button
                key={lecture.id}
                onClick={() => handleSetStage(lecture.stage)}
                disabled={busy}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all disabled:opacity-50 ${
                  isActive
                    ? 'bg-indigo-50 border-primary'
                    : isUnlocked
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {lecture.order}. {lecture.title}
                  </span>
                  {isUnlocked ? (
                    <span className="text-xs text-green-600 font-medium">열림</span>
                  ) : (
                    <span className="text-xs text-gray-400">🔒 잠김</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{lecture.subtitle}</span>
              </button>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 pt-2">
          현재 여기까지 열려있어요: {currentStage !== null ? `${currentStage}단계` : '확인 중...'}
        </p>
      </div>
    </div>
  )
}
