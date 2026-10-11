export const WEAPONS = {
 pistol: {name:'기본 권총',kind:'pistol',damage:20,interval:.5/1.3/1.5,ammo:Infinity,pellets:1,color:0xe9f3ff},
 machine: {name:'기관총',kind:'machine',damage:55,interval:.055,ammo:10,pellets:1,color:0x73ff83},
 minigun: {name:'미니건',kind:'minigun',damage:65,interval:.075/1.3,ammo:240,pellets:1,color:0xffc329},
 rocket: {name:'로켓런처',kind:'rocket',damage:950,interval:1.25/1.3,ammo:12,pellets:1,color:0xff554d},
 dual: {name:'쌍권총',kind:'dual',damage:45,interval:.07,ammo:5,pellets:1,color:0xff70db},
 missile: {name:'미사일',kind:'rocket',damage:1000,interval:0,ammo:1,pellets:1,color:0xcfbcff},
 rail: {name:'레일건',kind:'rail',damage:750,interval:.85/1.3,ammo:18,pellets:1,color:0x43ddff},
};
export const weaponForId=id=>WEAPONS[id]||WEAPONS.pistol;
export const CHARGE_ATTACKS = Object.freeze([
 Object.freeze({ min: 1, weapon: 'pistol', shots: 1, damage: 20, interval: 0, totalDamage: 20 }),
 Object.freeze({ min: 10, weapon: 'dual', shots: 5, damage: 45, interval: .07, totalDamage: 225 }),
 Object.freeze({ min: 20, weapon: 'machine', shots: 10, damage: 55, interval: .055, totalDamage: 550 }),
 Object.freeze({ min: 30, weapon: 'missile', shots: 1, damage: 1000, interval: 0, totalDamage: 1000 }),
]);
export function attackForEnergy(energy) {
 return CHARGE_ATTACKS.findLast(attack => energy >= attack.min) ?? null;
}
