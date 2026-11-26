/* 앱 시작점: 주소(해시)를 보고 알맞은 화면을 골라 보여 줘요.
   화면 코드는 home.js · premium.js · pages.js, 공통 뼈대는 ui.js 에 있어요. */
(function () {
  var React = window.React;
  var ReactDOM = window.ReactDOM;
  var C = window.MiriSajang;
  var T = window.TEXT;
  var API = window.MSApi;
  var U = window.MSUI;
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  function App() {
    var route = U.useRoute();
    var os = useState({ loading: true });
    var opts = os[0].data;
    var base = route.split(':')[0];
    var needOpts = base === 'home'; // 홈만 선택지(지역 목록 등)가 있어야 그려져요

    function loadOptions() {
      os[1]({ loading: true });
      API.options().then(function (r) { os[1](r.ok && r.data ? { data: r.data } : { error: true }); });
    }
    useEffect(loadOptions, []);

    // 이전 #/result 주소는 홈으로 보내요.
    useEffect(function () {
      var r = window.location.hash.replace(/^#\/?/, '');
      if (r === 'result') window.location.replace('#/');
    }, []);

    var first = useRef(true);
    useEffect(function () {
      API.event('page_view', { screen: base });
      if (first.current) { first.current = false; return; }
      window.scrollTo(0, 0);
      var m = document.getElementById('main'); if (m) m.focus({ preventScroll: true });
    }, [route]);

    var content;
    if (needOpts && os[0].loading) {
      content = h('div', { className: 'app-notice' }, h('p', { className: 'body' }, T.loading));
    } else if (needOpts && os[0].error) {
      content = h('div', { className: 'app-notice stack' },
        h(C.Notice, { tone: 'danger', title: T.loadFailTitle }, T.loadFail),
        h('div', null, h(C.Button, { variant: 'secondary', onClick: loadOptions }, T.retry)));
    } else if (base === 'stats') {
      content = h(window.MSPages.ScreenStats, null);
    } else if (base === 'premium') {
      content = h(window.MSPremium.ScreenPremium, null);
    } else if (base === 'articles') {
      content = h(window.MSPages.ScreenArticles, null);
    } else if (base === 'article') {
      content = h(window.MSPages.ScreenArticle, { id: route.slice('article:'.length) });
    } else if (base === 'faq') {
      content = h(window.MSPages.ScreenFaq, null);
    } else if (base === 'notfound') {
      content = h(window.MSPages.ScreenNotFound, null);
    } else {
      content = h(window.MSHome.ScreenHome, { opts: opts });
    }
    return h(U.Shell, { route: route }, content);
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App, null));
})();
