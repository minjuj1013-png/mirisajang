/* 서버와 대화하는 부분. 화면 코드(app.js)는 여기 함수만 불러 써요. */
(function () {
  var memorySession = null;

  // 익명 세션 ID. 탭이 열려 있는 동안만 유지돼요(sessionStorage). 못 쓰면 메모리에만 둬요.
  function makeId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* 아래로 */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function sessionId() {
    try {
      var id = sessionStorage.getItem('ms_session');
      if (!id) { id = makeId(); sessionStorage.setItem('ms_session', id); }
      return id;
    } catch (e) {
      if (!memorySession) memorySession = makeId();
      return memorySession;
    }
  }
  // "세션당 한 번만" 보내는 기록을 위한 표시
  var memFlags = {};
  function onceFlag(name) {
    var key = 'ms_once_' + name;
    try {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, '1');
      return true;
    } catch (e) {
      if (memFlags[key]) return false;
      memFlags[key] = true;
      return true;
    }
  }

  // 모든 요청의 공통 처리. 항상 { ok, status, data } 모양으로 돌려줘요(던지지 않아요).
  function request(method, path, body) {
    var opts = { method: method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json; charset=utf-8';
      opts.body = JSON.stringify(body);
    }
    return fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }).catch(function () {
      return { ok: false, status: 0, data: null, network: true };
    });
  }

  function sendEvent(name, props) {
    // 기록이 실패해도 화면은 계속 동작해야 해요.
    request('POST', '/api/events', { session_id: sessionId(), name: name, props: props || {} });
  }

  window.MSApi = {
    sessionId: sessionId,
    onceFlag: onceFlag,
    options: function () { return request('GET', '/api/options'); },
    recommend: function (payload) { return request('POST', '/api/recommend', payload); },
    estimate: function (payload) { return request('POST', '/api/estimate', payload); },
    event: sendEvent,
    feedback: function (body) {
      body.session_id = sessionId();
      return request('POST', '/api/feedback', body);
    },
    preorder: function (context) {
      return request('POST', '/api/preorder', { session_id: sessionId(), context: context });
    },
    stats: function () { return request('GET', '/api/stats'); }
  };
})();
