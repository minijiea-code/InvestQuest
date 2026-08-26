import { useLayoutEffect, useRef, useState } from 'react'
import type { CurriculumLecture } from '../data/hunter-curriculum'

export type LectureStatus = 'completed' | 'current' | 'locked'

interface CurriculumTreeProps {
  lectures: { lecture: CurriculumLecture; status: LectureStatus }[]
  allCompleted: boolean
  onSelect: (lecture: CurriculumLecture, status: LectureStatus) => void
  onTrophy: () => void
}

export function CurriculumTree({ lectures, allCompleted, onSelect, onTrophy }: CurriculumTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([])
  const trophyRef = useRef<HTMLButtonElement>(null)
  const [pathD, setPathD] = useState('')
  const [svgHeight, setSvgHeight] = useState(0)

  useLayoutEffect(() => {
    function recompute() {
      const container = containerRef.current
      if (!container) return
      const containerRect = container.getBoundingClientRect()

      const points = circleRefs.current
        .filter((el): el is HTMLSpanElement => el !== null)
        .map((el) => {
          const r = el.getBoundingClientRect()
          return {
            x: r.left + r.width / 2 - containerRect.left,
            y: r.top + r.height / 2 - containerRect.top,
          }
        })

      if (trophyRef.current) {
        const r = trophyRef.current.getBoundingClientRect()
        points.push({
          x: r.left + r.width / 2 - containerRect.left,
          y: r.top + r.height / 2 - containerRect.top,
        })
      }

      if (points.length < 2) {
        setPathD('')
        return
      }

      let d = `M ${points[0].x} ${points[0].y}`
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const midY = (prev.y + curr.y) / 2
        d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`
      }
      setPathD(d)
      setSvgHeight(containerRect.height)
    }

    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [lectures, allCompleted])

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-6 py-6 px-4">
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: svgHeight }}
      >
        <path d={pathD} fill="none" stroke="#E5E7EB" strokeWidth="4" strokeLinecap="round" />
      </svg>

      {lectures.map(({ lecture, status }, i) => {
        const isLeft = i % 2 === 0
        return (
          <div key={lecture.id} className={`w-full flex ${isLeft ? 'justify-start' : 'justify-end'}`}>
            <LectureNode
              lecture={lecture}
              status={status}
              onClick={() => onSelect(lecture, status)}
              circleRef={(el) => {
                circleRefs.current[i] = el
              }}
            />
          </div>
        )
      })}

      <TrophyNode allCompleted={allCompleted} onClick={onTrophy} trophyRef={trophyRef} />
    </div>
  )
}

function LectureNode({
  lecture,
  status,
  onClick,
  circleRef,
}: {
  lecture: CurriculumLecture
  status: LectureStatus
  onClick: () => void
  circleRef: (el: HTMLSpanElement | null) => void
}) {
  const circleStyle =
    status === 'completed'
      ? 'bg-green-500 text-white'
      : status === 'current'
      ? 'bg-primary text-white animate-pulse'
      : 'bg-gray-200 text-gray-400'

  const cardStyle =
    status === 'locked'
      ? 'bg-gray-50 border-gray-100'
      : status === 'current'
      ? 'bg-indigo-50 border-primary'
      : 'bg-white border-gray-100'

  const titleStyle =
    status === 'completed'
      ? 'text-gray-500'
      : status === 'locked'
      ? 'text-gray-400'
      : 'text-gray-900'

  return (
    <button
      onClick={onClick}
      className={`relative z-10 flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 transition-all active:scale-[0.98] max-w-[240px] ${cardStyle}`}
    >
      <span
        ref={circleRef}
        className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${circleStyle}`}
      >
        {status === 'completed' ? '✓' : status === 'locked' ? '🔒' : lecture.order}
      </span>
      <span className="flex flex-col items-start text-left">
        <span className={`text-sm font-bold leading-tight ${titleStyle}`}>{lecture.title}</span>
        <span className="text-[11px] text-gray-400 leading-tight">{lecture.subtitle}</span>
        <span className="text-[11px] text-gray-400">
          약 {lecture.estimatedMinutes}분{status === 'current' ? ' · 지금 시작하기' : ''}
        </span>
      </span>
    </button>
  )
}

function TrophyNode({
  allCompleted,
  onClick,
  trophyRef,
}: {
  allCompleted: boolean
  onClick: () => void
  trophyRef: React.RefObject<HTMLButtonElement | null>
}) {
  return (
    <button
      ref={trophyRef}
      onClick={onClick}
      disabled={!allCompleted}
      className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all ${
        allCompleted ? 'bg-amber-100 shadow-md active:scale-95' : 'bg-gray-100 opacity-60'
      }`}
    >
      🏆
    </button>
  )
}
