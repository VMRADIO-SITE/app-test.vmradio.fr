(()=>{
'use strict';
function install(){
  if(document.getElementById('vmAppAccountTile'))return;
  const grids=[...document.querySelectorAll('.tiles')];
  const grid=grids[grids.length-1]||grids[0];
  if(!grid)return;
  const a=document.createElement('a');
  a.id='vmAppAccountTile';
  a.className='tile';
  a.href='./compte.html';
  a.innerHTML='<em aria-hidden="true">👤</em><span><b>Mon compte</b><small>Connexion, profil et rôle VM RADIO</small></span>';
  grid.appendChild(a);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})();
