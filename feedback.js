/* Feedback window: comment (star rating required, 200 characters) and complaint (1,000 characters).
   Saved in Supabase (submit_feedback). Files go to the private storage bucket feedback-files (up to 100 MB in total). Read in the admin page only. */
(function(){
  var $=function(s,r){return (r||document).querySelector(s)};
  var bC=$('#fbx-comment'),bX=$('#fbx-complaint');if(!bC||!bX)return;
  var FONTS=['Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Playfair Display','Merriweather','Lora','Source Code Pro'];
  var mode='comment',rating=0,font='',loaded=false,saved=null,dlg;
  var LIM={comment:200,complaint:1000},MAXB=100*1024*1024,MAXN=5,files=[];
  function size(n){return n>=1048576?(n/1048576).toFixed(n>=10485760?0:1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
  function safe(n){return String(n).replace(/[^A-Za-z0-9._-]+/g,'_').slice(-100)||'file'}
  function put(C,tok,f,prog){return new Promise(function(ok,no){var id=(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)})),path=id+'/'+safe(f.name),x=new XMLHttpRequest();
    x.open('POST',C.url.replace(/\/+$/,'')+'/storage/v1/object/feedback-files/'+path);x.setRequestHeader('apikey',C.anon);x.setRequestHeader('Authorization','Bearer '+(tok||C.anon));x.setRequestHeader('Content-Type',f.type||'application/octet-stream');
    x.upload.onprogress=function(e){if(e.lengthComputable)prog(e.loaded/e.total)};x.onload=function(){x.status<300?ok({path:path,name:f.name.slice(0,120),size:f.size}):no(new Error(x.status===413?'toobig':'upload'))};x.onerror=function(){no(new Error('upload'))};x.send(f)})}
  function loadFonts(){if(loaded)return;loaded=true;var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?'+FONTS.map(function(f){return 'family='+f.replace(/ /g,'+')}).join('&')+'&display=swap';document.head.appendChild(l)}
  function build(){
    var d=document.createElement('dialog');d.className='fbx';d.setAttribute('aria-labelledby','fbx-t');
    d.innerHTML='<form novalidate><div class="fbx-head"><h2 id="fbx-t">New comment</h2><button class="fbx-x" type="button" data-close aria-label="Close">&times;</button></div>'+
      '<div class="fbx-body" data-form>'+
      '<label class="fbx-f"><span>Your email</span><input id="fbx-email" type="email" autocomplete="email" placeholder="you@example.com"></label>'+
      '<div class="fbx-f" data-rate><span>Rating <i>(required)</i></span><div class="fbx-stars" role="radiogroup" aria-label="Rating">'+[1,2,3,4,5].map(function(n){return '<button type="button" role="radio" aria-checked="false" aria-label="'+n+' star'+(n>1?'s':'')+'" data-s="'+n+'"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg></button>'}).join('')+'</div></div>'+
      '<div class="fbx-f"><span data-lbl>Your comment</span>'+
      '<div class="fbx-tools"><select class="fbx-font" aria-label="Font style"><option value="">Font</option>'+FONTS.map(function(f){return '<option value="'+f+'" style="font-family:\''+f+'\'">'+f+'</option>'}).join('')+'</select>'+
      '<button type="button" data-cmd="bold" aria-label="Bold"><b>B</b></button><button type="button" data-cmd="italic" aria-label="Italic"><i>I</i></button><button type="button" data-cmd="underline" aria-label="Underline"><u>U</u></button>'+
      '<label class="fbx-col" title="Text colour"><span>A</span><input type="color" value="#4f6ef7" aria-label="Text colour"></label><span class="fbx-count" data-count>0 / 200</span></div>'+
      '<div class="fbx-ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Message" data-ph="Write here"></div></div>'+
      '<div class="fbx-f"><span>Attachments <i>(optional, up to 100 MB in total)</i></span><div class="fbx-files"><label class="btn btn-ghost btn-sm fbx-add"><input type="file" multiple hidden data-file>Attach files</label><ul class="fbx-flist" data-flist></ul></div></div>'+
      '<p class="fbx-msg" role="alert" data-msg></p>'+
      '<div class="fbx-bar"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-solid" type="submit" data-send>Send</button></div></div>'+
      '<div class="fbx-done" data-done hidden><svg class="fbx-tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg><h2>Thank you</h2><p data-dtext></p><button class="btn btn-solid" type="button" data-close>Close</button></div></form>';
    document.body.appendChild(d);
    var ed=$('.fbx-ed',d),cnt=$('[data-count]',d),msg=$('[data-msg]',d);
    function len(){return ed.innerText.replace(/\n$/,'').length}
    function upd(){cnt.textContent=len()+' / '+LIM[mode];cnt.classList.toggle('over',len()>LIM[mode])}
    function keep(){var s=getSelection();if(s.rangeCount&&ed.contains(s.anchorNode))saved=s.getRangeAt(0).cloneRange()}
    function back(){ed.focus();if(saved){var s=getSelection();s.removeAllRanges();s.addRange(saved)}}
    document.addEventListener('selectionchange',function(){if(d.open)keep()});
    ed.addEventListener('beforeinput',function(e){if(e.inputType.indexOf('insert')===0&&e.inputType!=='insertFromPaste'&&len()>=LIM[mode]){var s=getSelection();if(s.isCollapsed)e.preventDefault()}});
    ed.addEventListener('paste',function(e){e.preventDefault();var t=(e.clipboardData||window.clipboardData).getData('text/plain');t=t.slice(0,Math.max(0,LIM[mode]-len()));if(t)document.execCommand('insertText',false,t);upd()});
    ed.addEventListener('input',upd);
    [].forEach.call(d.querySelectorAll('[data-cmd]'),function(b){b.addEventListener('mousedown',function(e){e.preventDefault()});b.addEventListener('click',function(){back();document.execCommand(b.dataset.cmd,false,null);b.classList.toggle('on',document.queryCommandState(b.dataset.cmd))})});
    /* font: applies to the text you write from now on, and to the selected text if you selected some */
    var fs=$('.fbx-font',d);fs.addEventListener('change',function(){
      font=fs.value;ed.style.fontFamily=font?"'"+font+"', sans-serif":'';
      if(font){back();document.execCommand('styleWithCSS',false,true);document.execCommand('fontName',false,font)}
      ed.focus()});
    var ci=$('.fbx-col input',d),cs=$('.fbx-col',d);ci.addEventListener('input',function(){cs.style.setProperty('--cc',ci.value);back();document.execCommand('styleWithCSS',false,true);document.execCommand('foreColor',false,ci.value)});
    [].forEach.call(d.querySelectorAll('.fbx-stars button'),function(b){b.addEventListener('click',function(){rating=+b.dataset.s;paint()})});
    function paint(){[].forEach.call(d.querySelectorAll('.fbx-stars button'),function(b){var on=+b.dataset.s<=rating;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(+b.dataset.s===rating))})}
    var fi=$('[data-file]',d),fl=$('[data-flist]',d);
    function drawFiles(){fl.innerHTML=files.map(function(f,i){return '<li><span>'+f.name.replace(/[&<>"]/g,'')+'</span><em>'+size(f.size)+'</em><button type="button" data-rm="'+i+'" aria-label="Remove '+f.name.replace(/[&<>"]/g,'')+'">&times;</button></li>'}).join('')}
    fi.addEventListener('change',function(){var total=files.reduce(function(a,f){return a+f.size},0);msg.className='fbx-msg err';msg.textContent='';
      [].forEach.call(fi.files,function(f){if(files.length>=MAXN){msg.textContent='You can attach up to '+MAXN+' files.';return}if(total+f.size>MAXB){msg.textContent='Attachments can be 100 MB in total. '+f.name+' was not added.';return}files.push(f);total+=f.size});fi.value='';drawFiles()});
    fl.addEventListener('click',function(e){var b=e.target.closest('[data-rm]');if(b){files.splice(+b.dataset.rm,1);drawFiles();msg.textContent=''}});
    d._draw=drawFiles;
    d._paint=paint;d._upd=upd;d._ed=ed;
    d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-close]'))d.close()});
    $('form',d).addEventListener('submit',function(e){e.preventDefault();
      var em=$('#fbx-email',d).value.trim(),text=ed.innerText.replace(/\u00a0/g,' ').replace(/\n$/,'').trim();msg.className='fbx-msg err';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){msg.textContent='Please enter a valid email address.';return}
      if(mode==='comment'&&!rating){msg.textContent='Please choose a star rating.';return}
      if(text.length<5){msg.textContent='Please write at least a few words.';return}
      if(text.length>LIM[mode]){msg.textContent='Your message is over '+LIM[mode]+' characters.';return}
      var C=window.SK_CFG||{};if(!(C.url&&C.anon)){msg.textContent='Sending is not set up yet.';return}
      var btn=$('[data-send]',d);btn.disabled=true;msg.className='fbx-msg';msg.textContent='Sending…';
      Promise.resolve().then(function(){return window.skUser&&window.skUser.token?window.skUser.token():''}).catch(function(){return ''}).then(function(t){
        if(!t)throw new Error('login');var done=0;function prog(p){msg.textContent='Uploading file '+(done+1)+' of '+files.length+' ('+Math.round(p*100)+'%)'}
        return files.reduce(function(pr,f){return pr.then(function(list){return put(C,t,f,prog).then(function(r){done++;list.push(r);return list})})},Promise.resolve([])).then(function(list){msg.textContent='Sending…';return [t,list]})}).then(function(a){var t=a[0],list=a[1];
        return fetch(C.url.replace(/\/+$/,'')+'/rest/v1/rpc/submit_feedback',{method:'POST',headers:{apikey:C.anon,Authorization:'Bearer '+(t||C.anon),'Content-Type':'application/json'},body:JSON.stringify({p_kind:mode,p_rating:mode==='comment'?rating:null,p_email:em,p_message:text,p_font:font||null,p_files:list})})})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok)throw new Error(j&&j.message||'failed');return j})})
      .then(function(){$('[data-form]',d).hidden=true;$('[data-done]',d).hidden=false;$('[data-dtext]',d).textContent=mode==='comment'?'Your comment was sent. We read every one.':'Your complaint was sent. We will look into it and reply by email.';btn.disabled=false},
        function(x){btn.disabled=false;msg.className='fbx-msg err';var w=/^wait:(\d+)/.exec(x.message||'');if(w){var sec=+w[1],h=Math.floor(sec/3600),mi=Math.ceil(sec%3600/60);if(mi===60){h++;mi=0}msg.textContent='You can send another '+mode+' in '+(h?h+' h ':'')+(mi||!h?mi+' min':'').trim()+'.';return}
        if(x.message==='login'||/login required|permission denied|JWT/i.test(x.message||'')){msg.textContent='Login required. Please log in to send this.';return}
        msg.textContent=/rate/.test(x.message)?'You sent a few messages already. Please try again later.':x.message==='toobig'?'A file is bigger than the server allows. Try a smaller file.':x.message==='upload'?'A file could not be uploaded. Please try again.':'Could not send. Please try again.'});
    });
    return d;
  }
  function open(m){
    loadFonts();dlg=dlg||build();mode=m;rating=0;saved=null;files=[];dlg._draw();
    $('#fbx-t',dlg).textContent=m==='comment'?'New comment':'New complaint';
    $('[data-rate]',dlg).hidden=m!=='comment';
    $('[data-lbl]',dlg).textContent=m==='comment'?'Your comment':'Your complaint';
    $('.fbx-ed',dlg).setAttribute('data-ph',m==='comment'?'Tell us what worked and what did not':'Describe the problem in as much detail as you can');
    $('[data-form]',dlg).hidden=false;$('[data-done]',dlg).hidden=true;$('[data-msg]',dlg).textContent='';
    var ed=dlg._ed;ed.innerHTML='';ed.style.fontFamily='';font='';$('.fbx-font',dlg).value='';
    dlg._paint();dlg._upd();
    var em=$('#fbx-email',dlg);if(!em.value){try{var u=JSON.parse(localStorage.getItem('sk_user')||'null');if(u&&u.email)em.value=u.email}catch(e){}}
    dlg.showModal();em.value?ed.focus():em.focus();
  }
  bC.addEventListener('click',function(){open('comment')});bX.addEventListener('click',function(){open('complaint')});
})();
