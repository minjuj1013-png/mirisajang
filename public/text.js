/* 화면에 나오는 문구를 한 곳에 모았어요. 문구를 고칠 때는 이 파일만 열면 돼요.
   (단정하는 표현을 쓰지 않았는지 검색하기 쉽게 하려는 목적이에요.)
   가격은 config.js 한 곳에서만 정해요. 여기서는 window.priceText() 로 가져다 써요. */
(function () {
  var price = window.priceText ? window.priceText() : '';

  window.TEXT = {
    brand: '미리사장',
    skip: '본문으로 건너뛰기',
    loading: '불러오는 중이에요.',
    loadFailTitle: '불러오지 못했어요',
    loadFail: '연결이 원활하지 않아요. 잠시 뒤 다시 눌러 주세요.',
    retry: '다시 불러오기',

    nav: { home: '홈', premium: '프리미엄 리포트', articles: '아티클', faq: 'FAQ', premiumShort: '프리미엄', label: '주 메뉴' },

    // 푸터
    footer: {
      about: '요식업 브랜드 본사의 공개 개설비를 내 자본과 비교해요.',
      notes: ['계약 전 본사·가맹거래사 확인용이에요.', '지역 매출·임대료와 재료비 추정에는 시험용 가정이 있어요.'],
      privacy: '주민등록번호, 계좌번호, 비밀번호는 입력하지 마세요. 입력한 값은 저장되지 않고, 사용 기록은 이름·연락처 없이 익명으로만 남겨요.'
    },

    // 막힌 곳 알리기 (푸터 안 펼침 패널)
    blocked: {
      button: '막힌 곳 알리기',
      title: '막힌 곳 알리기',
      label: '어디가 막혔나요?',
      hint: '쓰는 중 헷갈렸거나 안 눌린 곳을 적어 주세요. 개인정보는 쓰지 마세요.',
      left: function (n) { return '남은 글자 ' + n + '자'; },
      send: '보내기',
      sending: '보내는 중이에요',
      close: '닫기',
      done: '보냈어요. 알려 주셔서 고마워요. 잠시 뒤 이 창이 닫혀요.',
      fail: '보내지 못했어요. 잠시 뒤 다시 눌러 주세요.',
      empty: '내용을 적어 주세요.',
      privacy: '이름·연락처 없이 익명 기록만 남겨요. 의견 칸에 개인정보를 쓰지 말아 주세요. 전화번호나 이메일 모양은 저장하기 전에 가려져요.'
    },

    // 홈 히어로
    home: {
      heroLines: ['브랜드 공개 개설비를', '내 자본과 비교해 보세요'],
      trust: ['추정은 범위로 보여 줘요', '자료가 없으면 자료 부족이라고 해요', '계약 전 확인용이에요'],
      cardLabel: '내 상황 입력'
    },

    // 검색 카드
    s1: {
      capital: '보유 자본',
      capitalHint: '창업에 쓸 돈이에요. 대출은 넣지 않아도 돼요.',
      capitalPlaceholder: '예: 5000',
      region: '지역',
      sido: '시·도',
      sigungu: '시·군·구',
      staff: '일하는 사람 수',
      staffPlaceholder: '골라 주세요',
      submit: '결과 보기',
      submitting: '계산하는 중이에요',
      cardNote: '자본은 창업 비용 범위와 견줘 볼 때만 써요. 입력한 값은 저장되지 않아요.',
      regionNote: '본사 공개 개설비는 지역 선택과 관계없이 비교할 수 있어요.',
      pending: ' (자료 준비 중)',
      errSummary: '입력을 확인해 주세요. 빨간 표시가 된 칸을 고쳐 주세요.',
      errCapital: '보유 자본을 만 원 단위로 적어 주세요(500~100,000).',
      errRegion: '지역을 골라 주세요.',
      errStaff: '일하는 사람 수를 골라 주세요. 사장님을 포함해서 1명 이상이에요.',
      staffLabel: function (n) { return n === 1 ? '1명(사장님 혼자)' : n + '명(사장님+직원 ' + (n - 1) + '명)'; },
      allLabel: function (name) { return name + ' 전체'; }
    },

    // 결과
    r: {
      title: '내 조건으로 본 결과',
      refreshNote: '새로고침하거나 창을 닫으면 이 결과는 사라져요.',
      change: '조건 바꾸기',
      live: '추천 결과가 아래에 준비됐어요.',
      loadingLive: '결과를 계산하는 중이에요.',
      loadingTitle: '결과를 만들고 있어요',
      steps: ['조건 확인', '공개 개설비 비교', '공개 자료 확인'],
      stepsLabel: '계산 진행 단계',
      failTitle: '결과를 만들지 못했어요',
      chipCapital: function (c) { return '자본 ' + c; },
      chipStaff: function (n) { return '일하는 사람 ' + n + '명'; },
      summaryTitle: function (n) { return '내 자본으로 가능한 브랜드 ' + n + '곳'; },
      summaryLede: '공개 개설비 상한까지 충족한 브랜드를 가능으로 집계해요. 상가 임대차 비용과 추가 공사는 별도이고, 점포 면적과 부가세 기준은 브랜드마다 달라요.',
      toCards: '카드 목록으로',
      allMissingTitle: '자료가 없는 지역이에요',
      allMissing: '이 지역은 아직 자료가 없어서 숫자를 만들지 않았어요. 자료가 있는 서울·경기로 바꿔 보세요.',
      changeRegion: '지역 바꾸러 가기',
      countsLabel: '내 자본과 공개 개설비를 비교한 브랜드 수',
      countText: { ok: '내 자본으로 가능', tight: '빠듯해요', short: '자본이 모자라요', insufficient: '자료 부족' },
      filterLabel: '브랜드 거르기',
      filterAll: '전체',
      filterNone: '이 분류에는 브랜드가 없어요.',
      gridLabel: '브랜드 카드 목록',
      cardHint: '카드의 이름을 누르면 아래에서 자세히 볼 수 있어요.',
      brandNote: '브랜드·업종별 매출 차이는 반영하지 않았어요.'
    },

    // 선택한 브랜드 자세히
    d: {
      title: '자세히 보기',
      pickNone: '위 카드에서 브랜드를 골라 주세요.',
      loading: '자세한 결과를 불러오는 중이에요.',
      fail: '자세한 결과를 불러오지 못했어요. 다른 카드를 눌렀다가 다시 눌러 주세요.',
      profit: '월 순수익',
      profitNote: '세전·감가상각 전 금액이에요.',
      mixed: '월 순수익 범위가 손실에서 이익까지 걸쳐 있어요. 이익이 날지 손해가 날지 아직 말하기 어렵다는 뜻이에요.',
      capitalTitle: '필요 자본과 내 자본',
      breakTitle: '손익분기 월 매출',
      breakFail: '재료비 비율과 가맹 비용 비율을 합치면 100% 이상이라, 매출이 늘어도 비용을 넘지 못해요. 비율을 다시 확인해 주세요.',
      breakNote: '이 매출을 넘으면 이익이 나기 시작해요. 가정이 바뀌면 결과도 바뀌어요.',
      labor: '인건비',
      laborNote: function (won, year) { return '최저임금 기준 하한 월 ' + won + '원/인 (' + (year || '연도 미확인') + '년, 확인 필요)'; },
      ownerNoteDefault: '사장님 본인 몫도 최저임금 기준으로 넣었어요. 실제로 가져가는 돈과는 다를 수 있어요.',
      belowMinWage: '주 40시간 기준 최저임금 월 환산액보다 낮아요. 근무 시간을 확인해 주세요.',
      accLabel: '추정 정확도',
      accTexts: ['자료 없음', '낮아요', '시험용 값이라 참고용이에요', '높아요'],
      accLow: '이 지역은 자료가 거의 없거나 부족해요. 숫자를 넓게 봐 주세요.',
      contract: '계약 전 본사·가맹거래사 확인용이에요. 법률 자문이 아니에요.',
      includedTitle: '계산에 들어간 항목',
      included: ['월 매출', '월 임대료', '재료비', '가맹 비용(로열티 등)', '인건비(사장님 포함)'],
      excludedTitle: '넣지 않은 항목',
      excludedLede: '아래 항목은 계산에 넣지 않아서, 실제 부담은 더 클 수 있어요.',
      paidNote: '프리미엄 베타의 예시 리포트에서 임대료와 로열티를 어떻게 비교하는지 볼 수 있어요.',
      insufficientTitle: '자료가 부족해요',
      insufficientFix: function (names) {
        return '아래 칸 중 ' + names.join(', ') + ' 칸을 모두 채우면 계산해 볼 수 있어요.' + (names.length > 1 ? ' 하나만 채워서는 계산되지 않아요.' : '');
      },
      insufficientOther: function (names) {
        return names.join(', ') + ' 자료가 부족해요. 월 순수익과 손익분기점은 필요한 비용을 모두 확인한 뒤 계산할 수 있어요.';
      },
      userValuesTitle: '직접 입력한 값으로만 계산했어요',
      userValues: '자료가 없던 항목을 직접 채워서 계산했어요. 지역 정확도는 그대로 \'자료 부족\'이에요.',
      editedTitle: '수정한 값이 반영됐어요',
      editedBody: function (names) { return names.join(', ') + ' 항목을 직접 고친 값으로 다시 계산했어요.'; },
      editedBasis: '수정한 값 기준',
      sourceOpen: '이 숫자는 어디서 왔나요?',
      sourceClose: '출처 닫기',
      sourceLede: '계산에 쓴 값이 어디서 왔는지 보여 드려요. 금액은 보여 드리지 않아요.',
      sourceYear: '기준연도',
      sourceStatus: '상태',
      editTitle: '내 값으로 고쳐 볼까요?',
      editLede: '아는 값이 있으면 칸에 적어 보세요. 입력을 멈추고 잠시 뒤 위의 그래프가 바뀌어요.',
      notSaved: '고친 값은 저장되지 않아요. 새로고침하거나 창을 닫으면 사라져요.',
      defaultPlaceholder: '기본 추정값 사용 중',
      editedBadge: '수정한 값',
      revert: '되돌리기',
      revertAll: '모두 기본값으로 되돌리기',
      numOnly: '숫자만 적을 수 있어요.',
      recalcBusy: '다시 계산하는 중이에요.',
      recalcDone: '수정한 값으로 다시 계산했어요.',
      recalcFail: '다시 계산하지 못했어요. 값을 확인하고 다시 적어 주세요.',
      skippedErr: '오류가 있는 칸은 기본 추정값으로 계산했어요.',
      errRange: function (lim) { return lim + ' 사이의 숫자로 적어 주세요. 이 값은 반영되지 않았어요.'; },
      accDistrict: '구 단위 자료가 아직 없어서 시·도 값보다 한 단계 낮게 보여 드려요.',
      noNumbersTitle: '이 브랜드는 숫자를 만들지 않았어요',
      noNumbersMissing: function (names) { return '자료가 없는 항목: ' + names.join(', ') + '.'; },
      causeBrand: '이 브랜드의 비용 자료가 아직 없어요. 다른 브랜드를 골라 주세요.',
      causeRegion: '이 지역의 자료가 아직 부족해요. 자료가 있는 서울·경기로 바꾸거나, 아래 칸에 아는 값을 직접 적어 계산해 볼 수 있어요.',
      noNumbersList: '월 순수익, 필요 자본, 손익분기점은 보여 드리지 않아요.',
      laborRef: function (range, won) { return '참고용 인건비(추정): ' + range + '. 최저임금 기준 하한 월 ' + won + '원/인으로 계산했어요.'; },
      sourceGroup: function (n) { return '아래 ' + n + '개 항목은 출처와 상태가 같아요.'; },
      missingHint: '이 항목은 자료가 없어요. 직접 적으면 계산해 볼 수 있어요.',
      glossaryTitle: '용어 풀이',
      glossaryLede: '모르는 말을 누르면 바로 아래에 설명이 열려요.',
      glossaryClose: '닫기'
    },

    // 프리미엄 맛보기 (홈 결과 아래, 흐린 가상 예시)
    teaser: {
      title: '프리미엄 리포트 베타',
      lede: '가상 사례로 비용을 어떻게 나누고 비교하는지 볼 수 있어요.',
      lockTitle: '베타 예시 리포트를 열어 보세요',
      lockDesc: '비용 구조, 브랜드 비교, 투자 회수 기간을 한곳에서 볼 수 있어요.',
      button: '프리미엄 베타 보기',
      costTitle: '비용 구조(가상 예시)',
      compareTitle: '브랜드 나란히 비교(가상 예시)',
      paybackTitle: '투자 회수 기간(가상 예시)',
      paybackValue: '○○ ~ ○○ 개월',
      aiTitle: 'AI 코멘트(가상 예시)',
      aiBody: '입력한 자본과 계산 결과를 견줘서 조정해 볼 요소를 짚어 줘요. 이 문장은 모양만 보여 주는 가상 예시예요.',
      dummyItems: ['항목 가', '항목 나', '항목 다', '항목 라'],
      dummyBrands: ['가상 브랜드 가', '가상 브랜드 나', '가상 브랜드 다']
    },

    // 의견 질문
    fb: {
      eyebrow: '의견 남기기',
      title: '추정이 실제와 비슷했나요?',
      lede: '운영 중이거나 운영해 본 적이 있다면 실제 숫자와 견줘 보고 알려 주세요.',
      legend: '추정과 실제를 견주면 어땠나요?',
      options: [
        { value: 'similar', label: '비슷했어요' },
        { value: 'somewhat_different', label: '조금 달랐어요' },
        { value: 'very_different', label: '많이 달랐어요' },
        { value: 'unknown', label: '잘 모르겠어요' }
      ],
      respondent: '나는 어떤 사람인가요?',
      respondentHint: '골라도 되고 안 골라도 돼요. 응답을 나누어 보려는 용도로만 써요.',
      respondentPlaceholder: '고르지 않아도 돼요',
      respondentOptions: [
        { value: 'preparing', label: '창업 준비 중이에요' },
        { value: 'operating', label: '운영 중이거나 운영해 봤어요' },
        { value: 'none', label: '말하지 않을래요' }
      ],
      send: '답 보내기',
      need: '하나를 골라 주세요.',
      done: '답해 주셔서 고마워요. 다시 고르고 보내면 마지막 답으로 바뀌어요.',
      fail: '답을 보내지 못했어요. 잠시 뒤 다시 눌러 주세요.'
    },

    glossaryOverride: { '필수품목': '본사가 가맹점에 사 달라고 정해 둔 물품이에요.' },
    glossaryExtra: [
      { term: '세전·감가상각 전', text: '세금을 내기 전 금액이고, 인테리어·설비값이 해마다 줄어드는 몫(감가상각)도 아직 빼지 않았다는 뜻이에요.' },
      { term: '사업주 4대보험·퇴직금', text: '직원을 쓰면 사장이 따로 내는 국민연금·건강보험·고용보험·산재보험 몫과, 직원이 그만둘 때 주는 퇴직금이에요. 이 계산에는 넣지 않았어요.' },
      { term: '재료비 비율', text: '한 달 매출 중 음식 재료를 사는 데 쓰는 돈이 차지하는 비율이에요.' },
      { term: '가맹 비용 비율', text: '매출 중 본사에 내는 돈(로열티와 차액가맹금)이 차지하는 비율이에요.' },
      { term: '고정 가맹 비용', text: '매출과 상관없이 매달 본사에 내는 돈이에요. 이런 비용이 없는 브랜드도 있어요.' }
    ],

    // 프리미엄 페이지
    p: {
      eyebrow: '프리미엄 리포트',
      title: '창업 비용과 손익의 근거까지 살펴보세요.',
      badge: '공개 베타',
      lede: '프리미엄 리포트 공개 베타를 운영 중이에요. 가상 사례로 비용 구조와 브랜드 비교, 투자 회수 기간을 살펴볼 수 있어요.',
      tryReport: '베타 리포트 체험하기',
      compareLink: '무료와 비교 보기',
      previewTitle: '리포트 미리보기',
      previewTag: '가상 예시',
      previewBrand: '가상 브랜드 가',
      previewAi: '예시에서는 인건비와 재료비가 월 비용의 절반 이상이에요. 운영 시간을 정할 때 두 항목을 같이 확인해 보세요.',
      previewNote: '가상 브랜드의 예시 수치예요.',

      whatTitle: '베타에서 볼 수 있는 항목',
      items: [
        { title: '비용 항목별 내역', body: '가상 매장의 재료비·임대료·인건비를 월 비용 그래프에서 비교해요.' },
        { title: '계산 근거 해설', body: '예시 투자금과 월 순수익으로 회수 기간을 어떻게 계산했는지 확인해요.' },
        { title: '브랜드 나란히 비교', body: '세 가지 가상 브랜드의 개설비를 같은 축에서 견줘 봐요.' },
        { title: 'AI 코멘트 예시', body: '비용 항목을 어떻게 해석할 수 있는지 가상 코멘트로 살펴봐요.' }
      ],
      sampleTitle: '베타 예시 리포트',
      sampleLede: '가상 브랜드와 가정한 금액으로 프리미엄 리포트 구성을 체험할 수 있어요.',
      sampleCostTitle: '월 비용 구조',
      sampleCompareTitle: '가상 브랜드 개설비 비교',
      samplePaybackTitle: '투자 회수 기간',
      samplePaybackValue: '약 19개월',
      samplePaybackNote: '월 매출 2,650만 원에서 월 비용 2,300만 원을 빼면 350만 원이 남아요. 투자금 6,600만 원을 이 금액으로 나눴어요.',
      sampleAiTitle: 'AI 코멘트 예시',
      sampleAiBody: '가상 브랜드 가는 월 비용 중 재료비 비중이 가장 높아요. 본사에 필수 구매 품목의 단가와 발주 조건을 확인해 보세요.',

      aiTitle: 'AI 코멘트는 어떤 식으로 나오나요?',
      aiLede: '베타에서는 가상 코멘트와 분석 단계 예시를 볼 수 있어요. 자동 생성은 베타 체험 범위에 포함되지 않아요.',
      aiSteps: [
        { title: '사례의 입력값과 계산 결과를 읽어요', body: '예시 매장의 매출과 운영비를 살펴봐요.' },
        { title: '코멘트에 근거를 붙여요', body: '재료비처럼 비중이 큰 항목과 확인할 계약 조건을 짚어요.' }
      ],
      aiRule: '단정하는 말은 쓰지 않고, 새 숫자를 만들지 않아요.',
      aiProgressSteps: ['입력값 확인', '계산 결과 읽기', '근거 고르기', '코멘트 쓰기'],

      compareTitle: '무료와 프리미엄 베타 비교',
      compareLede: '무료 기능은 베타 이용 중에도 그대로 쓸 수 있어요. 예시 체험 항목은 가상 사례로 볼 수 있어요.',
      compareCaption: '무료와 프리미엄 베타 기능 비교',
      example: '예시 체험',
      rows: [
        { label: '추천 브랜드 카드', free: true, premium: true },
        { label: '월 순수익 범위', free: true, premium: true },
        { label: '손익분기점', free: true, premium: true },
        { label: '인건비(최저임금 기준 하한)', free: true, premium: true },
        { label: '구 단위 지역 선택', free: true, premium: true },
        { label: '값 직접 고쳐 보기', free: true, premium: true },
        { label: '운영비 항목별 내역', free: false, premium: 'example' },
        { label: '계산 근거 해설', free: false, premium: 'example' },
        { label: '비용 구조 그래프', free: false, premium: 'example' },
        { label: '브랜드 나란히 비교', free: false, premium: 'example' },
        { label: '투자 회수 기간', free: false, premium: 'example' },
        { label: 'AI 코멘트', free: false, premium: 'example' },
        { label: '본사 질문 체크리스트', free: false, premium: false },
        { label: 'PDF·엑셀 내보내기', free: false, premium: false }
      ],

      priceTitle: '가격',
      priceName: '프리미엄 리포트 베타',
      priceAmount: '무료 체험',
      priceNote: '별도 신청 없이 바로 볼 수 있어요.',
      priceFeatures: ['비용 구조 예시', '브랜드 비교 예시', '투자 회수 기간과 계산 근거'],
      priceNotice: '베타 예시 리포트는 무료예요. 정식 리포트 안내가는 1건당 ' + price + '이며 베타에서는 결제되지 않아요.',

      testiTitle: '베타 이용 후기',
      testiLede: '가상의 이용 상황을 바탕으로 작성한 후기예요.',
      testiBadge: '가상 후기',

      faqTitle: '프리미엄 리포트 자주 묻는 질문',
      faqMore: '질문 더 보기'
    },

    artUi: {
      title: '창업 전에 읽어 두면 좋은 글',
      lede: '시장 통계와 용어 설명을 모았어요. 글마다 출처와 상태를 함께 적었어요.',
      filterLabel: '분류 고르기',
      filters: ['전체', '시장 통계', '용어·가이드', '뉴스'],
      newsTitle: '뉴스',
      news: '창업·프랜차이즈 뉴스는 곧 연결해요. 지금은 준비 중이에요.',
      none: '이 분류에는 아직 글이 없어요.',
      list: '목록으로',
      source: '출처',
      notFound: '찾는 글이 없어요. 목록에서 다시 골라 주세요.',
      toHome: '내 자본으로 손익 추정해 보기',
      verifyNote: '이 글의 숫자는 보도자료 원문과 다시 대조하는 중이에요. 정확한 값은 공정거래위원회 보도자료에서 확인해 주세요.'
    },

    faqUi: {
      title: '자주 묻는 질문',
      lede: '궁금한 질문을 누르면 답이 열려요.',
      blockedTitle: '찾는 답이 없나요?',
      blocked: '막히거나 헷갈린 곳을 알려 주세요. 서비스를 고치는 데 써요.'
    },
    faq: [
      { q: '미리사장이 뭐예요?', a: '요식업 창업을 생각하는 사람이 보유 자본, 지역, 일하는 사람 수만 넣으면 어떤 브랜드가 내 자본으로 가능한지, 한 달에 얼마쯤 남을지를 추정 범위로 먼저 보여 주는 손익 시뮬레이터예요.' },
      { q: '자본을 넣으면 어떻게 쓰이나요?', a: '브랜드마다 창업에 드는 돈의 범위와 내 자본을 견줘서 \'내 자본으로 가능\', \'빠듯해요\', \'자본이 모자라요\'로 나눠 보여 줘요. 대출이나 운영 자금은 아직 넣지 않아요. 입력한 자본은 저장되지 않아요.' },
      { q: '브랜드 개설비는 어디서 가져오나요?', a: '브랜드 본사 개설 안내에 공개된 비용이에요. 브랜드를 선택하면 기준 면적, 부가세, 출처와 확인일을 볼 수 있어요.' },
      { q: '지역을 구까지 고를 수 있는데 숫자는 왜 같나요?', a: '구 단위 자료는 아직 연결 전이라 시·도 평균으로 계산해요. 그래서 같은 시·도 안에서 구를 바꿔도 숫자가 같을 수 있어요. 결과 화면에도 같은 안내를 적어 두었어요.' },
      { q: '공개 개설비와 실제 지출은 얼마나 다른가요?', a: '공개 개설비는 정해진 면적을 기준으로 해요. 실제 지출은 부가세, 임대차 조건, 추가 공사 등에 따라 달라지므로 계약 전에 본사 견적을 확인해 주세요.' },
      { q: '왜 숫자가 범위로 나오나요?', a: '매출, 임대료, 비용 비율 모두 정확히 하나로 말하기 어려워서예요. 낮은 쪽과 높은 쪽을 함께 보여 드려야 실제보다 좁아 보이지 않아요.' },
      { q: '범위가 손실부터 이익까지 걸쳐 있으면 어떻게 읽나요?', a: '이익이 날지 손해가 날지 아직 말하기 어렵다는 뜻이에요. 아는 값이 있다면 \'내 값으로 고쳐 볼까요?\' 칸에 적어서 범위가 어떻게 달라지는지 봐 주세요.' },
      { q: '왜 \'자료 부족\'이 나오나요?', a: '그 브랜드나 지역의 자료가 없으면 숫자를 만들지 않기 때문이에요. 0원이나 평균값으로 채우지 않아요. 가능한 항목은 직접 적어서 계산해 볼 수 있어요.' },
      { q: '프리미엄 베타는 어떻게 이용하나요?', a: '프리미엄 페이지에서 베타 리포트 체험하기를 누르면 가상 사례를 무료로 볼 수 있어요. 정식 리포트 안내가는 1건당 ' + price + '이며 베타에서는 결제되지 않아요.' },
      { q: '베타에서 AI 코멘트를 생성할 수 있나요?', a: '가상 코멘트와 분석 단계 예시를 볼 수 있어요. 개인 데이터로 코멘트를 자동 생성하는 기능은 베타 체험에 포함되지 않아요.' },
      { q: '입력한 정보는 저장되나요?', a: '입력한 자본과 고친 값, 결과는 저장하지 않아요. 새로고침하거나 창을 닫으면 사라져요. 어느 화면까지 갔는지 같은 사용 기록은 이름·연락처 없이 익명으로만 남겨요. 개인정보는 어디에도 입력하지 마세요.' },
      { q: '가맹거래사 상담을 대신하나요?', a: '아니요. 미리사장은 법률 자문이 아니에요. 계약 전에 본사와 가맹거래사에게 꼭 확인해 주세요.' },
      { q: '막힌 곳은 어떻게 알리나요?', a: '화면 맨 아래 \'막힌 곳 알리기\'를 눌러 어디가 막혔는지 적어 주세요. 개인정보는 쓰지 마세요.' }
    ],

    notFound: { title: '페이지를 찾을 수 없어요.', body: '주소가 바뀌었거나 잘못 입력됐을 수 있어요. 홈에서 다시 시작해 주세요.', home: '홈으로 가기' },

    s4: {
      eyebrow: '팀 전용',
      title: '사용 통계',
      lede: '이 화면은 같은 컴퓨터에서만 열려요. 시험을 시작하기 전에 지난 시험 기록을 비워 주세요.',
      small: '표본 수가 적으면 비율을 믿기 어려워요. 각 비율 옆에 나눈 숫자를 같이 적었어요.',
      m1Title: '지표 1 · 끝까지 입력한 사람',
      m2Title: '지표 2 · 프리미엄 리포트 사전 신청',
      m3Title: '지표 3 · 추정이 비슷했다고 답한 비율',
      newTitle: '새 흐름 지표',
      funnelTitle: '입력 단계별 기록',
      dropTitle: '중간에 멈춘 마지막 칸',
      blockedTitle: '막힌 곳 알림',
      none: '아직 기록이 없어요.',
      noRate: '계산할 수 없어요(나누는 수가 0)',
      small: '표본 수가 적으면 비율을 믿기 어려워요. 각 비율 옆에 나눈 숫자를 같이 적었어요.',
      back: '홈으로 돌아가기',
      fail: '통계를 불러오지 못했어요. 서버가 이 컴퓨터에서 켜져 있는지 확인해 주세요.'
    },
    fieldNames: { capital: '보유 자본', region: '지역', district: '시·군·구', staff: '일하는 사람 수', brand_or_level: '브랜드/로열티 수준(옛 입력)', none: '입력 전' },
    respondentNames: { preparing: '창업 준비 중', operating: '운영 중이거나 운영해 봤어요', none: '말하지 않음', unspecified: '고르지 않음' }
  };
})();
