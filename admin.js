/* only the private admin page may run this script (an old admin.html that still exists shows nothing) */
if(!document.body||!document.body.classList.contains('adm')){document.documentElement.innerHTML='<body style="margin:0;min-height:100vh;display:grid;place-items:center;font:600 1rem system-ui,sans-serif;background:#f4f5ff;color:#1a1d3a"><p>404 &middot; This page does not exist.</p></body>';throw new Error('not the admin page')}
/* SK admin panel.
   You open it with your admin email, username and password. Your browser checks them against a one-way hash stored in
   admin-config.js (nothing is sent anywhere). The Users, Orders, Feedback and Analysis tabs need more: they only load
   when you are also logged in on the website with the admin Google account, because Supabase checks that on the server.
   - The owner is stored on the server and cannot be removed, blocked or replaced by any other admin.
   - Site edits are saved as a DRAFT in this browser. Visitors see them after you publish: download site-data.js
     from the Publish tab and upload it to the website in place of the old one. */
(function(){
'use strict';
var SK=window.SK,store=SK.store,CFG=window.SK_ADMIN;
var app=document.getElementById('app'),acts=document.getElementById('top-actions');
var ITER=600000,SESSION_MS=60*60*1000,LAST_KEY='sk-admin-last-dl';
var D=window.SK_DEFAULTS||{};
function esc(s){return SK.esc(s==null?'':s)}
function clone(x){return JSON.parse(JSON.stringify(x))}
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function uid(){return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3)}

function plainDownload(name,text,type){
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'text/javascript'}));a.download=name;
  document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
}
/* Chrome and Edge: shows a "Save as" window. With a fixed id the browser remembers the folder you chose for this
   file only, so the next publish opens there. It does not change the browser's normal download folder. */
function download(name,text,type){
  if(window.showSaveFilePicker&&window.isSecureContext){
    var acc={};acc[/\.json$/.test(name)?'application/json':'text/javascript']=[/\.json$/.test(name)?'.json':'.js'];
    return window.showSaveFilePicker({suggestedName:name,id:'sk-'+name.replace(/[^a-z0-9]/gi,'-').slice(0,26),startIn:'downloads',types:[{description:name,accept:acc}]})
      .then(function(fh){return fh.createWritable()}).then(function(w){return w.write(text).then(function(){return w.close()})})
      .then(function(){return true},function(e){if(e&&e.name==='AbortError')return false;plainDownload(name,text,type);return true});
  }
  plainDownload(name,text,type);return Promise.resolve(true);
}

/* ---------------- crypto: PBKDF2-SHA256 over email + username + password ---------------- */
var HAS_CRYPTO=!!(window.crypto&&crypto.subtle&&window.TextEncoder);
function toB64(u8){var s='';for(var i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s)}
function fromB64(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function derive(email,user,pw,salt,iter){
  var material=[email.trim().toLowerCase(),user.trim().toLowerCase(),pw].join('\u0000');
  return crypto.subtle.importKey('raw',new TextEncoder().encode(material),'PBKDF2',false,['deriveBits']).then(function(k){
    return crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:salt,iterations:iter},k,256);
  }).then(function(bits){return toB64(new Uint8Array(bits))});
}
function same(a,b){if(a.length!==b.length)return false;var r=0;for(var i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
var RK_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function normKey(k){return String(k||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function hashKey(k,salt,iter){return crypto.subtle.importKey('raw',new TextEncoder().encode('SK-RECOVERY\u0000'+normKey(k)),'PBKDF2',false,['deriveBits']).then(function(m){return crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:salt,iterations:iter},m,256)}).then(function(b){return toB64(new Uint8Array(b))})}
function newRecovery(){
  var r=crypto.getRandomValues(new Uint8Array(20)),s='',i;for(i=0;i<20;i++){s+=RK_CH[r[i]%RK_CH.length];if(i%4===3&&i<19)s+='-'}
  var salt=crypto.getRandomValues(new Uint8Array(16));
  return hashKey(s,salt,ITER).then(function(h){return {key:s,rk:{iter:ITER,salt:toB64(salt),hash:h}}});
}
function makeConfig(email,user,pw){
  var salt=crypto.getRandomValues(new Uint8Array(16)),rec;
  return newRecovery().then(function(r){rec=r;return derive(email,user,pw,salt,ITER)}).then(function(h){
    var c={v:1,alg:'PBKDF2-SHA256',iter:ITER,salt:toB64(salt),hash:h,rk:rec.rk};
    if(CFG&&CFG.mail)c.mail=CFG.mail;
    c._recovery=rec.key;return c;
  });
}
function configFile(c){
  c=Object.assign({},c);delete c._recovery;
  return '/* ADMIN LOGIN KEY. A one-way hash of your email + username + password, with a random salt.\n   Your password is not stored anywhere and cannot be read back from this. Keep this file in the website folder. */\nwindow.SK_ADMIN='+JSON.stringify(c)+';\n';
}
function strength(p){
  var s=0;if(p.length>=12)s++;if(p.length>=16)s++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;
  return Math.min(5,s);
}

/* ---------------- sign-in state ---------------- */
var ME=null; /* from Supabase: {is_owner,name,email}; stays the limited default until the server has confirmed an admin */
function loggedIn(){return SK.admin()}
function startSession(){store.put(SK.SESSION_KEY,{exp:Date.now()+SESSION_MS})}
function endSession(){store.del(SK.SESSION_KEY)}
var lastTouch=0;
function touch(){if(!loggedIn())return;var n=Date.now();if(n-lastTouch<20000)return;lastTouch=n;startSession()}
['click','keydown'].forEach(function(e){document.addEventListener(e,touch,true)});

/* ---------------- small widgets: confirm box, styled dropdowns, black verified mark ---------------- */
var VB='<svg class="vb" viewBox="0 0 24 24" role="img" aria-label="Verified"><circle cx="12" cy="12" r="11"/><path d="M7.2 12.4l3.2 3.2 6.4-6.8"/></svg>';
function ask(text,okLabel,danger){
  return new Promise(function(res){
    var b=document.createElement('div');b.className='md-back';
    b.innerHTML='<div class="md-box" role="alertdialog" aria-modal="true" aria-label="Please confirm"><p>'+esc(text)+'</p><div class="md-row"><button type="button" class="btn btn-ghost btn-sm" data-r="0">Cancel</button><button type="button" class="btn btn-sm '+(danger?'btn-danger':'btn-solid')+'" data-r="1">'+esc(okLabel||'Yes')+'</button></div></div>';
    function done(v){document.removeEventListener('keydown',key);b.remove();res(v)}
    function key(e){if(e.key==='Escape')done(false)}
    b.addEventListener('click',function(e){var r=e.target.dataset&&e.target.dataset.r;if(r!=null)done(r==='1');else if(e.target===b)done(false)});
    document.addEventListener('keydown',key);document.body.appendChild(b);$('[data-r="1"]',b).focus();
  });
}
var popEl=null;
function closePop(){if(popEl){popEl.remove();popEl=null}}
function pop(anchor,items,pick){
  closePop();
  var p=document.createElement('div');p.className='dd-pop';p.setAttribute('role','listbox');
  p.innerHTML=items.map(function(it,i){return '<button type="button" role="option" data-i="'+i+'" class="'+(it.on?'on':'')+(it.danger?' dg':'')+'">'+esc(it.t)+'</button>'}).join('');
  document.body.appendChild(p);popEl=p;
  var r=anchor.getBoundingClientRect(),h=p.offsetHeight,w=Math.max(r.width,180),top=r.bottom+6;
  if(top+h>innerHeight-8)top=Math.max(8,r.top-h-6);
  p.style.minWidth=w+'px';p.style.top=top+'px';p.style.left=Math.min(Math.max(8,r.left),Math.max(8,innerWidth-w-8))+'px';
  p.addEventListener('click',function(e){var b=e.target.closest('button[data-i]');if(!b)return;var it=items[+b.dataset.i];closePop();pick(it.v)});
}
document.addEventListener('click',closePop);window.addEventListener('scroll',closePop,true);
document.addEventListener('keydown',function(e){if(e.key==='Escape')closePop()});
/* every <select data-dd> is drawn as a styled button with its own list, so no browser menu appears */
function enhance(root){
  $$('select[data-dd]',root).forEach(function(sel){
    if(sel.dataset.on)return;sel.dataset.on='1';sel.hidden=true;
    var btn=document.createElement('button');btn.type='button';btn.className='dd-btn';btn.disabled=sel.disabled;
    btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-label',sel.getAttribute('aria-label')||'Choose');
    function label(){var o=sel.options[sel.selectedIndex];btn.innerHTML='<span>'+esc(o?o.text:'')+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'}
    label();sel.addEventListener('sk-sync',label);sel.parentNode.insertBefore(btn,sel.nextSibling);
    btn.addEventListener('click',function(e){e.stopPropagation();
      pop(btn,[].map.call(sel.options,function(o){return {v:o.value,t:o.text,on:o.value===sel.value}}),function(v){sel.value=v;label();sel.dispatchEvent(new Event('change',{bubbles:true}))})});
  });
}

/* ---------------- draft ---------------- */
var draft=null;
function loadDraft(){
  var d=store.get(SK.DRAFT_KEY);
  if(!d||typeof d!=='object')d=clone(window.SK_PUBLISHED||{});
  d.v=1;d.lists=d.lists&&typeof d.lists==='object'?d.lists:{};d.settings=d.settings&&typeof d.settings==='object'?d.settings:{};
  draft=d;save();
}
function save(){
  if(!store.put(SK.DRAFT_KEY,draft))flash('Could not save: browser storage is full or blocked.','err');
  else if(window.stReload)window.stReload();
}
function listOf(key){var L=draft.lists[key];return Array.isArray(L)?L:SK.rawList(key)}
function editList(key,fn){
  var L=draft.lists[key];if(!Array.isArray(L))L=draft.lists[key]=SK.rawList(key);
  fn(L);
  if(key==='about:a-steps')L.forEach(function(s,i){s.n=('0'+(i+1)).slice(-2)});
  save();
}
function setSetting(k,v){if(v===''||v==null)delete draft.settings[k];else draft.settings[k]=v;save()}
function nestSetting(group,k,v,keepIfTrue){
  var g=draft.settings[group]=draft.settings[group]||{};
  if(v===undefined)delete g[k];else g[k]=v;
  if(!Object.keys(g).length)delete draft.settings[group];save();
}
function snap(o){return JSON.stringify({lists:(o&&o.lists)||{},settings:(o&&o.settings)||{}})}
/* true while the saved draft differs from what visitors see and from the last file you downloaded */
function dirty(){var s=snap(draft);return s!==snap(window.SK_PUBLISHED)&&s!==store.get(LAST_KEY)}
function publish(){
  download('site-data.js','/* PUBLISHED site data. Made in the admin panel on '+new Date().toISOString().slice(0,10)+'. Replace the old site-data.js with this file. */\nwindow.SK_PUBLISHED='+JSON.stringify(draft,null,1)+';\n').then(function(ok){
    if(ok){store.put(LAST_KEY,snap(draft));flash('Saved site-data.js. Put it in your website folder in place of the old one and upload.')}
    else flash('Publish cancelled. Nothing was saved.','warn');
    renderApp();
  });
}

/* ---------------- what can be edited ---------------- */
var T=function(k,l,h){return {k:k,l:l,t:'text',h:h}};
var A=function(k,l){return {k:k,l:l,t:'area'}};
var COLS=[];
function col(page,id,label,fields,add,opt){COLS.push(Object.assign({page:page,id:id,label:label,fields:fields,add:add},opt||{}))}
col('Home','home:svc-list','Skills and services',[T('title','Name'),A('text','Short description'),{k:'icon',l:'Icon',t:'icon',page:'home'},T('link','Button link','A page (video.html), #contact or any web address'),T('label','Button text')],
  function(){return {key:'s'+uid(),title:'New skill',text:'One line about this skill.',icon:'code',link:'#contact',label:'Take a Look',added:true}},
  {note:'The number of items in this list is the number shown as "5+" across the site. Add one and every place that shows the count changes with it.'});
col('Home','home:skills-grid','Tools I reach for',[T('title','Group name'),T('note','Label (Daily, Often...)'),{k:'items',l:'Tools',t:'csv',h:'Separate with commas'},{k:'learning',l:'Mark as "learning now"',t:'bool'}],
  function(){return {title:'New group',note:'Often',items:['Tool one','Tool two']}});
col('Home','home:proj-grid','Projects (Work)',[T('title','Title'),A('text','Description'),{k:'tags',l:'Tags',t:'csv',h:'Separate with commas'},T('year','Year'),T('label','Small label'),{k:'wide',l:'Show as a wide card',t:'bool'},{k:'bg',l:'Card background (CSS, optional)',t:'raw'}],
  function(){return {title:'New project',text:'What it does, in one or two lines.',tags:['HTML','CSS'],year:String(new Date().getFullYear()),label:'example.com',bg:'linear-gradient(135deg,rgb(var(--deep)),rgb(var(--card-rgb)))'}});
col('Home','home:steps','How a project runs',[T('title','Title'),A('text','Description')],function(){return {title:'New step',text:'What happens in this step.'}});
col('Home','home:posts','Users Common Questions cards',[T('when','Small line (date, reading time)'),T('title','Title'),A('text','Text')],function(){return {when:'Nov 2026 · 3 min',title:'New card',text:'One line about it.'}});
[['graphics','Graphics page'],['video','Video page'],['code','Code page']].forEach(function(p){
  var pg=p[0],nm=p[1];
  col(nm,pg+':tools-grid','Tools',[T('name','Name'),T('level','Level (Daily, Often, Learning)'),{k:'v',l:'Skill level 0 to 100',t:'num'},A('text','What it is used for')],function(){return {name:'New tool',level:'Often',v:60,text:'What it is used for.'}});
  col(nm,pg+':svc-grid','Services',[{k:'icon',l:'Icon',t:'icon',page:pg},T('title','Name'),A('text','Description')],function(){return {icon:((D._icons||{})[pg]||['page'])[0],title:'New service',text:'One line about it.'}});
  col(nm,pg+':works','Samples',[T('title','Title'),T('kind','Small line (size, format)'),T('type','Group','Used by the filter tabs, e.g. logos, posters'),{k:'art',l:'Picture (SVG shapes, advanced)',t:'raw'}],
    function(){return {type:'',title:'New sample',kind:'Sample',art:'<rect class="a-bg" width="200" height="150"/><text class="a-ti" x="14" y="82" font-size="22">New sample</text>'}},{types:true});
  col(nm,pg+':steps','Process steps',[T('title','Title'),A('text','Description')],function(){return {title:'New step',text:'What happens in this step.'}});
});
col('About page','about:a-skills','Skill cards',[T('title','Name'),A('text','Description'),T('href','Link (page address, optional)')],function(){return {title:'New skill',text:'One line about this skill.',href:''}},{note:'Skills you add on the Home page appear here automatically.'});
col('About page','about:a-habits','Habit cards',[T('title','Title'),A('text','Description')],function(){return {title:'New habit',text:'One line about it.'}});
col('About page','about:a-steps','Timeline',[T('title','Title'),A('text','Description')],function(){return {n:'00',title:'New',text:'What happened.'}});

var TEXTS=[['lead','Intro paragraph (home)','area'],['badge','Experience badge (home)','text'],['statsTitle','Abilities title','text'],['statYearsValue','Stat 2 number','text'],['statYearsLabel','Stat 2 label','text'],['statGradeValue','Stat 3 number','text'],['statGradeLabel','Stat 3 label','text']];
var PAGES=[['about','About page','about.html'],['video','Video page','video.html'],['graphics','Graphics page','graphics.html'],['code','Code page','code.html'],['login','Login and sign-up page','login.html']];
var SECTIONS=[['stats','Abilities numbers'],['services','Services (skills list)'],['about','About card'],['skills','Tools I reach for'],['wyg','Fast to load / tidy hand-over'],['work','Projects (Work)'],['process','How a project runs'],['journal','Users Common Questions'],['contact','Feedback']];

/* ---------------- UI state ---------------- */
var ui={tab:'overview',col:'home:svc-list',edit:null,msg:null,pv:null,dev:'desktop'};
function flash(text,kind){ui.msg={text:text,kind:kind||'ok'};}
function msgHtml(){var m=ui.msg;ui.msg=null;return m?'<p class="ad-msg '+m.kind+'" role="status">'+esc(m.text)+'</p>':''}
function rerender(){if(app.dataset.view==='app')renderApp()}


/* ---------------- views ---------------- */
function uApi(fn,body){var S=window.skUser;if(!S)return Promise.reject({status:0,message:'nosupabase'});
  return S.token().then(function(t){if(!t)throw {status:401,message:'noauth'};return S.api('/rest/v1/rpc/'+fn,{method:'POST',token:t,body:body||{}})})}
function gate(){document.body.dataset.v='gate'}
function view(){
  acts.innerHTML='';gate();
  if(!HAS_CRYPTO){app.dataset.view='nocrypto';app.innerHTML='<div class="ad-card ad-narrow"><h1>Secure context needed</h1><p>The admin login needs your browser\'s crypto tools, which only work on https:// addresses, localhost or a file opened directly. Open this page from your https site or from the downloaded folder.</p></div>';return}
  if(!CFG||!CFG.hash){setupView();return}
  if(!loggedIn()){loginView();return}
  if(!draft)loadDraft();
  ME=ME||{is_owner:false,name:'Admin',email:null,limited:true};
  app.dataset.view='app';document.body.dataset.v='app';renderApp();
  uApi('admin_whoami').then(function(me){ME=me;renderApp()},function(){});
}

function setupView(){app.dataset.view='setup';setupForm(app,false)}
function formHtml(isChange){
  return '<div class="ad-card ad-narrow"><h1>'+(isChange?'Change admin login':'SETUP')+'</h1>'+
   '<p>'+(isChange?'Enter the new details. You will get a new <b>admin-config.js</b> to replace the one in your website folder. Until you replace it, the old login keeps working.':'Choose the email, username and password for your admin account. Your browser turns them into a one-way key. <b>Nothing is sent anywhere and your password is never stored.</b>')+'</p>'+
   '<form class="ad-form" id="setup-form" novalidate autocomplete="off">'+
   '<label class="f">Email<input type="email" id="s-email" autocomplete="off" required></label>'+
   '<label class="f">Username<input type="text" id="s-user" autocomplete="off" required></label>'+
   '<label class="f">Password <small>at least 12 characters; a long sentence is best</small><input type="password" id="s-pw" autocomplete="new-password" required></label>'+
   '<div class="ad-strength" aria-hidden="true"><i id="s-bar"></i></div>'+
   '<label class="f">Repeat password<input type="password" id="s-pw2" autocomplete="new-password" required></label>'+
   '<p class="ad-msg err" id="s-err" role="alert" hidden></p>'+
   '<button class="ad-black" type="submit" id="s-go"><span>Create my admin key</span></button></form>'+
   '<p class="ad-muted" style="font-size:.84rem">If you forget the password it cannot be recovered. Put the original admin-config.js (the one that says <code>window.SK_ADMIN=null</code>) back to start again.</p></div>';
}
/* the form that makes a new admin-config.js; used for first-time setup and for changing the login later */
function setupForm(host,isChange){
  if(ui.setup){host.innerHTML=resultHtml(ui.setup);return}
  host.innerHTML=formHtml(isChange);
  var f=$('#setup-form',host),pw=$('#s-pw',host),bar=$('#s-bar',host);
  pw.addEventListener('input',function(){var n=strength(pw.value);bar.style.width=(n*20)+'%';bar.style.background=n<3?'#ff7a7a':n<4?'#ffc857':'#5ae696'});
  f.addEventListener('submit',function(e){
    e.preventDefault();var err=$('#s-err',host);err.hidden=true;
    var em=$('#s-email',host).value.trim(),us=$('#s-user',host).value.trim(),p=pw.value,p2=$('#s-pw2',host).value;
    function bad(t){err.textContent=t;err.hidden=false}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))return bad('Enter a valid email address.');
    if(us.length<3)return bad('Username must be at least 3 characters.');
    if(p.length<12)return bad('Password must be at least 12 characters.');
    if(p!==p2)return bad('The two passwords do not match.');
    var go=$('#s-go',host);go.disabled=true;go.firstChild.textContent='Creating key…';
    makeConfig(em,us,p).then(function(c){ui.setup={text:configFile(c),recovery:c._recovery};if(isChange)renderApp();else setupForm(host,false)},function(){go.disabled=false;go.firstChild.textContent='Create my admin key';bad('Something went wrong. Please try again.')});
  });
}
function resultHtml(r){
  return '<div class="ad-card ad-narrow"><h1>Your admin key is ready</h1><p class="ad-msg ok">Created in your browser. Your password was not saved or sent anywhere.</p>'+
   (r.recovery?'<div class="ad-recov"><span>Your recovery key. Shown once. Write it down and keep it safe.</span><b>'+esc(r.recovery)+'</b></div>':'')+'<ol class="ad-steps"><li>Download <b>admin-config.js</b> below.</li><li>Put it in your website folder, replacing the existing <b>admin-config.js</b>.</li><li>Upload the folder to your host, then open this page again and log in.</li></ol>'+
   '<div class="ad-top" style="margin:0"><button class="btn btn-solid" type="button" data-act="dl-config">Download admin-config.js</button><button class="btn btn-ghost" type="button" data-act="copy-config">Copy text</button></div>'+
   '<div class="ad-code" id="cfg-text">'+esc(r.text)+'</div>'+
   '<p class="ad-muted" style="font-size:.84rem">Keep your password somewhere safe. It cannot be recovered from this key.</p>'+
   '<button class="btn btn-ghost btn-sm" type="button" data-act="setup-done">Done</button></div>';
}

function loginView(){
  app.dataset.view='login';
  app.innerHTML='<div class="ad-card ad-narrow"><h1>LOGIN</h1><p>Enter the email, username and password.</p>'+
   '<form class="ad-form" id="login-form" method="post" action="#" novalidate>'+
   '<label class="f">Email<input type="email" id="a-email" name="email" autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false"></label>'+
   '<label class="f">Username<input type="text" id="a-user" name="username" autocomplete="off" autocapitalize="off" spellcheck="false"></label>'+
   '<label class="f">Password<input type="password" id="a-pw" name="password" autocomplete="current-password"></label>'+
   '<p class="ad-msg err" id="a-err" role="alert" hidden></p>'+
   '<button class="ad-black" type="submit" id="a-go"><span>Log in</span></button><p class="ad-forgot"><a href="#" id="forgot">Recover details</a></p></form>'+
   '</div>';
  var f=$('#login-form'),err=$('#a-err');
  $('#forgot').addEventListener('click',function(e){e.preventDefault();forgotView()});
  function bad(t){err.textContent=t;err.hidden=false}
  f.addEventListener('submit',function(e){
    e.preventDefault();err.hidden=true;
    var em=$('#a-email').value,us=$('#a-user').value,pw=$('#a-pw').value;
    if(!em.trim()||!us.trim()||!pw)return bad('Please fill in email, username and password.');
    var go=$('#a-go');go.disabled=true;go.lastChild.textContent='Checking…';
    derive(em,us,pw,fromB64(CFG.salt),CFG.iter||ITER).then(function(h){
      if(same(h,CFG.hash)){startSession();draft=null;view();return}
      go.disabled=false;go.lastChild.textContent='Log in';
      bad('Those details do not match.');
    },function(){go.disabled=false;go.lastChild.textContent='Log in';bad('Something went wrong. Please try again.')});
  });
}


/* ---------------- forgot password: recovery key first, then a code sent to your email ---------------- */
function forgotView(){
  app.dataset.view='forgot';document.body.dataset.v='gate';
  var st={key:false,sent:null,tries:0};
  function card(inner){app.innerHTML='<div class="ad-card ad-narrow"><h1>RESET</h1>'+inner+'<p class="ad-forgot"><a href="#" id="fg-back">Back to login</a></p></div>';$('#fg-back').addEventListener('click',function(e){e.preventDefault();loginView()})}
  function msg(t,k){var m=$('#fg-msg');if(m){m.textContent=t;m.className='ad-msg '+(k||'err');m.hidden=false}}
  function stepKey(){
    if(!CFG.rk){card('<p>No recovery key exists yet, so the password cannot be reset from here. Log in and create one under <b>Security</b> (it is also made automatically for any new login).</p>');return}
    card('<p>Step 1 of 3. Enter your recovery key.</p><form class="ad-form" id="fg-f" novalidate><label class="f">Recovery key<input type="text" id="fg-k" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"></label><p class="ad-msg err" id="fg-msg" hidden></p><button class="ad-black" type="submit"><span>Check key</span></button></form>');
    $('#fg-f').addEventListener('submit',function(e){e.preventDefault();var v=$('#fg-k').value;if(normKey(v).length!==20)return msg('Enter the full recovery key (20 letters and numbers).');
      hashKey(v,fromB64(CFG.rk.salt),CFG.rk.iter||ITER).then(function(h){if(same(h,CFG.rk.hash)){st.key=true;stepSend()}else msg('That recovery key is not correct.')},function(){msg('Something went wrong. Please try again.')})});
  }
  function stepSend(){
    var m=CFG.mail;
    if(!m||!m.service||!m.template||!m.key){card('<p>Recovery key accepted. Step 2 of 3 needs email sending, which is not set up yet. Log in once and add it under <b>Security</b>, or ask the site builder. Without the email code the reset stays locked.</p>');return}
    card('<p>Recovery key accepted. Step 2 of 3: we will email a 6-digit code to your registered address.</p><form class="ad-form" id="fg-f" novalidate><p class="ad-msg err" id="fg-msg" hidden></p><button class="ad-black" type="submit"><span>Send code to my email</span></button></form>');
    $('#fg-f').addEventListener('submit',function(e){e.preventDefault();var b=$('#fg-f button');b.disabled=true;b.firstChild.textContent='Sending…';
      var n=crypto.getRandomValues(new Uint32Array(1))[0]%900000+100000,nonce=toB64(crypto.getRandomValues(new Uint8Array(12))),code=String(n);
      crypto.subtle.digest('SHA-256',new TextEncoder().encode(code+nonce)).then(function(d){st.sent={h:toB64(new Uint8Array(d)),nonce:nonce,exp:Date.now()+10*60*1000};
        return fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:m.service,template_id:m.template,user_id:m.key,template_params:{code:code,minutes:10,site:'SK admin'}})})}).then(function(r){
        if(!r.ok)throw new Error('send');stepCode()},function(){st.sent=null;b.disabled=false;b.firstChild.textContent='Send code to my email';msg('The email could not be sent. Check the email settings under Security, then try again.')});
    });
  }
  function stepCode(){
    card('<p>Step 3 of 3. We sent a code to your email. It works for 10 minutes. Enter it below.</p><form class="ad-form" id="fg-f" novalidate><label class="f">6-digit code<input type="text" id="fg-c" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label><p class="ad-msg err" id="fg-msg" hidden></p><button class="ad-black" type="submit"><span>Verify code</span></button></form>');
    $('#fg-f').addEventListener('submit',function(e){e.preventDefault();var c=$('#fg-c').value.trim();
      if(!/^\d{6}$/.test(c))return msg('Enter the 6-digit code.');
      if(!st.sent||Date.now()>st.sent.exp)return msg('The code has expired. Go back and start again.');
      if(++st.tries>5){st.sent=null;return msg('Too many wrong codes. Start again.')}
      crypto.subtle.digest('SHA-256',new TextEncoder().encode(c+st.sent.nonce)).then(function(d){
        if(!same(toB64(new Uint8Array(d)),st.sent.h))return msg('That code is not correct.');
        if(!st.key)return;app.dataset.view='setup';document.body.dataset.v='gate';ui.setup=null;setupForm(app,false);
      });
    });
  }
  stepKey();
}


/* ---------------- logged-in app ---------------- */
var NAVI={"analysis": "<path d=\"M4 20V10M10 20V4M16 20v-8M22 20H2\"/>", "feedback": "<path d=\"M4 4h16v12H8l-4 4z\"/>", "orders": "<path d=\"M6 3h12l2 5v12H4V8z\"/><path d=\"M4 8h16M9 12h6\"/>", "users": "<circle cx=\"9\" cy=\"8\" r=\"3.2\"/><path d=\"M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6\"/><circle cx=\"17\" cy=\"9\" r=\"2.6\"/><path d=\"M16 14.2c3 .1 5 2 5 5.3\"/>", "overview": "<path d=\"M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z\"/>", "content": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"6\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"18\" height=\"6\" rx=\"1\"/>", "pages": "<path d=\"M6 3h8l4 4v14H6z\"/><path d=\"M14 3v4h4\"/>", "settings": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2\"/>", "publish": "<path d=\"M12 16V4M7 9l5-5 5 5M4 20h16\"/>", "security": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"9\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 018 0v3\"/>", "admins": "<path d=\"M12 3l8 3v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z\"/><path d=\"M8.6 12.2l2.4 2.4 4.4-4.8\"/>"};

/* ---------------- users (needs Supabase + supabase-admin.sql and supabase-owner.sql) ---------------- */
var U={state:'idle',list:[],q:'',open:null,err:'',who:'all',st:'all',sort:'new'};
function sortSel(id,cur,opts,label){return '<select id="'+id+'" data-dd aria-label="'+label+'">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(cur===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select>'}
function cmpDate(k,dir){return function(a,b){var x=new Date(a[k]||0).getTime(),y=new Date(b[k]||0).getTime();return dir==='old'?x-y:y-x}}
function loadUsers(){
  U.state='loading';renderApp();
  var done=false,timer=setTimeout(function(){if(done)return;done=true;U.state='error';U.err='The server did not answer. Run supabase-owner.sql, then refresh this page (Ctrl+Shift+R).';renderApp()},12000);
  uApi('admin_list_users').then(function(r){if(done)return;done=true;clearTimeout(timer);U.list=r||[];U.state='ready';renderApp()},function(e){
    if(done)return;done=true;clearTimeout(timer);
    U.state=e.message==='noauth'?'noauth':(e.status===404?'nosql':(e.status===401||e.status===403||/not allowed/i.test(e.message)?'notadmin':'error'));U.err=(e.message||'')+(e.status?' ('+e.status+')':'');renderApp()});
}
function loadUsersQuiet(){return uApi('admin_list_users').then(function(r){U.list=r||[];U.state='ready';renderApp()})}
setInterval(function(){if((ui.tab==='users'||ui.tab==='admins')&&U.state==='ready'&&!document.hidden&&!(document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName)))loadUsersQuiet().catch(function(){})},30000);
function uWhen(d){try{return d?new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Never'}catch(e){return ''}}
function uAgo(d){
  if(!d)return 'never';var s=Math.max(0,(Date.now()-new Date(d).getTime())/1000);
  if(s<60)return 'just now';var m=Math.floor(s/60);if(m<60)return m+' min'+(m>1?'s':'')+' ago';
  var h=Math.floor(m/60);if(h<24)return h+' hr'+(h>1?'s':'')+' ago';var dd=Math.floor(h/24);return dd+' day'+(dd>1?'s':'')+' ago';
}
function isOnline(x){return !!(x.last_seen&&Date.now()-new Date(x.last_seen).getTime()<150000)}
function uStatus(x){
  if(x.blocked)return '<em class="chip danger">Blocked</em>';
  if(isOnline(x))return '<em class="chip ok">Online</em>';
  return '<em class="chip">Offline</em><small class="u-ago">'+esc(uAgo(x.last_seen||x.last_sign_in_at))+'</small>';
}
function nameOf(x){return x.display_name||(x.email||'').split('@')[0]||'User'}
function badges(x){return (x.is_owner?' '+VB+'<em class="chip dark">Owner</em>':x.is_admin?' '+VB+'<em class="chip dark">Admin</em>':'')}
function uRows(){
  var q=U.q.trim().toLowerCase();
  var L=U.list.filter(function(x){return (!q||[x.email,x.username,x.display_name,x.phone].join(' ').toLowerCase().indexOf(q)>-1)&&(U.who==='all'||(U.who==='admins'?x.is_admin:!x.is_admin))&&(U.st==='all'||(U.st==='online'?isOnline(x):U.st==='offline'?!isOnline(x):U.st==='blocked'?x.blocked:!x.blocked))});
  var nm=function(x){return nameOf(x).toLowerCase()};
  L=L.slice().sort(U.sort==='old'?cmpDate('created_at','old'):U.sort==='az'?function(a,b){return nm(a)<nm(b)?-1:nm(a)>nm(b)?1:0}:U.sort==='za'?function(a,b){return nm(a)<nm(b)?1:nm(a)>nm(b)?-1:0}:U.sort==='seen'?function(a,b){return new Date(b.last_seen||b.last_sign_in_at||0)-new Date(a.last_seen||a.last_sign_in_at||0)}:cmpDate('created_at','new'));
  if(!L.length)return '<tr><td colspan="6" class="ad-muted">No users match.</td></tr>';
  return L.map(function(x){
    var n=nameOf(x),open=U.open===x.id,fixed=x.is_owner||(x.is_admin&&!ME.is_owner);
    return '<tr><td><b class="u-name">'+esc(n)+badges(x)+'</b><span>'+(x.username?'@'+esc(x.username):'No username yet')+'</span></td><td>'+esc(x.email)+'</td><td>'+esc(uWhen(x.created_at))+'</td>'+
      '<td class="u-st">'+uStatus(x)+'</td>'+
      '<td><select class="u-role" data-dd data-id="'+esc(x.id)+'" aria-label="Access for '+esc(n)+'"'+(x.is_admin?' disabled':'')+'>'+['member','trusted','editor'].map(function(r){return '<option value="'+r+'"'+(x.role===r?' selected':'')+'>'+r.charAt(0).toUpperCase()+r.slice(1)+'</option>'}).join('')+'</select></td>'+
      '<td class="u-act"><button class="ad-link" type="button" data-act="u-open" data-id="'+esc(x.id)+'">'+(open?'Hide':'Details')+'</button>'+(fixed?'':'<button class="ad-link'+(x.blocked?'':' u-danger')+'" type="button" data-act="u-block" data-id="'+esc(x.id)+'" data-flag="'+(x.blocked?'0':'1')+'">'+(x.blocked?'Unblock':'Block')+'</button>')+'</td></tr>'+
      (open?'<tr class="u-det"><td colspan="6"><dl><dt>Phone</dt><dd>'+esc(x.phone||'Not given')+'</dd><dt>Location</dt><dd>'+esc(x.location||'Not given')+'</dd><dt>Website</dt><dd>'+esc(x.website||'Not given')+'</dd><dt>Bio</dt><dd>'+esc(x.bio||'Not given')+'</dd><dt>Signed in with</dt><dd>'+esc(x.provider||'')+'</dd><dt>Last seen</dt><dd>'+esc(uAgo(x.last_seen||x.last_sign_in_at))+'</dd><dt>Last sign-in</dt><dd>'+esc(uWhen(x.last_sign_in_at))+'</dd><dt>User ID</dt><dd>'+esc(x.id)+'</dd></dl>'+
        (ME.is_owner&&!x.is_owner?'<button class="ad-link" type="button" data-act="u-admin" data-id="'+esc(x.id)+'" data-flag="'+(x.is_admin?'0':'1')+'">'+(x.is_admin?'Remove admin rights':'Make admin')+'</button>':'')+'</td></tr>':'');
  }).join('');
}
function connectCard(h){
  return h+'<div class="ad-card ad-narrow"><h2>Connect your data</h2><p>Users, Orders, Feedback and Analysis are read from the server, which only accepts your owner account. Log in with its email and password (set the password once on your Profile page). No Google needed.</p>'+
   '<form class="ad-form" id="connect-form" novalidate><label class="f">Email<input type="email" id="c-email" autocomplete="username" autocapitalize="off" spellcheck="false"></label>'+
   '<label class="f">Password<input type="password" id="c-pw" autocomplete="current-password"></label>'+
   '<p class="ad-msg err" id="c-err" role="alert" hidden></p><button class="ad-black" type="submit" id="c-go"><span>Connect</span></button></form></div>';
}
function connect(form){
  var err=$('#c-err',form),em=$('#c-email',form).value.trim(),pw=$('#c-pw',form).value,go=$('#c-go',form),C=window.SK_CFG||{};
  function bad(t){err.textContent=t;err.hidden=false}
  err.hidden=true;if(!em||!pw)return bad('Enter your email and password.');
  go.disabled=true;go.lastChild.textContent='Connecting…';
  fetch((C.url||'').replace(/\/+$/,'')+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:C.anon,'Content-Type':'application/json'},body:JSON.stringify({email:em,password:pw})}).then(function(r){return r.json().then(function(j){return [r,j]})}).then(function(a){
    var r=a[0],j=a[1];
    if(!r.ok||!j.access_token){go.disabled=false;go.lastChild.textContent='Connect';bad(/banned|blocked/i.test(j&&(j.msg||j.error_description)||'')?'This account is blocked.':'Wrong email or password. If you only ever used Google, set a password on your Profile page first.');return}
    try{localStorage.setItem('sk_sess',JSON.stringify({access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000,provider:'email'}))}catch(e){}
    U.state='idle';A.state='idle';O.state='idle';F.state='idle';ME=null;
    if(window.skUser&&window.skUser.get)window.skUser.get(true);
    uApi('admin_whoami').then(function(me){ME=me;renderApp()},function(){renderApp()});renderApp();
  },function(){go.disabled=false;go.lastChild.textContent='Connect';bad('Cannot reach the server. Check your connection.')});
}
function stateCard(h,state,err,what,retry){
  what=what||'This page';
  var msgs={nosql:what+' is not installed yet. Run supabase-admin.sql and supabase-owner.sql in the Supabase SQL Editor.',notadmin:'This account is not an admin.',error:'Could not load '+what.toLowerCase()+'. '+esc(err),loading:'Loading…',idle:'Loading…'};
  if(state==='noauth')return connectCard(h);
  var wait=state==='loading'||state==='idle';
  return h+'<div class="ad-card">'+(wait?'<p class="ad-muted">Loading…</p>':'<p class="ad-msg warn">'+msgs[state]+'</p><div class="ad-btns"><button class="btn btn-solid btn-sm" type="button" data-act="'+retry+'">Try again</button></div>')+'</div>';
}
function tabUsers(){
  var h='<div class="ad-head"><div><h1>Users</h1><p class="ad-muted">People who signed up on your website. Block someone to stop them logging in, or change what they can access.</p></div></div>';
  if(U.state==='idle'){loadUsers();return stateCard(h,'loading')}
  if(U.state!=='ready')return stateCard(h,U.state,U.err,'The user list','u-refresh');
  var tot=U.list.length,bl=U.list.filter(function(x){return x.blocked}).length,on=U.list.filter(isOnline).length,ad=U.list.filter(function(x){return x.is_admin}).length;
  return h+'<div class="ad-kpis">'+[['Total users',tot],['Online now',on],['Blocked',bl],['Admins',ad]].map(function(k){return '<div class="ad-kpi"><div><span>'+k[0]+'</span><b>'+k[1]+'</b></div></div>'}).join('')+'</div>'+
    '<div class="ad-card"><div class="seg" role="tablist" aria-label="Who">'+[['all','All',tot],['users','Users',tot-ad],['admins','Admins',ad]].map(function(s){return '<button type="button" role="tab" data-act="u-who" data-v="'+s[0]+'"'+(U.who===s[0]?' aria-current="true"':'')+'>'+s[1]+'<i>'+s[2]+'</i></button>'}).join('')+'</div>'+
    '<div class="u-bar"><input id="u-q" type="text" placeholder="Search by name, username, email or phone" value="'+esc(U.q)+'" aria-label="Search users">'+
      sortSel('u-st',U.st,[['all','Any status'],['online','Online'],['offline','Offline'],['blocked','Blocked'],['active','Not blocked']],'Filter by status')+
      sortSel('u-sort',U.sort,[['new','Newest first'],['old','Oldest first'],['az','Name A to Z'],['za','Name Z to A'],['seen','Last seen']],'Sort users')+
      '<button class="btn btn-solid btn-sm" type="button" data-act="u-refresh">Refresh</button></div>'+
    '<div class="ad-tablewrap"><table class="ad-table u-table"><thead><tr><th>User</th><th>Email</th><th>Joined</th><th>Status</th><th>Access</th><th></th></tr></thead><tbody id="u-body">'+uRows()+'</tbody></table></div>'+
    '<p class="ad-muted note">Access: <b>Member</b> is a normal account. <b>Trusted</b> and <b>Editor</b> are extra levels you can use to unlock members-only parts of the site. Blocking takes effect at once for logging in.</p></div>';
}
function uAct(p,ok){return p.then(function(){flash(ok);return loadUsersQuiet()},function(e){flash(e.message||'Something went wrong.','err');renderApp()})}

/* ---------------- analysis + orders (need the extra part of supabase-admin.sql) ---------------- */
var A={days:30,state:'idle',d:null,err:''},O={state:'idle',list:[],err:'',sort:'new',st:'all'};
function pct(c,p){if(!p)return c?'<span class="an-up">&#9650; new</span>':'<span class="an-flat">-</span>';var v=Math.round((c-p)/p*100);return '<span class="'+(v>=0?'an-up':'an-down')+'">'+(v>=0?'&#9650; ':'&#9660; ')+Math.abs(v)+'%</span>'}
function dur(s){s=Math.round(s||0);var m=Math.floor(s/60);return m+'M '+('0'+(s%60)).slice(-2)+'S'}
function loadAnalysis(){A.state='loading';renderApp();A.v=null;uApi('admin_visits',{p_days:A.days}).then(function(v){A.v=v;if(A.state==='ready')renderApp()},function(){A.v=false;if(A.state==='ready')renderApp()});uApi('admin_analytics',{p_days:A.days}).then(function(r){A.d=r;A.state='ready';renderApp()},function(e){A.state=(e.status===404?'nosql':'error');A.err=e.message||'';renderApp()})}
function chart(daily,ser){
  if(!daily||!daily.length)return '<p class="ad-muted ad-empty">No visits in this period yet.</p>';
  ser=ser||[{k:'sessions',l:'Sessions'}];
  var W=640,H=220,P=34,n=daily.length,mx=Math.max.apply(null,[4].concat(daily.map(function(x){return Math.max.apply(null,ser.map(function(q){return x[q.k]||0}))})));mx=Math.ceil(mx/4)*4;
  function X(i){return P+(n<2?0:i*(W-P-8)/(n-1))}function Y(v){return H-24-v*(H-44)/mx}
  var g='',paths='';
  for(var k=0;k<=4;k++){var v=mx/4*k;g+='<line x1="'+P+'" x2="'+W+'" y1="'+Y(v)+'" y2="'+Y(v)+'" class="an-grid"/><text x="'+(P-6)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+Math.round(v)+'</text>'}
  ser.forEach(function(q,j){var line='M'+daily.map(function(x,i){return X(i)+','+Y(x[q.k]||0)}).join(' L');
    if(j===0)paths+='<path d="'+line+' L'+X(n-1)+','+(H-24)+' L'+X(0)+','+(H-24)+' Z" class="an-area"/>';
    paths+='<path pathLength="1" d="'+line+'" class="an-line'+(j?' an-line2':'')+'"/>'});
  var lab=[0,Math.floor((n-1)/2),n-1].filter(function(v,i,a){return a.indexOf(v)===i&&daily[v]}).map(function(i){return '<text x="'+X(i)+'" y="'+(H-6)+'" text-anchor="middle">'+daily[i].day.slice(5)+'</text>'}).join('');
  var tips=daily.map(function(x,i){var dt=new Date(x.day+'T00:00:00');
    return {x:X(i),y:ser.map(function(q){return Y(x[q.k]||0)}),
      h:'<b>'+esc(dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}))+'</b>'+ser.map(function(q,j){return '<span><i class="d'+j+'"></i>'+esc(q.l)+'<em>'+(x[q.k]||0)+'</em></span>'}).join('')}});
  var dots=ser.map(function(q,j){return '<circle class="an-dot an-dot'+j+'" visibility="hidden" r="4.5" cx="-9" cy="-9"/>'}).join('');
  var legend=ser.length>1?'<p class="an-leg">'+ser.map(function(q,j){return '<span><i class="d'+j+'"></i>'+esc(q.l)+'</span>'}).join('')+'</p>':'';
  return '<div class="an-cw" data-w="'+W+'" data-h="'+H+'" data-tip="'+esc(JSON.stringify(tips))+'"><svg class="an-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(ser.map(function(q){return q.l}).join(' and '))+' over time">'+g+paths+lab+'<line class="an-guide" visibility="hidden" x1="-9" x2="-9" y1="10" y2="'+(H-24)+'"/>'+dots+'</svg><div class="an-tip" hidden></div></div>'+legend;
}
/* hover details on charts (works with mouse and touch) */
(function(){
  function hide(){var a=document.querySelectorAll('.an-cw');for(var i=0;i<a.length;i++){var t=a[i].querySelector('.an-tip');if(t)t.hidden=true;var gl=a[i].querySelector('.an-guide');if(gl)gl.setAttribute('visibility','hidden');var d=a[i].querySelectorAll('.an-dot');for(var j=0;j<d.length;j++)d[j].setAttribute('visibility','hidden')}}
  function move(e){
    var cw=e.target.closest&&e.target.closest('.an-cw');if(!cw){hide();return}
    var tips;try{tips=cw._tips||(cw._tips=JSON.parse(cw.dataset.tip))}catch(x){return}
    var svg=cw.querySelector('svg'),r=svg.getBoundingClientRect(),c=cw.getBoundingClientRect(),W=+cw.dataset.w,H=+cw.dataset.h,sc=Math.min(r.width/W,r.height/H),off=(r.width-W*sc)/2,vx=(e.clientX-r.left-off)/sc,bi=0,bd=1e9;
    tips.forEach(function(t,i){var dd=Math.abs(t.x-vx);if(dd<bd){bd=dd;bi=i}});
    var t=tips[bi],gl=cw.querySelector('.an-guide');gl.setAttribute('x1',t.x);gl.setAttribute('x2',t.x);gl.setAttribute('visibility','visible');
    var d=cw.querySelectorAll('.an-dot');for(var j=0;j<d.length;j++){d[j].setAttribute('visibility','visible');d[j].setAttribute('cx',t.x);d[j].setAttribute('cy',t.y[j])}
    var tp=cw.querySelector('.an-tip');tp.innerHTML=t.h;tp.hidden=false;
    var left=r.left-c.left+off+t.x*sc,w=tp.offsetWidth;left=Math.max(w/2+4,Math.min(c.width-w/2-4,left));tp.style.left=left+'px';tp.style.top='8px';
  }
  document.addEventListener('pointermove',move);document.addEventListener('pointerdown',move);
  document.addEventListener('pointerleave',hide);window.addEventListener('scroll',hide,true);
})();
/* every visit to the website, signed up or not (counted by track.js; no personal data) */
function visitsCard(){
  var head='<div class="ad-card"><h2>Website visits</h2><p class="ad-muted">Everyone who opens your website counts, even without an account. A visit is one page opened. A visitor is one browser, counted once.</p>';
  var v=A.v;
  if(v===null||v===undefined)return head+'<p class="ad-muted">Loading…</p></div>';
  if(v===false)return head+'<p class="ad-msg warn">The daily table is not installed yet. Run supabase-visits.sql once in the Supabase SQL Editor, then refresh.</p></div>';
  var dl=v.days||[],yest=dl[1]?dl[1].views:0,hp=function(c,p){return p===undefined||p===null?'':pct(c,p)};
  var cards=[['Visits today',v.today,dl[1]?pct(v.today,yest):''],['Visitors',v.visitors,hp(v.visitors,v.prev_visitors)],['Sessions',v.sessions,hp(v.sessions,v.prev_sessions)],['Total visits',v.views,hp(v.views,v.prev_views)]];
  var rows=dl.map(function(x,i){if(!x.views&&!x.visitors&&!x.sessions)return '';var pv=dl[i+1],ch=function(c,k){return pv?' '+pct(c,pv[k]):''};var dt=new Date(x.day+'T00:00:00');return '<tr><td>'+esc(dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}))+'</td><td>'+x.views+ch(x.views,'views')+'</td><td>'+x.visitors+ch(x.visitors,'visitors')+'</td><td>'+x.sessions+ch(x.sessions,'sessions')+'</td></tr>'}).join('')||'<tr><td colspan="4" class="ad-muted">No visits yet.</td></tr>';
  return head+'<div class="an-stats">'+cards.map(function(c,i){return '<div class="an-stat an-'+'abc'[i%3]+'"><span>'+c[0]+'</span><b>'+c[1]+'</b>'+c[2]+'</div>'}).join('')+'</div>'+
    '<h3 class="an-sub">Day by day</h3><div class="ad-tablewrap an-scroll"><table class="ad-table"><thead><tr><th>Date</th><th>Visits</th><th>Visitors</th><th>Sessions</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<h3 class="an-sub">Visits and visitors over time</h3>'+chart(dl.slice().reverse(),[{k:'views',l:'Visits'},{k:'visitors',l:'Visitors'}])+'</div>';
}
function tabAnalysis(){
  var h='<div class="ad-head"><h1>Analysis</h1><p class="ad-muted">Visits and time spent on your website.</p></div>';
  if(A.state==='idle'){loadAnalysis();return h+'<div class="ad-card"><p class="ad-muted">Loading…</p></div>'}
  if(A.state==='loading')return h+'<div class="ad-card"><p class="ad-muted">Loading…</p></div>';
  if(A.state==='error'&&A.err==='noauth')return connectCard(h);
  if(A.state!=='ready')return h+'<div class="ad-card"><p class="ad-msg warn">'+(A.state==='nosql'?'Analytics is not installed yet. Run supabase-admin.sql again in the Supabase SQL Editor.':(A.err==='noauth'?'Log in on the website with your admin Google account first, then try again.':'Could not load analytics. '+esc(A.err)))+'</p><div class="ad-btns" style="justify-content:flex-start"><button class="btn btn-solid btn-sm" type="button" data-act="a-refresh">Try again</button></div></div>';
  var d=A.d,cards=[['Total Site Sessions',d.sessions,pct(d.sessions,d.prev_sessions),'a'],['Unique Visitors',d.visitors,pct(d.visitors,d.prev_visitors),'b'],['Average Session Duration',dur(d.avg_seconds),pct(d.avg_seconds,d.prev_avg_seconds),'c']];
  var pages=(d.pages||[]).map(function(p){return '<tr><td>'+esc(p.page)+'</td><td>'+p.views+'</td><td>'+(p.avg_seconds?dur(p.avg_seconds):'-')+'</td></tr>'}).join('')||'<tr><td colspan="3" class="ad-muted">No visits yet.</td></tr>';
  return h+'<div class="ad-card an"><div class="an-top"><h2>Traffic Overview</h2><select id="an-days" data-dd aria-label="Date range">'+[[7,'Last 7 Days'],[30,'Last 30 Days'],[90,'Last 90 Days']].map(function(o){return '<option value="'+o[0]+'"'+(A.days===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></div>'+
    '<div class="an-stats">'+cards.map(function(c){return '<div class="an-stat an-'+c[3]+'"><span>'+c[0]+'</span><b>'+c[1]+'</b>'+c[2]+'</div>'}).join('')+'</div>'+
    '<h3 class="an-sub">Traffic over Time</h3>'+chart(d.daily||[])+'</div>'+
    '<div class="ad-card"><h2>Top pages</h2><div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Page</th><th>Views</th><th>Avg. time</th></tr></thead><tbody>'+pages+'</tbody></table></div></div>'+
    visitsCard()+
    '<div class="ad-card"><h2>Ratings</h2><p class="ad-muted">Product ratings will show here when the rating feature is added to your products.</p></div>';
}
function loadOrders(){O.state='loading';renderApp();uApi('admin_list_orders').then(function(r){O.list=r||[];O.state='ready';renderApp()},function(e){O.state=(e.status===404?'nosql':'error');O.err=e.message||'';renderApp()})}
function tabOrders(){
  var h='<div class="ad-head"><h1>Orders</h1><p class="ad-muted">Orders placed from the Buy now page. Mark them paid once you have checked the payment.</p></div>';
  if(O.state==='idle'){loadOrders();return h+'<div class="ad-card"><p class="ad-muted">Loading…</p></div>'}
  if(O.state==='loading')return h+'<div class="ad-card"><p class="ad-muted">Loading…</p></div>';
  if(O.state==='error'&&O.err==='noauth')return connectCard(h);
  if(O.state!=='ready')return h+'<div class="ad-card"><p class="ad-msg warn">'+(O.state==='nosql'?'Orders are not installed yet. Run supabase-admin.sql again in the Supabase SQL Editor.':(O.err==='noauth'?'Log in on the website with your admin Google account first, then try again.':'Could not load orders. '+esc(O.err)))+'</p><div class="ad-btns" style="justify-content:flex-start"><button class="btn btn-solid btn-sm" type="button" data-act="o-refresh">Try again</button></div></div>';
  var paid=O.list.filter(function(o){return o.status==='paid'}),sum=paid.reduce(function(a,o){return a+o.amount},0);
  var OL=O.list.filter(function(o){return O.st==='all'||o.status===O.st}).slice().sort(O.sort==='old'?cmpDate('created_at','old'):O.sort==='hi'?function(a,b){return b.amount-a.amount}:O.sort==='lo'?function(a,b){return a.amount-b.amount}:cmpDate('created_at','new'));
  var rows=OL.map(function(o){return '<tr><td>#'+o.id+'</td><td><b>'+esc(o.name)+'</b><span>'+esc(o.email)+(o.phone?' · '+esc(o.phone):'')+'</span></td><td>'+esc(o.item)+'<span>'+esc(o.plan)+'</span></td><td>PKR '+Number(o.amount).toLocaleString('en-US')+'</td><td>'+esc(o.method)+(o.reference?'<span>'+esc(o.reference)+'</span>':'')+'</td><td><em class="chip'+(o.status==='paid'?' ok':o.status==='cancelled'?' danger':'')+'">'+esc(o.status)+'</em></td><td class="u-act">'+(o.status!=='paid'?'<button class="ad-link" type="button" data-act="o-set" data-id="'+o.id+'" data-s="paid">Mark paid</button> ':'')+(o.status!=='cancelled'?'<button class="ad-link u-danger" type="button" data-act="o-set" data-id="'+o.id+'" data-s="cancelled">Cancel</button>':'')+'</td></tr>'}).join('')||'<tr><td colspan="7" class="ad-muted">No orders yet.</td></tr>';
  return h+'<div class="ad-kpis">'+[['Orders',O.list.length],['Paid',paid.length],['Pending',O.list.filter(function(o){return o.status==='pending'}).length],['Paid total','PKR '+sum.toLocaleString('en-US')]].map(function(k){return '<div class="ad-kpi"><div><span>'+k[0]+'</span><b>'+k[1]+'</b></div></div>'}).join('')+'</div>'+
    '<div class="ad-card"><div class="u-bar fb-sortbar">'+sortSel('o-st',O.st,[['all','Any status'],['pending','Pending'],['paid','Paid'],['cancelled','Cancelled']],'Filter orders')+sortSel('o-sort',O.sort,[['new','Newest first'],['old','Oldest first'],['hi','Highest amount'],['lo','Lowest amount']],'Sort orders')+'</div><div class="ad-tablewrap"><table class="ad-table u-table"><thead><tr><th>Order</th><th>Customer</th><th>Item</th><th>Amount</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
/* ---------------- feedback: comments, complaints and appeals ---------------- */
var F={state:'idle',list:[],ap:[],err:'',kind:'all',reply:null,av:'open',sort:'new'};
function fbSort(L){return L.slice().sort(F.sort==='old'?cmpDate('created_at','old'):F.sort==='high'?function(a,b){return (b.rating||0)-(a.rating||0)||cmpDate('created_at','new')(a,b)}:F.sort==='low'?function(a,b){return (a.rating||9)-(b.rating||9)||cmpDate('created_at','new')(a,b)}:cmpDate('created_at','new'))}
function starsHtml(n){var o='';for(var i=1;i<=5;i++)o+='<svg viewBox="0 0 24 24" class="'+(i<=n?'on':'')+'" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4L2.8 9.3l6.4-.8z"/></svg>';return '<span class="fb-stars" role="img" aria-label="'+n+' out of 5">'+o+'</span>'}
function loadFeedback(quiet){
  if(!quiet){F.state='loading';renderApp()}
  Promise.all([uApi('admin_list_feedback'),uApi('admin_list_appeals').catch(function(){return []})]).then(function(r){F.list=r[0]||[];F.ap=r[1]||[];F.state='ready';renderApp()},
    function(e){F.state=(e.status===404?'nosql':(e.message==='noauth'?'noauth':'error'));F.err=e.message||'';renderApp()});
}
function fsize(n){n=+n||0;return n>=1048576?(n/1048576).toFixed(n>=10485760?0:1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
function openFile(path,name){
  var S=window.skUser;if(!S)return;
  S.token().then(function(t){return S.api('/storage/v1/object/sign/feedback-files/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',token:t,body:{expiresIn:300}})}).then(function(j){
    var base=(window.SK_CFG.url||'').replace(/\/+$/,'')+'/storage/v1';
    var a=document.createElement('a');a.href=base+j.signedURL+'&download='+encodeURIComponent(name||'file');a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  },function(){flash('Could not open the file. Run supabase-files.sql in Supabase first.','err');renderApp()});
}
function fbCard(f){
  var mail='mailto:'+encodeURIComponent(f.email)+'?subject='+encodeURIComponent('Re: your '+f.kind+' on SkillsKnowledge');
  return '<article class="fb'+(f.status==='done'?' done':'')+'"><header><em class="chip '+(f.kind==='complaint'?'danger':'ok')+'">'+esc(f.kind)+'</em>'+(f.rating?starsHtml(f.rating):'')+'<span class="fb-from">'+esc(f.email)+'</span><span class="fb-date">'+esc(uAgo(f.created_at))+'</span><em class="chip'+(f.status==='done'?' ok':f.status==='read'?'':' warn')+'">'+esc(f.status==='new'?'New':f.status==='read'?'Read':'Done')+'</em></header>'+
    '<p class="fb-msg">'+esc(f.message)+'</p>'+
    (f.files&&f.files.length?'<ul class="fb-files" aria-label="Attachments">'+f.files.map(function(x){return '<li><button type="button" class="fb-file" data-act="f-file" data-path="'+esc(x.path)+'" data-name="'+esc(x.name)+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.5l-8.5 8.5a5.5 5.5 0 01-7.8-7.8l9-9a3.7 3.7 0 015.2 5.2l-9 9a1.8 1.8 0 01-2.6-2.6l8.3-8.3"/></svg><span>'+esc(x.name)+'</span><em>'+fsize(x.size)+'</em></button></li>'}).join('')+'</ul>':'')+
    (f.reply?'<div class="fb-reply"><b>Your reply</b><p>'+esc(f.reply)+'</p></div>':'')+
    (F.reply===f.id?'<form class="fb-form" data-id="'+f.id+'"><textarea id="f-text" rows="4" maxlength="1000" placeholder="Write your reply" aria-label="Your reply">'+esc(f.reply||'')+'</textarea><div class="ad-btns"><button class="btn btn-solid btn-sm" type="submit">Save reply</button><a class="btn btn-ghost btn-sm" href="'+mail+'" data-act="f-mail" data-id="'+f.id+'">Send by email</a><button class="btn btn-ghost btn-sm" type="button" data-act="f-reply" data-id="">Cancel</button></div></form>':
     '<footer><button class="ad-link" type="button" data-act="f-reply" data-id="'+f.id+'">'+(f.reply?'Edit reply':'Reply')+'</button><button class="dd-btn" type="button" data-act="f-menu" data-id="'+f.id+'"><span>Actions</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></footer>')+'</article>';
}
function appealCard(x){
  var n=x.display_name||(x.email||'').split('@')[0],open=x.status==='open';
  return '<div class="u-appeal"><div><b>'+esc(n)+'</b> <span>'+(x.username?'@'+esc(x.username)+' · ':'')+esc(x.email)+' · '+esc(uAgo(x.created_at))+'</span>'+(open?'':' <em class="chip">Closed</em>')+'</div><p>'+esc(x.message)+'</p>'+
    (open?'<div class="u-act"><button class="ad-link" type="button" data-act="u-appeal-ok" data-id="'+esc(x.id)+'" data-uid="'+esc(x.user_id)+'">Unblock and close</button><button class="ad-link u-danger" type="button" data-act="u-appeal-no" data-id="'+esc(x.id)+'">Reject</button></div>':'')+'</div>';
}
function tabFeedback(){
  var h='<div class="ad-head"><div><h1>Feedback</h1><p class="ad-muted">Comments with a rating, complaints and appeals from the website.</p></div></div>';
  if(F.state==='idle'){loadFeedback();return stateCard(h,'loading')}
  if(F.state!=='ready')return stateCard(h,F.state,F.err,'Feedback','f-refresh');
  var cm=F.list.filter(function(f){return f.kind==='comment'}),cp=F.list.filter(function(f){return f.kind==='complaint'}),rated=cm.filter(function(f){return f.rating}),
      avg=rated.length?(rated.reduce(function(a,f){return a+f.rating},0)/rated.length).toFixed(1):'-',openAp=F.ap.filter(function(x){return x.status==='open'}).length;
  var segs=[['all','All',F.list.length],['comment','Comments',cm.length],['complaint','Complaints',cp.length],['appeal','Appeals',openAp]];
  var body;
  if(F.kind==='appeal'){
    var cur=F.ap.filter(function(x){return x.status==='open'}),old=F.ap.filter(function(x){return x.status!=='open'}),L=fbSort(F.av==='closed'?old:cur);
    body='<div class="seg seg-sub" role="tablist" aria-label="Appeals">'+[['open','Current',cur.length],['closed','Closed',old.length]].map(function(s){return '<button type="button" role="tab" data-act="f-av" data-v="'+s[0]+'"'+(F.av===s[0]?' aria-current="true"':'')+'>'+s[1]+'<i>'+s[2]+'</i></button>'}).join('')+'</div>'+
      (L.length?'<div class="u-appeals">'+L.map(appealCard).join('')+'</div>':'<p class="ad-muted ad-empty">'+(F.av==='closed'?'No closed appeals.':'No current appeals.')+'</p>')}
  else{var all=F.list.filter(function(f){return F.kind==='all'||f.kind===F.kind}),cur2=all.filter(function(f){return f.status!=='done'}),old2=all.filter(function(f){return f.status==='done'}),shown=fbSort(F.av==='closed'?old2:cur2);
    body='<div class="seg seg-sub" role="tablist" aria-label="Status">'+[['open','Current',cur2.length],['closed','Done',old2.length]].map(function(s){return '<button type="button" role="tab" data-act="f-av" data-v="'+s[0]+'"'+(F.av===s[0]?' aria-current="true"':'')+'>'+s[1]+'<i>'+s[2]+'</i></button>'}).join('')+'</div>'+
      (shown.length?'<div class="fb-list">'+shown.map(fbCard).join('')+'</div>':'<p class="ad-muted ad-empty">'+(F.av==='closed'?'Nothing marked done yet.':'Nothing waiting for you.')+'</p>')}
  return h+'<div class="ad-kpis">'+[['Comments',cm.length],['Average rating',avg],['Complaints',cp.length],['Open appeals',openAp]].map(function(k){return '<div class="ad-kpi"><div><span>'+k[0]+'</span><b>'+k[1]+'</b></div></div>'}).join('')+'</div>'+
    '<div class="ad-card"><div class="seg" role="tablist" aria-label="Show">'+segs.map(function(s){return '<button type="button" role="tab" data-act="f-kind" data-v="'+s[0]+'"'+(F.kind===s[0]?' aria-current="true"':'')+'>'+s[1]+'<i>'+s[2]+'</i></button>'}).join('')+'</div>'+
    '<div class="u-bar fb-sortbar"><span class="ad-muted">Sort</span>'+sortSel('f-sort',F.sort,[['new','Newest first'],['old','Oldest first']].concat(F.kind==='appeal'?[]:[['high','Highest rating'],['low','Lowest rating']]),'Sort feedback')+'</div>'+body+'</div>';
}
function fbMenu(btn,id){
  var f=F.list.filter(function(x){return x.id===id})[0];if(!f)return;
  var it=[];
  if(f.status==='new')it.push({v:'read',t:'Mark as read'});
  if(f.status!=='done')it.push({v:'done',t:'Mark as done'});else it.push({v:'new',t:'Reopen as new'});
  it.push({v:'copy',t:'Copy email address'},{v:'del',t:'Delete',danger:true});
  pop(btn,it,function(v){
    if(v==='copy'){(navigator.clipboard?navigator.clipboard.writeText(f.email):Promise.reject()).then(function(){flash('Email address copied.');renderApp()},function(){flash(f.email);renderApp()});return}
    if(v==='del'){ask('Delete this message for good?','Delete',true).then(function(ok){if(ok)uApi('admin_delete_feedback',{p_id:id}).then(function(){(f.files||[]).forEach(function(x){var S=window.skUser;S.token().then(function(tk){return S.api('/storage/v1/object/feedback-files/'+x.path.split('/').map(encodeURIComponent).join('/'),{method:'DELETE',token:tk})}).catch(function(){})});flash('Deleted.');loadFeedback(true)},function(e){flash(e.message||'Failed.','err');renderApp()})});return}
    uApi('admin_set_feedback',{p_id:id,p_status:v}).then(function(){loadFeedback(true)},function(e){flash(e.message||'Failed.','err');renderApp()});
  });
}
var TABS=[['overview','Overview'],['analysis','Analysis'],['orders','Orders'],['feedback','Feedback'],['content','Content'],['pages','Pages and sections'],['users','Users'],['settings','Settings'],['publish','Publish'],['admins','Owner and admins'],['security','Security']];
var animT=0;
/* fade the old view out, then draw the new one and let it fade in (about 0.8 s in total) */
function smooth(fn){
  clearTimeout(animT);
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches){fn();return}
  var m=app.querySelector('.ad-main');if(m)m.classList.add('ad-out');
  animT=setTimeout(function(){fn();ui.anim=1;renderApp();ui.anim=0;app.classList.add('ad-anim');setTimeout(function(){app.classList.remove('ad-anim')},1200)},m?240:0);
}
function goTab(t){
  var go=function(){
    ui.tab=t;ui.edit=null;ui.setup=null;ui.next=null;ui.chgOpen=false;
    if((t==='users'||t==='admins')&&U.state!=='ready')U.state='idle';
  };
  if(ui.tab==='content'||t==='content'){go();renderApp();return}
  smooth(go);
}
function renderApp(){
  if(ui.tab==='content'&&renderStudio())return;
  delete document.body.dataset.studio;
  acts.innerHTML='<a class="btn btn-ghost btn-sm" href="index.html">Preview site</a><button class="btn btn-solid btn-sm" type="button" data-act="publish" title="Choose where to save the file that makes your changes live">Publish'+(dirty()?' •':'')+'</button><button class="btn btn-ghost btn-sm" type="button" data-act="logout">Log out</button>';
  var nav='<aside class="ad-nav" aria-label="Admin sections"><div class="ad-brand"><b>SK</b><span>Control</span></div>'+
    '<p class="ad-me">'+esc(ME.is_owner?'SkillsKnowledge':(ME.name||'Admin'))+VB+'<em>'+(ME.is_owner?'Owner':'Admin')+'</em></p>'+
    TABS.map(function(t){return '<button type="button" data-tab="'+t[0]+'"'+(ui.tab===t[0]?' aria-current="true"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+NAVI[t[0]]+'</svg><span>'+t[1]+'</span>'+(t[0]==='publish'&&dirty()?'<em>•</em>':'')+'</button>'}).join('')+'</aside>';
  var h=nav+'<div class="ad-main">'+msgHtml()+({overview:tabOverview,content:tabContent,pages:tabPages,users:tabUsers,analysis:tabAnalysis,orders:tabOrders,feedback:tabFeedback,settings:tabSettings,publish:tabPublish,admins:tabAdmins,security:tabSecurity})[ui.tab]()+'</div>';
  app.innerHTML='<div class="ad-shell">'+h+'</div>';
  enhance(app);
  if(ui.tab==='security'&&ui.chgOpen&&!ui.setup){var host=$('#chg-host');if(host)setupForm(host,true)}
  var mf=$('#mail-form');if(mf)mf.addEventListener('submit',function(e){e.preventDefault();var s=$('#m-s').value.trim(),t=$('#m-t').value.trim(),k=$('#m-k').value.trim(),er=$('#m-err');
    if(!s||!t||!k){er.textContent='Please fill in all three fields.';er.hidden=false;return}
    ui.next=Object.assign({},ui.next||CFG,{mail:{service:s,template:t,key:k}});ui.setup={text:configFile(ui.next)};renderApp()});
}

function tabOverview(){
  var C=SK.counts(),pagesOn=PAGES.filter(function(p){return (draft.settings.pages||{})[p[0]]!==false}),pOn=pagesOn.length,pAll=PAGES.length;
  var rows=COLS.map(function(c){var L=listOf(c.id),off=L.filter(function(x){return x._off}).length;return {c:c,n:L.length,off:off}});
  var total=rows.reduce(function(s,r){return s+r.n},0),hidden=rows.reduce(function(s,r){return s+r.off},0),max=Math.max.apply(null,rows.map(function(r){return r.n}).concat([1]));
  var secOn=SECTIONS.filter(function(s){return (draft.settings.sections||{})[s[0]]!==false}).length;
  var ico=function(p){return '<span class="ad-ico"><svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg></span>'};
  var pct=Math.round(pOn/pAll*100);
  var bars=rows.slice().sort(function(x,y){return y.n-x.n}).slice(0,8).map(function(r){return '<li><span>'+esc(r.c.label)+'</span><i><u style="width:'+Math.max(4,Math.round(r.n/max*100))+'%"></u></i><b>'+r.n+'</b></li>'}).join('');
  var trs=rows.map(function(r){return '<tr><td><b>'+esc(r.c.label)+'</b><span>'+esc(r.c.page)+'</span></td><td>'+r.n+'</td><td>'+(r.off?'<em class="chip warn">'+r.off+' hidden</em>':'<em class="chip ok">All visible</em>')+'</td><td><button type="button" class="ad-link" data-act="goto-col" data-col="'+esc(r.c.id)+'">Edit</button></td></tr>'}).join('');
  return '<header class="ad-head"><div><h1>Welcome back</h1><p>'+new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</p></div>'+
   '<span class="chip '+(dirty()?'warn':'ok')+' big">'+(dirty()?'Unpublished changes':'Everything is published')+'</span></header>'+
   '<div class="ad-kpis">'+
   '<div class="ad-kpi">'+ico('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>')+'<div><span>Skills shown</span><b>'+esc(C.n+C.suffix)+'</b><small>'+(SK.setting&&SK.setting('skillsCount')?'set by hand':'counted automatically')+'</small></div></div>'+
   '<div class="ad-kpi">'+ico('<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/>')+'<div><span>Content items</span><b>'+total+'</b><small>across '+rows.length+' lists</small></div></div>'+
   '<div class="ad-kpi">'+ico('<path d="M6 3h8l4 4v14H6z"/>')+'<div><span>Pages on</span><b>'+pOn+'/'+pAll+'</b><small>'+(pAll-pOn?(pAll-pOn)+' switched off':'all switched on')+'</small></div></div>'+
   '<div class="ad-kpi">'+ico('<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>')+'<div><span>Hidden items</span><b>'+hidden+'</b><small>'+secOn+' of '+SECTIONS.length+' sections on</small></div></div></div>'+
   '<div class="ad-cols"><div class="ad-card"><h2>Items per list</h2><ul class="ad-bars">'+bars+'</ul></div>'+
   '<div class="ad-card"><h2>Pages switched on</h2><div class="ad-donut"><div class="ring" style="--p:'+pct+'"><b>'+pct+'%</b></div><ul><li><i class="d1"></i>On <b>'+pOn+'</b></li><li><i class="d2"></i>Off <b>'+(pAll-pOn)+'</b></li></ul></div></div></div>'+
   '<div class="ad-card" style="margin-top:12px"><h2>Your lists</h2><div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>List</th><th>Items</th><th>Status</th><th></th></tr></thead><tbody>'+trs+'</tbody></table></div></div>';
}


/* ---------------- content studio: the Content tab as a small editor (list on the left, live site and its code on the right) ---------------- */
var PVFILE={home:'index.html',graphics:'graphics.html',video:'video.html',code:'code.html',about:'about.html'};
var PVNAME=[['home','Home'],['graphics','Graphics'],['video','Video'],['code','Code'],['about','About']];
var DEVW={desktop:1280,tablet:768,phone:390},stT=0,stWired=false;
function colOf(){return COLS.filter(function(x){return x.id===ui.col})[0]||COLS[0]}
function pvKey(c){return ui.pv||c.id.split(':')[0]}
function hl(j){
  return esc(j).replace(/(&quot;(?:[^&]|&(?!quot;))*&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g,function(m,str,colon,kw,num){
    if(str)return colon?'<i class="k">'+str+'</i>'+colon:'<i class="s">'+str+'</i>';
    if(kw)return '<i class="b">'+kw+'</i>';return '<i class="n">'+num+'</i>';
  });
}
function codeHtml(c){
  var L=listOf(c.id);if(!L.length)return '[]';
  return '[\n'+L.map(function(it,i){return '<span class="cd-it'+(ui.edit===i?' cur':'')+'">'+hl(JSON.stringify(it,null,2).replace(/^/gm,'  '))+'</span>'}).join(',\n')+'\n]';
}
function treeHtml(){
  var groups=[],seen={};COLS.forEach(function(c){if(!seen[c.page]){seen[c.page]=[];groups.push(c.page)}seen[c.page].push(c)});
  return groups.map(function(g){return '<h4>'+esc(g)+'</h4>'+seen[g].map(function(c){var edited=Array.isArray(draft.lists[c.id]);return '<button type="button" data-col="'+c.id+'"'+(ui.col===c.id?' aria-current="true"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>'+esc(c.label)+'</span>'+(edited?'<em>edited</em>':'')+'</button>'}).join('')}).join('');
}
function shellHtml(){
  return '<div class="st" id="studio"><header class="st-bar"><button type="button" class="st-back" data-tab="overview"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>Admin</button>'+
    '<b class="st-title">Content editor</b><span class="st-status" id="st-status"></span><span class="st-sp"></span>'+
    '<button type="button" class="btn btn-solid btn-sm" data-tab="publish">Publish…</button></header>'+
   '<div class="st-body" id="st-body"><section class="st-left" aria-label="Content"><nav class="st-tree" id="st-tree" aria-label="Lists"></nav><div class="st-edit" id="st-edit"></div></section>'+
   '<div class="st-vs" id="st-vs" role="separator" aria-orientation="vertical" aria-label="Resize panels"></div>'+
   '<section class="st-right"><div class="st-pv"><div class="st-pvbar"><select id="st-page" data-dd aria-label="Page to show">'+PVNAME.map(function(p){return '<option value="'+p[0]+'">'+p[1]+'</option>'}).join('')+'</select><span class="st-sp"></span>'+
     ['desktop','tablet','phone'].map(function(d){return '<button type="button" class="st-ic" data-act="st-dev" data-v="'+d+'" aria-label="'+d+' size" title="'+d+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+({desktop:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',tablet:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>',phone:'<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2"/>'})[d]+'</svg></button>'}).join('')+
     '<button type="button" class="st-ic" data-act="st-reload" aria-label="Reload preview" title="Reload"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 11-2.4-5.7M20 4v5h-5"/></svg></button></div>'+
     '<div class="st-frame" id="st-framebox"><iframe id="st-frame" title="Your website" referrerpolicy="same-origin"></iframe></div></div>'+
   '<div class="st-hs" id="st-hs" role="separator" aria-orientation="horizontal" aria-label="Resize panels"></div>'+
   '<div class="st-code"><div class="st-codebar"><span id="st-file"></span><span class="st-sp"></span><button type="button" class="st-copy" data-act="st-copy">Copy</button></div><pre id="st-pre" tabindex="0" aria-label="Code of the selected list"></pre></div></section></div></div>';
}
function fitFrame(){
  var box=$('#st-framebox'),f=$('#st-frame');if(!box||!f)return;
  var w=DEVW[ui.dev]||1280,bw=box.clientWidth,bh=box.clientHeight,k=Math.min(1,bw/w);
  f.style.width=w+'px';f.style.height=Math.ceil(bh/k)+'px';f.style.transform='scale('+k+')';f.style.marginLeft=Math.max(0,(bw-w*k)/2)+'px';
}
function stReload(now){
  clearTimeout(stT);
  var go=function(){var f=$('#st-frame');if(f&&f.contentWindow){try{f.contentWindow.location.reload()}catch(e){f.src=f.src}}};
  if(now)go();else stT=setTimeout(go,350);
}
window.stReload=function(){if(ui.tab==='content'&&$('#studio'))stReload(false)};
function wireStudio(){
  var body=$('#st-body');
  function drag(h,move){h.addEventListener('pointerdown',function(e){e.preventDefault();h.setPointerCapture(e.pointerId);body.classList.add('drag');
    var mv=function(ev){move(ev,body.getBoundingClientRect(),$('.st-right').getBoundingClientRect())},up=function(){h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);body.classList.remove('drag');fitFrame()};
    h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up)})}
  drag($('#st-vs'),function(ev,b){var w=Math.max(360,Math.min(b.width-360,ev.clientX-b.left));body.style.setProperty('--lw',w+'px');fitFrame()});
  drag($('#st-hs'),function(ev,b,r){var p=Math.max(25,Math.min(80,(ev.clientY-r.top)/r.height*100));body.style.setProperty('--ph',p+'%');fitFrame()});
  if(window.ResizeObserver)new ResizeObserver(fitFrame).observe($('#st-framebox'));else addEventListener('resize',fitFrame);
}
function renderStudio(){
  if(!draft)return false;
  document.body.dataset.studio='1';
  var c=colOf(),sh=$('#studio');
  if(!sh){app.innerHTML=shellHtml();wireStudio();enhance($('.st-pvbar'))}
  var ed=$('#st-edit'),top=ed?ed.scrollTop:0;
  $('#st-tree').innerHTML=treeHtml();
  ed.innerHTML=msgHtml()+(ui.edit!==null?editorHtml(c):listHtml(c));enhance(ed);ed.scrollTop=ui.edit!==null?0:top;
  var d=dirty(),st=$('#st-status');st.textContent=d?'Unpublished changes':'Everything is published';st.className='st-status '+(d?'warn':'ok');
  var key=pvKey(c),file=PVFILE[key]||'index.html',f=$('#st-frame');
  var pg=$('#st-page');if(pg&&pg.value!==key){pg.value=key;pg.dispatchEvent(new Event('sk-sync'))}
  if(f.dataset.f!==file){f.dataset.f=file;f.src=file}
  [].forEach.call(document.querySelectorAll('.st-ic[data-v]'),function(b){b.setAttribute('aria-pressed',b.dataset.v===ui.dev?'true':'false')});
  $('#st-file').textContent=c.id.replace(':','/')+'.json';
  $('#st-pre').innerHTML=codeHtml(c);
  var cur=$('#st-pre .cur');if(cur)cur.scrollIntoView({block:'nearest'});
  fitFrame();
  return true;
}

function tabContent(){
  var groups=[],seen={};COLS.forEach(function(c){if(!seen[c.page]){seen[c.page]=[];groups.push(c.page)}seen[c.page].push(c)});
  var side='<div class="ad-side">'+groups.map(function(g){return '<h4>'+esc(g)+'</h4>'+seen[g].map(function(c){var edited=Array.isArray(draft.lists[c.id]);return '<button type="button" data-col="'+c.id+'"'+(ui.col===c.id?' aria-current="true"':'')+'>'+esc(c.label)+(edited?'<em>edited</em>':'')+'</button>'}).join('')}).join('')+'</div>';
  var c=COLS.filter(function(x){return x.id===ui.col})[0]||COLS[0];
  return '<div class="ad-split">'+side+'<div>'+(ui.edit!==null?editorHtml(c):listHtml(c))+'</div></div>';
}
function titleOf(it){return it.title||it.name||it.when||'Untitled'}
function subOf(it){return it.text||it.kind||it.note||(it.items&&it.items.join(', '))||it.href||''}
function listHtml(c){
  var L=listOf(c.id),off=L.filter(function(x){return x._off}).length;
  var h='<div class="ad-top"><div><h2 style="margin:0">'+esc(c.label)+'</h2><span class="ad-muted" style="font-size:.84rem">'+L.length+' item'+(L.length===1?'':'s')+(off?', '+off+' hidden':'')+'</span></div>'+
    '<div class="ad-btns"><button type="button" class="btn btn-solid btn-sm" data-act="add">+ Add new</button>'+(Array.isArray(draft.lists[c.id])?'<button type="button" class="btn btn-ghost btn-sm" data-act="reset-col">Reset to defaults</button>':'')+'</div></div>';
  if(c.note)h+='<p class="ad-msg warn">'+esc(c.note)+'</p>';
  if(c.id==='home:svc-list'&&L.some(function(x){return x.placeholder}))h+='<p class="ad-msg">The item named "." is an empty placeholder slot. It counts as a skill. Edit it to make it real, or delete it to lower the count.</p>';
  h+='<div class="ad-rows">'+(L.length?L.map(function(it,i){
    return '<div class="ad-row'+(it._off?' off':'')+'"><div class="ad-ord"><button type="button" data-act="up" data-i="'+i+'" aria-label="Move up"'+(i===0?' disabled':'')+'>▲</button><button type="button" data-act="down" data-i="'+i+'" aria-label="Move down"'+(i===L.length-1?' disabled':'')+'>▼</button></div>'+
      '<div class="t"><b>'+esc(titleOf(it))+(it._off?' (hidden)':'')+'</b><span>'+esc(subOf(it))+'</span></div>'+
      '<div class="ad-btns"><button type="button" data-act="toggle" data-i="'+i+'">'+(it._off?'Show':'Hide')+'</button><button type="button" data-act="edit" data-i="'+i+'">Edit</button><button type="button" class="danger" data-act="del" data-i="'+i+'">Delete</button></div></div>';
  }).join(''):'<p class="ad-muted ad-empty">Nothing here yet. Use "Add new".</p>')+'</div>';
  return h;
}
function editorHtml(c){
  var L=listOf(c.id),it=L[ui.edit]||{},isNew=ui.edit>=L.length;
  var used=c.types?L.map(function(x){return x.type}).filter(function(v,i,a){return v&&a.indexOf(v)===i}):[];
  var h='<div class="ad-top"><h2 style="margin:0">'+(isNew?'Add to':'Edit in')+' '+esc(c.label)+'</h2></div><form class="ad-form ad-card" id="item-form" novalidate>';
  h+=c.fields.map(function(f){
    var v=it[f.k],id='f_'+f.k,hint=f.h?' <small>'+esc(f.h)+'</small>':'';
    if(f.t==='bool')return '<label class="chk"><input type="checkbox" id="'+id+'"'+(v?' checked':'')+'>'+esc(f.l)+'</label>';
    var inner;
    if(f.t==='area')inner='<textarea id="'+id+'">'+esc(v)+'</textarea>';
    else if(f.t==='raw')inner='<textarea class="mono" id="'+id+'" spellcheck="false">'+esc(v)+'</textarea>';
    else if(f.t==='csv')inner='<input type="text" id="'+id+'" value="'+esc((v||[]).join(', '))+'">';
    else if(f.t==='num')inner='<input type="number" min="0" max="100" id="'+id+'" value="'+esc(v==null?0:v)+'">';
    else if(f.t==='icon'){var ic=(D._icons||{})[f.page]||[];inner='<select id="'+id+'" data-dd>'+ic.map(function(n){return '<option'+(n===(v||ic[0])?' selected':'')+'>'+esc(n)+'</option>'}).join('')+'</select>'}
    else inner='<input type="text" id="'+id+'" value="'+esc(v)+'">'+(f.k==='type'&&used.length?'<span class="sg">'+used.map(function(u){return '<button type="button" data-act="sg" data-v="'+esc(u)+'">'+esc(u)+'</button>'}).join('')+'</span>':'');
    return '<label class="f">'+esc(f.l)+hint+inner+'</label>';
  }).join('');
  h+='<p class="ad-msg err" id="it-err" role="alert" hidden></p><div class="ad-btns" style="justify-content:flex-start"><button class="btn btn-solid btn-sm" type="submit">Save</button><button class="btn btn-ghost btn-sm" type="button" data-act="cancel">Cancel</button></div></form>';
  return h;
}
function saveItem(c){
  var L=listOf(c.id),i=ui.edit,isNew=i>=L.length,it=isNew?c.add():clone(L[i]);
  var first=c.fields[0];
  c.fields.forEach(function(f){
    var el=$('#f_'+f.k);if(!el)return;
    if(f.t==='bool'){it[f.k]=el.checked}
    else if(f.t==='csv'){it[f.k]=el.value.split(',').map(function(s){return s.trim()}).filter(Boolean)}
    else if(f.t==='num'){it[f.k]=Math.max(0,Math.min(100,Number(el.value)||0))}
    else it[f.k]=el.value;
  });
  var err=$('#it-err');
  if(!String(it[first.k]||'').trim()){err.textContent='Please fill in the '+first.l.toLowerCase()+'.';err.hidden=false;return false}
  if(it.placeholder&&it.title&&it.title.trim()!=='.')delete it.placeholder;
  editList(c.id,function(l){if(isNew)l.push(it);else l[i]=it});
  flash((isNew?'Added and saved.':'Saved.')+' Press Publish at the top when you want it live.');
  return true;
}

function tabPages(){
  var st=draft.settings,pg=st.pages||{},sc=st.sections||{};
  function tg(kind,id,label,sub,on){return '<div class="ad-toggle"><div><b>'+esc(label)+'</b><span>'+esc(sub)+'</span></div><label class="ad-sw"><input type="checkbox" name="'+kind+':'+id+'"'+(on?' checked':'')+' aria-label="'+esc(label)+' on or off"><i></i></label></div>'}
  return '<form id="pages-form" class="ad-form" novalidate><div class="ad-card"><h2>Pages</h2><p>Switch a page off to remove it from the menu and from every link that points to it. Visitors who open its address are sent to the home page.</p><div class="ad-rows">'+
    PAGES.map(function(p){return tg('page',p[0],p[1],p[2],pg[p[0]]!==false)}).join('')+'</div></div>'+
   '<div class="ad-card"><h2>Home page sections</h2><p>Switch a section off to hide it and its menu link.</p><div class="ad-rows">'+
    SECTIONS.map(function(s){return tg('section',s[0],s[1],'#'+s[0],sc[s[0]]!==false)}).join('')+'</div></div>'+
   '<div class="ad-btns" style="justify-content:flex-start"><button class="btn btn-solid" type="submit">Save</button></div></form>';
}
function tabSettings(){
  var st=draft.settings,autoN=SK.list('home:svc-list').length,tx=st.texts||{},dt=D._texts||{};
  return '<form id="settings-form" class="ad-form" novalidate><div class="ad-card"><h2>Skills count</h2>'+
   '<p>Leave the number box <b>empty</b> and the site counts the items in the Home skills list for you (right now <b>'+autoN+'</b>), so adding a skill raises it everywhere. Type a number to use your own instead.</p>'+
   '<div class="ad-grid2"><label class="f">Number <small>empty = automatic</small><input type="number" min="0" max="99" name="skillsManual" placeholder="Automatic ('+autoN+')" value="'+esc(st.skillsManual!=null?st.skillsManual:'')+'"></label>'+
   '<label class="f">Sign after the number<input type="text" maxlength="3" name="skillsSuffix" value="'+esc(st.skillsSuffix!=null?st.skillsSuffix:'+')+'"></label></div></div>'+
   '<div class="ad-card"><h2>Main texts</h2><p>Leave a box empty to keep the original wording.</p><div class="ad-form">'+
   TEXTS.map(function(t){return '<label class="f">'+esc(t[1])+(t[2]==='area'?'<textarea name="t_'+t[0]+'" placeholder="'+esc(dt[t[0]]||'')+'">'+esc(tx[t[0]]||'')+'</textarea>':'<input type="text" name="t_'+t[0]+'" placeholder="'+esc(dt[t[0]]||'')+'" value="'+esc(tx[t[0]]||'')+'">')+'</label>'}).join('')+'</div></div>'+
   '<p class="ad-msg err" id="st-err" role="alert" hidden></p><div class="ad-btns" style="justify-content:flex-start"><button class="btn btn-solid" type="submit">Save</button></div></form>';
}
function tabPublish(){
  var lists=Object.keys(draft.lists);
  return '<div class="ad-card"><h2>Publish your changes</h2>'+
   (dirty()?'<p class="ad-msg warn">You have saved changes that are not published yet ('+lists.length+' edited list'+(lists.length===1?'':'s')+(Object.keys(draft.settings).length?' and changed settings':'')+'). Only you can see them right now.</p>':'<p class="ad-msg ok">Nothing waiting to be published.</p>')+
   '<ol class="ad-steps"><li>Keep editing and pressing <b>Save</b>. Nothing is downloaded while you do.</li><li>When you are finished, press the <b>Publish</b> button at the top right. It downloads <b>site-data.js</b>.</li><li>Put that file in your website folder in place of the old <b>site-data.js</b> and upload the folder.</li></ol></div>'+
   '<div class="ad-card" style="margin-top:14px"><h2>Bring in a saved file</h2><p>Load a <b>site-data.js</b> (or a .json backup) as your draft, for example on a new computer.</p><label class="f">Choose file<input type="file" accept=".js,.json,application/json,text/javascript" id="imp"></label></div>'+
   '<div class="ad-card" style="margin-top:14px"><h2>Start over</h2><p>Throw away your saved changes and go back to what visitors currently see.</p><div><button class="btn btn-ghost btn-sm" type="button" data-act="discard">Discard my changes</button></div></div>';
}
function tabAdmins(){
  var h='<div class="ad-head"><div><h1>Owner and admins</h1><p class="ad-muted">Who runs this site, and who may open this panel.</p></div></div>';
  var owner='<div class="ad-card ow"><div class="ow-name"><b>SkillsKnowledge</b>'+VB+'<em class="chip dark">Owner</em></div>'+
    (ME.is_owner?'<p>You are the owner'+(ME.email?' ('+esc(ME.email)+')':'')+'. Nobody else can remove you, block you, change your access or see your details, and only you can add or remove admins.</p>':'<p>The owner of this site is SkillsKnowledge. Only the owner can add or remove admins.</p>')+'</div>';
  if(!ME.is_owner)return h+owner;
  if(U.state==='idle'){loadUsers();return h+owner+'<div class="ad-card"><p class="ad-muted">Loading…</p></div>'}
  if(U.state!=='ready')return h+owner+stateCard('',U.state,U.err,'The admin list','u-refresh');
  var ads=U.list.filter(function(x){return x.is_admin&&!x.is_owner});
  var rows=ads.length?ads.map(function(x){return '<tr><td><b class="u-name">'+esc(nameOf(x))+badges(x)+'</b><span>'+esc(x.email)+'</span></td><td class="u-act"><button class="ad-link u-danger" type="button" data-act="u-admin" data-id="'+esc(x.id)+'" data-flag="0">Remove admin</button></td></tr>'}).join(''):'<tr><td colspan="2" class="ad-muted">No other admins. To add one, open <b>Users</b>, press Details on that person and choose <b>Make admin</b>.</td></tr>';
  var ho=ME.handover,hoEnd=ho&&ho.ends?new Date(ho.ends).toLocaleString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
  var hoCard=ho?'<div class="ad-card"><h2>Ownership handover running</h2>'+(ho.state==='leaving'?'<p>The new owner already has full owner rights. You keep yours until <b>'+esc(hoEnd)+'</b>, then you become a normal admin. If this was not you, or you changed your mind, cancel it now and everything returns to you.</p><div class="ad-btns" style="justify-content:flex-start"><button class="btn btn-danger btn-sm" type="button" data-act="x-cancel">Cancel handover</button></div>':'<p>You are the owner now. The previous owner keeps owner rights until <b>'+esc(hoEnd)+'</b> and may cancel the handover before then.</p>')+'</div>':'';
  var xfer=ho?'':ads.length?'<div class="ad-card"><h2>Hand over ownership</h2><p>Choose an admin to become the new owner. They get owner rights at once. You keep yours for 3 more days, so you can cancel if something is wrong, then you become a normal admin.</p>'+
    '<div class="ad-row2"><select id="x-to" data-dd aria-label="New owner">'+ads.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(nameOf(x))+' ('+esc(x.email)+')</option>'}).join('')+'</select><button class="btn btn-danger btn-sm" type="button" data-act="x-owner">Hand over ownership</button></div></div>':'';
  return h+owner+hoCard+'<div class="ad-card"><h2>Admins</h2><div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Admin</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'+xfer;
}

/* ---------------- security tab: change the login, recovery key, reset email ---------------- */
function tabSecurity(){
  if(ui.setup)return resultHtml(ui.setup);
  return '<div class="ad-card"><h2>Login and key</h2><p>Your login is checked against a one-way key in <b>admin-config.js</b>, built from your email, username and password together with a random salt. The password is not stored and cannot be read back, by anyone, including whoever built this site.</p>'+
   '<p>Strength depends on your password. A long unique one (16+ characters) is what keeps the key safe if someone ever downloads the file.</p>'+
   '<p class="ad-msg warn">This site has no server, so the login protects the admin panel in the browser. It does not stop someone who can change your website files on the host. Protect your hosting account too.</p>'+
   '<div class="ad-top" style="margin:0"><button class="btn btn-solid btn-sm" type="button" data-act="chg-login">Change email, username or password</button><button class="btn btn-ghost btn-sm" type="button" data-act="logout">Log out now</button></div></div><div id="chg-host" style="margin-top:14px"></div>'+
   '<div class="ad-card" style="margin-top:14px"><h2>Recovery key</h2><p>'+(CFG&&CFG.rk?'A recovery key exists. Creating a new one replaces it.':'No recovery key yet.')+' To reset a forgotten password you need <b>both</b> this key and a code emailed to you. The key is shown once; only a one-way hash is stored.</p><div class="ad-top" style="margin:0"><button class="btn btn-solid btn-sm" type="button" data-act="new-recovery">Create a new recovery key</button></div></div>'+
   '<div class="ad-card" style="margin-top:14px"><h2>Email for reset codes</h2><p>Codes are sent through <b>EmailJS</b> (free). Create an account at emailjs.com, connect your Gmail, make a template that sends to your Gmail address and contains <code>{{code}}</code>, then paste the three IDs here. Your address is stored in EmailJS, not in this website.</p>'+
   '<form class="ad-form" id="mail-form" novalidate><label class="f">Service ID<input type="text" id="m-s" value="'+esc((CFG&&CFG.mail&&CFG.mail.service)||'')+'" autocomplete="off"></label><label class="f">Template ID<input type="text" id="m-t" value="'+esc((CFG&&CFG.mail&&CFG.mail.template)||'')+'" autocomplete="off"></label><label class="f">Public key<input type="text" id="m-k" value="'+esc((CFG&&CFG.mail&&CFG.mail.key)||'')+'" autocomplete="off"></label><p class="ad-msg err" id="m-err" hidden></p><div class="ad-top" style="margin:0"><button class="btn btn-solid btn-sm" type="submit">Save email settings</button></div></form></div>';
}

/* ---------------- events ---------------- */
function onClick(e){
  var t=e.target.closest('[data-tab],[data-col],[data-act]');if(!t)return;
  if(t.dataset.tab){goTab(t.dataset.tab);return}
  if(t.dataset.col&&!t.dataset.act){ui.col=t.dataset.col;ui.edit=null;ui.pv=null;renderApp();return}
  var a=t.dataset.act,i=+t.dataset.i,c=COLS.filter(function(x){return x.id===ui.col})[0]||COLS[0];
  if(a==='logout'){endSession();draft=null;ME=null;ui.setup=null;view();return}
  if(a==='add'){ui.edit=listOf(c.id).length;renderApp();return}
  if(a==='edit'){ui.edit=i;renderApp();return}
  if(a==='cancel'){ui.edit=null;renderApp();return}
  if(a==='sg'){var ti=$('#f_type');if(ti){ti.value=t.dataset.v;ti.focus()}return}
  if(a==='up'||a==='down'){editList(c.id,function(L){var j=a==='up'?i-1:i+1;if(j<0||j>=L.length)return;var x=L[i];L[i]=L[j];L[j]=x});renderApp();return}
  if(a==='toggle'){editList(c.id,function(L){if(L[i]._off)delete L[i]._off;else L[i]._off=true});renderApp();return}
  if(a==='del'){ask('Delete "'+titleOf(listOf(c.id)[i])+'"? You can bring everything back with "Reset to defaults".','Delete',true).then(function(ok){if(ok){editList(c.id,function(L){L.splice(i,1)});flash('Deleted and saved.');renderApp()}});return}
  if(a==='reset-col'){ask('Reset "'+c.label+'" to the original content?','Reset',true).then(function(ok){if(ok){delete draft.lists[c.id];save();flash('Reset to defaults.');renderApp()}});return}
  if(a==='chg-login'){ui.setup=null;ui.chgOpen=true;renderApp();return}
  if(a==='dl-config'){download('admin-config.js',ui.setup.text);return}
  if(a==='copy-config'){var tx=ui.setup.text;(navigator.clipboard?navigator.clipboard.writeText(tx):Promise.reject()).then(function(){t.textContent='Copied'},function(){var r=document.createRange();r.selectNodeContents($('#cfg-text'));var s=getSelection();s.removeAllRanges();s.addRange(r);t.textContent='Press Ctrl+C'});return}
  if(a==='new-recovery'){newRecovery().then(function(r){ui.next=Object.assign({},ui.next||CFG,{rk:r.rk});ui.setup={text:configFile(ui.next),recovery:r.key};renderApp()});return}
  if(a==='setup-done'){ui.setup=null;ui.chgOpen=false;if(app.dataset.view==='setup'){location.reload()}else renderApp();return}
  if(a==='publish'){publish();return}
  if(a==='discard'){ask('Discard your saved changes and go back to the published version?','Discard',true).then(function(ok){if(ok){store.del(SK.DRAFT_KEY);draft=null;loadDraft();flash('Changes discarded.');renderApp()}});return}
  if(a==='u-refresh'){loadUsers();return}
  if(a==='a-refresh'){loadAnalysis();return}
  if(a==='o-refresh'){loadOrders();return}
  if(a==='f-refresh'){loadFeedback();return}
  if(a==='f-av'){smooth(function(){F.av=t.dataset.v});return}
  if(a==='u-who'){U.who=t.dataset.v;renderApp();return}
  if(a==='f-kind'){smooth(function(){if(t.dataset.v==='appeal'&&(F.sort==='high'||F.sort==='low'))F.sort='new';F.kind=t.dataset.v;F.reply=null});return}
  if(a==='f-reply'){F.reply=t.dataset.id?+t.dataset.id:null;renderApp();var ta=$('#f-text');if(ta)ta.focus();return}
  if(a==='f-mail'){var tx=$('#f-text');t.href=t.href.split('&body=')[0]+'&body='+encodeURIComponent(tx?tx.value:'');return}
  if(a==='f-file'){openFile(t.dataset.path,t.dataset.name);return}
  if(a==='f-menu'){e.stopPropagation();fbMenu(t,+t.dataset.id);return}
  if(a==='o-set'){uApi('admin_set_order',{p_id:+t.dataset.id,p_status:t.dataset.s}).then(function(){flash('Order updated.');loadOrders()},function(er){flash(er.message||'Failed.','err');renderApp()});return}
  if(a==='u-open'){U.open=U.open===t.dataset.id?null:t.dataset.id;renderApp();return}
  if(a==='u-block'){var f=t.dataset.flag==='1',id=t.dataset.id;(f?ask('Block this person? They will not be able to log in.','Block',true):Promise.resolve(true)).then(function(ok){if(ok)uAct(uApi('admin_set_blocked',{uid:id,flag:f}),f?'User blocked.':'User unblocked.')});return}
  if(a==='u-appeal-ok'){var aid=+t.dataset.id,au=t.dataset.uid;ask('Unblock this person and close their appeal?','Unblock').then(function(ok){if(ok)uApi('admin_set_blocked',{uid:au,flag:false}).then(function(){return uApi('admin_close_appeal',{aid:aid})}).then(function(){flash('Unblocked. Appeal closed.');loadUsersQuiet().catch(function(){});loadFeedback(true)},function(er){flash(er.message||'Failed.','err');renderApp()})});return}
  if(a==='u-appeal-no'){var rid=+t.dataset.id;ask('Reject this appeal? The person stays blocked.','Reject',true).then(function(ok){if(ok)uApi('admin_close_appeal',{aid:rid}).then(function(){flash('Appeal rejected.');loadFeedback(true)},function(er){flash(er.message||'Failed.','err');renderApp()})});return}
  if(a==='u-admin'){var g=t.dataset.flag==='1',gid=t.dataset.id;ask(g?'Give this person full admin rights?':'Remove this person\'s admin rights?',g?'Make admin':'Remove',!g).then(function(ok){if(ok)uAct(uApi('admin_set_admin',{uid:gid,flag:g}),g?'Admin rights given.':'Admin rights removed.')});return}
  if(a==='x-cancel'){ask('Cancel the handover? The new owner loses owner rights at once.','Cancel handover',true).then(function(ok){if(ok)uApi('admin_cancel_handover').then(function(){U.state='idle';flash('Handover cancelled. You are the only owner again.');uApi('admin_whoami').then(function(me){ME=me;renderApp()},function(){renderApp()})},function(er){flash(er.message||'Failed.','err');renderApp()})});return}
  if(a==='x-owner'){var to=$('#x-to').value;ask('Hand over ownership? The new owner gets owner rights at once. You keep yours for 3 days and can cancel until then.','Hand over',true).then(function(ok){if(ok)uApi('admin_transfer_owner',{uid:to}).then(function(){U.state='idle';flash('Done. The new owner has owner rights now; yours end in 3 days unless you cancel.');return uApi('admin_whoami').then(function(me){ME=me;renderApp()})},function(er){flash(er.message||'Failed.','err');renderApp()})});return}
  if(a==='goto-col'){ui.tab='content';ui.col=t.dataset.col;ui.edit=null;ui.pv=null;renderApp();return}
  if(a==='st-dev'){ui.dev=t.dataset.v;renderStudio();return}
  if(a==='st-reload'){stReload(true);return}
  if(a==='st-copy'){var cc=colOf(),txt=JSON.stringify(listOf(cc.id),null,2);(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){flash('Code copied.')},function(){flash('Could not copy. Select the code and press Ctrl+C.','err')});renderApp();return}
}
app.addEventListener('click',onClick);
acts.addEventListener('click',onClick);
app.addEventListener('input',function(e){if(e.target.id==='u-q'){U.q=e.target.value;var b=$('#u-body');if(b)b.innerHTML=uRows();enhance(app)}});
app.addEventListener('submit',function(e){
  if(e.target.id==='connect-form'){e.preventDefault();connect(e.target);return}
  var id=e.target.id;
  if(e.target.classList.contains('fb-form')){
    e.preventDefault();var fid=+e.target.dataset.id,txt=$('#f-text').value.trim();
    if(txt.length<2){flash('Write a reply first.','err');renderApp();return}
    uApi('admin_reply_feedback',{p_id:fid,p_reply:txt}).then(function(){F.reply=null;flash('Reply saved.');loadFeedback(true)},function(er){flash(er.status===404?'Replies are not installed yet. Run supabase-owner.sql.':(er.message||'Failed.'),'err');renderApp()});
    return;
  }
  if(id==='item-form'){
    e.preventDefault();
    var c=COLS.filter(function(x){return x.id===ui.col})[0]||COLS[0];
    if(saveItem(c)){ui.edit=null;renderApp()}
    return;
  }
  if(id==='pages-form'){
    e.preventDefault();var f=e.target;
    var pg={},sc={};
    [].forEach.call(f.querySelectorAll('input[type=checkbox]'),function(i){
      var p=i.name.split(':');if(!i.checked)(p[0]==='page'?pg:sc)[p[1]]=false;
    });
    if(Object.keys(pg).length)draft.settings.pages=pg;else delete draft.settings.pages;
    if(Object.keys(sc).length)draft.settings.sections=sc;else delete draft.settings.sections;
    save();flash('Saved. Press Publish at the top when you want it live.');renderApp();return;
  }
  if(id==='settings-form'){
    e.preventDefault();var f2=e.target,v=function(n){return f2.elements[n].value.trim()};
    var n=v('skillsManual'),sx=f2.elements.skillsSuffix.value;
    if(n==='')delete draft.settings.skillsManual;else draft.settings.skillsManual=Math.max(0,Math.min(99,parseInt(n,10)||0));
    delete draft.settings.skillsMode;
    if(sx===''||sx==='+')delete draft.settings.skillsSuffix;else draft.settings.skillsSuffix=sx;
    var tx={};TEXTS.forEach(function(t){var x=v('t_'+t[0]);if(x)tx[t[0]]=x});
    if(Object.keys(tx).length)draft.settings.texts=tx;else delete draft.settings.texts;
    save();flash('Saved. Press Publish at the top when you want it live.');renderApp();return;
  }
});
app.addEventListener('change',function(e){
  var t=e.target;
  if(t.id==='st-page'){ui.pv=t.value;renderStudio();return}
  if(t.id==='an-days'){A.days=+t.value;loadAnalysis();return}
  if(t.id==='u-st'){U.st=t.value;renderApp();return}
  if(t.id==='u-sort'){U.sort=t.value;renderApp();return}
  if(t.id==='f-sort'){F.sort=t.value;renderApp();return}
  if(t.id==='o-st'){O.st=t.value;renderApp();return}
  if(t.id==='o-sort'){O.sort=t.value;renderApp();return}
  var s=t.closest&&t.closest('.u-role');if(s){uAct(uApi('admin_set_role',{uid:s.dataset.id,new_role:s.value}),'Access updated.');return}
  if(t.id==='imp'&&t.files&&t.files[0]){
    var r=new FileReader();
    r.onload=function(){
      try{
        var s2=String(r.result),a=s2.indexOf('{'),b=s2.lastIndexOf('}');
        var obj=JSON.parse(s2.slice(a,b+1));
        if(!obj||typeof obj!=='object'||(obj.lists&&typeof obj.lists!=='object'))throw 0;
        var clean={v:1,lists:{},settings:(obj.settings&&typeof obj.settings==='object')?obj.settings:{}};
        Object.keys(obj.lists||{}).forEach(function(k){if(Array.isArray(obj.lists[k])&&COLS.some(function(c){return c.id===k}))clean.lists[k]=obj.lists[k]});
        draft=clean;save();flash('Loaded and saved as your changes.');
      }catch(x){flash('That file could not be read. Use a site-data.js made by this panel.','err')}
      renderApp();
    };
    r.readAsText(t.files[0]);
  }
});

view();
})();
