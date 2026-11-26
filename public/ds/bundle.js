/* @ds-bundle: {"format":4,"namespace":"MiriSajang","components":[{"name":"Button"},{"name":"SiteHeader"},{"name":"Eyebrow"},{"name":"Highlight"},{"name":"RiseLines"},{"name":"Band"},{"name":"Step"},{"name":"Ledger"},{"name":"HalftoneImage"},{"name":"Tile"},{"name":"Badge"},{"name":"Notice"},{"name":"SelectField"},{"name":"RangeFigure"},{"name":"AccuracyMeter"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  function cx() {
    return Array.prototype.filter.call(arguments, Boolean).join(' ');
  }

  /* 개발용 자리표시 이미지(사진 아님). 실제 사진으로 바꿔도 같은 이중톤 처리가 적용됩니다. */
  var SAMPLES = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#fff"/><circle cx="140" cy="130" r="95" fill="#3a3a3a"/><rect x="230" y="50" width="140" height="200" fill="#8a8a8a"/><rect x="30" y="230" width="340" height="28" fill="#111"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e8e8e8"/><polygon points="0,300 180,40 360,300" fill="#222"/><circle cx="310" cy="80" r="46" fill="#fff"/><rect x="0" y="250" width="400" height="50" fill="#555"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f4f4f4"/><rect x="40" y="40" width="130" height="220" fill="#1a1a1a"/><rect x="190" y="40" width="170" height="100" fill="#7a7a7a"/><rect x="190" y="160" width="170" height="100" fill="#cfcfcf"/></svg>'
  ];
  function sampleImage(i) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SAMPLES[(i || 0) % SAMPLES.length]);
  }

  /* ---------- 스크롤 모션 ---------- */
  var motion = {
    /* 한 번만 재생: .ms-rise .ms-lines .ms-mark .ms-bars 가 화면에 들어오면 is-in 이 붙음.
       진행도: [data-ms-progress] 요소에 --p(0~1)를 스크롤에 맞춰 갱신. */
    init: function (root) {
      root = root || document;
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var once = root.querySelectorAll('.ms-rise, .ms-lines, .ms-mark, .ms-bars');
      var io = null;
      if ('IntersectionObserver' in window && !reduce) {
        io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
          });
        }, { threshold: 0.25 });
        Array.prototype.forEach.call(once, function (el) { io.observe(el); });
      } else {
        Array.prototype.forEach.call(once, function (el) { el.classList.add('is-in'); });
      }
      var tracked = Array.prototype.slice.call(root.querySelectorAll('[data-ms-progress]'));
      var ticking = false;
      function update() {
        ticking = false;
        var vh = window.innerHeight || 800;
        tracked.forEach(function (el) {
          var r = el.getBoundingClientRect();
          var p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.8)));
          el.style.setProperty('--p', reduce ? 1 : p.toFixed(3));
        });
      }
      function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
      if (tracked.length) {
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        update();
      }
      return function cleanup() {
        if (io) io.disconnect();
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    }
  };

  /* ---------- 컴포넌트 ---------- */
  function Button(p) {
    var v = p.variant || 'primary';
    var icon = p.icon === 'plus' ? '+' : p.icon === 'arrow' ? '→' : null;
    var props = { className: cx('ms-btn', 'ms-btn--' + v, p.className), onClick: p.onClick };
    if (p.href) { props.href = p.href; } else { props.type = p.type || 'button'; props.disabled = p.disabled; }
    return h(p.href ? 'a' : 'button', props,
      h('span', null, p.children),
      icon ? h('span', { className: 'ms-btn__icon', 'aria-hidden': 'true' }, icon) : null
    );
  }

  function SiteHeader(p) {
    return h('header', { className: cx('ms-header', p.className) },
      h('div', { className: 'ms-header__brand' },
        h('span', { className: 'ms-header__name' }, p.name || '미리사장'),
        p.tag ? h('span', { className: 'ms-header__tag' }, p.tag) : null
      ),
      h('nav', { className: 'ms-header__nav' }, p.children)
    );
  }

  function Eyebrow(p) {
    return h('span', { className: cx('eyebrow', p.className) }, p.children);
  }

  function Highlight(p) {
    return h('span', { className: cx('ms-mark', 'ms-mark--' + (p.tone || 'orange'), p.show ? 'is-in' : null) }, p.children);
  }

  function RiseLines(p) {
    var Tag = p.as || 'h1';
    return h(Tag, { className: cx('ms-lines', p.className || 'display', p.show ? 'is-in' : null) },
      (p.lines || []).map(function (line, i) {
        return h('span', { key: i, className: 'ms-line' }, h('span', { style: { '--i': i } }, line));
      })
    );
  }

  function Band(p) {
    var tone = p.tone || 'white';
    return h('section', { className: cx('ms-band', 'ms-band--' + tone, p.className) },
      h('div', { className: 'ms-band__inner' },
        h('div', { className: 'ms-band__rule' }),
        p.eyebrow ? h(Eyebrow, null, p.eyebrow) : null,
        p.title ? h('h2', { className: 'h1 ms-band__title' }, p.title) : null,
        p.lede ? h('p', { className: 'lede ms-band__lede' }, p.lede) : null,
        p.children ? h('div', { className: 'ms-band__body' }, p.children) : null
      )
    );
  }

  function Step(p) {
    return h('div', { className: cx('ms-step', p.className) },
      h('span', { className: 'ms-step__n' }, p.n),
      h('div', { className: 'ms-step__body' },
        h('h3', { className: 'h3' }, p.title),
        h('p', { className: 'body' }, p.children)
      )
    );
  }

  function Badge(p) {
    var tone = p.tone || 'estimate';
    var fallback = tone === 'estimate' ? '추정' : tone === 'locked' ? '유료' : '';
    return h('span', { className: cx('ms-badge', 'ms-badge--' + tone) }, p.children || fallback);
  }

  function Ledger(p) {
    return h('div', { className: cx('ms-ledger', p.highlight ? 'ms-ledger--hl' : null, p.className) },
      h('div', { className: 'ms-ledger__title eyebrow' }, p.title),
      (p.rows || []).map(function (r, i) {
        return h('div', { key: i, className: cx('ms-ledger__row', r.strong ? 'ms-ledger__row--strong' : null) },
          h('span', null, r.label),
          h('span', { className: 'ms-ledger__value' }, r.value, r.estimate ? h(Badge, { tone: 'estimate' }) : null)
        );
      }),
      p.note ? h('div', { className: 'ms-ledger__note' }, p.note) : null
    );
  }

  function HalftoneImage(p) {
    var props = {
      className: cx('ms-duo', 'ms-halftone', 'ms-duo--' + (p.tone || 'lavender'), 'ms-dots--' + (p.dots || 'orange'), p.className),
      style: { aspectRatio: p.ratio || '16 / 9' }
    };
    if (p.progress != null) { props.style['--p'] = p.progress; }
    else if (!p.manual) { props['data-ms-progress'] = ''; }
    return h('div', props, h('img', { src: p.src || sampleImage(0), alt: p.alt || '' }));
  }

  function Tile(p) {
    var props = { className: cx('ms-tile', p.className), style: p.style };
    if (p.progress != null) { props.style = Object.assign({ '--p': p.progress }, p.style); }
    else if (!p.manual) { props['data-ms-progress'] = ''; }
    return h('figure', props,
      h('div', { className: 'ms-duo ms-duo--' + (p.tone || 'lavender'), style: { aspectRatio: p.ratio || '4 / 5' } },
        h('img', { src: p.src || sampleImage(1), alt: p.alt || '' })),
      p.label ? h('figcaption', { className: 'ms-tile__label eyebrow' }, p.label) : null
    );
  }

  function RangeFigure(p) {
    var unit = p.unit || '만 원';
    var empty = p.low == null || p.high == null;
    return h('div', { className: cx('ms-range', p.className) },
      h('div', { className: 'ms-range__label' },
        h(Eyebrow, null, p.label),
        empty ? null : h(Badge, { tone: 'estimate' })
      ),
      h('div', { className: 'ms-range__value' },
        empty
          ? h('span', { className: 'ms-range__empty' }, '자료 부족')
          : h('span', { className: 'number-xl' }, p.low + '~' + p.high, h('span', { className: 'ms-range__unit' }, ' ' + unit))
      ),
      p.note ? h('div', { className: 'ms-range__note' }, p.note) : null
    );
  }

  var NOTICE_TITLES = { info: '안내', warn: '주의', danger: '오류' };

  function Notice(p) {
    var tone = p.tone || 'info';
    return h('div', { className: cx('ms-notice', 'ms-notice--' + tone, p.className), role: tone === 'danger' ? 'alert' : 'note' },
      h('strong', { className: 'ms-notice__title' }, p.title || NOTICE_TITLES[tone]),
      h('div', null, p.children)
    );
  }

  function SelectField(p) {
    var id = p.id || 'ms-' + (p.name || p.label);
    var options = (p.options || []).map(function (o) {
      var value = typeof o === 'string' ? o : o.value;
      var label = typeof o === 'string' ? o : o.label;
      return h('option', { key: value, value: value }, label);
    });
    return h('div', { className: cx('ms-field', p.error ? 'ms-field--error' : null, p.className) },
      h('label', { className: 'ms-field__label eyebrow', htmlFor: id }, p.label),
      h('select', {
        id: id, name: p.name, className: 'ms-field__select',
        value: p.value,
        defaultValue: p.value === undefined ? (p.defaultValue === undefined ? '' : p.defaultValue) : undefined,
        onChange: p.onChange,
        'aria-invalid': p.error ? 'true' : undefined
      }, h('option', { value: '', disabled: true }, p.placeholder || '선택해 주세요'), options),
      p.error
        ? h('div', { className: 'ms-field__error' }, '오류: ' + p.error)
        : (p.hint ? h('div', { className: 'ms-field__hint' }, p.hint) : null)
    );
  }

  var METER = ['자료 부족', '낮음', '보통', '높음'];

  function AccuracyMeter(p) {
    var level = Math.max(0, Math.min(3, p.level == null ? 0 : p.level));
    var bars = [1, 2, 3].map(function (n) {
      return h('span', { key: n, className: cx('ms-meter__bar', n <= level ? 'ms-meter__bar--on' : null) });
    });
    return h('div', { className: cx('ms-meter', p.className), role: 'img', 'aria-label': (p.region ? p.region + ' ' : '') + '추정 정확도 ' + METER[level] },
      h('div', { className: 'ms-meter__bars' }, bars),
      h('div', { className: 'ms-meter__text' }, (p.region ? p.region + ' · ' : '') + '추정 정확도 ', h('b', null, METER[level]))
    );
  }

  window.MiriSajang = {
    Button: Button, SiteHeader: SiteHeader, Eyebrow: Eyebrow, Highlight: Highlight, RiseLines: RiseLines,
    Band: Band, Step: Step, Ledger: Ledger, HalftoneImage: HalftoneImage, Tile: Tile,
    Badge: Badge, Notice: Notice, SelectField: SelectField, RangeFigure: RangeFigure, AccuracyMeter: AccuracyMeter,
    motion: motion, sampleImage: sampleImage
  };
})();
