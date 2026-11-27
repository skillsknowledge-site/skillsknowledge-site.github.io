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
      photo:m.custom_avatar||'',bio:pr.bio||'',phone:pr.phone||'',phoneOk:!!pr.phone_verified,phoneAsked:pr.phone_verify_asked||'',unchanged:pr.username_changed_at||'',role:pr.role||'member',blocked:!!pr.blocked&&(!pr.blocked_until||new Date(pr.blocked_until).getTime()>Date.now()),reason:pr.block_reason||'',code:pr.block_code||'',website:pr.website||'',location:pr.location||'',
      provider:(u.app_metadata&&u.app_metadata.provider)||'google',pwAt:m.pw_changed_at||'',hasPw:!!m.pw_changed_at||((u.app_metadata&&u.app_metadata.provider)||'google')==='email',created:u.created_at,unlockAt:pr.points_unlock_at||(u.created_at?new Date(new Date(u.created_at).getTime()+3600000).toISOString():''),until:pr.blocked_until||'',last:u.last_sign_in_at,prefs:m.prefs||{},ready:ready};
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
  function applyPrefs(p){var c=document.documentElement.classList;c.toggle('reduce-motion',!!(p&&p.reduceMotion));c.toggle('big-text',!!(p&&p.bigText));if(window.skTheme)window.skTheme(p&&p.theme)}
  applyPrefs(rd(PKEY));

  var cached=rd(UKEY),has=!!sess();
  var css=document.createElement('style');
  css.textContent='.reduce-motion .snow{display:none!important}.reduce-motion *,.reduce-motion *::before,.reduce-motion *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}html.big-text{font-size:17px}'+
  '.acct{position:relative;display:flex;align-items:center;gap:10px}.acct-btn{position:relative;display:block;width:38px;height:38px;border-radius:50%;border:0;background:rgba(var(--tint),.2);color:#fff;padding:0;cursor:pointer;overflow:hidden;font:700 .9rem var(--f-body)}'+
  '.acct-btn .ini{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}.acct-btn img,.av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.acct-btn:hover{filter:brightness(1.15)}'+
'.ntf{position:relative}.ntf-btn{position:relative;display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:0;background:rgba(var(--tint),.2);color:var(--fg,#fff);padding:0;cursor:pointer}.ntf-btn:hover{background:rgba(var(--tint),.3)}'+
  '.ntf-btn svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}'+
  '.ntf-dot{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#000;color:#fff;font:800 .68rem/18px var(--f-body);text-align:center;box-shadow:0 0 0 2px #fff}.ntf-dot[hidden]{display:none}'+
  '.ntf-panel{position:absolute;right:-48px;top:calc(100% + 10px);width:min(380px,calc(100vw - 24px));max-height:min(70vh,520px);display:flex;flex-direction:column;border-radius:16px;background:var(--s-surface,rgba(10,14,14,.97));color:var(--s-ink,#fff);box-shadow:0 18px 50px rgba(30,50,120,.25);z-index:60;overflow:hidden}.ntf-panel[hidden]{display:none}'+
  '.ntf-h{display:flex;align-items:center;justify-content:space-between;padding:.85rem 1rem;border-bottom:1px solid var(--line,rgba(127,127,127,.2))}.ntf-h b{font:800 1rem var(--f-display)}.ntf-all{border:0;background:none;color:rgb(var(--acc));font:700 .8rem var(--f-body);cursor:pointer;padding:.2rem}.ntf-all:disabled{opacity:.4;cursor:default}'+
  '.ntf-list{overflow:auto;padding:.3rem}.ntf-it{display:grid;grid-template-columns:36px 1fr;gap:.7rem;padding:.7rem .7rem;border-radius:12px;text-decoration:none;color:inherit;position:relative}a.ntf-it:hover{background:var(--s-soft,rgba(127,127,127,.12))}'+
  '.ntf-ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--s-soft,rgba(127,127,127,.14));color:rgb(var(--acc))}.ntf-ic svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}'+
  '.ntf-it b{display:block;font:800 .9rem/1.3 var(--f-body)}.ntf-it p{margin:.15rem 0 0;font:500 .84rem/1.45 var(--f-body);opacity:.8}.ntf-it time{display:block;margin-top:.25rem;font:600 .72rem var(--f-body);opacity:.55}'+
  '.ntf-it.new::after{content:"";position:absolute;right:.7rem;top:.9rem;width:9px;height:9px;border-radius:50%;background:rgb(var(--acc))}.ntf-it.new b{padding-right:1.2rem}'+
  '.ntf-empty{padding:2rem 1rem;text-align:center;opacity:.65;font:600 .9rem var(--f-body)}'+
  '@media (max-width:480px){.ntf-panel{position:fixed;left:12px;right:12px;top:64px;width:auto}}'+
  
  '.acct-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:250px;padding:.5rem;border-radius:14px;background:var(--s-surface,rgba(10,14,14,.97));box-shadow:0 14px 40px rgba(30,50,120,.2);display:none;z-index:60}'+
  '.acct.open .acct-menu{display:block}.acct-who{display:flex;gap:.7rem;align-items:center;padding:.6rem .6rem .8rem;border-bottom:1px solid var(--line,rgba(255,255,255,.1));margin-bottom:.3rem}'+
  '.acct-who div span{display:block;font-size:.78rem;color:var(--muted);overflow-wrap:anywhere}.acct-who b{display:block;font-size:.92rem;color:var(--s-ink,#fff)}'+
  '.acct-menu a,.acct-menu button{display:block;width:100%;text-align:left;padding:.6rem .7rem;border-radius:8px;border:0;background:none;color:var(--s-ink,#fff);font:600 .88rem var(--f-body);text-decoration:none;cursor:pointer}'+
  '.acct-menu a:hover,.acct-menu button:hover{background:var(--s-soft,rgba(255,255,255,.08))}'+
  '.acct-theme{display:flex;gap:4px;margin:.35rem .2rem .2rem;padding:4px;border-radius:99px;background:var(--s-soft,rgba(255,255,255,.08))}'+
  '.acct-menu .acct-theme button{flex:1;text-align:center;padding:.45rem .6rem;border-radius:99px;font-weight:700}'+
  '.acct-menu .acct-theme button:hover{background:none}.acct-menu .acct-theme button[aria-pressed=true]{background:rgb(var(--acc));color:#fff}'+
  '.av{position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;border-radius:50%;overflow:hidden;background:rgba(var(--tint),.18);font:700 1rem var(--f-body);color:#fff}'+
  '.un-back{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.7)}'+
  '.un-box{width:min(400px,100%);padding:1.6rem 1.4rem;border-radius:16px;background:#0c1512;color:#fff;display:grid;gap:.8rem}'+
  '.un-box h2{margin:0;font-size:1.3rem}.un-box p{margin:0;color:var(--muted);font-size:.9rem}'+
  '.un-in{display:flex;align-items:center;gap:.3rem;padding:.2rem .9rem;border-radius:12px;background:rgba(255,255,255,.1)}.un-in span{color:var(--muted)}'+
  '.un-in textarea{flex:1;min-width:0;border:0;background:none;color:#fff;font:500 .95rem var(--f-body);padding:.65rem 0;outline:0;resize:vertical}.un-in input{flex:1;min-width:0;border:0;background:none;color:#fff;font:500 1rem var(--f-body);padding:.65rem 0;outline:0}'+
  '.un-box.rf-box{width:min(560px,100%);padding:2.6rem 2rem;text-align:center;border-radius:20px}.rf-view{justify-items:center;gap:1rem}.rf-view h2{font-size:1.7rem;margin:0}.rf-view p{margin:0;max-width:40ch;line-height:1.6}'+
  '.rf-ic{width:72px;height:72px;fill:none;stroke:rgb(var(--acc));stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}'+
  '.rf-go{margin-top:.6rem;width:min(360px,100%);padding:1.15rem 1.5rem;border:0;border-radius:16px;background:rgb(var(--acc));color:#fff;font:800 1.3rem var(--f-body);cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.25);transition:transform .15s}.rf-go:hover{transform:translateY(-2px)}.rf-go:disabled{opacity:.6;cursor:wait;transform:none}'+
  '.ntf-it.warn .ntf-ic{background:rgba(163,24,42,.16);color:#d12a42}.ntf-it.warn b{color:#d12a42}'+
  '.ntf-modal{width:min(440px,100%);text-align:center;display:grid;justify-items:center;gap:.7rem;padding:2rem 1.6rem}.ntf-modal h2{margin:0;font-size:1.35rem}.ntf-modal p{margin:0;line-height:1.6;opacity:.85}.ntf-modal time{font:600 .75rem var(--f-body);opacity:.55}.ntf-modal .ntf-ic{width:54px;height:54px}.ntf-modal .ntf-ic svg{width:26px;height:26px}.ntf-modal.warn h2{color:#d12a42}.ntf-modal.warn .ntf-ic{background:rgba(163,24,42,.16);color:#d12a42}'+
  '.ntf-mb{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;margin-top:.6rem}.ntf-go,.ntf-x{padding:.7rem 1.4rem;border-radius:12px;font:700 .95rem var(--f-body);cursor:pointer;text-decoration:none;border:0}.ntf-go{background:rgb(var(--acc));color:#fff}.ntf-x{background:rgba(127,127,127,.2);color:inherit}'+
  'button.ntf-it{width:100%;border:0;background:none;text-align:left;font:inherit;cursor:pointer}button.ntf-it:hover{background:var(--s-soft,rgba(127,127,127,.12))}'+
  '.un-box{position:relative;border-radius:2px}.un-box.wide{width:min(640px,100%);padding:2rem 1.8rem}.un-view{display:grid;gap:.8rem}.un-view[hidden]{display:none}.un-in,.un-st+*{border-radius:2px}.un-big textarea{min-height:240px;resize:vertical}.un-end{justify-content:flex-end}.un-box .btn{border-radius:2px}'+
  '.un-x{position:absolute;top:.5rem;right:.7rem;width:2rem;height:2rem;border:0;background:none;color:#fff;font:400 1.9rem/1 var(--f-body);cursor:pointer}'+
  '.un-done{justify-items:center;text-align:center;padding:1.4rem 0}.un-tick{width:84px;height:84px}.un-tick circle{fill:none;stroke:#2fd27a;stroke-width:3;stroke-dasharray:151;stroke-dashoffset:151;animation:untk .6s ease forwards}.un-tick path{fill:none;stroke:#2fd27a;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:40;stroke-dashoffset:40;animation:untk .4s .5s ease forwards}@keyframes untk{to{stroke-dashoffset:0}}.un-done h2{color:#2fd27a}'+
  '.acct-menu .pts-off{opacity:.5;cursor:not-allowed;display:flex;justify-content:space-between;align-items:center}.acct-menu .pts-off small{font-size:.72rem}.un-st{min-height:1.2em;font-size:.84rem;color:var(--muted)}.un-st.ok{color:#5be39a}.un-st.bad{color:#ff8f8f}'+
  '.un-row{display:flex;gap:.6rem;align-items:center;justify-content:space-between}.un-link{background:none;border:0;color:var(--muted);cursor:pointer;font:500 .84rem var(--f-body);padding:0}';
  document.head.appendChild(css);

  function avatar(u){return u&&u.photo?'<img src="'+esc(u.photo)+'" alt="">':'<span class="ini">'+esc((u&&u.name||'?').charAt(0).toUpperCase())+'</span>'}
  function avInner(u){return u&&u.photo?'<img src="'+esc(u.photo)+'" alt="">':esc((u&&u.name||'?').charAt(0).toUpperCase())}

  /* points are locked for the first hour after sign-up (the server checks this too) */
  function ptsLink(u){
    var at=u&&u.unlockAt?new Date(u.unlockAt).getTime():0;
    return at>Date.now()?'<a class="pts-off" aria-disabled="true" role="menuitem" title="Points are not open yet">Points<small>opens in '+Math.max(1,Math.ceil((at-Date.now())/60000))+' min</small></a>':'<a href="points" role="menuitem">Points</a>';
  }

  /* ---- notification bell: welcome notice, website updates, points news (all stored in Supabase) ---- */
  var ICONS={bell:'<path d="M4 5.5h16v10H12l-4.5 3.5V15.5H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    welcome:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    update:'<path d="M4 10v4l3 .5L13 19V5L7 9.5z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
    warn:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'};
  function ago(d){var s=Math.max(0,(Date.now()-new Date(d).getTime())/1000);if(s<60)return 'Just now';if(s<3600)return Math.floor(s/60)+' min ago';if(s<86400)return Math.floor(s/3600)+' h ago';if(s<604800)return Math.floor(s/86400)+' d ago';return fmt(d)}
  function bell(w){
    var n=document.createElement('div');n.className='ntf';
    n.innerHTML='<button class="ntf-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Notifications"><svg viewBox="0 0 24 24" aria-hidden="true">'+ICONS.bell+'</svg><b class="ntf-dot" hidden></b></button>'+
      '<div class="ntf-panel" role="dialog" aria-label="Notifications" hidden><div class="ntf-h"><b>Notifications</b><button class="ntf-all" type="button" disabled>Mark all as read</button></div><div class="ntf-list"><p class="ntf-empty">Loading…</p></div></div>';
    w.insertBefore(n,w.firstChild);
    var btn=$('.ntf-btn',n),dot=$('.ntf-dot',n),panel=$('.ntf-panel',n),list=$('.ntf-list',n),all=$('.ntf-all',n),data=null,mt=0;
    function paint(){
      if(!data)return;
      dot.hidden=!data.unread;dot.textContent=data.unread>9?'9+':data.unread;all.disabled=!data.unread;
      btn.setAttribute('aria-label','Notifications'+(data.unread?' ('+data.unread+' new)':''));
      list.innerHTML=data.items.length?data.items.map(function(i){
        var ic=ICONS[i.kind]||ICONS.bell;
        return '<button type="button" class="ntf-it'+(i.read?'':' new')+(i.kind==='warn'?' warn':'')+'" data-i="'+i.id+'"><span class="ntf-ic"><svg viewBox="0 0 24 24" aria-hidden="true">'+ic+'</svg></span><span><b>'+esc(i.title)+'</b>'+(i.body?'<p>'+esc(i.body)+'</p>':'')+'<time>'+esc(ago(i.created_at))+'</time></span></button>'
      }).join(''):'<p class="ntf-empty">You are all caught up.</p>';
    }
    function openItem(id){
      var i=(data&&data.items||[]).filter(function(x){return String(x.id)===String(id)})[0];if(!i)return;
      var ok=/^(https:\/\/[^\s"<>]+|[a-z0-9._\/#?=&-]+)$/i.test(i.link||''),ext=/^https:/i.test(i.link||'');
      close();
      var d=overlay('<div class="un-box ntf-modal'+(i.kind==='warn'?' warn':'')+'" role="dialog" aria-modal="true" aria-labelledby="nm-h"><span class="ntf-ic"><svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[i.kind]||ICONS.bell)+'</svg></span><h2 id="nm-h">'+esc(i.title)+'</h2>'+(i.body?'<p>'+esc(i.body)+'</p>':'')+'<time>'+esc(fmt(i.created_at))+'</time>'+
        '<div class="ntf-mb">'+(ok?'<a class="ntf-go" href="'+esc(i.link)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>Open page</a>':'')+'<button type="button" class="ntf-x">Close</button></div></div>');
      var x=d.querySelector('.ntf-x');x.focus();
      function shut(){d.remove();document.removeEventListener('keydown',esc2)}
      function esc2(e){if(e.key==='Escape')shut()}
      x.addEventListener('click',shut);d.addEventListener('click',function(e){if(e.target===d)shut()});document.addEventListener('keydown',esc2);
    }
    list.addEventListener('click',function(e){var b=e.target.closest('.ntf-it');if(b)openItem(b.dataset.i)});
    function load(){token().then(function(t){return t&&api('/rest/v1/rpc/notifications_list',{method:'POST',token:t,body:{}})}).then(function(r){if(r&&r.items){data=r;paint()}else if(!data){list.innerHTML='<p class="ntf-empty">Nothing here yet.</p>'}}).catch(function(){if(!data)list.innerHTML='<p class="ntf-empty">Notifications could not load. Try again later.</p>'})}
    function markRead(){if(!data||!data.unread)return;token().then(function(t){return t&&api('/rest/v1/rpc/notifications_mark_read',{method:'POST',token:t,body:{}})}).then(function(){
      data.unread=0;dot.hidden=true;all.disabled=true;btn.setAttribute('aria-label','Notifications')},function(){})}
    function close(){panel.hidden=true;btn.setAttribute('aria-expanded','false');clearTimeout(mt);if(data&&!data.unread){data.items.forEach(function(i){i.read=true});paint()}}
    btn.addEventListener('click',function(e){e.stopPropagation();w.classList.remove('open');
      if(!panel.hidden){close();return}
      panel.hidden=false;btn.setAttribute('aria-expanded','true');load();
      mt=setTimeout(markRead,1800)});
    all.addEventListener('click',function(){markRead();clearTimeout(mt)});
    document.addEventListener('click',function(e){if(!panel.hidden&&!n.contains(e.target))close()});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!panel.hidden){close();btn.focus()}});
    $('.acct-btn',w).addEventListener('click',function(){if(!panel.hidden)close()});
    load();clearInterval(window.__skNtf);window.__skNtf=setInterval(function(){if(!document.hidden)load()},90000);
  }
  /* ---- header: the Login button becomes the avatar menu ---- */
  function header(u){
    var b=$('#login-btn');if(!b||!has)return;
    var w=$('.acct');if(!w){w=document.createElement('div');w.className='acct';b.parentNode.insertBefore(w,b);b.style.display='none'}
    w.innerHTML='<button class="acct-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Your account">'+avatar(u)+'</button>'+
      '<div class="acct-menu" role="menu"><div class="acct-who"><span class="av">'+avInner(u)+'</span><div><b>'+esc(u.name)+'</b><span>'+(u.username?'@'+esc(u.username):esc(u.email))+'</span></div></div>'+
      '<a href="account" role="menuitem">Profile and settings</a>'+ptsLink(u)+
      '<div class="acct-theme" role="group" aria-label="Colour theme"><button type="button" data-th="light" aria-pressed="'+(curTheme()==='light')+'">Light</button><button type="button" data-th="dark" aria-pressed="'+(curTheme()==='dark')+'">Dark</button></div>'+
      '<button type="button" id="acct-out" role="menuitem">Log out</button></div>';
    bell(w);
    var btn=$('.acct-btn',w);
    btn.addEventListener('click',function(e){e.stopPropagation();var o=w.classList.toggle('open');btn.setAttribute('aria-expanded',o)});
    document.addEventListener('click',function(e){if(!w.contains(e.target)){w.classList.remove('open');btn.setAttribute('aria-expanded','false')}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')w.classList.remove('open')});
    $('#acct-out',w).addEventListener('click',function(){signOut(false)});
    [].forEach.call(w.querySelectorAll('[data-th]'),function(b){b.addEventListener('click',function(){
      var v=Object.assign({},rd(PKEY)||{},{theme:b.dataset.th});wr(PKEY,v);applyPrefs(v);
      [].forEach.call(w.querySelectorAll('[data-th]'),function(o){o.setAttribute('aria-pressed',o===b)});
      saveMeta({prefs:v}).catch(function(){})})});
  }
  function curTheme(){return document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'}

  /* ---- required step: choose a username nobody else has ---- */
  /* someone joined with a reference code: they must approve it. It cannot be closed and comes back after refresh, logout and login. */
  function refStep(u){
    return token().then(function(t){if(!t)return;
      return api('/rest/v1/rpc/my_pending_reference',{method:'POST',token:t,body:{}}).then(function(r){
        if(!r||$('.un-back.ref'))return;
        var d=overlay('<div class="un-box rf-box" role="alertdialog" aria-modal="true" aria-labelledby="rf-h"><div class="un-view rf-view"><svg class="rf-ic" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg><h2 id="rf-h">Approve your reference</h2>'+
          '<p>Welcome, '+esc(u.name)+'. You joined using a reference code from <b>'+esc(r.who)+'</b>.</p>'+
          '<p>Please press the big button to approve this reference. This message stays until you approve it.</p>'+
          '<button class="rf-go" type="button" id="rf-go">Approve</button>'+
          '<div class="un-st" id="rf-s" role="status"></div></div></div>');
        d.classList.add('ref');
        var b=$('#rf-go',d),st=$('#rf-s',d);
        b.addEventListener('click',function(){b.disabled=true;b.textContent='Please wait…';
          token().then(function(t2){return api('/rest/v1/rpc/approve_reference',{method:'POST',token:t2,body:{}})}).then(function(){
            d.innerHTML='<div class="un-box"><div class="un-view un-done"><svg class="un-tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg><h2>Reference approved</h2></div></div>';
            setTimeout(function(){d.remove()},1400)},function(){b.disabled=false;b.textContent='Approve';st.textContent='Could not approve. Please try again.';st.className='un-st bad'})});
        document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('.un-back.ref'))e.preventDefault()},true);
      })}).catch(function(){});
  }
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
    var d=overlay('<form class="un-box" novalidate role="alertdialog" aria-modal="true" aria-labelledby="tm-h">'+
      '<div id="tm-main" class="un-view"><h2 id="tm-h">Your account has been terminated</h2>'+
      '<p>'+(who?esc(who)+' has':'This account has')+' been blocked by the site owner, so you can no longer use your profile or settings.</p>'+
      (u&&u.reason?'<p><b>Reason:</b> '+esc(u.reason)+'</p>':'')+(u&&u.code?'<p class="un-code">Code: '+esc(u.code)+'</p>':'')+
      (u&&u.until?'<p>You can use the website again on <b>'+esc(fmt(u.until))+'</b>.</p>':'<p>If you think this is a mistake, you can send an appeal. Otherwise log out.</p>')+
      '<div class="un-row"><button class="un-link" type="button" id="tm-out">Log out</button><button class="btn btn-solid btn-sm" type="button" id="tm-ap">Appeal</button></div></div>'+
      '<div id="tm-form" class="un-view" hidden><button class="un-x" type="button" id="tm-x" aria-label="Close">&times;</button><h2>Appeal your termination</h2><p>Tell us why you think this was a mistake.</p>'+(known?'':'<div class="un-in"><input id="tm-id" type="text" placeholder="Your email or username" autocomplete="username" autocapitalize="off"></div>')+
      '<div class="un-in un-big"><textarea id="tm-msg" rows="9" maxlength="1000" placeholder="Write your appeal here (at least 5 characters)"></textarea></div>'+
      '<div class="un-st" id="tm-st" role="status"></div>'+
      '<div class="un-row un-end"><button class="btn btn-solid btn-sm" type="submit" id="tm-send">Submit</button></div></div>'+
      '<div id="tm-done" class="un-view un-done" hidden><button class="un-x" type="button" id="tm-x2" aria-label="Close">&times;</button>'+
      '<svg class="un-tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg>'+
      '<h2>Appeal submitted</h2><p>Action will be taken on your appeal within 2&ndash;3 days.</p></div></form>');
    d.classList.add('term');
    var box=d.firstChild;
    function show(id){['tm-main','tm-form','tm-done'].forEach(function(k){$('#'+k,d).hidden=k!==id});box.classList.toggle('wide',id!=='tm-main')}
    var st=$('#tm-st',d);function say(t,c){st.textContent=t;st.className='un-st'+(c?' '+c:'')}
    $('#tm-out',d).addEventListener('click',function(){clear();try{localStorage.removeItem(PKEY)}catch(e){}go('index')});
    $('#tm-ap',d).addEventListener('click',function(){show('tm-form');($('#tm-id',d)||$('#tm-msg',d)).focus()});
    function closeX(){show('tm-main');say('')}
    $('#tm-x',d).addEventListener('click',closeX);$('#tm-x2',d).addEventListener('click',closeX);
    box.addEventListener('submit',function(e){e.preventDefault();
      var idEl=$('#tm-id',d),id=known||(idEl&&idEl.value.trim()),m=$('#tm-msg',d).value.trim();
      if(!id){say('Enter your email or username.','bad');return}
      if(m.length<5){say('Please write a few words about why this is a mistake.','bad');return}
      $('#tm-send',d).disabled=true;say('Sending…');
      api('/rest/v1/rpc/submit_appeal2',{method:'POST',body:{p_kind:'account',p_identifier:id,p_message:m}}).then(function(r){
        if(r==='ok'){$('#tm-msg',d).value='';say('');$('#tm-send',d).disabled=false;show('tm-done')}
        else{$('#tm-send',d).disabled=false;say(r==='short'?'Please write a little more.':'Could not send. Please try again.','bad')}
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
  function setPassword(pw){return token().then(function(t){if(!t)throw new Error('Please log in again.');return api('/auth/v1/user',{method:'PUT',token:t,body:{password:pw,data:{pw_changed_at:new Date().toISOString()}}})})}
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
    if(window.SK&&typeof SK.blockedRegion==='function'&&SK.blockedRegion()){clear();return}
    if(oerr||ocode){
      if(/banned|blocked/i.test(oerr+' '+ocode)){terminated(null);return}
      if(!/\/login(\.html)?$/i.test(location.pathname)){location.replace((web?'login':'login.html')+'?error_description='+encodeURIComponent(oerr||'Sign-in failed. Please try again.'));return}
    }
    var onLogin=/\/login(\.html)?$/i.test(location.pathname),onAcct=!!$('#acct');
    if(!has){if(onAcct)goReplace('login');return}
    var back=null;try{back=JSON.parse(localStorage.getItem('sk_after')||'null');localStorage.removeItem('sk_after')}catch(e){}
    if(back&&/^[a-z0-9-]+\.html$/.test(back.p||'')&&Date.now()-back.t<600000){location.replace(back.p);return}
    if(onLogin&&!/signup|error/.test(location.hash+location.search)){goReplace('account');return}
    if(cached){header(cached);if(onAcct)page(cached)}
    token().then(function(t){return t&&api('/rest/v1/rpc/release_block_if_due',{method:'POST',token:t,body:{}})}).catch(function(){}).then(function(){return loadUser()}).then(function(u){
      if((u&&u.blocked)||banned){terminated(u||cached);return}
      if(!u){if(onAcct)goReplace('login');var w=$('.acct');if(w)w.remove();var b=$('#login-btn');if(b)b.style.display='';return}
      applyPrefs(u.prefs&&Object.keys(u.prefs).length?u.prefs:rd(PKEY));header(u);beat(u);
      var rec=false;try{rec=sessionStorage.getItem('sk_recovery')==='1';sessionStorage.removeItem('sk_recovery')}catch(e){}
      refStep(u);
      if(rec)passDialog();else if(u.ready&&!u.username&&!document.body.classList.contains('adm'))usernameStep(u);
      if(onAcct)page(u);
    });
  }

  /* ---- profile and settings page ---- */
  function lockedUntil(u){if(u.owner||!u.unchanged)return null;var t=new Date(u.unchanged).getTime()+10*86400000;return t>Date.now()?new Date(t):null}
  function fmt(d){try{return new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}catch(e){return ''}}
  /* ---- phone number: country picker, status and the verification request ---- */
  function phoneSplit(v){
    var L=window.SKM?SKM.countries():[],d0=window.SKM?SKM.country():'';v=(v||'').replace(/[^0-9+]/g,'');
    if(/^(?:\+|00)972/.test(v))return {iso:'',num:''};
    if(v.charAt(0)==='+'){var d=v.slice(1),best=null;
      L.forEach(function(c){if(d.indexOf(c.dial)===0&&(!best||c.dial.length>best.dial.length))best=c});
      if(best){var iso=best.iso;L.forEach(function(c){if(c.iso===d0&&c.dial===best.dial)iso=c.iso});return {iso:iso,num:d.slice(best.dial.length)}}
      return {iso:'',num:d}}
    return {iso:d0,num:v.replace(/^0+/,'')}}
  function dialOf(iso){var r='';(window.SKM?SKM.countries():[]).forEach(function(c){if(c.iso===iso)r=c.dial});return r}
  function flagHtml(iso,name){
    var lo=(iso||'').toLowerCase(),safe=esc(iso||'');
    if(!lo)return '<span class="ph-f-emp" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3a13 13 0 0 0 0 18M12 3a13 13 0 0 1 0 18"/></svg></span>';
    return '<img class="ph-f-img" src="https://flagcdn.com/w40/'+lo+'.png" srcset="https://flagcdn.com/w80/'+lo+'.png 2x" alt="'+esc(name||iso)+'" loading="lazy" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.hidden=false"><span class="ph-f-txt" hidden>'+safe+'</span>';
  }
  function phoneField(u){
    var L=window.SKM?SKM.countries():[],sp=phoneSplit(u.phone),dis=u.ready?'':' disabled';
    var curObj=L.filter(function(c){return c.iso===sp.iso})[0]||null;
    var st=!u.phone?'':u.phoneOk?'<small class="ph-st ok">Verified</small>':'<small class="ph-st">Unverified</small>';
    var info='';
    if(u.phone&&!u.phoneOk)info='<span class="ph-ib"><button type="button" class="ph-i" id="ph-i" aria-label="About phone verification" aria-expanded="false">i</button><span class="ph-tip" id="ph-tip" role="tooltip">'+(u.phoneAsked?'<b>Verification requested</b><span>We check numbers by hand. You will get a notification here when yours is verified.</span>':'<b>Verify your number</b><span>To use Points.</span><button type="button" class="ph-black ph-sm" id="ph-open">Verify</button>')+'</span></span>';
    if(!L.length)return '<label>Phone<input id="p-tel" type="tel" maxlength="20" placeholder="+92 300 0000000" value="'+esc(u.phone)+'" autocomplete="tel"'+dis+'></label>';
    var dialTxt=curObj?'+'+curObj.dial:'+Code';
    return '<div class="ph-field"><div class="ph-top"><span class="ph-lbl">Phone</span>'+st+'</div><div class="ph-row">'+
      '<div class="ph-combo" id="ph-combo">'+
      '<input type="hidden" id="p-cc" value="'+esc(sp.iso)+'">'+
      '<button type="button" class="ph-cc-btn" id="p-cc-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Select country code"'+dis+'>'+
        '<span class="ph-flag" id="p-flag">'+flagHtml(sp.iso,curObj&&curObj.name)+'</span>'+
        '<b class="ph-dial" id="p-dial">'+esc(dialTxt)+'</b>'+
        '<svg class="ph-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>'+
      '</button>'+
      '<span class="ph-sep" aria-hidden="true"></span>'+
      '<input id="p-tel" type="tel" inputmode="tel" maxlength="20" placeholder="300 0000000" value="'+esc(sp.num)+'" autocomplete="tel-national"'+dis+'>'+
      '<div class="ph-drop" id="ph-drop" role="dialog" aria-label="Choose country" hidden>'+
        '<div class="ph-search-w"><input type="search" id="ph-search" placeholder="Search country or +code…" autocomplete="off" spellcheck="false"></div>'+
        '<div class="ph-list" id="ph-list" role="listbox" aria-label="Countries">'+
          L.map(function(c){return '<button type="button" class="ph-opt'+(c.iso===sp.iso?' on':'')+'" role="option" aria-selected="'+(c.iso===sp.iso?'true':'false')+'" data-iso="'+esc(c.iso)+'" data-dial="'+esc(c.dial)+'" data-name="'+esc(c.name)+'">'+
            '<span class="ph-flag">'+flagHtml(c.iso,c.name)+'</span>'+
            '<span class="ph-oname">'+esc(c.name)+'</span>'+
            '<span class="ph-odial">+'+esc(c.dial)+'</span>'+
          '</button>'}).join('')+
        '</div>'+
      '</div>'+
      '</div>'+info+'</div><small>Needed to use Points. You can also log in with it.</small></div>'}
  function phoneValue(){ /* the full number from the merged box, or false when it is not valid */
    var cc=$('#p-cc'),t=$('#p-tel');if(!t)return false;
    if(!cc){var v=t.value.replace(/[^0-9+]/g,'');if(/^(?:\+|00)?972/.test(v))return 'blocked_il';return !v||/^\+?[0-9]{7,15}$/.test(v)?v:false}
    var raw=t.value.replace(/[^0-9+]/g,'');if(/^(?:\+|00)972/.test(raw))return 'blocked_il';
    var n=t.value.replace(/[^0-9]/g,'').replace(/^0+/,'');if(!n)return '';
    if(cc.value==='IL')return 'blocked_il';
    if(!cc.value)return false;var f='+'+dialOf(cc.value)+n;if(/^\+972/.test(f))return 'blocked_il';return /^\+[0-9]{7,15}$/.test(f)?f:false}
  function phoneUi(u,done,msg){
    var cc=$('#p-cc'),btn=$('#p-cc-btn'),drop=$('#ph-drop'),search=$('#ph-search'),list=$('#ph-list'),tel=$('#p-tel'),combo=$('#ph-combo');
    if(!cc)return;
    function setCountry(iso){
      var L=window.SKM?SKM.countries():[],obj=L.filter(function(c){return c.iso===iso})[0]||null;
      cc.value=obj?obj.iso:'';
      var fl=$('#p-flag'),dl=$('#p-dial');
      if(fl)fl.innerHTML=flagHtml(cc.value,obj&&obj.name);
      if(dl)dl.textContent=obj?'+'+obj.dial:'+Code';
      if(list)[].forEach.call(list.querySelectorAll('.ph-opt'),function(o){
        var on=o.dataset.iso===cc.value;o.classList.toggle('on',on);o.setAttribute('aria-selected',on?'true':'false');
      });
    }
    if(btn&&drop&&list){
      function openDrop(){
        if(btn.disabled)return;
        drop.hidden=false;btn.setAttribute('aria-expanded','true');
        if(search){search.value='';filterList('');setTimeout(function(){search.focus()},20)}
        var sel=list.querySelector('.ph-opt.on');if(sel)sel.scrollIntoView({block:'nearest'});
      }
      function closeDrop(refocus){
        if(drop.hidden)return;
        drop.hidden=true;btn.setAttribute('aria-expanded','false');
        if(refocus)btn.focus();
      }
      function filterList(q){
        q=(q||'').trim().toLowerCase().replace(/^\+/,'');
        var shown=0;
        [].forEach.call(list.querySelectorAll('.ph-opt'),function(o){
          var ok=!q||o.dataset.name.toLowerCase().indexOf(q)>-1||o.dataset.iso.toLowerCase().indexOf(q)>-1||o.dataset.dial.indexOf(q)===0;
          o.hidden=!ok;if(ok)shown++;
        });
        var em=list.querySelector('.ph-empty');
        if(!shown&&!em){em=document.createElement('p');em.className='ph-empty';em.textContent='No matching country';list.appendChild(em)}
        else if(em)em.hidden=shown>0;
      }
      btn.addEventListener('click',function(e){e.stopPropagation();if(drop.hidden)openDrop();else closeDrop(false)});
      if(search){
        search.addEventListener('input',function(){filterList(this.value)});
        search.addEventListener('keydown',function(e){
          if(e.key==='Escape'){e.preventDefault();closeDrop(true)}
          else if(e.key==='Enter'){e.preventDefault();var first=list.querySelector('.ph-opt:not([hidden])');if(first){setCountry(first.dataset.iso);closeDrop(false);if(tel)tel.focus()}}
        });
      }
      list.addEventListener('click',function(e){
        var opt=e.target.closest('.ph-opt');if(!opt)return;
        setCountry(opt.dataset.iso);closeDrop(false);if(tel)tel.focus();
      });
      document.addEventListener('click',function(e){if(combo&&!combo.contains(e.target))closeDrop(false)});
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!drop.hidden)closeDrop(true)});
    }
    if(tel){
      tel.addEventListener('input',function(){
        var v=tel.value.replace(/[^0-9+]/g,'');
        if(v.charAt(0)==='+'&&v.length>1&&!/^\+972/.test(v)){
          var L=window.SKM?SKM.countries():[],d=v.slice(1),best=null;
          L.forEach(function(c){if(d.indexOf(c.dial)===0&&(!best||c.dial.length>best.dial.length))best=c});
          if(best){setCountry(best.iso);tel.value=d.slice(best.dial.length)}
        }
      });
    }
    var i=$('#ph-i'),tip=$('#ph-tip');
    if(i)i.addEventListener('click',function(e){e.stopPropagation();var o=!tip.classList.contains('open');tip.classList.toggle('open',o);i.setAttribute('aria-expanded',o?'true':'false')});
    document.addEventListener('click',function(e){if(tip&&!tip.contains(e.target)&&e.target!==i){tip.classList.remove('open');if(i)i.setAttribute('aria-expanded','false')}});
    var go=$('#ph-open');if(!go)return;
    go.addEventListener('click',function(){
      var d=overlay('<div class="un-box ph-modal" role="dialog" aria-modal="true" aria-labelledby="ph-h"><span class="ph-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 2.5h10a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V4A1.5 1.5 0 0 1 7 2.5z"/><path d="M10.5 18.5h3"/></svg></span><h2 id="ph-h">Verify your phone number</h2><p class="ph-num">'+esc(u.phone)+'</p>'+
        '<p class="ph-lead">Verified numbers can use the Points feature. Our team checks each number by hand, so we only check the numbers of people who ask.</p>'+
        '<ul class="ph-ul"><li>Share your reference code and earn points.</li><li>Use your points as a discount at checkout.</li><li>Your number is only used to check your account. Other people never see it.</li></ul>'+
        '<p class="ph-res" id="ph-res" hidden></p><button type="button" class="ph-black ph-big" id="ph-send">Send verification request</button><button type="button" class="ph-x" id="ph-no">Not now</button></div>');
      d.classList.add('ph-back');
      function shut(){d.classList.add('out');setTimeout(function(){d.remove()},220);document.removeEventListener('keydown',k)}
      function k(e){if(e.key==='Escape')shut()}
      document.addEventListener('keydown',k);d.addEventListener('click',function(e){if(e.target===d)shut()});$('#ph-no').addEventListener('click',shut);
      var send=$('#ph-send');send.focus();
      send.addEventListener('click',function(){
        if(send.textContent==='Close'){shut();return}
        send.disabled=true;var r=$('#ph-res');
        token().then(function(t){return t&&api('/rest/v1/rpc/request_phone_verify',{method:'POST',token:t,body:{}})}).then(function(){
          u.phoneAsked=new Date().toISOString();r.hidden=false;r.className='ph-res ok';r.textContent='Request sent. We will check your number and send you a notification when it is verified.';
          send.textContent='Close';send.disabled=false;$('#ph-no').hidden=true;
                    var tp=$('#ph-tip');if(tp)tp.innerHTML='<b>Verification requested</b><span>We check numbers by hand. You will get a notification here when yours is verified.</span>'},
          function(){r.hidden=false;r.className='ph-res bad';r.textContent='Could not send the request. Please try again.';send.disabled=false})})})}
  function page(u){
    var root=$('#acct');if(!root)return;
    if(u.owner===undefined&&u.ready){u.owner=false;token().then(function(t){return t&&api('/rest/v1/rpc/admin_whoami',{method:'POST',token:t,body:{}})}).then(function(me){if(me&&me.is_owner){u.owner=true;page(u)}}).catch(function(){})}
    var p=Object.assign({},rd(PKEY)||{},u.prefs||{}),msgText=$('#ac-msg')&&!$('#ac-msg').hidden?$('#ac-msg').textContent:'';
    root.innerHTML=
    '<div class="ac-head"><div class="av-wrap"><button type="button" class="av big av-edit" id="av-btn" aria-haspopup="true" aria-expanded="false" aria-label="Change profile photo">'+avInner(u)+'<i class="av-cam" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg></i></button>'+
      '<div class="av-menu" id="av-menu" role="menu" hidden><label class="av-it" role="menuitem">'+(u.photo?'Change photo':'Add photo')+'<input id="p-file" type="file" accept="image/*" hidden></label>'+(u.photo?'<button class="av-it" type="button" role="menuitem" id="p-reset">Remove photo</button>':'')+'</div></div><div><h1>'+esc(u.name)+'</h1><p>'+(u.username?'@'+esc(u.username)+' · ':'')+esc(u.email)+'</p></div></div>'+
    '<p class="ac-msg" id="ac-msg" role="status" hidden></p>'+
    (u.ready?'':'<p class="ac-msg bad">The profile database is not set up yet, so username, bio and the other profile fields are switched off. Run <b>supabase-profiles.sql</b> in Supabase.</p>')+
    '<div class="ac-grid">'+
    '<section class="card ac-wide"><h2>Profile</h2><form id="f-prof" novalidate><div class="ac-two">'+
      '<label>Display name<input id="p-name" type="text" maxlength="60" value="'+esc(u.name)+'" autocomplete="name"></label>'+
      '<label>Username<input id="p-user" type="text" maxlength="20" value="'+esc(u.username)+'" autocomplete="off" autocapitalize="off" spellcheck="false"'+(u.ready&&!lockedUntil(u)?'':' disabled')+'><small id="p-ust">'+(u.owner?'As the owner you can change it whenever you like.':lockedUntil(u)?'You can change your username again on '+esc(fmt(lockedUntil(u)))+'.':'You can change it once every 10 days.')+'</small></label></div>'+
      '<label>Bio<textarea id="p-bio" maxlength="160" rows="2"'+(u.ready?'':' disabled')+'>'+esc(u.bio)+'</textarea><small>Up to 160 characters.</small></label>'+
      '<div class="ac-two"><label>Website<input id="p-web" type="text" maxlength="120" placeholder="https://" value="'+esc(u.website)+'" autocomplete="url"'+(u.ready?'':' disabled')+'></label>'+
      '<label>Location<input id="p-loc" type="text" maxlength="60" value="'+esc(u.location)+'" autocomplete="address-level2"'+(u.ready?'':' disabled')+'></label></div>'+
      '<div class="ac-two"><label>Email<input type="email" value="'+esc(u.email)+'" disabled></label>'+
      phoneField(u)+'</div>'+
      '<div class="ac-row"><button class="btn btn-solid btn-sm" type="submit">Save profile</button></div></form></section>'+
    '<section class="card"><h2>Preferences</h2>'+
      '<div class="ac-theme" role="radiogroup" aria-label="Colour theme"><b>Appearance</b><div>'+[['light','Light'],['dark','Dark'],['system','System']].map(function(o){return '<label><input type="radio" name="s-theme" value="'+o[0]+'"'+((p.theme||'light')===o[0]?' checked':'')+'><span>'+o[1]+'</span></label>'}).join('')+'</div><small>Dark and light mode. System follows your device.</small></div>'+
      '<label class="ac-sw"><input type="checkbox" id="s-motion"'+(p.reduceMotion?' checked':'')+'><i></i><span><b>Reduce motion</b><small>Turns off snow and page animations on this site.</small></span></label>'+
      '<label class="ac-sw"><input type="checkbox" id="s-big"'+(p.bigText?' checked':'')+'><i></i><span><b>Larger text</b><small>Makes the writing on every page bigger.</small></span></label>'+
      '<label class="ac-sw"><input type="checkbox" id="s-news"'+(p.updates?' checked':'')+'><i></i><span><b>Email updates</b><small>Occasional news about new work. Off by default.</small></span></label></section>'+
    '<section class="card"><h2>Account</h2><dl class="ac-dl"><dt>Signed in with</dt><dd>'+esc(u.provider==='google'?'Google':u.provider)+'</dd><dt>Member since</dt><dd>'+esc(fmt(u.created))+'</dd><dt>Last sign-in</dt><dd>'+esc(fmt(u.last))+'</dd></dl>'+
      '<div class="ac-row"><button class="btn btn-solid btn-sm" type="button" id="a-out">Log out</button><button class="btn btn-ghost btn-sm" type="button" id="a-all">Log out everywhere</button></div></section>'+
    '<section class="card" id="pts-card"><h2>Points</h2><p class="ac-note" id="pts-n">Earn points by sharing your reference code. Every point takes '+(window.SKM?SKM.usd(0.1):'a little')+' off your next order.</p>'+
      '<div class="ac-row">'+(ptsLink(u).indexOf('pts-off')>-1?'<span class="ac-note">Points are not open yet.</span>':'<a class="btn btn-solid btn-sm" href="points">Open points</a>')+'</div></section>'+
    '<section class="card"><h2>Password</h2>'+
      (u.hasPw?
      '<div class="ac-pw-last"><p class="ac-note">Last changed: <b>'+esc(u.pwAt?fmt(u.pwAt):'not recorded')+'</b></p><button class="btn btn-solid btn-sm" type="button" id="pw-open">Change password</button></div>'+
      '<form id="f-pw" novalidate hidden><label>New password<input id="n-pw1" type="password" autocomplete="new-password" placeholder="At least 8 characters"></label>'+
      '<label>Repeat new password<input id="n-pw2" type="password" autocomplete="new-password"></label>'+
      '<div class="ac-row"><button class="btn btn-solid btn-sm" type="submit">Save new password</button><button class="btn btn-ghost btn-sm" type="button" id="pw-cancel">Cancel</button></div></form>'
      :
      '<p class="ac-note">'+(u.provider==='google'?'You sign in with Google. Set a password to also log in with your email'+(u.username?', @'+esc(u.username):'')+' and password.':'Set a password to log in with your email.')+'</p>'+
      '<form id="f-pw" novalidate><label>Password<input id="n-pw1" type="password" autocomplete="new-password" placeholder="At least 8 characters"></label>'+
      '<label>Repeat password<input id="n-pw2" type="password" autocomplete="new-password"></label>'+
      '<div class="ac-row"><button class="btn btn-solid btn-sm" type="submit">Set password</button></div></form>')+'</section>'+
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
        var tel=phoneValue();if(tel==='blocked_il'){msg('Phone number not verified. Please try a different number.',true);return}if(tel===false){msg('Choose your country and enter a valid phone number.',true);return}patch.phone=tel;patch.bio=$('#p-bio').value.trim();patch.website=w;patch.location=$('#p-loc').value.trim();
      }
      saveProfile(patch).then(function(x){done(x,'Profile saved.')},function(er){msg(er.message,true)})});
    phoneUi(u,done,msg);
    var avb=$('#av-btn'),avm=$('#av-menu');
    avb.addEventListener('click',function(e){e.stopPropagation();var o=avm.hidden;avm.hidden=!o;avb.setAttribute('aria-expanded',o?'true':'false')});
    document.addEventListener('click',function(e){if(!avm.hidden&&!avm.contains(e.target)){avm.hidden=true;avb.setAttribute('aria-expanded','false')}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!avm.hidden){avm.hidden=true;avb.focus()}});
    $('#p-file').addEventListener('change',function(){var f=this.files[0];if(!f)return;
      if(!/^image\//.test(f.type)){msg('Please choose an image file.',true);return}
      var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){
        var c=document.createElement('canvas'),s=Math.min(im.width,im.height),S=256;c.width=c.height=S;
        c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,S,S);
        saveMeta({custom_avatar:c.toDataURL('image/jpeg',.85)}).then(function(x){done(x,'Photo updated.')},function(er){msg(er.message,true)})};
        im.onerror=function(){msg('That image could not be read.',true)};im.src=r.result};r.readAsDataURL(f)});
    var rs=$('#p-reset');if(rs)rs.addEventListener('click',function(){saveMeta({custom_avatar:''}).then(function(x){done(x,'Photo removed.')},function(er){msg(er.message,true)})});
    function prefs(){var th=document.querySelector('input[name=s-theme]:checked');var v={theme:th?th.value:'light',reduceMotion:$('#s-motion').checked,bigText:$('#s-big').checked,updates:$('#s-news').checked};wr(PKEY,v);applyPrefs(v);
      saveMeta({prefs:v}).then(function(){msg('Preferences saved.')},function(er){msg(er.message,true)})}
    ['#s-motion','#s-big','#s-news'].forEach(function(s){$(s).addEventListener('change',prefs)});[].forEach.call(document.querySelectorAll('input[name=s-theme]'),function(r){r.addEventListener('change',prefs)});
    var po=$('#pw-open');if(po){po.addEventListener('click',function(){$('#f-pw').hidden=false;po.hidden=true;$('#n-pw1').focus()});$('#pw-cancel').addEventListener('click',function(){$('#f-pw').hidden=true;po.hidden=false})}
    $('#f-pw').addEventListener('submit',function(e){e.preventDefault();var a=$('#n-pw1').value,b=$('#n-pw2').value;
      if(a.length<8){msg('Use at least 8 characters.',true);return}if(a!==b){msg('The two passwords do not match.',true);return}
      setPassword(a).then(function(){u.pwAt=new Date().toISOString();u.hasPw=true;page(u);msg('Password saved.')},function(er){msg(er.message,true)})});
    if($('#pts-card')&&ptsLink(u).indexOf('pts-off')<0)token().then(function(t){return t&&api('/rest/v1/rpc/points_status',{method:'POST',token:t,body:{}})}).then(function(r){if(r&&$('#pts-n'))$('#pts-n').innerHTML='You have <b>'+r.balance+'</b> usable point'+(r.balance===1?'':'s')+'. Every point takes '+(window.SKM?SKM.usd(0.1):'a little')+' off your next order.'}).catch(function(){});
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
