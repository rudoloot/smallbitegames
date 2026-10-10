import { UPGRADES, UPGRADE_COLORS, CARD_DURATION } from './pickups.js?v=7b71865ac2d8';

export function draggedUpgrade(selected, deltaY) {
  const initial = selected ? UPGRADE_COLORS.indexOf(selected) : 1;
  const index = Math.max(0, Math.min(2, initial + Math.round(deltaY / 52)));
  return UPGRADE_COLORS[index];
}

export class UpgradeCards {
  constructor(container) {
    this.container = container; this.offer = null; this.enabled = false; this.drag = null;
    this.panel = document.createElement('section'); this.panel.className = 'upgrade-cards'; this.panel.hidden = true;
    this.panel.setAttribute('aria-label', '강화 카드 선택');
    const heading = document.createElement('header'), title = document.createElement('strong'); title.textContent = '강화 선택';
    this.timer = document.createElement('span'); heading.append(title, this.timer);
    const hint = document.createElement('p'); hint.textContent = '위아래 드래그로 선택';
    this.list = document.createElement('div'); this.list.className = 'upgrade-card-list'; this.buttons = new Map();
    for (const color of UPGRADE_COLORS) {
      const upgrade = UPGRADES[color], button = document.createElement('button'); button.type = 'button'; button.className = 'upgrade-card';
      button.style.setProperty('--card-color', '#' + upgrade.color.toString(16)); button.dataset.color = color;
      const symbol = document.createElement('span'); symbol.className = 'upgrade-card-symbol'; symbol.textContent = upgrade.symbol;
      const label = document.createElement('span'), name = document.createElement('strong'), detail = document.createElement('small');
      name.textContent = upgrade.title; detail.textContent = upgrade.name; label.append(name, detail);
      button.append(symbol, label); button.setAttribute('aria-label', `${upgrade.title}: ${upgrade.name}`);
      button.addEventListener('click', () => this.select(color)); this.buttons.set(color, button); this.list.append(button);
    }
    this.status = document.createElement('p'); this.status.className = 'upgrade-card-status';
    this.progress = document.createElement('progress'); this.progress.max = CARD_DURATION; this.progress.setAttribute('aria-label', '카드 선택 남은 시간');
    this.panel.append(heading, hint, this.list, this.status, this.progress); container.append(this.panel);
    this.panel.addEventListener('pointerdown', event => {
      if (!this.enabled || event.button !== 0) return;
      event.stopPropagation(); this.drag = { pointerId: event.pointerId, offerId: this.offer.id };
      this.panel.setPointerCapture(event.pointerId); this.selectAt(event.clientY);
    });
    this.panel.addEventListener('pointermove', event => {
      if (this.drag?.pointerId === event.pointerId && this.drag.offerId === this.offer?.id) this.selectAt(event.clientY);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.panel.addEventListener(type, () => { this.drag = null; });
    this.panel.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown'].includes(event.key) || !this.enabled) return;
      event.preventDefault(); event.stopPropagation();
      const color = draggedUpgrade(this.offer.selected, event.key === 'ArrowUp' ? -52 : 52);
      this.select(color); this.buttons.get(color).focus();
    });
  }
  selectAt(y) {
    const entries = [...this.buttons.entries()];
    const closest = entries.reduce((best, entry) => {
      const distance = button => { const bounds = button.getBoundingClientRect(); return Math.abs(y - (bounds.top + bounds.bottom) / 2); };
      return distance(entry[1]) < distance(best[1]) ? entry : best;
    });
    this.select(closest[0]);
  }
  select(color) {
    if (!this.enabled || !this.offer) return;
    this.container.dispatchEvent(new CustomEvent('upgrade-select', { bubbles: true, detail: { id: this.offer.id, color } }));
  }
  render(state, mode) {
    const offer = state?.activeCardOffer;
    if (this.offer?.id !== offer?.id || this.offer !== offer) this.drag = null;
    this.offer = offer; this.enabled = mode === 'playing' && state?.status === 'playing';
    this.panel.hidden = !offer || state.time < offer.time || !['playing', 'paused'].includes(mode) || state.status !== 'playing';
    if (this.panel.hidden) return;
    const remaining = Math.max(0, offer.expiresAt - state.time);
    this.timer.textContent = `${remaining.toFixed(1)}초`; this.progress.value = remaining;
    for (const [color, button] of this.buttons) {
      button.disabled = !this.enabled; button.classList.toggle('selected', offer.selected === color);
      button.setAttribute('aria-pressed', String(offer.selected === color));
    }
    this.status.textContent = offer.selected ? '선택됨 · 시간이 끝나면 적용' : '선택하지 않으면 무작위 적용';
  }
  clear() { this.offer = null; this.drag = null; this.enabled = false; this.panel.hidden = true; }
}
