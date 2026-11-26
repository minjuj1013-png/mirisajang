/* 아티클 · FAQ · 통계(팀 전용) · 없는 주소 화면이에요. 글 데이터는 articles.js, 문구는 text.js 에 있어요. */
(function () {
  var React = window.React;
  var C = window.MiriSajang;
  var T = window.TEXT;
  var API = window.MSApi;
  var U = window.MSUI;
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;

  var SHAPES = [['circle', 'brand'], ['hexagon', 'accent'], ['diamond', 'teal'], ['square', 'ink'], ['triangle', 'sand']];

  function PageHead(props) {
    return h('section', { className: 'page-head' },
      h('div', { className: 'ms-container' },
        props.eyebrow ? h('p', { className: 'label ink-muted', style: { margin: '0 0 8px' } }, props.eyebrow) : null,
        h('h1', { className: 'heading-1' }, props.title),
        props.lede ? h('p', { className: 'body-lg ink-muted', style: { margin: '8px 0 0' } }, props.lede) : null,
        props.children));
  }

  // ---------- 아티클 ----------
  function ScreenArticles() {
    var f = useState(T.artUi.filters[0]);
    var filter = f[0];
    var list = window.ARTICLES || [];
    var shown = list.filter(function (a) { return filter === T.artUi.filters[0] || a.category === filter; });
    var showNews = filter === T.artUi.filters[0] || filter === '뉴스';
    var hasNews = list.some(function (a) { return a.category === '뉴스'; });
    return h(React.Fragment, null,
      h(PageHead, { title: T.artUi.title, lede: T.artUi.lede },
        h('div', { style: { marginTop: 16 } }, h(C.FilterChips, { label: T.artUi.filterLabel, options: T.artUi.filters, value: filter, onChange: f[1] }))),
      h('section', { className: 'section' },
        h('div', { className: 'ms-container' },
          h('div', { className: 'a-grid' },
            shown.map(function (a, i) {
              var sh = SHAPES[i % SHAPES.length];
              return h(C.Card, { key: a.id, as: 'article', className: 'a-card' },
                h('div', { className: 'a-card__top' }, h(C.ShapeLogo, { shape: sh[0], tone: sh[1], size: 'sm', label: '장식 도형' }), h(C.Badge, { tone: 'neutral' }, a.category)),
                h('h2', { className: 'heading-3', style: { margin: 0 } }, h('a', { href: '#/articles/' + a.id }, a.title)),
                h('p', { className: 'body-sm ink-muted', style: { margin: 0 } }, a.summary),
                h('div', null, h(C.Badge, { tone: 'neutral' }, a.status)));
            }),
            showNews && !hasNews ? h(C.Card, { as: 'article', className: 'a-card' },
              h('div', { className: 'a-card__top' }, h(C.Badge, { tone: 'neutral' }, T.artUi.newsTitle)),
              h('p', { className: 'body', style: { margin: 0 } }, T.artUi.news),
              h('div', null, h(C.Badge, { tone: 'neutral' }, '준비 중'))) : null),
          !shown.length && !showNews ? h('p', { className: 'body' }, T.artUi.none) : null)));
  }

  function ScreenArticle(props) {
    var a = (window.ARTICLES || []).filter(function (x) { return x.id === props.id; })[0];
    if (!a) {
      return h(PageHead, { title: '글을 찾지 못했어요.' },
        h('div', { className: 'stack', style: { marginTop: 16 } },
          h(C.Notice, { tone: 'info' }, T.artUi.notFound),
          h('div', null, h(C.Button, { variant: 'secondary', href: '#/articles' }, T.artUi.list))));
    }
    return h(React.Fragment, null,
      h(PageHead, { eyebrow: a.category, title: a.title }),
      h('section', { className: 'section' },
        h('div', { className: 'ms-container article-body stack-lg' },
          h('div', null, h(C.Badge, { tone: 'neutral' }, a.status)),
          a.category === '시장 통계' ? h(C.Notice, { tone: 'info' }, T.artUi.verifyNote) : null,
          h('div', { className: 'stack' }, a.body.map(function (p, i) { return h('p', { key: i, className: 'body-lg', style: { margin: 0 } }, p); })),
          h(C.Notice, { tone: 'info', title: T.artUi.source }, h('div', null, a.sourceName), h('div', { className: 'body-sm' }, a.sourceNote)),
          h('div', { className: 'row' },
            h(C.Button, { href: '#/' }, T.artUi.toHome),
            h(C.Button, { variant: 'link', href: '#/articles' }, T.artUi.list)))));
  }

  // ---------- FAQ ----------
  function ScreenFaq() {
    return h(React.Fragment, null,
      h(PageHead, { title: T.faqUi.title, lede: T.faqUi.lede }),
      h('section', { className: 'section' },
        h('div', { className: 'ms-container faq-wrap' },
          h(C.Accordion, { defaultOpenIndex: 0, items: T.faq.map(function (it) { return { q: it.q, a: h('p', { style: { margin: 0 } }, it.a) }; }) }),
          h(C.Card, { tone: 'emphasis' },
            h('h2', { className: 'heading-3', style: { margin: 0 } }, T.faqUi.blockedTitle),
            h('p', { className: 'body', style: { margin: '8px 0 0' } }, T.faqUi.blocked)))));
  }

  // ---------- 통계 (팀 전용) ----------
  function StatBlock(props) {
    return h(C.Card, null,
      h('h2', { className: 'heading-3', style: { margin: '0 0 12px' } }, props.title),
      h('table', { className: 'stat-table' },
        h('tbody', null, props.rows.map(function (r, i) {
          return h('tr', { key: i, className: r.strong ? 'is-strong' : '' }, h('th', { scope: 'row' }, r.label), h('td', { className: 'ms-num' }, r.value));
        }))));
  }

  function ScreenStats() {
    var s = useState({ loading: true });
    useEffect(function () {
      API.stats().then(function (r) { s[1](r.ok && r.data ? { data: r.data } : { error: true }); });
    }, []);
    var st = s[0];
    var d = st.data;
    var body;
    if (st.loading) body = h('p', { className: 'body' }, T.loading);
    else if (st.error) body = h(C.Notice, { tone: 'danger' }, T.s4.fail);
    else {
      var f = d.funnel || {};
      var started = f.input_started || 0;
      var rate1 = started > 0 ? U.pct(d.m1_completed_sessions / started) + ' (' + d.m1_completed_sessions + ' / ' + started + ')' : T.s4.noRate;
      var rate2 = d.m1_completed_sessions > 0 && d.m2_rate_of_m1 != null
        ? U.pct(d.m2_rate_of_m1) + ' (' + d.m2_preorder_sessions + ' / ' + d.m1_completed_sessions + ')' : T.s4.noRate;
      var ex = d.m3_answered_excl_unknown || 0;
      var rate3 = ex > 0 && d.m3_rate != null ? U.pct(d.m3_rate) + ' (' + d.m3_similar + ' / ' + ex + ')' : T.s4.noRate;
      var rate3all = d.m3_answered > 0 ? U.pct(d.m3_similar / d.m3_answered) + ' (' + d.m3_similar + ' / ' + d.m3_answered + ')' : T.s4.noRate;
      var byResp = d.m3_by_respondent || {};
      var respRows = Object.keys(byResp).map(function (k) {
        var x = byResp[k];
        return { label: '응답자 구분 · ' + (T.respondentNames[k] || k), value: x.answered_excl_unknown > 0 ? U.pct(x.similar / x.answered_excl_unknown) + ' (' + x.similar + ' / ' + x.answered_excl_unknown + ')' : T.s4.noRate };
      });
      var drop = d.dropoff_last_field || {};
      var dropRows = Object.keys(drop).map(function (k) { return { label: T.fieldNames[k] || k, value: drop[k] + '개 세션' }; });
      var reports = d.blocked_reports || [];
      body = h('div', { className: 'stack-lg' },
        d.period ? h('p', { className: 'body-sm ink-muted', style: { margin: 0 } }, '집계 기간(한국 시간): ' + (U.kst(d.period.from) || '처음') + ' ~ ' + (U.kst(d.period.to) || '지금')) : null,
        h('div', { className: 'stat-grid' },
          h(StatBlock, { title: T.s4.m1Title, rows: [
            { label: '끝까지 입력한 세션 수', value: d.m1_completed_sessions + '개', strong: true },
            { label: '입력을 시작한 세션 수(참고)', value: started + '개' },
            { label: '시작한 세션 중 끝까지 간 비율', value: rate1 }] }),
          h(StatBlock, { title: T.s4.m2Title, rows: [
            { label: '사전 신청한 세션 수', value: d.m2_preorder_sessions + '개', strong: true },
            { label: '지표 1 대비 비율(참고)', value: rate2 }] }),
          h(StatBlock, { title: T.s4.m3Title, rows: [
            { label: '비슷했어요 세션 수', value: d.m3_similar + '개', strong: true },
            { label: '답한 세션 수(잘 모르겠어요 제외)', value: ex + '개' },
            { label: '비슷했다는 비율(잘 모르겠어요 제외)', value: rate3 },
            { label: '답한 세션 수(전체)', value: (d.m3_answered || 0) + '개' },
            { label: '비슷했다는 비율(전체 응답 기준)', value: rate3all }].concat(respRows) }),
          h(StatBlock, { title: T.s4.newTitle, rows: [
            { label: '추천 화면을 본 세션 수', value: (d.recommend_viewed_sessions || 0) + '개' },
            { label: '브랜드를 고른 세션 수', value: (d.brand_picked_sessions || 0) + '개' },
            { label: '프리미엄 페이지를 본 세션 수', value: (d.premium_viewed_sessions || 0) + '개' },
            { label: '비교 표를 본 세션 수', value: (d.premium_compare_viewed_sessions || 0) + '개' }] }),
          h(StatBlock, { title: T.s4.funnelTitle, rows: [
            { label: '입력 시작', value: (f.input_started || 0) + '개' },
            { label: '입력 오류(빠진 항목)', value: (f.input_error || 0) + '개' },
            { label: '결과 확인', value: (f.result_viewed || 0) + '개' }] }),
          h(StatBlock, { title: T.s4.dropTitle, rows: dropRows.length ? dropRows : [{ label: T.s4.none, value: '-' }] })),
        h(C.Card, null,
          h('h2', { className: 'heading-3', style: { margin: '0 0 12px' } }, T.s4.blockedTitle),
          reports.length
            ? h('ul', { className: 'blocked-reports' }, reports.map(function (r, i) {
              return h('li', { key: i }, h('span', { className: 'body-sm ink-muted' }, U.kst(r.ts) + ' · ' + (r.screen || '')), h('div', { className: 'body' }, r.text));
            }))
            : h('p', { className: 'body', style: { margin: 0 } }, T.s4.none)));
    }
    return h(React.Fragment, null,
      h(PageHead, { eyebrow: T.s4.eyebrow, title: T.s4.title, lede: T.s4.lede },
        h('div', { style: { marginTop: 16, maxWidth: 720 } }, h(C.Notice, { tone: 'info' }, T.s4.small))),
      h('section', { className: 'section section--soft' }, h('div', { className: 'ms-container' }, body)));
  }

  function ScreenNotFound() {
    return h(PageHead, { eyebrow: '404', title: T.notFound.title },
      h('div', { className: 'stack', style: { marginTop: 16 } },
        h('p', { className: 'body', style: { margin: 0 } }, T.notFound.body),
        h('div', null, h(C.Button, { href: '#/' }, T.notFound.home))));
  }

  window.MSPages = { ScreenArticles: ScreenArticles, ScreenArticle: ScreenArticle, ScreenFaq: ScreenFaq, ScreenStats: ScreenStats, ScreenNotFound: ScreenNotFound };
})();
