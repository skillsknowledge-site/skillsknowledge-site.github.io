(function(){
'use strict';
var reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ---------- data ---------- */
var ICONS={
  reel:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 9.5v5l4-2.5z"/>',
  cut:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5L20 18M8.5 16.5L20 6"/>',
  ads:'<path d="M3.5 9.6h3.4L15.4 5v14l-8.5-4.6H3.5z"/><path d="M18.2 9.3c1.4 1.5 1.4 4.1 0 5.600M6.7 14.5l1.2 4.7h2.5"/>',
  caption:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 11h4M13 11h4M7 15h2M12 15h5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  wave:'<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/>'
};
var TOOLS=SK.list('video:tools-grid');
var SERVICES=SK.list('video:svc-grid');
/* concept frames drawn in SVG; replace with your own finished videos */
var WORKS=SK.list('video:works');
var STEPS=SK.list('video:steps');
var PALETTE=[];

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
    return '<button type="button" class="card swatch" data-hex="'+a+'" aria-label="Copy '+d.name+' code '+a+'"><span class="chip" style="background:linear-gradient(120deg,'+a+' 0 58%,'+b+' 58%)"></span><span class="meta"><b>'+d.name+'</b><code>'+a+' · '+b+'</code><span class="copied" aria-live="polite"></span></span></button>';
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
