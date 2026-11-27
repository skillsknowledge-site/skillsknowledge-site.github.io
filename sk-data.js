/* SK site data layer. Loaded first on every page.
   - Visitors see PUBLISHED data (site-data.js) merged over the defaults (sk-defaults.js).
   - While the admin is logged in (this browser only), the pages show the admin's DRAFT instead, so changes can be previewed
     before they are published. */
/* colour theme: light (default), dark, or follow the device. Saved in the browser and in the account preferences. */
(function(){
  var mq=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null,mode='light';
  function apply(m){mode=(m==='dark'||m==='system')?m:'light';var dark=mode==='dark'||(mode==='system'&&mq&&mq.matches);document.documentElement.setAttribute('data-theme',dark?'dark':'light')}
  window.skTheme=apply;
  try{var p=JSON.parse(localStorage.getItem('sk_prefs')||'null');apply(p&&p.theme)}catch(e){apply('light')}
  if(mq&&mq.addEventListener)mq.addEventListener('change',function(){if(mode==='system')apply('system')});
})();
(function(){
'use strict';
var SESSION_KEY='sk-admin-session',DRAFT_KEY='sk-admin-draft',PV_KEY='sk_preview_draft';
var PAGES={about:'about.html',login:'login.html',video:'video.html',graphics:'graphics.html',code:'code.html'};
var RAW_KEYS={art:1,bg:1};              /* fields that may hold SVG / CSS and are not escaped */
function isBlockedRegion(){
  try{
    if(document.body&&document.body.classList.contains('adm'))return false;
    var z='';
    try{z=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
    if(/^asia\/(jerusalem|tel_aviv)$/i.test(z))return true;
    var l=(navigator.language||'').trim();
    var ls=Array.isArray(navigator.languages)?navigator.languages:[];
    if(!z&&(/[-_]IL$/i.test(l)||/^he\b/i.test(l)||ls.some(function(x){return /[-_]IL$/i.test(String(x||''))||/^he\b/i.test(String(x||''))})))return true;
  }catch(e){}
  return false;
}
if(isBlockedRegion()){
  try{localStorage.removeItem('sk_sess');localStorage.removeItem('sk_user');localStorage.removeItem('sk_welcome');localStorage.removeItem('sk_after');localStorage.removeItem('sk_ref');localStorage.removeItem('sk_rates');sessionStorage.removeItem('sk_recovery')}catch(e){}
  try{
    document.documentElement.setAttribute('data-sk-blocked','1');
    var bs=document.createElement('style');
    bs.id='sk-region-lock';
    bs.textContent='html[data-sk-blocked="1"],html[data-sk-blocked="1"] body{overflow:hidden!important;background:#090b10!important}html[data-sk-blocked="1"] header,html[data-sk-blocked="1"] main,html[data-sk-blocked="1"] footer,html[data-sk-blocked="1"] .bgfx,html[data-sk-blocked="1"] .snow{display:none!important}';
    document.head.appendChild(bs);
  }catch(e){}
}

function get(k){try{return JSON.parse(window.localStorage.getItem(k))}catch(e){return null}}
function put(k,v){try{window.localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function del(k){try{window.localStorage.removeItem(k)}catch(e){}}
function clone(x){return JSON.parse(JSON.stringify(x))}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function safeRaw(k,v){
  if(k==='art')return v.replace(/<\s*(script|iframe|object|embed|foreignObject)[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi,'').replace(/<\s*(script|iframe|object|embed|foreignObject)\b[^>]*>/gi,'').replace(/\son[a-z]+\s*=\s*(['"])[\s\S]*?\1/gi,'').replace(/\son[a-z]+\s*=[^\s>]+/gi,'').replace(/javascript\s*:/gi,'');
  if(k==='bg')return v.replace(/url\s*\([^)]*\)|@import|expression\s*\(|javascript\s*:|[;{}]/gi,'');
  return esc(v);
}

if(window.top===window){try{sessionStorage.removeItem(PV_KEY)}catch(e){}}
if(window.top!==window){
  window.addEventListener('message',function(e){
    if(e.source!==window.parent||!e.data||e.data.type!=='sk-preview-draft'||!e.data.draft||typeof e.data.draft!=='object')return;
    var okOrigin=e.origin===location.origin||(Array.isArray(window.SK_ADMIN_ORIGINS)&&window.SK_ADMIN_ORIGINS.indexOf(e.origin)>-1);
    var apply=function(){
      var payload=JSON.stringify({v:1,lists:(e.data.draft.lists&&typeof e.data.draft.lists==='object')?e.data.draft.lists:{},settings:(e.data.draft.settings&&typeof e.data.draft.settings==='object')?e.data.draft.settings:{}});
      var cur='';try{cur=sessionStorage.getItem(PV_KEY)||''}catch(x){}
      if(payload!==cur){try{sessionStorage.setItem(PV_KEY,payload)}catch(x){return}location.reload()}
    };
    if(okOrigin){apply();return}
    var C=window.SK_CFG||{},tok=typeof e.data.token==='string'?e.data.token:'';
    if(!(C.url&&C.anon&&tok))return;
    fetch(C.url.replace(/\/+$/,'')+'/rest/v1/rpc/admin_whoami',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:'{}'})
      .then(function(r){return r.ok?r.json():null})
      .then(function(me){if(me&&(me.is_admin||me.is_owner))apply()})
      .catch(function(){});
  });
}

function admin(){var s=get(SESSION_KEY);return !!(s&&s.exp>Date.now())}
function data(){
  if(window.top!==window){try{var pv=JSON.parse(sessionStorage.getItem(PV_KEY)||'null');if(pv&&typeof pv==='object')return pv}catch(e){}}
  if(admin()){var d=get(DRAFT_KEY);if(d&&typeof d==='object')return d}
  var p=window.SK_PUBLISHED;return (p&&typeof p==='object')?p:{lists:{},settings:{}};
}
function setting(name,def){var s=(data().settings||{})[name];return s===undefined||s===null||s===''?def:s}

/* a list: the edited version when there is one, otherwise the defaults; hidden items are left out */
function clean(it){
  var o={};
  Object.keys(it).forEach(function(k){
    if(k.charAt(0)==='_')return;
    var v=it[k];
    if(typeof v==='string'&&!RAW_KEYS[k]){
      v=esc(v);
      if((k==='link'||k==='href')&&/^\s*(javascript|data|vbscript):/i.test(v))v='#';
    }else if(typeof v==='string'&&RAW_KEYS[k]){
      v=safeRaw(k,v);
    }else if(Array.isArray(v))v=v.map(function(x){return typeof x==='string'?esc(x):x});
    o[k]=v;
  });
  return o;
}
function list(key){
  var L=(data().lists||{})[key],D=(window.SK_DEFAULTS||{})[key]||[];
  if(Array.isArray(L))return L.filter(function(x){return x&&!x._off}).map(clean);
  return clone(D);
}
/* the full editable list, hidden items included (used by the admin panel) */
function rawList(key){
  var L=(data().lists||{})[key],D=(window.SK_DEFAULTS||{})[key]||[];
  return Array.isArray(L)?clone(L):clone(D);
}

/* ---- skill counts: every "5+" on the site comes from here ---- */
var WORDS=['No','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve'];
function counts(){
  var s=list('home:svc-list'),ph=s.filter(function(x){return x.placeholder}).length,total=s.length;
  var raw=(data().settings||{}).skillsManual,m=parseInt(raw,10);
  var n=(raw!==undefined&&raw!==null&&raw!==''&&m>=0)?m:total,real=Math.max(0,total-ph);
  return {n:n,real:real,suffix:String(setting('skillsSuffix','+'))};
}
function word(n){return n<WORDS.length?WORDS[n]:String(n)}

function file(){var f=location.pathname.split('/').pop();if(!f)return 'index.html';return /\./.test(f)?f:f+'.html'}
function pageOn(name){var p=(data().settings||{}).pages||{};return p[name]!==false}
function pageOfHref(h){
  if(!h)return null;
  var m=String(h).split('#')[0].split('?')[0].split('/').pop();
  for(var k in PAGES)if(PAGES[k]===m)return k;
  return null;
}

/* ---- immediate work: counts, and sending visitors away from a switched-off page ---- */
var C=counts();
function applyCounts(){
  [].forEach.call(document.querySelectorAll('[data-skillcount]'),function(el){
    el.dataset.count=C.n;el.dataset.suffix=C.suffix;el.textContent=C.n+C.suffix;
  });
  [].forEach.call(document.querySelectorAll('[data-skillword]'),function(el){
    var w=word(C.real);el.textContent=el.dataset.skillword==='lower'?w.toLowerCase():w;
  });
}
var cur=null;for(var k in PAGES)if(PAGES[k]===file())cur=k;
if(cur&&!pageOn(cur)&&!admin()){location.replace('index.html')}

/* ---- once the page is built ---- */
function ready(){
  applyCounts();
  var st=data().settings||{},sec=st.sections||{},txt=st.texts||{};
  [].forEach.call(document.querySelectorAll('[data-sk]'),function(el){var v=txt[el.dataset.sk];if(typeof v==='string'&&v!=='')el.textContent=v});
  /* switched-off sections */
  Object.keys(sec).forEach(function(id){
    if(sec[id]!==false)return;
    var el=document.getElementById(id);if(el)el.style.display='none';
    [].forEach.call(document.querySelectorAll('a[href="#'+id+'"]'),function(a){var li=a.closest('li');(li||a).remove()});
  });
  /* switched-off pages: unlink them everywhere */
  [].forEach.call(document.querySelectorAll('a[href]'),function(a){
    var p=pageOfHref(a.getAttribute('href'));if(!p||pageOn(p))return;
    var li=a.closest('nav li');if(li){li.remove();return}
    if(a.id==='login-btn'||a.classList.contains('btn')){a.remove()}else{a.removeAttribute('href');a.style.pointerEvents='none'}
  });
}
/* deferred scripts run while readyState is 'interactive', so wait for DOMContentLoaded to run after the page scripts */
if(document.readyState==='complete')ready();else document.addEventListener('DOMContentLoaded',ready);
/* the data-count attributes must be right before script.js sets up its counters, which happens right after this file */
applyCounts();

window.SK={
  list:list,rawList:rawList,setting:setting,counts:counts,word:word,data:data,admin:admin,
  pageOn:pageOn,esc:esc,blockedRegion:isBlockedRegion,
  DRAFT_KEY:DRAFT_KEY,SESSION_KEY:SESSION_KEY,
  store:{get:get,put:put,del:del}
};
})();

/* clean addresses: show /about instead of /about.html (only on a real website, not a local file) */
(function(){
  if(!/^https?:$/.test(location.protocol))return;
  var p=location.pathname,n=p.replace(/(^|\/)index\.html$/,'$1').replace(/\.html$/,'');
  if(n!==p){try{history.replaceState(null,'',n+location.search+location.hash)}catch(e){}}
  var re=/^(?:\.\/)?(index|about|graphics|video|code|login|account|checkout|appeal)\.html(\?[^#]*)?(#.*)?$/;
  function clean(){[].forEach.call(document.querySelectorAll('a[href]'),function(a){var m=re.exec(a.getAttribute('href')||'');if(m)a.setAttribute('href',(m[1]==='index'?'./':m[1])+(m[2]||'')+(m[3]||''))})}
  var t=0;function later(){clearTimeout(t);t=setTimeout(clean,60)}
  document.addEventListener('DOMContentLoaded',function(){clean();try{new MutationObserver(later).observe(document.body,{childList:true,subtree:true})}catch(e){}});
})();
