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
    if(/already registered|already been registered/i.test(m))return 'Could not create the account. Please check your details and try again.';
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
  function fn(body){
    return fetch(url+'/functions/v1/sk-login',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+C.anon,'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){
      return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}return {status:r.status,j:j}})},
      function(){return {status:0,j:null}});
  }
  function isBlockedRegion(){
    if(window.SK&&typeof SK.blockedRegion==='function'&&SK.blockedRegion())return true;
    try{
      var z='';try{z=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
      if(/^asia\/(jerusalem|tel_aviv)$/i.test(z))return true;
      var l=(navigator.language||'').trim(),ls=Array.isArray(navigator.languages)?navigator.languages:[];
      if(!z&&(/[-_]IL$/i.test(l)||/^he\b/i.test(l)||ls.some(function(x){return /[-_]IL$/i.test(String(x||''))||/^he\b/i.test(String(x||''))})))return true;
    }catch(e){}
    return false;
  }
  function isBlockedPhone(v){return /^(?:\+|00)972/.test(String(v||'').replace(/[\s()-]/g,''))}
  window.skAuth={
    social:function(provider){
      if(isBlockedRegion())return Promise.reject(new Error('Something went wrong. Please try again.'));
      if(provider!=='google'&&provider!=='azure')return Promise.reject(new Error('That sign-in is not switched on.'));
      location.href=url+'/auth/v1/authorize?provider='+provider+(provider==='azure'?'&scopes=email':'')+'&redirect_to='+encodeURIComponent(base());
      return new Promise(function(){});
    },
    login:function(id,pw){
      if(isBlockedRegion())return Promise.reject(new Error('Server crash. Please try again.'));
      id=String(id||'').trim();
      if(isBlockedPhone(id))return Promise.reject(new Error('Phone number not verified.'));
      /* the server looks the username up itself, so the browser never learns anybody's email */
      return fn({action:'login',identifier:id,password:pw}).then(function(r){
        if(r.status===404||r.status===0)return legacyLogin(id,pw);
        if(r.j&&r.j.access_token){saveSession(r.j);setTimeout(home,600);return}
        if(r.j&&r.j.blocked&&window.skTerminated){window.skTerminated({email:/@/.test(id)?id:'',username:/@/.test(id)?'':id,reason:r.j.reason||'',code:r.j.code||'',until:r.j.until||''});return new Promise(function(){})}
        throw new Error(nice((r.j&&(r.j.error||r.j.msg||r.j.message))||''));
      });
    },
    reset:function(id){
      if(isBlockedRegion())return Promise.reject(new Error('Something went wrong. Please try again.'));
      var m='If that account exists, a reset link is on its way to its email.';
      id=String(id||'').trim();
      if(isBlockedPhone(id))return Promise.reject(new Error('Phone number not verified.'));
      return fn({action:'reset',identifier:id,redirect_to:base()}).then(function(r){
        if(r.status===404||r.status===0)return legacyReset(id);return m},function(){return m});
    }
  };
  function legacyReset(id){
    var m='If that account exists, a reset link is on its way to its email.';
    id=String(id||'').trim();
    if(!/@/.test(id))return Promise.resolve(m);
    return api('/auth/v1/recover?redirect_to='+encodeURIComponent(base()),{email:id.toLowerCase()}).then(function(){return m},function(){return m});
  }
  function legacyLogin(id,pw){
    if(!/@/.test(id))return Promise.reject(new Error('Username and phone login requires the login service. Please use your email or try again.'));
    return api('/auth/v1/token?grant_type=password',{email:id.toLowerCase(),password:pw}).then(function(j){saveSession(j);setTimeout(home,600)},function(er){
      /* blocked? show the termination screen instead of a vague error */
      return api('/rest/v1/rpc/account_status',{identifier:id}).then(function(b){
        if(b===true&&window.skTerminated){window.skTerminated({email:id,username:''});return new Promise(function(){})}
        throw er},function(){throw er})});
  }
  window.skAuth.signup=function(name,em,pw,un,ph){
      if(isBlockedRegion())return Promise.reject(new Error('Something went wrong. Please try again.'));
      if(isBlockedPhone(ph))return Promise.reject(new Error('Phone number not verified.'));
      var chk=un?api('/rest/v1/rpc/username_available',{name:un}).catch(function(){return true}):Promise.resolve(true);
      return chk.then(function(free){if(free===false)throw new Error('That username is already taken.');
      return api('/auth/v1/signup',{email:em,password:pw,data:{full_name:name,username:un||'',phone:(ph||'').replace(/[^0-9+]/g,'')}})}).then(function(j){return j}).then(function(j){
        if(j&&j.access_token){saveSession(j);setTimeout(home,600);return 'Account created.'}
        return 'Almost done. Check your email and click the link to confirm.';
      });
    };
  if(err&&/banned|blocked|user_banned/i.test(err+location.search+location.hash)){window.addEventListener('DOMContentLoaded',function(){if(window.skTerminated)window.skTerminated(null)});err=''}
  if(err)window.addEventListener('DOMContentLoaded',function(){var f=document.querySelector('.aform:not([hidden]) .aalert');if(f){f.textContent=err+' You can log in with your email or username and password instead.';f.className='aalert';f.hidden=false}});
})();
