import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsItem {
  title: string
  description: string
  link: string
  pubDate: string
}

interface SelectedNews {
  selectedIndex: number
  title: string
  reason: string
  relatedConcepts: string[]
}

const RSS_SOURCES = [
  'https://www.fnnews.com/rss/fn_realtimeall.xml',
  'https://news.google.com/rss/search?q=주식시장+금리+경제&hl=ko&gl=KR&ceid=KR:ko',
  'https://www.hankyung.com/feed/finance',
]

// ── RSS 파싱 (CDATA 지원) ──────────────────────────────────────────

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const titleM =
      /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/.exec(block) ||
      /<title>([\s\S]*?)<\/title>/.exec(block)

    const descM =
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/.exec(block) ||
      /<description>([\s\S]*?)<\/description>/.exec(block)

    const linkM =
      /<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/.exec(block) ||
      /<link>([\s\S]*?)<\/link>/.exec(block)
    const dateM = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)

    if (!titleM?.[1]) continue

    const clean = (s: string) =>
      s.replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim()

    items.push({
      title: clean(titleM[1]),
      description: clean(descM?.[1] ?? '').slice(0, 300),
      link: (linkM?.[1] ?? '').trim(),
      pubDate: (dateM?.[1] ?? '').trim(),
    })

    if (items.length >= 10) break
  }

  return items
}

async function fetchNews(): Promise<NewsItem[]> {
  for (const url of RSS_SOURCES) {
    try {
      console.log(`[RSS] Trying: ${url}`)
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 InvestQuest/1.0' },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        console.error(`[RSS] HTTP ${res.status} from ${url}`)
        continue
      }

      const xml = await res.text()
      const items = parseRSS(xml)

      if (items.length > 0) {
        console.log(`[RSS] Got ${items.length} items from ${url}`)
        return items
      }

      console.error(`[RSS] 0 items parsed from ${url}`)
    } catch (err) {
      console.error(`[RSS] Error fetching ${url}: ${String(err)}`)
    }
  }

  return []
}

// ── Claude API 공통 호출 ──────────────────────────────────────────

async function callClaude(
  prompt: string,
  apiKey: string,
  model: string,
  maxTokens: number,
): Promise<string | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[Claude] API error ${res.status}: ${err.slice(0, 300)}`)
      return null
    }

    const data = await res.json()
    return data.content?.[0]?.text ?? null
  } catch (err) {
    console.error(`[Claude] Fetch error: ${String(err)}`)
    return null
  }
}

function extractJSON(text: string): unknown {
  const match = /\{[\s\S]*\}/.exec(text)
  if (!match) throw new Error('No JSON object found in Claude response')
  return JSON.parse(match[0])
}

// ── 2단계: 뉴스 선별 ─────────────────────────────────────────────

async function selectBestNews(
  items: NewsItem[],
  apiKey: string,
): Promise<SelectedNews | null> {
  const newsList = items
    .map((item, i) => `${i + 1}. ${item.title}\n   요약: ${item.description || '(요약 없음)'}`)
    .join('\n\n')

  const prompt = `당신은 투자 학습 앱의 퀘스트 설계자입니다.
아래 금융 뉴스 목록에서 초급~중급 투자자가 투자 개념을 학습하기에 가장 좋은 뉴스 1건을 선택하세요.

선택 기준:
- 투자의 핵심 개념(금리, 실적, 밸류에이션, 산업 사이클, 인플레이션 등)과 연결 가능한 뉴스
- 퀴즈로 만들 수 있는 구체적 숫자나 팩트가 포함된 뉴스
- 특정 종목 추천이 아닌, 원리를 학습할 수 있는 뉴스

뉴스 목록:
${newsList}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "selectedIndex": 번호(1부터 시작),
  "title": "선택한 기사 제목",
  "reason": "선택 이유 한 줄",
  "relatedConcepts": ["투자 개념1", "투자 개념2"]
}`

  const text = await callClaude(prompt, apiKey, 'claude-haiku-4-5-20251001', 500)
  if (!text) return null

  try {
    return extractJSON(text) as SelectedNews
  } catch (err) {
    console.error(`[Select] JSON parse error: ${String(err)}`)
    return null
  }
}

// ── 3단계: 퀘스트 생성 ───────────────────────────────────────────

async function generateQuest(
  selected: SelectedNews,
  item: NewsItem,
  apiKey: string,
  today: string,
): Promise<Record<string, unknown> | null> {
  const prompt = `당신은 투자 학습 앱의 퀘스트 설계자입니다.
아래 뉴스를 바탕으로 초급~중급 투자자를 위한 5화면 퀘스트를 만드세요.

뉴스 제목: ${item.title}
뉴스 원문 요약: ${item.description}
뉴스 URL: ${item.link}
연결할 투자 개념: ${selected.relatedConcepts.join(', ')}

설계 원칙:
1화면: 뉴스 상황 제시 + 직관 질문 (type: single_choice, 선택지 2개, noReveal: true)
2화면: 관련 투자 개념 설명 (type: explanation)
3화면: 개념 적용 퀴즈 (type: single_choice, 선택지 3개)
4화면: 심화/실전 적용 (type: single_choice, 선택지 3개)
5화면: 핵심 정리 (type: explanation)

반드시 아래 JSON만 응답하세요. 다른 텍스트 금지:
{
  "id": "quest_auto_${today}",
  "title": "퀘스트 제목(20자 이내)",
  "description": "퀘스트 설명(30자 이내)",
  "estimatedMinutes": 5,
  "category": "뉴스",
  "keySummary": ["핵심정리1", "핵심정리2", "핵심정리3"],
  "learningPoints": ["학습목표1", "학습목표2"],
  "newsSource": {
    "title": "사용된 뉴스 제목",
    "url": "${item.link}",
    "date": "${new Date().toISOString().slice(0, 10)}",
    "summary": "이 뉴스의 핵심 내용을 초급 투자자가 이해할 수 있는 쉬운 말로 3줄 이내로 요약"
  },
  "screens": [
    {
      "id": "s1",
      "type": "single_choice",
      "situation": "뉴스 상황 설명(2~3문장)",
      "title": "직관 질문",
      "choices": [{"id":"a","text":"선택지1","isCorrect":false},{"id":"b","text":"선택지2","isCorrect":true}],
      "noReveal": true,
      "explanation": "해설"
    },
    {
      "id": "s2",
      "type": "explanation",
      "title": "개념 제목",
      "body": "개념 설명(3~4문장)"
    },
    {
      "id": "s3",
      "type": "single_choice",
      "title": "적용 질문",
      "choices": [{"id":"a","text":"선택지1","isCorrect":false},{"id":"b","text":"선택지2","isCorrect":true},{"id":"c","text":"선택지3","isCorrect":false}],
      "explanation": "해설"
    },
    {
      "id": "s4",
      "type": "single_choice",
      "situation": "심화 상황",
      "title": "심화 질문",
      "choices": [{"id":"a","text":"선택지1","isCorrect":false},{"id":"b","text":"선택지2","isCorrect":false},{"id":"c","text":"선택지3","isCorrect":true}],
      "explanation": "해설"
    },
    {
      "id": "s5",
      "type": "explanation",
      "title": "오늘의 핵심 정리",
      "body": "요약(3~4문장)"
    }
  ]
}`

  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await callClaude(prompt, apiKey, 'claude-sonnet-4-6', 3000)
    if (!text) {
      console.error(`[Generate] Claude returned null on attempt ${attempt}`)
      continue
    }

    try {
      return extractJSON(text) as Record<string, unknown>
    } catch (err) {
      console.error(`[Generate] JSON parse error on attempt ${attempt}: ${String(err)}`)
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000))
    }
  }

  return null
}

// ── 더미 퀘스트 (API 키 없을 때) ─────────────────────────────────

function getDummyQuest(today: string) {
  return {
    id: `quest_auto_${today}`,
    title: '금리와 주가의 시소게임',
    description: '금리가 오르면 주가는 왜 떨어질까?',
    estimatedMinutes: 5,
    category: '뉴스',
    keySummary: [
      '금리 인상 → 기업 이자 부담 증가 → 주가 하락 압력',
      '금리 인상 시 채권 수익률도 상승해 주식의 상대적 매력 감소',
      '부채가 많은 성장주가 금리 인상에 가장 취약',
    ],
    learningPoints: ['금리와 주가의 역의 상관관계 이해', '금리 변화가 투자 판단에 미치는 영향'],
    newsSource: {
      title: '미국 연준, 기준금리 0.25%p 인상 결정',
      url: '',
      date: today.slice(0, 4) + '-' + today.slice(4, 6) + '-' + today.slice(6, 8),
      summary: '미국 연방준비제도(Fed)가 기준금리를 0.25%p 인상했습니다. 이로써 기준금리는 연 5.25~5.50% 수준에 도달했으며, 시장은 향후 추가 인상 여부에 주목하고 있습니다.',
    },
    screens: [
      {
        id: 's1',
        type: 'single_choice',
        situation:
          '미국 연준(Fed)이 기준금리를 0.25%p 인상했다는 뉴스가 발표됐습니다. 시장에서는 추가 인상 가능성도 거론되고 있습니다.',
        title: '이 뉴스가 주식 시장에 미칠 영향은?',
        choices: [
          { id: 'a', text: '주가 상승 📈', isCorrect: false },
          { id: 'b', text: '주가 하락 📉', isCorrect: true },
        ],
        noReveal: true,
        explanation:
          '금리가 오르면 기업의 대출 이자 부담이 커지고, 채권 수익률이 상승해 주식 시장에서 자금이 빠져나갑니다.',
      },
      {
        id: 's2',
        type: 'explanation',
        title: '금리와 주가는 시소 관계',
        body: '금리가 오르면 기업은 더 높은 이자를 내야 해서 이익이 줄어듭니다. 동시에 "안전한 채권"의 수익률도 올라가, 위험한 주식에 투자할 이유가 줄어들죠. 그래서 금리 인상 → 주가 하락, 금리 인하 → 주가 상승 흐름이 나타나는 경우가 많습니다.',
      },
      {
        id: 's3',
        type: 'single_choice',
        title: '금리 인상으로 가장 큰 타격을 받는 기업 유형은?',
        choices: [
          { id: 'a', text: '현금 보유가 많은 무차입 기업', isCorrect: false },
          { id: 'b', text: '대출을 많이 받은 성장 기업', isCorrect: true },
          { id: 'c', text: '배당을 꾸준히 지급하는 가치주', isCorrect: false },
        ],
        explanation:
          '부채가 많은 성장 기업은 금리 인상 시 이자 비용이 급등합니다. 반면 무차입 기업이나 안정적인 현금흐름을 가진 기업은 상대적으로 영향이 적습니다.',
      },
      {
        id: 's4',
        type: 'single_choice',
        situation: '금리가 연 1%에서 4%로 급등했습니다. A씨는 1,000만원을 어디에 투자할지 고민 중입니다.',
        title: '금리 인상 환경에서 상대적으로 유리한 투자처는?',
        choices: [
          { id: 'a', text: '고성장 기술 스타트업 주식', isCorrect: false },
          { id: 'b', text: '국채(채권)', isCorrect: true },
          { id: 'c', text: '부동산 리츠(REITs)', isCorrect: false },
        ],
        explanation:
          '금리 인상기에는 채권 수익률도 함께 오릅니다. 4% 수준의 안정적 이자 수익을 원한다면 국채가 좋은 대안입니다. 리츠는 부채 비중이 높아 금리 인상에 취약하고, 성장주는 미래 이익의 현재가치가 낮아집니다.',
      },
      {
        id: 's5',
        type: 'explanation',
        title: '오늘의 핵심 정리',
        body: '금리↑ → 기업 이자 부담↑ + 채권 매력↑ → 주식 자금 이탈 → 주가↓. 이것이 "금리와 주가의 시소 관계"입니다. 특히 부채가 많은 성장주가 취약하고, 금리 인상기에는 채권이나 무차입 가치주가 상대적으로 안전합니다. 연준의 금리 결정은 전체 시장 방향을 결정짓는 핵심 변수입니다.',
      },
    ],
  }
}

// ── 메인 핸들러 ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const claudeKey = Deno.env.get('CLAUDE_API_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseKey)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const questId = `quest_auto_${today}`

    // ── Step 1: 뉴스 수집 ──────────────────────────────────────
    console.log('[Step 1] Fetching RSS news...')
    const newsItems = await fetchNews()

    // ── Step 2/3: 선별 + 생성 (또는 더미) ─────────────────────
    let questData: Record<string, unknown>

    if (!claudeKey) {
      console.log('[Info] No CLAUDE_API_KEY — using dummy quest')
      questData = getDummyQuest(today)
    } else if (newsItems.length === 0) {
      console.error('[Step 1] No news items fetched from any source')
      return respond({ error: 'no_news', questId: null })
    } else {
      console.log(`[Step 2] Selecting best news from ${newsItems.length} items...`)
      const selected = await selectBestNews(newsItems, claudeKey)
      if (!selected) return respond({ error: 'selection_failed', questId: null })

      const selectedItem = newsItems[selected.selectedIndex - 1] ?? newsItems[0]
      console.log(`[Step 3] Generating quest for: "${selectedItem.title}"`)

      const generated = await generateQuest(selected, selectedItem, claudeKey, today)
      if (!generated) return respond({ error: 'generation_failed', questId: null })

      questData = generated
    }

    // ── Step 4: DB 저장 ────────────────────────────────────────
    console.log('[Step 4] Saving quest to quests table...')
    // Claude가 생성한 newsSource를 우선 사용, 없으면 RSS 첫 기사로 폴백
    const newsSource = (questData.newsSource as Record<string, string> | undefined) ??
      (newsItems.length > 0
        ? {
            title: newsItems[0].title,
            url: newsItems[0].link,
            date: new Date().toISOString().slice(0, 10),
            summary: '',
          }
        : null)

    const row = {
      id: questId,
      title: String(questData.title ?? ''),
      description: String(questData.description ?? ''),
      estimated_minutes: Number(questData.estimatedMinutes ?? 5),
      category: String(questData.category ?? '뉴스'),
      key_summary: (questData.keySummary as string[]) ?? [],
      learning_points: (questData.learningPoints as string[]) ?? [],
      screens: questData.screens,
      quest_type: 'auto',
      news_source: newsSource,
    }

    const { error: dbError } = await supabase
      .from('quests')
      .upsert(row, { onConflict: 'id' })

    if (dbError) {
      console.error('[Step 4] DB error:', dbError.message)
      return respond({ error: 'db_failed', details: dbError.message, questId: null }, 500)
    }

    console.log(`[Done] Quest saved: ${questId}`)
    return respond({ success: true, questId, title: questData.title })
  } catch (err) {
    console.error('[Fatal]', String(err))
    return respond({ error: String(err), questId: null }, 500)
  }
})
