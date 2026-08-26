# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Node.js PATH가 없을 경우 PowerShell에서 먼저 실행
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

npm run dev       # 개발 서버 (http://localhost:5173)
npm run build     # 프로덕션 빌드 (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # 빌드 결과물 미리보기
```

---

## Architecture

**InvestQuest** — 게이미피케이션 기반 투자 학습 앱 MVP. 듀오링고 방식으로 매일 5분 퀘스트를 풀며 투자 개념을 체득하게 하는 모바일 퍼스트 반응형 웹앱.

### 라우팅 흐름

```
/ (Landing) → /auth → /onboarding/step1 → step2 → step3 → /onboarding/result → /home
                                                                                  ↓
                                                              /explore (뉴스 퀘스트)
                                                              /portfolio
                                                              /quest/:questId
                                                              /paywall
```

### 상태 관리

Context API 기반 경량 전역 상태 (`src/store/useAppStore.ts`).
- `AppContext` + `useAppState()` hook으로 `App.tsx`에서 Provider 감쌈
- 3개 도메인: `user` (UserProfile), `onboarding` (온보딩 답변), `questProgress` (퀘스트 진행)
- 상태가 복잡해지면 Zustand로 교체 예정

### 퀘스트 데이터 구조

고정 퀘스트는 `src/data/quest_XX.json`으로 관리. 뉴스 퀘스트(quest_auto_YYYYMMDD)는 Supabase `quests` 테이블에 저장.

```ts
Quest {
  id: string
  title: string
  description?: string      // 홈 퀘스트 카드 서브타이틀
  estimatedMinutes: number
  category: string
  keySummary: string[]      // 완료 화면에 표시할 핵심 정리
  learningPoints?: string[] // 진입 화면에 표시할 학습 목표
  screens: QuestScreenData[]
  questType?: 'fixed' | 'auto'  // auto = 뉴스 퀘스트
  newsSource?: NewsSource        // auto 퀘스트일 때만 존재
}

NewsSource {
  title: string   // 원본 뉴스 제목
  url: string     // 원본 뉴스 URL
  date: string    // YYYY-MM-DD
  summary: string // 초급자용 3줄 요약 (Claude API 생성)
}

// screen types:
// 'intro' | 'single_choice' | 'multi_choice' | 'explanation' | 'summary' | 'drag_match'

// QuestScreenData 주요 필드
// situation?: string         — 상단 회색 컨텍스트 박스 (상황 설명)
// characterSpeech?: string   — 캐릭터 말풍선 (있으면 title 대신 질문 역할)
// preamble?: string          — 최상단 앰버 배너 (심화 시작 등 구간 알림)
// hint?: string              — 작은 힌트 텍스트
// noReveal?: boolean         — true면 선택 시 정답 공개 없이 즉시 다음 화면으로
// dragItems?: DragMatchItem[] — drag_match 전용: 드래그 카드 목록
// dropZones?: DragMatchZone[] — drag_match 전용: 드롭 영역 목록
```

퀘스트 흐름: `/quest/:questId` (QuestEntry) → `/quest/:questId/play` (QuestScreen) → `/quest/:questId/complete` (QuestComplete)

**퀘스트 로딩** (`src/hooks/useQuestData.ts`)
- `questId.startsWith('quest_auto_')` → Supabase `quests` 테이블에서 비동기 로드 (세션 캐시)
- 그 외 → `getQuest(questId)` 동기 로드 (JSON 파일)

**퀘스트 시퀀스** (`src/data/quests.ts`의 `QUEST_SEQUENCE`)
- `total_quest_count = 0` → quest_01 표시
- `total_quest_count = 1` → quest_02 표시
- `total_quest_count = 2` → quest_03 표시
- 홈 화면은 `total_quest_count` 기반으로 다음 퀘스트 결정 (날짜 리셋 없이 전체 진행도 유지)

**일일 한도 (통합)**
- 고정 퀘스트 + 뉴스 퀘스트 합산 하루 2개, `daily_quest_count`로 추적
- `daily_quest_count >= 2` → 페이월 (고정 퀘스트) 또는 탐색 탭 (뉴스 퀘스트)
- `last_quest_date !== today`이면 `daily_quest_count` 무시하고 0으로 취급 (날짜 기반 자동 리셋)
- 뉴스 퀘스트 완료 여부는 추가로 `localStorage.news_quest_completed_date`로 추적

**`total_quest_count` vs `daily_quest_count`**
- `total_quest_count`: 고정 퀘스트 전용 누적 진행도. 리셋 없음. 홈 화면 퀘스트 결정에 사용. 성향 진단 트리거 (`>= 2`)에 사용.
- `daily_quest_count`: 오늘 완료한 퀘스트 수 (고정 + 뉴스 합산). 매일 자동 리셋. 일일 한도 체크에 사용.

### Supabase

- 클라이언트: `src/lib/supabase.ts` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 필요
- `.env` 파일에 키 입력 필요 (`.env.example` 참고)
- 이메일 로그인만 사용 (소셜 로그인은 MVP 이후)

> ⚠️ **anon key 형식 주의**: Supabase 대시보드 → Project Settings → API Keys에서 복사한 `anon` `public` 키를 사용해야 함. `sb_publishable_...` 형식의 키는 RLS 인증이 동작하지 않음. 올바른 키는 `eyJ...`로 시작하는 JWT 형식임.

> ⚠️ **테이블 GRANT 필요**: SQL Editor로 직접 테이블을 생성하면 `authenticated` 역할에 권한이 자동 부여되지 않아 403 에러 발생. 새 테이블 생성 시 반드시 아래 GRANT 실행 필요:
> ```sql
> GRANT ALL ON TABLE public.테이블명 TO authenticated;
> GRANT ALL ON TABLE public.테이블명 TO service_role;
> ```

> ⚠️ **이메일 인증 설정**: 개발 중에는 Supabase → Authentication → Providers → Email → Confirm email을 **OFF**로 설정해야 회원가입 직후 세션이 생성됨.

**현재 profiles 테이블 컬럼**
```sql
id UUID PRIMARY KEY
email TEXT
grade TEXT                  -- 'beginner' | 'intermediate' | 'advanced'
interests TEXT[]
streak INT DEFAULT 0
last_quest_date DATE
daily_quest_count INT DEFAULT 0
total_quest_count INT DEFAULT 0
onboarding_done BOOLEAN DEFAULT false
created_at TIMESTAMPTZ
-- 성향 진단 (Step 6)
investment_purpose TEXT
investment_style_type TEXT
fund_type TEXT
study_time TEXT
interest_style TEXT
personality_diagnosis_completed BOOLEAN DEFAULT false
personality_diagnosis_date TIMESTAMPTZ
```

**현재 quests 테이블 컬럼** (Step 8 추가)
```sql
id TEXT PRIMARY KEY           -- 'quest_auto_YYYYMMDD'
title TEXT
description TEXT
estimated_minutes INT DEFAULT 5
category TEXT DEFAULT '뉴스'
key_summary TEXT[]
learning_points TEXT[]
screens JSONB                 -- QuestScreenData[] JSON
quest_type TEXT DEFAULT 'auto'
news_source JSONB             -- { title, url, date, summary }
created_at TIMESTAMPTZ
```

### 디자인 시스템

Tailwind CSS 커스텀 컬러:
- `primary` = `#4F46E5` (인디고 — 신뢰감)
- `accent` = `#F59E0B` (앰버 — 스트릭/성취)
- 기본 UI: `src/components/ui/` (Button, Card)
- 레이아웃: `src/components/layout/` (PageLayout, BottomNav)

하단 탭 3개: 홈 `/home`, 탐색 `/explore`, 내 투자 `/portfolio`

### MVP 범위 제약

아래는 MVP에 포함하지 않음:
- 포트폴리오 유료 기능 카드
- 실제 결제 연동
- 소셜 로그인
- RAG 파이프라인 / 복잡한 개인화 알고리즘
- drag_match 실제 드래그 인터랙션 (현재 탭+탭 방식으로 구현, Phase 2에서 개선 예정)

---

## 구현 단계 (Step)

| Step | 내용 | 상태 |
|------|------|------|
| 1 | 프로젝트 초기 셋업 | ✅ 완료 |
| 2 | 퀘스트 엔진 코어 | ✅ 완료 |
| 3 | Supabase 인증 + 온보딩 DB 연동 | ✅ 완료 |
| 4 | 홈 화면 + 스트릭 로직 | ✅ 완료 |
| 5 | 일일 한도 + 유료 전환 화면 | ✅ 완료 |
| — | 고정 퀘스트 2 추가 | ✅ 완료 |
| 6 | 성향 진단 (트리거: 누적 퀘스트 2개 완료 시점) | ✅ 완료 |
| 7 | 포트폴리오 + DART API | ✅ 완료 |
| 8 | 뉴스 퀘스트 파이프라인 (Supabase Edge Function + Claude API) | ✅ 완료 |
| — | 고정 퀘스트 3 추가 | ✅ 완료 |
| 10 | 푸시 알림 + 최종 다듬기 | 대기 |

---

## 완료된 Step 상세

### Step 2 — 퀘스트 엔진 코어 ✅

**생성된 파일**

| 파일 | 역할 |
|------|------|
| `src/data/quest_01.json` | 13화면 인플레이션 퀘스트 데이터 |
| `src/data/quests.ts` | questId → Quest 객체 로드 함수 (`getQuest`) |
| `src/pages/quest/QuestEntry.tsx` | 퀘스트 진입 화면 (제목·소요시간·시작 버튼) |
| `src/pages/quest/QuestScreen.tsx` | 퀘스트 엔진 (화면 타입별 렌더링, 진행 바) |
| `src/pages/quest/QuestComplete.tsx` | 완료 화면 (+100XP, 스트릭, keySummary, 다음 예고) |
| `src/vite-env.d.ts` | `import.meta.env` 타입 선언 |

**추가된 라우트** (`src/App.tsx`)
```
/quest/:questId          → QuestEntry
/quest/:questId/play     → QuestScreen
/quest/:questId/complete → QuestComplete
```

**quest_01.json 화면 구성 (13화면)**

| # | 화면 | 타입 | 특징 |
|---|------|------|------|
| 1 | 100만원 손해인가? | single_choice | `noReveal`: 답 공개 없이 바로 넘어가 궁금증 유발 |
| 2 | 인플레이션 개념 도입 | explanation | 짜장면 예시 |
| 3 | 짜장면 그릇 수 계산 | single_choice | `situation` + `hint` |
| 4 | 역방향 계산 | single_choice | `characterSpeech` 말풍선 |
| 5 | 물가상승률 계산 | single_choice | 공식 힌트 제공 |
| 6 | 왜 투자를 하는가 | explanation | — |
| 7 | 자본차익 | single_choice | `preamble` + `characterSpeech` |
| 8 | 배당 | single_choice | `characterSpeech` |
| 9 | 자본차익+배당 합산 | single_choice | `characterSpeech` |
| 10 | 리스크 | single_choice | `situation` + 이진 선택 |
| 11 | 뉴스 독해 | single_choice | `preamble` 심화 알림 |
| 12 | 증권 앱 독해 | single_choice | `situation` 앱 화면 |
| 13 | 최종 상황 판단 | single_choice | 복리 계산 종합 |

---

### Step 3 — Supabase 인증 + 온보딩 DB 연동 ✅

**Supabase 테이블 초기 생성 SQL**
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  grade TEXT CHECK (grade IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  interests TEXT[] DEFAULT '{}',
  streak INT DEFAULT 0,
  last_quest_date DATE,
  onboarding_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
```

**변경/생성된 파일**

| 파일 | 역할 |
|------|------|
| `src/lib/gradeCalculator.ts` | 온보딩 답변 → beginner/intermediate/advanced 등급 계산 |
| `src/store/useAppStore.ts` | 앱 시작 시 Supabase 세션 자동 로드 + 로그아웃 감지 |
| `src/App.tsx` | 로딩 스크린, `ProtectedRoute` 컴포넌트, 보호 라우트 처리 |
| `src/pages/Auth.tsx` | 로그인 후 `onboarding_done` 확인 → 분기 리다이렉트 |
| `src/pages/onboarding/Step3Interests.tsx` | 등급 계산 → Supabase `profiles` upsert |

**등급 계산 로직** (`src/lib/gradeCalculator.ts`)
- 투자 경험 있음: +1점 / 1~3년: +1점 추가 / 3년 이상: +2점 추가
- Q2(재무제표): 열어봤지만 모름=+1, 자주 봄=+2
- Q3(뉴스): 매일 봄=+1, 여러 매체 비교=+2
- 합계 0~1점: beginner / 2~3점: intermediate / 4점+: advanced

> ⚠️ **로직 조정 예정**: 현재 점수 기준은 임시 값. 수정 시 `src/lib/gradeCalculator.ts` 단일 파일만 수정하면 됨.

---

### Step 4 — 홈 화면 + 스트릭 로직 ✅

**변경/생성된 파일**

| 파일 | 역할 |
|------|------|
| `src/lib/streakUtils.ts` | 스트릭 계산 (`calcNewStreak`, `isCompletedToday`, `getDailyQuestCount`) |
| `src/pages/Home.tsx` | 등급·스트릭 표시, 퀘스트 카드, 더미 시장 요약 |
| `src/pages/quest/QuestScreen.tsx` | 화면 전환마다 `questProgress` store 저장 |
| `src/pages/quest/QuestEntry.tsx` | 진행 중 퀘스트 감지 → "이어서 하기" / "처음부터 다시 하기" 분기 |
| `src/pages/quest/QuestComplete.tsx` | 완료 시 streak 계산 → Supabase 업데이트 → store 동기화 |

**스트릭 계산 로직** (`src/lib/streakUtils.ts`)
- `last_quest_date`가 오늘이면 → 변화 없음 (이미 완료)
- `last_quest_date`가 어제이면 → `streak + 1`
- 그 외(건너뜀 or 처음) → `streak = 1`

**이어서 하기 동작**
- `questProgress`는 store(메모리)에 저장 → 같은 세션 내에서만 유지
- 페이지 새로고침 시 진행 상태 초기화됨 (DB 저장은 MVP 범위 외)

---

### Step 5 — 일일 한도 + 유료 전환 화면 ✅

**Supabase 컬럼 추가 (수동 실행)**
```sql
ALTER TABLE public.profiles ADD COLUMN daily_quest_count INT DEFAULT 0;
```

**변경/생성된 파일**

| 파일 | 역할 |
|------|------|
| `src/pages/Paywall.tsx` (신규) | 한도 화면 — 프리미엄 혜택 + "프리미엄 시작하기"(alert) + "닫기" |
| `src/pages/quest/QuestComplete.tsx` | 완료 시 `daily_quest_count` 증가. 2개 도달 시 `/paywall`로 이동 |
| `src/pages/quest/QuestEntry.tsx` | 한도 도달 시 진입 차단 → 페이월 또는 홈으로 리다이렉트 |
| `src/App.tsx` | `/paywall` 라우트 추가 (ProtectedRoute) |

**일일 카운트 로직**
- `last_quest_date !== today`이면 `daily_quest_count` 무시하고 0으로 취급 (날짜 기반 자동 리셋)
- 1번째 퀘스트 완료: `daily_quest_count = 1`, streak + `last_quest_date` 업데이트
- 2번째 퀘스트 완료: `daily_quest_count = 2`, streak/date는 변경 없음

**페이월 닫기 후 재노출 금지**
- "닫기" 클릭 시: `localStorage.setItem('paywall_dismissed_date', today)`
- `QuestEntry` 진입 시: `limitReached && dismissed` → 페이월 대신 홈으로 리다이렉트
- 다음 날 자연 소멸 (`daily_quest_count` 0으로 취급)

---

### 고정 퀘스트 2 — 투자 자산의 종류 (주식·채권·ETF) ✅

**퀘스트 파일**: `src/data/quest_02.json` (12화면)

**quest_02.json 화면 구성**

| # | 화면 | 타입 | 특징 |
|---|------|------|------|
| 1 | 적금 vs ETF 10년 후? | single_choice | `noReveal`: 궁금증 유발 |
| 2 | 투자 자산 개념 도입 | explanation | Unit 1 인플레이션 복기 |
| 3 | 주식이란? | single_choice | `situation` 설명 + 주주 퀴즈 |
| 4 | 채권이란? | single_choice | `situation` 설명 + 채권자 퀴즈 |
| 5 | 주식 vs 채권 매칭 | drag_match | 카드 탭 선택 → 영역 탭 배치 |
| 6 | ETF란? | single_choice | `situation` 설명 + 코스피200 퀴즈 |
| 7 | ETF vs 펀드 | single_choice | 실시간 거래 차이 |
| 8 | 위험도 순서 | single_choice | 채권→ETF→개별주식 |
| 9 | 처음 문제 회수 | explanation | 적금 vs ETF 답 공개 |
| 10 | 뉴스 독해 (국채) | single_choice | `preamble` + 실전 뉴스 문장 |
| 11 | 증권 앱 독해 (KODEX 200) | single_choice | `situation` 앱 화면 형태 |
| 12 | 상황 판단 (C씨) | single_choice | 복합 조건 종합 |

**신규 추가된 화면 타입: `drag_match`**
- 카드 탭 → 선택(하이라이트) → 드롭 영역 탭 → 정답이면 고정(초록), 오답이면 해제(빨강)
- 전체 완료 시 해설 + [다음 →] 버튼 표시
- 화면 이동 시 상태 초기화: `key={screen.id}` prop으로 강제 리마운트

**Quest 인터페이스 신규 필드** (`src/types/index.ts`)
- `description?: string` — 홈 퀘스트 카드 서브타이틀
- `learningPoints?: string[]` — QuestEntry 진입 화면 학습 목표
- `dragItems?: DragMatchItem[]` — drag_match 전용 카드 목록
- `dropZones?: DragMatchZone[]` — drag_match 전용 드롭 영역

**변경된 파일**

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/index.ts` | `drag_match` 타입, `DragMatchItem`, `DragMatchZone` 인터페이스 추가 |
| `src/data/quest_01.json` | `description`, `learningPoints` 필드 추가 |
| `src/data/quest_02.json` | 신규 생성 (12화면) |
| `src/data/quests.ts` | quest_02 등록, `QUEST_SEQUENCE` export 추가 |
| `src/pages/quest/QuestScreen.tsx` | `DragMatchScreen` 컴포넌트 추가 |
| `src/pages/quest/QuestEntry.tsx` | `learningPoints` 동적화, drag_match 퀴즈 카운트 포함 |
| `src/pages/Home.tsx` | `QUEST_SEQUENCE` 기반 dailyCount에 따른 현재 퀘스트 동적 표시 |
| `src/pages/quest/QuestComplete.tsx` | 다음 퀘스트 예고 questId 기반 동적화 |

---

### Step 6 — 성향 진단 ✅

**Supabase 컬럼 추가 (수동 실행 완료)**
```sql
ALTER TABLE public.profiles ADD COLUMN total_quest_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN investment_purpose TEXT;
ALTER TABLE public.profiles ADD COLUMN investment_style_type TEXT;
ALTER TABLE public.profiles ADD COLUMN fund_type TEXT;
ALTER TABLE public.profiles ADD COLUMN study_time TEXT;
ALTER TABLE public.profiles ADD COLUMN interest_style TEXT;
ALTER TABLE public.profiles ADD COLUMN personality_diagnosis_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN personality_diagnosis_date TIMESTAMPTZ;
```

**변경/생성된 파일**

| 파일 | 역할 |
|------|------|
| `tailwind.config.js` | `slide-up` 키프레임 애니메이션 추가 |
| `src/types/index.ts` | `UserProfile`에 성향 진단 8개 필드 추가 |
| `src/pages/personality/PersonalityQuiz.tsx` (신규) | 5문항 진단 + 완료 화면. 선택 시 자동 전환, 좌우 슬라이드 애니메이션, 뒤로가기 지원 |
| `src/pages/quest/QuestComplete.tsx` | `total_quest_count` 증가 로직 추가. 누적 2개 도달 + 미완료 시 바텀시트 팝업 표시 |
| `src/pages/Home.tsx` | "투자 성향 진단하기" 카드 추가 (나중에 선택 후 상시 노출) |
| `src/App.tsx` | `/personality` ProtectedRoute 추가 |

**동작 흐름**
1. 퀘스트 누적 2개 완료 → QuestComplete에서 800ms 후 바텀시트 팝업 등장
2. "진행하기" → `/personality` 5문항 순차 진행 → 완료 화면 → 홈
3. "나중에" → `localStorage.personality_dismissed = 'true'` 저장 → 홈에 진단 카드 상시 노출
4. 진단 완료 시 `personality_diagnosis_completed = true` DB 저장 → 팝업·카드 모두 사라짐

**성향 진단 5문항**

| # | 필드 | 질문 | 선택지 수 |
|---|------|------|-----------|
| 1 | `investment_purpose` | 투자하는 가장 큰 이유는? | 4개 |
| 2 | `investment_style_type` | 나에게 더 가까운 쪽은? | 3개 (안정/중립/공격) |
| 3 | `fund_type` | 투자에 쓰는 돈의 성격은? | 4개 |
| 4 | `study_time` | 하루 투자 공부 시간은? | 3개 |
| 5 | `interest_style` | 관심 있는 투자 스타일은? | 4개 |

> ⚠️ **마이그레이션 이전 완료 계정 주의**: 컬럼 추가 전에 퀘스트를 완료한 계정은 `total_quest_count = 0`으로 저장됨. Supabase에서 수동으로 `UPDATE profiles SET total_quest_count = 2 WHERE email = '...';` 실행 필요.

> ℹ️ **MVP 제약**: 진단 결과는 저장만 하고 학습 경로 개인화에는 미활용. Phase 2에서 투자 목적/성향에 따른 퀘스트 순서 조정 예정.

**투자 성향 카드 — 내 투자 탭**

| 파일 | 변경 내용 |
|------|-----------|
| `src/pages/Portfolio.tsx` | 진단 완료 시 최상단에 투자 성향 요약 카드 표시 |

- `personality_diagnosis_completed === true`인 경우에만 포트폴리오 현황 블록 위에 카드 노출
- `investment_purpose` × `investment_style_type` 조합으로 12개 타이틀 중 하나 결정

**12개 타이틀 매핑**

| 투자 목적 | 안정형 | 중립형 | 공격형 |
|-----------|--------|--------|--------|
| 노후 대비 · 장기 자산 형성 | 느리지만 확실한 수호자 | 균형 잡힌 마라토너 | 미래를 사는 사냥꾼 |
| 월급 외 추가 수입 | 안전한 월급 파이프라인 | 실용적인 수입 설계자 | 공격적인 캐시 빌더 |
| 결혼 · 전세 등 목표 자금 마련 | 계획형 목표 달성자 | 전략적인 목돈 빌더 | 속도전 목표 추격자 |
| 단기 수익 추구 | 신중한 단타 탐색자 | 유연한 스윙 트레이더 | 풀스윙 트레이더 |

---

### Step 7 — 포트폴리오 + DART API ✅

**Supabase 테이블 생성 SQL** (대시보드에서 수동 실행)
```sql
CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  stock_name TEXT NOT NULL,
  stock_code TEXT NOT NULL,
  market TEXT CHECK (market IN ('KR', 'US')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own portfolio" ON portfolios
  FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON TABLE public.portfolios TO authenticated;
GRANT ALL ON TABLE public.portfolios TO service_role;
```

**생성/변경된 파일**

| 파일 | 역할 |
|------|------|
| `src/data/stocks.json` | 한국 101개 + 미국 65개 종목 검색 데이터 (`name`, `nameKo?`, `code`, `market`) |
| `src/data/dartCorpCodes.ts` | stock_code → DART corp_code 매핑 (~65개 주요 종목) |
| `src/hooks/usePortfolio.ts` | Supabase `portfolios` 테이블 CRUD 훅 (`addStocks`, `removeStock`) |
| `src/components/investment/StockSearch.tsx` | 종목 자동완성 검색 컴포넌트 (2자 이상 입력 시 동작) |
| `src/components/investment/PortfolioInput.tsx` | 종목 등록 전체 페이지 (`/portfolio/register`) |
| `src/components/investment/PortfolioList.tsx` | 등록 종목 목록 + 편집 모드(× 삭제) |
| `src/components/investment/StockNews.tsx` | 종목별 DART 공시 카드 (최근 7일, 최대 5건) |
| `src/pages/Portfolio.tsx` | 내 투자 탭 전면 재작성 |
| `src/types/index.ts` | `Stock`, `PortfolioItem`, `DartDisclosure` 타입 추가 |
| `vite.config.ts` | DART API CORS 우회용 프록시 추가 (`/dart-api` → `opendart.fss.or.kr`) |

**추가된 라우트**
```
/portfolio/register  → PortfolioInput (종목 추가 페이지)
```

**DART API 연동 구조**

- 개발: Vite 프록시 `/dart-api/*` → `https://opendart.fss.or.kr/api/*`
- API 키: `.env`의 `VITE_DART_API_KEY`
- `DART_CORP_CODES` 맵에 없는 종목은 공시 조회 불가 (빈 상태 표시)

**알려진 제약**

- 프로덕션 배포 시 DART API는 별도 서버사이드 프록시 필요 (Vite 프록시는 개발 전용)
- Edge Function(`fetch-dart-news`)은 Deno rustls ↔ 한국 정부 서버 TLS 비호환 문제로 미사용 (파일은 유지)

---

### Step 8 — 뉴스 퀘스트 파이프라인 ✅

매일 금융 뉴스를 RSS로 수집 → Claude API로 선별 및 퀘스트 생성 → Supabase DB 저장 → 탐색 탭 표시.

**Supabase 테이블 생성 SQL**
```sql
CREATE TABLE IF NOT EXISTS public.quests (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  description       TEXT DEFAULT '',
  estimated_minutes INT  DEFAULT 5,
  category          TEXT DEFAULT '뉴스',
  key_summary       TEXT[] DEFAULT '{}',
  learning_points   TEXT[] DEFAULT '{}',
  screens           JSONB NOT NULL DEFAULT '[]',
  quest_type        TEXT DEFAULT 'auto',
  news_source       JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read quests"
  ON public.quests FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON TABLE public.quests TO authenticated;
GRANT ALL ON TABLE public.quests TO service_role;
```

**Edge Function: `generate-news-quest`**
- 경로: `supabase/functions/generate-news-quest/index.ts`
- 배포: `supabase functions deploy generate-news-quest`
- 실행: Supabase 대시보드 → Functions → generate-news-quest → Test → `{}` 전송
- 환경 변수: `supabase secrets set CLAUDE_API_KEY=sk-ant-...`

**파이프라인 4단계**

| 단계 | 내용 |
|------|------|
| 1. 뉴스 수집 | RSS 피드 순서대로 시도: 파이낸셜뉴스(경제) → 파이낸셜뉴스(증권) → Google News (fallback) |
| 2. 뉴스 선별 | Claude Haiku로 10개 기사 중 학습에 적합한 1건 선택 |
| 3. 퀘스트 생성 | Claude Sonnet으로 5화면 퀘스트 JSON 생성 (newsSource.summary 포함) |
| 4. DB 저장 | `quests` 테이블 UPSERT (`id = quest_auto_YYYYMMDD`) |

> ℹ️ `CLAUDE_API_KEY` 없으면 더미 퀘스트("금리와 주가의 시소게임")로 자동 대체되어 파이프라인 전체 동작 검증 가능.

**뉴스 퀘스트 ID 규칙**: `quest_auto_YYYYMMDD` (예: `quest_auto_20260511`)

**생성/변경된 파일**

| 파일 | 역할 |
|------|------|
| `supabase/functions/generate-news-quest/index.ts` | 전체 파이프라인 Edge Function |
| `supabase/migrations/20260511_create_quests.sql` | quests 테이블 DDL |
| `src/types/index.ts` | `NewsSource` 타입 추가, `Quest`에 `questType`/`newsSource` 추가 |
| `src/data/quests.ts` | `loadAutoQuest()` 추가 — Supabase에서 비동기 로드 (세션 캐시) |
| `src/hooks/useQuestData.ts` (신규) | auto/fixed 통합 퀘스트 로딩 훅 |
| `src/hooks/useNewsQuest.ts` (신규) | 탐색 탭용 오늘의 뉴스 퀘스트 메타 fetch 훅 |
| `src/components/explore/NewsSummaryCard.tsx` (신규) | 뉴스 요약 카드 컴포넌트 |
| `src/components/explore/NewsQuestCard.tsx` (신규) | 탐색 탭 퀘스트 카드 컴포넌트 |
| `src/pages/Explore.tsx` | Coming Soon → 뉴스 요약 + 퀘스트 카드 + Coming Soon 영역 |
| `src/pages/Home.tsx` | 뉴스 퀘스트 관련 코드 제거 (홈은 고정 퀘스트만) |
| `src/pages/quest/QuestEntry.tsx` | `useQuestData` 적용, auto/fixed 한도 분리 |
| `src/pages/quest/QuestScreen.tsx` | `useQuestData` 적용 |
| `src/pages/quest/QuestComplete.tsx` | auto 퀘스트 완료 시 `localStorage.news_quest_completed_date` 저장, `daily_quest_count` 미증가, `/explore`로 이동 |

**탐색 탭 레이아웃**
1. 뉴스 요약 카드 (`NewsSummaryCard`) — 원본 뉴스 제목 + Claude 생성 3줄 요약
2. 관련 퀘스트 카드 (`NewsQuestCard`) — 완료 시 "오늘 퀘스트 완료 ✅" 표시
3. Coming Soon 영역 — 학습 경로 지도, 레벨 순위, 산업별 탐색 예고

**뉴스 퀘스트 한도 추적**
- `localStorage.news_quest_completed_date = 'YYYY-MM-DD'`
- QuestEntry 진입 시 오늘 날짜와 비교 → 완료됐으면 `/explore`로 redirect
- 다음 날 자동 무효화 (날짜 불일치)

**자동화 — cron-job.org 설정 완료**
- 매일 **00:00 UTC (= 09:00 KST)** 자동 실행
- Edge Function은 `--no-verify-jwt` 옵션으로 배포 (외부 호출 허용)
- 배포 명령: `supabase functions deploy generate-news-quest --no-verify-jwt`
- Supabase Pro 이후: pg_cron으로 이전 예정

> ⚠️ **타임존 주의**: Edge Function 내부에서 날짜를 UTC 기준으로 계산하므로, cron을 00:00 UTC에 실행해야 오늘 날짜(`quest_auto_YYYYMMDD`)가 정확히 생성됨. 22:00 UTC(오전 7시 KST)로 설정하면 전날 날짜로 생성됨.

> ℹ️ **수동 실행**: Supabase 대시보드 → Edge Functions → `generate-news-quest` → Test → `{}` 전송으로 즉시 생성 가능.

---

## 대기 중인 Step 상세

### 고정 퀘스트 3 — 시장 구조와 참여자 ✅

**퀘스트 파일**: `src/data/quest_03.json` (14화면)

**quest_03.json 화면 구성**

| # | 화면 | 타입 | 특징 |
|---|------|------|------|
| 1 | 삼성전자 3% 하락 — 누구 때문? | single_choice | `noReveal`: 정답 유보, 화면 11에서 회수 |
| 2 | 시장 참여자 3인 (개인·기관·외국인) | explanation | 정보 비대칭 개념 도입 |
| 3 | 참여자 퀴즈 | single_choice | 기관 투자자 특징 |
| 4 | 지수란 — 시장의 체온계 | explanation | 코스피·S&P500 개념 |
| 5 | 대표 지수 4개 매칭 | drag_match | 4개 dragItem × 4개 dropZone (2×2 그리드) |
| 6 | 금리와 주식의 시소 원리 | explanation | 금리↑→주가↓ 인과 흐름 |
| 7 | 금리 인상 피해 기업 퀴즈 | single_choice | `situation` 한국은행 금리 인상 |
| 8 | 성장주 vs 가치주 | explanation | 엔비디아(성장주) vs 은행주(가치주) |
| 9 | 성장주 vs 가치주 퀴즈 | single_choice | `situation` PER 불가 기업 |
| 10 | 경기순환 4계절 | explanation | 봄→여름→가을→겨울 계절별 유리 자산 |
| 11 | 화면 1 문제 회수 | explanation | 주가 하락의 복합적 원인 설명 |
| 12 | 실전 뉴스 독해 ① | single_choice | `preamble` + 코스피 순매도/코스닥 순매수 |
| 13 | 실전 뉴스 독해 ② | single_choice | 연준 금리 인하 → 나스닥 급등 |
| 14 | 실전 상황 판단 ③ | single_choice | 경기침체기 기관 매수 이유 종합 |

**신규 기능: drag_match 4-zone 그리드 지원** (`src/pages/quest/QuestScreen.tsx`)
- `zones.length > 2`이면 `flex` 대신 `grid grid-cols-2`로 렌더링
- `min-h-[100px]` (기존 130px → 2×2 레이아웃에 최적화)

**퀘스트 시퀀스 업데이트** (`src/data/quests.ts`)
```ts
export const QUEST_SEQUENCE = ['quest_01', 'quest_02', 'quest_03']
```

**일일 한도 정책**
- 무료: 2개/일 (quest_01 → quest_02 → 페이월). quest_03은 프리미엄 잠금
- 홈 화면: 한도 도달 시 quest_02(마지막 완료) 표시, quest_03 노출 안 함
- QuestComplete: quest_02 완료 후 quest_03 예고 텍스트 표시 (프리미엄 구현 시 활성화)

> ⚠️ **MVP 데모용 한도 비활성화**: 현재 `QuestEntry.tsx`의 `limitReached = false`, `QuestComplete.tsx`의 `fixedLimitReached = false`로 설정되어 일일 한도가 적용되지 않음. 정식 출시 전 `dailyCount >= 2` 조건으로 복구 필요.

---

### 버그 수정 및 로직 개선 ✅

**퀘스트 진행도 시스템 개편**

| 파일 | 변경 내용 |
|------|-----------|
| `src/pages/Home.tsx` | 현재 퀘스트를 `dailyCount` → `total_quest_count` 기반으로 변경 |
| `src/pages/quest/QuestComplete.tsx` | 뉴스 퀘스트 완료 시 `total_quest_count` 미증가 (고정 퀘스트 전용) |
| `src/pages/quest/QuestComplete.tsx` | 성향 진단 트리거: `questId === 'quest_02'` → `total_quest_count >= 2` |
| `src/pages/quest/QuestComplete.tsx` | 일일 카운트 통합: `newDailyCount = alreadyDoneToday ? count + 1 : 1` (뉴스/고정 구분 없음) |
| `src/pages/quest/QuestEntry.tsx` | 한도 체크 통합: `limitReached = dailyCount >= 2` (뉴스/고정 공통 적용) |
| `src/pages/Home.tsx` | 성향 카드 트리거: `localStorage.quest_02_completed` → `total_quest_count >= 2` |

**탐색 탭 원문 보기 링크 추가**

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/explore/NewsSummaryCard.tsx` | `url` prop 추가, `url?.startsWith('http')`일 때만 "원문 보기 →" 링크 표시 |
| `src/pages/Explore.tsx` | `newsSource.url`을 `NewsSummaryCard`에 전달 |

**RSS CDATA 파싱 버그 수정**

한국경제 RSS의 `<link>` 태그가 CDATA로 감싸져 있어 URL이 `<![CDATA[https://...]]>` 형태로 저장되던 문제 수정.

| 파일 | 변경 내용 |
|------|-----------|
| `supabase/functions/generate-news-quest/index.ts` | `linkM` 정규식에 CDATA 패턴 추가 (`title`, `description`과 동일하게 처리) |

```typescript
// 수정 전
const linkM = /<link>([\s\S]*?)<\/link>/.exec(block)

// 수정 후
const linkM =
  /<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/.exec(block) ||
  /<link>([\s\S]*?)<\/link>/.exec(block)
```

**fnnews RSS URL 404 수정 + RSS 소스 재편**

`fnnews.com/rss/fn_realtimeall.xml`이 404를 반환해 Google News fallback으로 넘어가면서 오래된 기사(4월 4일 등)가 선별되던 문제 수정.

| 파일 | 변경 내용 |
|------|-----------|
| `supabase/functions/generate-news-quest/index.ts` | RSS_SOURCES 교체 및 pubDate 파싱 강화 |

```typescript
// 수정 전
const RSS_SOURCES = [
  'https://www.fnnews.com/rss/fn_realtimeall.xml',        // 404
  'https://news.google.com/rss/search?q=주식시장+금리+경제&...',
  'https://www.hankyung.com/feed/finance',
]

// 수정 후
const RSS_SOURCES = [
  'https://www.fnnews.com/rss/r20/fn_realnews_economy.xml', // 경제 섹션
  'https://www.fnnews.com/rss/r20/fn_realnews_stock.xml',   // 증권 섹션 (fallback)
  'https://news.google.com/rss/search?q=주식시장+금리+경제&...',
]
```

- fnnews.com RSS 디렉터리 경로가 `/rss/r20/` 로 변경되어 있었음 (`https://www.fnnews.com/rss` 페이지에서 확인)
- 기사 링크가 `https://www.fnnews.com/news/YYYYMMDD...` 형식의 직접 URL (프리미엄 페이지 아님)
- `parsePubDate()` 함수 추가: pubDate 문자열 파싱 실패 시 URL 경로(`/2026/05/13/`) → 기사 ID(`AKR2026...`) 순으로 날짜 폴백 추출
- `filterByRecency()` → `sortByRecency()`로 교체: 기사를 제거하지 않고 최신순 정렬만 수행. 날짜 판단은 Claude 프롬프트에 오늘 날짜를 전달해 위임
- Claude 선별 프롬프트에 오늘 날짜(`todayStr`) 포함: 7일 이상 지난 기사 제외 지시

**일일 퀘스트 한도 비활성화 (MVP 데모)**

MVP 리뷰어가 퀘스트를 자유롭게 테스트할 수 있도록 일일 한도 비활성화.

| 파일 | 변경 내용 |
|------|-----------|
| `src/pages/quest/QuestEntry.tsx` | `limitReached = false && dailyCount >= 2` (항상 false) |
| `src/pages/quest/QuestComplete.tsx` | `fixedLimitReached = false && !isAutoQuest && newDailyCount >= 2` (항상 false) |

> 복구 시: `false &&` 접두어 제거하면 원래 2개/일 한도로 복귀.

**프로덕션 DART API 프록시 (vercel.json + API Route)**

Vite 개발 프록시는 빌드 결과물에 포함되지 않아 프로덕션에서 DART API CORS 오류 발생.
초기 `vercel.json` 외부 HTTPS rewrite → Vercel 엣지가 외부 HTTPS를 직접 처리하지 못해 502 발생.
최종적으로 Node.js 서버리스 함수(`api/dart-proxy.ts`)로 교체.

| 파일 | 변경 내용 |
|------|-----------|
| `api/dart-proxy.ts` (신규) | Node.js `fetch`로 `opendart.fss.or.kr/api/list.json` 프록시 |
| `vercel.json` | `/dart-api/list.json` → `/api/dart-proxy` 내부 rewrite + SPA catch-all 추가 |

```json
{
  "rewrites": [
    { "source": "/dart-api/list.json", "destination": "/api/dart-proxy" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

- `/dart-api/list.json?params` 요청 → `vercel.json` rewrite → `/api/dart-proxy?params` → `dart-proxy.ts`에서 쿼리 파라미터 그대로 DART API로 전달
- `/((?!api/).*)` → `/index.html`: React Router SPA 라우팅 지원 (없으면 `/portfolio` 등 직접 접근 시 404)
- DART API(`opendart.fss.or.kr`)는 해외 IP 차단 없음 — 해외 서버에서 정상 접근 가능

> ⚠️ **Vercel catch-all rewrite 주의**: `[...path].ts` 형태의 catch-all API Route는 Vercel에서 라우팅이 불안정할 수 있음. 단일 엔드포인트는 명시적 파일명(`dart-proxy.ts`)으로 처리하는 것이 안정적.

---

### Step 10 — 푸시 알림 + 최종 다듬기 ✅

**구현 범위**
- Web Push 알림 (Service Worker + VAPID + Edge Function)
- 공통 UI 상태 컴포넌트 (ErrorState, LoadingState, EmptyState)
- 모바일 반응형 최적화
- 전체 흐름 코드 레벨 버그 수정

**생성/변경된 파일**

| 파일 | 역할 |
|------|------|
| `public/sw.js` (신규) | Service Worker — push 수신 + 알림 클릭 핸들러 |
| `src/main.tsx` | Service Worker 등록 (`/sw.js`) |
| `src/hooks/usePushSubscription.ts` (신규) | `subscribePush()`, `isPushSupported()`, `isPushAlreadyGranted()` |
| `src/pages/quest/QuestComplete.tsx` | 알림 권한 요청 배너 추가 (최대 2회 노출, 이미 허용 시 숨김) |
| `supabase/migrations/20260513_create_push_subscriptions.sql` (신규) | `push_subscriptions` 테이블 DDL |
| `supabase/functions/send-push-notification/index.ts` (신규) | 오전(시장요약)/저녁(스트릭 리마인더) 푸시 발송 Edge Function |
| `src/components/common/ErrorState.tsx` (신규) | 에러 상태 공통 컴포넌트 |
| `src/components/common/LoadingState.tsx` (신규) | 로딩 상태 공통 컴포넌트 (page/card 타입) |
| `src/components/common/EmptyState.tsx` (신규) | 빈 상태 공통 컴포넌트 |
| `src/pages/Explore.tsx` | LoadingState/ErrorState 적용 |
| `src/pages/Portfolio.tsx` | LoadingState/ErrorState 적용 |
| `index.html` | viewport `maximum-scale=1.0, user-scalable=no` 추가 |
| `src/components/layout/BottomNav.tsx` | safe-area-inset-bottom 인라인 스타일 적용 |
| `src/components/layout/PageLayout.tsx` | `pb-20` → `pb-24` |

**버그 수정 (전체 흐름 검증)**

| 파일 | 수정 내용 |
|------|-----------|
| `src/pages/Auth.tsx` | 로그인 후 `setUser(profile)` 명시적 호출 — ProtectedRoute가 `user=null`로 `/auth`로 리다이렉트하던 버그 수정 |
| `src/pages/quest/QuestEntry.tsx` | `navigate()` in render → `<Navigate>` 컴포넌트로 교체 (React StrictMode 호환) |
| `public/sw.js` | `clients.openWindow(url)` 상대 경로 버그 → `self.location.origin + path` 절대 경로로 수정 |
| `src/pages/Home.tsx` | 개발 단계 placeholder 텍스트 제거 |
| `supabase/functions/send-push-notification/index.ts` | 평문 JSON 전송 → RFC 8291 AES-128-GCM 암호화 구현 (Web Crypto API) |

**push_subscriptions 테이블 생성 (Supabase 대시보드 SQL Editor에서 실행)**
```sql
-- supabase/migrations/20260513_create_push_subscriptions.sql 내용 그대로 실행
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own subscription"
  ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;
```

**VAPID 키 생성 및 설정**
```bash
# 1. VAPID 키 생성
npx web-push generate-vapid-keys

# 2. .env에 공개키 추가
VITE_VAPID_PUBLIC_KEY=<생성된 publicKey>

# 3. Supabase 시크릿에 등록
supabase secrets set VAPID_PUBLIC_KEY=<publicKey> VAPID_PRIVATE_KEY=<privateKey> VAPID_SUBJECT=mailto:admin@investquest.app

# 4. Edge Function 배포
supabase functions deploy send-push-notification --no-verify-jwt
```

**알림 발송 cron 설정 (cron-job.org) — 설정 완료**

cron-job.org에 아래 두 개의 크론잡이 등록되어 있음:

| 이름 | URL | 스케줄 | Body | Content-Type |
|------|-----|--------|------|--------------|
| InvestQuest Morning Push | `.../send-push-notification` | 매일 00:00 UTC (= 09:00 KST) | `{"type":"morning"}` | `application/json` |
| InvestQuest Evening Push | `.../send-push-notification` | 매일 11:00 UTC (= 20:00 KST) | `{"type":"evening"}` | `application/json` |

- URL 전체: `https://<project>.supabase.co/functions/v1/send-push-notification`
- Request method: `POST`

**RFC 8291 Web Push 암호화 구현**
Edge Function 내 `encryptPayload()` 함수가 다음을 수행:
1. 서버 임시 ECDH 키 쌍 생성 (P-256)
2. ECDH 공유 비밀 유도
3. HKDF로 IKM 유도: `HKDF(IKM=ecdh, salt=auth_secret, info="WebPush: info\0"||clientPub||serverPub)`
4. 임의 16바이트 salt 생성
5. CEK/NONCE 유도: `HKDF(IKM=ikm, salt=salt, info="Content-Encoding: aes128gcm\0")`
6. AES-128-GCM 암호화 (RFC 8188 단일 레코드 형식)

**단계별 구현 상태**
| 단계 | 내용 | 상태 |
|------|------|------|
| 1 | 프로젝트 초기 셋업 | ✅ |
| 2 | 퀘스트 엔진 코어 | ✅ |
| 3 | Supabase 인증 + 온보딩 DB 연동 | ✅ |
| 4 | 홈 화면 + 스트릭 로직 | ✅ |
| 5 | 일일 한도 + 유료 전환 화면 | ✅ |
| — | 고정 퀘스트 2 추가 | ✅ |
| 6 | 성향 진단 | ✅ |
| 7 | 포트폴리오 + DART API | ✅ |
| 8 | 뉴스 퀘스트 파이프라인 | ✅ |
| — | 고정 퀘스트 3 추가 | ✅ |
| 10 | 푸시 알림 + 최종 다듬기 | ✅ |

---

## 퀘스트 콘텐츠 (앱 완성)

MVP 이후 앱을 완성하기 위한 퀘스트 콘텐츠 제작 작업. 기능 개발이 아닌 학습 콘텐츠 추가.

퀘스트 파일 경로: `src/data/quest_XX.json`
시퀀스 등록: `src/data/quests.ts`의 `QUEST_SEQUENCE`

---

### 전체 학습 로드맵

| 단계 | 제목 | Unit | 퀘스트 | 상태 |
|------|------|------|--------|------|
| 1단계 | 투자 기초 개념 | Unit 1 | 인플레이션과 투자의 이유 (quest_01) | ✅ |
| 1단계 | 투자 기초 개념 | Unit 2 | 투자 자산의 종류 — 주식·채권·ETF (quest_02) | ✅ |
| 1단계 | 투자 기초 개념 | Unit 3 | 시장 구조와 참여자 (quest_03) | ✅ |
| 1단계 | 투자 기초 개념 | Unit 4 | 주가가 움직이는 이유 — 5가지 동인 (quest_04) | ✅ |
| 1단계 | 투자 기초 개념 | Unit 5 | 공시와 재무제표 입문 (quest_05) | ✅ |
| 1단계 | 투자 기초 개념 | Unit 6 | 기초 지표 개념 — PER·PBR·ROE (quest_06) | ✅ |
| 1단계 | 투자 기초 개념 | Unit 7 | 1단계 종합 실전 — 삼성전자 초보 분석 (quest_07) | ✅ |
| 2단계 | 산업과 시장 분석 | — | — | 대기 |
| 3단계 | 기업 분석 심화 | — | — | 대기 |
| 4단계 | 포트폴리오 전략 | — | — | 대기 |

---

### Unit 4 — 주가가 움직이는 이유 ✅

**퀘스트 파일**: `src/data/quest_04.json` (13화면)

**quest_04.json 화면 구성**

| # | 화면 | 타입 | 특징 |
|---|------|------|------|
| 1 | 실적 좋은데 왜 주가 하락? | single_choice | `noReveal`: 궁금증 유발, 화면 9에서 회수 |
| 2 | 5가지 동인 미리보기 | explanation | 이모지 카드 5개 세로 나열 |
| 3 | 실적 vs 기대 구분 퀴즈 | single_choice | `situation`에 개념 비교 박스 |
| 4 | 금리 동인 개념 + 퀴즈 | single_choice | `situation`에 설명 포함, 양자택일 |
| 5 | 유동성 동인 | explanation | `characterSpeech` 말풍선 사용 |
| 6 | 산업 성장성 퀴즈 | single_choice | 사양 vs 성장 산업 비교 |
| 7 | 뉴스 헤드라인 → 동인 매칭 | drag_match | `preamble` + 3항목 × 3영역 |
| 8 | 전환 — "진짜 핵심은 따로 있어" | explanation | — |
| 9 | 어닝 서프라이즈 + 화면 1 회수 | single_choice | `situation`에 개념 설명 + 용어 정의 |
| 10 | 가격 vs 가치 | explanation | — |
| 11 | 타이밍보다 방향 | single_choice | `situation`에 맥락 설명 |
| 12 | 실전 뉴스 독해 ① (금리 인상) | single_choice | `preamble` 실전 전환 알림 |
| 13 | 실전 뉴스 독해 ② (어닝 서프라이즈) | single_choice | — |

**신규 기능 (QuestScreen.tsx)**

| 추가 사항 | 설명 |
|-----------|------|
| `ExplanationScreen` → `characterSpeech` 지원 | 설명 화면에서도 캐릭터 말풍선 렌더링 가능 |
| `DragMatchScreen` → `preamble` 지원 | drag_match 화면 상단에 앰버 배너 표시 |

**퀘스트 시퀀스 업데이트** (`src/data/quests.ts`)
```ts
export const QUEST_SEQUENCE = ['quest_01', 'quest_02', 'quest_03', 'quest_04']
```

---

### Unit 5 — 공시와 재무제표 입문 ✅

**퀘스트 파일**: `src/data/quest_05.json` (13화면)

**quest_05.json 화면 구성**

| # | 화면 | 타입 | 특징 |
|---|------|------|------|
| 1 | 유튜버 vs 블로거, 누가 맞나? | single_choice | `noReveal`: 궁금증 유발 |
| 2 | DART 개념 도입 | explanation | 정보 비대칭(Unit 3) 복기 |
| 3 | 1차 자료 출처 퀴즈 (4지선다) | single_choice | 화면 1 회수 |
| 4 | 공시 유형 4가지 | explanation | 실적·유상증자·자사주 매입·M&A 이모지 카드 |
| 5 | 유상증자 퀴즈 | single_choice | `situation`에 지분 희석 개념 설명 |
| 6 | 자사주 매입 퀴즈 | single_choice | `situation`에 지분 농축 개념 설명 |
| 7 | 재무제표로 전환 | explanation | — |
| 8 | 재무제표 3표 설명 | explanation | 손익·재무상태·현금흐름 이모지 카드 |
| 9 | 질문 → 3표 매칭 | drag_match | `preamble` + 3항목 × 3영역 |
| 10 | 손익계산서 핵심 | explanation | `characterSpeech` + 계단식 텍스트 시각화 |
| 11 | 재무상태표 핵심 | explanation | `characterSpeech` + ASCII 막대 (자산=부채+자본) |
| 12 | 실전 DART ① — 손익계산서 | single_choice | **DART 모사 테이블** (삼성전자 잠정실적) |
| 13 | 실전 DART ② — 재무상태표 | single_choice | **DART 모사 테이블** (D기업 교육용) |

**신규 기능 (types/index.ts + QuestScreen.tsx)**

| 추가 사항 | 설명 |
|-----------|------|
| `DartTableRow`, `DartTableData` 타입 추가 | `src/types/index.ts` |
| `QuestScreenData.dartTable?: DartTableData` | single_choice 화면에 DART 모사 테이블 삽입 가능 |
| `DartTable` 컴포넌트 | `QuestScreen.tsx` 내 렌더링. 헤더·표·단위·외부 링크 포함 |

**DART 모사 테이블 구조**
```ts
DartTableData {
  title: string      // 공시 제목 헤더
  unit: string       // 단위 (원, 백만원 등)
  rows: { label: string; value: string }[]  // 항목명 + 숫자
  dartUrl: string    // "실제 DART에서 보기 →" 외부 링크
}
```
- 화면 12: 삼성전자 잠정실적 (매출·영업이익·순이익), DART 삼성전자 페이지 링크
- 화면 13: D기업 교육용 데이터 (총자산·총부채·자본총계), DART 메인 링크
- Phase 2: DART API 연동으로 실시간 데이터 교체 예정

**퀘스트 시퀀스 업데이트** (`src/data/quests.ts`)
```ts
export const QUEST_SEQUENCE = ['quest_01', 'quest_02', 'quest_03', 'quest_04', 'quest_05']
```

---

### Unit 6 — 기초 지표 개념 — PER·PBR·ROE ✅

**퀘스트 파일**: `src/data/quest_06.json` (13화면)

**quest_06.json 화면 구성**

| # | 화면 | 타입 | 특징 |
|---|------|------|------|
| 1 | PER 10 vs 30, 어느 쪽이 싼가? | single_choice | `noReveal`: 직관 흔들기, 화면 4에서 회수 |
| 2 | PER·PBR·ROE 3개 미리보기 | explanation | 3개 지표 이모지 카드 |
| 3 | PER 공식과 회수기간 직관 | explanation | 공식 + 예시 박스 |
| 4 | A/B 기업 PER 비교 퀴즈 | single_choice | `dartTable` (A기업 PER 10 vs B기업 PER 30), 화면 1 회수 |
| 5 | PER의 3가지 한계 | explanation | 성장성·업종·적자 기업 |
| 6 | PBR 공식과 사례 | explanation | 청산가치 개념 + 예시 |
| 7 | PBR 1 미만 퀴즈 | single_choice | `situation` 설명 |
| 8 | ROE — 빌린 돈 효율 | explanation | `characterSpeech` 빌려서 장사 비유, 공식 + 예시 |
| 9 | 3지표 → 질문 매칭 | drag_match | 3항목 × 3영역 (PER/PBR/ROE) |
| 10 | 전환 — "숫자만 보면 함정" | explanation | — |
| 11 | 밸류트랩 퀴즈 | single_choice | `dartTable` (E기업 석탄, `dartUrl: ""`→교육용 예시 안내) |
| 12 | ROE 부채 부풀림 퀴즈 | single_choice | `dartTable` (F기업, `dartUrl: ""`→교육용) |
| 13 | 달걀 격언 + 분산투자 복기 | explanation | `characterSpeech` |

**신규 기능 (QuestScreen.tsx + types/index.ts)**

| 추가 사항 | 설명 |
|-----------|------|
| `DartTableRow` 확장 | `indent?`, `bold?`, `muted?` 플래그 추가 |
| `DartTableData` 확장 | `title2?`, `blueHeader?`, `footer?` 추가 |
| `DartTable` — 가상 URL 처리 | `dartUrl`이 `http`로 시작하지 않으면 링크 대신 "📚 이 사례는 학습용 예시예요" 표시 |

**1단계 완주 처리 (QuestComplete.tsx)**
- `isStage1Complete`: `questId === 'quest_06'` && `localStorage.stage1_completed !== 'true'`
- 최초 완료 시: 🏆 아이콘, "1단계 투자 기초 개념 완주!" 인디고 배너, +200 XP 완주 보너스
- `localStorage.stage1_completed = 'true'`, `stage1_completed_at` 저장
- 다음 카드: quest_07 예고 (인디고 카드), "1단계 진도 보기 →" 버튼

**퀘스트 시퀀스 업데이트** (`src/data/quests.ts`)
```ts
export const QUEST_SEQUENCE = ['quest_01', 'quest_02', 'quest_03', 'quest_04', 'quest_05', 'quest_06']
```

---

### Unit 7 — 1단계 종합 실전 — 삼성전자 초보 분석 ✅

**퀘스트 파일**: `src/data/quest_07.json` (13화면)

Unit 1~6에서 배운 개념을 삼성전자 실제 자료(2026 1분기)에 적용하는 종합 점검 퀘스트.
증권 앱 → DART 공시 → IR 자료 → 재무제표 → 지표 순서로 회사 자료를 읽는 흐름을 익힘.

**quest_07.json 화면 구성**

| # | 화면 | 타입 | 패널/특징 |
|---|------|------|-----------|
| 1 | 1단계 마지막 퀘스트 소개 | explanation | `customPanel: company_card` (삼성전자 소개) |
| 2 | 시가총액 의미 퀴즈 | single_choice | `customPanel: naver_stock` (시가총액·상장주식수·52주 고저) |
| 3 | PER·EPS 해석 퀴즈 | single_choice | `preamble` + `customPanel: naver_stock` (주요 지표 탭, PER·EPS 하이라이트) |
| 4 | 1차 자료로 전환 | explanation | `characterSpeech` "DART가 진짜 원본" |
| 5 | 공시 유형 퀴즈 | single_choice | `customPanel: dart_disclosure` (잠정실적 공시 DART UI 모사) |
| 6 | 영업이익 개념 퀴즈 | single_choice | `customPanel: samsung_ir` (4개 사업부 IR 실적표) |
| 7 | 부채비율 계산 퀴즈 | single_choice | `dartTable` 재무상태표 (`indent/bold/footer` 사용) |
| 8 | 손익계산서 계단 순서 퀴즈 | single_choice | `customPanel: income_statement` (계단 구조 매출→영업이익→순이익) |
| 9 | 자사주 매입 공시 해석 퀴즈 | single_choice | `dartTable` 자사주 취득결과 (`blueHeader: true`, `title2`) |
| 10 | 주요 지표 5개 점검 | explanation | `dartTable` (PER·PBR·ROE·영업이익률·부채비율) + `hint` |
| 11 | 종합 판단 자세 퀴즈 | single_choice | 지표 안정적이어도 매수 판단은 2~4단계 필요 |
| 12 | 문장 속 어색한 점 찾기 | single_choice | `preamble` + `situation` (친구 발언 오류 탐지) |
| 13 | 1단계 수료 마무리 | explanation | 배운 것 vs 아직 못 하는 것 정리 |

**신규 타입 및 패널 컴포넌트 (types/index.ts + QuestScreen.tsx)**

```ts
// src/types/index.ts 신규 추가
CustomPanelData = StockPanelData | DartDisclosurePanelData | SamsungIRPanelData | IncomeStatementPanelData | CompanyCardPanelData

QuestScreenData.customPanel?: CustomPanelData  // explanation/single_choice 모두 지원
```

| 패널 타입 | `panelType` | 설명 |
|-----------|-------------|------|
| `CompanyCardPanel` | `'company_card'` | 인디고 그라디언트 회사 소개 카드 |
| `StockPanel` | `'naver_stock'` | 네이버증권 시세 UI 모사 (초록 헤더) |
| `DartDisclosurePanel` | `'dart_disclosure'` | DART 전자공시 목록+내용 UI 모사 (남색 헤더) |
| `SamsungIRPanel` | `'samsung_ir'` | 삼성 IR 사업부별 실적표 (삼성블루 헤더) |
| `IncomeStatementPanel` | `'income_statement'` | 손익계산서 계단 구조 (indent/bold/muted 행) |

**렌더링 위치 규칙**
- `ExplanationScreen`: `title` → `customPanel` → `body` → `dartTable` → `hint` 순서
- `ChoiceScreen`: `preamble` → `situation` → `customPanel` → `characterSpeech/title` → `dartTable` → `hint` → `choices` 순서
- `CustomPanelRenderer` 함수가 `panelType` discriminant로 적절한 컴포넌트 디스패치

**1단계 수료 처리 (QuestComplete.tsx)**
- `isStage1Certified`: `questId === 'quest_07'` && `localStorage.stage1_certified !== 'true'`
- 최초 완료 시: 🎓 아이콘, "1단계 수료 완료!" 옐로우 배너, +300 XP 수료 보너스
- `localStorage.stage1_certified = 'true'`, `stage1_certified_at` 저장
- 다음 카드: "2단계 — 산업과 시장 분석" 예고 (옐로우 카드), "2단계 시작하기 →" 버튼 (alert)

**퀘스트 시퀀스 업데이트** (`src/data/quests.ts`)
```ts
export const QUEST_SEQUENCE = ['quest_01', 'quest_02', 'quest_03', 'quest_04', 'quest_05', 'quest_06', 'quest_07']
```

---

## 검수용 프리뷰 페이지

메인 퀘스트 엔진(`QUEST_SEQUENCE`)과 무관하게, 강의 콘텐츠를 회장님이 로그인 없이 바로 검수할 수 있도록 만든 독립 프리뷰 라우트. `/preview/*` 경로 하위에 페이지를 추가하는 방식으로 확장.

### 73강 — 레버리지 투자에 대하여 ✅

**퀘스트 파일**: `src/data/lecture-73-quest.ts` (14화면)

**생성/변경된 파일**

| 파일 | 역할 |
|------|------|
| `src/data/lecture-73-quest.ts` (신규) | 14화면 데이터 + `QuestScreen`/`MatchingPair`/`VisualBox`/`CompletionData` 타입 정의 |
| `src/pages/preview/PreviewLecture73.tsx` (신규) | 전용 렌더러 — 메인 퀘스트 엔진(`QuestScreen.tsx`)과 독립적인 별도 컴포넌트 |
| `src/App.tsx` | `/preview/lecture-73` 라우트 추가 (`ProtectedRoute` 미적용 — 로그인 없이 접근 가능) |

**lecture-73-quest.ts 화면 구성 (14화면)**

| # | 화면 | 타입 | 특징 |
|---|------|------|------|
| 1 | 서울대 친구는 왜 과외를 할까? | binary | `correctAnswers`가 전체 선택지 → `explanation: ''`로 정답 공개 없이 바로 다음 (도입부 궁금증 유발) |
| 2 | 과외로 버는 돈 계산 | calculation | `visualBox`로 과외 조건 표시, 4지선다 |
| 3 | 가성비 개념 도입 | explanation | 투입 에너지 대비 이익 |
| 4 | 가성비 맞는 행동 고르기 | multi-select | 4개 중 해당하는 것 모두 선택 |
| 5 | 가성비 → 바이낸스로 전환 | explanation | — |
| 6 | 청산 시 손실 30%는 어디로? | multiple-choice | `visualBox`로 청산 자금 흐름 표시 |
| 7 | 바이낸스 vs 증권사 수익 구조 | matching | 좌우 탭 매칭 (2쌍) |
| 8 | 석유팀의 청산 유도 행동 | multiple-choice | `visualBox`로 청산 몰림 금액 표시 |
| 9 | 청산 유도의 근본 원인 | multiple-choice | 화면 1의 가성비 개념과 연결 |
| 10 | 청산되는 진짜 이유 (핵심 질문) | binary | 시장 vs 구조 관점 대비 |
| 11 | 두 관점의 실질적 차이 | multiple-choice | `visualBox`로 관점 비교표 |
| 12 | 장투 시 레버리지를 낮게 유지해야 하는 이유 | multiple-choice | — |
| 13 | 고레버리지 진입 타이밍 | multiple-choice | 순간 상승추세 + 초단타 원칙 |
| 14 | 복습 완료 | completion | 요약 카드 3개 + 최종 메시지 |

**PreviewLecture73.tsx 구조**
- 메인 퀘스트 엔진과 별도의 자체 `ScreenRenderer` — `binary`/`multiple-choice`/`calculation`은 `ChoiceScreen`으로, `multi-select`는 `MultiSelectScreen`, `matching`은 `MatchingScreen`, `explanation`은 `ExplanationScreen`, `completion`은 `CompletionScreen`으로 분기
- 진행 상태를 `localStorage['preview-lecture-73-progress']`에 저장 — 새로고침해도 이어보기 가능
- 상단 "처음부터" 버튼으로 언제든 리셋 가능
- 상단 배너: "🔒 회장님 검수용 프리뷰 — 이 페이지의 진행은 통계에 반영되지 않습니다" (메인 앱 통계에 영향 없음을 명시)

> ℹ️ **메인 앱과의 관계**: `QUEST_SEQUENCE`에 등록되지 않은 독립 페이지. 일반 사용자에게는 노출되지 않고, `/preview/lecture-73` URL을 직접 아는 사람만 접근 가능.

**배포**
- `feat: add lecture 73 leverage quest preview page` 커밋으로 `main`에 push → Vercel 자동 배포(GitHub 연동) → `https://miniinvestquest.vercel.app/preview/lecture-73`
- `fix: remove KakaoTalk feedback card from lecture 73 preview` 커밋에서 완료 화면(화면 14)의 "이 퀘스트에 대한 의견이나 수정 요청은 [지애 카카오톡]으로 부탁드립니다" 카드 제거

---

## 더헌터스 신입 부원 교육 러너 모드 (Feature Flag 전환) 🚧 작업 중 (미커밋)

원래 방향(매일 학습 루틴 앱)을 유지한 채, 투자 동아리 "더헌터스" 신입 부원 온보딩용으로 앱을 임시 전환. **기존 코드는 하나도 삭제하지 않고** `src/config/features.ts` 하나로 켜고 끌 수 있게 만듦 — 나중에 전부 `true`로 되돌리면 원래 앱으로 복귀.

> ⚠️ **아직 git commit/push 안 함**. 아래 변경사항은 전부 워킹 디렉터리에만 있음 (`git status`로 확인 가능). `/preview/lecture-73`은 이 작업 과정에서 전혀 건드리지 않음.

### Feature Flag 시스템

`src/config/features.ts` — 앱의 모든 기능을 이 객체 하나로 on/off. 사용법: `{FEATURES.streak && <StreakDisplay />}`.

| Flag | 값 | 의미 |
|------|-----|------|
| `streak`, `onboardingDiagnosis`, `dailyQuestLimit`, `pushNotifications`, `rankingSystem`, `newsQuestAutoGeneration`, `investmentTabFullFeatures`, `aiFloatingButton`, `ocrPortfolioInput`, `legacyQuests`, `exploreComingSoonTeasers`, `exploreTab`, `portfolioTab` | `false` | 러너 모드에서 끔 |
| `hunterCurriculumHome`, `investmentTabPlaceholder`, `completionCelebration`, `minimalSignup` | `true` | 러너 모드 전용 기능 |
| `questCompletionTracking`, `lecture73Preview` | `true` | 항상 켬 |

**적용 방식**: 대부분 `Home.tsx`/`Explore.tsx`/`PersonalityQuiz.tsx` 등 기존 파일은 **한 줄도 안 건드림** — `App.tsx`의 라우트 단에서 통째로 갈아끼우거나(`/home`, `/auth`) `FlagGate`로 감싸서 flag가 꺼지면 `/home`으로 리다이렉트하는 방식(라우트 자체가 도달 불가능해지므로 내부 컴포넌트는 손댈 필요 없음). 예외적으로 `Portfolio.tsx`(탭은 유지, 내용만 플레이스홀더로 조기 반환), `BottomNav.tsx`(탭 목록 조건부), `Explore.tsx`(Coming Soon 섹션만 조건부)만 최소한으로 직접 수정.

```tsx
// App.tsx
function FlagGate({ flag, children }) {
  if (!flag) return <Navigate to="/home" replace />
  return children
}
// /quest/:questId 는 예전 고정 퀘스트와 뉴스 퀘스트(quest_auto_*)가 경로를 공유하므로
// legacyQuests flag 대신 questId 값을 보고 판단하는 QuestRouteGate를 따로 씀
```

> ℹ️ **`/quest/lecture/:lectureId`는 `/quest/:questId`가 아님**: 새 강의 퀘스트 라우트는 기존 고정 퀘스트 3단계 엔진(`QuestEntry`→`QuestScreen`→`QuestComplete`)과 경로가 겹치지 않도록 `/quest/lecture/:lectureId`라는 별도 경로를 씀. 기존 퀘스트 엔진 파일은 전혀 수정하지 않음.

### Supabase 스키마 추가 (5개 테이블, 전부 적용 완료)

프로젝트: `fyplzsixbwoovfwhkxzr` (`min-jiae-s-projects`). 마이그레이션 파일: `supabase/migrations/20260825_create_{curriculum_settings,hunter_profiles,hunter_completions,quest_attempts,quest_answers}.sql`.

```sql
-- curriculum_settings: 회장이 조정하는 잠금해제 단계값 (1~3), 앱 전체가 이 값을 읽음
create table curriculum_settings (
  id serial primary key,
  current_stage integer not null default 1,
  updated_at timestamptz default now()
);
-- SELECT는 authenticated 전체 허용

-- hunter_profiles: id = 익명 세션의 auth.uid() (별도 FK 컬럼 아님 — RLS를 auth.uid() = id로 단순화)
create table hunter_profiles (
  id uuid primary key,
  cohort text not null, name text not null, gender text,
  created_at timestamptz default now()
);

-- hunter_completions, quest_attempts, quest_answers: 기존 CLAUDE.md 명세와 동일 구조
-- 전부 auth.uid() 기반 owner-only RLS + GRANT ALL TO authenticated/service_role (이 프로젝트 관례대로)
```

> ⚠️ **RLS 확인**: 5개 테이블 전부 `get_advisors`(security)로 검사, 누락 없음.
>
> ⚠️ **Supabase 대시보드에서 수동으로 켜야 하는 것 2개** (API로 불가능, 이 리포의 "이메일 인증 OFF" 관례와 같은 종류의 수동 설정):
> 1. Authentication → Sign In / Providers → **Allow anonymous sign-ins** ON
> 2. 같은 화면의 **Allow new users to sign up** ON (익명 로그인도 "신규 사용자 생성"이라 이게 꺼져 있으면 같이 막힘)

### 인증 모델: 익명 세션

이메일/비밀번호 없이 기수·이름·성별만 받기 위해 `supabase.auth.signInAnonymously()` 사용. `hunter_profiles.id`를 그 세션의 `auth.uid()`로 그대로 씀 (랜덤 UUID 아님) → 모든 새 테이블의 RLS를 `auth.uid() = id`(또는 `= profile_id`)로 단순하게 걸 수 있음.

> ⚠️ **기기 종속적**: 이 방식은 세션이 브라우저/기기에 묶임 — 다른 기기나 브라우저 데이터 삭제 후엔 "로그인"으로 이전 계정에 복귀할 방법이 없음(비밀번호가 없어서 본인 확인 불가). 로그인/회원가입 화면을 굳이 다르게 만들지 않기로 결정함(같은 폼 그대로 유지) — 필요해지면 PIN 등 최소 인증 수단 추가 검토.

- `src/lib/hunterProfile.ts` — `signUpHunterProfile()`, `loadHunterProfileFromSession()`, localStorage 캐시(`hunter_profile` 키)
- `src/store/useAppStore.ts` — 기존 `user`(이메일 프로필) 로직은 그대로 두고, `FEATURES.minimalSignup`일 때만 별도 분기로 `hunterProfile` 부트스트랩

### 새로 생성한 파일

| 파일 | 역할 |
|------|------|
| `src/config/features.ts` | Feature flag 중앙 관리 |
| `src/data/hunter-curriculum.ts` | 5개 강의 메타데이터 (`id`/`order`/`stage`/`title`/`estimatedMinutes`) |
| `src/data/hunter-quest-{conditional-probability,basic-1,basic-2,advanced-1,advanced-2}.ts` | 강의별 퀘스트 데이터, 타입은 `lecture-73-quest.ts`에서 그대로 import(재정의 안 함). 현재 전부 "퀘스트 준비 중" 플레이스홀더 1화면 |
| `src/data/hunter-quest-map.ts` | lectureId → `QuestScreen[]` 맵 |
| `src/lib/hunterProfile.ts` | 익명 인증 + 프로필 upsert + localStorage 캐시 |
| `src/hooks/useCurriculumStage.ts` | `curriculum_settings.current_stage` 조회 |
| `src/hooks/useLectureProgress.ts` | `quest_attempts`/`quest_answers` CRUD (완료 강의 목록, 시도 시작/답변 기록/완료 처리) |
| `src/hooks/useMarketIndices.ts` | Yahoo Finance 실시간 지수 조회 (아래 참고) |
| `src/components/quest/HunterQuestRenderer.tsx` | `PreviewLecture73.tsx`의 화면 렌더러를 **이식**(원본은 수정 안 함)한 재사용 컴포넌트 |
| `src/components/CurriculumTree.tsx` | 좌우 지그재그 강의 트리 + SVG 곡선 커넥터 (아래 참고) |
| `src/pages/HunterCurriculumHome.tsx` | 러너 모드 홈 (트리 + 오늘의 시장) |
| `src/pages/HunterSignup.tsx` | 기수/이름/성별 회원가입 폼 |
| `src/pages/quest/HunterQuestPage.tsx` | `/quest/lecture/:lectureId` — 강의 퀘스트 플레이 화면 |
| `src/pages/CurriculumComplete.tsx` | 5개 완주 축하 화면 (`canvas-confetti`) |
| `api/market-indices.ts` | Yahoo Finance 프록시 (배포용, `api/dart-proxy.ts`와 동일 패턴) |

### 변경한 기존 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/App.tsx` | `FlagGate`/`QuestRouteGate` 헬퍼 추가, `/home`·`/auth` 조건부 컴포넌트 스왑, 그 외 라우트는 flag로 감싸기. `/preview/lecture-73` 줄은 무변경 |
| `src/store/useAppStore.ts` | `hunterProfile` 상태 + `FEATURES.minimalSignup` 분기 추가 (기존 분기는 그대로) |
| `src/components/layout/BottomNav.tsx` | `exploreTab`/`portfolioTab` flag로 탭 조건부 렌더링 |
| `src/pages/Portfolio.tsx` | 상단에 플레이스홀더 조기 `return` 추가 (본문 로직은 그대로 아래에 남아있음) |
| `src/pages/Explore.tsx` | "곧 추가될 콘텐츠" 섹션을 `FEATURES.exploreComingSoonTeasers`로 감쌈 |
| `vite.config.ts`, `vercel.json`, `package.json` | Yahoo Finance 프록시 설정 + `canvas-confetti` 의존성 추가 |

### 홈 화면 구성 — 여러 차례 조정됨

회장 요청 → 지애 피드백을 거치며 최종적으로:
1. **하단 탭바 없음** — 처음엔 홈/탐색/내투자 3탭이었다가 → 탐색 유지 요청 → 결국 **탐색·내투자 탭 둘 다 제거**, 홈 하나로 통합 (`portfolioTab`/`exploreTab` flag 둘 다 `false`, `HunterCurriculumHome`은 `PageLayout showNav={false}`)
2. **뉴스 퀘스트**: 한때 홈에 넣었다가(탐색 탭 대체용) 다시 제거 결정 — 현재 홈에 없음
3. **최종 홈 구성**: 커리큘럼 트리 → "오늘의 시장" 카드 (아래)

**커리큘럼 트리 시각화**: 처음엔 `margin-left` 값(0/64px/96px/64px)만 살짝 주는 좁은 지그재그였는데 오른쪽이 너무 비어 보인다는 피드백 → **`justify-start`/`justify-end` 완전 좌우 교차**로 화면 폭을 거의 다 쓰도록 변경. 연결선도 처음엔 가운데 고정 직선이었다가 → 실제 각 노드 원형 아이콘 중심을 **`getBoundingClientRect()`로 실측**해서 그 좌표를 잇는 SVG 베지어 곡선으로 교체 (`useLayoutEffect` + `resize` 리스너로 반응형 재계산). 하드코딩된 좌표가 전혀 없어서 카드 텍스트 길이가 바뀌거나 강의 개수가 늘어도 항상 정확히 맞물림.

### 오늘의 시장 — Yahoo Finance 실시간 연동

원래 `Home.tsx`엔 코스피/코스닥/원달러 3개 더미 카드가 있었음. 요청에 따라 **다우·나스닥·S&P500·유가(WTI)·코스피·코스닥·원달러 7개**로 확장하고 실시간 연동:

- 심볼: `^DJI`, `^IXIC`, `^GSPC`, `CL=F`, `^KS11`, `^KQ11`, `KRW=X`
- **처음엔 `v7/finance/quote` 엔드포인트로 시도했으나 401(인증 필요)로 막혀있었음** — 실제 테스트로 확인. 인증 없이 열려있는 **`v8/finance/chart/{symbol}`**로 교체 (심볼 하나씩 개별 요청, 7개 병렬)
- 프록시 구조는 `api/dart-proxy.ts`와 완전히 동일한 패턴: 개발은 `vite.config.ts`의 `/yahoo-api` 프록시가 Yahoo에 직접 요청, 배포는 `vercel.json` rewrite → `api/market-indices.ts` 서버리스 함수
- 조회 실패 시 `FALLBACK_MARKET_ITEMS` 더미 값으로 자동 폴백 (카드 우상단 라벨이 "Yahoo Finance" ↔ "더미 데이터"로 바뀜)

> ⚠️ **비공식 엔드포인트**: Yahoo 공식 공개 API가 아니라서 예고 없이 막힐 수 있음. 그럴 경우 폴백 더미 값으로 자연스럽게 전환되므로 화면이 깨지진 않지만, 실시간 데이터가 안 뜨면 이 엔드포인트가 또 막혔다는 뜻.

### 알려진 이슈 / 결정 사항

- ⚠️ **React StrictMode 이중 실행 버그 수정**: `HunterQuestPage.tsx`가 개발 모드에서 `quest_attempts`를 두 번 insert하던 문제 발견 → `attemptStartedRef`로 가드 처리해서 수정 (프로덕션 빌드에선 원래 안 나타나는 문제였지만, 데이터 정합성을 위해 개발 모드에서도 고침)
- ℹ️ 강의 5개 퀘스트 콘텐츠는 전부 "퀘스트 준비 중" 플레이스홀더 — 회장님 강의 자료 받으면 `src/data/hunter-quest-*.ts` 파일만 채우면 됨
- ℹ️ `curriculum_settings.current_stage`는 테스트 후 `1`로 리셋해둠 (배포 시 초기값)
- ℹ️ git commit/push, Vercel 배포는 아직 안 함

### 회장 전용 커리큘럼 관리자 페이지 (`/admin`) — 2026-08-26 추가

`curriculum_settings.current_stage`가 테스트 후 `5`(전체 열림)로 남아있던 걸 발견 → `1`로 리셋(조건부확률만 열림). 회장이 매번 개발자에게 요청하지 않고 직접 다음 강의를 열 수 있도록 PIN 보호 관리자 페이지 추가.

**동작 방식**
- `src/pages/AdminCurriculum.tsx` — 어디에도 링크 노출 안 함, URL(`/admin`)을 아는 사람만 접근. `ProtectedRoute` 안 씀(로그인 불필요, PIN 자체가 보호 수단).
- `api/admin-set-stage.ts` (Vercel 서버리스 함수) — PIN을 서버 환경변수 `ADMIN_PIN`과 대조 후, `SUPABASE_SERVICE_ROLE_KEY`로 `curriculum_settings.current_stage`를 갱신. RLS는 `authenticated`에게 SELECT만 허용하고 UPDATE는 `service_role`만 가능하도록 의도적으로 막아뒀기 때문에, 이 서버리스 함수가 유일한 갱신 경로.
- 강의 목록에서 강의 하나를 누르면 그 강의의 `stage` 값으로 `current_stage`를 바로 설정 (그 이전 강의까지 전부 열림).

**필요한 환경변수 (Vercel 프로젝트 설정에만, 로컬 `.env`에는 넣지 않음)**
```
ADMIN_PIN=회장님께 알려줄 PIN
SUPABASE_SERVICE_ROLE_KEY=Supabase 대시보드 → Project Settings → API Keys → service_role
```
`.env.example`에 플레이스홀더 추가해둠. `VITE_` 접두어가 없으므로 클라이언트 번들에 포함되지 않고 서버리스 함수 안에서만 읽힘.

> ⚠️ **로컬 개발 서버(`npm run dev` = vite)에서는 `/api/*` 서버리스 함수가 동작하지 않음** — `dart-proxy.ts`/`market-indices.ts`와 같은 이유로 Vercel 배포 환경(프로덕션 또는 프리뷰)에서만 테스트 가능. `AdminCurriculum.tsx` UI 자체는 로컬에서도 렌더링되지만 "확인" 버튼을 누르면 404.
