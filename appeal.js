(function(){
  var f=document.getElementById('appeal-form');if(!f)return;
  var error=document.getElementById('appeal-error'),button=f.querySelector('button[type=submit]');
  function fail(message){error.textContent=message;error.hidden=false;button.disabled=false;button.textContent='Submit'}
  f.addEventListener('submit',function(e){
    e.preventDefault();if(!f.reportValidity())return;
    var C=window.SK_CFG||{},identifier=f.elements.identifier.value.trim(),message=f.elements.appeal.value.trim();
    error.hidden=true;
    if(!C.url||!C.anon){fail('Appeal submission is unavailable right now. Please try again later.');return}
    button.disabled=true;button.textContent='Submitting…';
    fetch(C.url.replace(/\/+$/,'')+'/rest/v1/rpc/submit_appeal',{method:'POST',headers:{apikey:C.anon,'Content-Type':'application/json'},body:JSON.stringify({identifier:identifier,message:message})})
      .then(function(r){if(!r.ok)throw new Error('Appeal submission failed. Please try again.');return r.json()})
      .then(function(result){
        if(result==='ok'){document.getElementById('appeal-form-view').hidden=true;document.getElementById('appeal-success').hidden=false;return}
        if(result==='wait'){fail('An appeal for this account is already open. Please wait before sending another.');return}
        if(result==='short'){fail('Please add a little more detail to your message.');return}
        if(result==='notblocked'){fail('This account is not currently marked as blocked, so it does not need an appeal.');return}
        fail('We could not submit your appeal. Please try again.');
      },function(err){fail(err&&err.message||'We could not submit your appeal. Please try again.')});
  });
})();
