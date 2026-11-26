/* Thank-you page after the card page. The payment company tells our server when the money arrives; this page just waits for that. */
(function(){
  var C=window.SK_CFG||{},q=new URLSearchParams(location.search),id=parseInt(q.get('order'),10),cancel=q.get('cancel')==='1';
  function $(s){return document.querySelector(s)}
  function token(){try{var s=JSON.parse(localStorage.getItem('sk_sess')||'null');return s&&s.access||''}catch(e){return ''}}
  function show(h,t,bad){$('#pd-h').textContent=h;$('#pd-t').textContent=t;$('#pd-ic').style.display=bad?'none':''}
  if(!id||!(C.url&&C.anon)){show('Payment','We could not find this order.',true);return}
  if(cancel){show('Payment cancelled','Nothing was charged. You can go back and try again whenever you like.',true);return}
  var tries=0;
  function ask(){tries++;
    fetch(C.url.replace(/\/+$/,'')+'/rest/v1/rpc/order_status',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify({p_id:id})})
      .then(function(r){return r.ok?r.json():null}).then(function(s){
        if(s==='paid'){show('Payment received','Thank you. Order #'+id+' is paid. Any points you earned are in your account.');return}
        if(tries<30){setTimeout(ask,3000)}else show('We are still checking','Your payment can take a few minutes to show. You will get a notification when order #'+id+' is confirmed. If you were charged and see nothing after an hour, send us an appeal or feedback message.')
      },function(){if(tries<30)setTimeout(ask,3000)})}
  ask();
})();
