export interface CurriculumLecture {
  id: string // "conditional-probability" 등
  order: number // 1~5
  stage: 1 | 2 | 3 | 4 | 5 // 강의 진행 단계 (강의마다 고유한 stage — 각각 개별로 열림)
  title: string // "조건부 확률"
  subtitle: string // 부제 (나중에 퀘스트 만들면서 확정)
  estimatedMinutes: number
  questDataPath: string // 퀘스트 데이터 파일 경로
}

export const HUNTER_CURRICULUM: CurriculumLecture[] = [
  {
    id: 'conditional-probability',
    order: 1,
    stage: 1,
    title: '조건부 확률',
    subtitle: '확률과 조건부 확률의 차이',
    estimatedMinutes: 3,
    questDataPath: 'hunter-quest-conditional-probability',
  },
  {
    id: 'basic-1',
    order: 2,
    stage: 2,
    title: '기초 강의 1',
    subtitle: '주식의 세계에 오신 걸 환영합니다',
    estimatedMinutes: 10,
    questDataPath: 'hunter-quest-basic-1',
  },
  {
    id: 'basic-2',
    order: 3,
    stage: 3,
    title: '기초 강의 2',
    subtitle: '세계 경제의 크기를 느껴보세요',
    estimatedMinutes: 10,
    questDataPath: 'hunter-quest-basic-2',
  },
  {
    id: 'advanced-1',
    order: 4,
    stage: 4,
    title: '심화 강의 1',
    subtitle: '개미응집도 — 투자의 가장 위험한 함정',
    estimatedMinutes: 10,
    questDataPath: 'hunter-quest-advanced-1',
  },
  {
    id: 'advanced-2',
    order: 5,
    stage: 5,
    title: '심화 강의 2',
    subtitle: '귀류법 — 투자의 생존 전략',
    estimatedMinutes: 10,
    questDataPath: 'hunter-quest-advanced-2',
  },
]

// 잠금 해제 규칙: 각 강의는 자기 stage 번호가 curriculum_stage 값 이하일 때만 열림 (강의별 개별 해금)
// stage 1: 조건부 확률만
// stage 2: + 기초 강의 1
// stage 3: + 기초 강의 2
// stage 4: + 심화 강의 1
// stage 5: + 심화 강의 2 (전체 다 열림)
