/* Signed-in account: header avatar menu on every page, plus the profile and settings page.
   Works with the Supabase login in supabase-auth.js (config.js must have the url and key). */
(function(){
  var C=window.SK_CFG||{};if(!(C.url&&C.anon))return;
  var url=C.url.replace(/\/+$/,''),KEY='sk_sess',UKEY='sk_user',PKEY='sk_prefs';
  function $(s,r){return (r||document).querySelector(s)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function rd(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function api(path,o){
    o=o||{};var h={apikey:C.anon,'Content-Type':'application/json'};if(o.token)h.Authorization='Bearer '+o.token;
    return fetch(url+path,{method:o.method||'GET',headers:h,body:o.body?JSON.stringify(o.body):undefined}).then(function(r){
      return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}
        if(!r.ok)throw Object.assign(new Error((j&&(j.msg||j.error_description||j.message))||'Request failed'),{status:r.status});return j})});
  }
  /* ---- session ---- */
  function sess(){return rd(KEY)}
  function token(){
    var s=sess();if(!s)return Promise.resolve(null);
    if(Date.now()<s.exp-30000)return Promise.resolve(s.access);
    if(!s.refresh){clear();return Promise.resolve(null)}
    return api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh}}).then(function(j){
      s.access=j.access_token;s.refresh=j.refresh_token||s.refresh;s.exp=Date.now()+(j.expires_in||3600)*1000;wr(KEY,s);return s.access},
      function(){clear();return null});
  }
  function clear(){try{localStorage.removeItem(KEY);localStorage.removeItem(UKEY)}catch(e){}}
  function shape(u){
    var m=u.user_metadata||{};
    return {id:u.id,email:u.email||'',name:m.display_name||m.full_name||m.name||(u.email||'').split('@')[0]||'Member',
      photo:m.custom_avatar||m.avatar_url||m.picture||'',google:m.avatar_url||m.picture||'',custom:!!m.custom_avatar,
      provider:(u.app_metadata&&u.app_metadata.provider)||'google',created:u.created_at,last:u.last_sign_in_at,prefs:m.prefs||{}};
  }
  function loadUser(){
    return token().then(function(t){
      if(!t)return null;
      return api('/auth/v1/user',{token:t}).then(function(u){var x=shape(u);wr(UKEY,x);return x},
        function(e){if(e.status===401||e.status===403){clear();return null}return rd(UKEY)});
    });
  }
  function save(patch){ /* merge into the user's metadata */
    return token().then(function(t){if(!t)throw new Error('Please log in again.');
      return api('/auth/v1/user',{method:'PUT',token:t,body:{data:patch}})}).then(function(u){var x=shape(u);wr(UKEY,x);return x});
  }
  function signOut(global){
    return token().then(function(t){if(t)return api('/auth/v1/logout'+(global?'?scope=global':''),{method:'POST',token:t}).catch(function(){})}).then(function(){
      clear();location.href='index.html'});
  }
  window.skUser={get:loadUser,save:save,signOut:signOut};

  /* ---- preferences apply on every page ---- */
  function applyPrefs(p){document.documentElement.classList.toggle('reduce-motion',!!(p&&p.reduceMotion))}
  applyPrefs(rd(PKEY));

  var cached=rd(UKEY),has=!!sess();
  var css=document.createElement('style');
  css.textContent='.reduce-motion .snow{display:none!important}.reduce-motion *,.reduce-motion *::before,.reduce-motion *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}'+
  '.acct{position:relative}.acct-btn{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:1px solid var(--line-hi);background:rgba(var(--tint),.12);color:var(--fg);padding:0;cursor:pointer;overflow:hidden;font:700 .9rem var(--f-body)}'+
  '.acct-btn img,.av img{width:100%;height:100%;object-fit:cover;display:block}.acct-btn:hover{border-color:rgba(var(--hi),.7)}'+
  '.acct-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:240px;padding:.5rem;border-radius:12px;background:rgba(10,14,14,.96);border:1px solid var(--line-hi);display:none;z-index:60}'+
  '.acct.open .acct-menu{display:block}.acct-who{display:flex;gap:.7rem;align-items:center;padding:.6rem .6rem .8rem;border-bottom:1px solid var(--line);margin-bottom:.3rem}'+
  '.acct-who b{display:block;font-size:.92rem;color:#fff}.acct-who div span{display:block;font-size:.78rem;color:var(--muted);overflow-wrap:anywhere}'+
  '.acct-menu a,.acct-menu button{display:block;width:100%;text-align:left;padding:.6rem .7rem;border-radius:8px;border:0;background:none;color:#fff;font:500 .88rem var(--f-body);text-decoration:none;cursor:pointer}'+
  '.acct-menu a:hover,.acct-menu button:hover{background:rgba(255,255,255,.08)}'+
  '.av{display:grid;grid-template:100%/100%;place-items:center;width:44px;height:44px;flex:none;border-radius:50%;overflow:hidden;background:rgba(var(--tint),.16);font:700 1rem var(--f-body);color:#fff}';
  document.head.appendChild(css);

  function avatar(u){return u&&u.photo?'<img src="'+esc(u.photo)+'" alt="" referrerpolicy="no-referrer">':esc((u&&u.name||'?').charAt(0).toUpperCase())}

  /* ---- header: login button becomes the avatar menu ---- */
  function header(u){
    var b=$('#login-btn');if(!b||!has)return;
    var w=$('.acct');if(!w){w=document.createElement('div');w.className='acct';b.parentNode.insertBefore(w,b);b.style.display='none'}
    w.innerHTML='<button class="acct-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Your account">'+avatar(u)+'</button>'+
      '<div class="acct-menu" role="menu"><div class="acct-who"><span class="av">'+avatar(u)+'</span><div><b>'+esc(u.name)+'</b><span>'+esc(u.email)+'</span></div></div>'+
      '<a href="account.html" role="menuitem">Profile and settings</a><button type="button" id="acct-out" role="menuitem">Log out</button></div>';
    var btn=$('.acct-btn',w);
    btn.addEventListener('click',function(e){e.stopPropagation();var o=w.classList.toggle('open');btn.setAttribute('aria-expanded',o)});
    document.addEventListener('click',function(e){if(!w.contains(e.target)){w.classList.remove('open');btn.setAttribute('aria-expanded','false')}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')w.classList.remove('open')});
    $('#acct-out',w).addEventListener('click',function(){signOut(false)});
  }
  function boot(){
    var onLogin=/login(\.html)?$/i.test(location.pathname),onAcct=!!$('#acct');
    if(!has){if(onAcct)location.replace('login.html');return}
    if(onLogin&&!/signup|error/.test(location.hash+location.search)){location.replace('account.html');return}
    if(cached){header(cached);if(onAcct)page(cached)}
    loadUser().then(function(u){
      if(!u){if(onAcct)location.replace('login.html');var w=$('.acct');if(w)w.remove();var b=$('#login-btn');if(b)b.style.display='';return}
      applyPrefs(u.prefs&&Object.keys(u.prefs).length?u.prefs:rd(PKEY));header(u);if(onAcct)page(u);
    });
  }

  /* ---- profile and settings page ---- */
  function fmt(d){try{return new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}catch(e){return ''}}
  function page(u){
    var root=$('#acct');if(!root)return;
    var p=Object.assign({},rd(PKEY)||{},u.prefs||{});
    root.innerHTML=
    '<div class="ac-head"><span class="av big">'+avatar(u)+'</span><div><h1>'+esc(u.name)+'</h1><p>'+esc(u.email)+'</p></div></div>'+
    '<p class="ac-msg" id="ac-msg" role="status" hidden></p>'+
    '<div class="ac-grid">'+
    '<section class="card"><h2>Profile</h2><form id="f-prof" novalidate>'+
      '<label>Display name<input id="p-name" type="text" maxlength="60" value="'+esc(u.name)+'" autocomplete="name"></label>'+
      '<label>Email<input type="email" value="'+esc(u.email)+'" disabled></label>'+
      '<div class="ac-row"><button class="btn btn-solid btn-sm" type="submit">Save name</button></div></form></section>'+
    '<section class="card"><h2>Photo</h2><p class="ac-note">'+(u.custom?'Using the photo you uploaded.':(u.google?'Using your Google photo.':'No photo yet. Initials are shown.'))+'</p>'+
      '<div class="ac-row"><label class="btn btn-solid btn-sm ac-file">Upload photo<input id="p-file" type="file" accept="image/*" hidden></label>'+
      (u.custom?'<button class="btn btn-ghost btn-sm" type="button" id="p-reset">Use '+(u.google?'Google photo':'initials')+'</button>':'')+'</div></section>'+
    '<section class="card"><h2>Preferences</h2>'+
      '<label class="ac-sw"><input type="checkbox" id="s-motion"'+(p.reduceMotion?' checked':'')+'><i></i><span><b>Reduce motion</b><small>Turns off snow and page animations on this site.</small></span></label>'+
      '<label class="ac-sw"><input type="checkbox" id="s-news"'+(p.updates?' checked':'')+'><i></i><span><b>Email updates</b><small>Occasional news about new work. Off by default.</small></span></label></section>'+
    '<section class="card"><h2>Account</h2><dl class="ac-dl"><dt>Signed in with</dt><dd>'+esc(u.provider==='google'?'Google':u.provider)+'</dd><dt>Member since</dt><dd>'+esc(fmt(u.created))+'</dd><dt>Last sign-in</dt><dd>'+esc(fmt(u.last))+'</dd></dl>'+
      '<div class="ac-row"><button class="btn btn-solid btn-sm" type="button" id="a-out">Log out</button><button class="btn btn-ghost btn-sm" type="button" id="a-all">Log out everywhere</button></div></section>'+
    '</div>';
    function msg(t,bad){var m=$('#ac-msg');m.textContent=t;m.className='ac-msg'+(bad?' bad':'');m.hidden=false}
    function done(x,t){header(x);page(x);var m=$('#ac-msg');m.textContent=t;m.className='ac-msg';m.hidden=false}
    $('#f-prof').addEventListener('submit',function(e){e.preventDefault();var n=$('#p-name').value.trim();
      if(!n){msg('Please enter a name.',true);return}
      save({display_name:n}).then(function(x){done(x,'Name saved.')},function(er){msg(er.message,true)})});
    $('#p-file').addEventListener('change',function(){var f=this.files[0];if(!f)return;
      if(!/^image\//.test(f.type)){msg('Please choose an image file.',true);return}
      var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){
        var c=document.createElement('canvas'),s=Math.min(im.width,im.height),S=160;c.width=c.height=S;
        c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,S,S);
        save({custom_avatar:c.toDataURL('image/jpeg',.82)}).then(function(x){done(x,'Photo updated.')},function(er){msg(er.message,true)})};
        im.onerror=function(){msg('That image could not be read.',true)};im.src=r.result};r.readAsDataURL(f)});
    var rs=$('#p-reset');if(rs)rs.addEventListener('click',function(){save({custom_avatar:''}).then(function(x){done(x,'Photo reset.')},function(er){msg(er.message,true)})});
    function prefs(){var v={reduceMotion:$('#s-motion').checked,updates:$('#s-news').checked};wr(PKEY,v);applyPrefs(v);
      save({prefs:v}).then(function(){msg('Preferences saved.')},function(er){msg(er.message,true)})}
    $('#s-motion').addEventListener('change',prefs);$('#s-news').addEventListener('change',prefs);
    $('#a-out').addEventListener('click',function(){signOut(false)});
    $('#a-all').addEventListener('click',function(){signOut(true)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
