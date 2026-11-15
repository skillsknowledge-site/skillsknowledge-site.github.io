(function(){
'use strict';
var reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ---------- data ---------- */
var ICONS={
  page:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 13h6M7 16h4"/>',
  grid:'<rect x="3" y="3" width="7.500" height="7.500" rx="1.500"/><rect x="13.500" y="3" width="7.500" height="7.500" rx="1.500"/><rect x="3" y="13.500" width="7.500" height="7.500" rx="1.500"/><rect x="13.500" y="13.500" width="7.500" height="7.500" rx="1.500"/>',
  phone:'<rect x="7" y="2.500" width="10" height="19" rx="2.500"/><path d="M11 18.500h2"/>',
  click:'<path d="M9 3v10l2.500-2 2 4.500 2-1-2-4.300 3.300-.2z"/>',
  bug:'<path d="M9 7a3 3 0 016 0v1H9zM7 11H4M20 11h-3M7 16H4.500M19.500 16H17M12 9v11"/><rect x="7" y="8" width="10" height="11" rx="5"/>',
  bolt:'<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'
};
var TOOLS=SK.list('code:tools-grid');
var SERVICES=SK.list('code:svc-grid');
/* concept frames drawn in SVG; replace with your own finished pages */
var WORKS=SK.list('code:works');
var STEPS=SK.list('code:steps');
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
