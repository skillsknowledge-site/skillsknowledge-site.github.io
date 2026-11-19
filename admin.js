/* SK admin panel.
   Who may open it is decided by Supabase, not by this page: you sign in with Google (or email), and the server
   answers "admin_whoami" only for accounts in the admins table. There is no password or key inside this file.
   - The owner is stored on the server and cannot be removed, blocked or replaced by any other admin.
   - Site edits are saved as a DRAFT in this browser. Visitors see them after you publish: download site-data.js
     from the Publish tab and upload it to the website in place of the old one. */
(function(){
'use strict';
var SK=window.SK,store=SK.store;
var app=document.getElementById('app'),acts=document.getElementById('top-actions');
var SESSION_MS=60*60*1000,LAST_KEY='sk-admin-last-dl',HERE='ctl-k7q2x9m4.html';
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


/* ---------------- sign-in state ---------------- */
var ME=null; /* {is_owner,name,email} once Supabase has confirmed that this account is an admin */
function startSession(){store.put(SK.SESSION_KEY,{exp:Date.now()+SESSION_MS})}
function endSession(){store.del(SK.SESSION_KEY)}
var lastTouch=0;
function touch(){if(!ME)return;var n=Date.now();if(n-lastTouch<20000)return;lastTouch=n;startSession()}
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
    label();sel.parentNode.insertBefore(btn,sel.nextSibling);
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
var ui={tab:'overview',col:'home:svc-list',edit:null,msg:null};
function flash(text,kind){ui.msg={text:text,kind:kind||'ok'};}
function msgHtml(){var m=ui.msg;ui.msg=null;return m?'<p class="ad-msg '+m.kind+'" role="status">'+esc(m.text)+'</p>':''}
function rerender(){if(app.dataset.view==='app')renderApp()}


/* ---------------- views ---------------- */
function uApi(fn,body){var S=window.skUser;if(!S)return Promise.reject({status:0,message:'nosupabase'});
  return S.token().then(function(t){if(!t)throw {status:401,message:'noauth'};return S.api('/rest/v1/rpc/'+fn,{method:'POST',token:t,body:body||{}})})}
function view(){
  acts.innerHTML='';ME=null;
  var C=window.SK_CFG;
  if(!(C&&C.url&&C.anon)){gateView('nocfg');return}
  if(!window.skUser){gateView('error','The sign-in code did not load. Refresh the page.');return}
  uApi('admin_whoami').then(function(me){
    ME=me;startSession();if(!draft)loadDraft();
    app.dataset.view='app';document.body.dataset.v='app';renderApp();
  },function(e){
    endSession();draft=null;var m=e&&e.message||'';
    gateView(e&&e.message==='noauth'||e&&e.status===401?'login':e&&e.status===404?'nosql':e&&(e.status===403||/not allowed/i.test(m))?'denied':'error',m);
  });
}
function gateView(kind,msg){
  app.dataset.view='gate';document.body.dataset.v='gate';acts.innerHTML='';
  var T={login:['Admin sign-in','Only the site owner and approved admins can open this panel.'],
   denied:['Not an admin','This account is not allowed here. Sign in with an admin account instead.'],
   nosql:['Almost ready','The owner tools are not installed yet. Run supabase-owner.sql in the Supabase SQL Editor, then refresh this page.'],
   nocfg:['Not connected','Supabase is not connected. Fill in config.js first.'],
   error:['Could not check','Something went wrong while checking your account. '+(msg||'')]}[kind];
  var G='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.51 5.51 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"/></svg>';
  var signin=kind==='login'||kind==='denied';
  app.innerHTML='<div class="gate"><h1>'+T[0]+'</h1><p>'+esc(T[1])+'</p>'+
    (signin?'<button class="g-btn" type="button" id="g-google">'+G+'<span>Continue with Google</span></button><a class="g-alt" href="#" id="g-mail">Use email and password instead</a>'+(kind==='denied'?'<a class="g-alt" href="#" id="g-out">Sign out</a>':''):'<button class="g-btn" type="button" id="g-retry"><span>Try again</span></button>')+'</div>';
  function remember(){try{localStorage.setItem('sk_after',JSON.stringify({p:HERE,t:Date.now()}))}catch(e){}}
  var g=$('#g-google'),m=$('#g-mail'),o=$('#g-out'),r=$('#g-retry');
  if(g)g.addEventListener('click',function(){remember();var C=window.SK_CFG;
    location.href=C.url.replace(/\/+$/,'')+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(location.origin+location.pathname.replace(/[^\/]*$/,''))});
  if(m)m.addEventListener('click',function(e){e.preventDefault();remember();location.href='login'});
  if(o)o.addEventListener('click',function(e){e.preventDefault();window.skUser.signOut(false)});
  if(r)r.addEventListener('click',view);
}
/* an admin who is removed, or signs out in another tab, is sent back to the gate within a minute */
setInterval(function(){if(app.dataset.view==='app'&&!document.hidden)uApi('admin_whoami').then(function(me){ME=me},function(e){if(e&&e.status!==0&&e.message!=='nosupabase'&&!/Failed to fetch|NetworkError/i.test(e.message||''))view()})},60000);

/* ---------------- logged-in app ---------------- */
var NAVI={"analysis": "<path d=\"M4 20V10M10 20V4M16 20v-8M22 20H2\"/>", "feedback": "<path d=\"M4 4h16v12H8l-4 4z\"/>", "orders": "<path d=\"M6 3h12l2 5v12H4V8z\"/><path d=\"M4 8h16M9 12h6\"/>", "users": "<circle cx=\"9\" cy=\"8\" r=\"3.2\"/><path d=\"M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6\"/><circle cx=\"17\" cy=\"9\" r=\"2.6\"/><path d=\"M16 14.2c3 .1 5 2 5 5.3\"/>", "overview": "<path d=\"M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z\"/>", "content": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"6\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"18\" height=\"6\" rx=\"1\"/>", "pages": "<path d=\"M6 3h8l4 4v14H6z\"/><path d=\"M14 3v4h4\"/>", "settings": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2\"/>", "publish": "<path d=\"M12 16V4M7 9l5-5 5 5M4 20h16\"/>", "admins": "<path d=\"M12 3l8 3v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z\"/><path d=\"M8.6 12.2l2.4 2.4 4.4-4.8\"/>"};

/* ---------------- users (needs Supabase + supabase-admin.sql and supabase-owner.sql) ---------------- */
var U={state:'idle',list:[],q:'',open:null,err:''};
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
  var L=U.list.filter(function(x){return !q||[x.email,x.username,x.display_name,x.phone].join(' ').toLowerCase().indexOf(q)>-1});
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
function stateCard(h,state,err,what,retry){
  what=what||'This page';
  var msgs={nosql:what+' is not installed yet. Run supabase-admin.sql and supabase-owner.sql in the Supabase SQL Editor.',notadmin:'This account is not an admin.',error:'Could not load '+what.toLowerCase()+'. '+esc(err),loading:'Loading…',idle:'Loading…'};
  if(state==='noauth')return h+'<div class="ad-card"><h2>Sign in again</h2><p>Your sign-in ended. Refresh this page and continue with Google.</p></div>';
  var wait=state==='loading'||state==='idle';
  return h+'<div class="ad-card">'+(wait?'<p class="ad-muted">Loading…</p>':'<p class="ad-msg warn">'+msgs[state]+'</p><div class="ad-btns"><button class="btn btn-solid btn-sm" type="button" data-act="'+retry+'">Try again</button></div>')+'</div>';
}
function tabUsers(){
  var h='<div class="ad-head"><div><h1>Users</h1><p class="ad-muted">People who signed up on your website. Block someone to stop them logging in, or change what they can access.</p></div></div>';
  if(U.state==='idle'){loadUsers();return stateCard(h,'loading')}
  if(U.state!=='ready')return stateCard(h,U.state,U.err,'The user list','u-refresh');
  var tot=U.list.length,bl=U.list.filter(function(x){return x.blocked}).length,on=U.list.filter(isOnline).length,ad=U.list.filter(function(x){return x.is_admin}).length;
  return h+'<div class="ad-kpis">'+[['Total users',tot],['Online now',on],['Blocked',bl],['Admins',ad]].map(function(k){return '<div class="ad-kpi"><div><span>'+k[0]+'</span><b>'+k[1]+'</b></div></div>'}).join('')+'</div>'+
    '<div class="ad-card"><div class="u-bar"><input id="u-q" type="text" placeholder="Search by name, username, email or phone" value="'+esc(U.q)+'" aria-label="Search users"><button class="btn btn-solid btn-sm" type="button" data-act="u-refresh">Refresh</button></div>'+
    '<div class="ad-tablewrap"><table class="ad-table u-table"><thead><tr><th>User</th><th>Email</th><th>Joined</th><th>Status</th><th>Access</th><th></th></tr></thead><tbody id="u-body">'+uRows()+'</tbody></table></div>'+
    '<p class="ad-muted note">Access: <b>Member</b> is a normal account. <b>Trusted</b> and <b>Editor</b> are extra levels you can use to unlock members-only parts of the site. Blocking takes effect at once for logging in.</p></div>';
}
function uAct(p,ok){return p.then(function(){flash(ok);return loadUsersQuiet()},function(e){flash(e.message||'Something went wrong.','err');renderApp()})}

/* ---------------- analysis + orders (need the extra part of supabase-admin.sql) ---------------- */
var A={days:30,state:'idle',d:null,err:''},O={state:'idle',list:[],err:''};
function pct(c,p){if(!p)return c?'<span class="an-up">&#9650; new</span>':'<span class="an-flat">-</span>';var v=Math.round((c-p)/p*100);return '<span class="'+(v>=0?'an-up':'an-down')+'">'+(v>=0?'&#9650; ':'&#9660; ')+Math.abs(v)+'%</span>'}
function dur(s){s=Math.round(s||0);var m=Math.floor(s/60);return m+'M '+('0'+(s%60)).slice(-2)+'S'}
function loadAnalysis(){A.state='loading';renderApp();uApi('admin_analytics',{p_days:A.days}).then(function(r){A.d=r;A.state='ready';renderApp()},function(e){A.state=(e.status===404?'nosql':'error');A.err=e.message||'';renderApp()})}
function chart(daily){
  if(!daily||!daily.length)return '<p class="ad-muted">No visits in this period yet.</p>';
  var W=640,H=220,P=34,n=daily.length,mx=Math.max(4,Math.max.apply(null,daily.map(function(x){return x.sessions})));mx=Math.ceil(mx/4)*4;
  function X(i){return P+(n<2?0:i*(W-P-8)/(n-1))}function Y(v){return H-24-v*(H-44)/mx}
  var pts=daily.map(function(x,i){return X(i)+','+Y(x.sessions)}),line='M'+pts.join(' L'),area=line+' L'+X(n-1)+','+(H-24)+' L'+X(0)+','+(H-24)+' Z',g='';
  for(var k=0;k<=4;k++){var v=mx/4*k;g+='<line x1="'+P+'" x2="'+W+'" y1="'+Y(v)+'" y2="'+Y(v)+'" class="an-grid"/><text x="'+(P-6)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+Math.round(v)+'</text>'}
  var lab=[0,Math.floor((n-1)/2),n-1].filter(function(v,i,a){return a.indexOf(v)===i&&daily[v]}).map(function(i){return '<text x="'+X(i)+'" y="'+(H-6)+'" text-anchor="middle">'+daily[i].day.slice(5)+'</text>'}).join('');
  return '<svg class="an-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Sessions over time">'+g+'<path d="'+area+'" class="an-area"/><path d="'+line+'" class="an-line"/>'+lab+'</svg>';
}
function tabAnalysis(){
  var h='<div class="ad-head"><h1>Analysis</h1><p class="ad-muted">Visits and time spent on your website.</p></div>';
  if(A.state==='idle'){loadAnalysis();return h+'<div class="ad-card"><p class="ad-muted">Loading…</p></div>'}
  if(A.state==='loading')return h+'<div class="ad-card"><p class="ad-muted">Loading…</p></div>';
  if(A.state!=='ready')return h+'<div class="ad-card"><p class="ad-msg warn">'+(A.state==='nosql'?'Analytics is not installed yet. Run supabase-admin.sql again in the Supabase SQL Editor.':(A.err==='noauth'?'Log in on the website with your admin Google account first, then try again.':'Could not load analytics. '+esc(A.err)))+'</p><div class="ad-btns" style="justify-content:flex-start"><button class="btn btn-solid btn-sm" type="button" data-act="a-refresh">Try again</button></div></div>';
  var d=A.d,cards=[['Total Site Sessions',d.sessions,pct(d.sessions,d.prev_sessions),'a'],['Unique Visitors',d.visitors,pct(d.visitors,d.prev_visitors),'b'],['Average Session Duration',dur(d.avg_seconds),pct(d.avg_seconds,d.prev_avg_seconds),'c']];
  var pages=(d.pages||[]).map(function(p){return '<tr><td>'+esc(p.page)+'</td><td>'+p.views+'</td><td>'+(p.avg_seconds?dur(p.avg_seconds):'-')+'</td></tr>'}).join('')||'<tr><td colspan="3" class="ad-muted">No visits yet.</td></tr>';
  return h+'<div class="ad-card an"><div class="an-top"><h2>Traffic Overview</h2><select id="an-days" data-dd aria-label="Date range">'+[[7,'Last 7 Days'],[30,'Last 30 Days'],[90,'Last 90 Days']].map(function(o){return '<option value="'+o[0]+'"'+(A.days===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></div>'+
    '<div class="an-stats">'+cards.map(function(c){return '<div class="an-stat an-'+c[3]+'"><span>'+c[0]+'</span><b>'+c[1]+'</b>'+c[2]+'</div>'}).join('')+'</div>'+
    '<h3 class="an-sub">Traffic over Time</h3>'+chart(d.daily||[])+'</div>'+
    '<div class="ad-card"><h2>Top pages</h2><div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Page</th><th>Views</th><th>Avg. time</th></tr></thead><tbody>'+pages+'</tbody></table></div></div>'+
    '<div class="ad-card"><h2>Ratings</h2><p class="ad-muted">Product ratings will show here when the rating feature is added to your products.</p></div>';
}
function loadOrders(){O.state='loading';renderApp();uApi('admin_list_orders').then(function(r){O.list=r||[];O.state='ready';renderApp()},function(e){O.state=(e.status===404?'nosql':'error');O.err=e.message||'';renderApp()})}
function tabOrders(){
  var h='<div class="ad-head"><h1>Orders</h1><p class="ad-muted">Orders placed from the Buy now page. Mark them paid once you have checked the payment.</p></div>';
  if(O.state==='idle'){loadOrders();return h+'<div class="ad-card"><p class="ad-muted">Loading…</p></div>'}
  if(O.state==='loading')return h+'<div class="ad-card"><p class="ad-muted">Loading…</p></div>';
  if(O.state!=='ready')return h+'<div class="ad-card"><p class="ad-msg warn">'+(O.state==='nosql'?'Orders are not installed yet. Run supabase-admin.sql again in the Supabase SQL Editor.':(O.err==='noauth'?'Log in on the website with your admin Google account first, then try again.':'Could not load orders. '+esc(O.err)))+'</p><div class="ad-btns" style="justify-content:flex-start"><button class="btn btn-solid btn-sm" type="button" data-act="o-refresh">Try again</button></div></div>';
  var paid=O.list.filter(function(o){return o.status==='paid'}),sum=paid.reduce(function(a,o){return a+o.amount},0);
  var rows=O.list.map(function(o){return '<tr><td>#'+o.id+'</td><td><b>'+esc(o.name)+'</b><span>'+esc(o.email)+(o.phone?' · '+esc(o.phone):'')+'</span></td><td>'+esc(o.item)+'<span>'+esc(o.plan)+'</span></td><td>PKR '+Number(o.amount).toLocaleString('en-US')+'</td><td>'+esc(o.method)+(o.reference?'<span>'+esc(o.reference)+'</span>':'')+'</td><td><em class="chip'+(o.status==='paid'?' ok':o.status==='cancelled'?' danger':'')+'">'+esc(o.status)+'</em></td><td class="u-act">'+(o.status!=='paid'?'<button class="ad-link" type="button" data-act="o-set" data-id="'+o.id+'" data-s="paid">Mark paid</button> ':'')+(o.status!=='cancelled'?'<button class="ad-link u-danger" type="button" data-act="o-set" data-id="'+o.id+'" data-s="cancelled">Cancel</button>':'')+'</td></tr>'}).join('')||'<tr><td colspan="7" class="ad-muted">No orders yet.</td></tr>';
  return h+'<div class="ad-kpis">'+[['Orders',O.list.length],['Paid',paid.length],['Pending',O.list.filter(function(o){return o.status==='pending'}).length],['Paid total','PKR '+sum.toLocaleString('en-US')]].map(function(k){return '<div class="ad-kpi"><div><span>'+k[0]+'</span><b>'+k[1]+'</b></div></div>'}).join('')+'</div>'+
    '<div class="ad-card"><div class="ad-tablewrap"><table class="ad-table u-table"><thead><tr><th>Order</th><th>Customer</th><th>Item</th><th>Amount</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
/* ---------------- feedback: comments, complaints and appeals ---------------- */
var F={state:'idle',list:[],ap:[],err:'',kind:'all',reply:null};
function starsHtml(n){var o='';for(var i=1;i<=5;i++)o+='<svg viewBox="0 0 24 24" class="'+(i<=n?'on':'')+'" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4L2.8 9.3l6.4-.8z"/></svg>';return '<span class="fb-stars" role="img" aria-label="'+n+' out of 5">'+o+'</span>'}
function loadFeedback(quiet){
  if(!quiet){F.state='loading';renderApp()}
  Promise.all([uApi('admin_list_feedback'),uApi('admin_list_appeals').catch(function(){return []})]).then(function(r){F.list=r[0]||[];F.ap=r[1]||[];F.state='ready';renderApp()},
    function(e){F.state=(e.status===404?'nosql':(e.message==='noauth'?'noauth':'error'));F.err=e.message||'';renderApp()});
}
function fbCard(f){
  var mail='mailto:'+encodeURIComponent(f.email)+'?subject='+encodeURIComponent('Re: your '+f.kind+' on SkillsKnowledge');
  return '<article class="fb'+(f.status==='done'?' done':'')+'"><header><em class="chip '+(f.kind==='complaint'?'danger':'ok')+'">'+esc(f.kind)+'</em>'+(f.rating?starsHtml(f.rating):'')+'<span class="fb-from">'+esc(f.email)+'</span><span class="fb-date">'+esc(uAgo(f.created_at))+'</span><em class="chip'+(f.status==='done'?' ok':f.status==='read'?'':' warn')+'">'+esc(f.status==='new'?'New':f.status==='read'?'Read':'Done')+'</em></header>'+
    '<p class="fb-msg">'+esc(f.message)+'</p>'+
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
  if(F.kind==='appeal')body=F.ap.length?'<div class="u-appeals">'+F.ap.map(appealCard).join('')+'</div>':'<p class="ad-muted">No appeals yet.</p>';
  else{var shown=F.list.filter(function(f){return F.kind==='all'||f.kind===F.kind});body=shown.length?'<div class="fb-list">'+shown.map(fbCard).join('')+'</div>':'<p class="ad-muted">Nothing here yet.</p>'}
  return h+'<div class="ad-kpis">'+[['Comments',cm.length],['Average rating',avg],['Complaints',cp.length],['Open appeals',openAp]].map(function(k){return '<div class="ad-kpi"><div><span>'+k[0]+'</span><b>'+k[1]+'</b></div></div>'}).join('')+'</div>'+
    '<div class="ad-card"><div class="seg" role="tablist" aria-label="Show">'+segs.map(function(s){return '<button type="button" role="tab" data-act="f-kind" data-v="'+s[0]+'"'+(F.kind===s[0]?' aria-current="true"':'')+'>'+s[1]+'<i>'+s[2]+'</i></button>'}).join('')+'</div>'+body+'</div>';
}
function fbMenu(btn,id){
  var f=F.list.filter(function(x){return x.id===id})[0];if(!f)return;
  var it=[];
  if(f.status==='new')it.push({v:'read',t:'Mark as read'});
  if(f.status!=='done')it.push({v:'done',t:'Mark as done'});else it.push({v:'new',t:'Reopen as new'});
  it.push({v:'copy',t:'Copy email address'},{v:'del',t:'Delete',danger:true});
  pop(btn,it,function(v){
    if(v==='copy'){(navigator.clipboard?navigator.clipboard.writeText(f.email):Promise.reject()).then(function(){flash('Email address copied.');renderApp()},function(){flash(f.email);renderApp()});return}
    if(v==='del'){ask('Delete this message for good?','Delete',true).then(function(ok){if(ok)uApi('admin_delete_feedback',{p_id:id}).then(function(){flash('Deleted.');loadFeedback(true)},function(e){flash(e.message||'Failed.','err');renderApp()})});return}
    uApi('admin_set_feedback',{p_id:id,p_status:v}).then(function(){loadFeedback(true)},function(e){flash(e.message||'Failed.','err');renderApp()});
  });
}
var TABS=[['overview','Overview'],['analysis','Analysis'],['orders','Orders'],['feedback','Feedback'],['content','Content'],['pages','Pages and sections'],['users','Users'],['settings','Settings'],['publish','Publish'],['admins','Owner and admins']];
function goTab(t){
  ui.tab=t;ui.edit=null;
  if((t==='users'||t==='admins')&&U.state!=='ready')U.state='idle';
  renderApp();
}
function renderApp(){
  acts.innerHTML='<a class="btn btn-ghost btn-sm" href="index.html">Preview site</a><button class="btn btn-solid btn-sm" type="button" data-act="publish" title="Choose where to save the file that makes your changes live">Publish'+(dirty()?' •':'')+'</button><button class="btn btn-ghost btn-sm" type="button" data-act="logout">Log out</button>';
  var nav='<aside class="ad-nav" aria-label="Admin sections"><div class="ad-brand"><b>SK</b><span>Control</span></div>'+
    '<p class="ad-me">'+esc(ME.name||'Admin')+VB+'<em>'+(ME.is_owner?'Owner':'Admin')+'</em></p>'+
    TABS.map(function(t){return '<button type="button" data-tab="'+t[0]+'"'+(ui.tab===t[0]?' aria-current="true"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+NAVI[t[0]]+'</svg><span>'+t[1]+'</span>'+(t[0]==='publish'&&dirty()?'<em>•</em>':'')+'</button>'}).join('')+'</aside>';
  var h=nav+'<div class="ad-main">'+msgHtml()+({overview:tabOverview,content:tabContent,pages:tabPages,users:tabUsers,analysis:tabAnalysis,orders:tabOrders,feedback:tabFeedback,settings:tabSettings,publish:tabPublish,admins:tabAdmins})[ui.tab]()+'</div>';
  app.innerHTML='<div class="ad-shell">'+h+'</div>';
  enhance(app);
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
  }).join(''):'<p class="ad-muted">Nothing here yet. Use "Add new".</p>')+'</div>';
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
  var xfer=ads.length?'<div class="ad-card"><h2>Hand over ownership</h2><p>Choose an admin to become the new owner. You stay an admin but lose the owner rights, and only the new owner could give them back.</p>'+
    '<div class="ad-row2"><select id="x-to" data-dd aria-label="New owner">'+ads.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(nameOf(x))+' ('+esc(x.email)+')</option>'}).join('')+'</select><button class="btn btn-danger btn-sm" type="button" data-act="x-owner">Hand over ownership</button></div></div>':'';
  return h+owner+'<div class="ad-card"><h2>Admins</h2><div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Admin</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'+xfer;
}

/* ---------------- events ---------------- */
function onClick(e){
  var t=e.target.closest('[data-tab],[data-col],[data-act]');if(!t)return;
  if(t.dataset.tab){goTab(t.dataset.tab);return}
  if(t.dataset.col&&!t.dataset.act){ui.col=t.dataset.col;ui.edit=null;renderApp();return}
  var a=t.dataset.act,i=+t.dataset.i,c=COLS.filter(function(x){return x.id===ui.col})[0]||COLS[0];
  if(a==='logout'){endSession();draft=null;ME=null;window.skUser.signOut(false);return}
  if(a==='add'){ui.edit=listOf(c.id).length;renderApp();return}
  if(a==='edit'){ui.edit=i;renderApp();return}
  if(a==='cancel'){ui.edit=null;renderApp();return}
  if(a==='sg'){var ti=$('#f_type');if(ti){ti.value=t.dataset.v;ti.focus()}return}
  if(a==='up'||a==='down'){editList(c.id,function(L){var j=a==='up'?i-1:i+1;if(j<0||j>=L.length)return;var x=L[i];L[i]=L[j];L[j]=x});renderApp();return}
  if(a==='toggle'){editList(c.id,function(L){if(L[i]._off)delete L[i]._off;else L[i]._off=true});renderApp();return}
  if(a==='del'){ask('Delete "'+titleOf(listOf(c.id)[i])+'"? You can bring everything back with "Reset to defaults".','Delete',true).then(function(ok){if(ok){editList(c.id,function(L){L.splice(i,1)});flash('Deleted and saved.');renderApp()}});return}
  if(a==='reset-col'){ask('Reset "'+c.label+'" to the original content?','Reset',true).then(function(ok){if(ok){delete draft.lists[c.id];save();flash('Reset to defaults.');renderApp()}});return}
  if(a==='publish'){publish();return}
  if(a==='discard'){ask('Discard your saved changes and go back to the published version?','Discard',true).then(function(ok){if(ok){store.del(SK.DRAFT_KEY);draft=null;loadDraft();flash('Changes discarded.');renderApp()}});return}
  if(a==='u-refresh'){loadUsers();return}
  if(a==='a-refresh'){loadAnalysis();return}
  if(a==='o-refresh'){loadOrders();return}
  if(a==='f-refresh'){loadFeedback();return}
  if(a==='f-kind'){F.kind=t.dataset.v;F.reply=null;renderApp();return}
  if(a==='f-reply'){F.reply=t.dataset.id?+t.dataset.id:null;renderApp();var ta=$('#f-text');if(ta)ta.focus();return}
  if(a==='f-mail'){var tx=$('#f-text');t.href=t.href.split('&body=')[0]+'&body='+encodeURIComponent(tx?tx.value:'');return}
  if(a==='f-menu'){e.stopPropagation();fbMenu(t,+t.dataset.id);return}
  if(a==='o-set'){uApi('admin_set_order',{p_id:+t.dataset.id,p_status:t.dataset.s}).then(function(){flash('Order updated.');loadOrders()},function(er){flash(er.message||'Failed.','err');renderApp()});return}
  if(a==='u-open'){U.open=U.open===t.dataset.id?null:t.dataset.id;renderApp();return}
  if(a==='u-block'){var f=t.dataset.flag==='1',id=t.dataset.id;(f?ask('Block this person? They will not be able to log in.','Block',true):Promise.resolve(true)).then(function(ok){if(ok)uAct(uApi('admin_set_blocked',{uid:id,flag:f}),f?'User blocked.':'User unblocked.')});return}
  if(a==='u-appeal-ok'){var aid=+t.dataset.id,au=t.dataset.uid;ask('Unblock this person and close their appeal?','Unblock').then(function(ok){if(ok)uApi('admin_set_blocked',{uid:au,flag:false}).then(function(){return uApi('admin_close_appeal',{aid:aid})}).then(function(){flash('Unblocked. Appeal closed.');loadUsersQuiet().catch(function(){});loadFeedback(true)},function(er){flash(er.message||'Failed.','err');renderApp()})});return}
  if(a==='u-appeal-no'){var rid=+t.dataset.id;ask('Reject this appeal? The person stays blocked.','Reject',true).then(function(ok){if(ok)uApi('admin_close_appeal',{aid:rid}).then(function(){flash('Appeal rejected.');loadFeedback(true)},function(er){flash(er.message||'Failed.','err');renderApp()})});return}
  if(a==='u-admin'){var g=t.dataset.flag==='1',gid=t.dataset.id;ask(g?'Give this person full admin rights?':'Remove this person\'s admin rights?',g?'Make admin':'Remove',!g).then(function(ok){if(ok)uAct(uApi('admin_set_admin',{uid:gid,flag:g}),g?'Admin rights given.':'Admin rights removed.')});return}
  if(a==='x-owner'){var to=$('#x-to').value;ask('Hand over ownership? You will stay an admin, but only the new owner can give ownership back.','Hand over',true).then(function(ok){if(ok)uApi('admin_transfer_owner',{uid:to}).then(function(){U.state='idle';flash('Ownership handed over.');view()},function(er){flash(er.message||'Failed.','err');renderApp()})});return}
  if(a==='goto-col'){ui.tab='content';ui.col=t.dataset.col;ui.edit=null;renderApp();return}
}
app.addEventListener('click',onClick);
acts.addEventListener('click',onClick);
app.addEventListener('input',function(e){if(e.target.id==='u-q'){U.q=e.target.value;var b=$('#u-body');if(b)b.innerHTML=uRows();enhance(app)}});
app.addEventListener('submit',function(e){
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
  if(t.id==='an-days'){A.days=+t.value;loadAnalysis();return}
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
