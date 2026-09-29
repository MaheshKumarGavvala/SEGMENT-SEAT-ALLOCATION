const body=document.body;
const root=document.documentElement;

function clean(v){return String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));}
function message(text,error=false){const el=document.querySelector('#plannerMessage');if(!el)return;el.innerHTML='<span class="message-dot"></span>'+clean(text);el.classList.toggle('error',error)}

// Landing-page search intentionally uses the same stop source and suggestion rules as Dashboard.
let stops=[];
let stopsLoaded=false;
let fromStop=null,toStop=null;
const timers={from:null,to:null};
const from=document.querySelector('#from'),to=document.querySelector('#to');
const fromDrop=document.querySelector('#fromDrop'),toDrop=document.querySelector('#toDrop');
const date=document.querySelector('#date');
if(date){const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());date.value=today.toISOString().slice(0,10);date.min=date.value;}
const todayBtn=document.getElementById('todayDate'); const tomorrowBtn=document.getElementById('tomorrowDate');
function setQuickDate(days, btn){if(!date)return; const d=new Date(); d.setDate(d.getDate()+days); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); date.value=d.toISOString().slice(0,10); todayBtn?.classList.remove('active'); tomorrowBtn?.classList.remove('active'); btn?.classList.add('active');}
todayBtn?.addEventListener('click',()=>setQuickDate(0,todayBtn)); tomorrowBtn?.addEventListener('click',()=>setQuickDate(1,tomorrowBtn));
date?.addEventListener('change',()=>{todayBtn?.classList.remove('active');tomorrowBtn?.classList.remove('active');});

async function loadStops(){
  if(stopsLoaded)return;
  try{
    const payload=await SmartSegmentAPI.get(`/api/stops?_=${Date.now()}`);
    stops=Array.isArray(payload.data)?payload.data:[];
    stopsLoaded=true;
    message(stops.length?'Choose a boarding stop and destination.':'No stops are available yet.',!stops.length);
  }catch(e){console.error('LANDING STOP LOAD ERROR:',e);message(e.message||'Could not load stops.',true);}
}
function closeDrop(drop){drop?.classList.remove('open');}
function render(input,drop,type){
  const q=input.value.trim().toLowerCase();
  if(!q){closeDrop(drop);return;}
  let results=stops.filter(s=>String(s.name||'').toLowerCase().includes(q));
  results.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'})||String(a.city||'').localeCompare(String(b.city||''),undefined,{sensitivity:'base'})||Number(a.stop_order||0)-Number(b.stop_order||0));
  if(type==='to'&&fromStop)results=results.filter(s=>Number(s.route_id)===Number(fromStop.route_id)&&s.name!==fromStop.name);
  if(!results.length){drop.innerHTML='<div class="no-results">No matching stops found.</div>';drop.classList.add('open');return;}
  drop.innerHTML=results.map((s,i)=>`<button class="stop" type="button" data-i="${i}"><span class="stop-icon">●</span><span><b>${clean(s.name)}</b><small>${clean(s.city||'')} · ${clean(s.route_name||s.route_code||'Route')}</small></span></button>`).join('');
  drop.classList.add('open');
  drop.querySelectorAll('.stop').forEach((btn,i)=>btn.addEventListener('click',()=>{
    const s=results[i]; input.value=s.name;
    if(type==='from'){fromStop=s;toStop=null;to.value='';closeDrop(toDrop);message('Boarding stop selected. Now choose your destination.');}
    else{toStop=s;message('Route ready. Click Search Buses to continue.');}
    closeDrop(drop);updateClear();
  }));
}
function bind(input,drop,type){
  input.addEventListener('focus',async()=>{await loadStops();render(input,drop,type);});
  input.addEventListener('input',()=>{
    if(type==='from'){fromStop=null;toStop=null;to.value='';closeDrop(toDrop);}else toStop=null;
    updateClear();clearTimeout(timers[type]);timers[type]=setTimeout(()=>render(input,drop,type),70);
  });
}
bind(from,fromDrop,'from');bind(to,toDrop,'to');

document.querySelectorAll('[data-clear]').forEach(b=>b.addEventListener('click',()=>{
  const input=document.querySelector('#'+b.dataset.clear);input.value='';
  if(input.id==='from'){fromStop=null;toStop=null;to.value='';closeDrop(toDrop);}else toStop=null;
  updateClear();input.focus();
}));
function updateClear(){document.querySelectorAll('[data-clear]').forEach(b=>b.classList.toggle('show',!!document.querySelector('#'+b.dataset.clear)?.value));}

document.querySelector('#swap')?.addEventListener('click',()=>{
  [from.value,to.value]=[to.value,from.value];[fromStop,toStop]=[toStop,fromStop];closeDrop(fromDrop);closeDrop(toDrop);updateClear();
  if(fromStop&&toStop)message(Number(fromStop.route_id)===Number(toStop.route_id)?'Locations swapped successfully.':'Choose stops on the same route.',Number(fromStop.route_id)!==Number(toStop.route_id));
});

function beginSearch(){
  if(!stopsLoaded)return message('Loading stops. Please try again in a moment.',true);
  if(!from.value||!to.value||!date.value)return message('Please complete both stops and select a travel date.',true);
  if(!fromStop||!toStop)return message('Please select both stops from the suggestions.',true);
  if(Number(fromStop.route_id)!==Number(toStop.route_id))return message('Please choose stops on the same route.',true);
  sessionStorage.setItem('searchFrom',fromStop.name);
  sessionStorage.setItem('searchTo',toStop.name);
  sessionStorage.setItem('travelDate',date.value);
  sessionStorage.setItem('landingSearchIntent','1');
  let loggedIn=false;
  try{loggedIn=!!JSON.parse(localStorage.getItem('smartSegmentSession')||'null')?.token;}catch(e){}
  if(loggedIn){location.href='user/bus-search/bus-search.html';return;}
  location.href='auth/auth/login/login.html';
}
document.querySelector('#landingSearch')?.addEventListener('click',beginSearch);

document.querySelector('.account')?.addEventListener('click',()=>{try{sessionStorage.removeItem('landingSearchIntent')}catch(e){}});

// Keep the landing page visually simple: no dark-mode/template switch.
try{localStorage.setItem('smartSegmentTheme','light')}catch(e){}
root.dataset.theme='light';
body.classList.remove('dark');

lucide.createIcons();
const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.1});
document.querySelectorAll('.reveal,.feature-card,.benefit-cards article,.three-info article').forEach((e,i)=>{if(!e.classList.contains('reveal'))e.classList.add('reveal');e.style.transitionDelay=Math.min(i*45,180)+'ms';observer.observe(e)});

const progress=document.getElementById('scrollProgress');const header=document.querySelector('.header');
const updateScroll=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;const value=max>0?(window.scrollY/max)*100:0;if(progress)progress.style.width=value+'%';header?.classList.toggle('scrolled',window.scrollY>12)};
window.addEventListener('scroll',updateScroll,{passive:true});updateScroll();
