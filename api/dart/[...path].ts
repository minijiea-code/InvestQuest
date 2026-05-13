/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function handler(req: any, res: any) {
  const segments: string[] = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean)

  const dartPath = segments.join('/')

  const { path: _path, ...forwardQuery } = req.query
  const params = new URLSearchParams(forwardQuery)

  const dartUrl = `https://opendart.fss.or.kr/api/${dartPath}?${params.toString()}`

  try {
    const upstream = await fetch(dartUrl, {
      headers: { 'User-Agent': 'InvestQuest/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    const text = await upstream.text()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.statusCode = upstream.status
    res.end(text)
  } catch {
    res.statusCode = 502
    res.end(JSON.stringify({ error: 'DART API unavailable' }))
  }
}
