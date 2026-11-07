// Loot has its own RNG: opening a box never changes the combat critical rolls.
const SUPPLY_ITEMS=Object.freeze({
 heal:{name:'구급약',color:'#a8ddbc',icon:'+',effect:'체력 +15'},
 strength:{name:'강화석',color:'#f2c68b',icon:'↑',effect:'힘 +5'},
 moveRadius:{name:'기동 부츠',color:'#9bc9ef',icon:'»',effect:'이동 반경 +0.5m'},
 sight:{name:'정찰 렌즈',color:'#c7b5ed',icon:'◎',effect:'시야 +1m'}
});
function rollSupplyLoot(game){
 let n=game.lootRngState;n^=n<<13;n^=n>>>17;n^=n<<5;game.lootRngState=n>>>0;
 const roll=game.lootRngState/4294967296;
 return roll<.45?'heal':roll<.70?'strength':roll<.85?'moveRadius':'sight';
}
function breakSupplyCrate(game,crate){
 if(!crate.alive)return false;
 crate.alive=false;const kind=rollSupplyLoot(game);
 game.drops.push({id:++game.dropSerial,x:crate.x,y:crate.y,kind,collected:false});
 game.emitNoise(crate,RULES.impactNoise);
 game.effects.push({type:'crateBreak',x:crate.x,y:crate.y,t:0});return true;
}
function collectSupplyDrops(game,all=false){
 if(!all&&(game.phase!=='move'||game.jump))return 0;
 let count=0;
 for(const drop of game.drops){
  if(drop.collected||!all&&(dist(drop,game.player)>70||!clearEnemyAttackPath(game,game.player,drop)))continue;
  const item=SUPPLY_ITEMS[drop.kind];if(!item)continue;
  let effect=item.effect;
  if(drop.kind==='heal'){
   const amount=Math.min(15,game.stats.health-game.hp);if(amount<=0)continue;
   game.hp+=amount;effect='체력 +'+amount;
  }else if(!game.upgradeStat(drop.kind))continue;
  drop.collected=true;game.itemsCollected[drop.kind]=(game.itemsCollected[drop.kind]||0)+1;count++;
  game.lastPickup={serial:++game.pickupSerial,name:item.name,effect};game.pickupNoticeAge=0;
  game.effects.push({type:'pickup',x:drop.x,y:drop.y,t:0,text:item.name+' · '+effect,color:item.color});
  game.log('pickup');
 }
 return count;
}
