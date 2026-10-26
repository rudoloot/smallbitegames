(() => {
  'use strict';
  const version='1a6027320bb5',directory=new URL('.',location.href);
  let returnUrl=null;
  try {
    const raw=new URLSearchParams(location.search).get('returnTo');
    if(raw){const target=new URL(raw);if(target.protocol==='https:'&&target.origin===location.origin&&!target.username&&!target.password)returnUrl=target.href;}
  } catch {}
  function connect(link){
    const target=new URL(link.href,location.href);
    if(target.origin!==directory.origin||!target.pathname.startsWith(directory.pathname))return;
    const name=target.pathname.slice(directory.pathname.length);
    if(!/^(?:index|game|tutorial|collection(?:-\d{2})?|monochrome-\d{2,4})\.html$/.test(name))return;
    target.searchParams.set('v',version);
    if(returnUrl)target.searchParams.set('returnTo',returnUrl);else target.searchParams.delete('returnTo');
    link.href=target.href;
  }
  document.querySelectorAll('a[href]').forEach(connect);
  document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(link)connect(link);},true);
})();
