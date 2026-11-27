/* Counts a visit and the time spent on the page (no personal data; a random id kept in this browser). */
(function(){
  var C=window.SK_CFG||{};
  function go(){
    if((window.SK&&typeof SK.blockedRegion==='function'&&SK.blockedRegion())||!(C.url&&C.anon)||!/^https?:$/.test(location.protocol)||window.top!==window)return;
    function id(k,s){try{var v=s.getItem(k);if(!v){v=Math.random().toString(36).slice(2,12)+Date.now().toString(36);s.setItem(k,v)}return v}catch(e){return ''}}
    var vid=id('sk_vid',localStorage),sid=id('sk_sid',sessionStorage);if(!vid||!sid)return;
    var page=(location.pathname.split('/').pop()||'index').replace(/\.html$/,'')||'index',base=C.url.replace(/\/+$/,'')+'/rest/v1/rpc/',t0=Date.now(),vis=0;
    function post(fn,b){try{fetch(base+fn,{method:'POST',keepalive:true,headers:{apikey:C.anon,Authorization:'Bearer '+C.anon,'Content-Type':'application/json'},body:JSON.stringify(b)}).catch(function(){})}catch(e){}}
    post('track_visit',{p_sid:sid,p_vid:vid,p_page:page});
    var spent=0,last=Date.now();
    function flush(){if(document.visibilityState==='hidden'){spent+=Date.now()-last;post('track_time',{p_sid:sid,p_page:page,p_seconds:Math.round(spent/1000)})}else last=Date.now()}
    document.addEventListener('visibilitychange',flush);addEventListener('pagehide',function(){if(document.visibilityState!=='hidden'){spent+=Date.now()-last;last=Date.now()}post('track_time',{p_sid:sid,p_page:page,p_seconds:Math.round(spent/1000)})});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
