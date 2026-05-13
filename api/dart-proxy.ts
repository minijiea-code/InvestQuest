/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function handler(req: any, res: any) {
  const params = new URLSearchParams(req.query as Record<string, string>)
  const dartUrl = `https://opendart.fss.or.kr/api/list.json?${params.toString()}`

  try {
    const upstream = await fetch(dartUrl, {
      headers: { 'User-Agent': 'InvestQuest/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    const data = await upstream.json()
    return res.status(200).json(data)
  } catch {
    return res.status(502).json({ error: 'DART API unavailable' })
  }
}
