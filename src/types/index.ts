export type Grade = 'beginner' | 'intermediate' | 'advanced'

export type Interest =
  | 'us_large_cap'
  | 'kr_blue_chip'
  | 'etf'
  | 'dividend'
  | 'sector'
  | 'short_term'

export interface UserProfile {
  id: string
  email: string
  grade: Grade
  interests: Interest[]
  streak: number
  last_quest_date: string | null
  daily_quest_count?: number
  total_quest_count?: number
  onboarding_done: boolean
  created_at: string
  // 성향 진단
  investment_purpose?: string
  investment_style_type?: string
  fund_type?: string
  study_time?: string
  interest_style?: string
  personality_diagnosis_completed?: boolean
  personality_diagnosis_date?: string | null
}

export interface OnboardingState {
  hasInvestmentExp: boolean | null
  expYears: '1년 미만' | '1~3년' | '3년 이상' | null
  hasAccount: boolean | null
  quizAnswers: (number | null)[]
  interests: Interest[]
}

export type QuestScreenType =
  | 'intro'
  | 'single_choice'
  | 'multi_choice'
  | 'explanation'
  | 'summary'
  | 'drag_match'

export interface QuestChoice {
  id: string
  text: string
  isCorrect?: boolean
}

export interface DragMatchItem {
  id: string
  text: string
  correctZone: string
}

export interface DragMatchZone {
  id: string
  label: string
}

export interface QuestScreenData {
  id: string
  type: QuestScreenType
  title?: string
  body?: string
  situation?: string       // 상단 회색 상황 설명 박스
  characterSpeech?: string // 캐릭터 말풍선 (있으면 title 대신 질문 역할)
  preamble?: string        // 화면 최상단 안내 배너 (ex. "심화 시작" 알림)
  hint?: string            // 작은 힌트 텍스트
  noReveal?: boolean       // true면 선택 즉시 정답 공개 없이 다음 화면으로 이동
  choices?: QuestChoice[]
  explanation?: string
  dragItems?: DragMatchItem[]  // drag_match 전용: 드래그 카드 목록
  dropZones?: DragMatchZone[]  // drag_match 전용: 드롭 영역 목록
}

export interface NewsSource {
  title: string
  url: string
  date: string
  summary: string
}

export interface Quest {
  id: string
  title: string
  description?: string
  estimatedMinutes: number
  category: string
  keySummary: string[]
  learningPoints?: string[]
  screens: QuestScreenData[]
  questType?: 'fixed' | 'auto'
  newsSource?: NewsSource
}

export interface QuestProgress {
  questId: string
  currentScreenIndex: number
  answers: Record<string, string>
  completedAt: string | null
}

export interface Stock {
  name: string
  nameKo?: string
  code: string
  market: 'KR' | 'US'
}

export interface PortfolioItem {
  id: string
  userId: string
  stockName: string
  stockCode: string
  market: 'KR' | 'US'
  createdAt: string
}

export interface DartDisclosure {
  corpName: string
  reportName: string
  receiptDate: string
  reportType: string
  receiptNo: string
}
