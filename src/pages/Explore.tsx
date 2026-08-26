import { PageLayout } from '../components/layout/PageLayout'
import { NewsSummaryCard } from '../components/explore/NewsSummaryCard'
import { NewsQuestCard } from '../components/explore/NewsQuestCard'
import { useNewsQuest } from '../hooks/useNewsQuest'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { FEATURES } from '../config/features'

function isNewsQuestDoneToday(): boolean {
  const today = new Date().toISOString().split('T')[0]
  return localStorage.getItem('news_quest_completed_date') === today
}

export function Explore() {
  const { newsQuest, loading, error } = useNewsQuest()
  const completed = isNewsQuestDoneToday()

  return (
    <PageLayout>
      <div className="px-4 pt-6 space-y-4">

        {/* 헤더 */}
        <div className="mb-2">
          <h1 className="text-xl font-bold text-gray-900">탐색</h1>
          <p className="text-sm text-gray-500 mt-0.5">오늘의 뉴스로 경제 흐름을 익혀요</p>
        </div>

        {/* 뉴스 섹션 */}
        {loading ? (
          <LoadingState type="card" />
        ) : error ? (
          <ErrorState message="뉴스 퀘스트를 불러오지 못했어요. 잠시 후 다시 시도해주세요." />
        ) : !newsQuest ? (
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <span className="text-3xl mb-3 block">📭</span>
            <p className="text-sm font-medium text-gray-600">오늘의 뉴스 퀘스트가 준비 중이에요</p>
            <p className="text-xs text-gray-400 mt-1">매일 오전 새로운 뉴스 퀘스트가 업데이트됩니다</p>
          </div>
        ) : (
          <>
            {/* 뉴스 요약 */}
            {newsQuest.newsSource && (
              <NewsSummaryCard
                title={newsQuest.newsSource.title}
                summary={newsQuest.newsSource.summary}
                date={newsQuest.newsSource.date}
                url={newsQuest.newsSource.url}
              />
            )}

            {/* 퀘스트 카드 */}
            <NewsQuestCard quest={newsQuest} completed={completed} />
          </>
        )}

        {/* Coming Soon */}
        {FEATURES.exploreComingSoonTeasers && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              곧 추가될 콘텐츠
            </p>
            <div className="space-y-3">
              {[
                { icon: '🗺️', title: '학습 경로 지도', desc: '내 수준에 맞는 학습 순서를 제안해드려요' },
                { icon: '🏆', title: '레벨 순위', desc: '다른 학습자와 비교해보세요' },
                { icon: '📊', title: '산업별 탐색', desc: '관심 섹터의 핵심 개념을 익혀보세요' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4 opacity-50"
                >
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  )
}
