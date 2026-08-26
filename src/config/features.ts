/**
 * Feature Flag System
 *
 * 앱의 각 기능을 켜고 끄는 중앙 관리 파일입니다.
 * 신입 부원 교육 러너 모드에서는 대부분의 기능이 off 상태입니다.
 * 원래 방향(매일 학습 루틴 앱)으로 되돌리려면 각 값을 true로 바꾸면 됩니다.
 */

export const FEATURES = {
  // ============ 러너 모드에서 OFF ============
  streak: false,                    // 스트릭 시스템
  onboardingDiagnosis: false,       // 온보딩 성향 진단
  dailyQuestLimit: false,           // 일일 퀘스트 한도
  pushNotifications: false,         // 푸시 알림
  rankingSystem: false,             // 등급/랭킹 시스템
  newsQuestAutoGeneration: false,   // 뉴스 퀘스트 자동 생성
  investmentTabFullFeatures: false, // 투자 탭 매매기록 등 전체 기능
  aiFloatingButton: false,          // AI 플로팅 버튼
  ocrPortfolioInput: false,         // OCR 포트폴리오 입력
  legacyQuests: false,              // 이전에 만들었던 기초개념 퀘스트들
  exploreComingSoonTeasers: false,  // 탐색 탭 "곧 추가될 콘텐츠" 티저 (학습 경로 지도/레벨 순위/산업별 탐색)
  exploreTab: false,                // 탐색 탭 노출 (뉴스 퀘스트는 홈으로 이동)
  portfolioTab: false,              // 내 투자 탭 노출

  // ============ 러너 모드에서 ON ============
  hunterCurriculumHome: true,       // 5개 강의 트리 홈 화면
  investmentTabPlaceholder: true,   // 투자 탭 플레이스홀더
  completionCelebration: true,      // 완주 축하 애니메이션
  minimalSignup: true,              // 최소 회원가입 (기수/이름/성별)

  // ============ 항상 ON ============
  questCompletionTracking: true,    // 완료율/정답률 데이터 수집
  lecture73Preview: true,           // 73강 프리뷰 페이지 (/preview/lecture-73)
} as const

export type FeatureFlag = keyof typeof FEATURES

// 사용 예시:
// import { FEATURES } from '@/config/features'
// {FEATURES.streak && <StreakDisplay />}
