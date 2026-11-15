/* Google sign-in through Supabase (no libraries). Active only when config.js has a url and anon key. */
(function(){
  var C=window.SK_CFG||{};if(!(C.url&&C.anon))return;
  var url=C.url.replace(/\/+$/,'');
  function save(p){
    var s={access:p.get('access_token'),refresh:p.get('refresh_token'),exp:Date.now()+(+p.get('expires_in')||3600)*1000,provider:'google'};
    try{localStorage.setItem('sk_sess',JSON.stringify(s))}catch(e){}return s}
  /* coming back from Google: Supabase puts the session in the URL hash */
  if(/access_token=/.test(location.hash)){
    var p=new URLSearchParams(location.hash.slice(1));
    if(p.get('access_token')){save(p);history.replaceState(null,'',location.pathname);location.replace('index.html');return}
  }
  var q=new URLSearchParams(location.search);
  var err=q.get('error_description')||(/error_description=/.test(location.hash)&&new URLSearchParams(location.hash.slice(1)).get('error_description'));
  window.skAuth={
    social:function(provider){
      if(provider!=='google')return Promise.reject(new Error('Only Google sign-in is switched on.'));
      var back=location.origin+location.pathname.replace(/[^\/]*$/,'');
      location.href=url+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(back);
      return new Promise(function(){});
    }
  };
  if(err)window.addEventListener('DOMContentLoaded',function(){var m=document.querySelector('.fmsg,.gerr');if(m){m.textContent=err;m.className=(m.className||'')+' err'}});
})();
