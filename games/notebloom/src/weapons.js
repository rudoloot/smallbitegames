const WEAPONS = [
  { name: 'PULSE PISTOL', kind: 'pistol', path: 'M8 8h70v6h14v12H47l-5 18H25l5-22H8z' },
  { name: 'PRISM RIFLE', kind: 'rifle', path: 'M4 15h16l7-7h40v7h29v8H65v7H45l-4 15H29l3-20H18L4 32z' },
  { name: 'BLOOM SMG', kind: 'smg', path: 'M9 11h58v6h18v10H58v17H45V27H34l-4 16H17l4-20H9z' },
  { name: 'BLOOM MACHINE GUN', kind: 'machine', path: 'M3 12h57v4h36v9H59v17H35V29H25l-5 14H9l7-22H3z' },
  { name: 'BLOOM MINIGUN', kind: 'minigun', path: 'M5 16h20V8h18v7h50v7H43v4h50v7H43v5H25V24H15l-3 20H3z' },
];
export const weaponForLevel = level => WEAPONS[Math.min(WEAPONS.length - 1, Math.max(0, level - 1))];
