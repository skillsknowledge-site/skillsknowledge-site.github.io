/* Shows every visitor prices in their own currency only. The country comes from the time zone of the visitor's device
   (or from the browser language when the time zone is not known). Nothing is sent anywhere for this.
   Rates are live: fetched from open.er-api.com at most every 6 hours and kept in the visitor's browser.
   If that service cannot be reached, the fixed numbers below are used.
   Prices are stored in PKR (the website's main currency); a visitor from another country only sees their own currency. */
(function(){
  /* country: name, phone code, currency */
  var C={PK:['Pakistan','92','PKR'],IN:['India','91','INR'],BD:['Bangladesh','880','BDT'],LK:['Sri Lanka','94','LKR'],NP:['Nepal','977','NPR'],AF:['Afghanistan','93','AFN'],
    AE:['United Arab Emirates','971','AED'],SA:['Saudi Arabia','966','SAR'],QA:['Qatar','974','QAR'],KW:['Kuwait','965','KWD'],BH:['Bahrain','973','BHD'],OM:['Oman','968','OMR'],JO:['Jordan','962','JOD'],IL:['Israel','972','ILS'],TR:['Turkey','90','TRY'],IQ:['Iraq','964','IQD'],
    US:['United States','1','USD'],CA:['Canada','1','CAD'],MX:['Mexico','52','MXN'],BR:['Brazil','55','BRL'],AR:['Argentina','54','ARS'],CO:['Colombia','57','COP'],PE:['Peru','51','PEN'],CL:['Chile','56','CLP'],
    GB:['United Kingdom','44','GBP'],IE:['Ireland','353','EUR'],DE:['Germany','49','EUR'],FR:['France','33','EUR'],ES:['Spain','34','EUR'],IT:['Italy','39','EUR'],NL:['Netherlands','31','EUR'],BE:['Belgium','32','EUR'],AT:['Austria','43','EUR'],PT:['Portugal','351','EUR'],GR:['Greece','30','EUR'],FI:['Finland','358','EUR'],
    CH:['Switzerland','41','CHF'],SE:['Sweden','46','SEK'],NO:['Norway','47','NOK'],DK:['Denmark','45','DKK'],PL:['Poland','48','PLN'],CZ:['Czechia','420','CZK'],HU:['Hungary','36','HUF'],RO:['Romania','40','RON'],UA:['Ukraine','380','UAH'],RU:['Russia','7','RUB'],
    CN:['China','86','CNY'],HK:['Hong Kong','852','HKD'],JP:['Japan','81','JPY'],KR:['South Korea','82','KRW'],TW:['Taiwan','886','TWD'],ID:['Indonesia','62','IDR'],SG:['Singapore','65','SGD'],MY:['Malaysia','60','MYR'],TH:['Thailand','66','THB'],VN:['Vietnam','84','VND'],PH:['Philippines','63','PHP'],UZ:['Uzbekistan','998','UZS'],KZ:['Kazakhstan','7','KZT'],
    AU:['Australia','61','AUD'],NZ:['New Zealand','64','NZD'],EG:['Egypt','20','EGP'],NG:['Nigeria','234','NGN'],KE:['Kenya','254','KES'],ZA:['South Africa','27','ZAR'],MA:['Morocco','212','MAD'],GH:['Ghana','233','GHS'],ET:['Ethiopia','251','ETB']};
  /* fixed fallback rates: units of each currency for 1 USD */
  var RATES={USD:1,PKR:280,INR:88,BDT:122,LKR:300,NPR:140,AFN:70,AED:3.67,SAR:3.75,QAR:3.64,KWD:.31,BHD:.376,OMR:.385,JOD:.71,ILS:3.7,TRY:42,IQD:1310,CAD:1.4,MXN:18,BRL:5.5,ARS:1000,COP:4100,PEN:3.7,CLP:950,GBP:.76,EUR:.87,CHF:.88,SEK:10.5,NOK:10.7,DKK:6.5,PLN:4,CZK:23,HUF:360,RON:4.6,UAH:41,RUB:90,
    CNY:7.2,HKD:7.8,JPY:150,KRW:1400,TWD:32,IDR:16000,SGD:1.33,MYR:4.4,THB:35,VND:25000,PHP:58,UZS:12800,KZT:500,AUD:1.55,NZD:1.7,EGP:48,NGN:1500,KES:129,ZAR:18,MAD:10,GHS:15,ETB:120};
  var Z={'Asia/Karachi':'PK','Asia/Kolkata':'IN','Asia/Calcutta':'IN','Asia/Dhaka':'BD','Asia/Colombo':'LK','Asia/Kathmandu':'NP','Asia/Kabul':'AF','Asia/Dubai':'AE','Asia/Riyadh':'SA','Asia/Qatar':'QA','Asia/Kuwait':'KW','Asia/Bahrain':'BH','Asia/Muscat':'OM','Asia/Amman':'JO','Asia/Jerusalem':'IL','Asia/Tel_Aviv':'IL','Europe/Istanbul':'TR','Asia/Istanbul':'TR','Asia/Baghdad':'IQ',
    'America/Toronto':'CA','America/Vancouver':'CA','America/Edmonton':'CA','America/Winnipeg':'CA','America/Halifax':'CA','America/Regina':'CA','America/St_Johns':'CA','America/Montreal':'CA','America/Mexico_City':'MX','America/Sao_Paulo':'BR','America/Bogota':'CO','America/Lima':'PE','America/Santiago':'CL','America/Argentina/Buenos_Aires':'AR','America/Buenos_Aires':'AR',
    'Europe/London':'GB','Europe/Dublin':'IE','Europe/Berlin':'DE','Europe/Paris':'FR','Europe/Madrid':'ES','Europe/Rome':'IT','Europe/Amsterdam':'NL','Europe/Brussels':'BE','Europe/Vienna':'AT','Europe/Lisbon':'PT','Europe/Athens':'GR','Europe/Helsinki':'FI','Europe/Zurich':'CH','Europe/Stockholm':'SE','Europe/Oslo':'NO','Europe/Copenhagen':'DK','Europe/Warsaw':'PL','Europe/Prague':'CZ','Europe/Budapest':'HU','Europe/Bucharest':'RO','Europe/Kiev':'UA','Europe/Kyiv':'UA','Europe/Moscow':'RU',
    'Asia/Shanghai':'CN','Asia/Chongqing':'CN','Asia/Urumqi':'CN','Asia/Hong_Kong':'HK','Asia/Tokyo':'JP','Asia/Seoul':'KR','Asia/Taipei':'TW','Asia/Jakarta':'ID','Asia/Pontianak':'ID','Asia/Makassar':'ID','Asia/Jayapura':'ID','Asia/Singapore':'SG','Asia/Kuala_Lumpur':'MY','Asia/Bangkok':'TH','Asia/Ho_Chi_Minh':'VN','Asia/Saigon':'VN','Asia/Manila':'PH','Asia/Tashkent':'UZ','Asia/Almaty':'KZ',
    'Pacific/Auckland':'NZ','Africa/Cairo':'EG','Africa/Lagos':'NG','Africa/Nairobi':'KE','Africa/Johannesburg':'ZA','Africa/Casablanca':'MA','Africa/Accra':'GH','Africa/Addis_Ababa':'ET'};
  function zone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){return ''}}
  function country(){var z=zone();if(Z[z])return Z[z];
    if(/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana|Kentucky|North_Dakota|Juneau|Adak)/.test(z)||/^US\//.test(z)||z==='Pacific/Honolulu')return 'US';
    if(/^Australia\//.test(z))return 'AU';
    var l=(navigator.language||'').split('-')[1];l=(l||'').toUpperCase();if(C[l])return l;return ''}
  var cc=country();
  var cur=(cc&&C[cc]?C[cc][2]:'USD');
  function apply(r){var ok=false;Object.keys(r||{}).forEach(function(k){if(r[k]>0){RATES[k]=r[k];ok=true}});return ok}
  try{var st=JSON.parse(localStorage.getItem('sk_rates')||'null');if(st&&st.r)apply(st.r)}catch(e){}
  function fmt(pkr,code){code=code||cur;var v=pkr/RATES.PKR*(RATES[code]||1);if(!RATES[code])code='USD';
    var big=RATES[code]>=50;
    try{var s=new Intl.NumberFormat('en-US',{style:'currency',currency:code,minimumFractionDigits:big?0:2,maximumFractionDigits:big?0:2}).format(v);return code==='PKR'?s.replace(/^PKR\s?/,'PKR '):s}catch(e){return Math.round(v)+' '+code}}
  function live(){var s=null;try{s=JSON.parse(localStorage.getItem('sk_rates')||'null')}catch(e){}
    if(s&&Date.now()-s.t<6*3600*1000)return;
    if(!window.fetch)return;
    fetch('https://open.er-api.com/v6/latest/USD').then(function(r){return r.ok?r.json():null}).then(function(j){
      if(j&&j.rates&&apply(j.rates)){try{localStorage.setItem('sk_rates',JSON.stringify({t:Date.now(),r:j.rates}))}catch(e){}
        window.dispatchEvent(new Event('sk-rates'))}}).catch(function(){})}
  live();setInterval(live,3600*1000);
  /* payment methods: Pakistani wallets are for visitors in Pakistan only (the visitor can switch this on the checkout page) */
  function pk(){try{var o=localStorage.getItem('sk_pk');if(o==='1')return true;if(o==='0')return false}catch(e){}return cc==='PK'}
  window.SKM={pk:pk,setPk:function(v){try{localStorage.setItem('sk_pk',v?'1':'0')}catch(e){}},
    fmt:function(n,c){return fmt(n,c)},usd:function(u){return fmt(u*RATES.PKR)},code:function(){return cur},country:function(){return cc},
    countries:function(){return Object.keys(C).map(function(k){return {iso:k,name:C[k][0],dial:C[k][1]}}).sort(function(a,b){return a.name<b.name?-1:1})}};
})();
