(function(){
'use strict';
var reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ---------- data ---------- */
var ICONS={
  logo:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 8.5l3.5 2v3.5L12 16l-3.5-2v-3.5z"/>',
  poster:'<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
  social:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 16l3-3.2 2.4 2.4 2.1-2.2M9 8.5h.01"/>',
  thumb:'<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M10.2 9.3v5.4l4.6-2.7z"/>',
  ads:'<path d="M3.5 9.6h3.4L15.4 5v14l-8.5-4.6H3.5z"/><path d="M18.2 9.3c1.4 1.5 1.4 4.1 0 5.6M6.7 14.5l1.2 4.7h2.5"/>',
  ui:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M6.5 6.5h.01M9.5 6.5h.01"/>'
};
var TOOLS=SK.list('graphics:tools-grid');
var SERVICES=SK.list('graphics:svc-grid');
/* concept pieces drawn in SVG; replace with your own finished work */
var WORKS=SK.list('graphics:works');
var STEPS=SK.list('graphics:steps');
var PALETTE=[
  {name:'Emerald',h:145,h2:100,l:50},{name:'Violet',h:268,h2:320,l:63},{name:'Cobalt',h:222,h2:188,l:60},
  {name:'Magenta',h:322,h2:282,l:63},{name:'Crimson',h:354,h2:24,l:58},{name:'Amber',h:34,h2:50,l:54},{name:'Teal',h:178,h2:148,l:50}
];

/* ---------- helpers ---------- */
function hsl2hex(h,s,l){
  s/=100;l/=100;var a=s*Math.min(l,1-l);
  function f(n){var k=(n+h/30)%12,c=l-a*Math.max(-1,Math.min(k-3,9-k,1));return ('0'+Math.round(255*c).toString(16)).slice(-2)}
  return '#'+f(0)+f(8)+f(4);
}
function svgIcon(n){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[n]||ICONS[Object.keys(ICONS)[0]])+'</svg>'}

/* ---------- card classes ---------- */
class Card{
  constructor(d){this.d=d}
  html(){return ''}
  render(){var t=document.createElement('template');t.innerHTML=this.html().trim();return t.content.firstElementChild}
}
class ServiceCard extends Card{
  html(){var d=this.d;return '<article class="card spot svc"><span class="ico">'+svgIcon(d.icon)+'</span><div><h3>'+d.title+'</h3><p>'+d.text+'</p></div></article>'}
}
class ToolCard extends Card{
  html(){var d=this.d;return '<article class="card spot tool"><h3>'+d.name+'</h3><p class="lv">'+d.level+'</p><p>'+d.text+'</p><span class="lvrow"><span class="lvbar" role="img" aria-label="'+d.name+' skill level '+d.v+' percent"><i style="--v:'+d.v+'%"></i></span><b>'+d.v+'%</b></span></article>'}
}
class WorkCard extends Card{
  html(){var d=this.d;return '<article class="card spot work" data-type="'+d.type+'"><div class="frame"><svg class="art" viewBox="0 0 200 150" role="img" aria-label="'+d.title+', sample design">'+d.art+'</svg></div><div class="cap"><h3>'+d.title+'</h3><span class="kind">'+d.kind+'</span></div></article>'}
}
class StepCard extends Card{
  html(){var d=this.d;return '<article class="card spot step"><b>'+d.n+'</b><h3>'+d.title+'</h3><p>'+d.text+'</p></article>'}
}
class SwatchCard extends Card{
  html(){
    var d=this.d,a=hsl2hex(d.h,96,d.l),b=hsl2hex(d.h2,96,62);
    return '<button type="button" class="card spot swatch" data-hex="'+a+'" aria-label="Copy '+d.name+' code '+a+'"><span class="chip" style="background:linear-gradient(120deg,'+a+' 0 58%,'+b+' 58%)"></span><span class="meta"><b>'+d.name+'</b><code>'+a+' · '+b+'</code><span class="copied" aria-live="polite"></span></span></button>';
  }
}
function mount(id,K,data){
  var host=document.getElementById(id);if(!host)return;host.textContent="";
  var f=document.createDocumentFragment();
  data.forEach(function(d){f.appendChild(new K(d).render())});
  host.appendChild(f);
}
STEPS.forEach(function(s,i){s.n=i+1});
mount('tools-grid',ToolCard,TOOLS);
mount('svc-grid',ServiceCard,SERVICES);
mount('works',WorkCard,WORKS);
mount('steps',StepCard,STEPS);
mount('swatches',SwatchCard,PALETTE);

/* ---------- filter tabs ---------- */
var tabs=document.querySelectorAll('.tab');
tabs.forEach(function(t){
  t.addEventListener('click',function(){
    var f=t.dataset.filter;
    tabs.forEach(function(x){x.setAttribute('aria-pressed',x===t?'true':'false')});
    document.querySelectorAll('.work').forEach(function(w){
      var show=f==='all'||w.dataset.type===f;
      w.hidden=!show;
      w.classList.remove('show');
      if(show){void w.offsetWidth;w.classList.add('show')}
    });
  });
});

/* ---------- swatches copy their code ---------- */
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('.swatch');if(!b)return;
  var lab=b.querySelector('.copied'),hex=b.dataset.hex;
  function done(m){lab.textContent=m;setTimeout(function(){lab.textContent=''},1800)}
  function fallback(){
    var r=document.createRange();r.selectNodeContents(b.querySelector('code'));
    var s=window.getSelection();s.removeAllRanges();s.addRange(r);done('Press Ctrl+C');
  }
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(hex).then(function(){done('Copied '+hex)},fallback);
  else fallback();
});

/* ---------- tool bars fill once when they appear ---------- */
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('go');io.unobserve(e.target)}})},{threshold:.4});
document.querySelectorAll('.tool').forEach(function(t){io.observe(t)});

/* ---------- reduced motion: stop the cursor animation ---------- */
if(reduce){var st=document.querySelector('.studio');if(st&&st.pauseAnimations)st.pauseAnimations()}
})();
