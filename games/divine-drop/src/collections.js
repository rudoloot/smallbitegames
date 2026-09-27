// Original 18 gifts from 기획서2; expanded recipes remain available in the workshop.
export const SHELF_IDS=Object.freeze(['dog','pegasus','bear','cake','unicorn','wand','console','philosopher_stone','crown','robot','car','dragon','dinosaur','magic_sword','train','rocket','airplane','tank']);
export const SHELF_SET=new Set(SHELF_IDS);
export const shelfCount=save=>SHELF_IDS.filter(id=>save.collectionFirstCreatedAt[id]).length;
export const shelfItems=data=>SHELF_IDS.map(id=>data.byId.get(id));
