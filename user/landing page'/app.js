const body=document.body;
const menu=document.querySelector('.menu'), mobile=document.querySelector('.mobile-nav');
menu?.addEventListener('click',()=>{mobile.classList.toggle('open');menu.innerHTML=mobile.classList.contains('open')?'<i data-lucide="x"></i>':'<i data-lucide="menu"></i>';lucide.createIcons()});
document.querySelectorAll('.mobile-nav a').forEach(a=>a.addEventListener('click',()=>{mobile.classList.remove('open');if(menu){menu.innerHTML='<i data-lucide="menu"></i>';lucide.createIcons()}}));
const theme=document.querySelector('.theme-btn');
const root=document.documentElement;
function setThemeState(t,{animate=false,save=true}={}){
  const isDark=t==='dark';
  if(animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    root.classList.add('theme-transition');
    window.clearTimeout(window.__themeTransitionTimer);
    window.__themeTransitionTimer=window.setTimeout(()=>root.classList.remove('theme-transition'),750);
  }
  body.classList.toggle('dark',isDark);
  root.dataset.theme=t;
  theme?.setAttribute('aria-pressed',String(isDark));
  theme?.setAttribute('title',isDark?'Switch to light mode':'Switch to dark mode');
  theme?.setAttribute('aria-label',isDark?'Switch to light mode':'Switch to dark mode');
  if(save) localStorage.setItem('smartSegmentTheme',t);
}
setThemeState(localStorage.getItem('smartSegmentTheme')||'light');
theme?.addEventListener('click',()=>setThemeState(body.classList.contains('dark')?'light':'dark',{animate:true}));
document.querySelectorAll('.faq-q').forEach(q=>q.addEventListener('click',()=>{
 const open=q.classList.contains('open');
 document.querySelectorAll('.faq-q').forEach(x=>{x.classList.remove('open');x.setAttribute('aria-expanded','false');if(x.nextElementSibling)x.nextElementSibling.style.maxHeight=null});
 if(!open){q.classList.add('open');q.setAttribute('aria-expanded','true');q.nextElementSibling.style.maxHeight=q.nextElementSibling.scrollHeight+'px'}
}));
document.querySelectorAll('.faq-q.open').forEach(q=>q.nextElementSibling.style.maxHeight=q.nextElementSibling.scrollHeight+'px');
lucide.createIcons();
const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.1});
document.querySelectorAll('.reveal,.feature-card,.benefit-cards article,.three-info article').forEach((e,i)=>{if(!e.classList.contains('reveal'))e.classList.add('reveal');e.style.transitionDelay=Math.min(i*45,180)+'ms';observer.observe(e)});

/* Landing search: keep the journey selected before the user signs in. */
(function(){
  const fromInput=document.getElementById('landingFrom');
  const toInput=document.getElementById('landingTo');
  const dateInput=document.getElementById('landingDate');
  const fromDrop=document.getElementById('landingFromDrop');
  const toDrop=document.getElementById('landingToDrop');
  const searchBtn=document.getElementById('landingSearch');
  const swapBtn=document.getElementById('landingSwap');
  if(!fromInput||!toInput||!dateInput||!searchBtn)return;

  let stops=[]; let fromStop=null; let toStop=null;
  const apiBase=window.SmartSegmentAPI;
  const clean=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));
  const close=drop=>{if(drop){drop.classList.remove('open');drop.innerHTML=''}};
  const today=new Date(); today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
  dateInput.min=today.toISOString().slice(0,10);
  if(!dateInput.value)dateInput.value=sessionStorage.getItem('travelDate')||dateInput.min;

  async function loadStops(){
    try{
      const payload=await apiBase.get(`/api/stops?_=${Date.now()}`);
      stops=Array.isArray(payload.data)?payload.data:[];
      restoreSaved();
    }catch(error){
      console.error('LANDING STOP LOAD ERROR:',error);
    }
  }
  function matching(input,type){
    const q=input.value.trim().toLowerCase();
    if(!q)return [];
    let results=stops.filter(s=>String(s.name||'').toLowerCase().startsWith(q));
    if(type==='to'&&fromStop)results=results.filter(s=>Number(s.route_id)===Number(fromStop.route_id)&&Number(s.stop_order)>Number(fromStop.stop_order));
    return results.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'})||String(a.city||'').localeCompare(String(b.city||''),undefined,{sensitivity:'base'})).slice(0,8);
  }
  function render(input,drop,type){
    const results=matching(input,type);
    if(!input.value.trim()){close(drop);return;}
    if(!results.length){drop.innerHTML='<div class="landing-no-result">No matching stops found</div>';drop.classList.add('open');return;}
    drop.innerHTML=results.map((s,i)=>`<button type="button" class="landing-stop" data-index="${i}"><b>${clean(s.name)}</b><small>${clean(s.city||'')} · ${clean(s.route_name||s.route_code||'Route')}</small></button>`).join('');
    drop.classList.add('open');
    drop.querySelectorAll('.landing-stop').forEach((button,i)=>button.addEventListener('click',()=>{
      const selected=results[i]; input.value=selected.name;
      if(type==='from'){fromStop=selected;toStop=null;toInput.value='';close(toDrop)}else toStop=selected;
      close(drop);
    }));
  }
  function restoreSaved(){
    try{
      const savedFrom=JSON.parse(sessionStorage.getItem('landingFromStop')||'null');
      const savedTo=JSON.parse(sessionStorage.getItem('landingToStop')||'null');
      fromStop=savedFrom?.id?stops.find(s=>Number(s.id)===Number(savedFrom.id))||savedFrom:null;
      toStop=savedTo?.id?stops.find(s=>Number(s.id)===Number(savedTo.id))||savedTo:null;
      const sf=sessionStorage.getItem('searchFrom'); const st=sessionStorage.getItem('searchTo');
      if(sf)fromInput.value=sf; if(st)toInput.value=st;
    }catch(e){}
  }
  fromInput.addEventListener('focus',()=>render(fromInput,fromDrop,'from'));
  toInput.addEventListener('focus',()=>render(toInput,toDrop,'to'));
  fromInput.addEventListener('input',()=>{fromStop=null;toStop=null;toInput.value='';render(fromInput,fromDrop,'from')});
  toInput.addEventListener('input',()=>{toStop=null;render(toInput,toDrop,'to')});
  fromInput.addEventListener('keydown',e=>{if(e.key==='Escape')close(fromDrop)});
  toInput.addEventListener('keydown',e=>{if(e.key==='Escape')close(toDrop)});
  swapBtn?.addEventListener('click',()=>{const a=fromStop,b=toStop;fromStop=b;toStop=a;[fromInput.value,toInput.value]=[toInput.value,fromInput.value];close(fromDrop);close(toDrop)});
  document.addEventListener('click',e=>{if(!e.target.closest('.landing-field')){close(fromDrop);close(toDrop)}});
  searchBtn.addEventListener('click',()=>{
    if(!fromStop||!toStop){alert('Please select your boarding stop and destination from the suggestions.');return;}
    if(!dateInput.value){alert('Please select a travel date.');return;}
    if(Number(fromStop.route_id)!==Number(toStop.route_id)||Number(fromStop.stop_order)>=Number(toStop.stop_order)){
      alert('Please choose a valid journey on the same route.');return;
    }
    sessionStorage.setItem('searchFrom',fromStop.name);
    sessionStorage.setItem('searchTo',toStop.name);
    sessionStorage.setItem('travelDate',dateInput.value);
    sessionStorage.setItem('landingFromStop',JSON.stringify(fromStop));
    sessionStorage.setItem('landingToStop',JSON.stringify(toStop));
    sessionStorage.setItem('pendingLandingSearch','1');
    location.href='../../auth/auth/login/login.html';
  });
  loadStops();
})();

/* Premium interaction layer */
(function(){
  const progress=document.getElementById('scrollProgress');
  const header=document.querySelector('.header');
  const updateScroll=()=>{
    const max=document.documentElement.scrollHeight-window.innerHeight;
    const value=max>0?(window.scrollY/max)*100:0;
    if(progress) progress.style.width=value+'%';
    header?.classList.toggle('scrolled',window.scrollY>12);
  };
  window.addEventListener('scroll',updateScroll,{passive:true}); updateScroll();

  // Gentle pointer glow on capable desktop devices.
  if(matchMedia('(pointer:fine)').matches){
    document.body.classList.add('cursor-glow');
    window.addEventListener('pointermove',e=>{
      document.body.style.setProperty('--mx',e.clientX+'px');
      document.body.style.setProperty('--my',e.clientY+'px');
    },{passive:true});
  }

  // Small parallax movement for the hero visual.
  const visual=document.querySelector('.hero-visual');
  if(visual && matchMedia('(pointer:fine)').matches){
    visual.addEventListener('pointermove',e=>{
      const r=visual.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      visual.style.setProperty('--px',x.toFixed(3)); visual.style.setProperty('--py',y.toFixed(3));
      visual.querySelector('.floating-seat')?.style.setProperty('transform',`translate3d(${x*10}px,${y*8-5}px,0)`);
      visual.querySelector('.route-overlay')?.style.setProperty('transform',`translate3d(${x*-5}px,${y*-4}px,0)`);
    });
    visual.addEventListener('pointerleave',()=>{
      visual.querySelector('.floating-seat')?.style.removeProperty('transform');
      visual.querySelector('.route-overlay')?.style.removeProperty('transform');
    });
  }

  // Animated route state in the main allocation story.
  const demo=document.querySelector('.allocation-demo');
  if(demo){
    const rows=[...demo.querySelectorAll('.alloc-row')];
    const result=demo.querySelector('.allocation-result');
    const play=()=>{
      rows.forEach(r=>{r.style.opacity='0';r.style.transform='translateX(-12px)'});
      if(result){result.style.opacity='0';result.style.transform='translateY(8px)'}
      setTimeout(()=>rows.forEach((r,i)=>setTimeout(()=>{r.style.opacity='1';r.style.transform='none'},i*260)),450);
      setTimeout(()=>{if(result){result.style.opacity='1';result.style.transform='none'}},1100);
    };
    const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){play();io.disconnect()}},{threshold:.35}); io.observe(demo);
  }
})();
