/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function handler(req: any, res: any) {
  const symbol = (req.query.symbol as string) ?? ''
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`

  try {
    const upstream = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    })
    const data = await upstream.json()
    return res.status(200).json(data)
  } catch {
    return res.status(502).json({ error: 'Yahoo Finance API unavailable' })
  }
}
