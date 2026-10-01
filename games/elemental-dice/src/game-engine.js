'use strict';
const ED = (() => {
 const data = typeof ED_DATA !== 'undefined' ? ED_DATA : require('./data.js');
 const cards = data.cards, byId = Object.fromEntries(cards.map(c=>[c.id,c]));
 const elements = {fire:{name:'불',color:'#fa876b',glyph:'🔥'},water:{name:'물',color:'#77c6f7',glyph:'💧'},wood:{name:'나무',color:'#a5d38e',glyph:'♣'},earth:{name:'땅',color:'#dbb779',glyph:'▲'},wind:{name:'바람',color:'#9de6d5',glyph:'≋'},neutral:{name:'무속성',color:'#ffffff',glyph:'◇'}};
 const strong = {fire:'wood',wood:'earth',earth:'wind',wind:'water',water:'fire'};
 const names=['철제 룬석','까마귀 깃털','황금 고리','불씨 부적','해일 진주','고목의 씨앗','산맥의 파편','백색 수정','여행자의 성배','쌍둥이 룬'];
 const descriptions=['방어 행동값 +2','바람 공격 +2','전투 골드 +20%','불 공격 +2','물 공격 +2','나무 공격 +2','땅 공격 +2','무속성 공격 +2','전투 시작 시 아군 카드 체력 +5','오른쪽 주사위 2개 이상: 공격 +3'];
 const items={potion:{name:'체력포션',desc:'선택한 생존 카드 체력 30 회복',max:3,buy:15,sell:7},mana:{name:'마나포션',desc:'이번 맵 최대·현재 마나 +1 (상한 10)',max:3,buy:35,sell:17},revive:{name:'수호석',desc:'선택한 카드의 치명타를 한 번 막고 체력 30 회복',max:1,buy:60,sell:30}};
 const artifacts=names.map((name,i)=>{const id='A'+String(i+1).padStart(2,'0');items[id]={name,desc:descriptions[i],max:1,buy:70,sell:35,artifact:true};return id;});
 const kinds=['normal','normal','normal','town','normal','normal','elite','town','normal','normal','boss'];
 let seq=0;
 const uid=p=>p+Date.now().toString(36)+'_'+(++seq).toString(36);
 const copy=x=>JSON.parse(JSON.stringify(x));
 const pick=(a,rng=Math.random)=>a[Math.floor(rng()*a.length)];
 function shuffle(a,rng=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function initial(){return {version:2,balanceVersion:4,rulesVersion:3,collection:Object.fromEntries(data.initial.map(id=>[id,1])),deck:[...data.initial],initialGranted:true,run:null,result:null};}
 function migrateBalance(state){
  if(state.rulesVersion!==3){
   const r=state.run;
   if(r){delete r.hp;delete r.maxHp;delete r.revive;r.roster=r.deck.map(id=>({uid:uid('roster'),id,fallen:false}));
    // Preserve collection/map rewards, restart only an incompatible active encounter.
    if(r.battle&&r.scene!=='reward'){r.battle=null;r.scene='map';r.mana=r.maxMana;}
   }
   state.rulesVersion=3;
  }

  if(state.balanceVersion===4)return state;
  const r=state.run,b=r?.battle;
  if(b){
   // Re-plan an interrupted enemy placement using the same dice, without rerolling.
   if(b.phase==='e_place'){
    b.ePool=[...new Map([...b.ePool,...b.enemies.flatMap(c=>[...c.L,...c.R])].map(d=>[d.uid,d])).values()];
    b.enemies.forEach(clear);b.rollDisplay=copy(b.ePool);b.plan=[];b.planIndex=0;b.queue=[];b.queueIndex=0;b.phase='e_roll';
   }
   for(const c of [...b.players,...b.enemies]){
    const def=byId[c.id],removed=[...c.L.splice(def.leftSlots),...c.R.splice(def.rightSlots)];
    if(c.side==='p'&&b.phase==='p_place')b.pPool=sorted([...b.pPool,...removed]);
    if(c.shield){const a=action(c,c.side==='p'?r.inventory:[],b);c.shield=a.valid?{value:a.value,element:a.element}:null;}
   }
  }
  state.balanceVersion=4;return state;
 }
 function newRun(state,culture,rng=Math.random){
  if(state.run)throw Error('진행 중인 원정을 먼저 마쳐 주세요.');
  if(!data.cultures.includes(culture))throw Error('신화권을 선택해 주세요.');
  if(state.deck.length<10)throw Error('덱은 최소 10장이 필요합니다.');
  const counts={};for(const id of state.deck){counts[id]=(counts[id]||0)+1;if(!byId[id]||counts[id]>(state.collection[id]||0))throw Error('보유 카드 수를 확인해 주세요.');}
  const pool=cards.filter(c=>c.culture===culture),tier=t=>pool.filter(c=>c.tier===t).map(c=>c.id);
  const stages=kinds.map((kind,i)=>{let enemies=[];
   if(kind==='boss')enemies=[tier('정예')[0],tier('정예')[0],tier('정예')[0],tier('보스')[0]];
   else if(kind==='elite')enemies=[pick(tier('중급'),rng),pick(tier('상급'),rng),tier('정예')[0]];
   else if(kind==='normal')enemies=i<2?[pick(tier('하급'),rng),pick(tier('하급'),rng)]:i===2?[pick(tier('하급'),rng),pick(tier('중급'),rng)]:i<6?[pick(tier('중급'),rng),pick(tier('상급'),rng)]:[pick(tier('상급'),rng),pick(tier('상급'),rng),tier('정예')[0]];
   return {kind,enemies};});
  state.result=null;state.run={uid:uid('r'),culture,mana:3,maxMana:3,gold:0,deck:[...state.deck],roster:state.deck.map(id=>({uid:uid('roster'),id,fallen:false})),inventory:[{id:pick(artifacts,rng),count:1},null,null,null,null,null],node:0,scene:'map',stages,towns:{},battle:null,reward:null,startArtifactGranted:true,encountered:[],wins:0};return state.run;
 }
 function endRun(state,status){const r=state.run;if(!r)return;state.result={status,culture:r.culture,wins:r.wins};state.run=null;}
 function makeCard(id,side,pos,boss=false){const c=byId[id];return {uid:uid(side),id,side,pos,boss,hp:c.hp,dead:false,L:[],R:[],used:false,shield:null};}
 const role=c=>c.pos<3?'defense':'attack';
 function clear(c){c.L=[];c.R=[];c.used=false;c.shield=null;}
 function matchup(a,t){return strong[a]===t?1.5:strong[t]===a?.5:1;}
 function conditionMet(c,battle=null){
  const def=byId[c.id],e=def.effect,L=c.L,R=c.R;
  switch(e.condition){
   case 'left_value':return L.some(d=>d.value===e.value);
   case 'left_element':return L.some(d=>d.element===e.element);
   case 'equal_count':return L.length>0&&L.length===R.length;
   case 'left_distinct':return L.length>=2&&new Set(L.map(d=>d.value)).size===L.length;
   case 'left_same':return L.length>=2&&new Set(L.map(d=>d.value)).size===1;
   case 'full':return L.length===def.leftSlots&&R.length===def.rightSlots;
   case 'attack':return role(c)==='attack';
   case 'defense':return role(c)==='defense';
   case 'row_element':case 'column_element':{
    if(!battle)return false;
    const axis=p=>e.condition==='row_element'?Math.floor(p/3):p%3;
    const allies=(c.side==='p'?battle.players:battle.enemies).filter(a=>!a.dead&&axis(a.pos)===axis(c.pos));
    return allies.length>=2&&allies.every(a=>byId[a.id].element===def.element);
   }
   default:return false;
  }
 }
 function action(c,inventory=[],battle=null){
  const def=byId[c.id],all=[...c.L,...c.R],colors=[...new Set(all.map(d=>d.element).filter(e=>e!=='neutral'))];
  const candidate=colors.length===1?colors[0]:'neutral',mode=role(c);
  const element=candidate!=='neutral'&&(mode==='attack'?def.attacks.includes(candidate):def.element===candidate)?candidate:'neutral';
  const sum=c.L.reduce((s,d)=>s+d.value,0),mult=Math.max(1,c.R.length),base=sum*mult;
  const valid=!c.dead&&c.L.length>0&&c.L.length<=def.leftSlots&&c.R.length<=def.rightSlots&&new Set(c.R.map(d=>d.value)).size<=1;
  if(!valid)return {value:0,base:0,bonus:0,artifact:0,element,valid:false,sum,mult};
  const e=def.effect,met=conditionMet(c,battle);
  const bonus=met?e.bonus:0,owned=new Set(inventory.filter(Boolean).map(x=>x.id));let artifact=0;
  if(mode==='defense'&&owned.has('A01'))artifact+=2;
  const matching={wind:'A02',fire:'A04',water:'A05',wood:'A06',earth:'A07',neutral:'A08'};
  if(mode==='attack'){if(owned.has(matching[element]))artifact+=2;if(c.R.length>=2&&owned.has('A10'))artifact+=3;}
  return {value:base+bonus+artifact,base,bonus,artifact,element,valid,sum,mult};
 }
 function roll(cs,rng=Math.random){return cs.filter(c=>!c.dead).flatMap(c=>Object.entries(byId[c.id].dice).flatMap(([element,n])=>Array.from({length:n},()=>({uid:uid('d'),element,value:1+Math.floor(rng()*6)}))));}
 const sorted=ds=>[...ds].sort((a,b)=>a.value-b.value);
 function startBattle(r,rng=Math.random){const stage=r.stages[r.node];if(stage.kind==='town')return;if(r.battle)return r.battle;
  const enemies=stage.enemies.map((id,i)=>makeCard(id,'e',i===3?4:i,stage.kind==='boss'&&i===3));
  r.encountered=[...new Set([...r.encountered,...stage.enemies])];
  const b={uid:uid('b'),kind:stage.kind,phase:'p_select',round:0,opening:true,enemies,players:[],selection:[],deck:[],discard:[],pPool:[],ePool:roll(enemies,rng),rollDisplay:[],plan:[],planIndex:0,queue:[],queueIndex:0,log:[],initialEnemies:[...stage.enemies]};
  b.ePool=[];r.mana=r.maxMana;b.rollDisplay=[];r.battle=b;r.scene='battle';return b;
 }
 function availableCards(r){return r.roster.filter(c=>!c.fallen);}
 function toggleCard(r,rosterId){const b=r.battle;if(b.phase!=='p_select')return false;
  const entry=availableCards(r).find(c=>c.uid===rosterId);if(!entry)return false;
  const index=b.selection.indexOf(rosterId);
  if(index>=0){b.selection.splice(index,1);r.mana+=byId[entry.id].cost;return true;}
  if(b.selection.length>=6||byId[entry.id].cost>r.mana)return false;
  b.selection.push(rosterId);r.mana-=byId[entry.id].cost;return true;
 }
 function deploy(r,rng=Math.random){const b=r.battle;if(b.phase!=='p_select'||!b.selection.length)return false;
  const entries=b.selection.map(id=>availableCards(r).find(c=>c.uid===id));
  if(entries.some(c=>!c)||entries.reduce((n,c)=>n+byId[c.id].cost,0)>r.maxMana)return false;
  b.players=entries.map((entry,i)=>({...makeCard(entry.id,'p',[3,4,5,0,1,2][i]),rosterUid:entry.uid}));
  if(has(r,'A09'))b.players.forEach(c=>{c.hp+=5;c.maxHp=byId[c.id].hp+5;});
  b.ePool=roll(b.enemies,rng);b.rollDisplay=copy(b.ePool);b.phase='e_roll';return true;
 }
 function preparePlayer(r){const b=r.battle;b.pPool=[];b.players.forEach(clear);b.round++;b.opening=false;b.phase='p_prep';}
 function rollPlayer(r,rng=Math.random){const b=r.battle;if(b.phase!=='p_prep')return false;b.players.forEach(clear);b.pPool=roll(b.players,rng);b.rollDisplay=copy(b.pPool);b.phase='p_roll';return true;}
 function finishPlayerRoll(r){const b=r.battle;if(b.phase==='p_roll'){b.pPool=sorted(b.pPool);b.phase='p_place';}}
 function moveCard(b,id,pos){if(!['p_place','p_prep'].includes(b.phase))return false;const c=b.players.find(c=>c.uid===id);if(!c||c.dead||pos<0||pos>5||!Number.isInteger(pos))return false;const other=b.players.find(x=>x.pos===pos&&!x.dead);if(other)other.pos=c.pos;c.pos=pos;return true;}
 function placeDie(b,dieId,cardId,side){if(b.phase!=='p_place'||!['L','R'].includes(side))return false;const c=b.players.find(c=>c.uid===cardId),die=b.pPool.find(d=>d.uid===dieId);if(!c||c.dead||!die)return false;const def=byId[c.id];if(c[side].length>=(side==='L'?def.leftSlots:def.rightSlots))return false;if(side==='R'&&c.R.some(d=>d.value!==die.value))return false;b.pPool=b.pPool.filter(d=>d.uid!==dieId);c[side].push(die);return true;}
 function removeDie(b,cardId,side,index){if(b.phase!=='p_place'||!['L','R'].includes(side))return false;const c=b.players.find(c=>c.uid===cardId);if(!c||!c[side][index])return false;b.pPool=sorted([...b.pPool,c[side].splice(index,1)[0]]);return true;}
 function confirm(r){const b=r.battle;if(b.phase!=='p_place')return false;for(const c of b.players){const a=action(c,r.inventory,b);c.shield=role(c)==='defense'&&a.valid?{value:a.value,element:a.element}:null;}b.pPool=[];b.phase='p_attack';return true;}
 function attackPreview(attacker,target,inv=[],battle=null){const a=action(attacker,inv,battle),element=target.shield?.element||byId[target.id].element,mult=matchup(a.element,element),value=Math.floor(a.value*mult),defense=target.shield?.value||0;return {value,damage:Math.max(0,value-defense),breaks:value>defense,mult,defense,element:a.element};}
 function hit(r,attacker,target){if(!attacker||!target||attacker.dead||target.dead||attacker.used||role(attacker)!=='attack')return null;const a=action(attacker,attacker.side==='p'?r.inventory:[],r.battle);if(!a.valid)return null;
  const result=attackPreview(attacker,target,attacker.side==='p'?r.inventory:[],r.battle);
  if(result.breaks&&target.shield){target.shield=null;target.L=[];target.R=[];}
  target.hp=Math.max(0,target.hp-result.damage);
  if(!target.hp&&target.guard){target.hp=Math.min(target.maxHp||byId[target.id].hp,30);target.guard=false;}
  if(!target.hp){target.dead=true;clear(target);if(target.side==='p'){const entry=r.roster.find(c=>c.uid===target.rosterUid);if(entry)entry.fallen=true;}}
  result.from=attacker.uid;result.to=target.uid;
  attacker.L=[];attacker.R=[];attacker.used=true;r.battle.log.push(`${byId[attacker.id].name} → ${byId[target.id].name}: ${result.value} 공격 − ${result.defense} 방어 = ${result.damage} 피해`);r.battle.log=r.battle.log.slice(-60);return result;
 }
 function playerAttack(r,from,to){const b=r.battle;if(b.phase!=='p_attack')return null;return hit(r,b.players.find(c=>c.uid===from),b.enemies.find(c=>c.uid===to));}
 function beginEnemy(r,rng=Math.random){const b=r.battle;if(b.phase!=='p_attack')return false;b.players.forEach(c=>{if(role(c)==='attack'){c.L=[];c.R=[];}});
  const live=b.enemies.filter(c=>!c.dead);live.forEach(clear);const boss=live.find(c=>c.boss),others=shuffle(live.filter(c=>!c.boss),rng);if(boss)boss.pos=4;
  const positions=boss?[0,3,5,1,2]:b.round%2?[3,4,0,5,1,2]:[3,0,4,5,1,2];others.forEach((c,i)=>c.pos=positions[i]);
  b.ePool=roll(live,rng);b.rollDisplay=copy(b.ePool);b.plan=[];b.planIndex=0;b.queue=[];b.queueIndex=0;b.phase='e_roll';return true;
 }
 function bestLoadout(c,pool,budget,battle){let best={L:[],R:[],score:-1};const def=byId[c.id];budget=Math.min(budget,def.leftSlots+def.rightSlots);const domains=[pool,...Object.keys(elements).map(e=>pool.filter(d=>d.element===e||d.element==='neutral'))];
  for(const ds of domains)for(let value=0;value<=6;value++)for(let n=0;n<=def.rightSlots;n++){if(value===0&&n!==0||value>0&&n===0)continue;const R=ds.filter(d=>d.value===value).slice(0,n);if(R.length!==n||n>=budget)continue;const rem=ds.filter(d=>!R.includes(d)).sort((a,b)=>b.value-a.value);for(let k=1;k<=Math.min(def.leftSlots,budget-n,rem.length);k++){const candidates=[rem.slice(0,k)];
 const e=def.effect;
 if(e.condition==='left_same')for(let face=1;face<=6;face++)candidates.push(rem.filter(d=>d.value===face).slice(0,k));
 if(e.condition==='left_distinct')candidates.push([...new Map(rem.map(d=>[d.value,d])).values()].sort((a,b)=>b.value-a.value).slice(0,k));
 if(e.condition==='left_value'||e.condition==='left_element'){const forced=rem.find(d=>e.condition==='left_value'?d.value===e.value:d.element===e.element);if(forced)candidates.push([forced,...rem.filter(d=>d!==forced).slice(0,k-1)]);}
 for(const L of candidates){if(L.length!==k)continue;const score=action({...c,L,R},[],battle).value;if(score>best.score)best={L,R,score};}}}return best;
 }
 function planEnemy(r){const b=r.battle;if(b.phase!=='e_roll')return;let pool=sorted(b.ePool);const eligible=b.enemies.filter(c=>!c.dead&&(!b.opening||role(c)==='defense'));b.plan=[];
  eligible.forEach((c,i)=>{const budget=Math.min(byId[c.id].leftSlots+byId[c.id].rightSlots,Math.max(1,Math.ceil(pool.length/(eligible.length-i)))),p=bestLoadout(c,pool,budget,b),used=new Set([...p.L,...p.R].map(d=>d.uid));pool=pool.filter(d=>!used.has(d.uid));b.plan.push({uid:c.uid,L:p.L,R:p.R});});b.ePool=sorted(b.ePool);b.planIndex=0;b.phase='e_place';
 }
 function enemyPlacementStep(r){const b=r.battle;if(b.phase!=='e_place')return false;if(b.planIndex<b.plan.length){const p=b.plan[b.planIndex++],c=b.enemies.find(c=>c.uid===p.uid);c.L=p.L;c.R=p.R;const used=new Set([...p.L,...p.R].map(d=>d.uid));b.ePool=b.ePool.filter(d=>!used.has(d.uid));const a=action(c,[],b);c.shield=role(c)==='defense'&&a.valid?{value:a.value,element:a.element}:null;return true;}b.ePool=[];b.queue=b.opening?[]:b.enemies.filter(c=>!c.dead&&role(c)==='attack'&&action(c,[],b).valid).map(c=>c.uid);b.queueIndex=0;b.phase='e_attack';return false;}
 function enemyAttackStep(r){const b=r.battle;if(b.phase!=='e_attack'||b.queueIndex>=b.queue.length)return null;const id=b.queue[b.queueIndex++],c=b.enemies.find(c=>c.uid===id),targets=b.players.filter(t=>!t.dead).sort((a,z)=>attackPreview(c,z,[],b).damage-attackPreview(c,a,[],b).damage);return hit(r,c,targets[0]);}
 function won(r){return r.battle.enemies.every(c=>c.dead);}
 function lost(r){return r.battle.phase!=='p_select'&&r.battle.players.length>0&&r.battle.players.every(c=>c.dead);}
 const has=(r,id)=>r.inventory.some(s=>s?.id===id);
 function addItem(r,id){const def=items[id];if(!def)return false;const slot=r.inventory.find(s=>s?.id===id&&s.count<def.max);if(slot){slot.count++;return true;}const i=r.inventory.indexOf(null);if(i<0)return false;r.inventory[i]={id,count:1};return true;}
 function useItem(r,index,cardId){const slot=r.inventory[index],b=r.battle;if(!slot||!b||!['p_select','p_prep','p_place'].includes(b.phase))return false;
  const target=b.players.find(c=>c.uid===cardId&&!c.dead);
  if(slot.id==='potion'){if(!target||target.hp>=(target.maxHp||byId[target.id].hp))return false;target.hp=Math.min(target.maxHp||byId[target.id].hp,target.hp+30);}
  else if(slot.id==='mana'){if(r.maxMana>=10)return false;r.maxMana++;r.mana++;}
  else if(slot.id==='revive'){if(!target||target.guard)return false;target.guard=true;}
  else return false;if(--slot.count===0)r.inventory[index]=null;return true;
 }
 function victory(state,rng=Math.random){const r=state.run,b=r.battle;if(!won(r)||r.reward)return;const kind=b.kind;let gold=kind==='boss'?0:kind==='elite'?50:20;if(has(r,'A03'))gold=Math.floor(gold*1.2);r.gold+=gold;r.wins++;
  const card=kind==='normal'?pick(b.initialEnemies,rng):kind==='boss'?pick([...new Set(r.encountered)],rng):null;r.reward={kind,gold,card,choice:kind==='normal'?null:'done',items:kind==='elite'?Array.from({length:2},()=>({id:pick(Object.keys(items),rng),status:'pending'})):[]};if(kind==='boss')state.collection[card]=(state.collection[card]||0)+1;b.phase='won';r.scene='reward';
 }
 function chooseReward(state,choice){const r=state.run,q=r?.reward;if(!q||q.kind!=='normal'||q.choice!==null||!['card','mana'].includes(choice))return false;if(choice==='mana'){if(r.maxMana>=10)return false;r.maxMana++;r.mana=Math.min(r.maxMana,r.mana+1);}else state.collection[q.card]=(state.collection[q.card]||0)+1;q.choice=choice;return true;}
 function resolveRewardItem(r,index,replace){const it=r.reward?.items[index];if(!it||it.status!=='pending')return false;if(replace==='skip'){it.status='declined';return true;}if(Number.isInteger(replace)&&replace>=0&&replace<6){r.inventory[replace]={id:it.id,count:1};it.status='received';return true;}if(addItem(r,it.id)){it.status='received';return true;}return false;}
 function rewardNext(state){const r=state.run,q=r?.reward;if(!q||q.choice===null||q.items.some(i=>i.status==='pending'))return false;if(q.kind==='boss'){endRun(state,'cleared');return true;}r.node++;r.battle=null;r.reward=null;r.scene='map';return true;}
 function enterTown(r,rng=Math.random){if(!r.towns[r.node]){const stock={potion:3,mana:3,revive:1,[pick(artifacts,rng)]:1};let event='조용한 마을에서 잠시 쉬어 갑니다.',pending=null;if(rng()<.3){const type=pick(['gold','heal','gift'],rng);if(type==='gold'){r.gold+=15;event='여행 주머니에서 15골드를 얻었습니다.';}else if(type==='heal'){if(!addItem(r,'potion'))pending='potion';event='룬샘에서 카드 회복 포션을 얻었습니다.';}else{event='까마귀가 체력포션을 가져왔습니다.';if(!addItem(r,'potion'))pending='potion';}}r.towns[r.node]={stock,event,pending};}r.scene='town';}
 function buy(r,id){const t=r.towns[r.node],it=items[id];if(r.scene!=='town'||!it||!t?.stock[id]||r.gold<it.buy||!addItem(r,id))return false;r.gold-=it.buy;t.stock[id]--;return true;}
 function sell(r,index){const s=r.inventory[index];if(r.scene!=='town'||!s)return false;r.gold+=items[s.id].sell;if(--s.count===0)r.inventory[index]=null;return true;}
 function validate(b){const errors=[];for(const [cs,pool]of [[b.players,b.pPool],[b.enemies,b.ePool]]){const ids=pool.map(d=>d.uid),pos=new Set();for(const c of cs){if(pos.has(c.pos)&&!c.dead)errors.push('position');if(!c.dead)pos.add(c.pos);if(c.boss&&c.pos!==4)errors.push('boss position');if(c.L.length>byId[c.id].leftSlots||c.R.length>byId[c.id].rightSlots||new Set(c.R.map(d=>d.value)).size>1)errors.push('slots');ids.push(...c.L.map(d=>d.uid),...c.R.map(d=>d.uid));}if(new Set(ids).size!==ids.length)errors.push('duplicate dice');}return errors;}
 return {data,cards,byId,elements,items,artifacts,kinds,copy,pick,shuffle,initial,migrateBalance,newRun,endRun,makeCard,role,clear,matchup,conditionMet,action,roll,sorted,startBattle,availableCards,toggleCard,deploy,preparePlayer,rollPlayer,finishPlayerRoll,moveCard,placeDie,removeDie,confirm,attackPreview,hit,playerAttack,beginEnemy,planEnemy,enemyPlacementStep,enemyAttackStep,won,lost,has,addItem,useItem,victory,chooseReward,resolveRewardItem,rewardNext,enterTown,buy,sell,validate};
})();
if(typeof module!=='undefined')module.exports=ED;
