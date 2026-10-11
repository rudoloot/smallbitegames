import { weaponForId, chargeColorForWeapon } from './weapons.js?v=92bc1fbf2287';

const pistol = '<path d="M4 8h21v7H15l-2 10H7l2-10H4z"/><path d="M16 15v5h-3"/>';
const icons = {
  pistol,
  dual: `<g transform="translate(-1 -2) scale(.75)">${pistol}</g><g transform="translate(10 8) scale(.75)">${pistol}</g>`,
  machine: '<path d="M2 11h24v6H12l-2 8H5l2-8H2zM26 13h4M17 17l2 7h5l-2-7M8 8h10v3"/>',
  missile: '<path d="M16 2c5 5 7 11 5 19H11c-2-8 0-14 5-19zM11 16l-5 8 5-3M21 16l5 8-5-3M13 24l3 6 3-6"/><circle cx="16" cy="12" r="2"/>',
};

// Shared by the live game and the charge preview so both display real state.
export function updatePlayHUD(root, state) {
  const get = id => root.querySelector(`#${id}`);
  const boss = state.chart.bossMax ? state.boss / state.chart.bossMax * 100 : 0;
  get('bossFill').style.width = `${boss}%`;
  get('bossMeter').setAttribute('aria-valuenow', Math.ceil(boss));
  get('scoreValue').textContent = state.score.toLocaleString('en-US');
  get('comboValue').textContent = state.combo;
  const id = state.weaponId, weapon = weaponForId(id);
  const color = '#' + chargeColorForWeapon(id).toString(16).padStart(6, '0');
  get('weaponName').textContent = id ? weapon.name : '';
  get('weaponName').style.color = color;
  const icon = get('weaponIcon');
  icon.parentElement.classList.toggle('hidden', !id);
  if (!id) { icon.innerHTML = ''; delete icon.dataset.weapon; }
  else if (icon.dataset.weapon !== id) {
    icon.innerHTML = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${icons[id]}</svg>`;
    icon.dataset.weapon = id;
  }
  icon.style.color = color;
  get('energyValue').textContent = state.energy >= 30 ? 'MAX' : state.energy;
  get('energyValue').setAttribute('aria-label', state.energy >= 30 ? '모은 음표 30개 이상 · 최대 충전' : `모은 음표 ${state.energy}개`);
  get('energyValue').classList.toggle('max-charge', state.energy >= 30);
}
