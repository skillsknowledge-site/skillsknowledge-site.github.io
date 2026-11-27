/* Create account: one full-screen card, one question at a time.
   name -> email -> password -> code from the email -> username + terms -> back to log in -> welcome message on the home page.
   Needs config.js (Supabase). In Supabase > Authentication > Email Templates > "Confirm signup", put {{ .Token }}
   in the message so the email carries the 6-digit code. */
(function(){
  'use strict';
  var C=window.SK_CFG||{},openers=[].slice.call(document.querySelectorAll('[data-signup]'));
  if(!openers.length)return;
  var url=(C.url||'').replace(/\/+$/,''),ready=!!(C.url&&C.anon),web=/^https?:$/.test(location.protocol);
  var RESERVED=['admin','administrator','root','support','owner','moderator','system','api','login','account','sk','skillsknowledge'];
  var EYE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var LOGO='<svg viewBox="1.1 1.5 131.8 97.0" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="6.5" stroke-linejoin="round" stroke-linecap="round"><polyline points="60.4,8 24.4,8 16.6,47 52.6,47 43.6,92 7.6,92"/><polyline points="84.4,8 67.6,92"/><polyline points="126.4,8 87.8,41"/><polyline points="76.8,51 107.6,92"/></g></svg>';
  var el=null,step=0,data={first:'',last:'',email:'',uid:'',token:''},cool=0,coolT=0,nameT=0,freeName='';
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

  function $(s){return el.querySelector(s)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function nice(m){
    if(/already registered|already been registered/i.test(m))return 'exists';
    if(/rate limit|too many|security purposes|seconds/i.test(m))return 'Too many tries. Please wait a minute and try again.';
    if(/password should|weak|least/i.test(m))return 'Please choose a stronger password.';
    if(/expired|invalid|otp|token/i.test(m))return 'That code is wrong or has expired.';
    if(/valid email|invalid format/i.test(m))return 'Enter a real email address.';
    return m||'Something went wrong. Please try again.';
  }
  function api(path,body,token,method){
    var h={apikey:C.anon,'Content-Type':'application/json'};if(token)h.Authorization='Bearer '+token;
    return fetch(url+path,{method:method||'POST',headers:h,body:body?JSON.stringify(body):undefined}).then(function(r){
      return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}
        if(!r.ok){var e=new Error(nice((j&&(j.msg||j.error_description||j.message||j.error))||''));e.status=r.status;e.code=j&&j.code;throw e}return j})},
      function(){throw new Error('Cannot reach the server. Check your connection.')});
  }
  function saveSession(j){try{localStorage.setItem('sk_sess',JSON.stringify({access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000,provider:'email'}))}catch(e){}}
  function home(){location.replace(web?'./':'index.html')}
  function say(id,t,c){var m=$('#'+id);if(m){m.textContent=t||'';m.className='su-msg'+(c?' '+c:'')}}
  function busy(b,on,label){b.disabled=on;if(label)b.textContent=label}

  function field(id,label,type,extra){return '<div class="af"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" placeholder=" " '+(extra||'')+'></div>'}
  function build(){
    el=document.createElement('div');el.className='su';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','su-h');
    el.innerHTML='<div class="su-load" aria-hidden="true"><i id="su-bar"></i></div><div class="su-card">'+
      '<div class="su-top"><span class="su-logo">'+LOGO+'</span><button class="su-x" type="button" id="su-x" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
      
      '<form class="su-step" data-s="0" novalidate><h2 id="su-h">What is your name?</h2><p class="su-sub">Create your SkillsKnowledge account. It takes less than a minute.</p>'+
        '<div class="su-two">'+field('su-fn','First name','text','autocomplete="given-name" maxlength="40"')+field('su-ln','Last name','text','autocomplete="family-name" maxlength="40"')+'</div><p class="su-msg" id="su-m0" role="alert"></p>'+
        '<div class="su-row"><button class="su-link" type="button" id="su-back0">Back to log in</button><button class="btn btn-solid" type="submit">Next</button></div></form>'+
      '<form class="su-step" data-s="1" hidden novalidate><h2>What is your email?</h2><p class="su-sub">We will send a 6-digit code to this email to check that it is yours. Please use an email you can open right now.</p>'+
        field('su-em','Email','email','autocomplete="email" autocapitalize="off" spellcheck="false"')+'<p class="su-msg" id="su-m1" role="alert"></p>'+
        '<div class="su-row"><button class="su-link" type="button" data-to="0">Back</button><button class="btn btn-solid" type="submit">Next</button></div></form>'+
      '<form class="su-step" data-s="2" hidden novalidate><h2>Create a password</h2><p class="su-sub">At least 8 characters, with a letter and a number.</p>'+
        '<div class="af"><label for="su-pw">Password</label><div class="pwrap"><input id="su-pw" type="password" placeholder=" " autocomplete="new-password"><button class="eye" type="button" aria-label="Show password" data-eye>'+EYE+'</button></div></div>'+
        '<div class="af"><label for="su-pw2">Confirm password</label><div class="pwrap"><input id="su-pw2" type="password" placeholder=" " autocomplete="new-password"></div></div><p class="su-msg" id="su-m2" role="alert"></p>'+
        '<div class="su-row"><button class="su-link" type="button" data-to="1">Back</button><button class="btn btn-solid" type="submit">Next</button></div></form>'+
      '<form class="su-step" data-s="3" hidden novalidate><h2>Check your email</h2><p class="su-sub" id="su-sent"></p>'+
        '<div class="af su-code"><label for="su-code">Code</label><input id="su-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder=" "></div><p class="su-msg" id="su-m3" role="alert"></p>'+
        '<div class="su-row"><button class="su-link" type="button" id="su-resend">Send a new code</button><button class="btn btn-solid" type="submit">Verify</button></div></form>'+
      '<form class="su-step" data-s="4" hidden novalidate><h2>Choose a username</h2><p class="su-sub">Nobody else can use it. Use 3 to 20 letters, numbers, dots or underscores.</p>'+
        '<div class="af su-at"><label for="su-un">Username</label><b>@</b><input id="su-un" type="text" maxlength="20" placeholder=" " autocomplete="off" autocapitalize="off" spellcheck="false"></div><p class="su-msg" id="su-m4" role="status"></p>'+
        '<label class="chk su-terms"><input type="checkbox" id="su-terms"><span>I agree to the <a href="terms.html#terms" target="_blank" rel="noopener">Terms</a> and <a href="terms.html#privacy" target="_blank" rel="noopener">Privacy Policy</a></span></label>'+
        '<div class="su-row"><span></span><button class="btn btn-solid" type="submit" id="su-go4" disabled>Finish</button></div></form>'+
      '<div class="su-step su-done" data-s="5" hidden><svg class="su-tick" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="46"/><path d="M28 50l14 14 27-30"/></svg><h2>Account created</h2><p class="su-sub">Now log in with your details.</p></div>'+
    '</div>';
    document.body.appendChild(el);document.body.style.overflow='hidden';
    $('#su-x').addEventListener('click',close);$('#su-back0').addEventListener('click',close);
    el.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
    [].forEach.call(el.querySelectorAll('[data-to]'),function(b){b.addEventListener('click',function(){show(+b.dataset.to)})});
    $('[data-eye]').addEventListener('click',function(){var i=$('#su-pw'),s=i.type==='password';i.type=s?'text':'password';$('#su-pw2').type=i.type;this.setAttribute('aria-label',s?'Hide password':'Show password')});
    el.addEventListener('submit',function(e){e.preventDefault();var n=+e.target.dataset.s;[stepName,stepEmail,stepPassword,verify,finish][n]()});
    $('#su-resend').addEventListener('click',resend);
    $('#su-code').addEventListener('input',function(){this.value=this.value.replace(/\D/g,'')});
    $('#su-un').addEventListener('input',nameInput);
    $('#su-terms').addEventListener('change',gate);
  }
  function gate(){var go=$('#su-go4');if(go)go.disabled=!(freeName&&$('#su-terms').checked)}
  function show(n){
    step=n;[].forEach.call(el.querySelectorAll('.su-step'),function(s){s.hidden=+s.dataset.s!==n});
    var bar=$('#su-bar');if(bar)bar.style.width=Math.min(100,Math.round((n+1)/6*100))+'%';
    var f=el.querySelector('.su-step:not([hidden]) input');if(f)setTimeout(function(){f.focus()},40);
  }
  function close(){if(!el)return;clearInterval(coolT);el.remove();el=null;document.body.style.overflow='';
    if(location.hash==='#signup')history.replaceState(null,'',location.pathname+location.search)}

  function stepName(){
    var f=$('#su-fn').value.trim().replace(/\s+/g,' '),l=$('#su-ln').value.trim().replace(/\s+/g,' ');
    if(f.length<2){say('su-m0','Enter your first name.','bad');return}
    if(l.length<1){say('su-m0','Enter your last name.','bad');return}
    data.first=f;data.last=l;say('su-m0','');show(1);
  }
  function stepEmail(){
    var v=$('#su-em').value.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){say('su-m1','Enter a real email address, like name@example.com.','bad');return}
    data.email=v;say('su-m1','');show(2);
  }
  function stepPassword(){
    var p=$('#su-pw').value,b=$('#su-pw').closest('form').querySelector('.btn');
    if(p.length<8||!/[a-z]/i.test(p)||!/[0-9]/.test(p)){say('su-m2','Use at least 8 characters with a letter and a number.','bad');return}
    if(p!==$('#su-pw2').value){say('su-m2','The two passwords are not the same.','bad');return}
    if(isBlockedRegion()){say('su-m2','Something went wrong. Please try again.','bad');return}
    if(!ready){say('su-m2','The database is not connected yet, so accounts cannot be created.','bad');return}
    busy(b,true,'Sending code…');say('su-m2','');
    api('/auth/v1/signup',{email:data.email,password:p,data:{full_name:data.first+' '+data.last,ref:refFromUrl()}}).then(function(j){
      busy(b,false,'Next');
      if(j&&j.access_token){saveSession(j);data.uid=j.user&&j.user.id;data.token=j.access_token;show(4);return}
      toCode();
    },function(er){busy(b,false,'Next');
      /* an email that already has an account looks exactly like a new one, so nobody can use this form to find out who is registered */
      if(er.message==='exists'){toCode();return}
      say('su-m2',er.message,'bad')});
  }
  function toCode(){
    $('#su-sent').textContent='We sent a 6-digit code to '+data.email+'. Open your email, copy the code and type it here. It may take a minute. Check Spam if you do not see it.';
    say('su-m3','');startCool();show(3);
  }
  function startCool(){
    cool=60;clearInterval(coolT);var b=$('#su-resend');b.disabled=true;
    coolT=setInterval(function(){cool--;if(!el){clearInterval(coolT);return}
      if(cool<=0){clearInterval(coolT);b.disabled=false;b.textContent='Send a new code'}else b.textContent='Send a new code ('+cool+')'},1000);
    b.textContent='Send a new code (60)';
  }
  function resend(){
    api('/auth/v1/resend',{type:'signup',email:data.email}).then(function(){say('su-m3','A new code is on its way.','ok');startCool()},function(er){say('su-m3',er.message,'bad')});
  }
  function verify(){
    var c=$('#su-code').value.trim(),b=$('#su-code').closest('form').querySelector('.btn');
    if(c.length<6){say('su-m3','Type the code from your email.','bad');return}
    busy(b,true,'Checking…');
    api('/auth/v1/verify',{type:'signup',email:data.email,token:c}).then(function(j){
      busy(b,false,'Verify');
      if(!j||!j.access_token){say('su-m3','Could not verify. Try again.','bad');return}
      saveSession(j);data.uid=j.user&&j.user.id;data.token=j.access_token;show(4);
    },function(er){busy(b,false,'Verify');say('su-m3',er.message,'bad')});
  }
  function nameInput(){
    var i=$('#su-un'),n=i.value.toLowerCase().replace(/[^a-z0-9_.]/g,'');if(n!==i.value)i.value=n;
    freeName='';gate();clearTimeout(nameT);
    if(!n){say('su-m4','');return}
    if(!/^[a-z0-9_.]{3,20}$/.test(n)){say('su-m4','Use 3 to 20 letters, numbers, dots or underscores.','bad');return}
    if(RESERVED.indexOf(n)>-1){say('su-m4','That username is reserved.','bad');return}
    say('su-m4','Checking…');
    nameT=setTimeout(function(){api('/rest/v1/rpc/username_free',{name:n},data.token).then(function(f){
      if(i.value!==n)return;if(f){freeName=n;gate();say('su-m4','@'+n+' is available.','ok')}else say('su-m4','That username is already taken.','bad')},
      function(){say('su-m4','Could not check right now. Try again.','bad')})},350);
  }
  /* back to the log in screen: the new member signs in once, then the home page greets them */
  function toLogin(){
    var em=data.email;close();
    var f=document.getElementById('f-login');if(!f)return;
    var a=f.querySelector('.aalert');if(a){a.textContent='Account created. Log in with your email or username to continue.';a.className='aalert ok';a.hidden=false}
    var i=document.getElementById('li-email');if(i){i.value=em;var w=i.closest('.af');if(w)w.classList.remove('bad')}
    var p=document.getElementById('li-pw');if(p)p.focus();
  }
  function finish(){
    if(!freeName||!$('#su-terms').checked){say('su-m4','Pick an available username and accept the Terms and Privacy Policy.','bad');return}
    var go=$('#su-go4');busy(go,true,'Saving…');
    api('/rest/v1/profiles?id=eq.'+encodeURIComponent(data.uid),{username:freeName,display_name:(data.first+' '+data.last).slice(0,60),updated_at:new Date().toISOString()},data.token,'PATCH').then(function(){
      var rc=refFromUrl();
      return rc?api('/rest/v1/rpc/claim_reference',{p_code:rc},data.token).then(function(){},function(){}):null;
    }).then(function(){
      try{localStorage.removeItem('sk_ref');localStorage.removeItem('sk_sess');localStorage.setItem('sk_welcome',JSON.stringify({name:data.first,t:Date.now()}))}catch(e){}
      api('/auth/v1/logout',null,data.token).catch(function(){});
      show(5);setTimeout(toLogin,1300)},function(er){busy(go,false,'Finish');
      say('su-m4',er.status===409||er.code==='23505'?'That username is already taken.':er.message,'bad')});
  }

  function refFromUrl(){var m=location.search.match(/[?&]ref=([A-Za-z0-9-]{3,14})/),v=m?m[1].toUpperCase():'';try{if(v)localStorage.setItem('sk_ref',v);else v=localStorage.getItem('sk_ref')||''}catch(e){}return v}
  function start(e){
    if(e)e.preventDefault();
    if(isBlockedRegion())return;
    if(el)return;
    build();
    if(!ready){$('.su-card form[data-s="0"] .su-sub').textContent='The database is not connected yet, so accounts cannot be created.'}
    show(0);refFromUrl();
  }
  openers.forEach(function(a){a.addEventListener('click',start)});
  if(/[?&]ref=/.test(location.search))start();
  if(location.hash==='#signup')start();
})();
