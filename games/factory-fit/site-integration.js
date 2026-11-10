(() => {
  'use strict';
  const button=document.getElementById('site-exit');
  let destination=null;
  try {
    const raw=new URLSearchParams(location.search).get('returnTo');
    if(raw){const target=new URL(raw);if(target.protocol==='https:'&&target.origin===location.origin&&!target.username&&!target.password)destination=target.href;}
  } catch {}
  button.hidden=!destination;
  button.addEventListener('click',()=>{
    if(!destination)return;
    window.dispatchEvent(new Event('factory-fit-site-exit'));
    location.replace(destination);
  });
})();
