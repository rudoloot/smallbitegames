import {SHELF_SET,shelfCount,shelfItems} from './collections.js';
export const WORLD=Object.freeze({left:224,right:1056,top:112,bottom:656,spawnY:156,dangerY:200,cameraX:192,cameraY:32,cameraW:896,cameraH:648});
export const ELEMENTS=['fire','water','air','earth'];
export const MILESTONES=[1,3,6,10,14,18];
export const keyFor=(a,b)=>[a,b].sort().join('::');
export function indexData(data){return {...data,byId:new Map(data.items.map(x=>[x.id,x])),byPair:new Map(data.recipes.map(x=>[keyFor(...x.inputs),x])),byResult:new Map(data.recipes.map(x=>[x.result,x]))};}
export class Supply {
  constructor(random=Math.random){this.random=random;this.current=this.draw();this.next=this.draw();}
  draw(){return ELEMENTS[Math.min(3,Math.max(0,Math.floor(this.random()*4)))];}
  consume(){const result=this.current;this.current=this.next;this.next=this.draw();return result;}
}
export function clientToWorld(clientX,clientY,rect){return {x:WORLD.cameraX+(clientX-rect.left)/rect.width*WORLD.cameraW,y:WORLD.cameraY+(clientY-rect.top)/rect.height*WORLD.cameraH};}
export function fitWorld(width,height){const scale=Math.min(width/WORLD.cameraW,height/WORLD.cameraH);return {width:WORLD.cameraW*scale,height:WORLD.cameraH*scale,scale};}
export function returnTarget(search,origin,partners=[]){
  const raw=new URLSearchParams(search).get('returnTo'); if(!raw)return null;
  try{const target=new URL(raw);const allowed=new Set([origin,...partners]);if(target.protocol!=='https:'||!allowed.has(target.origin)||target.username||target.password)return null;return target.href;}catch{return null;}
}
export function blankSave(){return {schemaVersion:2,highScore:0,discoveredItemIds:[...ELEMENTS],discoveredRecipeIds:[],craftedCountByItem:{},collectionFirstCreatedAt:{},seenMilestones:[],settings:{muted:false}};}
export function normalizeSave(raw,data){
  const result=blankSave(); if(!raw||typeof raw!=='object')return result;
  const validIds=data.byId;const validRecipes=new Set(data.recipes.map(x=>x.id));
  const goodNumber=x=>Number.isSafeInteger(x)&&x>=0;
  if(goodNumber(raw.highScore))result.highScore=raw.highScore;
  result.discoveredItemIds=[...new Set([...ELEMENTS,...(Array.isArray(raw.discoveredItemIds)?raw.discoveredItemIds.filter(x=>validIds.has(x)):[])])];
  result.discoveredRecipeIds=Array.isArray(raw.discoveredRecipeIds)?[...new Set(raw.discoveredRecipeIds.filter(x=>validRecipes.has(x)))]:[];
  for(const [id,count] of Object.entries(raw.craftedCountByItem||{}))if(validIds.has(id)&&goodNumber(count))result.craftedCountByItem[id]=count;
  for(const [id,date] of Object.entries(raw.collectionFirstCreatedAt||{}))if(validIds.get(id)?.kind==='collection'&&typeof date==='string'&&Number.isFinite(Date.parse(date)))result.collectionFirstCreatedAt[id]=date;
  result.seenMilestones=Array.isArray(raw.seenMilestones)?raw.seenMilestones.filter(x=>typeof x==='string'):[];
  result.settings.muted=raw.settings?.muted===true;
  if(goodNumber(raw.legacyHighScore))result.legacyHighScore=raw.legacyHighScore;
  return result;
}
export function unlocked(save,data){
  const count=shelfCount(save);
  const keys=MILESTONES.filter(n=>count>=n).map(n=>`count_${n}`);
  for(const category of data.categories){const items=shelfItems(data).filter(i=>i.category===category.id);if(items.length&&items.every(i=>save.collectionFirstCreatedAt[i.id]))keys.push(`category_${category.id}`);}
  return keys;
}
export function recordMerge(save,item,recipeId,now=new Date().toISOString()){
  const firstDiscovery=!save.discoveredItemIds.includes(item.id);
  if(firstDiscovery)save.discoveredItemIds.push(item.id);
  if(!save.discoveredRecipeIds.includes(recipeId))save.discoveredRecipeIds.push(recipeId);
  save.craftedCountByItem[item.id]=(save.craftedCountByItem[item.id]||0)+1;
  const firstCollection=SHELF_SET.has(item.id)&&!save.collectionFirstCreatedAt[item.id];
  if(firstCollection)save.collectionFirstCreatedAt[item.id]=now;
  return {firstDiscovery,firstCollection};
}
