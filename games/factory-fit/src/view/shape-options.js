import { EQUIPMENT_SHAPES } from '../game/equipment-shapes.js';

export function shapeLabel(key, suffix = true) {
  return ({ original: '원형', mirror: '좌우 미러형' })[key] ?? key + (suffix ? '형' : '');
}

export function showShapeOptions(select, type, selected) {
  const spec = EQUIPMENT_SHAPES[type];
  select.hidden = !spec;
  if (!spec) return;
  if (select.dataset.type !== type) {
    select.dataset.type = type;
    select.replaceChildren(...Object.keys(spec.variants).map(key => new Option(shapeLabel(key), key)));
  }
  select.value = Object.hasOwn(spec.variants, selected) ? selected : spec.defaultVariant;
}
