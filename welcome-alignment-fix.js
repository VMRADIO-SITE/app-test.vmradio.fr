(()=>{
  'use strict';

  function installStyles(){
    if(document.getElementById('vm-welcome-alignment-fix'))return;
    const s=document.createElement('style');
    s.id='vm-welcome-alignment-fix';
    s.textContent=`
html body #vmWelcomeSplash{
  left:0!important;
  right:0!important;
  width:100%!important;
  max-width:none!important;
  transform:none!important;
  padding-left:max(20px,env(safe-area-inset-left))!important;
  padding-right:max(20px,env(safe-area-inset-right))!important;
}
html body #vmWelcomeSplash .vmWelcomeCard{
  width:min(100%,520px)!important;
  height:100%!important;
  margin:0 auto!important;
  padding:20px!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  text-align:center!important;
  box-sizing:border-box!important;
}
html body #vmWelcomeSplash .vmWelcomeLogo{
  display:block!important;
  width:min(250px,calc(100vw - 70px))!important;
  height:auto!important;
  aspect-ratio:1/1!important;
  object-fit:contain!important;
  object-position:50% 50%!important;
  margin:0 auto 28px!important;
  flex:0 0 auto!important;
  transform:none!important;
  transition:none!important;
  animation:none!important;
  contain:layout paint!important;
}
#vm-account-welcome-line{
  width:100%!important;
  margin:8px auto 0!important;
  text-align:center!important;
  align-self:center!important;
}
#vm-account-mini-welcome{
  left:50%!important;
  right:auto!important;
  top:max(18px,env(safe-area-inset-top))!important;
  width:max-content!important;
  max-width:calc(100vw - 32px)!important;
  margin:0!important;
  text-align:center!important;
  transform:translate3d(-50%,0,0)!important;
  box-sizing:border-box!important;
  white-space:normal!important;
}
@media(max-width:380px){
  html body #vmWelcomeSplash .vmWelcomeLogo{
    width:min(220px,calc(100vw - 60px))!important;
  }
}
`;
    document.head.appendChild(s);
  }

  function lockLogoIntrinsicSize(){
    const logo=document.querySelector('#vmWelcomeSplash .vmWelcomeLogo');
    if(!logo)return;
    if(!logo.getAttribute('width'))logo.setAttribute('width','250');
    if(!logo.getAttribute('height'))logo.setAttribute('height','250');
    logo.setAttribute('decoding','sync');
    logo.setAttribute('fetchpriority','high');
  }

  function boot(){
    installStyles();
    lockLogoIntrinsicSize();
    new MutationObserver(()=>{
      installStyles();
      lockLogoIntrinsicSize();
    }).observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
