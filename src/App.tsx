import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppContext, useAppState, useAppStore } from './store/useAppStore'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAppStore()
  if (!user) return <Navigate to="/auth" replace />
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
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding/step1" element={<Step1Experience />} />
          <Route path="/onboarding/step2" element={<Step2Quiz />} />
          <Route path="/onboarding/step3" element={<Step3Interests />} />
          <Route path="/onboarding/result" element={<GradeResult />} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/portfolio/register" element={<ProtectedRoute><PortfolioInput /></ProtectedRoute>} />
          <Route path="/quest/:questId" element={<ProtectedRoute><QuestEntry /></ProtectedRoute>} />
          <Route path="/quest/:questId/play" element={<ProtectedRoute><QuestScreen /></ProtectedRoute>} />
          <Route path="/quest/:questId/complete" element={<ProtectedRoute><QuestComplete /></ProtectedRoute>} />
          <Route path="/paywall" element={<ProtectedRoute><Paywall /></ProtectedRoute>} />
          <Route path="/personality" element={<ProtectedRoute><PersonalityQuiz /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  )
}
