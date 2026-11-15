/* About page: card data lives in arrays, like the other pages */
(function(){
var SKILLS=SK.list('about:a-skills');
  /* skills added to the home page in the admin appear here too, so one change updates every list */
  SK.list('home:svc-list').filter(function(s){return s.added&&!SKILLS.some(function(x){return x.title===s.title})}).forEach(function(s){
    SKILLS.push({title:s.title,text:s.text,href:/^(index\.html)?#/.test(s.link||'')?'':(s.link||'')});
  });
var HABITS=SK.list('about:a-habits');
var STEPS=SK.list('about:a-steps');
  function put(id,arr,fn){var h=document.getElementById(id);if(!h)return;h.innerHTML=arr.map(fn).join('')}
  put('a-skills',SKILLS,function(d){return '<article class="card a-card"><h3>'+d.title+'</h3><p>'+d.text+'</p>'+(d.href?'<a class="btn btn-solid btn-sm" href="'+d.href+'">Take a Look</a>':'')+'</article>'});
  put('a-habits',HABITS,function(d){return '<article class="card a-card"><h3>'+d.title+'</h3><p>'+d.text+'</p></article>'});
  put('a-steps',STEPS,function(d){return '<article class="card step"><b>'+d.n+'</b><h3>'+d.title+'</h3><p>'+d.text+'</p></article>'});
})();
