(function(){
'use strict';
var reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
var SCENES=[];
var THEME={acc:[52,194,106],hi:[126,226,156],acc2:[150,255,90]};

/* ---------- data ---------- */
var ICONS={
  layout:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  stack:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  bolt:'<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  video:'<rect x="3" y="5.5" width="13" height="13" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  palette:'<path d="M12 3a9 9 0 100 18c1.4 0 2-1 1.5-2.2-.5-1.2.2-2.300 1.500-2.300H18a3 3 0 003-3C21 7 17 3 12 3z"/><path d="M7.500 11h.01M10 7.500h.01M14 7.500h.01"/>',
  code:'<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.500 5l-3 14"/>',
  ads:'<path d="M3.500 9.600h3.400L15.400 5v14l-8.500-4.600H3.500z"/><path d="M18.200 9.300c1.400 1.500 1.400 4.100 0 5.600"/>',
  dot:'<circle cx="12" cy="12" r="1.600"/>'
};
var SERVICES=SK.list('home:svc-list');
var SKILLS=SK.list('home:skills-grid');
var METERS=[['Performance',98],['Accessibility',100],['Best practices',100],['SEO',96]];
var PROJECTS=SK.list('home:proj-grid');
var STEPS=SK.list('home:steps');
var POSTS=SK.list('home:posts');

/* ---------- card classes ---------- */
function svg(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[name]||ICONS.dot)+'</svg>'}
function chips(a){return '<ul class="chips">'+a.map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul>'}
class Card{
  constructor(d){this.d=d}
  html(){return ''}
  render(){var t=document.createElement('template');t.innerHTML=this.html().trim();return t.content.firstElementChild}
}
class ServiceCard extends Card{
  html(){var d=this.d;return '<article class="card rise svc" data-key="'+d.key+'"><span class="ico">'+svg(d.icon)+'</span><div><h3>'+d.title+'</h3><p>'+d.text+'</p></div><a class="btn btn-solid btn-sm" href="'+d.link+'">'+d.label+'</a></article>'}
}
class SkillCard extends Card{
  html(){var d=this.d;return '<article class="card spot rise sk'+(d.learning?' learning':'')+'"><h3>'+d.title+'</h3><p class="note">'+d.note+'</p>'+chips(d.items)+'</article>'}
}
class ProjectCard extends Card{
  html(){var d=this.d;return '<article class="card spot rise proj'+(d.wide?' wide':'')+'"><div class="thumb" style="background:'+d.bg+'"><span>'+d.label+'</span></div><div class="proj-body"><h3>'+d.title+'</h3><p>'+d.text+'</p><div class="meta">'+chips(d.tags)+'<span>'+d.year+'</span></div></div></article>'}
}
class StepCard extends Card{
  html(){var d=this.d;return '<article class="card spot rise step"><b>'+d.n+'</b><h3>'+d.title+'</h3><p>'+d.text+'</p></article>'}
}
class PostCard extends Card{
  html(){var d=this.d;return '<article class="card spot rise post"><p class="when">'+d.when+'</p><h3>'+d.title+'</h3><p>'+d.text+'</p></article>'}
}
function mount(id,Klass,data){
  var host=document.getElementById(id);if(!host)return;
  var f=document.createDocumentFragment();
  data.forEach(function(d){f.appendChild(new Klass(d).render())});
  host.appendChild(f);
}
STEPS.forEach(function(s,i){s.n=i+1});
mount('svc-list',ServiceCard,SERVICES);
mount('skills-grid',SkillCard,SKILLS);
mount('proj-grid',ProjectCard,PROJECTS);
mount('steps',StepCard,STEPS);
mount('posts',PostCard,POSTS);

var mEl=document.getElementById('meters');
if(mEl)mEl.innerHTML=METERS.map(function(m){
  return '<li class="meter"><span>'+m[0]+'</span><i style="--v:'+m[1]+'%"></i><b>'+m[1]+'</b></li>'}).join('');


/* ---------- canvas scenes ---------- */
class Scene{
  constructor(canvas,draw){
    SCENES.push(this);this.c=canvas;this.ctx=canvas.getContext('2d');this.draw=draw;this.raf=0;this.t0=performance.now();
    this.resize();
    var self=this;
    if(window.ResizeObserver)new ResizeObserver(function(){self.resize();if(!self.raf)self.frame(2000)}).observe(canvas);
    new IntersectionObserver(function(e){e[0].isIntersecting?self.start():self.stop()}).observe(canvas);
  }
  resize(){
    var dpr=Math.min(window.devicePixelRatio||1,2),r=this.c.getBoundingClientRect();
    this.w=r.width;this.h=r.height;
    this.c.width=Math.max(1,Math.round(r.width*dpr));this.c.height=Math.max(1,Math.round(r.height*dpr));
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  frame(ms){this.ctx.clearRect(0,0,this.w,this.h);this.draw(this.ctx,this.w,this.h,ms/1000)}
  start(){
    var self=this;
    if(reduce){this.frame(2000);return}
    if(this.raf)return;
    (function loop(now){if(now-(self.last||0)>=33){self.last=now;self.frame(now-self.t0)}self.raf=requestAnimationFrame(loop)})(performance.now());
  }
  stop(){cancelAnimationFrame(this.raf);this.raf=0}
}

var ORB=[];(function(){var n=340;for(var i=0;i<n;i++){var k=i+.5,ph=Math.acos(1-2*k/n),th=Math.PI*(1+Math.sqrt(5))*k;ORB.push([Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)])}})();
/* dotsA: the 340-dot turning sphere that used to sit in the 'What I can build for you' card.
   To bring it back: put <canvas id="cv-orb"></canvas> in that card (the Scene line below starts it). */
function dotsA(ctx,w,h,t){
  var cx=w/2,cy=h/2,R=Math.min(w,h)*.36,ry=t*.35,cr=Math.cos(ry),sr=Math.sin(ry);
  for(var i=0;i<ORB.length;i++){
    var p=ORB[i],x=p[0],y=p[1],z=p[2];
    var wob=1+Math.sin(y*5+t*1.4)*.07+Math.cos(x*4-t)*.05;
    var X=x*cr+z*sr,Z=-x*sr+z*cr,f=3/(3+Z*wob);
    var a=.18+.82*(1-(Z+1)/2);
    var m=function(i){return (THEME.acc[i]+(THEME.hi[i]-THEME.acc[i])*a)|0};ctx.fillStyle='rgba('+m(0)+','+m(1)+','+m(2)+','+a+')';
    ctx.beginPath();ctx.arc(cx+X*R*wob*f,cy+y*R*wob*f,.8+a*1.6*f,0,6.2832);ctx.fill();
  }
}
function drawWave(ctx,w,h,t){
  var n=34,cy=h*.42;
  for(var i=0;i<n;i++){
    var k=i/(n-1)-.5,edge=Math.max(0,1-Math.abs(k)*1.7);
    ctx.beginPath();
    for(var x=0;x<=w;x+=8){
      var u=x/w,env=Math.pow(Math.sin(Math.PI*u),1.4);
      var y=cy+k*h*(.25+env*.75)+Math.sin(u*8+t*.9+i*.22)*env*h*.07;
      if(x)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    var warm=i%6===0;
    ctx.strokeStyle='rgba('+(warm?'233,196,106':THEME.acc.join(','))+','+(.14+.55*edge)+')';
    ctx.lineWidth=warm?1.5:1;ctx.stroke();
  }
}
var cvOrb=document.getElementById('cv-orb'),cvWave=document.getElementById('cv-wave');
if(cvOrb)new Scene(cvOrb,dotsA);
if(cvWave)new Scene(cvWave,drawWave);

/* ---------- counters ---------- */
var cio=new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(!e.isIntersecting)return;
    cio.unobserve(e.target);
    if(reduce)return;
    var el=e.target,end=+el.dataset.count,suf=el.dataset.suffix||'',t0=performance.now(),d=1400;
    (function step(now){
      var p=Math.min(1,(now-t0)/d),ease=1-Math.pow(1-p,3);
      el.textContent=Math.round(end*ease)+suf;
      if(p<1)requestAnimationFrame(step);
    })(t0);
  });
},{threshold:.6});
document.querySelectorAll('[data-count]').forEach(function(el){cio.observe(el)});

/* ---------- menu ---------- */
var nav=document.getElementById('nav'),burger=document.getElementById('burger');
if(nav&&burger){
if(nav&&burger){
if(nav&&burger){
if(nav&&burger){
burger.addEventListener('click',function(){
  var open=nav.classList.toggle('open');
  burger.setAttribute('aria-expanded',open?'true':'false');
});
nav.addEventListener('click',function(e){
  if(e.target.closest('a')){nav.classList.remove('open');burger.setAttribute('aria-expanded','false')}
});
}
}
}
}

var PAIRS={green:[[5,250,107]],purplePink:[[150,90,255]],pink:[[255,80,170]]};
/* nav hover shine uses the live page colours (see style.css), so every link matches */
/* ---------- Login button: seven bright colours that spread out like ink and follow the pointer ---------- */
(function(){
  var b=document.querySelector('.btn-rainbow'),cv=b&&b.querySelector('canvas.rb');if(!cv)return;
  var ctx=cv.getContext('2d');
  var COL=[[255,42,77],[255,138,0],[255,225,26],[31,255,122],[18,230,255],[47,107,255],[194,61,255]];
  var dpr=Math.min(2,window.devicePixelRatio||1),w=0,h=0,cx=0,cy=0,px=null,hover=false,last=0,running=false,stopAt=0;
  function size(){var W=b.clientWidth,H=b.clientHeight;if(W!==w||H!==h){w=W;h=H;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(!cx){cx=w/2;cy=h/2}}}
  function pos(e){var r=b.getBoundingClientRect();px=[e.clientX-r.left,e.clientY-r.top]}
  function loop(now){
    if(!hover&&now>stopAt){running=false;return}
    if(!document.hidden&&now-last>=33){last=now;draw(now)}
    requestAnimationFrame(loop);
  }
  function start(){if(running||reduce)return;running=true;requestAnimationFrame(loop)}
  b.addEventListener('pointerenter',function(e){hover=true;pos(e);if(reduce)draw(0);start()});
  b.addEventListener('pointermove',pos);
  b.addEventListener('pointerleave',function(){hover=false;stopAt=performance.now()+500});
  b.addEventListener('focus',function(){hover=true;start()});
  b.addEventListener('blur',function(){hover=false;stopAt=performance.now()+500});
  function draw(now){
    size();if(!w)return;
    var tx=hover&&px?px[0]:w/2,ty=hover&&px?px[1]:h/2;
    cx+=(tx-cx)*.14;cy+=(ty-cy)*.14;
    var t=now/1000,g=ctx.createLinearGradient(0,0,w,0),i;
    for(i=0;i<7;i++)g.addColorStop(i/6,'rgb('+COL[i].join(',')+')');
    ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    var R=Math.max(w,h)*.62;
    for(i=0;i<7;i++){
      var a=t*(.8+i*.14)+i*.9,x=cx+Math.cos(a)*w*.3*(.65+.35*Math.sin(t*.6+i)),y=cy+Math.sin(a*1.1)*h*.4;
      var rg=ctx.createRadialGradient(x,y,0,x,y,R),c=COL[i].join(',');
      rg.addColorStop(0,'rgba('+c+',.95)');rg.addColorStop(1,'rgba('+c+',0)');
      ctx.fillStyle=rg;ctx.fillRect(0,0,w,h);
    }
  }
})();

/* ---------- every page gets an About link (to the About page), even pages added later ---------- */
(function(){
  var ul=document.querySelector('#nav ul');if(!ul)return;
  var links=ul.querySelectorAll('a'),i;
  for(i=0;i<links.length;i++)if(/^about$/i.test(links[i].textContent.trim()))return;
  var li=document.createElement('li');li.innerHTML='<a href="about.html">About</a>';ul.appendChild(li);
})();

/* ---------- pop-ups: login / create account, and the 200-character comment ---------- */
(function(){
  function make(html){var t=document.createElement('template');t.innerHTML=html.trim();var d=t.content.firstChild;document.body.appendChild(d);return d}
  function wire(d){
    d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-close]'))d.close()});
  }
  var okMail=function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)};

  /* Feedback: email field, a Comment button that opens a window (200 characters max) and Send feedback */
  var box=document.getElementById('cbox'),send=document.getElementById('fb-send');
  if(box){
    var text='',files=[],LIM=200,MAXF=5,MAXB=5*1024*1024,fontsLoaded=false;
    var cd=make('<dialog class="compose" id="comment-dlg" aria-labelledby="cd-t">'+
      '<div class="cp-head"><h2 id="cd-t">New comment</h2><button class="cp-x" type="button" data-close aria-label="Close">&times;</button></div>'+
      '<div class="cp-meta"><span>To</span><b>SK feedback</b></div>'+
      '<div class="cp-ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Comment" data-ph="Write your comment here"></div>'+
      '<ul class="cp-files" hidden></ul><p class="cp-err" hidden></p>'+
      '<div class="cp-bar"><button class="btn btn-solid" type="button" data-done>Done</button><div class="cp-tools">'+
      '<select class="cp-font" aria-label="Font style">FONTOPTS</select>'+
      '<button type="button" data-cmd="bold" title="Bold" aria-label="Bold"><b>B</b></button><button type="button" data-cmd="italic" title="Italic" aria-label="Italic"><i>I</i></button><button type="button" data-cmd="underline" title="Underline" aria-label="Underline"><u>U</u></button>'+
      '<label class="cp-color" title="Text colour"><span>A</span><input type="color" value="#ffffff" aria-label="Text colour"></label>'+
      '<button type="button" data-attach title="Attach a file" aria-label="Attach a file"><svg viewBox="0 0 24 24"><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l8.6-8.6a3.7 3.7 0 015.2 5.2l-8.6 8.6a1.8 1.8 0 01-2.6-2.6l7.9-7.9"/></svg></button>'+
      '<button type="button" data-pic title="Attach a picture" aria-label="Attach a picture"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/></svg></button></div>'+
      '<span class="gcount">0 / 200</span></div>'+
      '<input type="file" multiple hidden data-fa><input type="file" accept="image/*" multiple hidden data-fp></dialog>'.replace('FONTOPTS',''));
    cd.querySelector('.cp-font').innerHTML='<option value="Inter" style="font-family:Inter, sans-serif">Inter</option><option value="Roboto" style="font-family:Roboto, sans-serif">Roboto</option><option value="Open Sans" style="font-family:Open Sans, sans-serif">Open Sans</option><option value="Lato" style="font-family:Lato, sans-serif">Lato</option><option value="Montserrat" style="font-family:Montserrat, sans-serif">Montserrat</option><option value="Poppins" style="font-family:Poppins, sans-serif">Poppins</option><option value="Playfair Display" style="font-family:Playfair Display, serif">Playfair Display</option><option value="Merriweather" style="font-family:Merriweather, serif">Merriweather</option><option value="Lora" style="font-family:Lora, serif">Lora</option><option value="Source Code Pro" style="font-family:Source Code Pro, monospace">Source Code Pro</option>';
    wire(cd);
    var ed=cd.querySelector('.cp-ed'),cnt=cd.querySelector('.gcount'),fl=cd.querySelector('.cp-files'),er=cd.querySelector('.cp-err'),saved=null;
    function len(){return ed.innerText.replace(/\n$/,'').length}
    function upd(){cnt.textContent=len()+' / '+LIM}
    function loadFonts(){if(fontsLoaded)return;fontsLoaded=true;var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Inter&family=Roboto&family=Open+Sans&family=Lato&family=Montserrat&family=Poppins&family=Playfair+Display&family=Merriweather&family=Lora&family=Source+Code+Pro&display=swap';document.head.appendChild(l)}
    function keepSel(){var s=getSelection();if(s.rangeCount&&ed.contains(s.anchorNode))saved=s.getRangeAt(0).cloneRange()}
    function restore(){ed.focus();if(saved){var s=getSelection();s.removeAllRanges();s.addRange(saved)}}
    document.addEventListener('selectionchange',function(){if(cd.open)keepSel()});
    ed.addEventListener('beforeinput',function(e){if(e.inputType.indexOf('insert')===0&&e.inputType!=='insertFromPaste'&&len()>=LIM){var s=getSelection();if(s.isCollapsed)e.preventDefault()}});
    ed.addEventListener('paste',function(e){e.preventDefault();var t=(e.clipboardData||window.clipboardData).getData('text/plain');t=t.slice(0,Math.max(0,LIM-len()));if(t)document.execCommand('insertText',false,t);upd()});
    ed.addEventListener('input',upd);
    cd.querySelectorAll('[data-cmd]').forEach(function(b){b.addEventListener('mousedown',function(e){e.preventDefault()});b.addEventListener('click',function(){restore();document.execCommand(b.dataset.cmd,false,null);b.classList.toggle('on',document.queryCommandState(b.dataset.cmd))})});
    var fs=cd.querySelector('.cp-font');fs.addEventListener('change',function(){restore();document.execCommand('fontName',false,fs.value)});
    var ci=cd.querySelector('.cp-color input'),cs=cd.querySelector('.cp-color');
    ci.addEventListener('input',function(){cs.style.setProperty('--cc',ci.value);restore();document.execCommand('foreColor',false,ci.value)});
    function size(n){return n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
    function drawFiles(){
      fl.innerHTML='';fl.hidden=!files.length;
      files.forEach(function(f,i){var li=document.createElement('li');
        if(f.type.indexOf('image/')===0){var im=document.createElement('img');im.alt='';im.src=f._u||(f._u=URL.createObjectURL(f));li.appendChild(im)}
        var sp=document.createElement('span');sp.textContent=f.name+' ('+size(f.size)+')';li.appendChild(sp);
        var x=document.createElement('button');x.type='button';x.setAttribute('aria-label','Remove '+f.name);x.textContent='\u00d7';x.addEventListener('click',function(){if(f._u)URL.revokeObjectURL(f._u);files.splice(i,1);drawFiles()});li.appendChild(x);fl.appendChild(li)});
    }
    function addFiles(list){
      er.hidden=true;[].forEach.call(list,function(f){
        if(files.length>=MAXF){er.textContent='You can attach up to '+MAXF+' files.';er.hidden=false;return}
        if(f.size>MAXB){er.textContent=f.name+' is larger than 5 MB.';er.hidden=false;return}
        files.push(f)});drawFiles()}
    var fa=cd.querySelector('[data-fa]'),fp=cd.querySelector('[data-fp]');
    cd.querySelector('[data-attach]').addEventListener('click',function(){fa.click()});
    cd.querySelector('[data-pic]').addEventListener('click',function(){fp.click()});
    [fa,fp].forEach(function(i){i.addEventListener('change',function(){addFiles(i.files);i.value=''})});
    box.addEventListener('click',function(){loadFonts();ed.innerHTML=text?text:'';upd();cd.showModal();ed.focus()});
    cd.querySelector('[data-done]').addEventListener('click',function(){text=len()?ed.innerHTML:'';box.textContent=(text||files.length)?'Comment added':'Comment';cd.close()});
    cd._plain=function(){return ed.innerText.trim().slice(0,LIM)};
    cd._files=function(){return files};
    if(send)send.addEventListener('click',function(){
      var em=document.getElementById('fb-email'),msg=document.getElementById('fb-msg'),v=em.value.trim();
      msg.className='fmsg err';
      var plain=cd._plain();
      if(!v&&!plain){msg.textContent='Please fill in the required fields.';return}
      if(!plain){msg.textContent='Please write your comment.';return}
      if(!v){msg.textContent='Please write your email.';return}
      if(!okMail(v)){msg.textContent='Please enter a valid email address.';return}
      var fl2=cd._files();msg.className='fmsg';msg.textContent=fl2.length?'Opening your email app... please attach your '+fl2.length+' file'+(fl2.length>1?'s':'')+' there.':'Opening your email app...';
      window.location.href='mailto:'+SK.setting('feedbackEmail','feedback@sk.site')+'?subject='+encodeURIComponent('Website feedback')+'&body='+encodeURIComponent(plain+(fl2.length?'\n\nAttachments: '+fl2.map(function(f){return f.name}).join(', '):'')+'\n\nFrom: '+v);
    });
  }
})();

/* ---------- services: hovering a skill swaps the big card ---------- */
(function(){
  var list=document.getElementById('svc-list'),box=document.getElementById('feature');if(!list||!box)return;
  var KNOWN={idle:1,video:1,graphics:1,coding:1,ads:1};
  function set(k){if(box.dataset.on!==k)box.dataset.on=k}
  /* skills added in the admin have no drawing of their own, so they use a generic panel with their own title and text */
  function over(e){
    var c=e.target.closest&&e.target.closest('.svc');
    if(!c){set('idle');return}
    var k=c.dataset.key;
    if(KNOWN[k]){set(k);return}
    var h=c.querySelector('h3'),p=c.querySelector('p');
    box.querySelector('.ft-generic h3').textContent=h?h.textContent:'';
    box.querySelector('.ft-generic p').textContent=p?p.textContent:'';
    box.querySelector('.fx-generic b').textContent=h?h.textContent:'';
    set('generic');
  }
  list.addEventListener('pointerover',over);
  list.addEventListener('focusin',over);
  list.addEventListener('pointerleave',function(){set('idle')});
  list.addEventListener('focusout',function(){set('idle')});
})();

/* ---------- copy email ---------- */
var copy=document.getElementById('copy'),addr=document.getElementById('addr');
if(copy&&addr)copy.addEventListener('click',function(){
  function done(msg){copy.textContent=msg;setTimeout(function(){copy.textContent='Copy email'},2200)}
  function fallback(){
    var r=document.createRange();r.selectNodeContents(addr);
    var s=window.getSelection();s.removeAllRanges();s.addRange(r);
    done('Press Ctrl+C');
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(addr.textContent).then(function(){done('Copied')},fallback);
  }else fallback();
});

/* ---------- colour journey: 7 vivid stages, blended by hue so no step ever jumps ----------
   Each stop is [main hue, partner hue, main lightness]. Hues are unwrapped so every blend
   travels the short way round the wheel:
   green+lime > purple+pink > blue+cyan > magenta+violet > red+orange > amber+gold > teal+green */
var STOPS=[[145,100,50],[198,178,64],[268,320,63]];
var rootStyle=document.documentElement.style,themeQueued=false;
function ease(x){return x*x*(3-2*x)}
function hsl(h,s,l){
  h=((h%360)+360)%360;s/=100;l/=100;
  var a=s*Math.min(l,1-l);
  function f(n){var k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))))}
  return [f(0),f(8),f(4)];
}
function setVar(n,c){rootStyle.setProperty(n,c.join(','))}
var tp=0,themeRaf=0,lastT=0,lastPaint=0;
function targetP(){var max=document.documentElement.scrollHeight-window.innerHeight;return max>0?Math.min(1,Math.max(0,window.scrollY/max)):0}
var TH=document.body.hasAttribute('data-br')?[214,12,236,6,60,-14,48,-16]:document.body.hasAttribute('data-pp')?[268,52,320,-38,63,0,62,0]:document.body.hasAttribute('data-gr')?[145,30,125,45,52,-3,58,-4]:null,PP=!!TH,ppK=TH?[TH[0],TH[2],TH[4],TH[6]]:null;
function stopAt(p){
  if(PP)return ppK;
  p=Math.min(1,Math.max(0,p));
  var seg=p*(STOPS.length-1),i=Math.min(STOPS.length-2,Math.floor(seg));
  var f=ease(Math.min(1,Math.max(0,(seg-i-.1)/.8)));
  var A=STOPS[i],B=STOPS[i+1];
  return [A[0]+(B[0]-A[0])*f,A[1]+(B[1]-A[1])*f,A[2]+(B[2]-A[2])*f];
}
var bgA=document.querySelector('.bgfx .a'),bgB=document.querySelector('.bgfx .b');
function paintBg(p){var k=stopAt(p);bgA.style.filter='hue-rotate('+(k[0]-145+(document.body.hasAttribute('data-br')?26:0)).toFixed(1)+'deg)';bgB.style.filter='hue-rotate('+(k[1]-100).toFixed(1)+'deg)'}
function paintTheme(p){
  var k=stopAt(p),h=k[0],h2=k[1],L=k[2];
  var acc=hsl(h,96,L),hi=hsl(h,100,78),acc2=hsl(h2,96,k[3]||62);
  setVar('--acc',acc);setVar('--hi',hi);setVar('--acc2',acc2);
  setVar('--deep',hsl(h,80,26));setVar('--bg-rgb',hsl(h,72,8));setVar('--card-rgb',hsl(h,62,13));
  setVar('--cardhi-rgb',hsl(h,64,19));setVar('--tint',hsl(h,100,86));setVar('--ink-rgb',hsl(h,85,6));
  THEME.acc=acc;THEME.hi=hi;THEME.acc2=acc2;
  if(reduce)SCENES.forEach(function(sc){sc.frame(2000)});
}
/* colour is tied directly to the scroll position: no easing, so it never lags behind a fast scroll */
var trail=0;
function themeStep(now){
  themeRaf=0;
  tp=targetP();
  paintBg(tp);
  clearTimeout(trail);
  if(now-lastPaint>=40){lastPaint=now;paintTheme(tp)}
  else trail=setTimeout(function(){lastPaint=performance.now();paintTheme(targetP())},50);
}
function queueTheme(){if(PP)return;if(!themeRaf)themeRaf=requestAnimationFrame(themeStep)}
window.addEventListener('scroll',queueTheme,{passive:true});
window.addEventListener('resize',queueTheme);
tp=targetP();paintBg(tp);paintTheme(tp);
/* graphics page = purple and pink, video page = blue and red. The colours only move with the scroll position: scrolling down shifts them
   from one colour to the other and scrolling back shifts them back. They stay still when you stop. */
if(TH&&!reduce){
  var t0=performance.now();
  (function ppLoop(now){
    var ph=window.scrollY/2600;
    var s=(1-Math.cos(ph*6.2832))/2;
    ppK=[TH[0]+TH[1]*s,TH[2]+TH[3]*s,TH[4]+TH[5]*s,TH[6]+TH[7]*s];
    paintBg(0);
    if(now-lastPaint>=50){lastPaint=now;paintTheme(0)}
    requestAnimationFrame(ppLoop);
  })(performance.now());
}

/* meters grow once when they first appear */
var mio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('go');mio.unobserve(e.target)}})},{threshold:.4});
document.querySelectorAll('.meter').forEach(function(m){mio.observe(m)});

/* ---------- a few tiny drifting flakes, tinted by the current colour ---------- */
(function(){
  if(reduce)return;
  var cv=document.getElementById('snow'),c=cv.getContext('2d'),W=0,H=0,P=[],t=0,last=performance.now();
  function size(){
    W=cv.clientWidth;H=cv.clientHeight;cv.width=W;cv.height=H;
    var n=W<700?13:22;P=[];
    for(var i=0;i<n;i++)P.push({bx:Math.random()*W,y:Math.random()*H,r:.7+Math.random()*1.4,a:.16+Math.random()*.3,
      vy:6+Math.random()*14,dx:(Math.random()-.5)*9,amp:8+Math.random()*26,f:.25+Math.random()*.5,ph:Math.random()*6.283,bob:.4+Math.random()*.8});
  }
  function tick(now){
    if(now-last<30){requestAnimationFrame(tick);return}
    var dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;
    c.clearRect(0,0,W,H);
    var wind=Math.sin(t*.06)*9+Math.sin(t*.17+1)*4,col=THEME.hi.join(',');
    for(var i=0;i<P.length;i++){
      var p=P[i];
      p.bx+=(p.dx+wind)*dt;
      p.y+=(p.vy+Math.sin(t*p.bob+p.ph)*6)*dt;
      if(p.y>H+10){p.y=-10;p.bx=Math.random()*W}
      var x=p.bx+Math.sin(t*p.f+p.ph)*p.amp;
      x=((x%W)+W)%W;
      
      c.fillStyle='rgba('+col+','+p.a+')';c.beginPath();c.arc(x,p.y,p.r,0,6.283);c.fill();
    }
    requestAnimationFrame(tick);
  }
  size();window.addEventListener('resize',size);requestAnimationFrame(tick);
})();

var yrEl=document.getElementById('yr');if(yrEl)yrEl.textContent=new Date().getFullYear();
})();

/* ---------- thin scroll line inside the page (native scrollbar is hidden) ---------- */
(function(){
  var b=document.createElement('div');b.className='sbar';b.setAttribute('aria-hidden','true');document.body.appendChild(b);
  var raf=0,hide;
  function upd(){raf=0;var d=document.documentElement,max=d.scrollHeight-d.clientHeight;
    if(max<8){b.classList.remove('on');return}
    var tr=d.clientHeight-68,h=Math.max(36,tr*d.clientHeight/d.scrollHeight),y=(tr-h)*(window.scrollY/max);
    b.style.height=h+'px';b.style.transform='translateY('+y+'px)';b.classList.add('on');
    clearTimeout(hide);hide=setTimeout(function(){b.classList.remove('on')},1200)}
  function q(){if(!raf)raf=requestAnimationFrame(upd)}
  addEventListener('scroll',q,{passive:true});addEventListener('resize',q);
})();

/* ---------- services: more than five skills become pages with Prev / Next ---------- */
(function(){
  var list=document.getElementById('svc-list');if(!list)return;
  var cards=[].slice.call(list.children),PER=5;if(cards.length<=PER)return;
  var pages=Math.ceil(cards.length/PER),pg=0,view=document.createElement('div'),track=document.createElement('div'),i,p;
  view.className='svc-view';track.className='svc-track';
  for(i=0;i<pages;i++){p=document.createElement('div');p.className='svc-page';cards.slice(i*PER,i*PER+PER).forEach(function(c){p.appendChild(c)});track.appendChild(p)}
  view.appendChild(track);list.appendChild(view);list.classList.add('paged');
  var nav=document.createElement('div');nav.className='svc-pager';nav.innerHTML='<button type="button" data-d="-1">\u2190 Prev</button><span></span><button type="button" data-d="1">Next \u2192</button>';list.appendChild(nav);
  var lab=nav.querySelector('span'),bs=nav.querySelectorAll('button');
  function go(n){pg=Math.max(0,Math.min(pages-1,n));track.style.transform='translateX(-'+(pg*100)+'%)';lab.textContent=(pg+1)+' / '+pages;bs[0].disabled=pg===0;bs[1].disabled=pg===pages-1;
    [].forEach.call(track.children,function(pp,k){[].forEach.call(pp.querySelectorAll('a'),function(a){a.tabIndex=k===pg?0:-1})})}
  nav.addEventListener('click',function(e){var b=e.target.closest('button');if(b&&!b.disabled)go(pg+(+b.dataset.d))});
  go(0);
})();
