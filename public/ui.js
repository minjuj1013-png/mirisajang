/* 화면 여러 곳에서 같이 쓰는 도구와 공통 뼈대(머리글·푸터·막힌 곳 알리기)예요.
   JSX 없이 React.createElement(h)로만 써요. 문구는 text.js, 서버 통신은 api.js에 있어요. */
(function () {
  var React = window.React;
  var C = window.MiriSajang;
  var T = window.TEXT;
  var API = window.MSApi;
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  // 서버 원문에 있는 내부용 낱말은 코드에 그대로 적지 않고 유니코드 값으로 만들어요.
  var W_DEV = '\uAC1C\uBC1C\uC6A9', W_SLOT = '\uC790\uB9AC \uAC12';
  var RE_SLOT = new RegExp(W_DEV + ' ' + W_SLOT + '\\(근거 없음\\)', 'g');
  var RE_FAKE = new RegExp('가상 예시\\(' + W_DEV + ', 출처 미확인\\)', 'g');
  var RE_DEV = new RegExp(W_DEV, 'g');
  var RE_SLOT2 = new RegExp(W_SLOT, 'g');
  function clean(x) { // 서버가 준 내부용 문구를 사용자에게 쉬운 말로 바꿔 보여 줘요(서버 원문은 그대로)
    return String(x == null ? '' : x)
      .replace(RE_SLOT, '공식 자료를 아직 연결하지 않은 시험용 값이에요')
      .replace(RE_FAKE, '시험용 가상 값')
      .replace(/검색 결과 기준, 고용노동부 원문 미열람/g, '공식 자료로 다시 확인할 예정이에요')
      .replace(RE_DEV, '시험용').replace(RE_SLOT2, '시험용 값');
  }
  function wonText(n) { return Number(n).toLocaleString('ko-KR'); } // 최저임금처럼 '원' 단위 글자 전용
  function pct(x) { return (x * 100).toFixed(1) + '%'; }
  function goto(hash) { window.location.hash = hash; }
  function reduced() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function scrollToEl(el) { if (el) el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); }
  function kst(iso) { // 한국 시간 "2026-11-26 14:05"
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var parts = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(d).forEach(function (p) { parts[p.type] = p.value; });
    return parts.year + '-' + parts.month + '-' + parts.day + ' ' + (parts.hour === '24' ? '00' : parts.hour) + ':' + parts.minute;
  }

  // ---------- 경로(해시 라우팅) ----------
  function getRoute() {
    var p = window.location.pathname.replace(/\/+$/, '');
    if (/\/stats$/.test(p)) return 'stats';
    var r = window.location.hash.replace(/^#\/?/, '');
    if (r === 'premium' || r === 'articles' || r === 'faq' || r === 'stats') return r;
    if (r === 'result' || r === 'sample') return r === 'sample' ? 'premium' : 'home'; // 옛 주소
    if (r.indexOf('articles/') === 0) return 'article:' + decodeURIComponent(r.slice(9));
    if (r === '' || r === 'main') return 'home';
    return 'notfound';
  }
  function useRoute() {
    var s = useState(getRoute());
    useEffect(function () {
      function on() { s[1](getRoute()); }
      window.addEventListener('hashchange', on);
      return function () { window.removeEventListener('hashchange', on); };
    }, []);
    return s[0];
  }
  function useMobile() { // 600px 미만이면 true (머리글 메뉴 글자를 줄이는 데만 써요)
    var q = '(max-width: 599px)';
    var s = useState(function () { try { return window.matchMedia(q).matches; } catch (e) { return false; } });
    useEffect(function () {
      var m; try { m = window.matchMedia(q); } catch (e) { return undefined; }
      function on() { s[1](m.matches); }
      if (m.addEventListener) m.addEventListener('change', on); else m.addListener(on);
      return function () { if (m.removeEventListener) m.removeEventListener('change', on); else m.removeListener(on); };
    }, []);
    return s[0];
  }

  // 프리미엄 페이지로 어디서 왔는지 기억해요('menu' 또는 'teaser').
  var nav = { premiumFrom: 'menu' };

  // ---------- 용어 풀이 (열고 닫기) ----------
  function buildGlossary(opts) {
    var base = (opts.glossary || []).map(function (g) {
      return { term: g.term, text: clean(T.glossaryOverride[g.term] || g.text) };
    });
    return base.concat(T.glossaryExtra);
  }
  function Glossary(props) {
    var s = useState({});
    var open = s[0];
    var terms = props.terms || [];
    function toggle(term) {
      var next = Object.assign({}, open);
      next[term] = !next[term];
      s[1](next);
      if (next[term]) API.event('glossary_opened', { term: term });
    }
    return h('div', null,
      h('div', { className: 'glossary-links' }, terms.map(function (g) {
        return h(C.Button, { key: g.term, variant: 'link', onClick: function () { toggle(g.term); } },
          open[g.term] ? g.term + ' · ' + T.d.glossaryClose : g.term);
      })),
      h('div', { className: 'glossary-open', 'aria-live': 'polite' }, terms.filter(function (g) { return open[g.term]; }).map(function (g) {
        return h(C.Notice, { key: g.term, tone: 'info', title: g.term }, g.text);
      })));
  }

  // ---------- 막힌 곳 알리기 (푸터 안에서 펼쳐지는 패널) ----------
  function BlockedPanel(props) {
    var s = useState('');
    var text = s[0];
    var st = useState('idle'); // idle | sending | done | fail
    var status = st[0];
    var er = useState('');
    var ta = useRef(null);
    var closeTimer = useRef(null);
    useEffect(function () { if (ta.current) ta.current.focus(); return function () { clearTimeout(closeTimer.current); }; }, []);
    function send() {
      var t = text.trim();
      if (!t) { er[1](T.blocked.empty); if (ta.current) ta.current.focus(); return; }
      er[1]('');
      st[1]('sending');
      API.feedback({ type: 'blocked', screen: props.screen, text: t }).then(function (r) {
        st[1](r.ok ? 'done' : 'fail');
        if (r.ok) { s[1](''); closeTimer.current = setTimeout(props.onClose, 1500); } // 1.5초 뒤 자동으로 닫아요
      });
    }
    return h('div', { className: 'blocked-panel', role: 'region', 'aria-label': T.blocked.title, id: 'blocked-region' },
      h('h2', { className: 'heading-3' }, T.blocked.title),
      h('div', null,
        h('label', { htmlFor: 'blocked-text', className: 'label' }, T.blocked.label),
        h('p', { className: 'body-sm ink-muted', style: { margin: '4px 0 8px' }, id: 'blocked-hint' }, T.blocked.hint),
        h('textarea', {
          id: 'blocked-text', ref: ta, maxLength: 500, value: text, 'aria-describedby': 'blocked-hint', className: 'blocked-text',
          'aria-invalid': er[0] ? 'true' : undefined,
          onChange: function (e) { s[1](e.target.value); if (status !== 'idle') st[1]('idle'); }
        }),
        er[0] ? h('p', { className: 'field-error' }, '오류: ' + er[0]) : null,
        h('p', { className: 'caption ink-muted', style: { margin: '4px 0 0' } }, T.blocked.left(500 - text.length))),
      h(C.Notice, { tone: 'info' }, T.blocked.privacy),
      status === 'done' ? h('div', { role: 'status' }, h(C.Notice, { tone: 'info' }, T.blocked.done)) : null,
      status === 'fail' ? h(C.Notice, { tone: 'danger' }, T.blocked.fail) : null,
      h('div', { className: 'row' },
        h(C.Button, { variant: 'secondary', onClick: send, disabled: status === 'sending' || status === 'done' }, status === 'sending' ? T.blocked.sending : T.blocked.send),
        h(C.Button, { variant: 'link', onClick: props.onClose }, T.blocked.close)));
  }

  // ---------- 공통 뼈대 (머리글 + 본문 + 푸터) ----------
  var NAV = [
    { key: 'home', href: '#/' },
    { key: 'premium', href: '#/premium' },
    { key: 'articles', href: '#/articles' },
    { key: 'faq', href: '#/faq' }
  ];
  function navKeyOf(route) {
    if (route === 'home' || route === 'premium' || route === 'articles' || route === 'faq') return route;
    if (route.indexOf('article:') === 0) return 'articles';
    return '';
  }

  function Shell(props) {
    var route = props.route;
    var base = route.split(':')[0];
    var mobile = useMobile();
    var os = useState(false);
    var blockedOpen = os[0], setBlockedOpen = os[1];
    var lastTrigger = useRef(null);
    var btnRef = useRef(null);
    function openBlocked() { lastTrigger.current = document.activeElement; setBlockedOpen(true); }
    function closeBlocked() {
      setBlockedOpen(false);
      var t = lastTrigger.current;
      if (t && t !== document.body && document.contains(t)) t.focus();
      else if (btnRef.current) { var b = btnRef.current.querySelector('button'); if (b) b.focus(); }
    }
    useEffect(function () { setBlockedOpen(false); }, [route]); // 페이지를 옮기면 패널을 닫아요
    useEffect(function () { // Esc는 포커스가 어디 있든 패널을 닫아요
      if (!blockedOpen) return undefined;
      function onKey(e) { if (e.key === 'Escape') closeBlocked(); }
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('keydown', onKey); };
    }, [blockedOpen]);
    useEffect(function () { // 막힌 곳 알리기 버튼이 펼침 상태를 알리도록
      if (!btnRef.current) return;
      var b = btnRef.current.querySelector('button');
      if (b) { b.setAttribute('aria-expanded', blockedOpen ? 'true' : 'false'); b.setAttribute('aria-controls', 'blocked-region'); }
    }, [blockedOpen]);

    var cur = navKeyOf(route);
    var pre = /\/stats$/.test(window.location.pathname.replace(/\/+$/, '')) ? '/' : ''; // 통계 주소(/stats)에서는 홈 주소로 나가야 해요
    var items = NAV.map(function (n) {
      var label = n.key === 'premium' && mobile ? T.nav.premiumShort : T.nav[n.key];
      return { label: label, href: pre + n.href, current: cur === n.key };
    });
    var footLinks = NAV.map(function (n) { return { label: T.nav[n.key], href: pre + n.href }; });
    return h('div', { className: 'app' },
      h('a', { className: 'skip-link', href: '#main', onClick: function (e) { e.preventDefault(); var m = document.getElementById('main'); if (m) m.focus(); } }, T.skip),
      h(C.SiteHeader, { logo: T.brand, logoHref: pre + '#/', items: items, navLabel: T.nav.label }),
      h('main', { id: 'main', tabIndex: -1 }, props.children),
      h('div', { className: 'app-footer' },
        h(C.SiteFooter, { name: T.brand, about: T.footer.about, links: footLinks, notes: T.footer.notes, privacy: T.footer.privacy }),
        h('div', { className: 'app-footer__more' },
          h('div', { className: 'app-footer__in' },
            h('span', { ref: btnRef }, h(C.Button, { variant: 'secondary', size: 'sm', onClick: blockedOpen ? closeBlocked : openBlocked }, T.blocked.button)),
            blockedOpen ? h(BlockedPanel, { screen: base, onClose: closeBlocked }) : null))));
  }

  window.MSUI = {
    h: h, clean: clean, wonText: wonText, pct: pct, goto: goto, reduced: reduced, scrollToEl: scrollToEl, kst: kst,
    getRoute: getRoute, useRoute: useRoute, useMobile: useMobile, nav: nav, buildGlossary: buildGlossary, Glossary: Glossary, Shell: Shell
  };
})();
