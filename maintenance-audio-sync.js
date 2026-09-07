/* VM RADIO TEST — flux MP3 direct permanent pour la maintenance */
(function(){
  'use strict';
  if(window.__VMRADIO_MAINTENANCE_AUDIO_SYNC__)return;
  window.__VMRADIO_MAINTENANCE_AUDIO_SYNC__=true;

  var DIRECT_MP3='https://radio.vmradio.fr/listen/vm_radio/radio.mp3';
  var attempts=0;
  var timer=null;

  function lockToDirectMp3(){
    attempts++;

    var player=window.VMRadioPlayer||null;
    var audio=player?.audio||document.getElementById('audio')||document.querySelector('audio');

    if(!audio){
      if(attempts>=200&&timer){clearInterval(timer);timer=null;}
      return false;
    }

    var current=String(audio.currentSrc||audio.getAttribute('src')||'');
    var alreadyDirect=current.indexOf('/listen/vm_radio/radio.mp3')!==-1;

    if(!alreadyDirect){
      var wasPlaying=!audio.paused&&!audio.ended;
      try{
        audio.src=DIRECT_MP3;
        audio.load();
        if(wasPlaying){
          var playPromise=audio.play();
          if(playPromise&&typeof playPromise.catch==='function')playPromise.catch(function(){});
        }
      }catch(_){}
    }

    window.__VMRADIO_STREAM_URL__=DIRECT_MP3;
    window.__VMRADIO_HLS_NATIVE__=false;

    if(player){
      player.stream=DIRECT_MP3;
      player.isHls=false;
    }

    audio.dataset.vmMaintenanceDirectMp3='1';

    if(timer){clearInterval(timer);timer=null;}

    console.info('[VM RADIO TEST] Flux maintenance permanent : MP3 direct VPS');
    return true;
  }

  function start(){
    if(lockToDirectMp3())return;
    timer=setInterval(lockToDirectMp3,100);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();
