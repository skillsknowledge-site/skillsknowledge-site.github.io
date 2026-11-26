/* Checkout: package, details, payment method, then an order is saved. No card numbers are collected here.
   To go live later, replace the "pay" step of each method with the provider's hosted page (Stripe, JazzCash, Easypaisa). */
(function(){
  var C=window.SK_CFG||{},$=function(s){return document.querySelector(s)};
  var ITEMS={
    video:{name:'Video editing',plans:[{id:'reel',n:'Reel / short',p:3000},{id:'long',n:'YouTube video',p:8000},{id:'promo',n:'Ad / promo',p:12000}]},
    code:{name:'Coding',plans:[{id:'landing',n:'Landing page',p:15000},{id:'site',n:'Multi-page website',p:40000},{id:'app',n:'Web app',p:90000}]}
  };
  var METHODS=[
    {id:'card',n:'Google Pay or card',d:'Opens the payment company\'s secure page. Your card is charged automatically.',f:[]},
    {id:'sadapay',n:'SadaPay',d:'',mark:['S','#16a085'],f:['Transaction ID']},
    {id:'jazzcash',n:'JazzCash',mark:['J','#d4202c'],d:'Send to the JazzCash account, then enter the transaction ID',f:['Transaction ID']},
    {id:'easypaisa',n:'Easypaisa',mark:['E','#2e9e4f'],d:'Send to the Easypaisa account, then enter the transaction ID',f:['Transaction ID']},
    {id:'bank',n:'Bank transfer',d:'Transfer to the bank account, then enter the reference',f:['Transfer reference']},
    {id:'cod',n:'Pay after delivery',d:'Pay when the first draft is approved',f:[]}
  ];
  var ACCOUNT={sadapay:'SadaPay: 03XX XXXXXXX (SkillsKnowledge)',jazzcash:'JazzCash: 03XX XXXXXXX (SkillsKnowledge)',easypaisa:'Easypaisa: 03XX XXXXXXX (SkillsKnowledge)',bank:'Bank: XXXX | IBAN PK00 XXXX 0000 0000 0000 0000'};
  var q=new URLSearchParams(location.search),key=ITEMS[q.get('item')]?q.get('item'):'video',it=ITEMS[key];
  var plan=it.plans[0],method=null;
  function pkr(n){return window.SKM?SKM.fmt(n):'PKR '+n.toLocaleString('en-US')}
  var P={bal:0,rate:28,use:0,disc:0};
  function calc(){var on=$('#pt-use')&&$('#pt-use').checked;var max=Math.floor(plan.p/P.rate);P.use=on?Math.min(P.bal,max):0;P.disc=Math.floor(P.use*P.rate)}
  function cur(){var s=$('#co-cur');if(!s||!window.SKM)return;if(!s.options.length){SKM.list().forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=k;s.appendChild(o)});s.addEventListener('change',function(){SKM.set(s.value);plans();sum()})}
    s.value=SKM.code();var n=$('#s-pkr');if(n){var tot=Math.max(plan.p-P.disc,0);n.hidden=SKM.code()==='PKR';n.textContent='Payment is taken in PKR. Your total in PKR is PKR '+tot.toLocaleString('en-US')+'. Other currencies are shown only as a guide (live rates by exchangerate-api.com).'}}
  function sum(){calc();cur();$('#s-item').textContent=it.name;$('#s-plan').textContent=plan.n;$('#s-amt').textContent=pkr(plan.p);$('#s-tot').textContent=pkr(Math.max(plan.p-P.disc,0));$('#s-dl').hidden=!P.use;$('#s-disc').textContent='- '+pkr(P.disc);if($('#pt-txt'))$('#pt-txt').textContent=P.use?'Using '+P.use+' point'+(P.use>1?'s':''):'Use my points';var m=METHODS.filter(function(x){return x.id===method})[0];$('#s-method').textContent=m?m.n:'Not chosen'}
  function plans(){$('#co-plans').innerHTML=it.plans.map(function(p){return '<label class="co-opt"><input type="radio" name="plan" value="'+p.id+'"'+(p===plan?' checked':'')+'><span><b>'+p.n+'</b><i>'+pkr(p.p)+'</i></span></label>'}).join('');
    [].forEach.call(document.querySelectorAll('input[name=plan]'),function(r){r.addEventListener('change',function(){plan=it.plans.filter(function(p){return p.id===r.value})[0];sum()})})}
  function list(){var pk=!window.SKM||SKM.pk();return METHODS.filter(function(m){return pk||m.id==='card'})}
  function tile(m,cls){return '<label class="co-opt '+cls+'"><input type="radio" name="method" value="'+m.id+'"><span>'+(m.mark?'<i class="co-mark" style="background:'+m.mark[1]+'">'+m.mark[0]+'</i>':'')+'<b>'+m.n+'</b>'+(cls==='co-w'?'':'<em>'+m.d+'</em>')+'</span></label>'}
  function get(id){return METHODS.filter(function(m){return m.id===id})[0]}
  function renderMethods(){method=null;$('#co-pay').innerHTML='';var pk=!window.SKM||SKM.pk(),h='';
    if(pk)h+='<p class="co-lbl">Pay with a wallet</p><div class="co-wallets">'+['jazzcash','easypaisa','sadapay'].map(function(i){return tile(get(i),'co-w')}).join('')+'</div><p class="co-lbl">Or pay with a card</p>';
    h+=tile(get('card'),'co-c')+'<div class="co-three" aria-label="What you will enter"><span>1 Card number</span><span>2 Expiry date</span><span>3 Security code (CVC)</span></div>';
    if(pk)h+='<details class="co-more"><summary>More ways to pay</summary><div class="co-methods">'+['bank','cod'].map(function(i){return tile(get(i),'')}).join('')+'</div></details>';
    $('#co-methods').innerHTML=h;
    [].forEach.call(document.querySelectorAll('input[name=method]'),function(r){r.addEventListener('change',function(){method=r.value;var m=METHODS.filter(function(x){return x.id===method})[0];
      $('#co-pay').innerHTML=(ACCOUNT[method]?'<p class="co-acc">'+ACCOUNT[method]+'</p>':'')+(method==='card'?'<p class="co-acc">After you press the button you are taken to the payment company\'s own secure page to enter your card or use Google Pay. Card details are never typed on this website and we never see them.</p>':'')+m.f.map(function(f){return '<label>'+f+'<input id="co-ref" maxlength="80" autocomplete="off"></label>'}).join('');sum()})})}
  function methods(){renderMethods();var pk=!window.SKM||SKM.pk(),box=$('#co-methods'),a=document.createElement('button');a.type='button';a.className='co-cty';
    a.textContent=pk?'Paying from another country? Click here.':'Paying from Pakistan? Click here for local methods.';
    a.addEventListener('click',function(){if(window.SKM)SKM.setPk(!pk);methods()});box.appendChild(a);
    if(!pk){var r=document.querySelector('input[name=method]');if(r){r.checked=true;r.dispatchEvent(new Event('change'))}}}
  function err(t){var e=$('#co-err');e.textContent=t;e.hidden=!t}
  function token(){try{var s=JSON.parse(localStorage.getItem('sk_sess')||'null');return s&&s.access||''}catch(e){return ''}}
  $('#co-form').addEventListener('submit',function(e){e.preventDefault();err('');
    var n=$('#co-name').value.trim(),em=$('#co-email').value.trim(),ph=$('#co-phone').value.trim(),note=$('#co-note').value.trim(),ref=($('#co-ref')||{}).value||'';
    if(!n){err('Please enter your name.');return}
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){err('Please enter a valid email.');return}
    if(!method){err('Please choose a payment method.');return}
    if((method==='jazzcash'||method==='easypaisa'||method==='sadapay'||method==='bank')&&ref.trim().length<4){err('Enter the transaction ID or reference after you pay.');return}
    var go=$('#co-go');go.disabled=true;go.textContent='Placing order…';
    var body={p_item:it.name,p_plan:plan.n,p_amount:plan.p,p_name:n,p_email:em,p_phone:ph,p_note:note,p_method:method,p_reference:ref.trim(),p_points:P.use};
    var pay=function(res){var id=res&&typeof res==='object'?res.id:res;
      if(method!=='card'||!id){done(res);return}
      go.textContent='Opening the secure payment page…';
      fetch(C.url.replace(/\/+$/,'')+'/functions/v1/sk-pay-create',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify({order_id:id,currency:(!window.SKM||SKM.pk())?'PKR':'USD'})})
        .then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.url){location.href=j.url}else{res.noPay=true;done(res)}},function(){res.noPay=true;done(res)})};
    var done=function(res){var id=res&&typeof res==='object'?res.id:res,dsc=res&&res.discount||0;$('.co-grid').hidden=true;$('#co-steps').hidden=true;$('#co-done').hidden=false;$('#co-done-t').textContent='Order'+(id?' #'+id:'')+' for '+it.name+' ('+plan.n+', '+pkr(plan.p-dsc)+(dsc?' after '+pkr(dsc)+' points discount':'')+') is saved.'+(res&&res.noPay?' Online card payment is not available right now, so we will contact you with another way to pay. ':'')+' Your payment will be checked within 2-3 days and a confirmation will be sent to '+em+'.'};
    if(!(C.url&&C.anon)){done('');return}
    fetch(C.url.replace(/\/+$/,'')+'/rest/v1/rpc/create_order',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+(token()||C.anon),'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j&&j.message||'failed');return j})})
      .then(pay,function(x){go.disabled=false;go.textContent='Place order';err('Could not place the order. '+(x&&x.message||'')+' Please try again.')});
  });
  window.addEventListener('sk-rates',function(){try{plans();sum()}catch(e){}});
  /* only logged-in people can buy */
  if(!token()){var g=document.createElement('section');g.className='co-gate card';g.innerHTML='<h2>Please log in to buy</h2><p>You need an account to place an order, so we can keep your order and points safe.</p><a class="btn btn-solid" href="login.html">Log in or create an account</a>';var gr=document.querySelector('.co-grid');if(gr){gr.hidden=true;gr.parentNode.insertBefore(g,gr)}var cs=$('#co-steps');if(cs)cs.hidden=true;return}
  function loadPts(){var t=token();if(!t||!(C.url&&C.anon))return;
    fetch(C.url.replace(/\/+$/,'')+'/rest/v1/rpc/points_status',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:'{}'})
      .then(function(r){return r.ok?r.json():null}).then(function(s){if(!s||!s.balance)return;P.bal=s.balance;P.rate=s.usd_per_point*s.usd_to_pkr;$('#pt-bal').textContent=s.balance+' point'+(s.balance>1?'s':'')+' ('+pkr(Math.floor(s.balance*P.rate))+')';$('#co-pts').hidden=false;$('#pt-use').addEventListener('change',sum)}).catch(function(){})}
  document.title='Checkout - '+it.name+' | SkillsKnowledge';plans();methods();sum();loadPts();
})();
