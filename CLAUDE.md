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
