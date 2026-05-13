interface Props {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = '데이터를 불러오지 못했어요. 인터넷 연결을 확인해주세요.', onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <span className="text-4xl mb-3">😵</span>
      <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}
