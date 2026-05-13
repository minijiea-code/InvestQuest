import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAppStore } from '../../store/useAppStore'
import type { Grade } from '../../types'

const GRADE_INFO: Record<Grade, {
  label: string
  emoji: string
  color: string
  bg: string
  border: string
  description: string
  path: string
}> = {
  beginner: {
    label: '초급',
    emoji: '🌱',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    description: '투자의 기초부터 탄탄하게 쌓아봐요.',
    path: '인플레이션 → 주식 기초 → 재무제표 입문 → 리스크 관리',
  },
  intermediate: {
    label: '중급',
    emoji: '📈',
    color: 'text-primary',
    bg: 'bg-primary-50',
    border: 'border-primary-100',
    description: '핵심 개념을 강화하고 실전 판단력을 키워봐요.',
    path: '재무제표 심화 → 밸류에이션 → 섹터 분석 → 포트폴리오',
  },
  advanced: {
    label: '고급',
    emoji: '🏆',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    description: '고급 전략과 심층 분석 능력을 다져봐요.',
    path: '매크로 분석 → 퀀트 기초 → 리스크 헤징 → 자산 배분',
  },
}

export function GradeResult() {
  const navigate = useNavigate()
  const { user } = useAppStore()
  const grade: Grade = user?.grade ?? 'beginner'
  const info = GRADE_INFO[grade]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6 pt-16 pb-12">
      <div className="flex-1 flex flex-col items-center text-center">
        <div className={`w-24 h-24 rounded-3xl ${info.bg} border-2 ${info.border} flex items-center justify-center mb-6`}>
          <span className="text-5xl">{info.emoji}</span>
        </div>

        <p className="text-gray-500 mb-1">당신은</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-1">
          <span className={info.color}>[{info.label}]</span> 투자자예요
        </h1>
        <p className="text-gray-500 mt-3 mb-8 leading-relaxed">{info.description}</p>

        <div className={`w-full ${info.bg} border ${info.border} rounded-2xl p-5 text-left mb-8`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">학습 경로 미리보기</p>
          <p className={`text-sm font-medium ${info.color} leading-relaxed`}>{info.path}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 w-full border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">첫 퀘스트까지</p>
          <p className="font-semibold text-gray-900">⏱ 약 5분이면 완료해요</p>
        </div>
      </div>

      <Button fullWidth size="lg" onClick={() => navigate('/home')}>
        첫 퀘스트 시작하기 🚀
      </Button>
    </div>
  )
}
