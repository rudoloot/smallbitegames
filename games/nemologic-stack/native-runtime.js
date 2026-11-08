/* Keep original save keys; browser saves have an IndexedDB backup, Android uses SQLite. */
(() => {
 'use strict';
 const cap=window.capacitorExports?.Capacitor,native=!!cap?.isNativePlatform(),plugin=native?window.capacitorExports.registerPlugin('StackNative'):null;
 const pending=new Map(),cache=new Map(),mirrors=new Map(),immediateFailures=new Set();let active=null,hydrating=true,browserDB=null,adsReady=null,rewardWork=null,navigation=null;
 const allowed=key=>/^(nonogram-stack-|rgb-stack-|nemologic-)/.test(key);
 function localValue(key){try{return localStorage.getItem(key);}catch{return null;}}
 function notice(){
  if(!document.body)return;
  let node=document.getElementById('storage-notice');if(!node){node=document.createElement('p');node.id='storage-notice';node.className='storage-notice';node.setAttribute('role','alert');document.body.append(node);}
  const host=document.querySelector('dialog[open]')||document.body;
  if(node.parentElement!==host)host.append(node);node.hidden=false;
  if(host!==document.body)host.addEventListener('close',()=>{if(node.parentElement===host)document.body.append(node);},{once:true});
  node.textContent='진행을 저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.';
 }
 function clearNotice(){if(!immediateFailures.size){const node=document.getElementById('storage-notice');if(node)node.hidden=true;}}
 function openBrowserStore(){return new Promise((resolve,reject)=>{
  const request=indexedDB.open('nonogram-stack-progress-v1',1);let blocked=false;
  request.onupgradeneeded=()=>request.result.createObjectStore('saves',{keyPath:'key'});
  request.onerror=()=>reject(request.error||Error('Could not open progress storage'));
  request.onblocked=()=>{blocked=true;reject(Error('Progress storage is blocked'));};
  request.onsuccess=()=>{const db=request.result;if(blocked){db.close();return;}db.onversionchange=()=>db.close();resolve(db);};
 });}
 function readBrowserStore(db){return new Promise((resolve,reject)=>{
  const tx=db.transaction('saves','readonly'),request=tx.objectStore('saves').getAll();
  tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(tx.error||Error('Could not read progress storage'));
 });}
 function writeBrowserStore(batch){return new Promise((resolve,reject)=>{
  const tx=browserDB.transaction('saves','readwrite'),store=tx.objectStore('saves');
  for(const [key,value]of Object.entries(batch))store.put({key,value,localValue:mirrors.get(key)??null});
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('Could not save progress'));
 });}
 function mergeBrowserRecords(records){
  for(const row of records)if(allowed(row.key)&&typeof row.value==='string'&&!pending.has(row.key)){
   const local=localValue(row.key);
   // Respect newer localStorage writes made by a legacy tab or app version.
   cache.set(row.key,local===null||local===row.localValue?row.value:local);mirrors.set(row.key,local);
  }
 }
 async function flush(){
  if(hydrating||!native&&!browserDB)return;
  if(active)return active;
  active=(async()=>{while(pending.size){const batch=Object.fromEntries(pending);pending.clear();try{if(native)await plugin.putStore({values:batch});else await writeBrowserStore(batch);}catch(error){for(const [key,value]of Object.entries(batch))if(!pending.has(key))pending.set(key,value);notice();throw error;}}clearNotice();})();
  try{await active;}finally{active=null;}
 }
 const storage={getItem(key){
  if(allowed(key)&&cache.has(key)){
   const local=localValue(key);
   if(!native&&local!==null&&local!==mirrors.get(key)){cache.set(key,local);mirrors.set(key,local);}
   return cache.get(key);
  }
  return localStorage.getItem(key);
 },setItem(key,value){
  value=String(value);let failure=null;
  try{localStorage.setItem(key,value);}catch(error){failure=error;}
  if(failure&&(!allowed(key)||!native&&!browserDB)){immediateFailures.add(key);notice();throw failure;}
  if(allowed(key)){
   cache.set(key,value);mirrors.set(key,localValue(key));immediateFailures.delete(key);
   if(native||browserDB){pending.set(key,value);if(!hydrating)queueMicrotask(()=>flush().catch(()=>{}));}
   else clearNotice();
  }
 }};
 const ready=(async()=>{
  try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(allowed(key)){const value=localStorage.getItem(key);cache.set(key,value);mirrors.set(key,value);}}}catch{/* The durable store may still be available when localStorage is blocked. */}
  if(native){try{
   const configuration=await plugin.getStore(),{values}=configuration;
   runtime.privacyPolicyUrl=configuration.privacyPolicyUrl||'';runtime.supportEmail=configuration.supportEmail||'';
   for(const [key,value]of Object.entries(values||{}))if(allowed(key)){cache.set(key,value);try{localStorage.setItem(key,value);}catch{/* SQLite remains authoritative when the WebView mirror is full. */}mirrors.set(key,localValue(key));}
   // Existing WebView saves are imported on first native launch, with original keys.
   for(const [key,value]of cache)if(!Object.hasOwn(values||{},key))pending.set(key,value);
  }catch{notice();}}
  else if(globalThis.indexedDB){try{
   const db=await openBrowserStore(),records=await readBrowserStore(db);browserDB=db;
   mergeBrowserRecords(records);
   // Back up existing saves without removing or changing other games' data.
   const backedUp=new Map(records.map(row=>[row.key,row]));
   for(const [key,value]of cache){const row=backedUp.get(key);if(!row||row.value!==value||row.localValue!==mirrors.get(key))pending.set(key,value);}
  }catch{/* Preserve the legacy localStorage path if IndexedDB is unavailable. */}}
  hydrating=false;await flush();
 })();
 async function drainRewards(){
  if(!native||!window.StackHintWallet)return;
  if(rewardWork)return rewardWork;
  rewardWork=(async()=>{const {rewards}=await plugin.getRewards();const wallet=StackHintWallet.create(storage);for(const reward of rewards||[]){wallet.grantReward(reward.id);await flush();await plugin.ackReward({id:reward.id});}window.dispatchEvent(new Event('stack-hints-change'));})();
  try{await rewardWork;}finally{rewardWork=null;}
 }
 async function initializeAds(){
  if(!native)return {canRequestAds:false,privacyOptionsRequired:false};
  if(!adsReady)adsReady=plugin.initializeAds().then(status=>{runtime.privacyOptionsRequired=!!status.privacyOptionsRequired;runtime.privacyPolicyUrl=status.privacyPolicyUrl||'';runtime.supportEmail=status.supportEmail||'';window.dispatchEvent(new Event('stack-privacy-change'));if(!status.canRequestAds)adsReady=null;return status;}).catch(error=>{adsReady=null;throw error;});
  return adsReady;
 }
 const ads={
  async acquireHint(){
   if(!native)return {earned:false,reason:'unavailable'};
   await initializeAds();window.stopStackControls?.();window.finishStroke?.();
   const result=await plugin.showRewarded();await drainRewards();return result;
  },
  async recordCompletion(){if(native){await flush();await plugin.recordCompletion();}},
  async transition(){if(native){await initializeAds();await plugin.showInterstitial();}},
  async refresh(){if(native){await drainRewards();await initializeAds();}}
 };
 const runtime={isNative:native,ready,flush,ads,recoverRewards:drainRewards,reportStorageFailure:notice,privacyOptionsRequired:false,completion:Promise.resolve(),
  collectionUrl(){const mode=document.body?.dataset?.presentation||document.body?.dataset?.mode||'color',id=window.StackPuzzle?.id;return 'collection.html'+(id?'?puzzle='+encodeURIComponent(id):'')+'#'+mode;},
  async exit(){
   try{await ready;window.stopStackControls?.();window.finishStroke?.();await flush();if(native)await plugin.exitApp();else{window.close();if(!window.closed){let text=document.getElementById('browser-exit-note');if(!text){text=document.createElement('p');text.id='browser-exit-note';text.className='storage-notice';text.setAttribute('role','status');document.body.append(text);}text.textContent='브라우저 탭을 닫아 나갈 수 있어요.';}}}
   catch(error){notice(error);throw error;}
  },
  async privacyChoices(){if(native){const status=await plugin.privacyOptions();runtime.privacyOptionsRequired=!!status.privacyOptionsRequired;adsReady=null;await initializeAds();window.dispatchEvent(new Event('stack-privacy-change'));}},
  async navigate(url,completion=false){
   if(navigation)return navigation;
   navigation=(async()=>{await ready;await flush();
    if(completion){try{await runtime.completion;await ads.transition();}catch{/* An unavailable ad never blocks a completed game. */}}
    await flush();location.href=url;
   })();
   try{await navigation;}finally{navigation=null;}
  },
  handleBack(){const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();return true;}if(window.closeStackPageOverview?.())return true;if(window.stackHintSelecting){window.cancelStackHintSelection();return true;}if(window.StackPuzzle||document.querySelector('.tutorial-app')){runtime.navigate(runtime.collectionUrl()).catch(notice);return true;}if(native){runtime.exit().catch(()=>{});return true;}return false;}
 };
 window.StackStorage=storage;window.StackRuntime=runtime;
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');if(!native&&!browserDB||!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||link.target||link.hasAttribute('download'))return;
  const url=new URL(link.href,location.href);if(url.origin!==location.origin)return;
  event.preventDefault();runtime.navigate(url.href,!!link.closest('#win-dialog')).catch(notice);
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&native)ads.refresh().catch(()=>{});else flush().catch(()=>{});});
 window.addEventListener('pagehide',()=>{flush().catch(()=>{});});
 window.addEventListener('pageshow',event=>{if(event.persisted&&browserDB)(async()=>{await flush();mergeBrowserRecords(await readBrowserStore(browserDB));window.dispatchEvent(new Event('stack-storage-change'));})().catch(notice);});
 ready.then(()=>{if(native){plugin.addListener('rewardAvailable',()=>drainRewards().catch(()=>{}));drainRewards().catch(()=>{});initializeAds().catch(()=>{});}}).catch(notice);
})();
