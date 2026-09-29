export const WEAPONS = {
 pistol: {name:'기본 권총',kind:'pistol',damage:100,interval:.5,ammo:Infinity,pellets:1,color:0xffedaa},
 machine: {name:'기관총',kind:'machine',damage:85,interval:.16,ammo:100,pellets:1,color:0xffcf71},
 minigun: {name:'미니건',kind:'minigun',damage:65,interval:.075,ammo:240,pellets:1,color:0xffb15e},
 rocket: {name:'로켓런처',kind:'rocket',damage:950,interval:1.25,ammo:12,pellets:1,color:0xff876b},
 dual: {name:'쌍권총',kind:'dual',damage:90,interval:.3,ammo:100,pellets:2,color:0xfff1b6},
 rail: {name:'레일건',kind:'rail',damage:750,interval:.85,ammo:18,pellets:1,color:0x8effee},
};
export const DROP_WEAPONS=Object.keys(WEAPONS).filter(id=>id!=='pistol');
export const weaponForId=id=>WEAPONS[id]||WEAPONS.pistol;
