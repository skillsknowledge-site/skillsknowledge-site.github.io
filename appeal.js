/* Appeal page: sends the appeal to Supabase (submit_appeal2). The X goes back to the login page.
   The answer is always the same, so nobody can use this form to find out who is registered. */
(function(){
  var $=function(s){return document.querySelector(s)};
  var f=$('#ap-form');if(!f)return;
  function say(t,bad){var e=$('#ap-st');e.textContent=t;e.className='ap-st'+(bad?' bad':'')}
  function sess(){try{return JSON.parse(localStorage.getItem('sk_sess')||'null')}catch(e){return null}}
  f.addEventListener('submit',function(e){e.preventDefault();
    if(window.SK&&typeof SK.blockedRegion==='function'&&SK.blockedRegion()){say('Something went wrong. Please try again.',1);return}
    var C=window.SK_CFG||{},id=$('#ap-id').value.trim(),m=$('#ap-msg').value.trim(),k=$('#ap-kind').value;
    if(!id){say('Enter the email, username or phone of the account.',1);return}
    if(/^(?:\+|00)972/.test(id.replace(/[\s()-]/g,''))){say('Phone number not verified.',1);return}
    if(m.length<5){say('Please explain what happened.',1);return}
    if(!(C.url&&C.anon)){say('Sending is not set up yet.',1);return}
    var b=$('#ap-go'),s=sess(),tok=s&&s.exp>Date.now()?s.access:C.anon;b.disabled=true;say('Sending…');
    fetch(C.url.replace(/\/+$/,'')+'/rest/v1/rpc/submit_appeal2',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({p_kind:k,p_identifier:id,p_message:m})})
      .then(function(r){return r.json().catch(function(){return null})})
      .then(function(r){b.disabled=false;
        if(r==='ok'){f.hidden=true;$('#ap-done').hidden=false;window.scrollTo(0,0)}
        else say(r==='short'?'Please write a little more.':'Could not send. Please try again.',1)},
        function(){b.disabled=false;say('Could not send. Please try again.',1)});
  });
})();
