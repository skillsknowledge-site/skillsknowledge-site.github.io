/* Appeal page: sends the appeal to Supabase (submit_appeal). The X goes back to the login page. */
(function(){
  var $=function(s){return document.querySelector(s)};
  var f=$('#ap-form');if(!f)return;
  function say(t,bad){var e=$('#ap-st');e.textContent=t;e.className='ap-st'+(bad?' bad':'')}
  f.addEventListener('submit',function(e){e.preventDefault();
    var C=window.SK_CFG||{},id=$('#ap-id').value.trim(),m=$('#ap-msg').value.trim();
    if(!id){say('Enter the email, username or phone of the blocked account.',1);return}
    if(m.length<5){say('Please explain what happened.',1);return}
    if(!(C.url&&C.anon)){say('Sending is not set up yet.',1);return}
    var b=$('#ap-go');b.disabled=true;say('Sending…');
    fetch(C.url.replace(/\/+$/,'')+'/rest/v1/rpc/submit_appeal',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+C.anon,'Content-Type':'application/json'},body:JSON.stringify({identifier:id,message:m})})
      .then(function(r){return r.json().catch(function(){return null})})
      .then(function(r){b.disabled=false;
        if(r==='ok'){f.hidden=true;$('#ap-done').hidden=false;window.scrollTo(0,0)}
        else say(r==='wait'?'You already sent an appeal. Please wait for a reply.':r==='short'?'Please write a little more.':'We could not find a blocked account with those details.',1)},
        function(){b.disabled=false;say('Could not send. Please try again.',1)});
  });
})();
