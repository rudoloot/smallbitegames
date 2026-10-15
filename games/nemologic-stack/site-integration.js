(() => {
  'use strict';
  const version='2eed1f955c37',directory=new URL('.',location.href);
  let returnUrl=null;
  try {
    const raw=new URLSearchParams(location.search).get('returnTo');
    if(raw){const target=new URL(raw);if(target.protocol==='https:'&&target.origin===location.origin&&!target.username&&!target.password)returnUrl=target.href;}
  } catch {}
  const bar=document.createElement('nav');bar.className='site-navigation';bar.setAttribute('aria-label','게임 종료');
  const exit=document.createElement('button');exit.type='button';exit.className='site-exit';exit.textContent='← 게임 나가기';
  exit.addEventListener('click',()=>{
    try{if(typeof save==='function')save();}catch{}
    location.replace(returnUrl||new URL('index.html?v='+version,directory).href);
  });
  bar.append(exit);document.querySelector('main').prepend(bar);
  function connect(link){
    const target=new URL(link.href,location.href);
    if(target.origin!==directory.origin||!target.pathname.startsWith(directory.pathname))return;
    const name=target.pathname.slice(directory.pathname.length);
    if(!/^(?:index|collection(?:-\d{2})?)\.html$/.test(name))return;
    target.searchParams.set('v',version);
    if(returnUrl)target.searchParams.set('returnTo',returnUrl);else target.searchParams.delete('returnTo');
    link.href=target.href;
  }
  document.querySelectorAll('a[href]').forEach(connect);
  document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(link)connect(link);},true);
})();
