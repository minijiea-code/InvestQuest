import { useEffect, useState } from 'react'

export interface MarketItem {
  label: string
  value: string
  change: string
  up: boolean
}

interface YahooChartMeta {
  regularMarketPrice?: number
  previousClose?: number
  chartPreviousClose?: number
}

const SYMBOLS = ['^DJI', '^IXIC', '^GSPC', 'CL=F', '^KS11', '^KQ11', 'KRW=X']

const SYMBOL_LABELS: Record<string, string> = {
  '^DJI': '다우',
  '^IXIC': '나스닥',
  '^GSPC': 'S&P 500',
  'CL=F': '유가 (WTI)',
  '^KS11': '코스피',
  '^KQ11': '코스닥',
  'KRW=X': '원/달러',
}

function formatValue(symbol: string, price: number): string {
  if (symbol === 'CL=F') return `$${price.toFixed(2)}`
  if (symbol === 'KRW=X') return `${price.toFixed(0)}원`
  return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

async function fetchOne(symbol: string): Promise<MarketItem | null> {
  try {
    const res = await fetch(`/yahoo-api/chart/${encodeURIComponent(symbol)}`)
    if (!res.ok) return null
    const data = await res.json()
    const meta: YahooChartMeta | undefined = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null

    const prevClose = meta.previousClose ?? meta.chartPreviousClose
    const changePercent = prevClose ? ((meta.regularMarketPrice - prevClose) / prevClose) * 100 : 0

    return {
      label: SYMBOL_LABELS[symbol],
      value: formatValue(symbol, meta.regularMarketPrice),
      change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
      up: changePercent >= 0,
    }
  } catch {
    return null
  }
}

// 야후 파이낸스 비공식 v8 chart 엔드포인트 프록시 (개발: vite.config.ts, 배포: vercel.json + api/market-indices.ts 참고)
export function useMarketIndices() {
  const [items, setItems] = useState<MarketItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.all(SYMBOLS.map(fetchOne)).then((results) => {
      if (cancelled) return
      const mapped = results.filter((item): item is MarketItem => item !== null)
      setItems(mapped.length > 0 ? mapped : null)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { items, loading }
}
