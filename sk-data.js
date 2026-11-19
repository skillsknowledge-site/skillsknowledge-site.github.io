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
var SESSION_KEY='sk-admin-session',DRAFT_KEY='sk-admin-draft';
var PAGES={about:'about.html',login:'login.html',video:'video.html',graphics:'graphics.html',code:'code.html'};
var RAW_KEYS={art:1,bg:1};              /* fields that may hold SVG / CSS and are not escaped */

function get(k){try{return JSON.parse(window.localStorage.getItem(k))}catch(e){return null}}
function put(k,v){try{window.localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function del(k){try{window.localStorage.removeItem(k)}catch(e){}}
function clone(x){return JSON.parse(JSON.stringify(x))}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function admin(){var s=get(SESSION_KEY);return !!(s&&s.exp>Date.now())}
function data(){
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
  banner();
}
function banner(){
  if(!admin()||document.body.classList.contains('adm'))return;
  var d=document.createElement('div');d.id='sk-admin-bar';
  d.innerHTML='<b>Admin preview</b><span>'+(get(DRAFT_KEY)?'showing your draft':'no draft yet')+'</span><a href="ctl-k7q2x9m4.html">Open admin</a><button type="button">Exit</button>';
  var s=document.createElement('style');
  s.textContent='#sk-admin-bar{position:fixed;left:12px;bottom:12px;z-index:9999;display:flex;align-items:center;gap:.7rem;padding:.5rem .8rem;border-radius:8px;background:rgba(10,14,12,.92);color:#fff;font:500 .78rem system-ui,sans-serif;border:1px solid rgba(255,255,255,.25);box-shadow:0 8px 28px rgba(0,0,0,.45)}#sk-admin-bar span{opacity:.7}#sk-admin-bar a,#sk-admin-bar button{color:#0a0e0c;background:#7fe3a0;border:0;border-radius:5px;padding:.25rem .6rem;font:600 .75rem system-ui,sans-serif;text-decoration:none;cursor:pointer}';
  document.head.appendChild(s);document.body.appendChild(d);
  d.querySelector('button').addEventListener('click',function(){del(SESSION_KEY);location.reload()});
}
/* deferred scripts run while readyState is 'interactive', so wait for DOMContentLoaded to run after the page scripts */
if(document.readyState==='complete')ready();else document.addEventListener('DOMContentLoaded',ready);
/* the data-count attributes must be right before script.js sets up its counters, which happens right after this file */
applyCounts();

window.SK={
  list:list,rawList:rawList,setting:setting,counts:counts,word:word,data:data,admin:admin,
  pageOn:pageOn,esc:esc,
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
