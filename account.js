/* Signed-in account: header avatar menu on every page, username step, and the profile page.
   Works with the Supabase login (config.js must have the url and key). */
(function(){
  var C=window.SK_CFG||{};if(!(C.url&&C.anon))return;
  var url=C.url.replace(/\/+$/,''),KEY='sk_sess',UKEY='sk_user',PKEY='sk_prefs';
  var web=/^https?:$/.test(location.protocol);
  function go(n){location.href=n==='index'?(web?'./':'index.html'):(web?n:n+'.html')}
  function goReplace(n){location.replace(n==='index'?(web?'./':'index.html'):(web?n:n+'.html'))}
  function $(s,r){return (r||document).querySelector(s)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function rd(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function api(path,o){
    o=o||{};var h={apikey:C.anon,'Content-Type':'application/json'};if(o.token)h.Authorization='Bearer '+o.token;if(o.prefer)h.Prefer=o.prefer;
    return fetch(url+path,{method:o.method||'GET',headers:h,body:o.body?JSON.stringify(o.body):undefined}).then(function(r){
      return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}
        if(!r.ok){var em=(j&&(j.msg||j.error_description||j.message))||'Request failed';if(/banned|blocked/i.test(em)&&!/login|password/i.test(path))setTimeout(function(){terminated(rd(UKEY))},0);throw Object.assign(new Error(em),{status:r.status,code:j&&j.code})}return j})});
  }
  /* coming back from Google on any page: save the session from the address */
  if(/access_token=/.test(location.hash)){
    var hp=new URLSearchParams(location.hash.slice(1));
    if(hp.get('access_token')){wr(KEY,{access:hp.get('access_token'),refresh:hp.get('refresh_token'),exp:Date.now()+(+hp.get('expires_in')||3600)*1000,provider:'google'});if(hp.get('type')==='recovery'){try{sessionStorage.setItem('sk_recovery','1')}catch(e){}}}
    try{history.replaceState(null,'',location.pathname)}catch(e){}
  }
  /* ---- session ---- */
  function sess(){return rd(KEY)}
  /* a blocked person may get a vague error from Supabase, so also ask our own flag */
  function checkBlocked(id){
    if(!id)return Promise.resolve(false);
    return api('/rest/v1/rpc/account_status',{method:'POST',body:{identifier:id}}).then(function(b){return b===true},function(){return false});
  }
  function clear(){try{localStorage.removeItem(KEY);localStorage.removeItem(UKEY)}catch(e){}}
  function token(){
    var s=sess();if(!s)return Promise.resolve(null);
    if(Date.now()<s.exp-30000)return Promise.resolve(s.access);
    if(!s.refresh){clear();return Promise.resolve(null)}
    return api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh}}).then(function(j){
      s.access=j.access_token;s.refresh=j.refresh_token||s.refresh;s.exp=Date.now()+(j.expires_in||3600)*1000;wr(KEY,s);return s.access},
      function(e){var c=rd(UKEY)||{};return (/banned|blocked/i.test(e&&e.message||'')?Promise.resolve(true):checkBlocked(c.email||c.username)).then(function(b){if(b){banned=true;return null}clear();return null})});
  }
  var banned=false,ready=true; /* false when the profiles table has not been created yet */
  function shape(u,pr){
    var m=u.user_metadata||{};pr=pr||{};
    return {id:u.id,email:u.email||'',username:pr.username||'',
      name:pr.display_name||m.display_name||m.full_name||m.name||(u.email||'').split('@')[0]||'Member',
      photo:m.custom_avatar||'',bio:pr.bio||'',phone:pr.phone||'',unchanged:pr.username_changed_at||'',role:pr.role||'member',blocked:!!pr.blocked,website:pr.website||'',location:pr.location||'',
      provider:(u.app_metadata&&u.app_metadata.provider)||'google',created:u.created_at,last:u.last_sign_in_at,prefs:m.prefs||{},ready:ready};
  }
  function getProfile(t,id){
    return api('/rest/v1/profiles?id=eq.'+encodeURIComponent(id)+'&select=*',{token:t}).then(function(r){
      if(r&&r[0])return r[0];
      return api('/rest/v1/profiles',{method:'POST',token:t,prefer:'resolution=ignore-duplicates,return=representation',body:{id:id}}).then(function(x){return (x&&x[0])||{}},function(){return {}});
    },function(e){if(e.status===404||e.status===400||/relation|schema cache|profiles/i.test(e.message)){ready=false;return {}}throw e});
  }
  function loadUser(){
    return token().then(function(t){
      if(!t)return null;
      return api('/auth/v1/user',{token:t}).then(function(u){
        return getProfile(t,u.id).then(function(pr){var x=shape(u,pr);wr(UKEY,x);return x},function(){var x=shape(u,{});wr(UKEY,x);return x});
      },function(e){var c=rd(UKEY)||{};if(/banned|blocked/i.test(e.message||'')){banned=true;return null}if(e.status===401||e.status===403){return checkBlocked(c.email||c.username).then(function(b){if(b){banned=true;return null}clear();return null})}return rd(UKEY)});
    });
  }
  function saveMeta(patch){
    return token().then(function(t){if(!t)throw new Error('Please log in again.');return api('/auth/v1/user',{method:'PUT',token:t,body:{data:patch}})}).then(function(){return loadUser()});
  }
  var RESERVED=['admin','administrator','root','support','owner','moderator','system','api','login','account','sk','skillsknowledge'];
  function checkName(n){
    if(!/^[a-z0-9_.]{3,20}$/.test(n))return 'Use 3 to 20 letters, numbers, dots or underscores.';
    if(RESERVED.indexOf(n)>-1)return 'That username is reserved.';
    return '';
  }
  function nameFree(n){return token().then(function(t){return api('/rest/v1/rpc/username_free',{method:'POST',token:t,body:{name:n}})})}
  function saveProfile(patch){
    patch.updated_at=new Date().toISOString();
    return token().then(function(t){if(!t)throw new Error('Please log in again.');
      return api('/rest/v1/profiles?id=eq.'+encodeURIComponent((rd(UKEY)||{}).id),{method:'PATCH',token:t,prefer:'return=representation',body:patch})})
      .then(function(){return loadUser()},function(e){if(e.status===409||e.code==='23505')throw new Error(/phone/i.test(e.message)?'That phone number is already used.':'That username is already taken.');throw e});
  }
  function signOut(global){
    return token().then(function(t){if(t)return api('/auth/v1/logout'+(global?'?scope=global':''),{method:'POST',token:t}).catch(function(){})}).then(function(){clear();go('index')});
  }
  window.skTerminated=function(u){terminated(u||null)};
  window.skUser={get:loadUser,signOut:signOut,token:token,api:api};

  /* ---- preferences, applied on every page ---- */
  function applyPrefs(p){var c=document.documentElement.classList;c.toggle('reduce-motion',!!(p&&p.reduceMotion));c.toggle('big-text',!!(p&&p.bigText))}
  applyPrefs(rd(PKEY));

  var cached=rd(UKEY),has=!!sess();
  var css=document.createElement('style');
  css.textContent='.reduce-motion .snow{display:none!important}.reduce-motion *,.reduce-motion *::before,.reduce-motion *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}html.big-text{font-size:17px}'+
  '.acct{position:relative}.acct-btn{position:relative;display:block;width:38px;height:38px;border-radius:50%;border:0;background:rgba(var(--tint),.2);color:#fff;padding:0;cursor:pointer;overflow:hidden;font:700 .9rem var(--f-body)}'+
  '.acct-btn .ini{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}.acct-btn img,.av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.acct-btn:hover{filter:brightness(1.15)}'+
  '.acct-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:250px;padding:.5rem;border-radius:14px;background:rgba(10,14,14,.97);display:none;z-index:60}'+
  '.acct.open .acct-menu{display:block}.acct-who{display:flex;gap:.7rem;align-items:center;padding:.6rem .6rem .8rem;border-bottom:1px solid rgba(255,255,255,.1);margin-bottom:.3rem}'+
  '.acct-who div span{display:block;font-size:.78rem;color:var(--muted);overflow-wrap:anywhere}.acct-who b{display:block;font-size:.92rem;color:#fff}'+
  '.acct-menu a,.acct-menu button{display:block;width:100%;text-align:left;padding:.6rem .7rem;border-radius:8px;border:0;background:none;color:#fff;font:500 .88rem var(--f-body);text-decoration:none;cursor:pointer}'+
  '.acct-menu a:hover,.acct-menu button:hover{background:rgba(255,255,255,.08)}'+
  '.av{position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;border-radius:50%;overflow:hidden;background:rgba(var(--tint),.18);font:700 1rem var(--f-body);color:#fff}'+
  '.un-back{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.7)}'+
  '.un-box{width:min(400px,100%);padding:1.6rem 1.4rem;border-radius:16px;background:#0c1512;color:#fff;display:grid;gap:.8rem}'+
  '.un-box h2{margin:0;font-size:1.3rem}.un-box p{margin:0;color:var(--muted);font-size:.9rem}'+
  '.un-in{display:flex;align-items:center;gap:.3rem;padding:.2rem .9rem;border-radius:12px;background:rgba(255,255,255,.1)}.un-in span{color:var(--muted)}'+
  '.un-in textarea{flex:1;min-width:0;border:0;background:none;color:#fff;font:500 .95rem var(--f-body);padding:.65rem 0;outline:0;resize:vertical}.un-in input{flex:1;min-width:0;border:0;background:none;color:#fff;font:500 1rem var(--f-body);padding:.65rem 0;outline:0}'+
  '.un-st{min-height:1.2em;font-size:.84rem;color:var(--muted)}.un-st.ok{color:#5be39a}.un-st.bad{color:#ff8f8f}'+
  '.un-row{display:flex;gap:.6rem;align-items:center;justify-content:space-between}.un-link{background:none;border:0;color:var(--muted);cursor:pointer;font:500 .84rem var(--f-body);padding:0}';
  document.head.appendChild(css);

  function avatar(u){return u&&u.photo?'<img src="'+esc(u.photo)+'" alt="">':'<span class="ini">'+esc((u&&u.name||'?').charAt(0).toUpperCase())+'</span>'}
  function avInner(u){return u&&u.photo?'<img src="'+esc(u.photo)+'" alt="">':esc((u&&u.name||'?').charAt(0).toUpperCase())}

  /* ---- header: the Login button becomes the avatar menu ---- */
  function header(u){
    var b=$('#login-btn');if(!b||!has)return;
    var w=$('.acct');if(!w){w=document.createElement('div');w.className='acct';b.parentNode.insertBefore(w,b);b.style.display='none'}
    w.innerHTML='<button class="acct-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Your account">'+avatar(u)+'</button>'+
      '<div class="acct-menu" role="menu"><div class="acct-who"><span class="av">'+avInner(u)+'</span><div><b>'+esc(u.name)+'</b><span>'+(u.username?'@'+esc(u.username):esc(u.email))+'</span></div></div>'+
      '<a href="account" role="menuitem">Profile and settings</a><button type="button" id="acct-out" role="menuitem">Log out</button></div>';
    var btn=$('.acct-btn',w);
    btn.addEventListener('click',function(e){e.stopPropagation();var o=w.classList.toggle('open');btn.setAttribute('aria-expanded',o)});
    document.addEventListener('click',function(e){if(!w.contains(e.target)){w.classList.remove('open');btn.setAttribute('aria-expanded','false')}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')w.classList.remove('open')});
    $('#acct-out',w).addEventListener('click',function(){signOut(false)});
  }

  /* ---- required step: choose a username nobody else has ---- */
  function usernameStep(u){
    if($('.un-back'))return;
    var d=document.createElement('div');d.className='un-back';
    d.innerHTML='<form class="un-box" novalidate role="dialog" aria-modal="true" aria-labelledby="un-h"><h2 id="un-h">Choose your username</h2>'+
      '<p>Pick a name that nobody else uses. It is yours alone. Use 3 to 20 letters, numbers, dots or underscores.</p>'+
      '<div class="un-in"><span>@</span><input id="un-i" type="text" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="un-s"></div>'+
      '<div class="un-st" id="un-s" role="status"></div>'+
      '<div class="un-row"><button class="un-link" type="button" id="un-out">Log out</button><button class="btn btn-solid btn-sm" type="submit" id="un-go" disabled>Continue</button></div></form>';
    document.body.appendChild(d);
    var i=$('#un-i',d),st=$('#un-s',d),go_=$('#un-go',d),timer=0,okName='';
    function say(t,c){st.textContent=t;st.className='un-st'+(c?' '+c:'')}
    i.addEventListener('input',function(){
      var n=i.value.toLowerCase().replace(/[^a-z0-9_.]/g,'');if(n!==i.value)i.value=n;okName='';go_.disabled=true;clearTimeout(timer);
      if(!n){say('');return}
      var e=checkName(n);if(e){say(e,'bad');return}
      say('Checking…');timer=setTimeout(function(){nameFree(n).then(function(f){if(i.value!==n)return;if(f){okName=n;go_.disabled=false;say('@'+n+' is available.','ok')}else say('That username is already taken.','bad')},function(){say('Could not check right now. Try again.','bad')})},350);
    });
    d.firstChild.addEventListener('submit',function(e){e.preventDefault();if(!okName)return;go_.disabled=true;say('Saving…');
      saveProfile({username:okName}).then(function(x){d.remove();header(x);if($('#acct'))page(x)},function(er){go_.disabled=false;say(er.message,'bad')})});
    $('#un-out',d).addEventListener('click',function(){signOut(false)});
    setTimeout(function(){i.focus()},50);
  }

  function overlay(inner){var d=document.createElement('div');d.className='un-back';d.innerHTML=inner;document.body.appendChild(d);return d}
  function terminated(u){
    if($('.un-back.term'))return;
    var old=$('.un-back');if(old)old.remove();
    var acc=$('.acct');if(acc)acc.remove();var main=$('#acct');if(main)main.innerHTML='';
    var who=(u&&(u.username?'@'+u.username:u.email))||'',known=(u&&(u.email||u.username))||'';
    var d=overlay('<form class="un-box" novalidate role="alertdialog" aria-modal="true" aria-labelledby="tm-h"><h2 id="tm-h">Your account has been terminated</h2>'+
      '<p>'+(who?esc(who)+' has':'This account has')+' been blocked by the site owner, so you can no longer use your profile or settings.</p>'+
      '<div id="tm-main"><p>If you think this is a mistake, you can send an appeal. Otherwise log out.</p>'+
      '<div class="un-row"><button class="un-link" type="button" id="tm-out">Log out</button><button class="btn btn-solid btn-sm" type="button" id="tm-ap">Appeal</button></div></div>'+
      '<div id="tm-form" hidden>'+(known?'':'<div class="un-in"><input id="tm-id" type="text" placeholder="Your email or username" autocomplete="username" autocapitalize="off"></div>')+
      '<div class="un-in"><textarea id="tm-msg" rows="4" maxlength="1000" placeholder="Explain why this is a mistake (at least 5 characters)"></textarea></div>'+
      '<div class="un-st" id="tm-st" role="status"></div>'+
      '<div class="un-row"><button class="un-link" type="button" id="tm-back">Back</button><button class="btn btn-solid btn-sm" type="submit" id="tm-send">Send appeal</button></div></div></form>');
    d.classList.add('term');
    var st=$('#tm-st',d);function say(t,c){st.textContent=t;st.className='un-st'+(c?' '+c:'')}
    $('#tm-out',d).addEventListener('click',function(){clear();try{localStorage.removeItem(PKEY)}catch(e){}go('index')});
    $('#tm-ap',d).addEventListener('click',function(){$('#tm-main',d).hidden=true;$('#tm-form',d).hidden=false;($('#tm-id',d)||$('#tm-msg',d)).focus()});
    $('#tm-back',d).addEventListener('click',function(){$('#tm-form',d).hidden=true;$('#tm-main',d).hidden=false;say('')});
    d.firstChild.addEventListener('submit',function(e){e.preventDefault();
      var idEl=$('#tm-id',d),id=known||(idEl&&idEl.value.trim()),m=$('#tm-msg',d).value.trim();
      if(!id){say('Enter your email or username.','bad');return}
      if(m.length<5){say('Please write a few words about why this is a mistake.','bad');return}
      $('#tm-send',d).disabled=true;say('Sending…');
      api('/rest/v1/rpc/submit_appeal',{method:'POST',body:{identifier:id,message:m}}).then(function(r){
        if(r==='ok'){say('Appeal sent. The site owner will review it.','ok');$('#tm-msg',d).disabled=true}
        else{$('#tm-send',d).disabled=false;say(r==='wait'?'You already sent an appeal today. Please wait for a reply.':r==='short'?'Please write a little more.':'We could not find a blocked account with those details.','bad')}
      },function(){$('#tm-send',d).disabled=false;say('Could not send. Please try again.','bad')})});
  }
  function passDialog(){
    if($('.un-back'))return;
    var d=overlay('<form class="un-box" novalidate role="dialog" aria-modal="true" aria-labelledby="pw-h"><h2 id="pw-h">Set a new password</h2><p>Choose a password with at least 8 characters.</p>'+
      '<div class="un-in"><input id="pw-1" type="password" placeholder="New password" autocomplete="new-password"></div>'+
      '<div class="un-in"><input id="pw-2" type="password" placeholder="Repeat new password" autocomplete="new-password"></div>'+
      '<div class="un-st" id="pw-s" role="status"></div><div class="un-row"><button class="un-link" type="button" id="pw-x">Not now</button><button class="btn btn-solid btn-sm" type="submit">Save password</button></div></form>');
    var st=$('#pw-s',d);function say(t,c){st.textContent=t;st.className='un-st'+(c?' '+c:'')}
    $('#pw-x',d).addEventListener('click',function(){d.remove()});
    d.firstChild.addEventListener('submit',function(e){e.preventDefault();var a=$('#pw-1',d).value,b=$('#pw-2',d).value;
      if(a.length<8){say('Use at least 8 characters.','bad');return}if(a!==b){say('The two passwords do not match.','bad');return}
      setPassword(a).then(function(){say('Password saved.','ok');setTimeout(function(){d.remove()},900)},function(er){say(er.message,'bad')})});
    setTimeout(function(){$('#pw-1',d).focus()},50);
  }
  function setPassword(pw){return token().then(function(t){if(!t)throw new Error('Please log in again.');return api('/auth/v1/user',{method:'PUT',token:t,body:{password:pw}})})}
  /* "online" signal: tell Supabase we are here every minute while a page is open */
  var beating=0;
  function beat(u){
    if(!u||!u.ready||!u.id)return;
    function ping(){if(document.hidden)return;token().then(function(t){if(t)api('/rest/v1/profiles?id=eq.'+encodeURIComponent(u.id),{method:'PATCH',token:t,body:{last_seen:new Date().toISOString()}}).catch(function(){})})}
    ping();if(!beating){beating=setInterval(ping,60000);document.addEventListener('visibilitychange',function(){if(!document.hidden)ping()})}
  }
  /* Google sent us back with an error (for example a blocked account) */
  var oerr='',ocode='';
  (function(){var h=new URLSearchParams(location.hash.slice(1)),q=new URLSearchParams(location.search);
    oerr=h.get('error_description')||q.get('error_description')||'';ocode=h.get('error_code')||q.get('error_code')||'';
    if(oerr||ocode){try{history.replaceState(null,'',location.pathname)}catch(e){}}})();
  function boot(){
    if(oerr||ocode){
      if(/banned|blocked/i.test(oerr+' '+ocode)){terminated(null);return}
      if(!/\/login(\.html)?$/i.test(location.pathname)){location.replace((web?'login':'login.html')+'?error_description='+encodeURIComponent(oerr||'Sign-in failed. Please try again.'));return}
    }
    var onLogin=/\/login(\.html)?$/i.test(location.pathname),onAcct=!!$('#acct');
    if(!has){if(onAcct)goReplace('login');return}
    if(onLogin&&!/signup|error/.test(location.hash+location.search)){goReplace('account');return}
    if(cached){header(cached);if(onAcct)page(cached)}
    loadUser().then(function(u){
      if((u&&u.blocked)||banned){terminated(u||cached);return}
      if(!u){if(onAcct)goReplace('login');var w=$('.acct');if(w)w.remove();var b=$('#login-btn');if(b)b.style.display='';return}
      applyPrefs(u.prefs&&Object.keys(u.prefs).length?u.prefs:rd(PKEY));header(u);beat(u);
      var rec=false;try{rec=sessionStorage.getItem('sk_recovery')==='1';sessionStorage.removeItem('sk_recovery')}catch(e){}
      if(rec)passDialog();else if(u.ready&&!u.username)usernameStep(u);
      if(onAcct)page(u);
    });
  }

  /* ---- profile and settings page ---- */
  function lockedUntil(u){if(!u.unchanged)return null;var t=new Date(u.unchanged).getTime()+10*86400000;return t>Date.now()?new Date(t):null}
  function fmt(d){try{return new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}catch(e){return ''}}
  function page(u){
    var root=$('#acct');if(!root)return;
    var p=Object.assign({},rd(PKEY)||{},u.prefs||{}),msgText=$('#ac-msg')&&!$('#ac-msg').hidden?$('#ac-msg').textContent:'';
    root.innerHTML=
    '<div class="ac-head"><span class="av big">'+avInner(u)+'</span><div><h1>'+esc(u.name)+'</h1><p>'+(u.username?'@'+esc(u.username)+' · ':'')+esc(u.email)+'</p></div></div>'+
    '<p class="ac-msg" id="ac-msg" role="status" hidden></p>'+
    (u.ready?'':'<p class="ac-msg bad">The profile database is not set up yet, so username, bio and the other profile fields are switched off. Run <b>supabase-profiles.sql</b> in Supabase.</p>')+
    '<div class="ac-grid">'+
    '<section class="card ac-wide"><h2>Profile</h2><form id="f-prof" novalidate><div class="ac-two">'+
      '<label>Display name<input id="p-name" type="text" maxlength="60" value="'+esc(u.name)+'" autocomplete="name"></label>'+
      '<label>Username<input id="p-user" type="text" maxlength="20" value="'+esc(u.username)+'" autocomplete="off" autocapitalize="off" spellcheck="false"'+(u.ready&&!lockedUntil(u)?'':' disabled')+'><small id="p-ust">'+(lockedUntil(u)?'You can change your username again on '+esc(fmt(lockedUntil(u)))+'.':'You can change it once every 10 days.')+'</small></label></div>'+
      '<label>Bio<textarea id="p-bio" maxlength="160" rows="2"'+(u.ready?'':' disabled')+'>'+esc(u.bio)+'</textarea><small>Up to 160 characters.</small></label>'+
      '<div class="ac-two"><label>Website<input id="p-web" type="text" maxlength="120" placeholder="https://" value="'+esc(u.website)+'" autocomplete="url"'+(u.ready?'':' disabled')+'></label>'+
      '<label>Location<input id="p-loc" type="text" maxlength="60" value="'+esc(u.location)+'" autocomplete="address-level2"'+(u.ready?'':' disabled')+'></label></div>'+
      '<div class="ac-two"><label>Email<input type="email" value="'+esc(u.email)+'" disabled></label>'+
      '<label>Phone<input id="p-tel" type="tel" maxlength="20" placeholder="+92 300 0000000" value="'+esc(u.phone)+'" autocomplete="tel"'+(u.ready?'':' disabled')+'><small>Optional. You can log in with it.</small></label></div>'+
      '<div class="ac-row"><button class="btn btn-solid btn-sm" type="submit">Save profile</button></div></form></section>'+
    '<section class="card"><h2>Photo</h2><p class="ac-note">'+(u.photo?'Your uploaded photo is shown.':'No photo yet. Your first letter is shown.')+'</p>'+
      '<div class="ac-row"><label class="btn btn-solid btn-sm ac-file">Upload photo<input id="p-file" type="file" accept="image/*" hidden></label>'+
      (u.photo?'<button class="btn btn-ghost btn-sm" type="button" id="p-reset">Remove photo</button>':'')+'</div></section>'+
    '<section class="card"><h2>Preferences</h2>'+
      '<label class="ac-sw"><input type="checkbox" id="s-motion"'+(p.reduceMotion?' checked':'')+'><i></i><span><b>Reduce motion</b><small>Turns off snow and page animations on this site.</small></span></label>'+
      '<label class="ac-sw"><input type="checkbox" id="s-big"'+(p.bigText?' checked':'')+'><i></i><span><b>Larger text</b><small>Makes the writing on every page bigger.</small></span></label>'+
      '<label class="ac-sw"><input type="checkbox" id="s-news"'+(p.updates?' checked':'')+'><i></i><span><b>Email updates</b><small>Occasional news about new work. Off by default.</small></span></label></section>'+
    '<section class="card"><h2>Account</h2><dl class="ac-dl"><dt>Signed in with</dt><dd>'+esc(u.provider==='google'?'Google':u.provider)+'</dd><dt>Member since</dt><dd>'+esc(fmt(u.created))+'</dd><dt>Last sign-in</dt><dd>'+esc(fmt(u.last))+'</dd></dl>'+
      '<div class="ac-row"><button class="btn btn-solid btn-sm" type="button" id="a-out">Log out</button><button class="btn btn-ghost btn-sm" type="button" id="a-all">Log out everywhere</button></div></section>'+
    '<section class="card"><h2>Password</h2><p class="ac-note">'+(u.provider==='google'?'You sign in with Google. Set a password to also log in with your email'+(u.username?', @'+esc(u.username):'')+' and password.':'Change the password you use to log in.')+'</p>'+
      '<form id="f-pw" novalidate><label>New password<input id="n-pw1" type="password" autocomplete="new-password" placeholder="At least 8 characters"></label>'+
      '<label>Repeat new password<input id="n-pw2" type="password" autocomplete="new-password"></label>'+
      '<div class="ac-row"><button class="btn btn-solid btn-sm" type="submit">'+(u.provider==='google'?'Set password':'Change password')+'</button></div></form></section>'+
    '<section class="card"><h2>Your data</h2><p class="ac-note">Download everything stored about you, or delete your account for good.</p>'+
      '<div class="ac-row"><button class="btn btn-ghost btn-sm" type="button" id="a-dl">Download my data</button><button class="btn btn-ghost btn-sm ac-danger" type="button" id="a-del">Delete account</button></div>'+
      '<div class="ac-del" id="ac-del" hidden><p class="ac-note">This cannot be undone. Type <b>DELETE</b> to confirm.</p><div class="ac-row"><input id="d-in" type="text" autocomplete="off" aria-label="Type DELETE"><button class="btn btn-solid btn-sm ac-danger" type="button" id="d-go" disabled>Delete forever</button></div></div></section>'+
    '</div>';
    function msg(t,bad){var m=$('#ac-msg');m.textContent=t;m.className='ac-msg'+(bad?' bad':'');m.hidden=false}
    if(msgText)msg(msgText);
    function done(x,t){header(x);page(x);var m=$('#ac-msg');m.textContent=t;m.className='ac-msg';m.hidden=false;window.scrollTo(0,0)}
    var ust=$('#p-ust'),ut=0;
    var un=$('#p-user');
    if(u.ready&&!lockedUntil(u))un.addEventListener('input',function(){
      var n=un.value.toLowerCase().replace(/[^a-z0-9_.]/g,'');if(n!==un.value)un.value=n;ust.className='';clearTimeout(ut);
      if(!n||n===u.username){ust.textContent='';return}
      var e=checkName(n);if(e){ust.textContent=e;ust.className='bad';return}
      ust.textContent='Checking…';ut=setTimeout(function(){nameFree(n).then(function(f){if(un.value!==n)return;ust.textContent=f?'@'+n+' is available.':'That username is already taken.';ust.className=f?'ok':'bad'},function(){ust.textContent=''})},350)});
    $('#f-prof').addEventListener('submit',function(e){e.preventDefault();
      var n=$('#p-name').value.trim();if(!n){msg('Please enter a display name.',true);return}
      var patch={display_name:n};
      if(u.ready){
        var nm=un.value.trim().toLowerCase();if(!nm&&u.username){msg('A username cannot be removed.',true);return}if(nm&&nm!==u.username){var er=checkName(nm);if(er){msg(er,true);return}patch.username=nm}
        var w=$('#p-web').value.trim();if(w&&!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(w)){msg('Website must start with http:// or https://',true);return}
        var tel=$('#p-tel').value.replace(/[^0-9+]/g,'');if(tel&&!/^\+?[0-9]{7,15}$/.test(tel)){msg('Enter a valid phone number, for example +923001234567.',true);return}patch.phone=tel;patch.bio=$('#p-bio').value.trim();patch.website=w;patch.location=$('#p-loc').value.trim();
      }
      saveProfile(patch).then(function(x){done(x,'Profile saved.')},function(er){msg(er.message,true)})});
    $('#p-file').addEventListener('change',function(){var f=this.files[0];if(!f)return;
      if(!/^image\//.test(f.type)){msg('Please choose an image file.',true);return}
      var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){
        var c=document.createElement('canvas'),s=Math.min(im.width,im.height),S=256;c.width=c.height=S;
        c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,S,S);
        saveMeta({custom_avatar:c.toDataURL('image/jpeg',.85)}).then(function(x){done(x,'Photo updated.')},function(er){msg(er.message,true)})};
        im.onerror=function(){msg('That image could not be read.',true)};im.src=r.result};r.readAsDataURL(f)});
    var rs=$('#p-reset');if(rs)rs.addEventListener('click',function(){saveMeta({custom_avatar:''}).then(function(x){done(x,'Photo removed.')},function(er){msg(er.message,true)})});
    function prefs(){var v={reduceMotion:$('#s-motion').checked,bigText:$('#s-big').checked,updates:$('#s-news').checked};wr(PKEY,v);applyPrefs(v);
      saveMeta({prefs:v}).then(function(){msg('Preferences saved.')},function(er){msg(er.message,true)})}
    ['#s-motion','#s-big','#s-news'].forEach(function(s){$(s).addEventListener('change',prefs)});
    $('#f-pw').addEventListener('submit',function(e){e.preventDefault();var a=$('#n-pw1').value,b=$('#n-pw2').value;
      if(a.length<8){msg('Use at least 8 characters.',true);return}if(a!==b){msg('The two passwords do not match.',true);return}
      setPassword(a).then(function(){$('#n-pw1').value='';$('#n-pw2').value='';msg('Password saved.')},function(er){msg(er.message,true)})});
    $('#a-out').addEventListener('click',function(){signOut(false)});
    $('#a-all').addEventListener('click',function(){signOut(true)});
    $('#a-dl').addEventListener('click',function(){
      var d={account:{id:u.id,email:u.email,provider:u.provider,created:u.created,last_sign_in:u.last},profile:{username:u.username,phone:u.phone,role:u.role,display_name:u.name,bio:u.bio,website:u.website,location:u.location},preferences:p};
      var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));a.download='my-data.json';document.body.appendChild(a);a.click();a.remove()});
    $('#a-del').addEventListener('click',function(){var b=$('#ac-del');b.hidden=!b.hidden;if(!b.hidden)$('#d-in').focus()});
    $('#d-in').addEventListener('input',function(){$('#d-go').disabled=this.value.trim()!=='DELETE'});
    $('#d-go').addEventListener('click',function(){
      token().then(function(t){return api('/rest/v1/rpc/delete_my_account',{method:'POST',token:t,body:{}})}).then(function(){clear();try{localStorage.removeItem(PKEY)}catch(e){}go('index')},
        function(){msg('Account deletion is not switched on yet. Run supabase-profiles.sql in Supabase, then try again.',true)})});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
