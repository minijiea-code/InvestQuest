import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PortfolioList } from '../components/investment/PortfolioList'
import { StockNews } from '../components/investment/StockNews'
import { usePortfolio } from '../hooks/usePortfolio'
import { useAppStore } from '../store/useAppStore'
import stocksData from '../data/stocks.json'
import { Stock } from '../types'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'

const STOCKS_MAP = new Map<string, Stock>((stocksData as Stock[]).map(s => [s.code, s]))

const PERSONALITY_TITLE: Record<string, Record<string, { title: string; sub: string }>> = {
  '노후 대비 · 장기 자산 형성': {
    '안정형': { title: '느리지만 확실한 수호자', sub: '장기 자산 형성 · 안정형' },
    '중립형': { title: '균형 잡힌 마라토너', sub: '장기 자산 형성 · 중립형' },
    '공격형': { title: '미래를 사는 사냥꾼', sub: '장기 자산 형성 · 공격형' },
  },
  '월급 외 추가 수입': {
    '안정형': { title: '안전한 월급 파이프라인', sub: '추가 수입 · 안정형' },
    '중립형': { title: '실용적인 수입 설계자', sub: '추가 수입 · 중립형' },
    '공격형': { title: '공격적인 캐시 빌더', sub: '추가 수입 · 공격형' },
  },
  '결혼 · 전세 등 목표 자금 마련': {
    '안정형': { title: '계획형 목표 달성자', sub: '목표 자금 마련 · 안정형' },
    '중립형': { title: '전략적인 목돈 빌더', sub: '목표 자금 마련 · 중립형' },
    '공격형': { title: '속도전 목표 추격자', sub: '목표 자금 마련 · 공격형' },
  },
  '단기 수익 추구': {
    '안정형': { title: '신중한 단타 탐색자', sub: '단기 수익 · 안정형' },
    '중립형': { title: '유연한 스윙 트레이더', sub: '단기 수익 · 중립형' },
    '공격형': { title: '풀스윙 트레이더', sub: '단기 수익 · 공격형' },
  },
}

function getPersonalityLabel(purpose?: string, styleType?: string) {
  if (!purpose || !styleType) return null
  return PERSONALITY_TITLE[purpose]?.[styleType] ?? null
}

export function Portfolio() {
  const { user } = useAppStore()
  const { portfolio, loading, error, removeStock } = usePortfolio(user?.id)
  const navigate = useNavigate()
  const [editMode, setEditMode] = useState(false)

  const personality = user?.personality_diagnosis_completed
    ? getPersonalityLabel(user.investment_purpose, user.investment_style_type)
    : null

  // KR 종목 먼저, US 종목 나중에 정렬
  const sortedPortfolio = [
    ...portfolio.filter(p => p.market === 'KR'),
    ...portfolio.filter(p => p.market === 'US'),
  ]

  return (
    <PageLayout>
      <div className="px-4 pt-6 space-y-4 pb-8">
        <h1 className="text-xl font-bold text-gray-900">내 투자</h1>

        {/* 영역 1: 투자 성향 카드 */}
        {personality && (
          <Card padding="lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-xl">🎯</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{personality.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{personality.sub}</p>
              </div>
            </div>
          </Card>
        )}

        {/* 영역 2: 포트폴리오 현황 */}
        {loading ? (
          <LoadingState type="card" />
        ) : error ? (
          <ErrorState message="포트폴리오를 불러오지 못했어요. 잠시 후 다시 시도해주세요." />
        ) : portfolio.length === 0 ? (
          /* 미등록 상태 */
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="text-5xl mb-4 block">📋</span>
              <h3 className="font-semibold text-gray-900 mb-2">포트폴리오를 등록하면 맞춤 학습이 시작돼요</h3>
              <p className="text-sm text-gray-400 mb-6">
                보유 종목을 등록하면 공시 알림과<br />학습 퀘스트를 맞춤 제공해드려요
              </p>
              <Button onClick={() => navigate('/portfolio/register')}>
                등록하기
              </Button>
            </div>
          </Card>
        ) : (
          /* 등록된 상태 */
          <PortfolioList
            portfolio={sortedPortfolio}
            editMode={editMode}
            onToggleEdit={() => setEditMode(prev => !prev)}
            onRemove={removeStock}
          />
        )}

        {/* 영역 3: 종목 이슈 트래킹 */}
        {!loading && portfolio.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">종목 이슈 트래킹</h2>
            <p className="text-xs text-gray-400 -mt-1">최근 7일 공시 기준</p>
            {sortedPortfolio.map(item => {
              const stockInfo = STOCKS_MAP.get(item.stockCode)
              return (
                <StockNews
                  key={item.id}
                  stockCode={item.stockCode}
                  stockName={item.stockName}
                  market={item.market}
                  nameKo={stockInfo?.nameKo}
                />
              )
            })}
          </div>
        )}

        {/* 영역 4: Coming Soon */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-300">더 많은 분석 기능이 곧 추가됩니다</p>
        </div>
      </div>
    </PageLayout>
  )
}
