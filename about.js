/* About page: card data lives in arrays, like the other pages */
(function(){
var SKILLS=SK.list('about:a-skills');
  /* skills added to the home page in the admin appear here too, so one change updates every list */
  SK.list('home:svc-list').filter(function(s){return s.added&&!SKILLS.some(function(x){return x.title===s.title})}).forEach(function(s){
    SKILLS.push({title:s.title,text:s.text,href:/^(index\.html)?#/.test(s.link||'')?'':(s.link||'')});
  });
var HABITS=SK.list('about:a-habits');
var STEPS=SK.list('about:a-steps');
  function put(id,arr,fn){var h=document.getElementById(id);if(!h)return;h.innerHTML=arr.map(function(x,i){return fn(x,i)}).join('')}
  put('a-skills',SKILLS,function(d){return '<article class="card a-card"><h3>'+d.title+'</h3><p>'+d.text+'</p>'+(d.href?'<a class="btn btn-solid btn-sm" href="'+d.href+'">Take a Look</a>':'')+'</article>'});
  var IC=['<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>','<path d="M20 6L9 17l-5-5"/>','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>','<path d="M4 4h16v12H8l-4 4z"/>','<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>','<path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>'];
  put('a-habits',HABITS,function(d,i){return '<article class="ab-feat"><span class="ab-ic c'+(i%6)+'" aria-hidden="true"><svg viewBox="0 0 24 24">'+IC[i%6]+'</svg></span><div><h3>'+d.title+'</h3><p>'+d.text+'</p></div></article>'});
  put('a-steps',STEPS,function(d){return '<article class="card step"><b>'+d.n+'</b><h3>'+d.title+'</h3><p>'+d.text+'</p></article>'});
})();
