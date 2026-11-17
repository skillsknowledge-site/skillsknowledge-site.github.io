/* Login and sign-up page. No database is connected yet.
   To make it real, define window.skAuth before this file loads, for example with Supabase or Firebase:
   window.skAuth={
     login:function(email,password,remember){return Promise},
     signup:function(name,email,password){return Promise},
     social:function(provider){return Promise},
     reset:function(email){return Promise}
   };
   Each function should resolve on success or reject with an Error whose message is shown to the user. */
(function(){
  var forms={login:document.getElementById('f-login'),signup:document.getElementById('f-signup')};
  if(!forms.login)return;
  function ok(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)}
  function show(v){
    for(var k in forms){
      forms[k].hidden=k!==v;clear(forms[k]);
      /* the hidden form's fields are switched off so the browser only offers autofill for the form you can see */
      [].forEach.call(forms[k].querySelectorAll('input,button'),function(el){el.disabled=forms[k]!==forms[v]});
    }
    document.title=v==='login'?'SK Login':'SK Create account';
    var f=forms[v].querySelector('input');if(f)f.focus();
  }
  function clear(f){
    var a=f.querySelector('.aalert');a.hidden=true;a.textContent='';a.className='aalert';
    [].forEach.call(f.querySelectorAll('.ae'),function(e){e.textContent=''});
    [].forEach.call(f.querySelectorAll('.af'),function(e){e.classList.remove('bad')});
  }
  function fieldErr(f,id,msg){
    var e=f.querySelector('.ae[data-for="'+id+'"]');if(e)e.textContent=msg;
    var i=document.getElementById(id),w=i&&i.closest('.af');if(w)w.classList.add('bad');
  }
  function alertBox(f,msg,good){var a=f.querySelector('.aalert');a.textContent=msg;a.className='aalert'+(good?' ok':'');a.hidden=false}
  function call(name,args,f,okMsg){
    var api=window.skAuth&&window.skAuth[name];
    if(!api){alertBox(f,'The database is not connected yet, so nothing was sent or saved.');return}
    alertBox(f,'One moment...',true);
    api.apply(null,args).then(function(r){alertBox(f,typeof r==='string'?r:okMsg,true)},function(err){alertBox(f,(err&&err.message)||'Something went wrong. Please try again.')});
  }
  [].forEach.call(document.querySelectorAll('[data-view-to]'),function(a){a.addEventListener('click',function(e){e.preventDefault();var v=a.dataset.viewTo;history.replaceState(null,'','#'+v);show(v)})});
  [].forEach.call(document.querySelectorAll('[data-eye]'),function(b){b.addEventListener('click',function(){var i=b.parentNode.querySelector('input'),s=i.type==='password';i.type=s?'text':'password';b.setAttribute('aria-label',s?'Hide password':'Show password')})});
  [].forEach.call(document.querySelectorAll('[data-provider]'),function(b){b.addEventListener('click',function(){var f=b.closest('form');clear(f);call('social',[b.dataset.provider],f,'Signed in.')})});
  var forgot=document.querySelector('[data-forgot]');
  if(forgot)forgot.addEventListener('click',function(e){
    e.preventDefault();var f=forms.login;clear(f);var em=document.getElementById('li-email').value.trim();
    if(!em){fieldErr(f,'li-email','Please enter your email or username first.');return}
    call('reset',[em],f,'If that email has an account, a reset link is on its way.');
  });
  forms.login.addEventListener('submit',function(e){
    e.preventDefault();var f=forms.login;clear(f);
    var em=document.getElementById('li-email').value.trim(),pw=document.getElementById('li-pw').value;
    if(!em&&!pw){alertBox(f,'Please fill in the required fields.');fieldErr(f,'li-email','This is required.');fieldErr(f,'li-pw','Password is required.');return}
    var bad=false;
    if(!em){fieldErr(f,'li-email','Please enter your email, username or phone.');bad=true}
    if(!pw){fieldErr(f,'li-pw','Please enter your password.');bad=true}
    if(bad)return;
    call('login',[em,pw,f.elements.remember.checked],f,'Welcome back.');
  });
  forms.signup.addEventListener('submit',function(e){
    e.preventDefault();var f=forms.signup;clear(f);
    var un=document.getElementById('su-user').value.trim(),ph=document.getElementById('su-phone').value.trim(),n=document.getElementById('su-name').value.trim(),em=document.getElementById('su-email').value.trim(),pw=document.getElementById('su-pw').value,p2=document.getElementById('su-pw2').value,t=document.getElementById('su-terms').checked;
    if(!n&&!un&&!em&&!pw&&!p2){fieldErr(f,'su-user','Username is required.');alertBox(f,'Please fill in the required fields.');fieldErr(f,'su-name','Name is required.');fieldErr(f,'su-email','Email is required.');fieldErr(f,'su-pw','Password is required.');fieldErr(f,'su-pw2','Confirm your password.');return}
    var bad=false;
    if(!n){fieldErr(f,'su-name','Please enter your name.');bad=true}
    if(!un){fieldErr(f,'su-user','Please choose a username.');bad=true}
    else if(!/^[a-z0-9_.]{3,20}$/i.test(un)){fieldErr(f,'su-user','3-20 letters, numbers, . or _ only.');bad=true}
    if(ph&&!/^\+?[0-9 ()-]{7,18}$/.test(ph)){fieldErr(f,'su-phone','Enter a valid phone number.');bad=true}
    if(!em){fieldErr(f,'su-email','Please enter your email.');bad=true}
    else if(!ok(em)){fieldErr(f,'su-email','Please enter a valid email address.');bad=true}
    if(!pw){fieldErr(f,'su-pw','Please enter a password.');bad=true}
    else if(pw.length<8){fieldErr(f,'su-pw','Password must be at least 8 characters.');bad=true}
    if(!p2){fieldErr(f,'su-pw2','Confirm your password.');bad=true}
    else if(pw&&p2!==pw){fieldErr(f,'su-pw2','Does not match.');bad=true}
    if(!t){fieldErr(f,'su-terms','Please accept the terms to continue.');bad=true}
    if(bad)return;
    call('signup',[n,em,pw,un,ph],f,'Account created.');
  });

  /* when the browser (or the user) fills a field, drop that field's error straight away */
  [].forEach.call(document.querySelectorAll('.af input,.pwrap input'),function(i){
    function fill(){
      if(!i.value)return;
      var w=i.closest('.af');if(w)w.classList.remove('bad');
      var e=w&&w.querySelector('.ae');if(e)e.textContent='';
    }
    ['input','change','animationstart'].forEach(function(ev){i.addEventListener(ev,fill)});
  });
  show(location.hash==='#signup'?'signup':'login');
})();
