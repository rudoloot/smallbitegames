/* Brief percussion input samples. No correctness or completion cues. */
(() => {
  const key='nonogram-stack-sound-v1',files=new Map([[0,'sounds/input-x-tak.wav'],[1,'sounds/input-1-do.wav'],[2,'sounds/input-2-re.wav'],[3,'sounds/input-3-mi.wav'],[null,'sounds/input-erase-soft.wav']]);
  let enabled=true,context=null,epoch=0;
  const bytes=new Map(),buffers=new Map(),voices=new Set(),last=new Map();
  try{enabled=(globalThis.StackStorage||localStorage).getItem(key)!=='off';}catch{}
  const load=value=>{
    if(!bytes.has(value))bytes.set(value,fetch(files.get(value)).then(response=>{
      if(!response.ok)throw Error('Sound unavailable');
      return response.arrayBuffer();
    }).catch(()=>{bytes.delete(value);return null;}));
    return bytes.get(value);
  };
  const stop=()=>{epoch++;for(const voice of voices){try{voice.stop();}catch{}}voices.clear();};
  const prepare=()=>{
    if(!enabled)return null;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return null;
    try{
      context??=new Audio();
      if(context.state==='suspended')context.resume().catch(()=>{});
      for(const value of files.keys())if(!buffers.has(value)){
        const pending=load(value).then(data=>data?context.decodeAudioData(data.slice(0)):null).catch(()=>null);
        buffers.set(value,pending);
        pending.then(buffer=>{if(!buffer)buffers.delete(value);});
      }
      return context;
    }catch{return null;}
  };
  const play=value=>{
    if(!enabled||!files.has(value)||document.hidden)return;
    const now=Date.now();if(now-(last.get(value)??-Infinity)<45)return;
    last.set(value,now);
    const audio=prepare();if(!audio)return;
    const ticket=epoch;
    Promise.all([buffers.get(value),audio.state==='suspended'?audio.resume():Promise.resolve()]).then(([buffer])=>{
      if(!buffer||!enabled||ticket!==epoch||document.hidden||Date.now()-now>180||audio.state!=='running')return;
      try{
        if(voices.size>=4){const oldest=voices.values().next().value;oldest.stop();voices.delete(oldest);}
        const source=audio.createBufferSource();source.buffer=buffer;source.connect(audio.destination);
        source.onended=()=>{voices.delete(source);source.disconnect();};
        voices.add(source);source.start();
      }catch{/* Audio must never prevent puzzle input. */}
    }).catch(()=>{});
  };
  window.StackInputSound={play,get enabled(){return enabled;},setEnabled(value){
    enabled=!!value;last.clear();if(!enabled)stop();
    try{(globalThis.StackStorage||localStorage).setItem(key,enabled?'on':'off');}catch{}
  }};
  document.addEventListener('pointerdown',prepare,{capture:true,passive:true});
  document.addEventListener('keydown',prepare,{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',stop);
  // Fetch the small assets early, but never create/play an audio context before a gesture.
  if(enabled&&(window.AudioContext||window.webkitAudioContext)&&typeof fetch==='function')for(const value of files.keys())load(value);
})();
