import { useState, useEffect } from 'react'
import { DartDisclosure } from '../../types'
import { Card } from '../ui/Card'
import { DART_CORP_CODES } from '../../data/dartCorpCodes'

const DART_API_KEY = import.meta.env.VITE_DART_API_KEY

interface Props {
  stockCode: string
  stockName: string
  market: 'KR' | 'US'
  nameKo?: string
}

function formatDate(d: string) {
  if (!d || d.length !== 8) return d
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`
}

function toApiDate(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function MarketBadge({ market }: { market: 'KR' | 'US' }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
      market === 'KR' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
    }`}>
      {market}
    </span>
  )
}

async function fetchDartDisclosures(stockCode: string): Promise<DartDisclosure[]> {
  const corpCode = DART_CORP_CODES[stockCode]
  if (!corpCode || !DART_API_KEY) return []

  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const params = new URLSearchParams({
    crtfc_key: DART_API_KEY,
    corp_code: corpCode,
    bgn_de: toApiDate(sevenDaysAgo),
    end_de: toApiDate(today),
    page_count: '5',
  })

  const res = await fetch(`/dart-api/list.json?${params}`)
  const data = await res.json()

  if (data.status !== '000') return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.list ?? []).map((item: any) => ({
    corpName: item.corp_name,
    reportName: item.report_nm,
    receiptDate: item.rcept_dt,
    reportType: item.pblntf_detail_ty,
    receiptNo: item.rcept_no,
  }))
}

export function StockNews({ stockCode, stockName, market, nameKo }: Props) {
  const [disclosures, setDisclosures] = useState<DartDisclosure[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    if (market !== 'KR') { setLoading(false); return }

    fetchDartDisclosures(stockCode)
      .then(setDisclosures)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [stockCode, market])

  if (market === 'US') {
    return (
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">{stockName}</span>
            {nameKo && <span className="text-sm text-gray-400">· {nameKo}</span>}
          </div>
          <MarketBadge market="US" />
        </div>
        <p className="text-sm text-gray-400 mt-2">📋 해외 종목 공시 트래킹은 곧 추가됩니다</p>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card padding="md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">{stockName}</span>
          <MarketBadge market="KR" />
        </div>
        <div className="text-sm text-gray-300 animate-pulse">공시 불러오는 중...</div>
      </Card>
    )
  }

  if (fetchError) {
    return (
      <Card padding="md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">{stockName}</span>
          <MarketBadge market="KR" />
        </div>
        <p className="text-sm text-gray-400">공시 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>
      </Card>
    )
  }

  if (disclosures.length === 0) {
    return (
      <Card padding="md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">{stockName}</span>
          <MarketBadge market="KR" />
        </div>
        <p className="text-sm text-gray-400">최근 7일간 공시가 없습니다</p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {disclosures.map((d, i) => (
        <Card key={i} padding="md">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">{stockName}</span>
                <MarketBadge market="KR" />
              </div>
              <p className="text-sm text-gray-700 leading-snug">{d.reportName}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(d.receiptDate)}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
