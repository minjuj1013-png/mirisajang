/* 프리미엄 리포트 화면(#/premium). 블러는 쓰지 않아요(블러는 홈 결과 맛보기에만 있어요).
   문구는 text.js, 가격은 config.js, 후기는 testimonials.js 에 있어요. */
(function () {
  var React = window.React;
  var C = window.MiriSajang;
  var T = window.TEXT;
  var API = window.MSApi;
  var U = window.MSUI;
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var P = T.p;

  // 가상 예시 그림: 값은 모두 같은 더미이고 화면에서는 ○○로 가려 보여요(app.css 의 .sample-mask).
  function SampleBox(props) {
    return h('div', { className: 'sample-mask ' + (props.className || '') },
      h('p', { className: 'ms-sr' }, P.sampleSr),
      h('div', { 'aria-hidden': 'true' }, props.children));
  }

  function PremiumHero(props) {
    return h('section', { className: 'ms-hero prem-hero' },
      h('div', { className: 'ms-hero__in prem-hero__grid' },
        h('div', { className: 'prem-hero__text' },
          h('p', { className: 'label prem-eyebrow' }, P.eyebrow, ' ', h(C.Badge, { tone: 'neutral', size: 'md' }, P.badge)),
          h('h1', { className: 'display-lg' }, P.title),
          h('p', { className: 'body-lg ink-muted', style: { margin: 0 } }, P.lede),
          h('div', { className: 'row' },
            h(C.Button, { size: 'lg', onClick: props.onApply }, P.apply),
            h(C.Button, { variant: 'link', onClick: props.onCompare }, P.compareLink))),
        h(C.Card, { className: 'prem-preview' },
          h('div', { className: 'prem-preview__head' },
            h('span', { className: 'label' }, P.previewTitle),
            h(C.Badge, { tone: 'warning', size: 'md' }, P.previewTag)),
          h('div', { className: 'prem-preview__brand' },
            h(C.ShapeLogo, { shape: 'hexagon', tone: 'accent', initial: '가' }),
            h('span', { className: 'title' }, P.previewBrand)),
          h(SampleBox, null, h(C.RangeBar, { low: -1, high: 2, title: '월 순수익' })),
          h(C.AICommentCard, { status: 'sample', title: 'AI 코멘트' }, h('p', null, P.previewAi)),
          h('p', { className: 'caption ink-muted', style: { margin: 0 } }, P.previewNote))));
  }

  function WhatSection() {
    return h('section', { className: 'section' },
      h('div', { className: 'ms-container' },
        h('h2', { className: 'heading-1' }, P.whatTitle),
        h('p', { className: 'body ink-muted', style: { margin: '8px 0 24px' } }, P.whatLede),
        h('div', { className: 'what-grid' }, P.items.map(function (it, i) {
          return h(C.Card, { key: i },
            h('div', { className: 'what-card__badges' },
              it.badge === 'ai' ? h(C.Badge, { tone: 'ai' }) : h(C.Badge, { tone: 'locked' }),
              h(C.Badge, { tone: 'neutral' }, P.soonBadge)),
            h('h3', { className: 'heading-3', style: { margin: '12px 0 8px' } }, it.title),
            h('p', { className: 'body-sm ink-muted', style: { margin: 0 } }, it.body));
        }))));
  }

  function SampleReport() {
    var dummy = T.teaser.dummyItems.map(function (l) { return { label: l, value: 1 }; });
    var cmp = T.teaser.dummyBrands.map(function (l) { return { label: l, value: 1 }; });
    var shapes = [['circle', 'brand'], ['square', 'accent'], ['triangle', 'teal']];
    return h('section', { className: 'section section--soft' },
      h('div', { className: 'ms-container' },
        h('div', { className: 'sample-head' },
          h('h2', { className: 'heading-1' }, P.sampleTitle),
          h(C.Badge, { tone: 'warning', size: 'md' }, '가상 예시')),
        h('p', { className: 'body ink-muted', style: { margin: '8px 0 16px' } }, P.sampleLede),
        h(C.Notice, { tone: 'warn', title: P.sampleNoticeTitle }, P.sampleNotice),
        h('div', { className: 'sample-grid' },
          h(C.Card, null, h(SampleBox, null, h(C.StackedBar, { title: P.sampleCostTitle, items: dummy }))),
          h(C.Card, null,
            h('div', { className: 'sample-logos', 'aria-hidden': 'true' }, T.teaser.dummyBrands.map(function (b, i) {
              return h('span', { key: i, className: 'sample-logos__item' }, h(C.ShapeLogo, { shape: shapes[i][0], tone: shapes[i][1], size: 'sm', initial: b.slice(-1) }));
            })),
            h(SampleBox, null, h(C.BarCompare, { title: P.sampleCompareTitle, items: cmp, max: 2 }))),
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
            h(C.Notice, { tone: 'ai', status: 'planned', title: '지키는 규칙' }, P.aiRule)))));
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
      if (v === true) return true;
      if (v === false) return h('span', { className: 'no-text' }, P.no);
      if (v === 'soon') return h(C.Badge, { tone: 'neutral' }, P.soon);
      return v;
    }
    var rows = P.rows.map(function (r) { return { label: r.label, free: cellOf(r.free), premium: cellOf(r.premium) }; });
    return h('section', { className: 'section section--soft', id: 'compare' },
      h('div', { className: 'ms-container', ref: ref },
        h('h2', { className: 'heading-1' }, P.compareTitle),
        h('p', { className: 'body ink-muted', style: { margin: '8px 0 24px' } }, P.compareLede),
        h(C.CompareTable, { caption: P.compareCaption, rows: rows })));
  }

  function PriceSection() {
    return h('section', { className: 'section' },
      h('div', { className: 'ms-container price-wrap' },
        h('div', null,
          h('h2', { className: 'heading-1' }, P.priceTitle),
          h(C.Notice, { tone: 'info' }, P.priceNotice)),
        h(C.PriceCard, {
          name: P.priceName, price: P.priceAmount, priceNote: P.priceNote, features: P.priceFeatures, highlight: true,
          badge: h(C.Badge, { tone: 'neutral' }, P.soonBadge)
        })));
  }

  function TestimonialSection() {
    var list = window.TESTIMONIALS || [];
    return h('section', { className: 'section section--soft' },
      h('div', { className: 'ms-container' },
        h('h2', { className: 'heading-1' }, P.testiTitle),
        h('p', { className: 'body-lg testi-lede' }, P.testiLede),
        h('div', { className: 'testi-grid' }, list.map(function (t, i) {
          return h(C.TestimonialCard, { key: i, kind: t.kind, quote: t.quote, name: t.name, role: t.role, shape: t.shape, tone: t.tone });
        }))));
  }

  function ApplySection() {
    var st = useState('idle'); // idle | sending | done | fail
    var msg = useState('');
    var busyRef = useRef(false);
    function apply() {
      if (busyRef.current || st[0] === 'done') return; // 중복 클릭은 무시해요
      busyRef.current = true;
      st[1]('sending');
      API.event('preorder_clicked', {});
      var inp = window.MSHome && window.MSHome.lastInput();
      var ctx = inp ? { region: inp.region, choice: 'capital' } : {};
      API.preorder(ctx).then(function (r) {
        if (r.ok) { st[1]('done'); msg[1]((r.data && r.data.message) || P.applyDoneFallback); } else { st[1]('fail'); busyRef.current = false; }
      });
    }
    return h('section', { className: 'section', id: 'apply' },
      h('div', { className: 'ms-container apply-wrap' },
        h(C.Card, { tone: 'emphasis', className: 'apply-card' },
          h('h2', { className: 'heading-1' }, P.applyTitle),
          h('p', { className: 'body', style: { margin: 0 } }, P.applyLede),
          st[0] === 'done' ? h('div', { role: 'status' }, h(C.Notice, { tone: 'info', title: P.applyNotice }, msg[0])) : null,
          st[0] === 'fail' ? h(C.Notice, { tone: 'danger' }, P.applyFail) : null,
          h('div', { className: 'row' },
            st[0] === 'done'
              ? h(C.Button, { disabled: true }, P.applied)
              : h(C.Button, { onClick: apply, disabled: st[0] === 'sending' }, st[0] === 'sending' ? P.applySending : P.applyButton),
            h(C.Button, { variant: 'link', href: '#/' }, '홈으로')))));
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
    function toApply() { U.scrollToEl(document.getElementById('apply')); }
    function toCompare() { U.scrollToEl(document.getElementById('compare')); }
    return h(React.Fragment, null,
      h(PremiumHero, { onApply: toApply, onCompare: toCompare }),
      h(WhatSection, null),
      h(SampleReport, null),
      h(AiSection, null),
      h(CompareSection, { from: from.current }),
      h(PriceSection, null),
      h(TestimonialSection, null),
      h(ApplySection, null),
      h(FaqPreview, null));
  }

  window.MSPremium = { ScreenPremium: ScreenPremium };
})();
