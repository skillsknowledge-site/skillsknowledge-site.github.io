/* Rates are live: they are fetched from a free public rate service (open.er-api.com) at most every 6 hours and kept in the visitor's browser.
   If the service cannot be reached, the fixed numbers below are used. */
/* Shows prices in the visitor's own currency. PKR is the website's main currency and USD is the second one.
   The country is guessed from the time zone of the visitor's device (no tracking, no outside service).
   The rates below are fixed numbers: units of each currency for 1 USD. Edit them here when the market moves. */
(function(){
  var RATES={USD:1,PKR:280,INR:88,AED:3.67,SAR:3.75,GBP:0.76,EUR:0.87,CAD:1.4,AUD:1.55,BDT:122,TRY:42};
  var BY_ZONE={'Asia/Karachi':'PKR','Asia/Kolkata':'INR','Asia/Calcutta':'INR','Asia/Dubai':'AED','Asia/Riyadh':'SAR','Europe/London':'GBP','America/Toronto':'CAD','America/Vancouver':'CAD','Australia/Sydney':'AUD','Australia/Melbourne':'AUD','Asia/Dhaka':'BDT','Europe/Istanbul':'TRY'};
  var EU=/^Europe\/(Berlin|Paris|Madrid|Rome|Amsterdam|Brussels|Vienna|Lisbon|Dublin|Athens|Helsinki)$/;
  function guess(){var z='';try{z=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
    if(BY_ZONE[z])return BY_ZONE[z];if(EU.test(z))return 'EUR';if(/^America\//.test(z))return 'USD';return 'PKR'}
  var cur=guess();try{var s=localStorage.getItem('sk_cur');if(s&&RATES[s])cur=s}catch(e){}
  function fmt(pkr,code){code=code||cur;var v=pkr/RATES.PKR*RATES[code];
    try{return new Intl.NumberFormat('en-US',{style:'currency',currency:code,maximumFractionDigits:code==='PKR'||code==='INR'||code==='BDT'?0:2}).format(v).replace(/^PKR\s?/,'PKR ')}catch(e){return 'PKR '+Math.round(pkr)}}
  function apply(r){var ok=false;Object.keys(RATES).forEach(function(k){if(r&&r[k]>0){RATES[k]=r[k];ok=true}});return ok}
  try{var st=JSON.parse(localStorage.getItem('sk_rates')||'null');if(st&&st.r)apply(st.r)}catch(e){}
  function live(){var st=null;try{st=JSON.parse(localStorage.getItem('sk_rates')||'null')}catch(e){}
    if(st&&Date.now()-st.t<6*3600*1000)return;
    if(!window.fetch)return;
    fetch('https://open.er-api.com/v6/latest/USD').then(function(r){return r.ok?r.json():null}).then(function(j){
      if(j&&j.rates&&apply(j.rates)){try{localStorage.setItem('sk_rates',JSON.stringify({t:Date.now(),r:j.rates}))}catch(e){}
        window.dispatchEvent(new Event('sk-rates'))}}).catch(function(){})}
  live();setInterval(live,3600*1000);
  // are we paying from Pakistan? time zone by default, and the visitor can change it
  function pk(){try{var o=localStorage.getItem('sk_pk');if(o==='1')return true;if(o==='0')return false}catch(e){}
    var z='';try{z=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}return z==='Asia/Karachi'}
  window.SKM={pk:pk,setPk:function(v){try{localStorage.setItem('sk_pk',v?'1':'0')}catch(e){}},fmt:function(n,c){return fmt(n,c)},code:function(){return cur},list:function(){return Object.keys(RATES)},
    set:function(c){if(!RATES[c])return;cur=c;try{localStorage.setItem('sk_cur',c)}catch(e){}}};
})();
