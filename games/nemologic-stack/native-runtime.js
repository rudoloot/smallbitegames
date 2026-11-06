/* Browser remains local; Android mirrors the same save keys into a SQLite transaction. */
(() => {
 'use strict';
 const cap=window.capacitorExports?.Capacitor,native=!!cap?.isNativePlatform(),plugin=native?window.capacitorExports.registerPlugin('StackNative'):null;
 const pending=new Map();let active=null,hydrating=true,adsReady=null,rewardWork=null,navigation=null;
 const allowed=key=>/^(nonogram-stack-|rgb-stack-|nemologic-)/.test(key);
 function notice(){
  if(!document.body)return;
  let node=document.getElementById('storage-notice');if(!node){node=document.createElement('p');node.id='storage-notice';node.className='storage-notice';node.setAttribute('role','alert');document.body.append(node);}
  node.textContent='진행을 저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.';
 }
 async function flush(){
  if(!native||hydrating)return;
  if(active)return active;
  active=(async()=>{while(pending.size){const batch=Object.fromEntries(pending);pending.clear();try{await plugin.putStore({values:batch});}catch(error){for(const [key,value]of Object.entries(batch))if(!pending.has(key))pending.set(key,value);notice();throw error;}}})();
  try{await active;}finally{active=null;}
 }
 const storage={getItem:key=>localStorage.getItem(key),setItem(key,value){
  localStorage.setItem(key,String(value));
  if(native&&allowed(key)){pending.set(key,String(value));if(!hydrating)queueMicrotask(()=>flush().catch(()=>{}));}
 }};
 const ready=(async()=>{
  if(native){try{
   const configuration=await plugin.getStore(),{values}=configuration;
   runtime.privacyPolicyUrl=configuration.privacyPolicyUrl||'';runtime.supportEmail=configuration.supportEmail||'';
   for(const [key,value]of Object.entries(values||{}))if(allowed(key))localStorage.setItem(key,value);
   // Existing WebView saves are imported on first native launch, with original keys.
   for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(allowed(key)&&!Object.hasOwn(values||{},key))pending.set(key,localStorage.getItem(key));}
  }catch{notice();}}
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
 const runtime={isNative:native,ready,flush,ads,recoverRewards:drainRewards,privacyOptionsRequired:false,completion:Promise.resolve(),
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
  const link=event.target.closest('a[href]');if(!native||!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||link.target||link.hasAttribute('download'))return;
  const url=new URL(link.href,location.href);if(url.origin!==location.origin)return;
  event.preventDefault();runtime.navigate(url.href,!!link.closest('#win-dialog')).catch(notice);
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&native)ads.refresh().catch(()=>{});else flush().catch(()=>{});});
 window.addEventListener('pagehide',()=>{flush().catch(()=>{});});
 ready.then(()=>{if(native){plugin.addListener('rewardAvailable',()=>drainRewards().catch(()=>{}));drainRewards().catch(()=>{});initializeAds().catch(()=>{});}}).catch(notice);
})();
