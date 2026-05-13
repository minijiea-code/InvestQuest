import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const DART_API_BASE = 'https://opendart.fss.or.kr/api'

// stock_code(종목코드) → corp_code(DART 고유번호) 매핑
// DART corpCode.xml 기준. 미등록 종목은 빈 결과 반환.
const CORP_CODE_MAP: Record<string, string> = {
  '005930': '00126380', // 삼성전자
  '000660': '00164779', // SK하이닉스
  '373220': '01426674', // LG에너지솔루션
  '207940': '00993207', // 삼성바이오로직스
  '005380': '00164742', // 현대차
  '000270': '00164783', // 기아
  '068270': '00413985', // 셀트리온
  '005490': '00126186', // POSCO홀딩스
  '105560': '00585547', // KB금융
  '055550': '00382199', // 신한지주
  '028260': '00126478', // 삼성물산
  '006400': '00126362', // 삼성SDI
  '051910': '00356361', // LG화학
  '015760': '00126899', // 한국전력
  '086790': '00547583', // 하나금융지주
  '066570': '00401731', // LG전자
  '035720': '01410153', // 카카오
  '035420': '00266961', // NAVER
  '000810': '00126341', // 삼성화재
  '012330': '00164867', // 현대모비스
  '247540': '01364957', // 에코프로비엠
  '086520': '00579033', // 에코프로
  '096770': '00631257', // SK이노베이션
  '010950': '00126181', // S-Oil
  '010130': '00126184', // 고려아연
  '034020': '00254617', // 두산에너빌리티
  '030200': '00210768', // KT
  '033780': '00134890', // KT&G
  '259960': '00940005', // 크래프톤
  '011200': '00159178', // HMM
  '316140': '01473427', // 우리금융지주
  '032830': '00115159', // 삼성생명
  '009150': '00126351', // 삼성전기
  '034730': '00599489', // SK
  '017670': '00188640', // SK텔레콤
  '004020': '00126204', // 현대제철
  '003670': '00126203', // 포스코퓨처엠
  '012450': '00100551', // 한화에어로스페이스
  '010140': '00126379', // 삼성중공업
  '000720': '00164797', // 현대건설
  '078930': '00254259', // GS홀딩스
  '009540': '00164938', // HD한국조선해양
  '042660': '00155276', // 한화오션
  '011170': '00118023', // 롯데케미칼
  '326030': '01404990', // SK바이오팜
  '323410': '01473896', // 카카오뱅크
  '047050': '00108582', // POSCO인터내셔널
  '011070': '00401756', // LG이노텍
  '036570': '00261788', // 엔씨소프트
  '196170': '00955024', // 알테오젠
  '028300': '00228411', // HLB
  '000100': '00109960', // 유한양행
  '128940': '00234254', // 한미약품
  '097950': '00115139', // CJ제일제당
  '090430': '00370205', // 아모레퍼시픽
  '051900': '00356360', // LG생활건강
  '041510': '00209487', // SM엔터테인먼트
  '035900': '00229790', // JYP Ent.
  '352820': '01340139', // 하이브
  '047810': '00164831', // 한국항공우주
  '064350': '00164742', // 현대로템 (임시)
  '267250': '01439486', // HD현대
  '329180': '01536533', // HD현대중공업
  '018260': '00126561', // 삼성에스디에스
  '024110': '00126788', // 기업은행
  '138040': '00589909', // 메리츠금융지주
  '005830': '00126232', // DB손해보험
  '086280': '00587073', // 현대글로비스
  '036460': '00193088', // 한국가스공사
}

const DUMMY_DISCLOSURES = [
  {
    corpName: '샘플기업',
    reportName: '분기보고서 (2026.03)',
    receiptDate: '20260508',
    reportType: '분기보고서',
    receiptNo: '20260508000001',
  },
  {
    corpName: '샘플기업',
    reportName: '주요사항보고서(유상증자결정)',
    receiptDate: '20260506',
    reportType: '주요사항보고서',
    receiptNo: '20260506000002',
  },
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { stock_code } = await req.json()
    const dartApiKey = Deno.env.get('DART_API_KEY')

    // API 키 없으면 더미 데이터 반환 (개발/테스트용)
    if (!dartApiKey) {
      return new Response(
        JSON.stringify({ disclosures: DUMMY_DISCLOSURES, isDummy: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const corpCode = CORP_CODE_MAP[stock_code]
    if (!corpCode) {
      return new Response(
        JSON.stringify({ disclosures: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const formatDate = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')

    const url = new URL(`${DART_API_BASE}/list.json`)
    url.searchParams.set('crtfc_key', dartApiKey)
    url.searchParams.set('corp_code', corpCode)
    url.searchParams.set('bgn_de', formatDate(sevenDaysAgo))
    url.searchParams.set('end_de', formatDate(today))
    url.searchParams.set('page_count', '5')

    const res = await fetch(url.toString())
    const text = await res.text()

    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      // DART API가 JSON이 아닌 응답을 반환한 경우 (키 미승인 등)
      console.error('DART API non-JSON response:', text.slice(0, 200))
      return new Response(
        JSON.stringify({ disclosures: [], debug: 'non-json response from DART' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 디버그: 전체 DART 응답 반환 (진단 후 제거 예정)
    return new Response(
      JSON.stringify({ disclosures: [], _debug: { status: data.status, message: data.message, listCount: data.list?.length ?? 0, corpCode, stock_code, bgn_de: formatDate(sevenDaysAgo), end_de: formatDate(today) } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge function error:', String(err))
    return new Response(
      JSON.stringify({ disclosures: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
