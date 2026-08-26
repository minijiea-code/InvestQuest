import { useState, useEffect } from 'react'
import type { QuestScreen, MatchingPair } from '../../data/lecture-73-quest'

/**
 * 73강 프리뷰 페이지(src/pages/preview/PreviewLecture73.tsx)의 화면 렌더러를
 * 신규 강의 퀘스트에서도 재사용하기 위해 이식한 컴포넌트입니다.
 * 원본 파일은 회장 검수용으로 그대로 유지되므로 수정하지 않고,
 * 동일한 QuestScreen 타입을 사용하는 이 파일을 새로 만들었습니다.
 */

// lecture-73-quest.ts의 QuestScreen을 확장 — 원본 타입 파일은 수정하지 않고
// 러너 모드 전용 필드를 이 파일에서만 추가로 지원한다.
export interface CompareCardData {
  emoji: string
  label: string
  sublabel: string
  examples?: string
  footer?: string
  color: 'red' | 'blue' | 'gray'
}

export interface StackedCardData {
  emoji: string
  title: string
  body: string
  color?: 'red' | 'green' | 'gray' | 'purple' | 'amber' // 카드별 강조색 (기본 gray)
}

export interface TableData {
  headers: string[]
  rows: string[][]
}

export interface BarChartItem {
  label: string
  value: string // 표시용 텍스트 (예: "약 50%")
  widthPercent: number // 막대 실제 길이 (0~100)
  color?: 'blue' | 'red' | 'gray' // 기본 gray
}

export interface PriceChartPoint {
  value: number
  up: boolean // true면 전날 대비 상승(빨강), false면 하락(파랑)
}

export interface PriceChartData {
  points: PriceChartPoint[]
  peakLabel?: string // 최고점 근처에 표시할 라벨 (예: "67,000")
  currentLabel?: string // 마지막 막대 옆에 표시할 라벨 (예: "52,400")
}

export interface QuestScreenExt extends QuestScreen {
  imageUrl?: string // situation과 visualBox 사이에 렌더링됨
  priceChart?: PriceChartData // 코드로 렌더링하는 주가 차트 (situation과 visualBox 사이)
  noReveal?: boolean // true면 선택 즉시 정답 공개 없이 다음 화면으로 (correctAnswers는 채점용으로 그대로 유지)
  compareCards?: CompareCardData[] // 2열 비교 카드 (explanation 화면 전용)
  stackedCards?: StackedCardData[] // 세로 스택 카드 (explanation 화면 전용)
  flowArrows?: boolean // true면 stackedCards 사이에 ↓ 화살표를 넣어 흐름도로 표시
  table?: TableData // 표 (explanation 화면 전용)
  candlestickDemo?: boolean // 봉차트 설명용 고정 다이어그램 (explanation 화면 전용)
  barChart?: BarChartItem[] // 가로 막대 비율 그래프 (explanation 화면 전용)
  shockText?: string // 화면 중앙에 크게 강조하는 텍스트 (예: "-37달러")
}

export interface HunterQuestRendererProps {
  screen: QuestScreenExt
  selectedIds: string[]
  revealed: boolean
  onSingleSelect: (id: string) => void
  onMultiToggle: (id: string) => void
  onMultiConfirm: () => void
  onNext: () => void
}

export function HunterQuestRenderer(props: HunterQuestRendererProps) {
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
      return <CompletionScreen screen={screen} onNext={props.onNext} />
  }
}

/* ─── 설명 화면 ──────────────────────────────────── */
function ExplanationScreen({ screen, onNext }: HunterQuestRendererProps) {
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

      {screen.shockText && (
        <div className="text-center py-2">
          <span className="text-4xl font-black text-red-600">{screen.shockText}</span>
        </div>
      )}

      {screen.question && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {screen.question}
          </p>
        </div>
      )}

      {screen.compareCards && <CompareCards cards={screen.compareCards} />}
      {screen.stackedCards && <StackedCards cards={screen.stackedCards} arrows={screen.flowArrows} />}
      {screen.table && <DataTable table={screen.table} />}
      {screen.candlestickDemo && <CandlestickDemo />}
      {screen.barChart && <BarChart items={screen.barChart} />}

      {screen.helpText && (
        <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl whitespace-pre-line">
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
}: HunterQuestRendererProps) {
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

      {screen.imageUrl && (
        <img
          src={screen.imageUrl}
          alt=""
          className="max-h-64 w-auto mx-auto rounded-2xl border border-gray-100 object-contain"
        />
      )}

      {screen.priceChart && <PriceChartDemo chart={screen.priceChart} />}

      {screen.visualBox && <VisualBoxCard box={screen.visualBox} />}

      {screen.question && (
        <h2 className="text-lg font-bold text-gray-900 leading-snug">{screen.question}</h2>
      )}

      {screen.helpText && (
        <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl whitespace-pre-line">
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
}: HunterQuestRendererProps) {
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
function MatchingScreen({ screen, onNext }: HunterQuestRendererProps) {
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
function CompletionScreen({ screen, onNext }: { screen: QuestScreen; onNext: () => void }) {
  const data = screen.completion
  if (!data) return null

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="text-center py-4">
        <p className="text-5xl mb-3">🎉</p>
        <h2 className="text-2xl font-bold text-gray-900">{screen.title}</h2>
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

      <div className="mt-2">
        <ActionButton onClick={onNext}>완료하기 →</ActionButton>
      </div>
    </div>
  )
}

/* ─── 2열 비교 카드 ──────────────────────────────── */
function CompareCards({ cards }: { cards: CompareCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`rounded-xl p-4 text-center border ${
            c.color === 'red'
              ? 'bg-red-50 border-red-200'
              : c.color === 'gray'
              ? 'bg-gray-50 border-gray-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="text-3xl mb-2">{c.emoji}</div>
          <div className="font-bold text-base text-gray-900">{c.label}</div>
          <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">{c.sublabel}</div>
          {c.examples && <div className="text-xs text-gray-500 mt-2">{c.examples}</div>}
          {c.footer && <div className="text-[10px] text-gray-400 mt-1">{c.footer}</div>}
        </div>
      ))}
    </div>
  )
}

/* ─── 세로 스택 카드 ─────────────────────────────── */
function StackedCards({ cards, arrows }: { cards: StackedCardData[]; arrows?: boolean }) {
  const cardStyle: Record<NonNullable<StackedCardData['color']>, string> = {
    gray: 'bg-gray-50',
    red: 'bg-red-50 border border-red-200',
    green: 'bg-green-50 border border-green-200',
    purple: 'bg-purple-50 border border-purple-200',
    amber: 'bg-amber-50 border border-amber-200',
  }
  return (
    <div className="space-y-2">
      {cards.map((c, i) => (
        <div key={i}>
          <div className={`rounded-xl p-3 flex items-start gap-3 ${cardStyle[c.color ?? 'gray']}`}>
            <span className="text-xl shrink-0">{c.emoji}</span>
            <div>
              <p className="text-sm font-bold text-gray-900">{c.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{c.body}</p>
            </div>
          </div>
          {arrows && i < cards.length - 1 && (
            <div className="flex justify-center text-gray-300 text-lg py-0.5">↓</div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── 표 ─────────────────────────────────────────── */
function DataTable({ table }: { table: TableData }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50">
            {table.headers.map((h, i) => (
              <th key={i} className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-100">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-2 text-gray-700 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── 가로 막대 비율 그래프 ──────────────────────── */
function BarChart({ items }: { items: BarChartItem[] }) {
  const barColor: Record<NonNullable<BarChartItem['color']>, string> = {
    blue: 'bg-blue-500',
    red: 'bg-red-400',
    gray: 'bg-gray-400',
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-bold text-gray-900">{item.value}</span>
          </div>
          <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor[item.color ?? 'gray']}`}
              style={{ width: `${item.widthPercent}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── 주가 차트 (코드 렌더링, 이미지 아님) ──────────── */
function PriceChartDemo({ chart }: { chart: PriceChartData }) {
  const { points, peakLabel, currentLabel } = chart
  const max = Math.max(...points.map((p) => p.value))
  const min = Math.min(...points.map((p) => p.value))
  const range = max - min || 1

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-end gap-1 h-32">
        {points.map((p, i) => {
          const heightPercent = 12 + ((p.value - min) / range) * 88
          return (
            <div key={i} className="flex-1 h-full flex items-end">
              <div
                className={`w-full rounded-sm ${p.up ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          )
        })}
      </div>
      {(peakLabel || currentLabel) && (
        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          {peakLabel ? <span>최고 {peakLabel}</span> : <span />}
          {currentLabel && <span className="font-bold text-gray-700">현재 {currentLabel}</span>}
        </div>
      )}
    </div>
  )
}

/* ─── 봉차트 설명 다이어그램 (코드 렌더링, 이미지 아님) ── */
function CandlestickDemo() {
  return (
    <div className="flex justify-center gap-10 py-2">
      <CandlestickBar color="red" topLabel="종가" bottomLabel="시가" title="📈 상승" />
      <CandlestickBar color="blue" topLabel="시가" bottomLabel="종가" title="📉 하락" />
    </div>
  )
}

function CandlestickBar({
  color,
  topLabel,
  bottomLabel,
  title,
}: {
  color: 'red' | 'blue'
  topLabel: string
  bottomLabel: string
  title: string
}) {
  const bg = color === 'red' ? 'bg-red-500' : 'bg-blue-500'
  const wick = color === 'red' ? 'bg-red-300' : 'bg-blue-300'
  const text = color === 'red' ? 'text-red-600' : 'text-blue-600'
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-gray-400">최고가</span>
      <div className={`w-0.5 h-3 ${wick}`} />
      <div className={`w-8 h-20 rounded-sm flex flex-col justify-between items-center py-1 ${bg}`}>
        <span className="text-[9px] font-semibold text-white">{topLabel}</span>
        <span className="text-[9px] font-semibold text-white">{bottomLabel}</span>
      </div>
      <div className={`w-0.5 h-3 ${wick}`} />
      <span className="text-[10px] text-gray-400">최저가</span>
      <span className={`text-xs font-bold mt-1 ${text}`}>{title}</span>
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
