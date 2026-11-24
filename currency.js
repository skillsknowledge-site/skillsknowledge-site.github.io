/* Shows prices in the visitor's own currency. PKR is the website's main currency and USD is the second one.
   The country is guessed from the time zone of the visitor's device (no tracking, no outside service).
   The rates below are fixed numbers: units of each currency for 1 USD. Edit them here when the market moves. */
(function(){
  var USD_PKR=280;
  var RATES={USD:1,PKR:USD_PKR,INR:88,AED:3.67,SAR:3.75,GBP:0.76,EUR:0.87,CAD:1.4,AUD:1.55,BDT:122,TRY:42};
  var BY_ZONE={'Asia/Karachi':'PKR','Asia/Kolkata':'INR','Asia/Calcutta':'INR','Asia/Dubai':'AED','Asia/Riyadh':'SAR','Europe/London':'GBP','America/Toronto':'CAD','America/Vancouver':'CAD','Australia/Sydney':'AUD','Australia/Melbourne':'AUD','Asia/Dhaka':'BDT','Europe/Istanbul':'TRY'};
  var EU=/^Europe\/(Berlin|Paris|Madrid|Rome|Amsterdam|Brussels|Vienna|Lisbon|Dublin|Athens|Helsinki)$/;
  function guess(){var z='';try{z=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
    if(BY_ZONE[z])return BY_ZONE[z];if(EU.test(z))return 'EUR';if(/^America\//.test(z))return 'USD';return 'PKR'}
  var cur=guess();try{var s=localStorage.getItem('sk_cur');if(s&&RATES[s])cur=s}catch(e){}
  function fmt(pkr,code){code=code||cur;var v=pkr/USD_PKR*RATES[code];
    try{return new Intl.NumberFormat('en-US',{style:'currency',currency:code,maximumFractionDigits:code==='PKR'||code==='INR'||code==='BDT'?0:2}).format(v).replace(/^PKR\s?/,'PKR ')}catch(e){return 'PKR '+Math.round(pkr)}}
  window.SKM={fmt:function(n,c){return fmt(n,c)},code:function(){return cur},list:function(){return Object.keys(RATES)},
    set:function(c){if(!RATES[c])return;cur=c;try{localStorage.setItem('sk_cur',c)}catch(e){}}};
})();
