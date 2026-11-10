import { STAGES } from './game/config.js';
import { loadProgress } from './platform/storage.js';
import { icon } from './view/ui-icons.js';
const regions=[{id:'meadow',name:'초록 들판',eyebrow:'GREENFIELD',copy:'작은 공장에서 시작하는 새로운 흐름',color:'#a8bd84'},
 {id:'snow',name:'눈꽃 산업단지',eyebrow:'SNOW VALLEY',copy:'하얀 설원 위, 더 복잡해진 공장들',color:'#adc9d7'}];
const progress=loadProgress();
const isCleared=stage=>progress.some(key=>key.startsWith(stage.id+':'));
function factory(stage, cleared, snow) {
  // Match the in-game camera orientation: map Y runs right-to-left, X runs top-to-bottom.
  const cells = stage.cells ?? Array.from({length:stage.width*stage.height},(_,i)=>(i%stage.width)+','+Math.floor(i/stage.width));
  const tiles = cells.map(key=>{const [x,y]=key.split(',').map(Number);return {u:stage.height-1-y,v:x};});
  const occupied = new Set(tiles.map(({u,v})=>u+','+v));
  const fillPath = tiles.map(({u,v})=>`M${u} ${v}h1v1h-1Z`).join('');
  const border = [];
  for(const {u,v} of tiles){
    if(!occupied.has(u+','+(v-1)))border.push(`M${u} ${v}h1`);
    if(!occupied.has((u+1)+','+v))border.push(`M${u+1} ${v}v1`);
    if(!occupied.has(u+','+(v+1)))border.push(`M${u} ${v+1}h1`);
    if(!occupied.has((u-1)+','+v))border.push(`M${u} ${v}v1`);
  }
  const scale=Math.min(76/stage.height,62/stage.width),left=(100-stage.height*scale)/2,top=(78-stage.width*scale)/2;
  const roof=cleared?(snow?'#d4e3e4':'#d4ddbe'):'#53695e',edge=cleared?'#6e8b7b':'#465f53';
  const holes=stage.holes.map(({x,y})=>`<rect x="${stage.height-1-y+.12}" y="${x+.12}" width=".76" height=".76" fill="${snow?'#e5eff0':'#e6ecd3'}"/>`).join('');
  const clipId='roof-'+stage.id;
  const seams=cleared?Array.from({length:stage.width-1},(_,i)=>`<path d="M0 ${i+1}h${stage.height}"/>`).join(''):'';
  return `<svg viewBox="8 1 84 80" aria-hidden="true" data-footprint-cells="${cells.length}" class="factory-art ${cleared?'restored':'silhouette'}"><defs><clipPath id="${clipId}"><path d="${fillPath}"/></clipPath></defs><g transform="translate(${left} ${top+3}) scale(${scale})"><path d="${fillPath}" fill="#30473c" opacity=".16"/></g><g class="factory-building" transform="translate(${left} ${top}) scale(${scale})"><path class="factory-footprint" d="${fillPath}" fill="${roof}"/><path d="${border.join('')}" fill="none" stroke="${edge}" stroke-width=".17" stroke-linejoin="round"/>${cleared?`<g clip-path="url(#${clipId})" fill="none" stroke="#91a58a" stroke-width=".06">${seams}</g>`:''}${holes}${snow?`<path d="${border.join('')}" fill="none" stroke="#fffdf5" stroke-width=".10"/>`:''}</g></svg>`;
}
const game=document.querySelector('.game');game.hidden=true;
const home=document.createElement('main');home.className='world-home';home.setAttribute('aria-label','공장 스테이지 맵');document.body.append(home);
home.innerHTML=`<header class="world-header"><div class="world-brand"><span class="brand-mark">${icon('crate')}</span><div><strong>FACTORY FIT</strong><small>작은 공간, 더 나은 흐름</small></div></div><span class="world-progress">${STAGES.filter(isCleared).length} / ${STAGES.length} 완료</span></header><section class="region-heading"><p id="region-eyebrow"></p><h1 id="region-name"></h1><p id="region-description"></p></section><div class="world-viewport" aria-label="좌우로 드래그해 지역 변경"><div id="world-pages"></div></div><footer class="world-footer"><button id="region-previous" aria-label="이전 지역">${icon('previous')}</button><div><strong id="region-page"></strong><small>공장을 눌러 시작 · 좌우로 지역 이동</small></div><button id="region-next" aria-label="다음 지역">${icon('next')}</button></footer>`;
const slots=Array.from({length:20},(_,i)=>({x:14+(i%4)*24,y:12+Math.floor(i/4)*18}));
for(const region of regions){
 const snow=region.id==='snow', stages=STAGES.filter(s=>s.region===region.id), page=document.createElement('section');page.className='world-page '+region.id;page.setAttribute('aria-label',region.name);
 const roadColor=snow?'#b7cbd1':'#bac2b3', paving=snow?'#d8e5e7':'#d9dfcb';
 const roads=[...Array.from({length:5},(_,i)=>`M${(2+i*24)*5.6} 20V775`),...Array.from({length:6},(_,i)=>`M10 ${(3+i*18)*8}H550`)].join('');
 const parcels=slots.map(({x,y},i)=>`<rect x="${x*5.6-57}" y="${y*8-58}" width="114" height="116" rx="5" fill="${paving}" stroke="${snow?'#cadce0':'#c8d0b9'}" stroke-width="1.5"/><path d="M${x*5.6} ${y*8+58}v14" stroke="${roadColor}" stroke-width="12"/>`).join('');
 const trees=[26,74].flatMap(x=>[3,39,75].map(y=>`<g transform="translate(${x*5.6} ${y*8})"><circle r="7" fill="${snow?'#f4f9f8':'#8fa979'}"/><circle cx="-2" cy="-2" r="4" fill="${snow?'#d5e6e4':'#adc28a'}"/></g>`)).join('');
 page.innerHTML=`<svg class="region-landscape" viewBox="0 0 560 800" preserveAspectRatio="none" aria-hidden="true"><rect width="560" height="800" rx="30" fill="${snow?'#eaf2f4':'#e9eddd'}"/>${parcels}<path d="${roads}" stroke="${snow?'#f8fcfc':'#f8f8ec'}" stroke-width="24" fill="none"/><path d="${roads}" stroke="${roadColor}" stroke-width="17" fill="none"/><path d="${roads}" stroke="${snow?'#eaf3f5':'#eef0e5'}" stroke-width="1" stroke-dasharray="5 7" fill="none"/>${trees}</svg>`;
 slots.forEach((slot,i)=>{
  const stage=stages[i],node=document.createElement(stage?'button':'div');node.className='factory-node '+(stage?'playable':'future');node.style.left=slot.x+'%';node.style.top=slot.y+'%';
  if(stage){const cleared=isCleared(stage);node.dataset.stageId=stage.id;node.classList.toggle('cleared',cleared);node.setAttribute('aria-label',stage.number+' '+stage.name+' · '+stage.width+'×'+stage.height+' · '+(cleared?'클리어':'미클리어'));
   node.innerHTML=factory(stage,cleared,snow)+`<span class="factory-number">${String(stage.number).padStart(2,'0')}${cleared?' ✓':''}</span><strong>${stage.name}</strong><small>${stage.width} × ${stage.height}</small>`;
   node.addEventListener('click',()=>{if(!suppressClick)location.href=stageUrl(stage.id);});
  }else{node.innerHTML='<span class="future-plot"></span><small>준비 중</small>';node.setAttribute('aria-label','준비 중인 공장 부지');}
  page.append(node);
 });
 document.querySelector('#world-pages').append(page);
}
let selected=Math.max(0,regions.findIndex(r=>r.id===sessionStorage.getItem('factory-fit.region'))),start=null,suppressClick=false;
function showRegion(){const region=regions[selected];home.dataset.theme=region.id;document.querySelector('#region-eyebrow').textContent=region.eyebrow;document.querySelector('#region-name').textContent=region.name;document.querySelector('#region-description').textContent=region.copy;document.querySelector('#world-pages').style.transform=`translateX(-${selected*100}%)`;document.querySelector('#region-page').textContent=(selected+1)+' / '+regions.length;document.querySelector('#region-previous').disabled=selected===0;document.querySelector('#region-next').disabled=selected===regions.length-1;sessionStorage.setItem('factory-fit.region',region.id);document.querySelectorAll('.world-page').forEach((page,i)=>{page.inert=i!==selected;});}
document.querySelector('#region-previous').onclick=()=>{selected=Math.max(0,selected-1);showRegion();};document.querySelector('#region-next').onclick=()=>{selected=Math.min(regions.length-1,selected+1);showRegion();};
const viewport=document.querySelector('.world-viewport');viewport.addEventListener('pointerdown',event=>{start={x:event.clientX,y:event.clientY};suppressClick=false;});
viewport.addEventListener('pointermove',event=>{if(start&&Math.abs(event.clientX-start.x)>12)suppressClick=true;});
window.addEventListener('pointerup',event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){selected=Math.max(0,Math.min(regions.length-1,selected+(dx<0?1:-1)));showRegion();}setTimeout(()=>suppressClick=false,0);});
window.addEventListener('pointercancel',()=>start=null);
showRegion();document.title='Factory Fit · 공장 지도';

function stageUrl(stage) {
  const url = new URL(location.href);
  if (stage) url.searchParams.set("stage", stage);
  else url.searchParams.delete("stage");
  return url.href;
}

const siteExit = document.getElementById("site-exit");
if(siteExit) home.querySelector(".world-header").append(siteExit);
