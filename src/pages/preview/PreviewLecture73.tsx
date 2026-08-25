import { useState, useEffect } from 'react'
import { LECTURE_73_QUEST } from '../../data/lecture-73-quest'
import type { QuestScreen, MatchingPair } from '../../data/lecture-73-quest'

const STORAGE_KEY = 'preview-lecture-73-progress'

interface SavedProgress {
  currentScreen: number
  answers: string[]
  startedAt: string
}

function loadProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveProgress(p: SavedProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

function clearProgress() {
  localStorage.removeItem(STORAGE_KEY)
}

export function PreviewLecture73() {
  const saved = loadProgress()
  const [currentIndex, setCurrentIndex] = useState(saved?.currentScreen ?? 0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)

  const total = LECTURE_73_QUEST.length
  const screen = LECTURE_73_QUEST[currentIndex]
  const progress = (currentIndex + 1) / total

  useEffect(() => {
    saveProgress({
      currentScreen: currentIndex,
      answers: selectedIds,
      startedAt: saved?.startedAt ?? new Date().toISOString(),
    })
    setSelectedIds([])
    setRevealed(false)
  }, [currentIndex])

  function goNext() {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1)
    }
  }

  function goBack() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    }
  }

  function handleReset() {
    clearProgress()
    setCurrentIndex(0)
    setSelectedIds([])
    setRevealed(false)
  }

  function handleSingleSelect(id: string) {
    if (revealed) return
    const isNoReveal =
      screen.explanation === '' &&
      screen.correctAnswers?.length === (screen.choices?.length ?? 0)
    if (isNoReveal) {
      goNext()
      return
    }
    setSelectedIds([id])
    setRevealed(true)
  }

  function handleMultiToggle(id: string) {
    if (revealed) return
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function handleMultiConfirm() {
    if (selectedIds.length === 0) return
    setRevealed(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 검수 배너 */}
      <div className="bg-indigo-900 text-indigo-100 text-xs text-center py-2 px-4">
        🔒 회장님 검수용 프리뷰 — 이 페이지의 진행은 통계에 반영되지 않습니다
      </div>

      <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
        {/* 진행 바 + 네비 */}
        <div className="px-4 pt-4 pb-3 sticky top-0 bg-gray-50 z-10">
          <div className="flex items-center gap-3">
            {currentIndex > 0 ? (
              <button
                onClick={goBack}
                className="text-gray-400 hover:text-gray-600 shrink-0 text-lg leading-none"
              >
                ←
              </button>
            ) : (
              <div className="w-5 shrink-0" />
            )}
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0 tabular-nums">
              {currentIndex + 1}/{total}
            </span>
            <button
              onClick={handleReset}
              className="text-[10px] text-gray-400 hover:text-gray-600 shrink-0 underline"
            >
              처음부터
            </button>
          </div>
        </div>

        {/* 화면 콘텐츠 */}
        <div className="flex-1 px-4 pb-10">
          <ScreenRenderer
            key={screen.id}
            screen={screen}
            selectedIds={selectedIds}
            revealed={revealed}
            onSingleSelect={handleSingleSelect}
            onMultiToggle={handleMultiToggle}
            onMultiConfirm={handleMultiConfirm}
            onNext={goNext}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── 화면 분기 ──────────────────────────────────── */
interface RendererProps {
  screen: QuestScreen
  selectedIds: string[]
  revealed: boolean
  onSingleSelect: (id: string) => void
  onMultiToggle: (id: string) => void
  onMultiConfirm: () => void
  onNext: () => void
}

function ScreenRenderer(props: RendererProps) {
  const { screen } = props
  switch (screen.type) {
    case 'explanation':
      return <ExplanationScreen {...props} />
    case 'binary':
    case 'multiple-choice':
    case 'calculation':
      return <ChoiceScreen {...props} />
    case 'multi-select':
      return <MultiSelectScreen {...props} />
    case 'matching':
      return <MatchingScreen {...props} />
    case 'completion':
      return <CompletionScreen screen={screen} />
  }
}

/* ─── 설명 화면 ──────────────────────────────────── */
function ExplanationScreen({ screen, onNext }: RendererProps) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">💡 알고 가기</p>

      {screen.situation && (
        <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 leading-relaxed">
          {screen.situation}
        </div>
      )}

      {screen.title && (
        <h2 className="text-2xl font-bold text-gray-900">{screen.title}</h2>
      )}

      {screen.question && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {screen.question}
          </p>
        </div>
      )}

      {screen.helpText && (
        <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">
          {screen.helpText}
        </p>
      )}

      <div className="mt-4">
        <ActionButton onClick={onNext}>계속하기 →</ActionButton>
      </div>
    </div>
  )
}

/* ─── 선택 화면 (binary / multiple-choice / calculation) ── */
function ChoiceScreen({
  screen,
  selectedIds,
  revealed,
  onSingleSelect,
  onNext,
}: RendererProps) {
  const choices = screen.choices ?? []
  const isNoReveal =
    screen.explanation === '' &&
    screen.correctAnswers?.length === choices.length

  const selectedId = selectedIds[0]
  const isCorrect = screen.correctAnswers?.includes(selectedId) ?? false

  return (
    <div className="flex flex-col gap-3 pt-2">
      {screen.situation && (
        <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {screen.situation}
        </div>
      )}

      {screen.visualBox && <VisualBoxCard box={screen.visualBox} />}

      {screen.question && (
        <h2 className="text-lg font-bold text-gray-900 leading-snug">{screen.question}</h2>
      )}

      {screen.helpText && (
        <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">
          {screen.helpText}
        </p>
      )}

      <div className="space-y-2.5">
        {choices.map((choice) => {
          const isSelected = selectedIds.includes(choice.id)
          const isThisCorrect = screen.correctAnswers?.includes(choice.id) ?? false
          let style = 'border-gray-200 bg-white text-gray-800'

          if (revealed && !isNoReveal) {
            if (isThisCorrect) {
              style = 'border-green-400 bg-green-50 text-green-800'
            } else if (isSelected) {
              style = 'border-red-400 bg-red-50 text-red-800'
            } else {
              style = 'border-gray-100 bg-gray-50 text-gray-400'
            }
          } else if (isSelected) {
            style = 'border-primary bg-indigo-50 text-primary'
          }

          return (
            <button
              key={choice.id}
              onClick={() => onSingleSelect(choice.id)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 font-medium transition-all text-sm ${style} ${
                revealed ? 'cursor-default' : 'hover:border-gray-300 active:scale-[0.99]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {revealed && !isNoReveal && isThisCorrect && (
                  <span className="shrink-0">✅</span>
                )}
                {revealed && !isNoReveal && isSelected && !isThisCorrect && (
                  <span className="shrink-0">❌</span>
                )}
                <span>{choice.text}</span>
              </span>
            </button>
          )
        })}
      </div>

      {revealed && !isNoReveal && screen.explanation && (
        <div className="space-y-3 mt-1">
          <div
            className={`rounded-2xl p-4 ${
              isCorrect
                ? 'bg-green-50 border border-green-200'
                : 'bg-orange-50 border border-orange-200'
            }`}
          >
            <p
              className={`text-sm font-semibold mb-1.5 ${
                isCorrect ? 'text-green-700' : 'text-orange-700'
              }`}
            >
              {isCorrect ? '🎉 정답이에요!' : '😅 아쉬워요, 한 번 봐요!'}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {screen.explanation}
            </p>
          </div>
          <ActionButton onClick={onNext}>다음 →</ActionButton>
        </div>
      )}
    </div>
  )
}

/* ─── 다중 선택 화면 ─────────────────────────────── */
function MultiSelectScreen({
  screen,
  selectedIds,
  revealed,
  onMultiToggle,
  onMultiConfirm,
  onNext,
}: RendererProps) {
  const choices = screen.choices ?? []
  const correct = new Set(screen.correctAnswers ?? [])

  const isAllCorrect =
    [...correct].every((id) => selectedIds.includes(id)) &&
    selectedIds.every((id) => correct.has(id))

  return (
    <div className="flex flex-col gap-3 pt-2">
      {screen.situation && (
        <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {screen.situation}
        </div>
      )}

      {screen.question && (
        <h2 className="text-lg font-bold text-gray-900 leading-snug">{screen.question}</h2>
      )}

      <p className="text-xs font-semibold text-primary">해당하는 것 모두 선택하세요</p>

      <div className="space-y-2.5">
        {choices.map((choice) => {
          const isSelected = selectedIds.includes(choice.id)
          const isThisCorrect = correct.has(choice.id)
          let style = 'border-gray-200 bg-white text-gray-800'

          if (revealed) {
            if (isThisCorrect) {
              style = 'border-green-400 bg-green-50 text-green-800'
            } else if (isSelected) {
              style = 'border-red-400 bg-red-50 text-red-800'
            } else {
              style = 'border-gray-100 bg-gray-50 text-gray-400'
            }
          } else if (isSelected) {
            style = 'border-primary bg-indigo-50 text-primary'
          }

          return (
            <button
              key={choice.id}
              onClick={() => onMultiToggle(choice.id)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 font-medium transition-all text-sm ${style} ${
                revealed ? 'cursor-default' : 'hover:border-gray-300 active:scale-[0.99]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {!revealed && (
                  <span
                    className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    )}
                  </span>
                )}
                {revealed && isThisCorrect && <span className="shrink-0">✅</span>}
                {revealed && isSelected && !isThisCorrect && <span className="shrink-0">❌</span>}
                <span>{choice.text}</span>
              </span>
            </button>
          )
        })}
      </div>

      {!revealed && (
        <button
          onClick={onMultiConfirm}
          disabled={selectedIds.length === 0}
          className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold disabled:opacity-40 transition-all active:scale-[0.99]"
        >
          정답 확인
        </button>
      )}

      {revealed && (
        <div className="space-y-3 mt-1">
          <div
            className={`rounded-2xl p-4 ${
              isAllCorrect
                ? 'bg-green-50 border border-green-200'
                : 'bg-orange-50 border border-orange-200'
            }`}
          >
            <p
              className={`text-sm font-semibold mb-1.5 ${
                isAllCorrect ? 'text-green-700' : 'text-orange-700'
              }`}
            >
              {isAllCorrect ? '🎉 정답이에요!' : '😅 아쉬워요, 한 번 봐요!'}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {screen.explanation}
            </p>
          </div>
          <ActionButton onClick={onNext}>다음 →</ActionButton>
        </div>
      )}
    </div>
  )
}

/* ─── 매칭 화면 ──────────────────────────────────── */
function MatchingScreen({ screen, onNext }: RendererProps) {
  const pairs: MatchingPair[] = screen.matchingPairs ?? []

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matched, setMatched] = useState<Record<string, string>>({})
  const [wrongPair, setWrongPair] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  const allDone = Object.keys(matched).length === pairs.length

  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => setShowResult(true), 400)
      return () => clearTimeout(t)
    }
  }, [allDone])

  function handleLeft(leftId: string) {
    if (matched[leftId] || showResult) return
    setSelectedLeft((prev) => (prev === leftId ? null : leftId))
  }

  function handleRight(rightId: string) {
    if (!selectedLeft || showResult) return
    const pair = pairs.find((p) => p.leftId === selectedLeft)
    if (!pair) return

    if (pair.rightId === rightId) {
      setMatched((prev) => ({ ...prev, [selectedLeft]: rightId }))
      setSelectedLeft(null)
    } else {
      setWrongPair(selectedLeft)
      setSelectedLeft(null)
      setTimeout(() => setWrongPair(null), 700)
    }
  }

  const unmatchedLeft = pairs.filter((p) => !matched[p.leftId])
  const matchedLeft = pairs.filter((p) => matched[p.leftId])

  return (
    <div className="flex flex-col gap-3 pt-2">
      {screen.situation && (
        <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {screen.situation}
        </div>
      )}

      {selectedLeft && !showResult && (
        <p className="text-xs text-primary text-center font-medium">
          오른쪽에서 짝을 골라보세요 →
        </p>
      )}

      {/* 완료된 매칭 */}
      {matchedLeft.map((pair) => (
        <div
          key={pair.leftId}
          className="rounded-2xl border-2 border-green-400 bg-green-50 px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-green-700 shrink-0">{pair.leftText}</span>
            <span className="text-green-400 shrink-0">→</span>
            <span className="text-green-800">{pair.rightText}</span>
            <span className="ml-auto shrink-0">✅</span>
          </div>
        </div>
      ))}

      {/* 미완료 좌측 + 우측 */}
      {unmatchedLeft.length > 0 && !allDone && (
        <div className="flex gap-2">
          {/* 좌측 */}
          <div className="flex flex-col gap-2 flex-1">
            {unmatchedLeft.map((pair) => {
              const isSelected = selectedLeft === pair.leftId
              const isWrong = wrongPair === pair.leftId
              return (
                <button
                  key={pair.leftId}
                  onClick={() => handleLeft(pair.leftId)}
                  className={`w-full text-left px-3 py-3 rounded-2xl border-2 text-sm font-semibold transition-all ${
                    isWrong
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : isSelected
                      ? 'border-primary bg-indigo-50 text-primary shadow-md scale-[1.02]'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {isSelected && <span className="mr-1">👆</span>}
                  {pair.leftText}
                </button>
              )
            })}
          </div>

          {/* 우측 */}
          <div className="flex flex-col gap-2 flex-1">
            {unmatchedLeft.map((pair) => {
              const alreadyMatched = Object.values(matched).includes(pair.rightId)
              return (
                <button
                  key={pair.rightId}
                  onClick={() => handleRight(pair.rightId)}
                  disabled={alreadyMatched}
                  className={`w-full text-left px-3 py-3 rounded-2xl border-2 text-xs transition-all leading-snug ${
                    alreadyMatched
                      ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-default'
                      : selectedLeft
                      ? 'border-dashed border-primary bg-indigo-50 text-gray-700 cursor-pointer'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {pair.rightText}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {showResult && (
        <div className="space-y-3 mt-1">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-green-700 mb-1.5">🎉 모두 완료!</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {screen.explanation}
            </p>
          </div>
          <ActionButton onClick={onNext}>다음 →</ActionButton>
        </div>
      )}
    </div>
  )
}

/* ─── 완료 화면 ──────────────────────────────────── */
function CompletionScreen({ screen }: { screen: QuestScreen }) {
  const data = screen.completion
  if (!data) return null

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="text-center py-4">
        <p className="text-5xl mb-3">🎉</p>
        <h2 className="text-2xl font-bold text-gray-900">{screen.title}</h2>
        <p className="text-gray-500 text-sm mt-1">73강 「레버리지 투자에 대하여」</p>
      </div>

      <div className="space-y-3">
        {data.summaryCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm font-bold text-primary mb-1">{card.title}</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
        <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-line font-medium">
          {data.finalMessage}
        </p>
      </div>
    </div>
  )
}

/* ─── VisualBox ──────────────────────────────────── */
function VisualBoxCard({ box }: { box: NonNullable<QuestScreen['visualBox']> }) {
  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 overflow-hidden">
      {box.title && (
        <div className="px-4 py-2 bg-indigo-100 border-b border-indigo-200">
          <p className="text-xs font-bold text-indigo-700">{box.title}</p>
        </div>
      )}
      <div className="divide-y divide-indigo-100">
        {box.items.map((item, i) => (
          <div
            key={i}
            className={`flex justify-between items-center px-4 py-2.5 ${
              item.highlight ? 'bg-amber-50' : ''
            }`}
          >
            <span className="text-xs text-gray-600">{item.label}</span>
            <span
              className={`text-xs font-bold ${
                item.highlight ? 'text-amber-700' : 'text-indigo-700'
              }`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── 공용 버튼 ──────────────────────────────────── */
function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 bg-primary text-white font-semibold rounded-2xl transition-all active:scale-[0.99] hover:bg-indigo-700"
    >
      {children}
    </button>
  )
}
