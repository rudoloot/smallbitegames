export const WEAPONS = {
 pistol: {name:'기본 권총',kind:'pistol',damage:20,interval:.5/1.3/1.5,ammo:Infinity,pellets:1,color:0xe9f3ff},
 machine: {name:'기관총',kind:'machine',damage:85,interval:.16/1.3,ammo:100,pellets:1,color:0x73ff83},
 minigun: {name:'미니건',kind:'minigun',damage:65,interval:.075/1.3,ammo:240,pellets:1,color:0xffc329},
 rocket: {name:'로켓런처',kind:'rocket',damage:950,interval:1.25/1.3,ammo:12,pellets:1,color:0xff554d},
 dual: {name:'쌍권총',kind:'dual',damage:90,interval:.3/1.3,ammo:100,pellets:2,color:0xff70db},
 rail: {name:'레일건',kind:'rail',damage:750,interval:.85/1.3,ammo:18,pellets:1,color:0x43ddff},
};
export const weaponForId=id=>WEAPONS[id]||WEAPONS.pistol;
