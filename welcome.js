/* One-time welcome message on the home page, shown after a new member signs up and then logs in. */
(function(){
  var w=null;
  try{w=JSON.parse(localStorage.getItem('sk_welcome')||'null');if(!w||!localStorage.getItem('sk_sess')||Date.now()-(w.t||0)>7*864e5){if(w&&Date.now()-(w.t||0)>7*864e5)localStorage.removeItem('sk_welcome');return}}catch(e){return}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function go(){
    try{localStorage.removeItem('sk_welcome')}catch(e){}
    var b=document.createElement('div');b.className='wl';b.setAttribute('role','dialog');b.setAttribute('aria-modal','true');b.setAttribute('aria-labelledby','wl-h');
    b.innerHTML='<div class="wl-card"><svg class="wl-tick" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="46"/><path d="M28 50l14 14 27-30"/></svg><h2 id="wl-h">Welcome'+(w.name?', '+esc(w.name):'')+'!</h2><p>Your SkillsKnowledge account is ready. Have a look around, save your favourites and send me a message any time.</p><button class="btn btn-solid" type="button">Start exploring</button></div>';
    document.body.appendChild(b);requestAnimationFrame(function(){b.classList.add('in')});
    function close(){b.classList.remove('in');setTimeout(function(){b.remove()},400)}
    b.querySelector('button').addEventListener('click',close);b.addEventListener('click',function(e){if(e.target===b)close()});
    document.addEventListener('keydown',function k(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',k)}});
    b.querySelector('button').focus();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else setTimeout(go,300);
})();
