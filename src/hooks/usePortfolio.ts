import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PortfolioItem } from '../types'

interface StockInput {
  name: string
  code: string
  market: 'KR' | 'US'
}

export function usePortfolio(userId: string | undefined) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPortfolio = async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setPortfolio((data ?? []).map(d => ({
        id: d.id,
        userId: d.user_id,
        stockName: d.stock_name,
        stockCode: d.stock_code,
        market: d.market as 'KR' | 'US',
        createdAt: d.created_at,
      })))
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => { fetchPortfolio() }, [userId])

  const addStocks = async (stocks: StockInput[]) => {
    if (!userId || stocks.length === 0) return null
    const existingCodes = new Set(portfolio.map(p => p.stockCode))
    const newStocks = stocks.filter(s => !existingCodes.has(s.code))
    if (newStocks.length === 0) return null

    const { error: insertError } = await supabase.from('portfolios').insert(
      newStocks.map(s => ({
        user_id: userId,
        stock_name: s.name,
        stock_code: s.code,
        market: s.market,
      }))
    )
    if (!insertError) await fetchPortfolio()
    return insertError
  }

  const removeStock = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', id)
    if (!deleteError) setPortfolio(prev => prev.filter(p => p.id !== id))
    return deleteError
  }

  return { portfolio, loading, error, addStocks, removeStock, refetch: fetchPortfolio }
}
