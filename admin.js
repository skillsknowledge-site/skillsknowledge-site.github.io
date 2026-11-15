/* SK admin panel.
   Honest limits (this site has no server):
   - Your login is checked in the browser against a one-way hash stored in admin-config.js. Your email, username and
     password are never stored, only the hash made from all three. Nobody can turn the hash back into the password.
   - Changes are saved as a DRAFT in this browser. Visitors only see them after you publish: download site-data.js
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

/* ---------------- crypto: PBKDF2-SHA256 over email + username + password ---------------- */
function stars(){var h='';for(var i=0;i<9;i++)h+='<span class="st" style="left:'+((i*11+6)%96)+'%;top:'+((i*37+10)%70+6)+'px;animation-delay:'+(i*.27)+'s;font-size:'+(9+i%3*4)+'px">✦</span>';return h}
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

/* ---------------- session ---------------- */
function loggedIn(){return SK.admin()}
function startSession(){store.put(SK.SESSION_KEY,{exp:Date.now()+SESSION_MS})}
function endSession(){store.del(SK.SESSION_KEY)}
var lastTouch=0;
function touch(){
  if(!loggedIn())return;var n=Date.now();if(n-lastTouch<20000)return;lastTouch=n;startSession();
}
['click','keydown'].forEach(function(e){document.addEventListener(e,touch,true)});
setInterval(function(){if(app.dataset.view==='app'&&!loggedIn()){view()}},15000);

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

var TEXTS=[['pill','Top pill (home)','text'],['lead','Intro paragraph (home)','area'],['badge','Experience badge (home)','text'],['statsTitle','Abilities title','text'],['statYearsValue','Stat 2 number','text'],['statYearsLabel','Stat 2 label','text'],['statGradeValue','Stat 3 number','text'],['statGradeLabel','Stat 3 label','text']];
var PAGES=[['about','About page','about.html'],['video','Video page','video.html'],['graphics','Graphics page','graphics.html'],['code','Code page','code.html'],['login','Login and sign-up page','login.html']];
var SECTIONS=[['stats','Abilities numbers'],['services','Services (skills list)'],['about','About card'],['skills','Tools I reach for'],['wyg','Fast to load / tidy hand-over'],['work','Projects (Work)'],['process','How a project runs'],['journal','Users Common Questions'],['contact','Feedback']];

/* ---------------- UI state ---------------- */
var ui={tab:'overview',col:'home:svc-list',edit:null,msg:null,setup:null};
function flash(text,kind){ui.msg={text:text,kind:kind||'ok'};}
function msgHtml(){var m=ui.msg;ui.msg=null;return m?'<p class="ad-msg '+m.kind+'" role="status">'+esc(m.text)+'</p>':''}
function rerender(){if(app.dataset.view==='app')renderApp()}

/* ---------------- views ---------------- */
function view(){
  acts.innerHTML='';document.body.dataset.v='login';
  if(!HAS_CRYPTO){app.dataset.view='nocrypto';app.innerHTML='<div class="ad-card ad-narrow"><h1>Secure context needed</h1><p>The admin login needs your browser\'s crypto tools, which only work on https:// addresses, localhost or a file opened directly. Open this page from your https site or from the downloaded folder.</p></div>';return}
  if(!CFG||!CFG.hash){setupView();return}
  if(!loggedIn()){loginView();return}
  if(!draft)loadDraft();
  app.dataset.view='app';document.body.dataset.v='app';renderApp();
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
  app.dataset.view='forgot';document.body.dataset.v='login';
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
        if(!st.key)return;app.dataset.view='setup';document.body.dataset.v='setup';ui.setup=null;setupForm(app,false);
      });
    });
  }
  stepKey();
}

/* ---------------- logged-in app ---------------- */
var NAVI={"users": "<circle cx=\"9\" cy=\"8\" r=\"3.2\"/><path d=\"M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6\"/><circle cx=\"17\" cy=\"9\" r=\"2.6\"/><path d=\"M16 14.2c3 .1 5 2 5 5.3\"/>", "overview": "<path d=\"M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z\"/>", "content": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"6\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"18\" height=\"6\" rx=\"1\"/>", "pages": "<path d=\"M6 3h8l4 4v14H6z\"/><path d=\"M14 3v4h4\"/>", "settings": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2\"/>", "publish": "<path d=\"M12 16V4M7 9l5-5 5 5M4 20h16\"/>", "security": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"1\"/><path d=\"M8 11V8a4 4 0 018 0v3\"/>"};

/* ---------------- users (needs Supabase + supabase-admin.sql) ---------------- */
var U={state:'idle',list:[],q:'',open:null,err:''};
function uApi(fn,body){var S=window.skUser;if(!S)return Promise.reject({status:0,message:'nosupabase'});
  return S.token().then(function(t){if(!t)throw {status:401,message:'noauth'};return S.api('/rest/v1/rpc/'+fn,{method:'POST',token:t,body:body||{}})})}
function loadUsers(){
  if(!(window.SK_CFG&&window.SK_CFG.url&&window.SK_CFG.anon)){U.state='nocfg';renderApp();return}
  U.state='loading';renderApp();
  var done=false,timer=setTimeout(function(){if(done)return;done=true;U.state='error';U.err='The server did not answer. Make sure supabase-admin.sql was run, then refresh this page (Ctrl+Shift+R).';renderApp()},12000);
  function fin(fn){if(done)return;done=true;clearTimeout(timer);try{fn()}catch(x){U.state='error';U.err=String(x&&x.message||x);try{renderApp()}catch(y){}}}
  uApi('admin_list_users').then(function(r){fin(function(){U.list=r||[];U.state='ready';renderApp()})},function(e){
    fin(function(){U.state=e.message==='noauth'?'noauth':(e.status===404?'nosql':(e.status===401||e.status===403||/not allowed/i.test(e.message)?'notadmin':'error'));U.err=(e.message||'')+(e.status?' ('+e.status+')':'');renderApp()})});
}
function uWhen(d){try{return d?new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Never'}catch(e){return ''}}
function uRows(){
  var q=U.q.trim().toLowerCase();
  var L=U.list.filter(function(x){return !q||[x.email,x.username,x.display_name,x.phone].join(' ').toLowerCase().indexOf(q)>-1});
  if(!L.length)return '<tr><td colspan="6" class="ad-muted">No users match.</td></tr>';
  return L.map(function(x){
    var n=x.display_name||(x.email||'').split('@')[0]||'User',open=U.open===x.id;
    return '<tr><td><b>'+esc(n)+(x.is_admin?' <em class="chip big">Admin</em>':'')+'</b><span>'+(x.username?'@'+esc(x.username):'No username yet')+'</span></td><td>'+esc(x.email)+'</td><td>'+esc(uWhen(x.created_at))+'</td>'+
      '<td>'+(x.blocked?'<em class="chip danger">Blocked</em>':'<em class="chip ok">Active</em>')+'</td>'+
      '<td><select class="u-role" data-id="'+esc(x.id)+'" aria-label="Access for '+esc(n)+'"'+(x.is_admin?' disabled':'')+'>'+['member','trusted','editor'].map(function(r){return '<option value="'+r+'"'+(x.role===r?' selected':'')+'>'+r.charAt(0).toUpperCase()+r.slice(1)+'</option>'}).join('')+'</select></td>'+
      '<td class="u-act"><button class="ad-link" type="button" data-act="u-open" data-id="'+esc(x.id)+'">'+(open?'Hide':'Details')+'</button> <button class="ad-link'+(x.blocked?'':' u-danger')+'" type="button" data-act="u-block" data-id="'+esc(x.id)+'" data-flag="'+(x.blocked?'0':'1')+'">'+(x.blocked?'Unblock':'Block')+'</button></td></tr>'+
      (open?'<tr class="u-det"><td colspan="6"><dl><dt>Phone</dt><dd>'+esc(x.phone||'Not given')+'</dd><dt>Location</dt><dd>'+esc(x.location||'Not given')+'</dd><dt>Website</dt><dd>'+esc(x.website||'Not given')+'</dd><dt>Bio</dt><dd>'+esc(x.bio||'Not given')+'</dd><dt>Signed in with</dt><dd>'+esc(x.provider||'')+'</dd><dt>Last sign-in</dt><dd>'+esc(uWhen(x.last_sign_in_at))+'</dd><dt>User ID</dt><dd>'+esc(x.id)+'</dd></dl>'+
        '<button class="ad-link" type="button" data-act="u-admin" data-id="'+esc(x.id)+'" data-flag="'+(x.is_admin?'0':'1')+'">'+(x.is_admin?'Remove admin rights':'Make admin')+'</button></td></tr>':'');
  }).join('');
}
function tabUsers(){
  var h='<div class="ad-head"><h1>Users</h1><p class="ad-muted">People who signed up on your website. Block someone to stop them logging in, or change what they can access.</p></div>';
  var msgs={nocfg:'Supabase is not connected. Fill in config.js first.',nosql:'The admin tools are not installed yet. Run supabase-admin.sql in the Supabase SQL Editor.',
    notadmin:'This Google account is not an admin. Run supabase-admin.sql with your email, then log in again.',error:'Could not load users. '+esc(U.err),loading:'Loading users…',idle:'Loading users…'};
  if(U.state==='noauth')return h+'<div class="ad-card"><h2>Log in to manage users</h2><p>Sign in on your website with the Google account you made the admin, then come back here.</p><div class="ad-btns" style="justify-content:flex-start"><a class="btn btn-solid btn-sm" href="login">Go to website login</a><button class="btn btn-solid btn-sm" type="button" data-act="u-refresh">I have logged in</button></div></div>';
  if(U.state!=='ready')return h+'<div class="ad-card"><p class="'+(U.state==='loading'||U.state==='idle'?'ad-muted':'ad-msg warn')+'">'+msgs[U.state]+'</p>'+(U.state==='loading'||U.state==='idle'?'':'<div class="ad-btns" style="justify-content:flex-start"><button class="btn btn-solid btn-sm" type="button" data-act="u-refresh">Try again</button></div>')+'</div>';
  var tot=U.list.length,bl=U.list.filter(function(x){return x.blocked}).length,tr=U.list.filter(function(x){return x.role!=='member'}).length,ad=U.list.filter(function(x){return x.is_admin}).length;
  return h+'<div class="ad-kpis">'+[['Total users',tot],['Blocked',bl],['Extra access',tr],['Admins',ad]].map(function(k){return '<div class="ad-kpi"><div><span>'+k[0]+'</span><b>'+k[1]+'</b></div></div>'}).join('')+'</div>'+
    '<div class="ad-card"><div class="u-bar"><input id="u-q" type="text" placeholder="Search by name, username, email or phone" value="'+esc(U.q)+'" aria-label="Search users"><button class="btn btn-solid btn-sm" type="button" data-act="u-refresh">Refresh</button></div>'+
    '<div class="ad-tablewrap"><table class="ad-table u-table"><thead><tr><th>User</th><th>Email</th><th>Joined</th><th>Status</th><th>Access</th><th></th></tr></thead><tbody id="u-body">'+uRows()+'</tbody></table></div>'+
    '<p class="ad-muted" style="font-size:.8rem">Access: <b>Member</b> is a normal account. <b>Trusted</b> and <b>Editor</b> are extra levels you can use to unlock members-only parts of the site. Blocking takes effect at once for logging in.</p></div>';
}
function uAct(p,ok){return p.then(function(){flash(ok);return loadUsersQuiet()},function(e){flash(e.message||'Something went wrong.');})}
function loadUsersQuiet(){return uApi('admin_list_users').then(function(r){U.list=r||[];U.state='ready';renderApp()})}
var TABS=[['overview','Overview'],['content','Content'],['pages','Pages and sections'],['users','Users'],['settings','Settings'],['publish','Publish'],['security','Security']];
function renderApp(){
  acts.innerHTML='<a class="btn btn-ghost btn-sm" href="index.html">Preview site</a><button class="btn btn-solid btn-sm" type="button" data-act="publish" title="Choose where to save the file that makes your changes live">Publish'+(dirty()?' •':'')+'</button><button class="btn btn-ghost btn-sm" type="button" data-act="logout">Log out</button>';
  var nav='<aside class="ad-nav" aria-label="Admin sections"><div class="ad-brand"><b>SK</b><span>Control</span></div>'+TABS.map(function(t){return '<button type="button" data-tab="'+t[0]+'"'+(ui.tab===t[0]?' aria-current="true"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+NAVI[t[0]]+'</svg><span>'+t[1]+'</span>'+(t[0]==='publish'&&dirty()?'<em>•</em>':'')+'</button>'}).join('')+'</aside>';
  var h=nav+'<div class="ad-main">'+msgHtml()+({overview:tabOverview,content:tabContent,pages:tabPages,users:tabUsers,settings:tabSettings,publish:tabPublish,security:tabSecurity})[ui.tab]()+'</div>';
  app.innerHTML='<div class="ad-shell">'+h+'</div>';
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
  if(c.note)h+='<p class="ad-msg warn" style="margin-bottom:.8rem">'+esc(c.note)+'</p>';
  if(c.id==='home:svc-list'&&L.some(function(x){return x.placeholder}))h+='<p class="ad-msg" style="margin-bottom:.8rem">The item named "." is an empty placeholder slot. It counts as a skill. Edit it to make it real, or delete it to lower the count.</p>';
  h+='<div class="ad-rows">'+(L.length?L.map(function(it,i){
    return '<div class="ad-row'+(it._off?' off':'')+'"><div class="ad-ord"><button type="button" data-act="up" data-i="'+i+'" aria-label="Move up"'+(i===0?' disabled':'')+'>▲</button><button type="button" data-act="down" data-i="'+i+'" aria-label="Move down"'+(i===L.length-1?' disabled':'')+'>▼</button></div>'+
      '<div class="t"><b>'+esc(titleOf(it))+(it._off?' (hidden)':'')+'</b><span>'+esc(subOf(it))+'</span></div>'+
      '<div class="ad-btns"><button type="button" data-act="toggle" data-i="'+i+'">'+(it._off?'Show':'Hide')+'</button><button type="button" data-act="edit" data-i="'+i+'">Edit</button><button type="button" class="danger" data-act="del" data-i="'+i+'">Delete</button></div></div>';
  }).join(''):'<p class="ad-muted">Nothing here yet. Use "Add new".</p>')+'</div>';
  return h;
}
function editorHtml(c){
  var L=listOf(c.id),it=L[ui.edit]||{},isNew=ui.edit>=L.length;
  var types='';if(c.types){types='<datalist id="dl-types">'+L.map(function(x){return x.type}).filter(function(v,i,a){return v&&a.indexOf(v)===i}).map(function(v){return '<option value="'+esc(v)+'">'}).join('')+'</datalist>'}
  var h='<div class="ad-top"><h2 style="margin:0">'+(isNew?'Add to':'Edit in')+' '+esc(c.label)+'</h2></div><form class="ad-form ad-card" id="item-form" novalidate>'+types;
  h+=c.fields.map(function(f){
    var v=it[f.k],id='f_'+f.k,hint=f.h?' <small>'+esc(f.h)+'</small>':'';
    if(f.t==='bool')return '<label class="chk"><input type="checkbox" id="'+id+'"'+(v?' checked':'')+'>'+esc(f.l)+'</label>';
    var inner;
    if(f.t==='area')inner='<textarea id="'+id+'">'+esc(v)+'</textarea>';
    else if(f.t==='raw')inner='<textarea class="mono" id="'+id+'" spellcheck="false">'+esc(v)+'</textarea>';
    else if(f.t==='csv')inner='<input type="text" id="'+id+'" value="'+esc((v||[]).join(', '))+'">';
    else if(f.t==='num')inner='<input type="number" min="0" max="100" id="'+id+'" value="'+esc(v==null?0:v)+'">';
    else if(f.t==='icon'){var ic=(D._icons||{})[f.page]||[];inner='<select id="'+id+'">'+ic.map(function(n){return '<option'+(n===(v||ic[0])?' selected':'')+'>'+esc(n)+'</option>'}).join('')+'</select>'}
    else inner='<input type="text" id="'+id+'" value="'+esc(v)+'"'+(f.k==='type'?' list="dl-types"':'')+'>';
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
   '<div class="ad-card"><h2>Feedback email</h2><p>Where the feedback form sends its message.</p><label class="f">Email address<input type="email" name="feedbackEmail" value="'+esc(st.feedbackEmail||'feedback@sk.site')+'"></label></div>'+
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
  if(t.dataset.tab){if(t.dataset.tab==='users'&&U.state!=='ready'){ui.tab='users';ui.edit=null;ui.setup=null;ui.next=null;ui.chgOpen=false;loadUsers();return}ui.tab=t.dataset.tab;ui.edit=null;ui.setup=null;ui.next=null;ui.chgOpen=false;renderApp();return}
  if(t.dataset.col){ui.col=t.dataset.col;if(t.dataset.act==='goto-col')ui.tab='content';ui.edit=null;renderApp();return}
  var a=t.dataset.act,i=+t.dataset.i,c=COLS.filter(function(x){return x.id===ui.col})[0]||COLS[0];
  if(a==='logout'){endSession();draft=null;ui.setup=null;view();return}
  if(a==='add'){ui.edit=listOf(c.id).length;renderApp();return}
  if(a==='edit'){ui.edit=i;renderApp();return}
  if(a==='cancel'){ui.edit=null;renderApp();return}
  if(a==='up'||a==='down'){editList(c.id,function(L){var j=a==='up'?i-1:i+1;if(j<0||j>=L.length)return;var x=L[i];L[i]=L[j];L[j]=x});renderApp();return}
  if(a==='toggle'){editList(c.id,function(L){if(L[i]._off)delete L[i]._off;else L[i]._off=true});renderApp();return}
  if(a==='del'){if(confirm('Delete "'+titleOf(listOf(c.id)[i])+'"? You can bring everything back with "Reset to defaults".')){editList(c.id,function(L){L.splice(i,1)});flash('Deleted and saved.');renderApp()}return}
  if(a==='reset-col'){if(confirm('Reset "'+c.label+'" to the original content?')){delete draft.lists[c.id];save();flash('Reset to defaults.');renderApp()}return}
  if(a==='publish'){publish();return}
  if(a==='discard'){if(confirm('Discard your saved changes and go back to the published version?')){store.del(SK.DRAFT_KEY);draft=null;loadDraft();flash('Changes discarded.');renderApp()}return}
  if(a==='chg-login'){ui.setup=null;ui.chgOpen=true;renderApp();return}
  if(a==='dl-config'){download('admin-config.js',ui.setup.text);return}
  if(a==='copy-config'){var tx=ui.setup.text;(navigator.clipboard?navigator.clipboard.writeText(tx):Promise.reject()).then(function(){t.textContent='Copied'},function(){var r=document.createRange();r.selectNodeContents($('#cfg-text'));var s=getSelection();s.removeAllRanges();s.addRange(r);t.textContent='Press Ctrl+C'});return}
  if(a==='new-recovery'){newRecovery().then(function(r){ui.next=Object.assign({},ui.next||CFG,{rk:r.rk});ui.setup={text:configFile(ui.next),recovery:r.key};renderApp()});return}
  if(a==='u-refresh'){loadUsers();return}
  if(a==='u-open'){U.open=U.open===t.dataset.id?null:t.dataset.id;renderApp();return}
  if(a==='u-block'){var f=t.dataset.flag==='1';if(f&&!confirm('Block this person? They will not be able to log in.'))return;uAct(uApi('admin_set_blocked',{uid:t.dataset.id,flag:f}),f?'User blocked.':'User unblocked.');return}
  if(a==='u-admin'){var g=t.dataset.flag==='1';if(!confirm(g?'Give this person full admin rights?':'Remove this person\'s admin rights?'))return;uAct(uApi('admin_set_admin',{uid:t.dataset.id,flag:g}),g?'Admin rights given.':'Admin rights removed.');return}
  if(a==='goto-col'){ui.tab='content';ui.col=t.dataset.col;ui.edit=null;renderApp();return}
  if(a==='setup-done'){ui.setup=null;ui.chgOpen=false;if(app.dataset.view==='setup'){location.reload()}else renderApp();return}
}
app.addEventListener('click',onClick);
app.addEventListener('change',function(e){var s=e.target.closest('.u-role');if(s)uAct(uApi('admin_set_role',{uid:s.dataset.id,new_role:s.value}),'Access updated.')});
app.addEventListener('input',function(e){if(e.target.id==='u-q'){U.q=e.target.value;var b=$('#u-body');if(b)b.innerHTML=uRows()}});
acts.addEventListener('click',onClick);
var EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
app.addEventListener('submit',function(e){
  var id=e.target.id;
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
    var em=v('feedbackEmail'),err=$('#st-err');
    if(em&&!EMAIL.test(em)){err.textContent='That email address does not look right.';err.hidden=false;return}
    var n=v('skillsManual'),sx=f2.elements.skillsSuffix.value;
    if(n==='')delete draft.settings.skillsManual;else draft.settings.skillsManual=Math.max(0,Math.min(99,parseInt(n,10)||0));
    delete draft.settings.skillsMode;
    if(sx===''||sx==='+')delete draft.settings.skillsSuffix;else draft.settings.skillsSuffix=sx;
    if(!em||em==='feedback@sk.site')delete draft.settings.feedbackEmail;else draft.settings.feedbackEmail=em;
    var tx={};TEXTS.forEach(function(t){var x=v('t_'+t[0]);if(x)tx[t[0]]=x});
    if(Object.keys(tx).length)draft.settings.texts=tx;else delete draft.settings.texts;
    save();flash('Saved. Press Publish at the top when you want it live.');renderApp();return;
  }
});
app.addEventListener('change',function(e){
  var t=e.target;
  if(t.id==='imp'&&t.files&&t.files[0]){
    var r=new FileReader();
    r.onload=function(){
      try{
        var s=String(r.result),a=s.indexOf('{'),b=s.lastIndexOf('}');
        var obj=JSON.parse(s.slice(a,b+1));
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
