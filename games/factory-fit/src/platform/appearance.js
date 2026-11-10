export const DEFAULT_EQUIPMENT_COLOR = '#788665';
export function loadEquipmentColor() { try { const value=localStorage.getItem('factory-fit.equipment-color'); return /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_EQUIPMENT_COLOR; } catch { return DEFAULT_EQUIPMENT_COLOR; } }
export function saveEquipmentColor(value) { if(!/^#[0-9a-f]{6}$/i.test(value))return false;try{localStorage.setItem('factory-fit.equipment-color',value);return true;}catch{return false;} }
