/* @ds-bundle: {"format":4,"namespace":"MiriSajang","components":[{"name":"SiteHeader"},{"name":"SiteFooter"},{"name":"Button"},{"name":"Badge"},{"name":"Notice"},{"name":"Chip"},{"name":"FilterChips"},{"name":"Tabs"},{"name":"Accordion"},{"name":"Card"},{"name":"Skeleton"},{"name":"Divider"},{"name":"SelectField"},{"name":"NumberField"},{"name":"RegionSelect"},{"name":"SearchBar"},{"name":"ShapeLogo"},{"name":"BrandCard"},{"name":"RangeFigure"},{"name":"RangeBar"},{"name":"CapitalFitBar"},{"name":"BreakevenGauge"},{"name":"StackedBar"},{"name":"BarCompare"},{"name":"Donut"},{"name":"Ledger"},{"name":"AccuracyMeter"},{"name":"DataStatus"},{"name":"LockedBlur"},{"name":"CompareTable"},{"name":"PriceCard"},{"name":"TestimonialCard"},{"name":"AICommentCard"},{"name":"AIProgress"},{"name":"ProgressSteps"}]} */
(function () {
  'use strict';
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useId = React.useId;
  var MINUS = '−';

  function cx() { var o = []; for (var i = 0; i < arguments.length; i++) { if (arguments[i]) o.push(arguments[i]); } return o.join(' '); }
  function safeId(prefix) { var raw = useId ? useId() : String(Math.random()).slice(2); return prefix + String(raw).replace(/[^A-Za-z0-9_-]/g, ''); }
  /* measure the container so SVG text stays at its real pixel size */
  function useWidth(ref) {
    var st = useState(640), w = st[0], setW = st[1];
    useEffect(function () {
      var el = ref.current; if (!el || typeof ResizeObserver === 'undefined') return undefined;
      var ro = new ResizeObserver(function (en) { var cw = Math.round(en[0].contentRect.width); if (cw > 0) setW(Math.max(260, Math.min(cw, 720))); });
      ro.observe(el); return function () { ro.disconnect(); };
    }, []);
    return w;
  }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }

  /* ---------- number formatting (all money is in 만 원 units) ---------- */
  function man(n) {
    if (!isNum(n)) return '';
    var neg = n < 0, a = Math.abs(Math.round(n));
    if (a === 0) return '0';
    var s;
    if (a >= 10000) { var e = Math.floor(a / 10000), r = a % 10000; s = e.toLocaleString('ko-KR') + '억' + (r ? ' ' + r.toLocaleString('ko-KR') + '만' : ''); }
    else s = a.toLocaleString('ko-KR') + '만';
    return (neg ? MINUS : '') + s;
  }
  function manWon(n) { return man(n) + (n === 0 ? '' : '') + ' 원'; }
  function range(lo, hi) { return man(lo) + ' ~ ' + man(hi) + ' 원'; }
  var fmt = { man: man, won: manWon, range: range };
  function fitStatus(capital, mine) {
    if (!capital || !isNum(capital.low) || !isNum(capital.high) || !isNum(mine)) return 'nodata';
    if (mine >= capital.high) return 'fit';
    if (mine >= capital.low) return 'tight';
    return 'short';
  }
  var STATUS = {
    fit: { tone: 'success', text: '내 자본으로 가능' },
    tight: { tone: 'warning', text: '빠듯해요' },
    short: { tone: 'danger', text: '자본이 모자라요' },
    nodata: { tone: 'neutral', text: '자료 부족' }
  };

  /* ---------- icons (decorative, aria-hidden) ---------- */
  function svg(vb, children, extra) { return h('svg', Object.assign({ viewBox: vb, width: 16, height: 16, 'aria-hidden': 'true', focusable: 'false', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }, extra || {}), children); }
  var Icon = {
    check: function () { return svg('0 0 16 16', h('path', { d: 'M3 8.5l3.2 3.2L13 4.8' })); },
    chev: function () { return svg('0 0 20 20', h('path', { d: 'M5 7.5l5 5 5-5' }), { width: 20, height: 20 }); },
    lock: function () { return svg('0 0 16 16', [h('rect', { key: 'a', x: 3, y: 7, width: 10, height: 7, rx: 2, fill: 'currentColor', stroke: 'none' }), h('path', { key: 'b', d: 'M5.2 7V5.2a2.8 2.8 0 015.6 0V7' })]); },
    dash: function () { return svg('0 0 16 16', h('path', { d: 'M4 8h8' })); },
    info: function () { return svg('0 0 16 16', [h('circle', { key: 'a', cx: 8, cy: 8, r: 6.2 }), h('path', { key: 'b', d: 'M8 7.4V11M8 5v.1' })]); },
    clock: function () { return svg('0 0 16 16', [h('circle', { key: 'a', cx: 8, cy: 8, r: 6.2 }), h('path', { key: 'b', d: 'M8 4.8V8l2.2 1.4' })]); },
    flask: function () { return svg('0 0 16 16', h('path', { d: 'M6 2.5h4M6.5 2.5v4L3 12.6a1 1 0 00.9 1.4h8.2a1 1 0 00.9-1.4L9.5 6.5v-4' })); }
  };

  /* ============================================================ common */
  function SiteHeader(p) {
    var items = p.items || [];
    return h('header', { className: cx('ms-header', p.className) },
      h('div', { className: 'ms-header__in' },
        h('a', { className: 'ms-header__logo', href: p.logoHref || '/' }, p.logo || '미리사장'),
        h('nav', { className: 'ms-header__nav', 'aria-label': p.navLabel || '주 메뉴' },
          h('ul', { className: 'ms-header__list' }, items.map(function (it, i) {
            return h('li', { key: i }, h('a', { className: 'ms-header__link', href: it.href, 'aria-current': it.current ? 'page' : undefined }, it.label));
          })))));
  }

  function SiteFooter(p) {
    return h('footer', { className: cx('ms-footer', p.className) },
      h('div', { className: 'ms-footer__in' },
        h('div', null, h('p', { className: 'ms-footer__name' }, p.name || '미리사장'), p.about ? h('p', { className: 'ms-footer__about' }, p.about) : null),
        h('nav', { className: 'ms-footer__nav', 'aria-label': p.navLabel || '바닥 메뉴' },
          h('ul', null, (p.links || []).map(function (l, i) { return h('li', { key: i }, h('a', { href: l.href }, l.label)); }))),
        p.notes && p.notes.length ? h('ul', { className: 'ms-footer__notes' }, p.notes.slice(0, 3).map(function (n, i) { return h('li', { key: i }, n); })) : null,
        p.privacy ? h('p', { className: 'ms-footer__privacy' }, p.privacy) : null));
  }

  function Button(p) {
    var variant = p.variant || 'primary', size = p.size || 'md';
    var cls = cx('ms-btn', 'ms-btn--' + variant, size !== 'md' && 'ms-btn--' + size, p.fullWidth && 'ms-btn--block', p.className);
    if (p.href) {
      return h('a', { className: cls, href: p.disabled ? undefined : p.href, 'aria-disabled': p.disabled ? 'true' : undefined, role: p.disabled ? 'link' : undefined, tabIndex: p.disabled ? -1 : undefined, onClick: p.disabled ? function (e) { e.preventDefault(); } : p.onClick }, p.children);
    }
    return h('button', { className: cls, type: p.type || 'button', disabled: !!p.disabled, onClick: p.onClick, 'aria-label': p.ariaLabel }, p.children);
  }

  var BADGE_DEFAULT = { estimate: '추정', locked: '유료', ai: 'AI' };
  function Badge(p) {
    var tone = p.tone || 'neutral';
    var text = p.children != null ? p.children : BADGE_DEFAULT[tone];
    var lead = tone === 'locked' ? Icon.lock() : tone === 'estimate' ? h('span', { 'aria-hidden': 'true' }, '≈') : tone === 'success' ? Icon.check() : null;
    return h('span', { className: cx('ms-badge', 'ms-badge--' + tone, p.size === 'md' && 'ms-badge--md', p.className) }, lead, text);
  }

  var NOTICE_TAG = { info: '안내', warn: '주의', danger: '오류', ai: 'AI' };
  function Notice(p) {
    var tone = p.tone || 'info';
    var body = h('div', { className: 'ms-notice__body' }, p.title ? h('strong', { className: 'ms-notice__title' }, p.title) : null, p.children);
    return h('div', { className: cx('ms-notice', 'ms-notice--' + tone, p.className), role: tone === 'danger' ? 'alert' : 'note' },
      h('span', { className: 'ms-notice__tag' }, p.tag || NOTICE_TAG[tone]),
      tone === 'ai' ? h('div', { className: 'ms-notice__body' }, h('div', { style: { marginBottom: 4 } }, aiStatusBadge(p.status)), p.title ? h('strong', { className: 'ms-notice__title' }, p.title) : null, p.children) : body);
  }

  function Chip(p) {
    return h('button', { type: 'button', className: cx('ms-chip', p.className), 'aria-pressed': p.selected ? 'true' : 'false', disabled: !!p.disabled, onClick: p.onClick }, p.children);
  }
  function FilterChips(p) {
    var opts = (p.options || []).map(function (o) { return typeof o === 'string' ? { value: o, label: o } : o; });
    var multi = !!p.multiple;
    function sel(v) { return multi ? (p.value || []).indexOf(v) >= 0 : p.value === v; }
    function click(v) {
      if (!p.onChange) return;
      if (multi) { var cur = (p.value || []).slice(); var i = cur.indexOf(v); if (i >= 0) cur.splice(i, 1); else cur.push(v); p.onChange(cur); }
      else p.onChange(v);
    }
    return h('div', { className: cx('ms-chips', p.className), role: 'group', 'aria-label': p.label }, opts.map(function (o) {
      return h(Chip, { key: o.value, selected: sel(o.value), disabled: o.disabled, onClick: function () { click(o.value); } }, o.label);
    }));
  }

  function Tabs(p) {
    var tabs = p.tabs || [];
    var st = useState(p.defaultValue || (tabs[0] && tabs[0].id));
    var value = p.value != null ? p.value : st[0];
    var base = safeId('ms-tabs-');
    function select(id) { if (p.value == null) st[1](id); if (p.onChange) p.onChange(id); }
    function onKey(e, i) {
      var n = tabs.length, j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % n; else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1;
      if (j == null) return;
      e.preventDefault(); select(tabs[j].id);
      var el = document.getElementById(base + '-t-' + tabs[j].id); if (el) el.focus();
    }
    var cur = tabs.filter(function (t) { return t.id === value; })[0];
    return h('div', { className: cx('ms-tabs', p.className) },
      h('div', { className: 'ms-tabs__list', role: 'tablist', 'aria-label': p.label }, tabs.map(function (t, i) {
        var on = t.id === value;
        return h('button', { key: t.id, id: base + '-t-' + t.id, type: 'button', role: 'tab', className: 'ms-tabs__tab', 'aria-selected': on ? 'true' : 'false', 'aria-controls': base + '-p', tabIndex: on ? 0 : -1, onClick: function () { select(t.id); }, onKeyDown: function (e) { onKey(e, i); } }, t.label);
      })),
      h('div', { id: base + '-p', role: 'tabpanel', className: 'ms-tabs__panel', 'aria-labelledby': cur ? base + '-t-' + cur.id : undefined, tabIndex: 0 }, cur ? cur.content : null));
  }

  function Accordion(p) {
    return h('div', { className: cx('ms-acc', p.className) }, (p.items || []).map(function (it, i) {
      return h('details', { key: i, className: 'ms-acc__item', open: p.defaultOpenIndex === i ? true : undefined },
        h('summary', { className: 'ms-acc__q' }, h('span', null, it.q), Icon.chev()),
        h('div', { className: 'ms-acc__a' }, it.a));
    }));
  }

  function Card(p) {
    var tone = p.tone === 'emphasis' ? 'emphasis' : 'default';
    return h(p.as || 'div', { className: cx('ms-card', tone === 'emphasis' && 'ms-card--emphasis', p.flat && 'ms-card--flat', p.className), style: p.style }, p.children);
  }

  function Skeleton(p) {
    var lines = p.lines || 0;
    var inner = lines ? h('div', { className: 'ms-skeleton-group' }, Array.apply(null, Array(lines)).map(function (_, i) { return h('span', { key: i, className: 'ms-skeleton', style: { height: p.height || 16, width: i === lines - 1 && lines > 1 ? '60%' : '100%' } }); }))
      : h('span', { className: 'ms-skeleton', style: { width: p.width || '100%', height: p.height || 20, borderRadius: p.circle ? '999px' : undefined } });
    return h('div', { className: p.className, role: 'status', 'aria-busy': 'true' }, h('span', { className: 'ms-sr' }, p.label || '불러오는 중이에요'), h('div', { 'aria-hidden': 'true' }, inner));
  }

  function Divider(p) {
    if (p.label) return h('div', { className: cx('ms-divider--labeled', p.className), role: 'separator' }, p.label);
    return h('hr', { className: cx('ms-divider', p.className) });
  }

  /* ============================================================ inputs */
  function SelectField(p) {
    var id = p.id || safeId('ms-sel-'), msgId = id + '-msg';
    var opts = (p.options || []).map(function (o) { return typeof o === 'string' ? { value: o, label: o } : o; });
    var msg = p.error || p.hint;
    return h('div', { className: cx('ms-field', p.variant === 'bare' && 'ms-field--bare', p.error && 'ms-field--invalid', p.disabled && 'ms-field--disabled', p.className) },
      h('label', { className: 'ms-field__label', htmlFor: id }, p.label, p.required ? h('span', { className: 'ms-field__req', 'aria-hidden': 'true' }, '*') : null),
      h('div', { className: 'ms-field__control' },
        h('select', { id: id, className: 'ms-field__select', value: p.value == null ? '' : p.value, disabled: !!p.disabled, required: !!p.required, 'aria-invalid': p.error ? 'true' : undefined, 'aria-describedby': msg ? msgId : undefined, onChange: function (e) { if (p.onChange) p.onChange(e.target.value, e); } },
          p.placeholder != null ? h('option', { value: '' }, p.placeholder) : null,
          opts.map(function (o) { return h('option', { key: o.value, value: o.value, disabled: o.disabled }, o.label); })),
        h('span', { className: 'ms-field__chev' }, Icon.chev())),
      h('p', { id: msgId, className: cx('ms-field__msg', p.error && 'ms-field__msg--error'), 'aria-live': 'polite' }, msg || null));
  }

  function NumberField(p) {
    var id = p.id || safeId('ms-num-'), msgId = id + '-msg';
    var unit = p.unit == null ? '만 원' : p.unit;
    var v = isNum(p.value) ? p.value : null;
    var rangeErr = null;
    if (v != null && ((isNum(p.min) && v < p.min) || (isNum(p.max) && v > p.max))) {
      rangeErr = (isNum(p.min) ? man(p.min) : '') + ' ~ ' + (isNum(p.max) ? man(p.max) : '') + ' 원 사이로 입력해 주세요';
    }
    var error = p.error || rangeErr;
    var hint = p.hint;
    var preview = v != null && unit === '만 원' ? h('span', { className: 'ms-field__preview ms-num' }, '= ' + man(v) + ' 원') : null;
    function onInput(e) {
      var raw = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
      if (p.onChange) p.onChange(raw === '' ? null : parseInt(raw, 10), e);
    }
    return h('div', { className: cx('ms-field', p.variant === 'bare' && 'ms-field--bare', error && 'ms-field--invalid', p.disabled && 'ms-field--disabled', p.className) },
      h('label', { className: 'ms-field__label', htmlFor: id }, p.label, p.required ? h('span', { className: 'ms-field__req', 'aria-hidden': 'true' }, '*') : null),
      h('div', { className: 'ms-field__control' },
        h('input', { id: id, className: cx('ms-field__input', 'ms-num'), type: 'text', inputMode: 'numeric', pattern: '[0-9]*', autoComplete: 'off', value: v == null ? '' : String(v), placeholder: p.placeholder, disabled: !!p.disabled, required: !!p.required, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': msgId, onChange: onInput }),
        unit ? h('span', { className: 'ms-field__unit', 'aria-hidden': 'true' }, unit) : null),
      h('p', { id: msgId, className: cx('ms-field__msg', error && 'ms-field__msg--error'), 'aria-live': 'polite' }, error ? error : [hint, hint && preview ? ' ' : null, preview]),
      p.presets && p.presets.length ? h('div', { className: 'ms-presets', role: 'group', 'aria-label': (p.label || '') + ' 빠른 선택' }, p.presets.map(function (n) {
        return h(Chip, { key: n, selected: v === n, onClick: function () { if (p.onChange) p.onChange(n); } }, man(n) + ' 원');
      })) : null);
  }

  function RegionSelect(p) {
    var regions = p.regions || {};
    var val = p.value || { sido: '', sigungu: '' };
    var sidos = Object.keys(regions);
    var sub = val.sido && regions[val.sido] ? regions[val.sido] : [];
    return h('div', { className: cx('ms-region', p.className) },
      h(SelectField, { label: p.sidoLabel || '시·도', variant: p.variant, options: sidos, placeholder: '시·도를 골라 주세요', value: val.sido, error: p.error, onChange: function (v) { if (p.onChange) p.onChange({ sido: v, sigungu: '' }); } }),
      h(SelectField, { label: p.sigunguLabel || '시·군·구', variant: p.variant, options: sub, placeholder: val.sido ? '시·군·구를 골라 주세요' : '먼저 시·도를 골라 주세요', value: val.sigungu, disabled: !val.sido, onChange: function (v) { if (p.onChange) p.onChange({ sido: val.sido, sigungu: v }); } }));
  }

  function SearchBar(p) {
    var slots = p.slots || [];
    return h('form', { className: cx('ms-search', p.overlap !== false && 'ms-search--overlap', p.className), role: 'search', 'aria-label': p.label, style: { '--ms-cols': (p.weights || slots.map(function () { return 1; })).map(function (x) { return 'minmax(0,' + x + 'fr)'; }).join(' ') + ' auto' }, onSubmit: function (e) { if (p.onSubmit) { e.preventDefault(); p.onSubmit(e); } } },
      slots.map(function (s, i) { return h('div', { key: i, className: 'ms-search__slot' }, s); }),
      h('div', { className: 'ms-search__go' }, h(Button, { type: 'submit', size: 'lg', variant: 'primary', disabled: p.submitDisabled }, p.submitLabel || '결과 보기')));
  }

  /* ============================================================ brand */
  var DARK_TEXT = { accent: 1, sand: 1 };
  function ShapeLogo(p) {
    var shape = p.shape || 'circle', tone = p.tone || 'brand', size = p.size || 'md';
    var W = shape === 'pill' ? 72 : 48, H = 48;
    var cls = 'ms-logo__shape ms-logo__shape--' + tone;
        var el;
    if (shape === 'circle') el = h('circle', { cx: 24, cy: 24, r: 24, className: cls });
    else if (shape === 'square') el = h('rect', { x: 0, y: 0, width: 48, height: 48, rx: 12, className: cls });
    else if (shape === 'triangle') el = h('polygon', { points: '24,5 44,42 4,42', className: cls });
    else if (shape === 'diamond') el = h('polygon', { points: '24,3 45,24 24,45 3,24', className: cls });
    else if (shape === 'hexagon') el = h('polygon', { points: '24,2 43,13 43,35 24,46 5,35 5,13', className: cls });
    else el = h('rect', { x: 0, y: 0, width: 72, height: 48, rx: 24, className: cls });
    var ty = shape === 'triangle' ? 36 : 24;
    return h('span', { className: cx('ms-logo', 'ms-logo--' + size, shape === 'pill' && 'ms-logo--pill-shape', p.className), role: 'img', 'aria-label': p.label || '로고 자리' },
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' }, el,
        p.initial ? h('text', { x: W / 2, y: ty, textAnchor: 'middle', dominantBaseline: 'central', fontSize: shape === 'triangle' ? 18 : 22, fontWeight: 700, fontFamily: 'var(--font-display)', className: DARK_TEXT[tone] ? 'ms-logo__text--dark' : 'ms-logo__text--light' }, String(p.initial).slice(0, 1)) : null));
  }

  /* shared chart bits */
  var SERIES = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-neutral'];
  var SERIES_LIGHT_TEXT = [true, true, false, false, false, false];
  function patDefs(id) {
    function pat(i, kind, line) {
      var kids = [h('rect', { key: 'r', width: 8, height: 8, style: { fill: 'var(--' + SERIES[i] + ')' } })];
      if (kind === 'diag') kids.push(h('path', { key: 'p', d: 'M-2 2l4-4M0 8l8-8M6 10l4-4', style: { stroke: line, strokeWidth: 1.6 } }));
      if (kind === 'dots') kids.push(h('circle', { key: 'p', cx: 4, cy: 4, r: 1.4, style: { fill: line } }));
      if (kind === 'vert') kids.push(h('path', { key: 'p', d: 'M2 0v8M6 0v8', style: { stroke: line, strokeWidth: 1.4 } }));
      if (kind === 'cross') kids.push(h('path', { key: 'p', d: 'M0 4h8M4 0v8', style: { stroke: line, strokeWidth: 1.2 } }));
      if (kind === 'thin') kids.push(h('path', { key: 'p', d: 'M-2 6l8-8M2 10l8-8', style: { stroke: line, strokeWidth: 1.2 } }));
      return h('pattern', { key: i, id: id + '-s' + i, width: 8, height: 8, patternUnits: 'userSpaceOnUse' }, kids);
    }
    var dark = 'var(--chart-outline)', light = 'var(--bg)';
    return [pat(0, 'none', light), pat(1, 'diag', light), pat(2, 'dots', dark), pat(3, 'vert', dark), pat(4, 'cross', dark), pat(5, 'thin', dark),
      h('pattern', { key: 'loss', id: id + '-loss', width: 8, height: 8, patternUnits: 'userSpaceOnUse' }, h('rect', { width: 8, height: 8, style: { fill: 'var(--danger-line)' } }), h('path', { d: 'M-2 2l4-4M0 8l8-8M6 10l4-4', style: { stroke: 'var(--bg)', strokeWidth: 1.6 } })),
      h('pattern', { key: 'gain', id: id + '-gain', width: 8, height: 8, patternUnits: 'userSpaceOnUse' }, h('rect', { width: 8, height: 8, style: { fill: 'var(--success-line)' } }), h('circle', { cx: 4, cy: 4, r: 1.3, style: { fill: 'var(--bg)' } })),
      h('pattern', { key: 'rng', id: id + '-rng', width: 8, height: 8, patternUnits: 'userSpaceOnUse' }, h('rect', { width: 8, height: 8, style: { fill: 'var(--chart-4)' } }), h('path', { d: 'M2 0v8M6 0v8', style: { stroke: 'var(--chart-outline)', strokeWidth: 1 } }))];
  }
  function swatch(id, key, size) { return h('svg', { width: size || 16, height: size || 16, 'aria-hidden': 'true', focusable: 'false' }, h('rect', { x: 1, y: 1, width: (size || 16) - 2, height: (size || 16) - 2, rx: 3, className: 'ms-chart__mark', style: { fill: 'url(#' + id + '-' + key + ')' } })); }
  function scale(min, max, x0, x1) { return function (v) { return x0 + (v - min) / (max - min) * (x1 - x0); }; }
  function clampAnchor(x, w, pad) { if (x < pad) return 'start'; if (x > w - pad) return 'end'; return 'middle'; }

  /* ---------- RangeFigure ---------- */
  function RangeFigure(p) {
    var missing = p.missing || !isNum(p.low) || !isNum(p.high);
    return h('div', { className: cx('ms-fig', p.size === 'lg' && 'ms-fig--lg', p.className) },
      h('div', { className: 'ms-fig__top' }, h('span', null, p.label), !missing && p.estimate !== false ? h(Badge, { tone: 'estimate' }) : null, missing ? h(Badge, { tone: 'neutral' }, '자료 부족') : null),
      missing ? h('div', { className: 'ms-fig__value ms-fig__value--missing' }, '자료 부족') : h('div', { className: 'ms-fig__value' }, range(p.low, p.high)),
      (p.note || missing) ? h('p', { className: 'ms-fig__note' }, missing ? (p.missingNote || '이 항목은 확인된 자료가 부족해 숫자를 보여드리지 않아요.') : p.note) : null);
  }

  /* ---------- RangeBar ---------- */
  function RangeBar(p) {
    var id = safeId('ms-rb-'), ref = useRef(null), W = useWidth(ref);
    if (!isNum(p.low) || !isNum(p.high)) return h('div', { className: cx('ms-chart', p.className) }, p.title ? h('p', { className: 'ms-chart__title' }, p.title) : null, h(Badge, { tone: 'neutral' }, '자료 부족'));
    var lo = Math.min(p.low, p.high), hi = Math.max(p.low, p.high);
    var minV = Math.min(0, lo, isNum(p.min) ? p.min : 0), maxV = Math.max(0, hi, isNum(p.max) ? p.max : 0);
    var pad = (maxV - minV || 1) * 0.08; minV -= (minV < 0 || lo < 0 ? pad : 0); maxV += pad;
    var x = scale(minV, maxV, 24, W - 24), zx = x(0);
    var kids = [h('defs', { key: 'd' }, patDefs(id)), h('rect', { key: 't', x: 24, y: 38, width: W - 48, height: 28, rx: 4, className: 'ms-chart__track' })];
    if (lo < 0) { var lx0 = x(lo), lx1 = x(Math.min(hi, 0)); kids.push(h('rect', { key: 'l', x: lx0, y: 38, width: Math.max(lx1 - lx0, 1), height: 28, rx: 4, className: 'ms-chart__mark', style: { fill: 'url(#' + id + '-loss)' } })); }
    if (hi > 0) { var gx0 = x(Math.max(lo, 0)), gx1 = x(hi); kids.push(h('rect', { key: 'g', x: gx0, y: 38, width: Math.max(gx1 - gx0, 1), height: 28, rx: 4, className: 'ms-chart__mark', style: { fill: 'url(#' + id + '-gain)' } })); }
    kids.push(h('line', { key: 'z', x1: zx, x2: zx, y1: 28, y2: 76, className: 'ms-chart__zero' }), h('text', { key: 'zt', x: zx, y: 20, textAnchor: clampAnchor(zx, W, 30), className: 'ms-chart__text ms-chart__text--bold' }, '0 (손익 없음)'));
    var lxl = x(lo), hxl = x(hi);
    kids.push(h('text', { key: 'a', x: lxl, y: 94, textAnchor: clampAnchor(lxl, W, 50) === 'middle' ? 'end' : clampAnchor(lxl, W, 50), className: 'ms-chart__text ms-chart__text--bold' }, man(lo)), h('text', { key: 'b', x: hxl, y: 94, textAnchor: clampAnchor(hxl, W, 50) === 'middle' ? 'start' : clampAnchor(hxl, W, 50), className: 'ms-chart__text ms-chart__text--bold' }, man(hi)));
    var kind = lo >= 0 ? '범위 전체가 이익 구간이에요.' : hi <= 0 ? '범위 전체가 손실 구간이에요.' : '손실과 이익이 모두 나타날 수 있는 범위예요.';
    var label = (p.title || '월 순수익') + ' 추정 범위 ' + range(lo, hi) + '. ' + kind;
    return h('div', { ref: ref, className: cx('ms-chart', p.className) },
      p.title ? h('p', { className: 'ms-chart__title' }, p.title) : null,
      h('svg', { viewBox: '0 0 ' + W + ' 104', role: 'img', 'aria-label': label }, kids),
      h('ul', { className: 'ms-chart__legend' },
        lo < 0 ? h('li', { key: 'l' }, swatch(id, 'loss'), p.lossLabel || '손실 구간') : null,
        hi > 0 ? h('li', { key: 'g' }, swatch(id, 'gain'), p.gainLabel || '이익 구간') : null),
      h('p', { className: 'ms-chart__summary' }, h(Badge, { tone: 'estimate' }), ' ', h('b', null, range(lo, hi)), ' ', kind));
  }

  /* ---------- range with a marker: CapitalFitBar, BreakevenGauge ---------- */
  function RangeMarker(o) {
    var id = safeId('ms-rm-'), ref = useRef(null), W = useWidth(ref);
    var low = o.low, high = o.high, m = o.marker;
    if (!isNum(low) || !isNum(high)) {
      return h('div', { className: cx('ms-chart', o.className) }, o.title ? h('p', { className: 'ms-chart__title' }, o.title) : null, h(Badge, { tone: 'neutral' }, '자료 부족'), h('p', { className: 'ms-chart__summary' }, '비교할 수 있는 자료가 부족해 그래프를 그리지 않아요.'));
    }
    var hasM = isNum(m);
    var maxV = (isNum(o.max) ? o.max : Math.max(high, hasM ? m : 0) * 1.18) || 1;
    var x = scale(0, maxV, 24, W - 24), compact = !!o.compact;
    var ty = compact ? 10 : 42, th = compact ? 16 : 26;
    var kids = [h('defs', { key: 'd' }, patDefs(id)), h('rect', { key: 't', x: 24, y: ty, width: W - 48, height: th, rx: 4, className: 'ms-chart__track' }),
      h('rect', { key: 'r', x: x(low), y: ty, width: Math.max(x(high) - x(low), 2), height: th, rx: 4, className: 'ms-chart__mark', style: { fill: 'url(#' + id + '-rng)' } })];
    if (hasM) {
      var mx = x(Math.min(m, maxV));
      kids.push(h('line', { key: 'ml', x1: mx, x2: mx, y1: ty - 8, y2: ty + th + 8, className: 'ms-chart__markerline' }), h('circle', { key: 'mc', cx: mx, cy: ty - 8, r: 6, className: 'ms-chart__marker' }));
      if (!compact) kids.push(h('text', { key: 'mt', x: mx, y: 16, textAnchor: clampAnchor(mx, W, 90), className: 'ms-chart__text ms-chart__text--bold' }, (o.markerName || '내 값') + ' ' + man(m)));
    }
    if (!compact) {
      var lx = x(low), hx = x(high);
      kids.push(h('text', { key: 'a', x: lx, y: 96, textAnchor: lx < 60 ? 'start' : 'end', className: 'ms-chart__text' }, (o.lowName || '하한') + ' ' + man(low)), h('text', { key: 'b', x: hx, y: 96, textAnchor: hx > W - 60 ? 'end' : 'start', className: 'ms-chart__text' }, (o.highName || '상한') + ' ' + man(high)));
    }
    var pos = !hasM ? null : m >= high ? 'above' : m >= low ? 'inside' : 'below';
    var statusText = pos ? o.texts[pos] : '';
    var label = (o.title || '') + ' ' + (o.rangeName || '') + ' ' + range(low, high) + (hasM ? ', ' + (o.markerName || '내 값') + ' ' + manWon(m) : '') + '. ' + statusText;
    return h('div', { ref: ref, className: cx('ms-chart', o.className) },
      o.title && !compact ? h('p', { className: 'ms-chart__title' }, o.title) : null,
      h('svg', { viewBox: '0 0 ' + W + ' ' + (compact ? 36 : 104), role: 'img', 'aria-label': label }, kids),
      compact ? null : h('p', { className: 'ms-chart__summary' }, o.estimate === false ? null : h(Badge, { tone: 'estimate' }), o.estimate === false ? null : ' ', h('b', null, range(low, high)), hasM ? ' / ' + (o.markerName || '내 값') + ' ' : '', hasM ? h('b', null, manWon(m)) : null, ' ', statusText));
  }
  function CapitalFitBar(p) {
    var label = p.rangeName || '필요 자본';
    return RangeMarker({ low: p.low, high: p.high, marker: p.myCapital, max: p.max, title: p.title || label, rangeName: label, markerName: '내 자본', lowName: '최소', highName: '최대', compact: p.compact, estimate: p.estimate, className: p.className,
      texts: p.rangeName ? { above: '내 자본이 공개 비용 상한 이상이에요.', inside: '내 자본이 공개 비용 범위 안에 있어요.', below: '내 자본이 공개 비용 하한보다 적어요.' }
        : { above: '내 자본이 필요 자본 범위보다 많아요.', inside: '내 자본이 필요 자본 범위 안에 있어 빠듯할 수 있어요.', below: '내 자본이 필요 자본 범위보다 적어요.' } });
  }
  function BreakevenGauge(p) {
    return RangeMarker({ low: p.low, high: p.high, marker: p.assumed, max: p.max, title: p.title || '손익분기 월 매출', rangeName: '손익분기 월 매출', markerName: '내 가정 매출', lowName: '최소', highName: '최대', compact: p.compact, estimate: p.estimate, className: p.className,
      texts: { above: '내 가정 매출이 손익분기 범위보다 높아요.', inside: '손익분기점 근처예요. 가정에 따라 적자와 흑자가 갈릴 수 있어요.', below: '내 가정 매출이 손익분기 범위에 못 미쳐요.' } });
  }

  /* ---------- legend ---------- */
  function legendList(id, items, total, cls) {
    return h('ul', { className: cls || 'ms-legend-list' }, items.map(function (it, i) {
      var pct = total ? Math.round(it.value / total * 100) : 0;
      return h('li', { key: i }, swatch(id, 's' + Math.min(i, 5)), h('span', null, it.label), h('span', { className: 'ms-num' }, man(it.value) + ' 원 · ' + pct + '%'));
    }));
  }
  function StackedBar(p) {
    var id = safeId('ms-sb-'), ref = useRef(null), W = useWidth(ref), items = (p.items || []).filter(function (i) { return isNum(i.value) && i.value > 0; }).slice(0, 6);
    var total = items.reduce(function (a, b) { return a + b.value; }, 0);
    if (!total) return h('div', { className: cx('ms-chart', p.className) }, h(Badge, { tone: 'neutral' }, '자료 부족'));
    var x = 0, kids = [h('defs', { key: 'd' }, patDefs(id)), h('clipPath', { key: 'c', id: id + '-clip' }, h('rect', { x: 0, y: 0, width: W, height: 48, rx: 8 }))];
    var segs = items.map(function (it, i) {
      var w = it.value / total * W, g = h('g', { key: i }, h('rect', { x: x, y: 0, width: w, height: 48, className: 'ms-chart__mark', style: { fill: 'url(#' + id + '-s' + i + ')' } }),
        w >= 56 ? h('g', null, h('rect', { x: x + w / 2 - 22, y: 14, width: 44, height: 20, rx: 6, style: { fill: 'var(--bg)' } }), h('text', { x: x + w / 2, y: 24, textAnchor: 'middle', dominantBaseline: 'central', className: 'ms-chart__text ms-chart__text--bold' }, Math.round(it.value / total * 100) + '%')) : null);
      x += w; return g;
    });
    kids.push(h('g', { key: 'g', clipPath: 'url(#' + id + '-clip)' }, segs), h('rect', { key: 'o', x: 0.75, y: 0.75, width: W - 1.5, height: 46.5, rx: 8, fill: 'none', style: { stroke: 'var(--chart-outline)', strokeWidth: 1.5 } }));
    var summary = (p.title || '비용 구조') + ': ' + items.map(function (it) { return it.label + ' ' + Math.round(it.value / total * 100) + '%'; }).join(', ');
    return h('div', { ref: ref, className: cx('ms-chart', p.className) },
      p.title ? h('p', { className: 'ms-chart__title' }, p.title) : null,
      h('svg', { viewBox: '0 0 ' + W + ' 48', role: 'img', 'aria-label': summary }, kids),
      legendList(id, items, total),
      h('p', { className: 'ms-chart__summary' }, (p.totalLabel || '합계') + ' ', h('b', null, manWon(total)), p.estimate === false ? null : ' ', p.estimate === false ? null : h(Badge, { tone: 'estimate' })));
  }

  function Donut(p) {
    var id = safeId('ms-dn-'), items = (p.items || []).filter(function (i) { return isNum(i.value) && i.value > 0; }).slice(0, 6);
    var total = items.reduce(function (a, b) { return a + b.value; }, 0);
    if (!total) return h('div', { className: cx('ms-chart', p.className) }, h(Badge, { tone: 'neutral' }, '자료 부족'));
    var cx0 = 80, cy0 = 80, r1 = 74, r0 = 46, a = -Math.PI / 2;
    function pt(r, ang) { return [cx0 + r * Math.cos(ang), cy0 + r * Math.sin(ang)]; }
    var paths = items.map(function (it, i) {
      var sweep = Math.min(it.value / total * Math.PI * 2, Math.PI * 2 - 0.0001), a1 = a + sweep, large = sweep > Math.PI ? 1 : 0;
      var p1 = pt(r1, a), p2 = pt(r1, a1), p3 = pt(r0, a1), p4 = pt(r0, a);
      var d = 'M' + p1[0] + ' ' + p1[1] + 'A' + r1 + ' ' + r1 + ' 0 ' + large + ' 1 ' + p2[0] + ' ' + p2[1] + 'L' + p3[0] + ' ' + p3[1] + 'A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + p4[0] + ' ' + p4[1] + 'Z';
      a = a1; return h('path', { key: i, d: d, className: 'ms-chart__mark', style: { fill: 'url(#' + id + '-s' + i + ')' } });
    });
    var summary = (p.title || '구성') + ': ' + items.map(function (it) { return it.label + ' ' + Math.round(it.value / total * 100) + '%'; }).join(', ');
    return h('div', { className: cx('ms-chart', p.className) }, p.title ? h('p', { className: 'ms-chart__title' }, p.title) : null,
      h('div', { className: 'ms-donut' },
        h('div', { className: 'ms-donut__fig' }, h('svg', { viewBox: '0 0 160 160', role: 'img', 'aria-label': summary }, h('defs', null, patDefs(id)), paths,
          h('text', { x: 80, y: 74, textAnchor: 'middle', className: 'ms-chart__text ms-chart__text--muted' }, p.centerLabel || '합계'), h('text', { x: 80, y: 94, textAnchor: 'middle', className: 'ms-chart__text ms-chart__text--bold', style: { fontSize: 15 } }, p.centerValue || man(total)))),
        h('div', { className: 'ms-donut__legend' }, legendList(id, items, total))));
  }

  /* ---------- BarCompare ---------- */
  var PAT_CSS = [
    'none',
    'repeating-linear-gradient(45deg, rgba(255,255,255,0.9) 0 2px, transparent 2px 7px)',
    'radial-gradient(var(--chart-outline) 1.3px, transparent 1.6px) 0 0 / 7px 7px',
    'repeating-linear-gradient(90deg, var(--chart-outline) 0 1.5px, transparent 1.5px 6px)',
    'repeating-linear-gradient(0deg, var(--chart-outline) 0 1px, transparent 1px 6px), repeating-linear-gradient(90deg, var(--chart-outline) 0 1px, transparent 1px 6px)'
  ];
  function BarCompare(p) {
    var items = (p.items || []).slice(0, 4);
    var maxV = isNum(p.max) ? p.max : Math.max.apply(null, items.map(function (i) { return Math.max(isNum(i.high) ? i.high : 0, isNum(i.value) ? i.value : 0); }).concat([1])) * 1.05;
    var minV = Math.min.apply(null, items.map(function (i) { return Math.min(isNum(i.low) ? i.low : 0, isNum(i.value) ? i.value : 0); }).concat([0]));
    if (minV < 0) minV *= 1.05;
    var span = maxV - minV || 1, zeroPct = (0 - minV) / span * 100;
    var summary = (p.title || '비교') + ': ' + items.map(function (i) { return i.label + ' ' + (isNum(i.low) && isNum(i.high) ? range(i.low, i.high) : isNum(i.value) ? manWon(i.value) : '자료 부족'); }).join(', ');
    return h('div', { className: cx('ms-chart', p.className) }, p.title ? h('p', { className: 'ms-chart__title' }, p.title) : null,
      h('div', { className: 'ms-bars', role: 'group', 'aria-label': summary }, items.map(function (it, i) {
        var isRange = isNum(it.low) && isNum(it.high), has = isRange || isNum(it.value);
        var a0 = isRange ? it.low : Math.min(0, has ? it.value : 0), a1 = isRange ? it.high : has ? Math.max(0, it.value) : 0;
        var left = (a0 - minV) / span * 100, width = Math.max((a1 - a0) / span * 100, 1.5);
        return h('div', { key: i, className: 'ms-bars__row' },
          h('div', { className: 'ms-bars__label' }, it.label),
          h('div', { className: 'ms-bars__right' },
            h('div', { className: 'ms-bars__track', 'aria-hidden': 'true' }, has ? h('div', { className: 'ms-bars__fill', style: { left: left + '%', width: width + '%', backgroundColor: 'var(--' + SERIES[i] + ')', backgroundImage: PAT_CSS[i] } }) : null, minV < 0 ? h('div', { className: 'ms-bars__zero', style: { left: zeroPct + '%' } }) : null),
            h('div', { className: 'ms-bars__val' }, has ? (isRange ? range(it.low, it.high) : manWon(it.value)) : '자료 부족', has && p.estimate !== false ? h('small', null, ' 추정') : null)));
      })));
  }

  /* ---------- Ledger ---------- */
  function Ledger(p) {
    return h('div', { className: cx('ms-ledger-wrap', p.className) }, h('table', { className: 'ms-ledger' },
      p.title ? h('caption', null, p.title, p.estimate === false ? null : ' ', p.estimate === false ? null : h(Badge, { tone: 'estimate' })) : null,
      h('tbody', null, (p.rows || []).map(function (r, i) {
        var kind = r.kind || 'normal', has = isNum(r.value);
        var tag = kind === 'total' && has ? (r.value < 0 ? h('span', { className: 'ms-ledger__tag ms-ledger__tag--loss' }, '(적자)') : h('span', { className: 'ms-ledger__tag ms-ledger__tag--gain' }, '(흑자)')) : null;
        return h('tr', { key: i, className: 'ms-ledger__row--' + kind },
          h('th', { scope: 'row' }, r.label, r.note ? h('span', { className: 'ms-ledger__note' }, r.note) : null),
          h('td', null, has ? h('span', null, (r.sign || '') + manWon(r.value), tag) : h('span', { className: 'ms-ledger__missing' }, '자료 부족')));
      }))));
  }

  /* ---------- AccuracyMeter, DataStatus ---------- */
  var ACC = ['자료 없음', '낮아요', '보통이에요', '높아요'];
  function AccuracyMeter(p) {
    var lv = Math.max(0, Math.min(3, Math.round(p.level || 0)));
    return h('div', { className: cx('ms-meter', p.className) }, h('span', { className: 'ms-meter__k' }, p.label || '추정 정확도'),
      h('span', { className: 'ms-meter__cells', 'aria-hidden': 'true' }, [0, 1, 2].map(function (i) { return h('span', { key: i, className: cx('ms-meter__cell', i < lv && 'ms-meter__cell--on') }); })),
      h('span', { className: 'ms-meter__v' }, (p.texts || ACC)[lv] + ' (' + lv + '/3)'));
  }
  var DS = {
    sample: { tag: '가상 데이터', text: '시험용 가상 데이터예요. 실제 브랜드 수치가 아니에요.', icon: 'flask' },
    verified: { tag: '확인됨', text: '공개 자료로 확인한 수치예요.', icon: 'check' },
    partial: { tag: '일부 확인', text: '일부 항목만 확인됐어요.', icon: 'info' },
    missing: { tag: '자료 부족', text: '확인된 자료가 부족해 숫자를 보여드리지 않아요.', icon: 'dash' },
    updating: { tag: '평가 전', text: '가상 데이터 평가 전이에요. 결과가 바뀔 수 있어요.', icon: 'clock' }
  };
  function DataStatus(p) {
    var k = DS[p.kind] ? p.kind : 'sample', d = DS[k];
    return h('div', { className: cx('ms-status', 'ms-status--' + k, p.className), role: 'status' }, Icon[d.icon](),
      h('span', null, h('span', { className: 'ms-status__tag' }, d.tag), p.children != null ? p.children : d.text, p.source ? ' ' + p.source : '', p.date ? ' (' + p.date + ')' : ''));
  }

  /* ---------- BrandCard ---------- */
  function BrandCard(p) {
    var status = p.status || fitStatus(p.capital, p.myCapital), st = STATUS[status] || STATUS.nodata;
    var hasCap = p.capital && isNum(p.capital.low) && isNum(p.capital.high);
    var hasNet = p.netProfit && isNum(p.netProfit.low) && isNum(p.netProfit.high);
    var clickable = !!(p.onSelect || p.href);
    var nameEl;
    if (p.href) nameEl = h('a', { className: 'ms-brand__name', href: p.href }, p.name);
    else if (p.onSelect) nameEl = h('button', { type: 'button', className: 'ms-brand__name', 'aria-pressed': p.selected ? 'true' : 'false', onClick: function () { p.onSelect(p.id); } }, p.name);
    else nameEl = h('span', { className: 'ms-brand__name' }, p.name);
    return h('article', { className: cx('ms-brand', clickable && 'ms-brand--click', p.selected && 'ms-brand--selected', p.className) },
      h('div', { className: 'ms-brand__head' }, p.logo || h(ShapeLogo, { shape: 'circle', tone: 'brand', initial: (p.name || '?').charAt(0) }),
        h('div', { className: 'ms-brand__id' }, nameEl, p.category ? h(Badge, { tone: 'neutral' }, p.category) : null)),
      h('div', null, h(Badge, { tone: st.tone, size: 'md' }, p.statusText || st.text), p.selected ? h('span', { className: 'ms-brand__sel' }, ' · 선택됨') : null),
      h('div', { className: 'ms-brand__row' }, h('span', { className: 'ms-brand__k' }, (p.capitalLabel || '필요 자본') + ' ', hasCap && !p.capitalLabel ? h(Badge, { tone: 'estimate' }) : null),
        hasCap ? h('span', { className: 'ms-brand__v' }, p.capitalText || range(p.capital.low, p.capital.high)) : h('span', { className: 'ms-brand__v--missing' }, '자료 부족'),
        p.capitalNote ? h('span', { className: 'ms-brand__k' }, p.capitalNote) : null,
        p.capitalChart || (hasCap ? h(CapitalFitBar, { low: p.capital.low, high: p.capital.high, myCapital: p.myCapital, max: p.scaleMax, compact: true, rangeName: p.capitalLabel }) : null),
        p.capitalGap ? h('strong', { className: 'body-sm' }, p.capitalGap) : null,
        hasCap && !p.capitalChart && isNum(p.myCapital) ? h('span', { className: 'ms-brand__k' }, '내 자본 ' + manWon(p.myCapital)) : null),
      h('div', { className: 'ms-brand__row' }, h('span', { className: 'ms-brand__k' }, '월 순수익 ', hasNet ? h(Badge, { tone: 'estimate' }) : null),
        hasNet ? h('span', { className: 'ms-brand__v' }, range(p.netProfit.low, p.netProfit.high)) : h('span', { className: 'ms-brand__v--missing' }, '자료 부족')));
  }

  /* ============================================================ premium & trust */
  function LockedBlur(p) {
    if (p.locked === false) return h('div', { className: p.className }, p.children);
    return h('div', { className: cx('ms-lock', p.className), style: { minHeight: p.minHeight || 200 } },
      h('div', { className: 'ms-lock__body', 'aria-hidden': 'true', inert: '' }, p.children),
      h('div', { className: 'ms-lock__veil' },
        h('div', { className: 'ms-lock__plate', role: 'group', 'aria-label': p.title || '프리미엄에서 볼 수 있어요' },
          h(Badge, { tone: 'locked' }),
          h('p', { className: 'ms-lock__title' }, p.title || '프리미엄에서 볼 수 있어요'),
          p.description ? h('p', { className: 'ms-lock__desc' }, p.description) : null,
          p.action || null)));
  }

  function cell(v, id) {
    if (v === true) return h('span', { className: 'ms-cmp__mark ms-cmp__yes' }, Icon.check(), '포함');
    if (v === false || v == null) return h('span', { className: 'ms-cmp__mark ms-cmp__no' }, Icon.dash(), '없음');
    return v;
  }
  function CompareTable(p) {
    var cols = p.columns || { free: '무료', premium: '프리미엄' };
    return h('table', { className: cx('ms-cmp', p.className) },
      p.caption ? h('caption', { className: 'ms-sr' }, p.caption) : null,
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, p.rowHeader || '기능'), h('th', { scope: 'col' }, cols.free), h('th', { scope: 'col', className: 'ms-cmp__premium' }, cols.premium))),
      h('tbody', null, (p.rows || []).map(function (r, i) {
        return h('tr', { key: i }, h('th', { scope: 'row' }, r.label), h('td', { 'data-label': cols.free }, cell(r.free)), h('td', { 'data-label': cols.premium, className: 'ms-cmp__premium' }, cell(r.premium)));
      })));
  }

  function PriceCard(p) {
    return h('div', { className: cx('ms-price', p.highlight && 'ms-price--highlight', p.className) },
      h('div', { className: 'ms-price__head' }, h('h3', { className: 'ms-price__name' }, p.name), p.badge || null),
      h('div', { className: 'ms-price__amount' }, p.price),
      p.priceNote ? h('p', { className: 'ms-price__note' }, p.priceNote) : null,
      p.features && p.features.length ? h('ul', { className: 'ms-price__list' }, p.features.map(function (f, i) { return h('li', { key: i }, Icon.check(), h('span', null, f)); })) : null,
      p.action || null);
  }

  function TestimonialCard(p) {
    var kind = p.kind === 'real' ? 'real' : 'sample';
    if (p.kind !== 'real' && p.kind !== 'sample' && window.console) console.warn('TestimonialCard: kind must be "sample" or "real". Showing the sample label.');
    return h('figure', { className: cx('ms-quote', p.className), style: { margin: 0 } },
      h('div', { className: 'ms-quote__top' }, kind === 'sample' ? h(Badge, { tone: 'warning' }, '가상 예시') : h(Badge, { tone: 'neutral' }, '이용자 후기')),
      h('blockquote', { className: 'ms-quote__text', style: { margin: 0 } }, p.quote),
      h('figcaption', { className: 'ms-quote__who' }, p.logo || h(ShapeLogo, { shape: p.shape || 'circle', tone: p.tone || 'ink', size: 'sm', initial: (p.name || '?').charAt(0), label: '아바타 자리' }),
        h('div', null, h('div', { className: 'ms-quote__name' }, p.name), p.role ? h('div', { className: 'ms-quote__role' }, p.role) : null)));
  }

  function aiStatusBadge(status) {
    var s = status === 'sample' ? 'sample' : 'planned';
    if (status !== 'sample' && status !== 'planned' && window.console) console.warn('AI components need status="planned" or "sample". Showing the planned label.');
    return h('span', { style: { display: 'inline-flex', gap: 6, flexWrap: 'wrap' } }, h(Badge, { tone: 'ai' }), s === 'sample' ? h(Badge, { tone: 'warning' }, '가상 예시') : h(Badge, { tone: 'neutral' }, '준비 중 · 프리미엄 리포트에서 쓸 예정'));
  }
  function AICommentCard(p) {
    var planned = p.status !== 'sample';
    return h('section', { className: cx('ms-ai', p.className), 'aria-label': p.title || 'AI 코멘트' },
      h('div', { className: 'ms-ai__head' }, aiStatusBadge(p.status), h('span', { className: 'ms-ai__title' }, p.title || 'AI 코멘트')),
      h('div', { className: 'ms-ai__body' }, planned ? h('p', { style: { color: 'var(--ink-muted)' } }, '이 자리에는 프리미엄 리포트의 AI 코멘트가 들어올 예정이에요. 지금은 제공되지 않아요.') : p.children),
      h('p', { className: 'ms-ai__rule' }, p.rule || '입력값·계산 결과에서만 코멘트해요.'));
  }

  function prefersReduced() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function AIProgress(p) {
    var steps = p.steps || [];
    var st = useState(function () { return p.running === false ? 0 : (prefersReduced() ? steps.length : 0); });
    var idx = p.complete ? steps.length : st[0], setIdx = st[1];
    var doneRef = useRef(false);
    useEffect(function () {
      if (p.running === false || p.complete) return undefined;
      if (idx >= steps.length) { if (!doneRef.current) { doneRef.current = true; if (p.onDone) p.onDone(); } return undefined; }
      var t = setTimeout(function () { setIdx(idx + 1); }, p.stepMs || 900);
      return function () { clearTimeout(t); };
    }, [idx, p.running, p.complete, steps.length]);
    var live = idx >= steps.length ? '분석을 모두 마쳤어요' : (idx + 1) + '/' + steps.length + ' 단계 ' + steps[idx] + ' 진행 중';
    return h('section', { className: cx('ms-aip', p.className), 'aria-label': 'AI 분석 진행' },
      h('div', { className: 'ms-ai__head' }, aiStatusBadge(p.status), h('span', { className: 'ms-ai__title' }, '분석 단계')),
      h('ol', { className: 'ms-aip__list' }, steps.map(function (s, i) {
        var state = i < idx ? 'done' : i === idx ? 'active' : 'wait';
        return h('li', { key: i, className: cx('ms-aip__item', 'ms-aip__item--' + state) },
          h('span', { className: 'ms-aip__icon', 'aria-hidden': 'true' }, state === 'done' ? Icon.check() : state === 'active' ? h('span', { className: 'ms-aip__spin' }) : null),
          h('span', null, s), h('span', { className: 'ms-aip__state' }, state === 'done' ? '완료' : state === 'active' ? '진행 중' : '대기'));
      })),
      h('div', { className: 'ms-sr', role: 'status', 'aria-live': 'polite' }, live));
  }

  function ProgressSteps(p) {
    var cur = p.current || 0;
    return h('ol', { className: cx('ms-steps', p.className), 'aria-label': p.label || '진행 단계' }, (p.steps || []).map(function (s, i) {
      var state = i < cur ? 'done' : i === cur ? 'current' : 'todo';
      return h('li', { key: i, className: cx('ms-steps__item', 'ms-steps__item--' + state), 'aria-current': state === 'current' ? 'step' : undefined },
        h('span', { className: 'ms-steps__bar', 'aria-hidden': 'true' }),
        h('span', { className: 'ms-steps__label' }, (i + 1) + '. ' + s), h('span', { className: 'ms-steps__state' }, state === 'done' ? '완료' : state === 'current' ? '진행 중' : '예정'));
    }));
  }

  window.MiriSajang = {
    SiteHeader: SiteHeader, SiteFooter: SiteFooter, Button: Button, Badge: Badge, Notice: Notice, Chip: Chip, FilterChips: FilterChips, Tabs: Tabs, Accordion: Accordion, Card: Card, Skeleton: Skeleton, Divider: Divider,
    SelectField: SelectField, NumberField: NumberField, RegionSelect: RegionSelect, SearchBar: SearchBar,
    ShapeLogo: ShapeLogo, BrandCard: BrandCard,
    RangeFigure: RangeFigure, RangeBar: RangeBar, CapitalFitBar: CapitalFitBar, BreakevenGauge: BreakevenGauge, StackedBar: StackedBar, BarCompare: BarCompare, Donut: Donut, Ledger: Ledger, AccuracyMeter: AccuracyMeter, DataStatus: DataStatus,
    LockedBlur: LockedBlur, CompareTable: CompareTable, PriceCard: PriceCard, TestimonialCard: TestimonialCard, AICommentCard: AICommentCard, AIProgress: AIProgress, ProgressSteps: ProgressSteps,
    fmt: fmt, fitStatus: fitStatus
  };
})();
