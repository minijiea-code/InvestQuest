import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useQuestData } from '../../hooks/useQuestData'
import type { QuestScreenData, DragMatchItem, DragMatchZone } from '../../types'

export function QuestScreen() {
  const { questId } = useParams<{ questId: string }>()
  const navigate = useNavigate()
  const { questProgress, setQuestProgress } = useAppStore()
  const { quest, loading } = useQuestData(questId)

  const savedIndex =
    questProgress !== null && questProgress.questId === questId
      ? questProgress.currentScreenIndex
      : 0

  const [currentIndex, setCurrentIndex] = useState(savedIndex)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!questId) return
    if (questProgress?.questId !== questId) {
      setQuestProgress({ questId, currentScreenIndex: 0, answers: {}, completedAt: null })
    }
  }, [questId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        퀘스트 불러오는 중...
      </div>
    )
  }

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        퀘스트를 찾을 수 없어요.
      </div>
    )
  }

  const screen = quest.screens[currentIndex]
  const total = quest.screens.length
  const progress = (currentIndex + 1) / total

  function goNext() {
    if (currentIndex >= total - 1) {
      setQuestProgress(null)
      navigate(`/quest/${questId}/complete`)
      return
    }
    const nextIndex = currentIndex + 1
    setCurrentIndex(nextIndex)
    setQuestProgress({ questId: questId!, currentScreenIndex: nextIndex, answers: {}, completedAt: null })
    setSelectedIds([])
    setRevealed(false)
  }

  function handleSingleChoice(choiceId: string) {
    if (screen.noReveal) {
      goNext()
      return
    }
    if (revealed) return
    setSelectedIds([choiceId])
    setRevealed(true)
  }

  function handleMultiToggle(choiceId: string) {
    if (revealed) return
    setSelectedIds((prev) =>
      prev.includes(choiceId) ? prev.filter((id) => id !== choiceId) : [...prev, choiceId],
    )
  }

  function handleMultiConfirm() {
    if (selectedIds.length === 0) return
    setRevealed(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* 진행 바 */}
      <div className="px-4 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/quest/${questId}`)}
            className="text-gray-400 hover:text-gray-600 shrink-0 text-lg"
          >
            ✕
          </button>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 shrink-0 tabular-nums">
            {currentIndex + 1}/{total}
          </span>
        </div>
      </div>

      {/* 화면 컨텐츠 */}
      <div className="flex-1 flex flex-col px-4 pb-8">
        {screen.type === 'intro' && <IntroScreen screen={screen} onNext={goNext} />}
        {(screen.type === 'single_choice' || screen.type === 'multi_choice') && (
          <ChoiceScreen
            screen={screen}
            selectedIds={selectedIds}
            revealed={revealed}
            onSelect={screen.type === 'multi_choice' ? handleMultiToggle : handleSingleChoice}
            onConfirm={screen.type === 'multi_choice' ? handleMultiConfirm : undefined}
            onNext={goNext}
            multi={screen.type === 'multi_choice'}
          />
        )}
        {screen.type === 'explanation' && <ExplanationScreen screen={screen} onNext={goNext} />}
        {screen.type === 'summary' && <SummaryScreen screen={screen} onNext={goNext} />}
        {screen.type === 'drag_match' && (
          <DragMatchScreen key={screen.id} screen={screen} onNext={goNext} />
        )}
      </div>
    </div>
  )
}

/* ─── Intro ─────────────────────────────────────── */
function IntroScreen({ screen, onNext }: { screen: QuestScreenData; onNext: () => void }) {
  return (
    <div className="flex flex-col flex-1 pt-4 justify-between">
      <div className="space-y-4">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">시작</p>
        <h2 className="text-2xl font-bold text-gray-900">{screen.title}</h2>
        <p className="text-gray-600 leading-relaxed whitespace-pre-line">{screen.body}</p>
      </div>
      <ActionButton onClick={onNext}>시작하기 →</ActionButton>
    </div>
  )
}

/* ─── Explanation ───────────────────────────────── */
function ExplanationScreen({ screen, onNext }: { screen: QuestScreenData; onNext: () => void }) {
  return (
    <div className="flex flex-col flex-1 pt-4">
      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">
        💡 알고 가기
      </p>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{screen.title}</h2>
      <div className="flex-1 bg-white rounded-2xl p-5 border border-gray-100">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{screen.body}</p>
      </div>
      <div className="mt-4">
        <ActionButton onClick={onNext}>계속하기 →</ActionButton>
      </div>
    </div>
  )
}

/* ─── Choice (single & multi) ───────────────────── */
interface ChoiceScreenProps {
  screen: QuestScreenData
  selectedIds: string[]
  revealed: boolean
  onSelect: (id: string) => void
  onConfirm?: () => void
  onNext: () => void
  multi: boolean
}

function ChoiceScreen({
  screen,
  selectedIds,
  revealed,
  onSelect,
  onConfirm,
  onNext,
  multi,
}: ChoiceScreenProps) {
  const choices = screen.choices ?? []

  const isAllCorrect = multi
    ? choices.filter((c) => c.isCorrect).every((c) => selectedIds.includes(c.id)) &&
      selectedIds.every((id) => choices.find((c) => c.id === id)?.isCorrect)
    : choices.find((c) => c.id === selectedIds[0])?.isCorrect ?? false

  return (
    <div className="flex flex-col flex-1 pt-4 gap-3">
      {screen.preamble && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
          {screen.preamble}
        </div>
      )}

      {screen.situation && (
        <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {screen.situation}
        </div>
      )}

      {screen.characterSpeech && (
        <div className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-full bg-primary-50 border-2 border-primary-100 flex items-center justify-center shrink-0 text-lg">
            🧑‍💼
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 leading-relaxed flex-1">
            {screen.characterSpeech}
          </div>
        </div>
      )}

      {!screen.characterSpeech && screen.title && (
        <h2 className="text-lg font-bold text-gray-900 leading-snug">{screen.title}</h2>
      )}

      {screen.hint && (
        <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">
          💡 힌트: {screen.hint}
        </p>
      )}

      {multi && (
        <p className="text-xs font-semibold text-primary">해당하는 것 모두 선택하세요</p>
      )}

      <div className="space-y-2.5">
        {choices.map((choice) => {
          const isSelected = selectedIds.includes(choice.id)
          let style = 'border-gray-200 bg-white text-gray-800'

          if (revealed) {
            if (choice.isCorrect) {
              style = 'border-green-400 bg-green-50 text-green-800'
            } else if (isSelected) {
              style = 'border-red-400 bg-red-50 text-red-800'
            } else {
              style = 'border-gray-100 bg-gray-50 text-gray-400'
            }
          } else if (isSelected) {
            style = 'border-primary bg-primary-50 text-primary'
          }

          return (
            <button
              key={choice.id}
              onClick={() => onSelect(choice.id)}
              disabled={revealed && !multi}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 font-medium transition-all text-sm ${style} ${
                revealed ? 'cursor-default' : 'hover:border-gray-300 active:scale-[0.99]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {revealed && choice.isCorrect && <span className="shrink-0">✅</span>}
                {revealed && isSelected && !choice.isCorrect && <span className="shrink-0">❌</span>}
                <span>{choice.text}</span>
              </span>
            </button>
          )
        })}
      </div>

      {multi && !revealed && (
        <button
          onClick={onConfirm}
          disabled={selectedIds.length === 0}
          className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold disabled:opacity-40 transition-all active:scale-[0.99]"
        >
          확인하기
        </button>
      )}

      {revealed && (
        <div className="space-y-3">
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

/* ─── Summary ───────────────────────────────────── */
function SummaryScreen({ screen, onNext }: { screen: QuestScreenData; onNext: () => void }) {
  const points = screen.choices ?? []

  return (
    <div className="flex flex-col flex-1 pt-4">
      <div className="text-center mb-6">
        <p className="text-4xl mb-3">🏆</p>
        <h2 className="text-xl font-bold text-gray-900">{screen.title}</h2>
        <p className="text-gray-500 text-sm mt-1">{screen.body}</p>
      </div>
      <div className="space-y-3 mb-6">
        {points.map((point, i) => (
          <div key={point.id} className="flex gap-3 bg-white rounded-2xl p-4 border border-gray-100">
            <span className="text-primary font-bold shrink-0">{i + 1}</span>
            <p className="text-sm text-gray-700 leading-relaxed">{point.text}</p>
          </div>
        ))}
      </div>
      <ActionButton onClick={onNext}>완료하기 🎉</ActionButton>
    </div>
  )
}

/* ─── Drag Match ─────────────────────────────────── */
function DragMatchScreen({ screen, onNext }: { screen: QuestScreenData; onNext: () => void }) {
  const items: DragMatchItem[] = screen.dragItems ?? []
  const zones: DragMatchZone[] = screen.dropZones ?? []

  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [wrongCard, setWrongCard] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  const placedIds = new Set(Object.keys(placements))
  const unplacedItems = items.filter((item) => !placedIds.has(item.id))
  const allDone = placedIds.size === items.length

  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => setShowExplanation(true), 400)
      return () => clearTimeout(t)
    }
  }, [allDone])

  function handleCardTap(itemId: string) {
    if (placedIds.has(itemId) || showExplanation) return
    setSelectedCard((prev) => (prev === itemId ? null : itemId))
  }

  function handleZoneTap(zoneId: string) {
    if (!selectedCard || showExplanation) return
    const item = items.find((i) => i.id === selectedCard)!
    if (item.correctZone === zoneId) {
      setPlacements((prev) => ({ ...prev, [selectedCard]: zoneId }))
      setSelectedCard(null)
    } else {
      setWrongCard(selectedCard)
      setSelectedCard(null)
      setTimeout(() => setWrongCard(null), 700)
    }
  }

  const isActive = !!selectedCard && !showExplanation

  return (
    <div className="flex flex-col flex-1 pt-4 gap-4">
      <h2 className="text-lg font-bold text-gray-900">{screen.title}</h2>

      {unplacedItems.length > 0 && (
        <div className="space-y-2">
          {unplacedItems.map((item) => {
            const isSelected = selectedCard === item.id
            const isWrong = wrongCard === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleCardTap(item.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all duration-150
                  ${
                    isWrong
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : isSelected
                      ? 'border-primary bg-indigo-50 text-primary shadow-md scale-[1.02]'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 active:scale-[0.99]'
                  }`}
              >
                {isSelected && <span className="mr-2">👆</span>}
                {item.text}
              </button>
            )
          })}
        </div>
      )}

      {selectedCard && !showExplanation && (
        <p className="text-xs text-primary text-center font-medium">
          아래 영역을 탭해서 배치하세요 👇
        </p>
      )}

      <div className={`${zones.length > 2 ? 'grid grid-cols-2' : 'flex'} gap-3`}>
        {zones.map((zone) => {
          const zoneItems = items.filter((item) => placements[item.id] === zone.id)
          return (
            <div
              key={zone.id}
              onClick={() => handleZoneTap(zone.id)}
              className={`${zones.length <= 2 ? 'flex-1' : ''} min-h-[100px] rounded-2xl border-2 p-3 transition-all
                ${
                  allDone
                    ? 'border-green-400 bg-green-50 cursor-default'
                    : isActive
                    ? 'border-primary border-dashed bg-indigo-50 cursor-pointer'
                    : 'border-gray-200 bg-gray-50 cursor-default'
                }`}
            >
              <p className={`text-xs font-bold mb-2 ${allDone ? 'text-green-700' : 'text-gray-500'}`}>
                {zone.label}
              </p>
              <div className="space-y-1.5">
                {zoneItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-green-100 border border-green-300 rounded-xl px-3 py-2 text-xs text-green-800 font-medium"
                  >
                    ✓ {item.text}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {!allDone && (
        <p className="text-xs text-gray-400 text-center">
          {placedIds.size}/{items.length} 완료
        </p>
      )}

      {showExplanation && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-green-700 mb-1.5">🎉 모두 완료!</p>
            <p className="text-sm text-gray-700 leading-relaxed">{screen.explanation}</p>
          </div>
          <ActionButton onClick={onNext}>다음 →</ActionButton>
        </div>
      )}
    </div>
  )
}

/* ─── 공용 버튼 ─────────────────────────────────── */
function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 bg-primary text-white font-semibold rounded-2xl transition-all active:scale-[0.99] hover:bg-primary-600 mt-auto"
    >
      {children}
    </button>
  )
}
