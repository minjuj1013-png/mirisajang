/* 프리미엄 리포트 화면(#/premium). 블러는 쓰지 않아요(블러는 홈 결과 맛보기에만 있어요).
   문구는 text.js, 가격은 config.js, 후기는 testimonials.js 에 있어요. */
(function () {
  var React = window.React;
  var C = window.MiriSajang;
  var T = window.TEXT;
  var API = window.MSApi;
  var U = window.MSUI;
  var h = React.createElement;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var P = T.p;

  function PremiumHero(props) {
    return h('section', { className: 'ms-hero prem-hero' },
      h('div', { className: 'ms-hero__in prem-hero__grid' },
        h('div', { className: 'prem-hero__text' },
          h('p', { className: 'label prem-eyebrow' }, P.eyebrow, ' ', h(C.Badge, { tone: 'neutral', size: 'md' }, P.badge)),
          h('h1', { className: 'display-lg' }, P.title),
          h('p', { className: 'body-lg ink-muted', style: { margin: 0 } }, P.lede),
          h('div', { className: 'row' },
            h(C.Button, { size: 'lg', onClick: props.onTry }, P.tryReport),
            h(C.Button, { variant: 'link', onClick: props.onCompare }, P.compareLink))),
        h(C.Card, { className: 'prem-preview' },
          h('div', { className: 'prem-preview__head' },
            h('span', { className: 'label' }, P.previewTitle),
            h(C.Badge, { tone: 'warning', size: 'md' }, P.previewTag)),
          h('div', { className: 'prem-preview__brand' },
            h(C.ShapeLogo, { shape: 'hexagon', tone: 'accent', initial: '가' }),
            h('span', { className: 'title' }, P.previewBrand)),
          h(C.Ledger, { title: '가상 매장 월 손익', estimate: false, rows: [
            { label: '월 매출', value: 2650 },
            { label: '월 비용', value: 2300 },
            { label: '월 순수익', value: 350 }
          ] }),
          h(C.AICommentCard, { status: 'sample', title: 'AI 코멘트' }, h('p', null, P.previewAi)),
          h('p', { className: 'caption ink-muted', style: { margin: 0 } }, P.previewNote))));
  }

  function WhatSection() {
    return h('section', { className: 'section' },
      h('div', { className: 'ms-container' },
        h('h2', { className: 'heading-1' }, P.whatTitle),
        h('div', { className: 'what-grid' }, P.items.map(function (it, i) {
          return h(C.Card, { key: i },
            h('h3', { className: 'heading-3', style: { margin: '0 0 8px' } }, it.title),
            h('p', { className: 'body-sm ink-muted', style: { margin: 0 } }, it.body));
        }))));
  }

  function SampleReport() {
    var costs = [
      { label: '재료비', value: 920 }, { label: '인건비', value: 520 },
      { label: '임대료', value: 290 }, { label: '가맹 비용', value: 160 },
      { label: '기타 운영비', value: 410 }
    ];
    var comparisons = [
      { label: '가상 브랜드 가', value: 6600 },
      { label: '가상 브랜드 나', value: 7200 },
      { label: '가상 브랜드 다', value: 8400 }
    ];
    return h('section', { className: 'section section--soft', id: 'beta-report', tabIndex: -1, 'aria-labelledby': 'beta-report-title' },
      h('div', { className: 'ms-container' },
        h('div', { className: 'sample-head' },
          h('h2', { className: 'heading-1', id: 'beta-report-title' }, P.sampleTitle),
          h(C.Badge, { tone: 'warning', size: 'md' }, '가상 예시')),
        h('p', { className: 'body ink-muted', style: { margin: '8px 0 16px' } }, P.sampleLede),
        h('div', { className: 'sample-grid' },
          h(C.Card, null, h(C.StackedBar, { title: P.sampleCostTitle, items: costs, estimate: false })),
          h(C.Card, null, h(C.BarCompare, { title: P.sampleCompareTitle, items: comparisons, max: 9000 })),
          h(C.Card, null,
            h('p', { className: 'label', style: { margin: 0 } }, P.samplePaybackTitle, ' ', h(C.Badge, { tone: 'warning' }, '가상 예시')),
            h('p', { className: 'number-xl', style: { margin: '8px 0' } }, P.samplePaybackValue),
            h('p', { className: 'body-sm ink-muted', style: { margin: 0 } }, P.samplePaybackNote)),
          h(C.AICommentCard, { status: 'sample', title: P.sampleAiTitle }, h('p', null, P.sampleAiBody)))));
  }

  function AiSection() {
    return h('section', { className: 'section' },
      h('div', { className: 'ms-container' },
        h('h2', { className: 'heading-1' }, P.aiTitle),
        h('p', { className: 'body ink-muted', style: { margin: '8px 0 24px' } }, P.aiLede),
        h('div', { className: 'ai-grid' },
          h('ol', { className: 'ai-steps' }, P.aiSteps.map(function (s, i) {
            return h('li', { key: i, className: 'ai-steps__item' },
              h('span', { className: 'ai-steps__n', 'aria-hidden': 'true' }, i + 1),
              h('div', null, h('h3', { className: 'title', style: { margin: 0 } }, s.title), h('p', { className: 'body-sm ink-muted', style: { margin: '4px 0 0' } }, s.body)));
          })),
          h('div', { className: 'stack' },
            h(C.AIProgress, { status: 'sample', steps: P.aiProgressSteps, stepMs: 1100 }),
            h(C.Notice, { tone: 'ai', status: 'sample', title: '코멘트 원칙' }, P.aiRule)))));
  }

  function CompareSection(props) {
    var ref = useRef(null);
    useEffect(function () {
      var el = ref.current; var fired = false;
      function fire() { if (fired) return; fired = true; API.event('premium_compare_viewed', { from: props.from }); }
      if (!el) return undefined;
      if (typeof IntersectionObserver === 'undefined') { fire(); return undefined; }
      var io = new IntersectionObserver(function (en) { if (en[0] && en[0].isIntersecting) { fire(); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(el);
      return function () { io.disconnect(); };
    }, []);
    function cellOf(v) {
      return v === 'example' ? h(C.Badge, { tone: 'neutral' }, P.example) : v;
    }
    var rows = P.rows.map(function (r) { return { label: r.label, free: cellOf(r.free), premium: cellOf(r.premium) }; });
    return h('section', { className: 'section section--soft', id: 'compare' },
      h('div', { className: 'ms-container', ref: ref },
        h('h2', { className: 'heading-1' }, P.compareTitle),
        h('p', { className: 'body ink-muted', style: { margin: '8px 0 24px' } }, P.compareLede),
        h(C.CompareTable, { caption: P.compareCaption, columns: { free: '무료', premium: '프리미엄 베타' }, rows: rows })));
  }

  function PriceSection(props) {
    return h('section', { className: 'section' },
      h('div', { className: 'ms-container price-wrap' },
        h('div', null,
          h('h2', { className: 'heading-1' }, P.priceTitle),
          h(C.Notice, { tone: 'info' }, P.priceNotice)),
        h(C.PriceCard, {
          name: P.priceName, price: P.priceAmount, priceNote: P.priceNote, features: P.priceFeatures, highlight: true,
          badge: h(C.Badge, { tone: 'neutral' }, P.badge),
          action: h(C.Button, { onClick: props.onTry }, P.tryReport)
        })));
  }

  function TestimonialSection() {
    var list = window.TESTIMONIALS || [];
    return h('section', { className: 'section section--soft' },
      h('div', { className: 'ms-container' },
        h('h2', { className: 'heading-1' }, P.testiTitle),
        h('p', { className: 'body-lg testi-lede' }, P.testiLede),
        h('div', { className: 'testi-grid' }, list.map(function (t, i) {
          return h(C.TestimonialCard, { key: i, kind: t.kind, sampleLabel: P.testiBadge, quote: t.quote, name: t.name, role: t.role, shape: t.shape, tone: t.tone });
        }))));
  }

  function FaqPreview() {
    var items = T.faq.filter(function (it) { return /프리미엄|AI|결제|입력한 정보|가맹거래사/.test(it.q); }).slice(0, 4);
    return h('section', { className: 'section section--soft' },
      h('div', { className: 'ms-container faq-wrap' },
        h('h2', { className: 'heading-1' }, P.faqTitle),
        h(C.Accordion, { items: items.map(function (it) { return { q: it.q, a: h('p', { style: { margin: 0 } }, it.a) }; }) }),
        h('div', null, h(C.Button, { variant: 'secondary', href: '#/faq' }, P.faqMore))));
  }

  function ScreenPremium() {
    var from = useRef(U.nav.premiumFrom || 'menu');
    useEffect(function () {
      API.event('premium_viewed', { from: from.current });
      U.nav.premiumFrom = 'menu';
    }, []);
    function toReport() {
      var report = document.getElementById('beta-report');
      if (!report) return;
      report.focus({ preventScroll: true });
      U.scrollToEl(report);
    }
    function toCompare() { U.scrollToEl(document.getElementById('compare')); }
    return h(React.Fragment, null,
      h(PremiumHero, { onTry: toReport, onCompare: toCompare }),
      h(WhatSection, null),
      h(SampleReport, null),
      h(AiSection, null),
      h(CompareSection, { from: from.current }),
      h(PriceSection, { onTry: toReport }),
      h(TestimonialSection, null),
      h(FaqPreview, null));
  }

  window.MSPremium = { ScreenPremium: ScreenPremium };
})();
