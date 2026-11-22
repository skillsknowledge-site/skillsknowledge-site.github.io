/* Points page: shows the reference code, how many people joined, and the balance.
   Every number comes from the server (Supabase). Nothing here can add points. */
(function(){
  var C=window.SK_CFG||{},url=(C.url||'').replace(/\/+$/,''),root=document.getElementById('pts');
  if(!root)return;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function sess(){try{return JSON.parse(localStorage.getItem('sk_sess')||'null')}catch(e){return null}}
  function call(path,body,tok){return fetch(url+path,{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify(body||{})}).then(function(r){return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}if(!r.ok)throw new Error((j&&(j.message||j.msg))||'failed');return j})})}
  function token(){var s=sess();if(!s)return Promise.resolve('');if(Date.now()<s.exp-30000)return Promise.resolve(s.access);
    return fetch(url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:C.anon,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh})}).then(function(r){return r.ok?r.json():null}).then(function(j){
      if(!j)return '';s.access=j.access_token;s.refresh=j.refresh_token||s.refresh;s.exp=Date.now()+(j.expires_in||3600)*1000;try{localStorage.setItem('sk_sess',JSON.stringify(s))}catch(e){}return s.access},function(){return ''})}
  function left(ms){var s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+'h ':'')+(h||m?m+'m ':'')+x+'s'}
  function day(d){try{return new Date(d).toLocaleDateString(undefined,{day:'numeric',month:'short'})}catch(e){return ''}}
  var S=null,tick=0,tok='';

  function shell(inner){root.innerHTML='<div class="pt"><a class="pt-back" href="account">&larr; Profile and settings</a><h1>Points</h1>'+inner+'</div>'}
  function say(t){var m=document.getElementById('pt-msg');if(m){m.textContent=t||'';m.hidden=!t}}

  function render(){
    clearInterval(tick);
    var usd=(S.balance*S.usd_per_point),pkr=Math.floor(S.balance*S.usd_per_point*S.usd_to_pkr);
    var top='<div class="pt-bal card"><div><span>Your points</span><b>'+S.balance+'</b></div><p>'+(S.balance?'This takes about <b>'+usd.toFixed(1)+' USD</b> (PKR '+pkr.toLocaleString('en-US')+') off your next order at checkout.':'You have no usable points right now.')+'</p><small>1 point = 0.1 USD. 10 points = 1 USD.</small></div>';
    if(!S.unlocked){
      shell(top+'<section class="card pt-lock"><h2>Points open soon</h2><p>To keep the system fair, points open <b>1 hour after you create your account</b>. Please come back when the time below is over.</p><div class="pt-clock" id="pt-lock">'+left(S.secs_left*1000)+'</div></section>');
      var end=Date.now()+S.secs_left*1000;tick=setInterval(function(){var l=end-Date.now();if(l<=0){load();return}document.getElementById('pt-lock').textContent=left(l)},1000);return}
    var c=S.code,dots='',people='';
    if(c){for(var i=0;i<c.max;i++)dots+='<i class="'+(i<c.used?'on':'')+'"></i>';
      people=S.referrals.filter(function(r){return r.current_code}).map(function(r){return '<li><span>'+esc(r.who)+'</span><em class="'+r.status+'">'+(r.status==='approved'?'Approved, 1 point added':'Waiting for approval')+'</em></li>'}).join('')}
    var way1='<section class="card pt-way"><h2><span>1</span> Share your reference code</h2>'+
      '<h3>Step 1: Copy your link and share it</h3>'+
      '<p>Thank you for being part of SkillsKnowledge. Every member has a personal reference link, made with their own reference code. Please copy your link and share it kindly with someone you know and trust, such as a friend, a classmate or a family member, who may enjoy our work. We would be very glad to welcome them.</p>'+
      '<p>When that person creates an account and opens your link and creates an account (your code is filled in for them automatically), you will be told, and after they approve it you receive <b>1 point</b>.</p>'+
      (c?'<div class="pt-code"><code id="pt-c">'+esc(c.code)+'</code><div><button class="btn btn-solid btn-sm" type="button" id="pt-link">Copy link</button></div></div>'+
        '<div class="pt-meter"><div class="pt-dots" aria-label="'+c.used+' of '+c.max+' people joined">'+dots+'</div><b>'+c.used+' of '+c.max+' people joined</b><span>This code ends in <b id="pt-left"></b></span></div>'+
        (people?'<ul class="pt-list">'+people+'</ul>':'<p class="pt-none">Nobody has joined with this code yet.</p>'):
        '<div class="pt-code none"><p>'+(S.referrals.length?'Your last code has ended. You can make a fresh one.':'You have not made a code yet. Press the button to start earning points.')+'</p><button class="btn btn-solid btn-sm" type="button" id="pt-gen">'+(S.referrals.length?'Generate new code':'Activate my points')+'</button></div>')+
      '<h3>Step 2: How the code works</h3>'+
      '<ul class="pt-rules"><li>One code can be used by <b>3 people</b> only (1 code = 3 people = 3 points = 0.3 USD).</li>'+
      '<li>A code lasts <b>24 hours</b>, counted from the moment you activate it. When the time is over you can generate a new code, and it follows the same rules.</li>'+
      '<li>Each point you earn can be used for <b>7 days</b>. After that it expires, so please use your points before then.</li>'+
      '<li>Points are added only after the new member presses <b>Approve Reference</b>. Everything is counted and stored securely on our server, and nobody can change it by hand.</li></ul></section>';
    var lots=S.lots.length?'<section class="card"><h2>Your usable points</h2><ul class="pt-list">'+S.lots.map(function(l){return '<li><span>'+l.left_pts+' point'+(l.left_pts>1?'s':'')+'</span><em>use before '+day(l.expires_at)+'</em></li>'}).join('')+'</ul></section>':'';
    var way2='<section class="card pt-way soon"><h2><span>2</span> Another way to earn</h2><p>A second way to earn points is coming soon. We will announce it here.</p></section>';
    shell(top+'<p class="ac-msg bad" id="pt-msg" role="alert" hidden></p>'+way1+way2+lots);
    var cp=document.getElementById('pt-link');
    if(cp){document.getElementById('pt-link').onclick=function(){var b=document.getElementById('pt-link');copy(new URL('login.html?ref='+encodeURIComponent(c.code),location.href).href,b,'Copy link')};
      var end2=new Date(c.expires_at).getTime();var el=document.getElementById('pt-left');
      var t=function(){var l=end2-Date.now();if(l<=0){load();return}el.textContent=left(l)};t();tick=setInterval(t,1000)}
    var g=document.getElementById('pt-gen');if(g)g.onclick=function(){g.disabled=true;g.textContent='Please wait…';
      call('/rest/v1/rpc/points_generate_code',{},tok).then(function(r){S=r;render()},function(e){g.disabled=false;g.textContent='Try again';say(/locked/.test(e.message)?'Points are not open yet.':'Could not make a code. Please try again.')})};
  }
  function copy(text,b,label){var ok=function(){b.textContent='Copied';setTimeout(function(){b.textContent=label},1500)};
    if(navigator.clipboard)navigator.clipboard.writeText(text).then(ok,function(){fallback(text);ok()});else{fallback(text);ok()}}
  function fallback(t){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(e){}a.remove()}
  function load(){token().then(function(t){tok=t;if(!t){location.replace('login.html');return}
    return call('/rest/v1/rpc/points_status',{},t).then(function(r){S=r;render()})}).catch(function(){shell('<p class="ac-msg bad">Points could not be loaded. Please refresh the page. If this keeps happening, the points database may not be set up yet.</p>')})}
  if(!(C.url&&C.anon)){shell('<p class="ac-msg bad">The database is not connected yet.</p>')}else if(!sess()){location.replace('login.html')}else load();
})();
