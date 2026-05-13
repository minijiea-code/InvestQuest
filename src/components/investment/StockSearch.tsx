import { useState, useEffect, useRef } from 'react'
import stocksData from '../../data/stocks.json'
import { Stock } from '../../types'

const stocks = stocksData as Stock[]

interface Props {
  onSelect: (stock: Stock) => void
}

export function StockSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Stock[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setShowDropdown(false)
      setNoResults(false)
      return
    }
    const q = query.toLowerCase()
    const matched = stocks.filter(s => {
      if (s.market === 'KR') {
        return s.name.toLowerCase().includes(q)
      }
      return (
        s.name.toLowerCase().includes(q) ||
        (s.nameKo && s.nameKo.includes(query)) ||
        s.code.toLowerCase().includes(q)
      )
    }).slice(0, 10)

    setResults(matched)
    setNoResults(matched.length === 0)
    setShowDropdown(true)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (stock: Stock) => {
    onSelect(stock)
    setQuery('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="종목명 또는 코드 검색 (2글자 이상)"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-64 overflow-y-auto">
          {noResults ? (
            <div className="px-4 py-3 text-sm text-gray-400">검색 결과가 없습니다</div>
          ) : (
            results.map(stock => (
              <button
                key={stock.code}
                onMouseDown={() => handleSelect(stock)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {stock.market === 'KR'
                      ? stock.name
                      : `${stock.name}${stock.nameKo ? ` · ${stock.nameKo}` : ''}`}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">{stock.code}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2 ${
                  stock.market === 'KR'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-orange-50 text-orange-600'
                }`}>
                  {stock.market}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
