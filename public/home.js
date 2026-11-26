/* 홈 화면: 히어로 + 검색 카드 + 같은 페이지 결과 영역.
   결과는 페이지를 옮기지 않고 푸터 앞의 #result 에 그려요. 문구는 text.js 에 있어요. */
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
  var man = C.fmt.man;

  var CAP_MIN = 500, CAP_MAX = 100000, BRAND_PAGE_SIZE = 4;
  var TONE_MAP = { orange: 'accent', lavender: 'brand', sage: 'teal', black: 'ink' }; // 서버의 로고 힌트 -> 도형 로고 색
  var FIT_MAP = { ok: 'fit', tight: 'tight', short: 'short' };
  // 각 가맹본부 공식 사이트에서 사용 중인 브랜드 이미지.
  var BRAND_LOGOS = {
    kyochon: 'kyochon.png', jaws: 'jaws.png', mega_mgc: 'mega_mgc.png', twoway: 'twoway.png',
    hansot: 'hansot.png', paris_baguette: 'paris_baguette.png', halmaek: 'halmaek.png', isaac_toast: 'isaac_toast.svg'
  };

  // 뒤로 갔다 와도 입력과 결과가 남도록 화면 밖에 잠시 보관해요(새로고침하면 사라져요).
  var saved = { form: { capital: null, region: { sido: '', sigungu: '' }, staff: '' }, res: { phase: 'idle' }, selected: null, filter: 'all', token: 0 };

  function brandName(n) { return String(n || '').replace(/\s*\(.*\)\s*$/, ''); } // '예시 브랜드 가 (치킨)' -> '예시 브랜드 가'
  function brandInitial(n) { var p = brandName(n).split(' '); return p[p.length - 1].charAt(0); }
  function BrandLogo(props) {
    var brand = props.brand, failed = useState(false), logo = BRAND_LOGOS[brand.id];
    if (logo && !failed[0]) {
      return h('span', { className: 'brand-logo' }, h('img', {
        src: '/brand-logos/' + logo, alt: '', onError: function () { failed[1](true); }
      }));
    }
    var hint = brand.logo_hint || {};
    return h(C.ShapeLogo, { shape: hint.shape || 'circle', tone: TONE_MAP[hint.tone] || 'brand', initial: brandInitial(brand.name), size: props.size });
  }
  function statusOf(card) { return FIT_MAP[card.fit] || 'nodata'; }
  function statusBadge(card) {
    var s = statusOf(card);
    var tone = { fit: 'success', tight: 'warning', short: 'danger', nodata: 'neutral' }[s];
    var text = { fit: T.r.countText.ok, tight: T.r.countText.tight, short: T.r.countText.short, nodata: T.r.countText.insufficient }[s];
    return h(C.Badge, { tone: tone, size: 'md' }, text);
  }
  function publishedPrice(amount) {
    function won(n) { return Math.round(n * 10000).toLocaleString('ko-KR') + '원'; }
    return amount.low === amount.high ? won(amount.low) : won(amount.low) + ' ~ ' + won(amount.high);
  }
  function sourceLink(source) {
    return h('a', { href: source.url, target: '_blank', rel: 'noopener noreferrer' }, source.name);
  }
  function budgetMoney(amount) { return man(amount) + ' 원'; }
  function BudgetSteps(props) {
    return h(C.Card, { className: 'stack' },
      h('h4', { className: 'heading-3', style: { margin: 0 } }, '자본을 더하면 가능한 브랜드'),
      h('ul', { className: 'budget-steps' }, props.steps.map(function (step) {
        return h('li', { key: step.capital },
          h('strong', null, budgetMoney(step.additional) + ' 추가'),
          h('span', { className: 'body-sm ink-muted' }, '총 자본 ' + budgetMoney(step.capital)),
          h('span', { className: 'body-sm' }, '가능한 브랜드 ' + step.possible + '곳 (+' + step.added + '곳)'));
      })));
  }
  function BrandBudgetChart(props) {
    var cost = props.cost, capital = props.capital;
    function pct(amount) { return (100 * amount / props.max) + '%'; }
    return h('div', { className: 'brand-budget-chart', role: 'img',
      'aria-label': '내 자본 ' + budgetMoney(capital) + ', 공개 개설비 ' + publishedPrice(cost) },
      h('span', { className: 'ms-brand__k', 'aria-hidden': true }, '내 자본'),
      h('span', { className: 'brand-budget-chart__track', 'aria-hidden': true },
        h('span', { className: 'brand-budget-chart__fill', style: { width: pct(capital) } })),
      h('span', { className: 'ms-brand__k', 'aria-hidden': true }, '공개 개설비'),
      h('span', { className: 'brand-budget-chart__track', 'aria-hidden': true },
        h('span', { className: 'brand-budget-chart__fill brand-budget-chart__fill--cost', style: { width: pct(cost.high) } }),
        cost.high > cost.low ? h('span', { className: 'brand-budget-chart__range',
          style: { left: pct(cost.low), width: pct(cost.high - cost.low) } }) : null));
  }
  function capitalShortfall(card) {
    if (!card.gap) return null;
    if (card.fit === 'short') {
      return '공개 개설비까지 ' + publishedPrice({ low: card.gap.shortfall_low, high: card.gap.shortfall_high }) + ' 추가';
    }
    if (card.fit === 'tight') {
      return '공개 개설비 상한까지 ' + publishedPrice({ low: card.gap.shortfall_high, high: card.gap.shortfall_high }) + ' 추가';
    }
    return null;
  }
  function PublishedOpening(props) {
    var opening = props.opening, source = opening.source, royalty = opening.monthly_royalty;
    return h(C.Card, { className: 'detail-wide' },
      h('h4', { className: 'heading-3' }, '본사 공개 개설비'),
      h('p', { className: 'number-lg ms-num' }, publishedPrice(opening.total)),
      h('p', { className: 'body-sm ink-muted' }, opening.area + ' · ' + opening.tax),
      h('p', { className: 'body-sm' }, '내 자본 ' + man(props.capital) + '원 · ' + opening.note),
      h('details', null,
        h('summary', null, '개설비 항목별 금액'),
        h('ul', { className: 'list-bullets' }, opening.items.map(function (item) {
          return h('li', { key: item.label }, item.label + ' ' + publishedPrice(item));
        }))),
      h('p', { className: 'body-sm' },
        royalty ? h(React.Fragment, null, '공개 월 로열티 ' + publishedPrice(royalty) + ' · ' + royalty.tax,
          opening.disclosure ? h(React.Fragment, null, ' · ', sourceLink(royalty.source)) : null) : '월 로열티 미확인',
        ' · 차액가맹금 미확인'),
      h('p', { className: 'body-sm' }, sourceLink(source),
        source.year ? ' · ' + source.year + '년 자료' : '', ' · ' + source.checked_at + ' 확인'));
  }
  function limitText(f) { return f.unit === '만 원' ? man(f.min) + ' ~ ' + man(f.max) + ' 원' : f.min + ' ~ ' + f.max + ' ' + f.unit; }

  // ---------- 개수 요약 막대 (글자 + 도형 + 무늬) ----------
  var ORDER = ['ok', 'tight', 'short', 'insufficient'];
  function StatusBar(props) {
    var counts = props.counts || {};
    var label = T.r.countsLabel + ': ' + ORDER.map(function (k) { return T.r.countText[k] + ' ' + (counts[k] || 0) + '개'; }).join(', ');
    return h('div', { className: 'sbar' },
      h('div', { className: 'sbar__bar', role: 'img', 'aria-label': label },
        ORDER.map(function (k) {
          return counts[k] ? h('span', { key: k, className: 'sbar__seg sbar__seg--' + k, style: { flexGrow: counts[k] } }, counts[k]) : null;
        })),
      h('ul', { className: 'sbar__legend' }, ORDER.map(function (k) {
        return h('li', { key: k }, h('span', { className: 'sbar__sw sbar__sw--' + k, 'aria-hidden': 'true' }), T.r.countText[k] + ' ', h('b', { className: 'ms-num' }, (counts[k] || 0) + '개'));
      })));
  }

  // ---------- 의견 질문 ----------
  function Feedback() {
    var ans = useState('');
    var resp = useState('');
    var st = useState('idle'); // idle | sending | done | fail
    var need = useState(false);
    function send() {
      if (!ans[0]) { need[1](true); var el = document.querySelector('input[name="similarity"]'); if (el) el.focus(); return; }
      need[1](false);
      st[1]('sending');
      var body = { type: 'similarity', answer: ans[0] };
      if (resp[0]) body.respondent = resp[0];
      API.feedback(body).then(function (r) { st[1](r.ok ? 'done' : 'fail'); });
    }
    return h(C.Card, { className: 'fb-card' },
      h('h3', { className: 'heading-2' }, T.fb.title),
      h('p', { className: 'body ink-muted', style: { margin: 0 } }, T.fb.lede),
      h('fieldset', { className: 'choices' },
        h('legend', { className: 'label' }, T.fb.legend),
        h('div', { className: 'choice-list' }, T.fb.options.map(function (o) {
          return h('label', { key: o.value, className: 'choice' },
            h('input', { type: 'radio', name: 'similarity', value: o.value, checked: ans[0] === o.value,
              onChange: function () { ans[1](o.value); need[1](false); if (st[0] !== 'idle') st[1]('idle'); } }),
            h('span', null, o.label));
        })),
        need[0] ? h('p', { className: 'field-error' }, '오류: ' + T.fb.need) : null),
      h('div', { className: 'fb-select' }, h(C.SelectField, {
        label: T.fb.respondent, hint: T.fb.respondentHint, placeholder: T.fb.respondentPlaceholder,
        options: T.fb.respondentOptions, value: resp[0], onChange: function (v) { resp[1](v); }
      })),
      h('div', null, h(C.Button, { variant: 'secondary', onClick: send, disabled: st[0] === 'sending' }, T.fb.send)),
      st[0] === 'done' ? h('div', { role: 'status' }, h(C.Notice, { tone: 'info' }, T.fb.done)) : null,
      st[0] === 'fail' ? h(C.Notice, { tone: 'danger' }, T.fb.fail) : null);
  }

  // ---------- 프리미엄 맛보기 (흐린 가상 예시. 실제 결과 값은 하나도 넣지 않아요) ----------
  function Teaser() {
    function toPremium() { U.nav.premiumFrom = 'teaser'; U.goto('#/premium'); }
    var dummy = T.teaser.dummyItems.map(function (l) { return { label: l, value: 1 }; }); // 모두 같은 값(균등한 더미)
    var cmp = T.teaser.dummyBrands.map(function (l) { return { label: l, value: 1 }; });
    return h('div', { className: 'teaser' },
      h('h3', { className: 'heading-2' }, T.teaser.title, ' ', h(C.Badge, { tone: 'locked' })),
      h('p', { className: 'body ink-muted', style: { margin: '0 0 16px' } }, T.teaser.lede),
      h(C.LockedBlur, {
        title: T.teaser.lockTitle, description: T.teaser.lockDesc, minHeight: 420,
        action: h(C.Button, { onClick: toPremium }, T.teaser.button)
      },
        h('div', { className: 'teaser__body' },
          h(C.StackedBar, { title: T.teaser.costTitle, items: dummy }),
          h(C.BarCompare, { title: T.teaser.compareTitle, items: cmp, max: 2 }),
          h('div', { className: 'teaser__row' },
            h(C.Card, { flat: true },
              h('p', { className: 'label', style: { margin: 0 } }, T.teaser.paybackTitle),
              h('p', { className: 'number-lg', style: { margin: '4px 0 0' } }, T.teaser.paybackValue)),
            h(C.AICommentCard, { status: 'sample', title: T.teaser.aiTitle }, h('p', null, T.teaser.aiBody))))));
  }

  // ---------- 선택한 브랜드 자세히 ----------
  function traceView(t) {
    var item = U.clean(t.item), note = '';
    if (/상한/.test(item) && /계수/.test(item)) { item = '인건비 상한'; note = '사람당 인건비의 위쪽 끝을 잡는 값이에요.'; }
    else if (item.indexOf('인건비 하한') === 0) { note = '최저임금으로 계산한 사람당 인건비의 아래쪽 끝이에요.'; }
    var status = U.clean(t.status);
    return { item: item, source: U.clean(t.source_name), year: t.year, status: status === '조건부' ? '확인 필요' : status, note: note };
  }

  function BrandDetail(props) {
    var opts = props.opts, input = props.input, card = props.card;
    var es = useState(props.initial || null);
    var est = es[0];
    var ls = useState(props.initial ? 'done' : 'loading'); // loading | done | fail  (처음 불러오기)
    var busy = useState('idle'); // idle | busy | done | fail  (다시 계산)
    var failMsg = useState('');
    var ov = useState({});       // { 항목키: 숫자 | null }
    var showTrace = useState(false);
    var ovRef = useRef({});
    var timer = useRef(null);
    var seq = useRef(0);
    var pendingKey = useRef(null);

    var fields = opts.editable_fields || [];
    function fieldOf(key) { return fields.filter(function (f) { return f.key === key; })[0]; }
    function basePayload() {
      var p = { brand_id: card.id, region: input.region, staff: input.staff, capital: input.capital };
      if (input.district) p.district = input.district;
      return p;
    }
    function errorOf(f, v) {
      if (v == null) return '';
      if (v < f.min || v > f.max) return T.d.errRange(limitText(f));
      return '';
    }

    useEffect(function () {
      if (props.initial) return undefined;
      var alive = true;
      API.estimate(basePayload()).then(function (r) {
        if (!alive) return;
        if (r.ok && r.data) { es[1](r.data); ls[1]('done'); } else { ls[1]('fail'); }
      });
      return function () { alive = false; };
    }, []);
    useEffect(function () { return function () { clearTimeout(timer.current); }; }, []);

    function recalc(values) {
      var nums = {};
      fields.forEach(function (f) { var v = values[f.key]; if (v != null && !errorOf(f, v)) nums[f.key] = v; });
      var payload = basePayload();
      if (Object.keys(nums).length) payload.overrides = nums;
      seq.current += 1;
      var mine = seq.current;
      busy[1]('busy');
      if (pendingKey.current) { API.event('override_changed', { field: pendingKey.current }); pendingKey.current = null; }
      API.estimate(payload).then(function (r) {
        if (mine !== seq.current) return; // 더 새 요청이 있으면 이 답은 버려요
        if (r.ok && r.data) { es[1](r.data); busy[1]('done'); failMsg[1](''); }
        else { busy[1]('fail'); failMsg[1]((r.data && r.data.error && r.data.error.message) || T.d.recalcFail); }
      });
    }
    function edit(key, v) {
      var next = Object.assign({}, ovRef.current);
      next[key] = v;
      ovRef.current = next;
      ov[1](next);
      pendingKey.current = key;
      clearTimeout(timer.current);
      timer.current = setTimeout(function () { recalc(ovRef.current); }, 400); // 입력을 멈추고 0.4초 뒤에 계산
    }
    function revertAll() {
      clearTimeout(timer.current);
      ovRef.current = {};
      ov[1]({});
      pendingKey.current = null;
      recalc({});
      var el = document.getElementById('ov-' + (fields[0] && fields[0].key)); if (el) el.focus();
    }

    var head = h('div', { className: 'detail__head' },
      h(BrandLogo, { key: card.id, brand: card, size: 'md' }),
      h('div', null,
        h('h3', { className: 'heading-2', id: 'detail-title', tabIndex: -1 }, brandName(card.name)),
        h('div', { className: 'detail__tags' }, h(C.Badge, { tone: 'neutral' }, card.industry || ''), statusBadge(card))));
    if (ls[0] === 'loading') return h('div', { className: 'detail' }, head, h(C.Skeleton, { lines: 4, label: T.d.loading }));
    if (ls[0] === 'fail' || !est) return h('div', { className: 'detail' }, head, h(C.Notice, { tone: 'danger' }, T.d.fail));

    var overridden = est.overridden || [];
    var overNames = overridden.map(function (k) { var f = fieldOf(k); return f ? f.label : k; });
    var insufficient = est.status === 'insufficient';
    var missing = est.missing || [];
    var fieldLabels = fields.map(function (f) { return f.label; });
    var otherMissing = missing.filter(function (m) { return fieldLabels.indexOf(m) < 0; });
    var labor = est.labor, be = est.breakeven, acc = est.accuracy || { level: 0 };
    var basis = overridden.length ? ' · ' + T.d.editedBasis : '';
    var vals = ov[0];
    var anyEdited = fields.some(function (f) { return vals[f.key] != null; });
    var hasErr = fields.some(function (f) { return errorOf(f, vals[f.key]); });
    var assumed = vals.monthly_sales != null && !errorOf(fieldOf('monthly_sales') || { min: 0, max: 0 }, vals.monthly_sales) ? vals.monthly_sales : undefined;
    var statusLine = busy[0] === 'busy' ? T.d.recalcBusy : (busy[0] === 'done' && overridden.length ? T.d.recalcDone : '');

    var breakEl;
    if (be && be.low != null && be.high != null) {
      breakEl = h(C.BreakevenGauge, { low: be.low, high: be.high, assumed: assumed, title: T.d.breakTitle });
    } else if (!insufficient) { // 비용 비율이 너무 높아 계산이 안 되는 경우: '자료 부족'이 아니라 이유를 알려요
      breakEl = h('div', null, h('p', { className: 'ms-chart__title' }, T.d.breakTitle), h(C.Badge, { tone: 'warning' }, '계산할 수 없어요'), h('p', { className: 'body-sm', style: { margin: '8px 0 0' } }, T.d.breakFail));
    } else {
      breakEl = h(C.BreakevenGauge, { title: T.d.breakTitle });
    }

    return h('div', { className: 'detail' },
      head,
      insufficient ? h(C.Notice, { tone: 'info', title: T.d.insufficientTitle },
        otherMissing.length ? T.d.insufficientOther(otherMissing) : T.d.insufficientFix(missing.length ? missing : ['일부 항목'])) : null,
      est.status === 'ok_user_values' ? h(C.Notice, { tone: 'info', title: T.d.userValuesTitle }, T.d.userValues) : null,
      overridden.length ? h(C.Notice, { tone: 'info', title: T.d.editedTitle }, T.d.editedBody(overNames)) : null,
      h('div', { className: 'detail-grid' },
        est.opening_cost ? h(PublishedOpening, { opening: est.opening_cost, capital: input.capital }) : null,
        h(C.Card, { className: 'detail-wide' },
          est.profit
            ? h(C.RangeFigure, { label: T.d.profit, low: est.profit.low, high: est.profit.high, size: 'lg', note: T.d.profitNote + basis })
            : h(C.RangeFigure, { label: T.d.profit, size: 'lg' }),
          est.profit ? h(C.RangeBar, { low: est.profit.low, high: est.profit.high, title: T.d.profit + ' 범위' }) : null,
          est.profit && est.profit.low < 0 && est.profit.high > 0 ? h('p', { className: 'body', style: { margin: 0 } }, T.d.mixed) : null),
        est.opening_cost ? null : h(C.Card, null,
          h(C.CapitalFitBar, { low: est.startup_cost ? est.startup_cost.low : undefined, high: est.startup_cost ? est.startup_cost.high : undefined, myCapital: input.capital, title: T.d.capitalTitle })),
        h(C.Card, null, breakEl, be && be.low != null ? h('p', { className: 'body-sm ink-muted', style: { margin: 0 } }, T.d.breakNote + basis) : null),
        h(C.Card, null,
          h(C.RangeFigure, labor
            ? { label: T.d.labor, low: labor.low, high: labor.high,
                note: h(React.Fragment, null,
                  T.d.laborNote(U.wonText(labor.min_wage_monthly_won), labor.min_wage_year) + (overridden.indexOf('wage_per_staff') >= 0 ? ' · ' + T.d.editedBasis : ''),
                  h('br'), U.clean(labor.owner_note || T.d.ownerNoteDefault)) }
            : { label: T.d.labor })),
        h(C.Card, null,
          h(C.AccuracyMeter, { level: acc.level, label: T.d.accLabel, texts: T.d.accTexts }),
          acc.level <= 1 ? h('p', { className: 'body-sm', style: { margin: '8px 0 0' } }, T.d.accLow) : null,
          !est.opening_cost && est.geo && est.geo.note ? h('p', { className: 'body-sm ink-muted', style: { margin: '8px 0 0' } }, U.clean(est.geo.note) + '.') : null)),
      h(C.Notice, { tone: 'warn' }, T.d.contract),
      labor && labor.below_min_wage ? h(C.Notice, { tone: 'warn' }, T.d.belowMinWage) : null,
      h('div', { className: 'incl-grid' },
        h('div', null,
          h('h4', { className: 'heading-3', style: { margin: '0 0 8px' } }, est.opening_cost ? '월 손익 계산에 필요한 항목' : T.d.includedTitle),
          h('ul', { className: 'list-bullets' }, T.d.included.map(function (c, i) { return h('li', { key: i }, c); }))),
        h('div', null,
          h('h4', { className: 'heading-3', style: { margin: '0 0 8px' } }, T.d.excludedTitle),
          h('p', { className: 'body-sm ink-muted', style: { margin: '0 0 8px' } }, T.d.excludedLede),
          h('ul', { className: 'list-bullets' }, (props.excluded || []).map(function (c, i) { return h('li', { key: i }, U.clean(c)); })))),
      est.opening_cost ? null : h('p', { className: 'body-sm', style: { margin: 0 } }, T.d.paidNote + (props.brandNote ? ' ' + U.clean(props.brandNote) : '')),

      // 값 고치기
      h(C.Card, { tone: 'emphasis', className: 'edit-card' },
        h('h4', { className: 'heading-2', style: { margin: 0 } }, T.d.editTitle),
        h('p', { className: 'body ink-muted', style: { margin: 0 } }, T.d.editLede),
        h(C.Notice, { tone: 'info' }, T.d.notSaved),
        anyEdited ? h('div', null, h(C.Button, { variant: 'secondary', size: 'sm', onClick: revertAll }, T.d.revertAll)) : null,
        h('div', { className: 'edit-grid' }, fields.map(function (f) {
          var v = vals[f.key] == null ? null : vals[f.key];
          var err = errorOf(f, v);
          var edited = v != null && !err;
          var isMissing = missing.indexOf(f.label) >= 0;
          return h('div', { key: f.key, className: 'edit-item' },
            h(C.NumberField, {
              id: 'ov-' + f.key, label: f.label, unit: f.unit, value: v, placeholder: T.d.defaultPlaceholder,
              error: err ? '오류: ' + err : undefined,
              hint: (isMissing && !otherMissing.length ? T.d.missingHint + ' ' : '') + '허용 범위 ' + limitText(f) + '. ' + T.d.numOnly,
              onChange: function (n) { edit(f.key, n); }
            }),
            edited ? h('div', { className: 'edit-item__tag' },
              h(C.Badge, { tone: 'neutral' }, T.d.editedBadge),
              h(C.Button, { variant: 'link', size: 'sm', onClick: function () { edit(f.key, null); var el = document.getElementById('ov-' + f.key); if (el) el.focus(); } }, T.d.revert)) : null);
        })),
        h('div', { role: 'status', className: 'body-sm' }, statusLine ? h('div', { className: 'ink-muted' }, statusLine) : null, hasErr ? h('div', null, T.d.skippedErr) : null),
        busy[0] === 'fail' ? h(C.Notice, { tone: 'danger' }, failMsg[0]) : null),

      // 출처 + 용어
      h('div', { className: 'row' },
        h(C.Button, { variant: 'link', onClick: function () { showTrace[1](!showTrace[0]); } }, showTrace[0] ? T.d.sourceClose : T.d.sourceOpen)),
      showTrace[0] ? h('div', { 'aria-live': 'polite', className: 'trace-wrap' },
        h('p', { className: 'body-sm ink-muted', style: { margin: '0 0 8px' } }, T.d.sourceLede),
        h('ul', { className: 'trace' }, (est.trace || []).map(function (raw, i) {
          var t = traceView(raw);
          var rows = [['항목', t.item], ['출처', t.source]];
          if (t.year != null) rows.push([T.d.sourceYear, t.year + '년']);
          rows.push([T.d.sourceStatus, t.status]);
          if (t.note) rows.push(['설명', t.note]);
          var kids = [];
          rows.forEach(function (r, j) { kids.push(h('dt', { key: 't' + j, className: 'body-sm ink-muted' }, r[0]), h('dd', { key: 'd' + j, className: 'body' }, r[1])); });
          return h('li', { key: i }, h('dl', null, kids));
        }))) : null,
      h('div', { className: 'glossary' },
        h('h4', { className: 'heading-3', style: { margin: 0 } }, T.d.glossaryTitle),
        h('p', { className: 'body-sm ink-muted', style: { margin: '4px 0 8px' } }, T.d.glossaryLede),
        h(U.Glossary, { terms: U.buildGlossary(opts) })));
  }

  // ---------- 결과 영역 ----------
  function ResultSection(props) {
    var res = props.res, opts = props.opts;
    var step = useState(0);
    var limit = useState(BRAND_PAGE_SIZE);
    var grid = useRef(null);
    useEffect(function () {
      if (res.phase !== 'loading') return undefined;
      step[1](0);
      var t1 = setTimeout(function () { step[1](1); }, 450);
      var t2 = setTimeout(function () { step[1](2); }, 950);
      return function () { clearTimeout(t1); clearTimeout(t2); };
    }, [res.phase, res.input]);

    var body;
    if (res.phase === 'loading') {
      body = h('div', { className: 'stack-lg' },
        h('h2', { className: 'heading-1', id: 'result-title', tabIndex: -1 }, T.r.loadingTitle),
        h(C.ProgressSteps, { steps: T.r.steps, current: step[0], label: T.r.stepsLabel }),
        h('div', { className: 'brand-grid' }, [0, 1, 2].map(function (i) { return h(C.Card, { key: i }, h(C.Skeleton, { lines: 4 })); })));
    } else if (res.phase === 'error') {
      body = h('div', { className: 'stack-lg' },
        h('h2', { className: 'heading-1', id: 'result-title', tabIndex: -1 }, T.r.failTitle),
        h(C.Notice, { tone: 'danger' }, res.error || T.loadFail),
        h('div', null, h(C.Button, { variant: 'secondary', onClick: props.onRetry }, T.retry)));
    } else {
      var d = res.data;
      var cards = d.brands || [];
      var counts = d.counts || {};
      var geo = d.geo || {};
      var filter = props.filter;
      var filtered = cards.filter(function (c) {
        if (filter === 'all') return true;
        if (filter === 'insufficient') return !c.fit;
        return c.fit === filter;
      });
      var shown = filtered.slice(0, limit[0]);
      var remaining = filtered.length - shown.length;
      var budgetSteps = d.capital_steps || [];
      function showMore() {
        limit[1](limit[0] + BRAND_PAGE_SIZE);
        if (remaining <= BRAND_PAGE_SIZE) {
          requestAnimationFrame(function () {
            var next = grid.current && grid.current.children[shown.length];
            var button = next && next.querySelector('button');
            if (button) button.focus();
          });
        }
      }
      var maxHigh = cards.reduce(function (a, c) {
        var cost = c.opening_cost ? c.opening_cost.total : c.startup_cost;
        return cost ? Math.max(a, cost.high) : a;
      }, 0);
      var scaleMax = Math.max(maxHigh, d.capital) * 1.1;
      var sel = cards.filter(function (c) { return c.id === props.selected; })[0];
      var regionText = geo.region_label || '';
      if (geo.district_label && geo.district_code && geo.district_code !== '__all') regionText += ' ' + geo.district_label;
      var filterOpts = [{ value: 'all', label: T.r.filterAll + ' ' + cards.length }].concat(ORDER.map(function (k) {
        return { value: k, label: T.r.countText[k] + ' ' + (counts[k] || 0) };
      }));
      body = h('div', { className: 'stack-lg' },
        h('div', { className: 'result__top' },
          h('h2', { className: 'heading-1', id: 'result-title', tabIndex: -1 }, T.r.title),
          h(C.Button, { variant: 'link', onClick: props.onChange }, T.r.change)),
        h('p', { className: 'body-sm ink-muted', style: { margin: 0 } }, T.r.refreshNote),
        // 1. 내 조건 요약
        h('div', { className: 'stack' },
          h('ul', { className: 'chips-static', 'aria-label': '내 조건' },
            h('li', null, T.r.chipCapital(man(d.capital) + ' 원')),
            h('li', null, regionText),
            h('li', null, T.r.chipStaff(d.staff))),
          h(C.DataStatus, { kind: 'partial' }, opts.dev_notice)),
        // 2. 개수 요약 + 필터
        h('div', { className: 'stack' },
          h('h3', { className: 'heading-2' }, T.r.summaryTitle(counts.ok || 0)),
          h('p', { className: 'body ink-muted', style: { margin: 0 } }, T.r.summaryLede),
          h(StatusBar, { counts: counts }),
          budgetSteps.length ? h(BudgetSteps, { steps: budgetSteps }) : null,
          h(C.FilterChips, { label: T.r.filterLabel, options: filterOpts, value: filter, onChange: function (value) {
            props.setFilter(value);
            limit[1](BRAND_PAGE_SIZE);
          } })),
        // 3. 카드 목록
        h('div', { className: 'stack' },
          h('p', { className: 'body-sm ink-muted', style: { margin: 0 } }, T.r.cardHint),
          shown.length
            ? h('div', { ref: grid, id: 'brand-grid', className: 'brand-grid', role: 'list', 'aria-label': T.r.gridLabel }, shown.map(function (c) {
              var opening = c.opening_cost;
              return h('div', { key: c.id, role: 'listitem' }, h(C.BrandCard, {
                id: c.id, name: brandName(c.name), category: c.industry, logo: h(BrandLogo, { brand: c }),
                capital: opening ? opening.total : c.startup_cost,
                capitalLabel: opening ? '본사 공개 개설비' : undefined,
                capitalText: opening ? publishedPrice(opening.total) : undefined,
                capitalNote: opening ? opening.area + ' · ' + opening.tax : undefined,
                capitalChart: opening ? h(BrandBudgetChart, { cost: opening.total, capital: d.capital, max: scaleMax }) : null,
                capitalGap: opening ? capitalShortfall(c) : null,
                statusText: opening ? T.r.countText[c.fit || 'insufficient'] : undefined,
                netProfit: c.summary && c.summary.profit ? { low: c.summary.profit.low, high: c.summary.profit.high } : null,
                myCapital: d.capital, status: statusOf(c), scaleMax: scaleMax,
                selected: props.selected === c.id, onSelect: props.onPick
              }));
            }))
            : h('p', { className: 'body' }, T.r.filterNone),
          remaining > 0 ? h('div', { className: 'brand-more' }, h(C.Button, {
            variant: 'secondary', onClick: showMore
          }, '브랜드 더보기 (+' + Math.min(BRAND_PAGE_SIZE, remaining) + '곳)')) : null),
        // 4. 자세히
        h('section', { id: 'detail', className: 'detail-section', 'aria-labelledby': 'detail-heading' },
          h('h3', { className: 'heading-2', id: 'detail-heading' }, T.d.title),
          sel
            ? h(BrandDetail, {
              key: res.token + ':' + sel.id, card: sel, opts: opts, input: res.input,
              initial: res.initial && res.initial.id === sel.id ? res.initial.data : null,
              excluded: d.excluded_costs, brandNote: d.brand_note
            })
            : h('p', { className: 'body' }, T.d.pickNone)),
        // 5. 프리미엄 맛보기
        h(Teaser, null),
        // 6. 의견
        h(Feedback, null));
    }
    return h('section', { id: 'result', className: 'result', 'aria-labelledby': 'result-title' },
      h('div', { className: 'ms-container' }, body));
  }

  // ---------- 홈 ----------
  function ScreenHome(props) {
    var opts = props.opts;
    var fs = useState(saved.form);
    var form = fs[0];
    var es = useState({});
    var errors = es[0];
    var rs = useState(saved.res);
    var res = rs[0];
    var ss = useState(saved.selected);
    var selected = ss[0];
    var fl = useState(saved.filter);
    var live = useState('');
    var srv = useState('');
    var seq = useRef(0);
    var scrolled = useRef(saved.token); // 이미 스크롤한 결과 번호(다시 들어왔을 때는 스크롤하지 않아요)

    useEffect(function () { saved.form = form; }, [form]);
    useEffect(function () { saved.res = res; saved.token = res.token || saved.token; }, [res]);
    useEffect(function () { saved.selected = selected; }, [selected]);
    useEffect(function () { saved.filter = fl[0]; }, [fl[0]]);

    // 지역 목록: { 시·도 이름: [시·군·구 글자...] }
    var regionObj = {};
    opts.regions.forEach(function (r) { regionObj[r.name] = r.children.map(function (c) { return c.label; }); });
    function regionByName(name) { return opts.regions.filter(function (r) { return r.name === name; })[0]; }

    function touch(field) {
      if (API.onceFlag('input_started')) API.event('input_started');
      API.event('field_set', { field: field });
    }
    function clearErr(key) { if (errors[key]) { var n = Object.assign({}, errors); delete n[key]; es[1](n); } srv[1](''); }
    function setCapital(v) {
      fs[1](Object.assign({}, form, { capital: v }));
      var n = Object.assign({}, errors); delete n.capital;
      if (v != null && v > CAP_MAX) n.capital = '오류: ' + T.s1.errCapital;
      es[1](n); srv[1]('');
      touch('capital');
    }
    function setRegion(v) {
      var field = v.sido !== form.region.sido ? 'region' : 'district';
      fs[1](Object.assign({}, form, { region: { sido: v.sido, sigungu: v.sigungu } }));
      clearErr('region'); touch(field);
    }
    function setStaff(v) { fs[1](Object.assign({}, form, { staff: v })); clearErr('staff'); touch('staff'); }

    function focusFirst(map) {
      var order = ['capital', 'region', 'staff'];
      var first = order.filter(function (k) { return map[k]; })[0];
      if (!first) return;
      setTimeout(function () {
        var el = first === 'capital' ? document.getElementById('ms-capital') : first === 'staff' ? document.getElementById('ms-staff') : document.querySelector('.search-region select');
        if (el) el.focus();
      }, 0);
    }

    function runRecommend(payload) {
      seq.current += 1;
      var mine = seq.current;
      rs[1]({ phase: 'loading', input: payload, token: saved.token });
      live[1](T.r.loadingLive);
      API.recommend(payload).then(function (r) {
        if (mine !== seq.current) return;
        if (!(r.ok && r.data)) {
          var err = r.data && r.data.error;
          if (err && err.fields) { // 서버가 알려 준 칸별 오류를 검색 카드에 표시해요
            var map = { capital: 'capital', region: 'region', district: 'region', staff: 'staff' };
            var ne = {};
            Object.keys(err.fields).forEach(function (k) { if (map[k]) ne[map[k]] = '오류: ' + err.fields[k]; });
            es[1](ne); focusFirst(ne);
            rs[1](saved.res && saved.res.phase === 'done' ? saved.res : { phase: 'idle' });
            live[1]('');
            if (!Object.keys(ne).length) srv[1](err.message || T.loadFail);
            return;
          }
          rs[1]({ phase: 'error', input: payload, error: r.network ? T.loadFail : ((err && err.message) || T.loadFail) });
          live[1]('');
          return;
        }
        var data = r.data;
        var cards = data.brands || [];
        var pickCard = cards.filter(function (c) { return c.fit === 'ok' || c.fit === 'tight'; })[0]
          || cards.filter(function (c) { return c.fit === 'short'; })[0] || null; // 기본으로 열어 둘 브랜드(정렬 1순위)
        var finish = function (initial) {
          if (mine !== seq.current) return;
          var token = (saved.token || 0) + 1;
          saved.token = token;
          rs[1]({ phase: 'done', input: payload, data: data, initial: initial, token: token });
          ss[1](pickCard ? pickCard.id : null);
          fl[1]('all');
          var c = data.counts || {}, g = data.geo || {};
          API.event('recommend_viewed', { region: g.region_code || payload.region, district: g.district_code || 'all', fit_ok: c.ok || 0, fit_tight: c.tight || 0, fit_short: c.short || 0, fit_insufficient: c.insufficient || 0 });
          if (API.onceFlag('result_viewed')) API.event('result_viewed', { region: payload.region, choice: 'recommend', status: 'ok' });
        };
        if (!pickCard) { finish(null); return; }
        var p = { brand_id: pickCard.id, region: payload.region, staff: payload.staff, capital: payload.capital };
        if (payload.district) p.district = payload.district;
        API.estimate(p).then(function (er) { finish(er.ok && er.data ? { id: pickCard.id, data: er.data } : null); });
      });
    }

    function submit() {
      var e = {};
      var cap = form.capital;
      if (cap == null || !(cap >= CAP_MIN && cap <= CAP_MAX)) e.capital = '오류: ' + T.s1.errCapital;
      if (!form.region.sido) e.region = '오류: ' + T.s1.errRegion;
      if (form.staff === '' || form.staff == null) e.staff = '오류: ' + T.s1.errStaff;
      var keys = Object.keys(e);
      if (keys.length) {
        es[1](e); srv[1]('');
        API.event('input_error', { fields: keys });
        focusFirst(e);
        return;
      }
      es[1]({}); srv[1]('');
      var payload = { capital: cap, region: regionByName(form.region.sido).code, staff: parseInt(form.staff, 10) };
      if (form.region.sigungu) {
        var child = regionByName(form.region.sido).children.filter(function (c) { return c.label === form.region.sigungu; })[0];
        if (child) payload.district = child.value;
      }
      runRecommend(payload);
    }

    // 결과가 다 만들어지면 #result 로 부드럽게 스크롤하고 제목으로 포커스를 옮겨요(해시는 그대로).
    useEffect(function () {
      if (res.phase !== 'done' || !res.token || res.token === scrolled.current) return;
      scrolled.current = res.token;
      live[1](T.r.live);
      var raf = requestAnimationFrame(function () {
        U.scrollToEl(document.getElementById('result'));
        var t = document.getElementById('result-title');
        if (t) t.focus({ preventScroll: true });
      });
      return function () { cancelAnimationFrame(raf); };
    }, [res.phase, res.token]);

    function pick(id) {
      ss[1](id);
      API.event('brand_picked', { brand_id: id });
      setTimeout(function () {
        U.scrollToEl(document.getElementById('detail'));
        var t = document.getElementById('detail-title'); if (t) t.focus({ preventScroll: true });
      }, 80);
    }
    function backToSearch() {
      U.scrollToEl(document.getElementById('search'));
      setTimeout(function () { var el = document.getElementById('ms-capital'); if (el) el.focus({ preventScroll: true }); }, 400);
    }

    var staffOpts = opts.staff_options.filter(function (n) { return n >= 1; }).map(function (n) { return { value: String(n), label: T.s1.staffLabel(n) }; });
    var errCount = Object.keys(errors).length;
    var busy = res.phase === 'loading';
    var mobile = U.useMobile(); // 좁은 화면에서는 신뢰 문구를 검색 카드 아래로 내려 카드가 제목 바로 아래에서 시작하게 해요
    var trustEl = h('ul', { className: 'trust-line' }, T.home.trust.map(function (t, i) { return h('li', { key: i }, t); }));

    return h(React.Fragment, null,
      h('section', { className: 'ms-hero home-hero' },
        h('div', { className: 'ms-hero__in' },
          h('h1', { className: 'display-xl hero-title' }, T.home.heroLines.map(function (l, i) { return h('span', { key: i, className: 'hero-line' }, l); })),
          mobile ? null : trustEl)),
      h('div', { className: 'ms-container search-wrap', id: 'search' },
        h(C.SearchBar, {
          label: T.home.cardLabel, weights: [1.4, 2.5, 1.1], submitLabel: busy ? T.s1.submitting : T.s1.submit, submitDisabled: busy, onSubmit: submit,
          slots: [
            h(C.NumberField, {
              id: 'ms-capital', variant: 'bare', label: T.s1.capital, value: form.capital, onChange: setCapital, placeholder: T.s1.capitalPlaceholder,
              hint: T.s1.capitalHint, error: errors.capital, presets: [3000, 5000, 10000, 20000]
            }),
            h('div', { className: 'search-region' }, h(C.RegionSelect, {
              variant: 'bare', regions: regionObj, value: form.region, onChange: setRegion, sidoLabel: T.s1.sido, sigunguLabel: T.s1.sigungu, error: errors.region
            })),
            h(C.SelectField, {
              id: 'ms-staff', variant: 'bare', label: T.s1.staff, placeholder: T.s1.staffPlaceholder, options: staffOpts, value: form.staff,
              onChange: setStaff, error: errors.staff
            })
          ]
        }),
        h('div', { className: 'search-after' },
          errCount ? h(C.Notice, { tone: 'danger' }, T.s1.errSummary) : null,
          srv[0] ? h(C.Notice, { tone: 'danger' }, srv[0]) : null,
          h('p', { className: 'body-sm ink-muted', style: { margin: 0 } }, T.s1.cardNote),
          mobile ? trustEl : null)),
      h('div', { className: 'ms-sr', role: 'status', 'aria-live': 'polite', id: 'result-live' }, live[0]),
      res.phase !== 'idle' ? h(ResultSection, {
        key: res.token, res: res, opts: opts, selected: selected, onPick: pick, filter: fl[0], setFilter: fl[1],
        onChange: backToSearch, onRetry: function () { runRecommend(res.input); }
      }) : null);
  }

  window.MSHome = { ScreenHome: ScreenHome, lastInput: function () { return saved.res && saved.res.input ? saved.res.input : null; } };
})();
