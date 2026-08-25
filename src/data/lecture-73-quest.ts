export type ScreenType =
  | 'binary'
  | 'multiple-choice'
  | 'multi-select'
  | 'matching'
  | 'explanation'
  | 'calculation'
  | 'completion'

export interface Choice {
  id: string
  text: string
}

export interface MatchingPair {
  leftId: string
  leftText: string
  rightId: string
  rightText: string
}

export interface VisualBox {
  title?: string
  items: { label: string; value: string; highlight?: boolean }[]
}

export interface CompletionData {
  summaryCards: { title: string; body: string }[]
  finalMessage: string
}

export interface QuestScreen {
  id: number
  type: ScreenType
  title?: string
  situation?: string
  question?: string
  helpText?: string
  choices?: Choice[]
  correctAnswers?: string[]
  matchingPairs?: MatchingPair[]
  explanation?: string
  visualBox?: VisualBox
  completion?: CompletionData
}

export const LECTURE_73_QUEST: QuestScreen[] = [
  // ============ 화면 1 ============
  {
    id: 1,
    type: 'binary',
    situation: '서울대와 영재고를 나온 부자 친구가 있어요. 근데 이 친구가 과외를 하고 있대요.',
    question: '이 친구는 왜 과외를 할까요?',
    choices: [
      { id: 'a', text: '돈이 급하게 필요해서' },
      { id: 'b', text: '뭔가 특별한 이유가 있어서' },
    ],
    correctAnswers: ['a', 'b'],
    explanation: '',
  },

  // ============ 화면 2 ============
  {
    id: 2,
    type: 'calculation',
    situation: '친구에게 물어봤더니 특별한 과외라고 해요.',
    visualBox: {
      title: '과외 조건',
      items: [
        { label: '종류', value: '수리논술 그룹 과외' },
        { label: '인원', value: '10명 이상' },
        { label: '빈도', value: '한 달 4회' },
        { label: '수강료', value: '1명당 월 150~200만원' },
      ],
    },
    question: '이 친구가 한 달에 버는 돈은 얼마일까요?',
    choices: [
      { id: 'a', text: '약 400~600만원' },
      { id: 'b', text: '약 1,000~1,500만원' },
      { id: 'c', text: '약 1,500~2,000만원' },
      { id: 'd', text: '약 3,000만원 이상' },
    ],
    correctAnswers: ['c'],
    explanation:
      '일주일에 딱 한 번, 잠깐 일하고 월 2,000만원. 이러면 서울대 친구가 왜 하는지 이해되죠?',
  },

  // ============ 화면 3 ============
  {
    id: 3,
    type: 'explanation',
    title: '가성비',
    situation: '이 스토리에서 하나의 개념이 떠오릅니다.',
    question:
      '손 한 번 휘두르는 정도의 에너지 소모로 큰 이익을 얻는다면, 아무리 작은 시장이어도 하게 된다는 뜻입니다.\n\n서울대 친구에게 월 2,000만원은 그 자체로 큰 돈은 아닙니다. 하지만 소모하는 에너지 대비 이익이 매우 크기 때문에 하는 거예요.',
    helpText: '가성비: 투입 에너지 대비 얻는 이익의 크기',
  },

  // ============ 화면 4 ============
  {
    id: 4,
    type: 'multi-select',
    question:
      '여러분도 이런 경험이 있죠? 다음 중 "가성비 맞아서 한 행동"에 해당하는 것을 모두 골라보세요.',
    choices: [
      { id: 'a', text: '핫한 식당에서 계산할 때 앱 다운로드하면 2,000원 할인 → 몇 초 만에 다운' },
      { id: 'b', text: '시급 8,000원짜리 부업 알바 3시간' },
      { id: 'c', text: '편의점 앱 리뷰 쓰면 1,000원 쿠폰 지급 → 30초 만에 씀' },
      { id: 'd', text: '매일 3시간씩 공부해서 얻는 지식' },
    ],
    correctAnswers: ['a', 'c'],
    explanation:
      '가성비의 핵심은 이익의 크기가 아니라 에너지 대비 이익이에요. 1,000원이라도 노력이 거의 없으면 가성비, 8,000원 알바라도 3시간 노동이면 가성비 아님. 이 감각을 잘 잡아두세요.',
  },

  // ============ 화면 5 ============
  {
    id: 5,
    type: 'explanation',
    question:
      '가성비 개념은 개인만의 것이 아닙니다.\n\n시장의 큰 기업들도 정확히 같은 원리로 움직입니다.\n\n특히 오늘 이야기할 레버리지 투자에서, 코인 거래소인 바이낸스가 이 원리를 완벽하게 이용하고 있어요.',
  },

  // ============ 화면 6 ============
  {
    id: 6,
    type: 'multiple-choice',
    situation:
      "바이낸스에는 레버리지 상품이 있어요. 예를 들어 '코스피 코인'을 레버리지로 산 사람이 -60% 손실이 나면 청산됩니다.",
    visualBox: {
      title: '청산 시 돈의 흐름',
      items: [
        { label: '트레이더 손실', value: '100%' },
        { label: '그중 수수료', value: '10%' },
        { label: '그중 나머지 30%는?', value: '???', highlight: true },
      ],
    },
    question: '청산 시 트레이더 손실 중 30%는 어디로 갈까요?',
    choices: [
      { id: 'a', text: '다른 트레이더에게 분배됨' },
      { id: 'b', text: '바이낸스가 가져감' },
      { id: 'c', text: '예치금으로 저축됨' },
      { id: 'd', text: '정부 세금으로 나감' },
    ],
    correctAnswers: ['b'],
    explanation:
      '레버리지 상품은 청산될 때마다 바이낸스에게 큰 이익이 돌아옵니다. 그래서 바이낸스는 트레이더들이 레버리지를 많이 쓰고, 청산되기를 원해요.',
  },

  // ============ 화면 7 ============
  {
    id: 7,
    type: 'matching',
    situation:
      '흥미로운 건 증권사는 다르다는 점이에요.\n\n각 회사의 수익 구조를 골라 매칭해보세요.',
    matchingPairs: [
      {
        leftId: 'l1',
        leftText: '바이낸스',
        rightId: 'r1',
        rightText: '청산으로 돈을 벎 → 반드시 청산시켜야 이익',
      },
      {
        leftId: 'l2',
        leftText: '증권사',
        rightId: 'r2',
        rightText: '수수료로 돈을 벎 → 거래를 많이 할수록 이익',
      },
    ],
    explanation:
      '바이낸스는 청산을 유도하고, 증권사는 투자대회·단타 문화를 조성해서 거래량을 늘려요. 둘 다 여러분의 특정 행동을 유도하는 구조입니다. 증권사는 왜 투자대회를 자꾸 열까요? 거래 많이 하는 습관을 무의식에 심는 세뇌 과정이거든요.',
  },

  // ============ 화면 8 ============
  {
    id: 8,
    type: 'multiple-choice',
    situation:
      '바이낸스는 100% 시스템이라 청산 가격이 소수점까지 정확하게 계산됩니다. 바이낸스 본사에는 상품군별 팀이 있고, 각 가격대에 청산이 얼마 몰려있는지 실시간으로 보여요.\n\n바이낸스 석유 담당팀이 오늘 시스템을 봤어요.',
    visualBox: {
      items: [{ label: '석유 88달러에 청산 몰림', value: '1,000억', highlight: true }],
    },
    question: '바이낸스 석유팀이 어떤 행동을 할까요?',
    choices: [
      { id: 'a', text: '아무 것도 안 함' },
      { id: 'b', text: '소액으로 잠시 88달러를 터치시켜 청산 유도' },
      { id: 'c', text: '청산 금액을 트레이더들에게 미리 알림' },
      { id: 'd', text: '반대로 88달러 아래로 가격을 내림' },
    ],
    correctAnswers: ['b'],
    explanation:
      '소액으로 순간 가격을 옮기는 건 얼마든지 가능해요. 88달러를 터치만 하고 바로 원위치시키면 수수료 정도만 나가지만, 청산 이익은 훨씬 큽니다. 코스피 코인 출시했을 때 몇십조가 몰렸는데, 청산만 잘 시키면 바이낸스는 대돈을 벌어요. 바이낸스가 어떻게 그 부자가 됐는지 이제 감이 오죠?',
  },

  // ============ 화면 9 ============
  {
    id: 9,
    type: 'multiple-choice',
    question: '바이낸스가 이런 청산 유도를 계속 하는 근본 원인은 뭘까요?',
    choices: [
      { id: 'a', text: '트레이더를 싫어해서' },
      { id: 'b', text: '시스템 오류로 어쩌다' },
      { id: 'c', text: '가성비가 너무 좋아서' },
      { id: 'd', text: '규제가 없어서' },
    ],
    correctAnswers: ['c'],
    explanation:
      '기억나시나요? 화면 1의 서울대 친구. 손 한 번 휘두르는 걸로 월 2,000만원을 벌었죠.\n\n바이낸스도 완전히 똑같아요. 소액으로 순간 가격 터치만 하면 청산 이익이 훨씬 크니까, 안 할 이유가 없는 겁니다. 개인이든 시장이든 원리는 하나예요 — 가성비.',
  },

  // ============ 화면 10 ============
  {
    id: 10,
    type: 'binary',
    situation: '자, 여기서 이번 강의의 가장 중요한 질문이에요.',
    question: '레버리지 투자에서 청산되는 진짜 이유는?',
    choices: [
      { id: 'a', text: '시장이 자연스럽게 흔들리다 보니 청산됨' },
      { id: 'b', text: '누군가 청산시켜야 이익이 나기 때문에 청산됨' },
    ],
    correctAnswers: ['b'],
    explanation:
      "많은 사람이 '시장이 흔들려서 청산됐다'고 생각합니다. 하지만 정확히는, 레버리지 100을 건 사람들의 포지션이 모두 노출되어 있고, 그걸 죽이는 게 상대측(바이낸스, 세력)에게 가성비가 맞기 때문에 청산되는 거예요.\n\n결과는 같지만 원인이 달라요.",
  },

  // ============ 화면 11 ============
  {
    id: 11,
    type: 'multiple-choice',
    situation: '두 관점의 실질적 차이를 봅시다.',
    visualBox: {
      title: '두 관점 비교',
      items: [
        {
          label: '관점 1: "흔들려서 죽는다"',
          value: '실력으로 커버 가능하다고 믿음 → 계속 시도하다 계속 잃음',
        },
        {
          label: '관점 2: "죽여야 하니까 죽인다"',
          value: '구조 문제라 인식 → 애초에 안 하거나 원칙 지킴',
        },
      ],
    },
    question: '이 두 관점이 왜 그렇게 다른 결과를 낳을까요?',
    choices: [
      {
        id: 'a',
        text: '첫 번째는 실력 문제로 착각하지만, 두 번째는 구조 문제라 실력으로 해결 안 됨',
      },
      { id: 'b', text: '첫 번째가 맞고 두 번째는 틀림' },
      { id: 'c', text: '둘 다 결과가 같으니 상관없음' },
    ],
    correctAnswers: ['a'],
    explanation:
      '이게 이 강의의 핵심이에요. 청산은 실력 문제가 아니라 시장 구조 문제입니다. 상대측에게 가성비를 제공하기 때문에 반드시 일어나는 일이에요. \'나는 실력으로 이긴다\'는 생각 자체가 함정입니다.',
  },

  // ============ 화면 12 ============
  {
    id: 12,
    type: 'multiple-choice',
    situation:
      '그럼 실제로 레버리지 투자를 어떻게 해야 할까요? 두 가지 상황으로 나눠서 봅시다.\n\n레버리지 상품으로 장투나 버티기 전략을 쓰고 싶어요. 이 경우 레버리지 총합은 낮게 유지해야 합니다.',
    question: '왜 레버리지 총합을 낮게 유지해야 할까요?',
    choices: [
      { id: 'a', text: '수수료가 저렴해지기 때문' },
      { id: 'b', text: '세력이 인위적으로 청산을 유도할 이유가 사라지기 때문' },
      { id: 'c', text: '규제 대상에서 제외되기 때문' },
      { id: 'd', text: '수익률이 더 높아지기 때문' },
    ],
    correctAnswers: ['b'],
    explanation:
      '레버리지 총합이 낮으면 세력 입장에서 가성비가 안 맞아요. 화면 3에서 배운 가성비 개념, 반대로도 작동해요. 세력이 청산 유도로 벌 수 있는 이익이 작아지면 인위적으로 뭘 할 이유가 사라지고, 시장이 순리대로 흘러가게 됩니다. 회장님 경험상 특정 임계값이 있는데, 그건 강의에서 직접 들으신 대로 참고하세요.',
  },

  // ============ 화면 13 ============
  {
    id: 13,
    type: 'multiple-choice',
    situation: '반대로 고레버리지(예: 100배)를 사용해서 돈을 벌고 싶다면?',
    question: '레버리지 100 상방으로 들어가야 할 시점은 언제일까요?',
    choices: [
      { id: 'a', text: '가격 변동이 없고 평탄한 시장일 때 (안정적이어서)' },
      { id: 'b', text: '순간 상승 추세일 때, 분봉 기준 진입' },
      { id: 'c', text: '하락하는 시장에서 반등을 노림' },
      { id: 'd', text: '종목이 뉴스에 나오는 시점' },
    ],
    correctAnswers: ['b'],
    explanation:
      '평탄한 시장에서 고레버리지로 들어가면 내 포지션이 노출되어서, 죽이는 계획을 세울 수 있어요. 그냥 세력에게 내 포지션을 갖다 바치는 꼴이에요.\n\n오로지 분봉으로 순간을 벌어야 하고, 순간 상승추세일 때 상방으로 들어가서 몇 분 만에 나와야 합니다. 고액 레버리지 = 초단타만 가능해요. 소액만, 개미시체 없는 종목만.',
  },

  // ============ 화면 14 (완료) ============
  {
    id: 14,
    type: 'completion',
    title: '🎉 73강 복습 완료!',
    completion: {
      summaryCards: [
        {
          title: '① 가성비의 원리',
          body: '손 한 번의 에너지로 큰 이익 → 개인도 시장도 똑같이 움직임',
        },
        {
          title: '② 청산의 진짜 이유',
          body: '시장이 흔들려서가 아니라, 죽여야 이익이 나기 때문',
        },
        {
          title: '③ 레버리지 두 원칙',
          body: '장투·버티기 → 레버리지 총합 낮게 유지 (세력의 가성비 차단)\n고레버리지 → 순간 상승추세에서 초단타만',
        },
      ],
      finalMessage:
        '서울대 친구의 수리논술 과외와 바이낸스의 청산 사냥, 사실 완전히 같은 원리였어요.\n\n손 한 번의 에너지로 큰 이익을 얻는 가성비.\n\n우리가 레버리지에 접근할 때, 이 원리를 잊으면 안 됩니다.\n상대측에게 가성비를 주고 있진 않은가?',
    },
  },
]
