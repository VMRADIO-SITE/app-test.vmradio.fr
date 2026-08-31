/* VM RADIO — source unique moteur + HLS natif iPhone */
(function(){
'use strict';
const ENGINE='https://admin.vmradio.fr/api/radio/nowplaying';
const MP3_STREAM='https://radio.vmradio.fr/listen/vm_radio/radio.mp3';
const HLS_STREAM='https://app.vmradio.fr/hls-live/live.m3u8';
const LISTENER_ENDPOINT='https://admin.vmradio.fr/api/public/listeners';
const DEFAULT_ARTIST='Music IA By Valentin';
const REFRESH=1000;
if(window.__VMRADIO_CENTRAL_HLS_V1__)return;
window.__VMRADIO_CENTRAL_HLS_V1__=true;

const nativeFetch=window.fetch.bind(window);

/* Un seul element audio : reutilise le <audio id="audio"> de la page. */
const liveAudio=document.getElementById('audio') || document.createElement('audio');
if(!liveAudio.id)liveAudio.id='audio';
const VM_HLS_NATIVE=!!(
  liveAudio.canPlayType('application/vnd.apple.mpegurl') ||
  liveAudio.canPlayType('application/x-mpegURL')
);
const STREAM=VM_HLS_NATIVE ? HLS_STREAM : MP3_STREAM;
window.__VMRADIO_STREAM_URL__=STREAM;
window.__VMRADIO_HLS_NATIVE__=VM_HLS_NATIVE;

if(liveAudio.getAttribute('src')!==STREAM)liveAudio.src=STREAM;
liveAudio.preload='auto';
liveAudio.playsInline=true;
liveAudio.setAttribute('playsinline','');
liveAudio.setAttribute('webkit-playsinline','');
liveAudio.setAttribute('aria-hidden','true');
liveAudio.style.cssText='position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px';

console.info('[VM RADIO] Flux actif :',VM_HLS_NATIVE?'HLS AAC':'MP3 secours',STREAM);

window.__VMRADIO_LISTENER_PRESENCE__=true;
let listenerTimer=null;
let listenerClientId='';
try{listenerClientId=localStorage.getItem('vmradio_listener_id')||'';if(!/^vm_listener_[A-Za-z0-9_-]{12,96}$/.test(listenerClientId)){const randomId=(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID().replace(/-/g,''):Math.random().toString(36).slice(2)+Date.now().toString(36);listenerClientId='vm_listener_'+randomId;localStorage.setItem('vmradio_listener_id',listenerClientId)}}catch(_){listenerClientId='vm_listener_'+Math.random().toString(36).slice(2)+Date.now().toString(36)}
function listenerSend(action){if(!listenerClientId)return Promise.resolve();return nativeFetch(LISTENER_ENDPOINT,{method:'POST',mode:'cors',cache:'no-store',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:listenerClientId,source:'app',action})}).catch(()=>{})}
function listenerStart(){listenerSend('heartbeat');if(!listenerTimer)listenerTimer=setInterval(()=>listenerSend('heartbeat'),15000)}
function listenerStop(){if(listenerTimer){clearInterval(listenerTimer);listenerTimer=null}listenerSend('stop')}

const first=(...v)=>v.find(x=>x!==undefined&&x!==null&&String(x).trim()!=='')??'';
const cap=v=>{const s=String(v??'').trim();return s?s.charAt(0).toLocaleUpperCase('fr-FR')+s.slice(1):''};
const clock=v=>{if(!v)return'--:--';const d=typeof v==='number'?new Date(v*1000):new Date(v);return Number.isNaN(d.getTime())?'--:--':d.toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'})};

function track(song,meta){if(!song||typeof song!=='object')return null;const title=first(song.title,song.name);if(!title)return null;const playlist=String(meta?.playlist||'').toLowerCase();const requester=String(first(song.requester,song.requester_name,song.requested_by,song.listener_name,meta?.requester,meta?.requester_name,meta?.requested_by,meta?.listener_name,meta?.request?.requester)||'').trim().slice(0,60);const message=String(first(song.message,song.request_message,song.requestMessage,song.listener_message,meta?.message,meta?.request_message,meta?.requestMessage,meta?.listener_message,meta?.request?.message)||'').trim().slice(0,180);return{id:String(first(song.id,song.track_id,title)),title:cap(title),artist:String(first(song.artist,song.artist_name)||DEFAULT_ARTIST).trim(),cover:String(first(song.art,song.cover,song.cover_url,song.artwork,song.artwork_url)||''),time:first(meta?.played_at,meta?.started_at,meta?.time),duration:Number(first(meta?.duration,song?.duration,0))||0,type:meta?.is_request===true?'request':playlist.includes('jingle')?'jingle':'music',requester,message}}
async function getEngineRaw(){const r=await nativeFetch(ENGINE+'?_='+Date.now(),{cache:'no-store',credentials:'omit'});if(!r.ok)throw new Error('VM RADIO API '+r.status);return r.json()}
function isoTime(value){if(!value)return'';const d=typeof value==='number'?new Date(value*1000):new Date(value);return Number.isNaN(d.getTime())?'':d.toISOString()}
function legacyNextTime(data){const explicit=first(data?.playing_next?.played_at,data?.playing_next?.started_at,data?.playing_next?.time);if(explicit)return explicit;const played=Number(first(data?.now_playing?.played_at,data?.now_playing?.started_at,data?.now_playing?.time,0));const duration=Number(first(data?.now_playing?.duration,data?.now_playing?.song?.duration,0));return played>0&&duration>0?played+duration:''}
function legacyItem(meta){const song=meta?.song||{};const art=first(song.art,song.cover,song.cover_url,song.artwork,song.artwork_url);const time=isoTime(first(meta?.played_at,meta?.started_at,meta?.time));return{id:first(song.id,song.track_id,song.title),title:first(song.title,song.name),artist:first(song.artist,song.artist_name,DEFAULT_ARTIST),cover:art,cover_url:art,artwork:art,started_at:time,played_at:time,duration:Number(meta?.duration||song?.duration||0)||0}}
window.fetch=async function(input,init){const url=typeof input==='string'?input:String(input?.url||'');if(/api\.radioking\.io\/widget\/radio\/vm-radio2\/track\//i.test(url)){try{const d=await getEngineRaw();let payload;if(url.includes('/next')){const nextMeta={...(d?.playing_next||{}),played_at:legacyNextTime(d)};payload=nextMeta?.song?[legacyItem(nextMeta)]:[]}else if(url.includes('/ckoi'))payload=(Array.isArray(d?.song_history)?d.song_history:[]).map(legacyItem);else payload=legacyItem(d?.now_playing||{});return new Response(JSON.stringify(payload),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}catch(e){console.warn('VM RADIO compatibilité anciennes données',e);return new Response(JSON.stringify(url.includes('/next')||url.includes('/ckoi')?[]:{}),{status:200,headers:{'Content-Type':'application/json'}})}}return nativeFetch(input,init)};

function setText(sel,value){const v=String(value??'');document.querySelectorAll(sel).forEach(el=>{if(el.textContent!==v)el.textContent=v})}
function setImage(sel,value){if(!value)return;const v=String(value);document.querySelectorAll(sel).forEach(el=>{if(el.tagName!=='IMG')return;el.dataset.vmDesiredCover=v;if((el.getAttribute('src')||'')===v)return;const probe=new Image();probe.onload=()=>{if(el.dataset.vmDesiredCover===v)el.setAttribute('src',v)};probe.src=v})}
function protectImages(){const fix=el=>{if(el?.tagName!=='IMG')return;const v=el.dataset.vmDesiredCover;if(v&&(el.getAttribute('src')||'')!==v)el.setAttribute('src',v)};new MutationObserver(list=>{for(const m of list)fix(m.target)}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['src']})}
function renderRequester(kind,item){const current=kind==='current';const isRequest=item?.type==='request';const requester=String(item?.requester||'').trim();const message=String(item?.message||'').trim();const value=isRequest?(requester?('Demandé par '+requester+(message?' · « '+message+' »':'')):(message?'Message auditeur : « '+message+' »':'')):'';const explicitSelector=current?'[data-current-requester]':'[data-next-requester]';const explicitTargets=Array.from(document.querySelectorAll(explicitSelector));explicitTargets.forEach(el=>{el.textContent=value;el.style.display=value?'block':'none'});if(explicitTargets.length){document.querySelectorAll('.vm-requester-'+kind).forEach(el=>el.remove());return}const anchors=current?'[data-current-artist],#currentArtist,#artist,.current-artist,.artist':'[data-next-artist],#nextArtist,.next-artist,#nextTrackArtist';const className='vm-requester-'+kind;document.querySelectorAll(anchors).forEach(anchor=>{const parent=anchor.parentElement;if(!parent)return;let label=Array.from(parent.children).find(el=>el.classList?.contains(className));if(!value){label?.remove();return}if(!label){label=document.createElement('small');label.className=className;label.style.cssText='display:block;margin-top:3px;color:#d18cff;font-size:12px;font-weight:800;line-height:1.3;white-space:normal';anchor.insertAdjacentElement('afterend',label)}label.textContent=value})}
function ensureNextTime(){let el=document.querySelector('[data-next-time],#nextTime');if(el)return el;const next=document.querySelector('.now-next .next,.next');const info=next?.querySelector('div');if(!info)return null;const row=document.createElement('span');row.style.cssText='color:#aaa2b5;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';row.innerHTML='Diffusion prévue à <strong id="nextTime" data-next-time style="color:#d68cff;font-weight:800">--:--</strong>';info.appendChild(row);return row.querySelector('[data-next-time]')}
function nextBroadcastTime(current,next){if(next?.time)return next.time;if(!current?.time||!current?.duration)return'';const start=typeof current.time==='number'?new Date(current.time*1000):new Date(current.time);if(Number.isNaN(start.getTime()))return'';return new Date(start.getTime()+current.duration*1000).toISOString()}

function render(current,next,history){if(!current)return;setText('[data-current-title],#currentTitle,#title,#programCurrent,.current-title',current.title);setText('[data-current-artist],#currentArtist,#artist,.current-artist,.artist',current.artist);setText('[data-current-time],#broadcastTime,.current-time',clock(current.time));setImage('[data-current-cover],#currentCover,#cover,.current-cover,.cover-wrap img',current.cover);if(next){ensureNextTime();const nextAt=nextBroadcastTime(current,next);setText('[data-next-title],#nextTitle,#programNext,.next-title,#nextTrackTitle',next.title);setText('[data-next-artist],#nextArtist,.next-artist,#nextTrackArtist',next.artist);setText('[data-next-time],#nextTime,.next-time',clock(nextAt));setImage('[data-next-cover],#nextCover,.next-cover,.next-card img,#nextTrackCover',next.cover)}renderRequester('current',current);renderRequester('next',next);const previous=(history||[]).filter(x=>x&&x.id!==current.id&&x.type==='music').slice(0,3);const last=previous[0];if(last){setText('[data-news-last],#previousTitle,#programPrevious',last.title);setText('[data-news-last-artist],#previousArtist',last.artist);setText('[data-news-last-time]',clock(last.time));setImage('[data-news-last-cover],#previousCover',last.cover)}}
let refreshing=false;async function refresh(){if(refreshing)return;refreshing=true;try{const d=await getEngineRaw();render(track(d?.now_playing?.song,d?.now_playing),track(d?.playing_next?.song,d?.playing_next),(Array.isArray(d?.song_history)?d.song_history:[]).map(x=>track(x?.song,x)).filter(Boolean))}catch(e){console.warn('VM RADIO moteur indisponible',e)}finally{refreshing=false}}

function syncPlayer(){const playing=!liveAudio.paused&&!liveAudio.ended;document.querySelectorAll('#play,#playBtn,.play-btn,[data-play-player]').forEach(btn=>{btn.setAttribute('aria-label',playing?'Mettre en pause':'Écouter VM RADIO');btn.classList.toggle('is-playing',playing);if(btn.id==='play'&&!btn.querySelector('svg'))btn.textContent=playing?'⏸':'▶'});const path=document.getElementById('playPausePath');if(path)path.setAttribute('d',playing?'M7 5h4v14H7zm6 0h4v14H13z':'M8 5.2v13.6L19 12 8 5.2z');const status=document.getElementById('statusText')||document.querySelector('[data-player-status]');if(status)status.textContent=playing?'EN DIRECT':'PRÊT À ÉCOUTER'}
async function resumeLiveStream(){try{if(!liveAudio.getAttribute('src'))liveAudio.src=STREAM;if(liveAudio.paused)await liveAudio.play();syncPlayer()}catch(err){console.warn('VM RADIO lecture impossible',err)}}
async function togglePlayer(e){const btn=e.target?.closest?.('#play,#playBtn,.play-btn,[data-play-player]');if(!btn)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(!liveAudio.paused){liveAudio.pause();syncPlayer();return}await resumeLiveStream()}
document.addEventListener('click',togglePlayer,true);
function loadRequestUi(){if(window.__VMRADIO_REQUEST_UI__||document.querySelector('script[data-vm-request-ui]'))return;const s=document.createElement('script');s.src='music-requests-ui.js?v=20260830-logo-final1';s.async=true;s.dataset.vmRequestUi='1';document.head.appendChild(s)}
function init(){protectImages();ensureNextTime();document.querySelectorAll('audio').forEach(a=>{if(a===liveAudio)return;try{a.pause();a.removeAttribute('src');a.load()}catch(_){}});if(!liveAudio.isConnected)(document.body||document.documentElement).appendChild(liveAudio);window.VMRadioPlayer={play:()=>resumeLiveStream(),pause:()=>liveAudio.pause(),stream:STREAM,audio:liveAudio};liveAudio.addEventListener('play',syncPlayer);liveAudio.addEventListener('playing',syncPlayer);liveAudio.addEventListener('pause',syncPlayer);liveAudio.addEventListener('playing',listenerStart);liveAudio.addEventListener('pause',listenerStop);liveAudio.addEventListener('ended',listenerStop);liveAudio.addEventListener('emptied',listenerStop);const volume=document.getElementById('volume');if(volume){liveAudio.volume=Number(volume.value||0.85);volume.addEventListener('input',()=>{liveAudio.volume=Number(volume.value)})}window.addEventListener('pagehide',listenerStop);syncPlayer();loadRequestUi();refresh();setInterval(refresh,REFRESH);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});window.addEventListener('focus',refresh)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

(function(){if(document.querySelector('script[data-vm-source-badge]'))return;const s=document.createElement('script');s.src='player-source-badge.js?v=20260829-1';s.async=true;s.dataset.vmSourceBadge='1';document.head.appendChild(s)})();
