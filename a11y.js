/* Adds a "Skip to content" link for keyboard users and keeps the menu button's state in sync. */
(function(){
  function go(){
    var m=document.querySelector('main');if(!m||document.querySelector('.skip-link'))return;
    if(!m.id)m.id='main';
    var a=document.createElement('a');a.className='skip-link';a.href='#'+m.id;a.textContent='Skip to content';
    a.addEventListener('click',function(){m.setAttribute('tabindex','-1');m.focus()});
    document.body.insertBefore(a,document.body.firstChild);
    var b=document.getElementById('burger'),n=document.getElementById('nav');
    if(b&&n)new MutationObserver(function(){b.setAttribute('aria-expanded',String(n.classList.contains('open')))}).observe(n,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
