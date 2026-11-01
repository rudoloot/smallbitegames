(function () {
  'use strict';
  var state = { build: 'sky-1', stage: 'HTML', code: 'FS-HTML', frames: 0, ready: false, failed: false, detail: '' };
  var diagnostic = /(?:\?|&)diag=1(?:&|$)/.test(location.search);
  var dismissed = false;
  function element(id) { return document.getElementById(id); }
  function safeDetail(error) {
    var message = error && error.message ? String(error.message) : String(error || '오류 정보 없음');
    return message.split('\n')[0].replace(/https?:\/\/\S+/gi, '[URL]').replace(/[A-Za-z]:[\\/][^\s]*/g, '[PATH]').slice(0, 160);
  }
  function draw() {
    var panel = element('boot-panel');
    if (!panel) return;
    panel.hidden = !state.failed && (state.ready ? !diagnostic || dismissed : false);
    element('boot-title').textContent = state.failed ? '게임을 표시하지 못했어요' : state.ready ? '게임 실행 단계 확인' : 'FloatStone을 준비하고 있어요';
    element('boot-message').textContent = state.failed ? '아래 코드와 단계를 알려 주세요. 다시 불러오기로 재시도할 수 있어요.' : state.ready ? '이 안내 뒤 화면이 계속 하얗다면 코드와 단계를 알려 주세요.' : '잠시만 기다려 주세요. 이 안내가 계속 남으면 코드와 단계를 알려 주세요.';
    element('boot-code').textContent = state.code + ' · ' + state.stage;
    var lines = ['버전: ' + state.build, '단계: ' + state.stage, '렌더 호출: ' + state.frames];
    if (state.render) lines.push('그래픽: WebGL ' + state.render.webgl + ' / ' + state.render.width + '×' + state.render.height, '활성 메시: ' + state.render.activeMeshes, '카메라 유효: ' + state.render.cameraFinite);
    if (state.detail) lines.push('오류: ' + state.detail);
    element('boot-detail').textContent = lines.join('\n');
    element('boot-dismiss').hidden = !state.ready || state.failed;
  }
  function fail(code, error) {
    if (state.failed && state.code !== 'FS-TIMEOUT') return;
    state.failed = true; state.code = code; state.detail = safeDetail(error); dismissed = false; draw();
  }
  window.floatstoneBoot = {
    stage: function (stage) { if (!state.failed) { state.stage = stage; state.code = 'FS-' + stage; } draw(); },
    fail: fail,
    frame: function (render) {
      var wasReady = state.ready;
      state.frames++; state.render = render;
      if (render.ready) {
        state.ready = true;
        if (state.code === 'FS-TIMEOUT' || state.code === 'FS-CONTEXT') { state.failed = false; state.detail = ''; }
        if (!state.failed) { state.code = 'FS-READY'; state.stage = 'RENDER'; }
      }
      if (state.frames === 1 || state.frames % 30 === 0 || state.failed || state.ready !== wasReady) draw();
    }
  };
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) fail('FS-ASSET', '게임 파일을 불러오지 못했습니다.');
    else fail('FS-JS', event.error || event.message || '스크립트 실행 오류');
  }, true);
  window.addEventListener('unhandledrejection', function (event) { fail('FS-PROMISE', event.reason); });
  window.addEventListener('vite:preloadError', function (event) { fail('FS-ASSET', event.payload || '게임 모듈을 불러오지 못했습니다.'); });
  function install() {
    element('boot-reload').addEventListener('click', function () { location.reload(); });
    element('boot-dismiss').addEventListener('click', function () { dismissed = true; draw(); });
    draw();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  setTimeout(function () { if (!state.ready && !state.failed) fail('FS-TIMEOUT', '준비가 오래 걸리고 있습니다.'); }, 12000);
}());
