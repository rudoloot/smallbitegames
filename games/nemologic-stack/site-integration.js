(() => {
  'use strict';
  const version='0666e9972e1d',directory=new URL('.',location.href);
  let returnUrl=null;
  try {
    const raw=new URLSearchParams(location.search).get('returnTo');
    if(raw){const target=new URL(raw);if(target.protocol==='https:'&&target.origin===location.origin&&!target.username&&!target.password)returnUrl=target.href;}
  } catch {}
  const exit=document.createElement('button');exit.type='button';exit.className='nav-icon site-exit';exit.setAttribute('aria-label','게임 나가기');exit.title='게임 나가기';
  exit.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5H4v14h5M14 7l5 5-5 5M8 12h11"/></svg>';
  exit.addEventListener('click',()=>{
    try{if(typeof save==='function')save();}catch{}
    location.replace(returnUrl||new URL('index.html?v='+version,directory).href);
  });
  (document.querySelector('.header-actions')||document.querySelector('main')).append(exit);
  const back=document.getElementById('navigate-back');
  if(back){
    back.disabled=false;
    back.onclick=()=>{
      const menu=!!document.querySelector('#monochrome-games');
      if(menu){exit.click();return;}
      const mode=document.body.classList.contains('monochrome-game')||document.querySelector('.tutorial-app')?'monochrome':'color';
      const target=new URL('collection.html',directory);target.hash=mode;target.searchParams.set('v',version);
      if(returnUrl)target.searchParams.set('returnTo',returnUrl);
      location.assign(target.href);
    };
  }
  function connect(link){
    const target=new URL(link.href,location.href);
    if(target.origin!==directory.origin||!target.pathname.startsWith(directory.pathname))return;
    const name=target.pathname.slice(directory.pathname.length);
    if(!/^(?:index|tutorial|collection(?:-\d{2})?|monochrome-\d{2,4})\.html$/.test(name))return;
    target.searchParams.set('v',version);
    if(returnUrl)target.searchParams.set('returnTo',returnUrl);else target.searchParams.delete('returnTo');
    link.href=target.href;
  }
  document.querySelectorAll('a[href]').forEach(connect);
  document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(link)connect(link);},true);
})();
