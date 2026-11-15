/* Sign-in through Supabase (no libraries): Google, or email / username / phone with a password.
   Active only when config.js has a url and anon key. */
(function(){
  var C=window.SK_CFG||{};if(!(C.url&&C.anon))return;
  var url=C.url.replace(/\/+$/,'');
  var web=/^https?:$/.test(location.protocol);
  function home(){location.replace(web?'./':'index.html')}
  function api(path,body,method){
    return fetch(url+path,{method:method||'POST',headers:{apikey:C.anon,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}).then(function(r){
      return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}
        if(!r.ok)throw new Error(nice((j&&(j.msg||j.error_description||j.message||j.error))||''));return j})},
      function(){throw new Error('Cannot reach the server. Check your connection.')});
  }
  function nice(m){
    if(/invalid login/i.test(m))return 'Wrong details or password.';
    if(/banned|blocked/i.test(m))return 'This account has been terminated. Contact the site owner to appeal.';
    if(/not confirmed/i.test(m))return 'Please confirm your email first. Check your inbox.';
    if(/already registered|already been registered/i.test(m))return 'An account with this email already exists.';
    if(/rate limit|too many|security purposes/i.test(m))return 'Too many tries. Please wait a minute and try again.';
    if(/password should|weak/i.test(m))return 'Please choose a stronger password.';
    return m||'Something went wrong. Please try again.';
  }
  function saveSession(j){try{localStorage.setItem('sk_sess',JSON.stringify({access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000,provider:'email'}))}catch(e){}}
  /* coming back from Google or an email link: Supabase puts the session in the address */
  if(/access_token=/.test(location.hash)){
    var p=new URLSearchParams(location.hash.slice(1));
    if(p.get('access_token')){
      try{localStorage.setItem('sk_sess',JSON.stringify({access:p.get('access_token'),refresh:p.get('refresh_token'),exp:Date.now()+(+p.get('expires_in')||3600)*1000,provider:'google'}))}catch(e){}
      if(p.get('type')==='recovery'){try{sessionStorage.setItem('sk_recovery','1')}catch(e){}}
      history.replaceState(null,'',location.pathname);home();return}
  }
  var q=new URLSearchParams(location.search);
  var err=q.get('error_description')||(/error_description=/.test(location.hash)&&new URLSearchParams(location.hash.slice(1)).get('error_description'));
  function base(){return location.origin+location.pathname.replace(/[^\/]*$/,'')}
  function email(id){ /* email, username or phone -> email */
    id=String(id||'').trim();if(/@/.test(id))return Promise.resolve(id.toLowerCase());
    return api('/rest/v1/rpc/login_email',{identifier:id}).then(function(e){if(!e)throw new Error('Wrong details or password.');return e},
      function(er){if(/not find|404|function/i.test(er.message))throw new Error('Username login is not switched on yet. Use your email.');throw er});
  }
  window.skAuth={
    social:function(provider){
      if(provider!=='google')return Promise.reject(new Error('Only Google sign-in is switched on.'));
      location.href=url+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(base());
      return new Promise(function(){});
    },
    login:function(id,pw){
      return email(id).then(function(em){return api('/auth/v1/token?grant_type=password',{email:em,password:pw})}).then(function(j){saveSession(j);setTimeout(home,600)});
    },
    signup:function(name,em,pw){
      return api('/auth/v1/signup',{email:em,password:pw,data:{full_name:name}}).then(function(j){
        if(j&&j.access_token){saveSession(j);setTimeout(home,600);return 'Account created.'}
        return 'Almost done. Check your email and click the link to confirm.';
      });
    },
    reset:function(id){
      return email(id).then(function(em){return api('/auth/v1/recover?redirect_to='+encodeURIComponent(base()),{email:em})}).then(function(){return 'If that account exists, a reset link is on its way to its email.'},
        function(){return 'If that account exists, a reset link is on its way to its email.'});
    }
  };
  if(err)window.addEventListener('DOMContentLoaded',function(){var f=document.querySelector('.aform:not([hidden]) .aalert');if(f){f.textContent=err+' You can log in with your email or username and password instead.';f.className='aalert';f.hidden=false}});
})();
