/* Login page. The database part (window.skAuth) lives in supabase-auth.js.
   Each skAuth function resolves on success or rejects with an Error whose message is shown to the user. */
(function(){
  var f=document.getElementById('f-login');
  if(!f)return;
  var email=document.getElementById('li-email'),pw=document.getElementById('li-pw');
  function clear(){
    var a=f.querySelector('.aalert');a.hidden=true;a.textContent='';a.className='aalert';
    [].forEach.call(f.querySelectorAll('.ae'),function(e){e.textContent=''});
    [].forEach.call(f.querySelectorAll('.af'),function(e){e.classList.remove('bad')});
  }
  function fieldErr(id,msg){
    var e=f.querySelector('.ae[data-for="'+id+'"]');if(e)e.textContent=msg;
    var i=document.getElementById(id),w=i&&i.closest('.af');if(w)w.classList.add('bad');
  }
  function alertBox(msg,good){var a=f.querySelector('.aalert');a.textContent=msg;a.className='aalert'+(good?' ok':'');a.hidden=false}
  function call(name,args,okMsg){
    var api=window.skAuth&&window.skAuth[name];
    if(!api){alertBox('The database is not connected yet, so nothing was sent or saved.');return}
    alertBox('One moment...',true);
    api.apply(null,args).then(function(r){alertBox(typeof r==='string'?r:okMsg,true)},function(err){alertBox((err&&err.message)||'Something went wrong. Please try again.')});
  }
  /* an email, a username (3-20 letters, numbers, . or _) or a phone number with at least 7 digits */
  function validId(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)||/^[a-z0-9_.]{3,20}$/i.test(v)||v.replace(/\D/g,'').length>=7&&/^\+?[0-9 ()-]+$/.test(v)}

  [].forEach.call(document.querySelectorAll('[data-eye]'),function(b){b.addEventListener('click',function(){var i=b.parentNode.querySelector('input'),s=i.type==='password';i.type=s?'text':'password';b.setAttribute('aria-label',s?'Hide password':'Show password')})});
  [].forEach.call(document.querySelectorAll('[data-provider]'),function(b){b.addEventListener('click',function(){clear();call('social',[b.dataset.provider],'Signed in.')})});
  var forgot=document.querySelector('[data-forgot]');
  if(forgot)forgot.addEventListener('click',function(e){
    e.preventDefault();clear();var em=email.value.trim();
    if(!validId(em)){fieldErr('li-email','Enter your email, username or phone first.');return}
    call('reset',[em],'If that email has an account, a reset link is on its way.');
  });
  f.addEventListener('submit',function(e){
    e.preventDefault();clear();
    var em=email.value.trim(),p=pw.value,bad=false;
    if(!em&&!p){alertBox('Please fill in the required fields.');fieldErr('li-email','This is required.');fieldErr('li-pw','Password is required.');return}
    if(!em){fieldErr('li-email','Please enter your email, username or phone.');bad=true}
    else if(!validId(em)){fieldErr('li-email','Enter a real email, username or phone.');bad=true}
    if(!p){fieldErr('li-pw','Please enter your password.');bad=true}
    if(bad)return;
    call('login',[em,p,f.elements.remember.checked],'Welcome back.');
  });
  /* when the browser (or the user) fills a field, drop that field's error straight away */
  [].forEach.call(document.querySelectorAll('.af input'),function(i){
    function fill(){
      if(!i.value)return;
      var w=i.closest('.af');if(w)w.classList.remove('bad');
      var e=w&&w.querySelector('.ae');if(e)e.textContent='';
    }
    ['input','change','animationstart'].forEach(function(ev){i.addEventListener(ev,fill)});
  });
})();
