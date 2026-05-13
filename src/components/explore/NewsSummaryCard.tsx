interface Props {
  title: string
  summary: string
  date: string
  url?: string
}

export function NewsSummaryCard({ title, summary, date, url }: Props) {
  const displayDate = date.replace(/-/g, '.')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📰</span>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">오늘의 뉴스</p>
        <span className="ml-auto text-xs text-gray-400">{displayDate}</span>
      </div>
      <p className="text-xs font-medium text-gray-500 mb-2 line-clamp-1">{title}</p>
      <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
      {url?.startsWith('http') && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-xs font-medium text-primary hover:underline"
        >
          원문 보기 →
        </a>
      )}
    </div>
  )
}
