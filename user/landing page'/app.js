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

document.getElementById('landingSearch')?.addEventListener('click',()=>{ location.href='../../auth/auth/login/login.html'; });

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
