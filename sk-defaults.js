/* Default content for every list on the site. This file is the single source of truth:
   the pages read from it, and the admin panel starts from it. Edit here or in the admin. */
window.SK_DEFAULTS={
'home:svc-list':[
  {key:'video',icon:'video',title:'Video editing',text:'Cuts, pacing, captions and colour for reels, ads and long videos.',link:'video.html',label:'Take a Look'},
  {key:'graphics',icon:'palette',title:'Graphics design',text:'Logos, posters, social posts and thumbnails, with editable files.',link:'graphics.html',label:'Take a Look'},
  {key:'coding',icon:'code',title:'Coding',text:'Fast, tidy sites and web apps in HTML, CSS, JavaScript and React.',link:'code.html',label:'Take a Look'},
  {key:'ads',icon:'ads',title:'Ads and promotion',text:'Banner and social ad creatives built around one clear message.',link:'#contact',label:'Take a Look'},
  {key:'idle',icon:'dot',title:'.',text:'.',link:'#services',label:'.',placeholder:true}
],
'home:skills-grid':[
  {title:'Interface',note:'Daily',items:['HTML','CSS','JavaScript','TypeScript','React','Tailwind']},
  {title:'Server',note:'Often',items:['Node.js','Express','PostgreSQL','REST','Auth']},
  {title:'Craft',note:'Always on',items:['Git','Figma','Accessibility','Lighthouse','Testing']},
  {title:'Learning now',note:'In progress',items:['Web components','Astro','View transitions'],learning:true}
],
'home:proj-grid':[
  {wide:true,title:'Harvest Ledger',text:'Bookkeeping for small farms: sales, inputs and seasons in one calm dashboard that works on a phone in the field.',tags:['React','Node','PostgreSQL'],year:'2026',label:'ledger.app',
   bg:'linear-gradient(180deg,transparent 0 31px,rgba(var(--hi),.2) 31px 32px) 0 0/100% 32px,radial-gradient(60% 90% at 80% 10%,rgba(var(--acc),.55),transparent 70%),linear-gradient(135deg,rgb(var(--deep)),rgb(var(--card-rgb)))'},
  {title:'Mandi Rates',text:'Daily crop prices by city, shown in PKR per 40 kg maund and readable on a weak connection.',tags:['JavaScript','PWA'],year:'2026',label:'rates.pk',
   bg:'repeating-linear-gradient(60deg,rgba(233,196,106,.35) 0 2px,transparent 2px 14px),linear-gradient(160deg,#2b2309,#5a4713)'},
  {title:'Tilework',text:'Turns a colour palette into CSS tokens and checks contrast while you edit.',tags:['HTML','CSS','JS'],year:'2025',label:'tilework.dev',
   bg:'conic-gradient(from 90deg at 1px 1px,#0000 90deg,rgba(var(--hi),.25) 0) 0 0/26px 26px,linear-gradient(135deg,rgb(var(--deep)),rgb(var(--card-rgb)))'},
  {title:'Kiln',text:'A static site generator in 300 lines. It builds a 200-page site in under a second.',tags:['Node'],year:'2025',label:'kiln build',
   bg:'repeating-radial-gradient(circle at 30% 75%,rgba(var(--hi),.32) 0 2px,transparent 2px 18px),rgb(var(--card-rgb))'},
  {title:'Pulse Desk',text:'A shared inbox for a three-person support team, with a keyboard shortcut for everything.',tags:['React','TypeScript'],year:'2025',label:'pulse.desk',
   bg:'radial-gradient(rgba(var(--hi),.55) 1.5px,transparent 1.7px) 0 0/16px 16px,linear-gradient(200deg,rgb(var(--deep)),rgb(var(--bg-rgb)))'}
],
'home:steps':[
  {title:'Listen',text:'A short call about goals, users, deadline and what already exists.'},
  {title:'Sketch',text:'Wireframes within a few days, on paper or in Figma, before any code.'},
  {title:'Build',text:'A working build you can open on your phone, updated every week.'},
  {title:'Hand off',text:'Clean files, a short README and a walkthrough with your team.'}
],
'home:posts':[
  {when:'Oct 2026 · 6 min',title:'I deleted the CSS framework and the file got smaller',text:'A rebuild of one client site, line by line, and what I kept.'},
  {when:'Sep 2026 · 5 min',title:'Keeping a homepage under 100 KB',text:'Fonts, images and one script, budgeted before the design starts.'},
  {when:'Aug 2026 · 4 min',title:'Keyboard focus is part of the design',text:'Five small changes that made a site usable without a mouse.'}
],
'graphics:tools-grid':[
  {name:'Figma',level:'Often',v:70,text:'Layouts, mock-ups and shared design files.'},
  {name:'Canva',level:'Often',v:90,text:'Fast templates when speed matters most.'},
  {name:'CorelDRAW',level:'Learning',v:45,text:'Print-ready vector layouts.'}
],
'graphics:svc-grid':[
  {icon:'logo',title:'Logos and identity',text:'Marks, colour palettes and a simple brand sheet that works from a favicon to a banner.'},
  {icon:'poster',title:'Posters and flyers',text:'Event, sale and notice designs, ready for print or for screens.'},
  {icon:'social',title:'Social media posts',text:'Single posts, carousels and story sets that share one consistent look.'},
  {icon:'thumb',title:'Thumbnails and banners',text:'Video thumbnails and channel art, sized correctly for each platform.'},
  {icon:'ads',title:'Ad creatives',text:'Banners and promo graphics that get one clear message across quickly.'},
  {icon:'ui',title:'App and web visuals',text:'Icons, illustrations and mock-ups for websites and apps.'}
],
'graphics:works':[
  {type:'logos',title:'Nimbus mark',kind:'Logo concept',art:
   '<rect class="a-bg" width="200" height="150"/><circle class="as-acc" cx="100" cy="62" r="30" stroke-width="8"/><path class="as-hi" d="M80 62q10-13 20 0t20 0" stroke-width="5" stroke-linecap="round"/><text class="a-t" x="100" y="121" text-anchor="middle" font-size="12" letter-spacing="5">NIMBUS</text>'},
  {type:'logos',title:'Six small marks',kind:'Logo set',art:
   '<rect class="a-bg2" width="200" height="150"/><circle class="a-acc" cx="40" cy="48" r="15"/><polygon class="a-acc2" points="100,32 114,40 114,56 100,64 86,56 86,40"/><polygon class="a-hi" points="160,33 175,61 145,61"/><rect class="a-acc2" x="27" y="87" width="26" height="26" rx="5" transform="rotate(45 40 100)"/><circle class="as-acc" cx="100" cy="100" r="13" stroke-width="7"/><path class="a-acc" d="M146 114a14 14 0 0 1 28 0z"/>'},
  {type:'posters',title:'Sale poster',kind:'Poster, A3',art:
   '<rect class="a-acc" width="200" height="150"/><path class="a-acc2" d="M118 0h38L96 150H58z"/><path class="a-hi" d="M168 0h32v150h-76z" opacity=".55"/><text class="a-ti" x="14" y="86" font-size="60">SALE</text><text class="a-ti" x="16" y="112" font-size="11" letter-spacing="2.5">UP TO 50% OFF</text>'},
  {type:'posters',title:'Music night',kind:'Event poster',art:
   '<rect class="a-deep" width="200" height="150"/><circle class="as-hi" cx="156" cy="75" r="46" stroke-width="2"/><circle class="as-hi" cx="156" cy="75" r="33" stroke-width="2"/><circle class="as-hi" cx="156" cy="75" r="20" stroke-width="2"/><circle class="a-acc" cx="156" cy="75" r="8"/><text class="a-t" x="14" y="72" font-size="36">LIVE</text><text class="a-th" x="15" y="93" font-size="9" letter-spacing="2.2">MUSIC NIGHT</text><text class="a-w" x="15" y="115" font-size="9" opacity=".75">FRI · 8 PM</text>'},
  {type:'social',title:'Quote post',kind:'Instagram, 1:1',art:
   '<defs><linearGradient id="gq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="sa"/><stop offset="1" class="sb"/></linearGradient></defs><rect fill="url(#gq)" width="200" height="150"/><text class="a-ti" x="16" y="70" font-size="70">“</text><rect class="a-ink" x="22" y="82" width="150" height="7" rx="3.5" opacity=".85"/><rect class="a-ink" x="22" y="97" width="118" height="7" rx="3.5" opacity=".85"/><rect class="a-ink" x="22" y="112" width="84" height="7" rx="3.5" opacity=".85"/>'},
  {type:'social',title:'Launch carousel',kind:'Carousel, 3 slides',art:
   '<rect class="a-bg2" width="200" height="150"/><rect class="a-deep" x="66" y="22" width="84" height="84" rx="8"/><rect class="a-acc2" x="46" y="36" width="84" height="84" rx="8"/><rect class="a-acc" x="26" y="50" width="84" height="84" rx="8"/><text class="a-ti" x="68" y="102" font-size="22" text-anchor="middle">NEW</text><path class="as-w" d="M146 108h32m-9-9l9 9-9 9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'},
  {type:'ads',title:'Shop banner',kind:'Display ad',art:
   '<rect class="a-bg2" width="200" height="150"/><text class="a-t" x="14" y="62" font-size="27">Fresh.</text><text class="a-th" x="15" y="82" font-size="11">Delivered fast.</text><rect class="a-acc" x="14" y="100" width="72" height="24" rx="12"/><text class="a-ti" x="50" y="116" font-size="9" text-anchor="middle" letter-spacing="1">SHOP NOW</text><circle class="a-acc2" cx="152" cy="68" r="38"/><circle class="a-hi" cx="152" cy="68" r="19"/><circle class="a-ink" cx="152" cy="68" r="6"/>'},
  {type:'thumbnails',title:'Tutorial thumbnail',kind:'Video thumbnail, 16:9',art:
   '<rect class="a-deep" width="200" height="150"/><path class="a-acc2" d="M0 120L70 150H0z" opacity=".8"/><text class="a-t" x="14" y="70" font-size="28">HOW TO</text><text class="a-th" x="15" y="92" font-size="12">in five minutes</text><rect class="a-acc" x="138" y="44" width="50" height="38" rx="9"/><polygon class="a-ink" points="155,52 155,74 172,63"/>'}
],
'graphics:steps':[
  {title:'Brief',text:'You tell me the goal, the audience, the sizes and any colours or fonts you already use.'},
  {title:'Moodboard',text:'A few references and a colour and type direction, agreed before I start drawing.'},
  {title:'Draft',text:'Two or three first directions. You pick one and I refine it with your notes.'},
  {title:'Final files',text:'PNG, SVG and PDF, plus the editable source, named and organised.'}
],
'video:tools-grid':[
  {name:'CapCut',level:'Daily',v:90,text:'Quick edits, captions and effects for short videos.'},
  {name:'DaVinci Resolve',level:'Often',v:65,text:'Colour grading and clean timelines for longer cuts.'},
  {name:'Premiere Pro',level:'Often',v:70,text:'Multi-track editing for YouTube and client work.'},
  {name:'After Effects',level:'Learning',v:40,text:'Motion titles and small animated touches.'}
],
'video:svc-grid':[
  {icon:'reel',title:'Reels and Shorts',text:'Vertical edits with fast pacing, hooks and captions for Instagram, TikTok and YouTube Shorts.'},
  {icon:'cut',title:'YouTube videos',text:'Long-form cuts with tidy pacing, b-roll, titles and a clear intro and ending.'},
  {icon:'ads',title:'Ads and promos',text:'Short promo videos that put one message and one call to action up front.'},
  {icon:'caption',title:'Captions and subtitles',text:'Accurate, readable captions, burned in or as a separate file.'},
  {icon:'sun',title:'Colour grading',text:'Balanced exposure and a consistent look across every clip.'},
  {icon:'wave',title:'Sound clean-up',text:'Voice levels, noise reduction and music that sits under the speaker.'}
],
'video:works':[
  {type:'shorts',title:'Reel cut',kind:'Vertical, 9:16',art:
   '<rect class="a-bg2" width="200" height="150"/><rect class="a-deep" x="68" y="10" width="64" height="130" rx="9"/><rect class="a-acc" x="68" y="10" width="64" height="130" rx="9" opacity=".35"/><circle class="a-w" cx="100" cy="60" r="14"/><polygon class="a-ink" points="96,53 96,67 108,60"/><rect class="a-hi" x="78" y="104" width="44" height="6" rx="3"/><rect class="a-w" x="82" y="116" width="36" height="5" rx="2.5" opacity=".7"/>'},
  {type:'shorts',title:'Captioned clip',kind:'Vertical, burned-in captions',art:
   '<rect class="a-bg2" width="200" height="150"/><rect class="a-deep" x="68" y="10" width="64" height="130" rx="9"/><text class="a-t" x="100" y="66" font-size="13" text-anchor="middle">WAIT</text><rect class="a-acc" x="76" y="74" width="48" height="17" rx="4"/><text class="a-ti" x="100" y="87" font-size="11" text-anchor="middle">FOR IT</text><rect class="a-hi" x="84" y="108" width="32" height="5" rx="2.5" opacity=".7"/>'},
  {type:'youtube',title:'Long edit',kind:'YouTube, 16:9',art:
   '<rect class="a-bg" width="200" height="150"/><rect class="a-deep" x="14" y="14" width="172" height="84" rx="8"/><circle class="a-acc" cx="100" cy="56" r="17"/><polygon class="a-ink" points="94,47 94,65 110,56"/><rect class="a-bg2" x="14" y="108" width="172" height="30" rx="5"/><rect class="a-acc" x="18" y="112" width="50" height="9" rx="3"/><rect class="a-acc2" x="72" y="112" width="70" height="9" rx="3"/><rect class="a-hi" x="146" y="112" width="36" height="9" rx="3"/><rect class="a-acc2" x="18" y="125" width="80" height="9" rx="3"/><rect class="a-acc" x="102" y="125" width="80" height="9" rx="3"/><rect class="a-w" x="98" y="106" width="3" height="34" rx="1.5"/>'},
  {type:'youtube',title:'Colour grade',kind:'Before and after',art:
   '<rect class="a-bg2" width="100" height="150"/><rect class="a-acc" x="100" width="100" height="150"/><circle class="a-w" cx="50" cy="52" r="20" opacity=".3"/><circle class="a-hi" cx="150" cy="52" r="20"/><path class="a-deep" d="M0 150V108q30-26 60-6t40-4v52z" opacity=".7"/><path class="a-acc2" d="M100 150v-52q20 10 50-6t50 14v44z"/><text class="a-t" x="12" y="24" font-size="9" letter-spacing="2">BEFORE</text><text class="a-ti" x="112" y="24" font-size="9" letter-spacing="2">AFTER</text>'},
  {type:'ads',title:'15 second promo',kind:'Ad, 1:1',art:
   '<rect class="a-acc" width="200" height="150"/><path class="a-acc2" d="M0 112L200 42v108H0z"/><text class="a-ti" x="14" y="60" font-size="34">-50%</text><text class="a-ti" x="15" y="82" font-size="9" letter-spacing="2">15 SEC PROMO</text><rect class="a-ink" x="14" y="106" width="66" height="22" rx="11"/><text class="a-t" x="47" y="121" font-size="8" text-anchor="middle" letter-spacing="1">SHOP NOW</text>'},
  {type:'ads',title:'Product teaser',kind:'Ad, 9:16 cut-down',art:
   '<rect class="a-deep" width="200" height="150"/><text class="a-t" x="100" y="26" font-size="10" text-anchor="middle" letter-spacing="3">COMING SOON</text><circle class="a-acc2" cx="100" cy="76" r="34"/><circle class="a-acc" cx="100" cy="76" r="22"/><rect class="a-bg2" x="30" y="124" width="140" height="6" rx="3"/><rect class="a-w" x="30" y="124" width="58" height="6" rx="3"/>'}
],
'video:steps':[
  {title:'Brief',text:'You send the footage and tell me the goal, the platform, the length and the style you like.'},
  {title:'Rough cut',text:'A first pass with the story, pacing and music in place, ready for your notes.'},
  {title:'Polish',text:'Captions, colour, sound and small effects, with up to two rounds of changes.'},
  {title:'Delivery',text:'MP4 files in every size you need, plus the project file if you want it.'}
],
'code:tools-grid':[
  {name:'HTML',level:'Daily',v:90,text:'Clean structure, forms and accessible markup.'},
  {name:'CSS',level:'Daily',v:85,text:'Flexbox, Grid, animation and responsive layouts.'},
  {name:'JavaScript',level:'Basics',v:45,text:'Menus, tabs, form checks and small page interactions.'}
],
'code:svc-grid':[
  {icon:'page',title:'Landing pages',text:'One clear page that explains your offer and gets people to act.'},
  {icon:'grid',title:'Portfolio and small sites',text:'Multi-page sites for people and small businesses, written by hand.'},
  {icon:'phone',title:'Responsive layouts',text:'Pages that hold up from a small phone to a wide desktop screen.'},
  {icon:'click',title:'Simple interactions',text:'Menus, tabs, accordions and form checks with basic JavaScript.'},
  {icon:'bug',title:'Layout fixes',text:'Spacing, alignment and mobile bugs fixed in your existing pages.'},
  {icon:'bolt',title:'Page speed tidy-ups',text:'Lighter pages through smaller files and cleaner markup.'}
],
'code:works':[
  {type:'css',title:'Landing page',kind:'HTML and CSS',art:
   '<rect class="a-bg" width="200" height="150"/><rect class="a-bg2" x="14" y="12" width="172" height="126" rx="8"/><rect class="a-acc" x="24" y="22" width="22" height="7" rx="3"/><rect class="a-hi" x="116" y="23" width="14" height="5" rx="2.500" opacity=".7"/><rect class="a-hi" x="136" y="23" width="14" height="5" rx="2.500" opacity=".7"/><rect class="a-hi" x="156" y="23" width="20" height="5" rx="2.500" opacity=".7"/><rect class="a-w" x="24" y="52" width="104" height="10" rx="5"/><rect class="a-w" x="24" y="68" width="76" height="10" rx="5"/><rect class="a-hi" x="24" y="88" width="90" height="5" rx="2.500" opacity=".7"/><rect class="a-acc" x="24" y="106" width="50" height="18" rx="6"/><rect class="a-deep" x="130" y="52" width="46" height="72" rx="6"/>'},
  {type:'css',title:'Portfolio grid',kind:'HTML and CSS Grid',art:
   '<rect class="a-bg2" width="200" height="150"/><rect class="a-acc" x="16" y="16" width="52" height="52" rx="7"/><rect class="a-acc2" x="74" y="16" width="52" height="52" rx="7"/><rect class="a-hi" x="132" y="16" width="52" height="52" rx="7"/><rect class="a-deep" x="16" y="74" width="52" height="52" rx="7"/><rect class="a-acc" x="74" y="74" width="52" height="52" rx="7" opacity=".6"/><rect class="a-acc2" x="132" y="74" width="52" height="52" rx="7" opacity=".6"/><rect class="a-w" x="16" y="134" width="40" height="5" rx="2.500" opacity=".7"/>'},
  {type:'css',title:'Responsive layout',kind:'Desktop and phone',art:
   '<rect class="a-bg" width="200" height="150"/><rect class="a-deep" x="12" y="22" width="120" height="86" rx="7"/><rect class="a-acc" x="20" y="30" width="104" height="8" rx="3"/><rect class="a-acc2" x="20" y="46" width="48" height="52" rx="4"/><rect class="a-hi" x="74" y="46" width="50" height="24" rx="4"/><rect class="a-hi" x="74" y="76" width="50" height="22" rx="4" opacity=".6"/><rect class="a-bg2" x="146" y="40" width="42" height="84" rx="8"/><rect class="a-acc" x="152" y="50" width="30" height="6" rx="3"/><rect class="a-acc2" x="152" y="62" width="30" height="26" rx="4"/><rect class="a-hi" x="152" y="94" width="30" height="22" rx="4" opacity=".6"/>'},
  {type:'js',title:'Tabs',kind:'Basic JavaScript',art:
   '<rect class="a-bg2" width="200" height="150"/><rect class="a-acc" x="18" y="22" width="50" height="20" rx="6"/><rect class="a-deep" x="74" y="22" width="50" height="20" rx="6"/><rect class="a-deep" x="130" y="22" width="50" height="20" rx="6"/><rect class="a-deep" x="18" y="50" width="162" height="78" rx="8"/><rect class="a-w" x="30" y="64" width="80" height="8" rx="4"/><rect class="a-hi" x="30" y="82" width="124" height="6" rx="3" opacity=".7"/><rect class="a-hi" x="30" y="95" width="104" height="6" rx="3" opacity=".7"/><rect class="a-hi" x="30" y="108" width="60" height="6" rx="3" opacity=".7"/>'},
  {type:'js',title:'Form check',kind:'Basic JavaScript',art:
   '<rect class="a-bg" width="200" height="150"/><rect class="a-deep" x="22" y="18" width="156" height="114" rx="9"/><rect class="a-bg2" x="34" y="30" width="108" height="20" rx="5"/><path class="as-hi" d="M154 40l5 5 10-11" stroke-width="3.500" stroke-linecap="round" stroke-linejoin="round"/><rect class="a-bg2" x="34" y="58" width="108" height="20" rx="5"/><rect class="a-acc2" x="34" y="88" width="132" height="4" rx="2" opacity=".5"/><rect class="a-acc" x="34" y="102" width="62" height="20" rx="6"/>'},
  {type:'js',title:'Menu toggle',kind:'Basic JavaScript',art:
   '<rect class="a-bg2" width="200" height="150"/><rect class="a-deep" x="22" y="18" width="156" height="26" rx="7"/><rect class="a-w" x="34" y="26" width="24" height="4" rx="2"/><rect class="a-w" x="34" y="32" width="24" height="4" rx="2" opacity=".7"/><rect class="a-acc" x="150" y="26" width="16" height="10" rx="3"/><rect class="a-deep" x="22" y="52" width="156" height="78" rx="7"/><rect class="a-acc" x="34" y="62" width="70" height="8" rx="4"/><rect class="a-hi" x="34" y="80" width="100" height="6" rx="3" opacity=".7"/><rect class="a-hi" x="34" y="94" width="84" height="6" rx="3" opacity=".7"/><rect class="a-hi" x="34" y="108" width="92" height="6" rx="3" opacity=".7"/>'}
],
'code:steps':[
  {title:'Brief',text:'You tell me what the page is for, who will use it, and send any text, images and colours.'},
  {title:'Wireframe',text:'A quick sketch of the layout on small and large screens, agreed before I write code.'},
  {title:'Build',text:'Hand-written HTML, CSS and a little JavaScript, checked on a real phone.'},
  {title:'Hand-off',text:'Clean, commented files you can open, edit and host anywhere.'}
],
'about:a-skills':[
    {title:'Video editing',text:'Reels, YouTube videos and promos with clean pacing, captions and sound.',href:'video.html'},
    {title:'Graphics design',text:'Logos, posters, social posts and thumbnails, with editable source files.',href:'graphics.html'},
    {title:'Coding',text:'Hand-written HTML, CSS and basic JavaScript for fast, responsive pages.',href:'code.html'},
    {title:'Ads and promotion',text:'Short ad creatives built around one message and one action.',href:''}
  ],
'about:a-habits':[
    {title:'Light by default',text:'Small files, few scripts and nothing on the page that does not earn its place.'},
    {title:'Easy to use',text:'Keyboard focus, readable text and layouts that hold up on a cheap phone.'},
    {title:'Shown early',text:'Working builds arrive early, so changes are still cheap and you stay in control.'},
    {title:'Fast replies',text:'Messages are answered within one working day, so projects never sit waiting.'},
    {title:'Files you own',text:'You get editable source files and clean code, with nothing locked away.'},
    {title:'Fair, clear pricing',text:'You see the package and the price before anything starts, with no surprises.'}
  ],
'about:a-steps':[
    {n:'01',title:'2021',text:'Built my first websites and learned how much the small details matter.'},
    {n:'02',title:'Next',text:'Added graphic design, so pages and visuals could come from one person.'},
    {n:'03',title:'Then',text:'Learned video editing for reels, ads and longer videos.'},
    {n:'04',title:'Now',text:'Taking on small projects and sending working builds early.'}
  ],
'_texts':{lead:'Frontend developer. I write HTML, CSS and JavaScript from the first sketch to the last pixel, and reach for React and Node when the job needs them.',badge:'1 Year of Experience with 100% Authentic Work',statsTitle:'My Abilities of Work',statYearsValue:'1',statYearsLabel:'Year Experience',statGradeValue:'A',statGradeLabel:'Grade'},
'_icons':{"home": ["layout", "stack", "bolt", "video", "palette", "code", "ads", "dot"], "graphics": ["logo", "poster", "social", "thumb", "ads", "ui"], "video": ["reel", "cut", "ads", "caption", "sun", "wave"], "code": ["page", "grid", "phone", "click", "bug", "bolt"]}
};