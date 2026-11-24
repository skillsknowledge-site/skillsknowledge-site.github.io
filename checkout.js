/* Checkout: package, details, payment method, then an order is saved. No card numbers are collected here.
   To go live later, replace the "pay" step of each method with the provider's hosted page (Stripe, JazzCash, Easypaisa). */
(function(){
  var C=window.SK_CFG||{},$=function(s){return document.querySelector(s)};
  var ITEMS={
    video:{name:'Video editing',plans:[{id:'reel',n:'Reel / short',p:3000},{id:'long',n:'YouTube video',p:8000},{id:'promo',n:'Ad / promo',p:12000}]},
    code:{name:'Coding',plans:[{id:'landing',n:'Landing page',p:15000},{id:'site',n:'Multi-page website',p:40000},{id:'app',n:'Web app',p:90000}]}
  };
  var METHODS=[
    {id:'card',n:'Card',d:'Visa or Mastercard through a secure payment provider',f:[]},
    {id:'jazzcash',n:'JazzCash',d:'Send to the JazzCash account, then enter the transaction ID',f:['Transaction ID']},
    {id:'easypaisa',n:'Easypaisa',d:'Send to the Easypaisa account, then enter the transaction ID',f:['Transaction ID']},
    {id:'bank',n:'Bank transfer',d:'Transfer to the bank account, then enter the reference',f:['Transfer reference']},
    {id:'cod',n:'Pay after delivery',d:'Pay when the first draft is approved',f:[]}
  ];
  var ACCOUNT={jazzcash:'JazzCash: 03XX XXXXXXX (SkillsKnowledge)',easypaisa:'Easypaisa: 03XX XXXXXXX (SkillsKnowledge)',bank:'Bank: XXXX | IBAN PK00 XXXX 0000 0000 0000 0000'};
  var q=new URLSearchParams(location.search),key=ITEMS[q.get('item')]?q.get('item'):'video',it=ITEMS[key];
  var plan=it.plans[0],method=null;
  function pkr(n){return window.SKM?SKM.fmt(n):'PKR '+n.toLocaleString('en-US')}
  var P={bal:0,rate:28,use:0,disc:0};
  function calc(){var on=$('#pt-use')&&$('#pt-use').checked;var max=Math.floor(plan.p/P.rate);P.use=on?Math.min(P.bal,max):0;P.disc=Math.floor(P.use*P.rate)}
  function cur(){var s=$('#co-cur');if(!s||!window.SKM)return;if(!s.options.length){SKM.list().forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=k;s.appendChild(o)});s.addEventListener('change',function(){SKM.set(s.value);plans();sum()})}
    s.value=SKM.code();var n=$('#s-pkr');if(n){var tot=Math.max(plan.p-P.disc,0);n.hidden=SKM.code()==='PKR';n.textContent='Payment is taken in PKR. Your total in PKR is PKR '+tot.toLocaleString('en-US')+'. Other currencies are shown only as a guide.'}}
  function sum(){calc();cur();$('#s-item').textContent=it.name;$('#s-plan').textContent=plan.n;$('#s-amt').textContent=pkr(plan.p);$('#s-tot').textContent=pkr(Math.max(plan.p-P.disc,0));$('#s-dl').hidden=!P.use;$('#s-disc').textContent='- '+pkr(P.disc);if($('#pt-txt'))$('#pt-txt').textContent=P.use?'Using '+P.use+' point'+(P.use>1?'s':''):'Use my points';var m=METHODS.filter(function(x){return x.id===method})[0];$('#s-method').textContent=m?m.n:'Not chosen'}
  function plans(){$('#co-plans').innerHTML=it.plans.map(function(p){return '<label class="co-opt"><input type="radio" name="plan" value="'+p.id+'"'+(p===plan?' checked':'')+'><span><b>'+p.n+'</b><i>'+pkr(p.p)+'</i></span></label>'}).join('');
    [].forEach.call(document.querySelectorAll('input[name=plan]'),function(r){r.addEventListener('change',function(){plan=it.plans.filter(function(p){return p.id===r.value})[0];sum()})})}
  function methods(){$('#co-methods').innerHTML=METHODS.map(function(m){return '<label class="co-opt"><input type="radio" name="method" value="'+m.id+'"><span><b>'+m.n+'</b><em>'+m.d+'</em></span></label>'}).join('');
    [].forEach.call(document.querySelectorAll('input[name=method]'),function(r){r.addEventListener('change',function(){method=r.value;var m=METHODS.filter(function(x){return x.id===method})[0];
      $('#co-pay').innerHTML=(ACCOUNT[method]?'<p class="co-acc">'+ACCOUNT[method]+'</p>':'')+(method==='card'?'<p class="co-acc">You will be sent to the provider\'s secure page to enter card details after you place the order.</p>':'')+m.f.map(function(f){return '<label>'+f+'<input id="co-ref" maxlength="80" autocomplete="off"></label>'}).join('');sum()})})}
  function err(t){var e=$('#co-err');e.textContent=t;e.hidden=!t}
  function token(){try{var s=JSON.parse(localStorage.getItem('sk_sess')||'null');return s&&s.access||''}catch(e){return ''}}
  $('#co-form').addEventListener('submit',function(e){e.preventDefault();err('');
    var n=$('#co-name').value.trim(),em=$('#co-email').value.trim(),ph=$('#co-phone').value.trim(),note=$('#co-note').value.trim(),ref=($('#co-ref')||{}).value||'';
    if(!n){err('Please enter your name.');return}
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){err('Please enter a valid email.');return}
    if(!method){err('Please choose a payment method.');return}
    if((method==='jazzcash'||method==='easypaisa'||method==='bank')&&ref.trim().length<4){err('Enter the transaction ID or reference after you pay.');return}
    var go=$('#co-go');go.disabled=true;go.textContent='Placing order…';
    var body={p_item:it.name,p_plan:plan.n,p_amount:plan.p,p_name:n,p_email:em,p_phone:ph,p_note:note,p_method:method,p_reference:ref.trim(),p_points:P.use};
    var done=function(res){var id=res&&typeof res==='object'?res.id:res,dsc=res&&res.discount||0;$('.co-grid').hidden=true;$('#co-steps').hidden=true;$('#co-done').hidden=false;$('#co-done-t').textContent='Order'+(id?' #'+id:'')+' for '+it.name+' ('+plan.n+', '+pkr(plan.p-dsc)+(dsc?' after '+pkr(dsc)+' points discount':'')+') is saved. Your payment will be checked within 2-3 days and a confirmation will be sent to '+em+'.'};
    if(!(C.url&&C.anon)){done('');return}
    fetch(C.url.replace(/\/+$/,'')+'/rest/v1/rpc/create_order',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+(token()||C.anon),'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j&&j.message||'failed');return j})})
      .then(done,function(x){go.disabled=false;go.textContent='Place order';err('Could not place the order. '+(x&&x.message||'')+' Please try again.')});
  });
  window.addEventListener('sk-rates',function(){try{plans();sum()}catch(e){}});
  /* only logged-in people can buy */
  if(!token()){var g=document.createElement('section');g.className='co-gate card';g.innerHTML='<h2>Please log in to buy</h2><p>You need an account to place an order, so we can keep your order and points safe.</p><a class="btn btn-solid" href="login.html">Log in or create an account</a>';var gr=document.querySelector('.co-grid');if(gr){gr.hidden=true;gr.parentNode.insertBefore(g,gr)}var cs=$('#co-steps');if(cs)cs.hidden=true;return}
  function loadPts(){var t=token();if(!t||!(C.url&&C.anon))return;
    fetch(C.url.replace(/\/+$/,'')+'/rest/v1/rpc/points_status',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:'{}'})
      .then(function(r){return r.ok?r.json():null}).then(function(s){if(!s||!s.balance)return;P.bal=s.balance;P.rate=s.usd_per_point*s.usd_to_pkr;$('#pt-bal').textContent=s.balance+' point'+(s.balance>1?'s':'')+' ('+pkr(Math.floor(s.balance*P.rate))+')';$('#co-pts').hidden=false;$('#pt-use').addEventListener('change',sum)}).catch(function(){})}
  document.title='Checkout - '+it.name+' | SkillsKnowledge';plans();methods();sum();loadPts();
})();
