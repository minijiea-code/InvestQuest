import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AppContext, useAppState, useAppStore } from './store/useAppStore'
import { FEATURES } from './config/features'
import { Landing } from './pages/Landing'
import { Auth } from './pages/Auth'
import { Home } from './pages/Home'
import { Explore } from './pages/Explore'
import { Portfolio } from './pages/Portfolio'
import { Step1Experience } from './pages/onboarding/Step1Experience'
import { Step2Quiz } from './pages/onboarding/Step2Quiz'
import { Step3Interests } from './pages/onboarding/Step3Interests'
import { GradeResult } from './pages/onboarding/GradeResult'
import { QuestEntry } from './pages/quest/QuestEntry'
import { QuestScreen } from './pages/quest/QuestScreen'
import { QuestComplete } from './pages/quest/QuestComplete'
import { Paywall } from './pages/Paywall'
import { PersonalityQuiz } from './pages/personality/PersonalityQuiz'
import { PortfolioInput } from './components/investment/PortfolioInput'
import { PreviewLecture73 } from './pages/preview/PreviewLecture73'
import { HunterSignup } from './pages/HunterSignup'
import { HunterCurriculumHome } from './pages/HunterCurriculumHome'
import { HunterQuestPage } from './pages/quest/HunterQuestPage'
import { CurriculumComplete } from './pages/CurriculumComplete'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, hunterProfile } = useAppStore()
  const authed = FEATURES.minimalSignup ? !!hunterProfile : !!user
  if (!authed) return <Navigate to="/auth" replace />
  return <>{children}</>
}

// 러너 모드에서 비활성화된 기능의 라우트를 홈으로 되돌린다 (직접 URL 접근 차단).
// flag가 다시 true가 되면 감싸인 라우트가 그대로 다시 열린다.
function FlagGate({ flag, children }: { flag: boolean; children: React.ReactNode }) {
  if (!flag) return <Navigate to="/home" replace />
  return <>{children}</>
}

// /quest/:questId 라우트는 예전 고정 퀘스트(legacyQuests)와 뉴스 퀘스트(quest_auto_*)가
// 같은 경로를 공유한다. legacyQuests가 꺼져 있어도 뉴스 퀘스트는 홈에서 계속 접근 가능해야 하므로
// questId 값을 보고 따로 판단한다.
function QuestRouteGate({ children }: { children: React.ReactNode }) {
  const { questId } = useParams<{ questId: string }>()
  const isNewsQuest = questId?.startsWith('quest_auto_') ?? false
  if (!isNewsQuest && !FEATURES.legacyQuests) return <Navigate to="/home" replace />
  return <>{children}</>
}

export default function App() {
  const state = useAppState()

  if (state.authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">로딩 중...</div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={state}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={FEATURES.minimalSignup ? <HunterSignup /> : <Auth />} />
          <Route
            path="/onboarding/step1"
            element={<FlagGate flag={FEATURES.onboardingDiagnosis}><Step1Experience /></FlagGate>}
          />
          <Route
            path="/onboarding/step2"
            element={<FlagGate flag={FEATURES.onboardingDiagnosis}><Step2Quiz /></FlagGate>}
          />
          <Route
            path="/onboarding/step3"
            element={<FlagGate flag={FEATURES.onboardingDiagnosis}><Step3Interests /></FlagGate>}
          />
          <Route
            path="/onboarding/result"
            element={<FlagGate flag={FEATURES.onboardingDiagnosis}><GradeResult /></FlagGate>}
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                {FEATURES.hunterCurriculumHome ? <HunterCurriculumHome /> : <Home />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore"
            element={<ProtectedRoute><FlagGate flag={FEATURES.exploreTab}><Explore /></FlagGate></ProtectedRoute>}
          />
          <Route
            path="/portfolio"
            element={<ProtectedRoute><FlagGate flag={FEATURES.portfolioTab}><Portfolio /></FlagGate></ProtectedRoute>}
          />
          <Route
            path="/portfolio/register"
            element={
              <ProtectedRoute>
                <FlagGate flag={FEATURES.investmentTabFullFeatures}><PortfolioInput /></FlagGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quest/:questId"
            element={<ProtectedRoute><QuestRouteGate><QuestEntry /></QuestRouteGate></ProtectedRoute>}
          />
          <Route
            path="/quest/:questId/play"
            element={<ProtectedRoute><QuestRouteGate><QuestScreen /></QuestRouteGate></ProtectedRoute>}
          />
          <Route
            path="/quest/:questId/complete"
            element={<ProtectedRoute><QuestRouteGate><QuestComplete /></QuestRouteGate></ProtectedRoute>}
          />
          <Route path="/quest/lecture/:lectureId" element={<ProtectedRoute><HunterQuestPage /></ProtectedRoute>} />
          <Route path="/curriculum-complete" element={<ProtectedRoute><CurriculumComplete /></ProtectedRoute>} />
          <Route
            path="/paywall"
            element={<ProtectedRoute><FlagGate flag={FEATURES.dailyQuestLimit}><Paywall /></FlagGate></ProtectedRoute>}
          />
          <Route
            path="/personality"
            element={<ProtectedRoute><FlagGate flag={FEATURES.onboardingDiagnosis}><PersonalityQuiz /></FlagGate></ProtectedRoute>}
          />
          <Route path="/preview/lecture-73" element={<PreviewLecture73 />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  )
}
