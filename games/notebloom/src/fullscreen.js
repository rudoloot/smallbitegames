export function setupFullscreen(button) {
  let expanded = false, busy = false;
  const nativeElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  function update() {
    const active = Boolean(nativeElement() || expanded);
    document.body.classList.toggle('game-fullscreen', active);
    const label = active ? '전체화면 종료' : '전체화면';
    button.textContent = active ? '⛶ 화면 복원' : '⛶ 전체화면';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(active));
    button.title = label;
  }
  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    try {
      if (nativeElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        await exit.call(document);
      } else if (expanded) expanded = false;
      else {
        const root = document.documentElement;
        const request = root.requestFullscreen || root.webkitRequestFullscreen;
        if (request) {
          try { await request.call(root); }
          catch { expanded = true; }
        } else expanded = true;
      }
    } finally { busy = false; update(); }
  });
  document.addEventListener('fullscreenchange', update);
  document.addEventListener('webkitfullscreenchange', update);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) {
      expanded = false; update(); event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  update();
}
