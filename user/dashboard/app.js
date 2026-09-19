(function(){
'use strict';
const $=s=>document.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const root=document.documentElement, body=document.body, frame=$('#appFrame');
let stops=[];
let stopsLoaded=false;
let fromStop=null,toStop=null;const timers={from:null,to:null};
function applyTheme(dark){
 root.dataset.theme=dark?'dark':'light';
 try{localStorage.setItem('smartSegmentTheme',dark?'dark':'light')}catch(e){}
 const b=$('#theme'); if(b)b.setAttribute('aria-pressed',String(dark));
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#090c11':'#f6f7fa');
 try{frame?.contentWindow.postMessage({type:'theme',theme:dark?'dark':'light'},'*')}catch(e){}
}
let stored='light';try{stored=localStorage.getItem('smartSegmentTheme')||'light'}catch(e){}
applyTheme(stored==='dark');
$('#theme')?.addEventListener('click',()=>applyTheme(root.dataset.theme!=='dark'));
$('#userBtn')?.addEventListener('click',e=>{e.stopPropagation();const m=$('#userMenu'),open=m.classList.toggle('open');$('#userBtn').setAttribute('aria-expanded',String(open))});
document.addEventListener('click',e=>{if(!e.target.closest('#userMenu')&&!e.target.closest('#userBtn')){$('#userMenu')?.classList.remove('open');$('#userBtn')?.setAttribute('aria-expanded','false')}});
function setActive(id){$$('.nav-link').forEach(x=>x.classList.remove('active'));if(id)$(id)?.classList.add('active')}
function signout(){try{SmartSegmentAPI.clearSession();sessionStorage.clear()}catch(e){} location.href='../../auth/auth/login/login.html'}$('#menuSignout')?.addEventListener('click',signout);
function openFrame(url){if(!frame)return;const u=new URL(url,location.href);u.searchParams.set('embedded','1');body.classList.add('frame-mode');frame.src=u.href;sessionStorage.setItem('smartFrameOpen','1');sessionStorage.setItem('smartFrameUrl',u.href);setActive(null)}
function closeFrame(success=false){body.classList.remove('frame-mode');if(frame)frame.src='about:blank';sessionStorage.removeItem('smartFrameOpen');sessionStorage.removeItem('smartFrameUrl');setActive('#homeNav');if(success){setTimeout(()=>{const t=document.querySelector('.toast');if(t){t.textContent='Booking successful!';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}else{alert('Booking successful!')}},120)}}
frame?.addEventListener('load',()=>{try{frame.contentWindow.postMessage({type:'theme',theme:root.dataset.theme||'light'},'*');frame.contentWindow.scrollTo(0,0);}catch(e){}});
$('#brandHome')?.addEventListener('click',e=>{e.preventDefault();closeFrame()});$('#homeNav')?.addEventListener('click',closeFrame);
const bookingUrl='../booking-confirmation/booking-confirmation.html';
$('#bookingsNav')?.addEventListener('click',()=>openFrame(bookingUrl));$('#metricBookings')?.addEventListener('click',()=>openFrame(bookingUrl));$('#allBookings')?.addEventListener('click',()=>openFrame(bookingUrl));
$('#helpNav')?.addEventListener('click',()=>alert('Smart Segment support is available in the full application.'));
$('#learnMore')?.addEventListener('click',()=>document.querySelector('.smart-card')?.scrollIntoView({behavior:'smooth',block:'center'}));
const date=$('#date');const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());if(date){date.value=today.toISOString().slice(0,10);date.min=date.value}
async function loadDashboardData(){
  try{
    const session=JSON.parse(localStorage.getItem('smartSegmentSession')||'null');
    if(!session?.token){ window.location.assign('/auth/auth/login/login.html'); return; }
    // Load stops independently. A booking-history failure must never prevent
    // the search suggestions from appearing.
    try{
      // Use a direct same-origin request here. This keeps the dashboard
      // stop suggestions independent of the shared API helper/session code.
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),5000);
      let res;
      try{
	res=await fetch(`https://segment-seat-allocation.onrender.com/api/stops?_=${Date.now()}`,{
          method:'GET',
          headers:{'Accept':'application/json','Cache-Control':'no-cache'},
          cache:'no-store',
          signal:controller.signal
        });
      }finally{clearTimeout(timeout)}
      const payload=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(payload.message||`Could not load stops (HTTP ${res.status}).`);
      stops=Array.isArray(payload.data)?payload.data:[];
      stopsLoaded=true;
      if(!stops.length){
        message('No stops have been added yet. Add route stops from Admin → Bus Management.',true);
      }else{
        message(`${stops.length} route stops available.`);
        render(document.querySelector('#from'),document.querySelector('#fromDrop'),'from');
      }
    }catch(stopError){
      stops=[];
      stopsLoaded=false;
      console.error('STOP LOAD ERROR:',stopError);
      message(stopError.name==='AbortError'?'Stops request timed out. Check that the backend is running.':(stopError.message||'Could not load stops.'),true);
    }
    const name=session.name||'Passenger';
    const heading=document.querySelector('h1');
    if(heading) heading.textContent=`Good to see you, ${clean(name)}.`;
    let bookings=[];
    try{
      const bookingsResponse=await SmartSegmentAPI.get('/api/bookings/mine');
      bookings=bookingsResponse.data||[];
    }catch(bookingError){
      // Keep the dashboard/search usable even if booking history is unavailable.
      console.warn('Could not load booking history:',bookingError);
    }
    const count=document.querySelector('#bookingNumber'); if(count) count.textContent=bookings.length;
    const list=document.querySelector('.journeys');
    if(list){
      const recent=bookings.slice(0,3);
      list.innerHTML=recent.length?recent.map(b=>`<button class="journey" type="button" data-booking-code="${clean(b.booking_code||'')}"><span class="route-badge"><svg viewBox="0 0 24 24"><path d="M5 17h14M7 17V8h10v9M9 8V5h6v3M8 20h2M14 20h2"/></svg></span><span class="journey-copy"><b>${clean(b.from_stop?.name||'')} <i>→</i> ${clean(b.to_stop?.name||'')}</b><small>${clean(b.travel_date||'')} · ${clean(b.passengers?.map(p=>`Seat ${p.seat_number}`).join(', ')||'')}</small></span><span class="journey-status ${b.status==='confirmed'?'confirmed':b.status==='cancelled'?'completed':'completed'}">${clean(b.status||'')}</span><svg class="row-arrow" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>`).join(''):'<div class="empty">No bookings yet. Search for a bus to start your journey.</div>';
      $$('.journey',list).forEach(btn=>btn.addEventListener('click',()=>{
        const code=btn.dataset.bookingCode||'';
        openFrame(`${bookingUrl}?booking=${encodeURIComponent(code)}`);
      }));
    }
  }catch(e){ message(e.message||'Could not load dashboard data.',true); }
}
function clean(v){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]))}
function message(t,error=false){const el=$('#plannerMessage');if(!el)return;el.innerHTML='<span class="message-dot"></span>'+clean(t);el.classList.toggle('error',error)}
function closeDrop(d){d?.classList.remove('open');if(d)d.innerHTML=''}
function render(input,drop,type){
 const q=input.value.trim().toLowerCase();if(!q){closeDrop(drop);return}
 let results=stops.filter(s=>String(s.name||'').toLowerCase().includes(q));
 results.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'})||String(a.city||'').localeCompare(String(b.city||''),undefined,{sensitivity:'base'})||Number(a.stop_order||0)-Number(b.stop_order||0));
 if(type==='to'&&fromStop)results=results.filter(s=>Number(s.route_id)===Number(fromStop.route_id)&&s.name!==fromStop.name);
 results=results.slice(0,6);
 if(!results.length){drop.innerHTML='<div style="padding:10px;color:var(--muted);font-size:8px">No matching stops found.</div>';drop.classList.add('open');return}
 drop.innerHTML=results.map((s,i)=>'<button class="stop" type="button" data-i="'+i+'"><span class="stop-icon">●</span><span><b>'+clean(s.name)+'</b><small>'+clean(s.city||'')+' · '+clean(s.route_name||s.route_code||'Route')+'</small></span></button>').join('');
 drop.classList.add('open');
 $$('.stop',drop).forEach((btn,i)=>btn.addEventListener('click',()=>{const s=results[i];input.value=s.name;if(type==='from'){fromStop=s;toStop=null;$('#to').value='';closeDrop($('#toDrop'));message('Boarding stop selected. Now choose your destination.')}else{toStop=s;message('Route ready. Opening seat selection…')}closeDrop(drop);updateClear()}));
}
async function loadStopsForSearch(input,drop,type){
 try{
   const res=await fetch(`https://segment-seat-allocation.onrender.com/api/stops?_=${Date.now()}`,{headers:{'Accept':'application/json'},cache:'no-store'});
   const payload=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(payload.message||`Could not load stops (HTTP ${res.status}).`);
   stops=Array.isArray(payload.data)?payload.data:[];stopsLoaded=true;
   render(input,drop,type);
   if(stops.length)message(`${stops.length} route stops available.`);
 }catch(e){console.error('STOP SEARCH LOAD ERROR:',e);message(e.message||'Could not load stops.',true)}
}
function bind(input,drop,type){
 input.addEventListener('focus',()=>{if(!stopsLoaded)loadStopsForSearch(input,drop,type)});
 input.addEventListener('input',()=>{if(type==='from'){fromStop=null;toStop=null;$('#to').value='';closeDrop($('#toDrop'))}else toStop=null;updateClear();clearTimeout(timers[type]);timers[type]=setTimeout(()=>render(input,drop,type),70)});
 input.addEventListener('focus',()=>render(input,drop,type));input.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrop(drop)});
}
bind($('#from'),$('#fromDrop'),'from');bind($('#to'),$('#toDrop'),'to');
$$('[data-clear]').forEach(b=>b.addEventListener('click',()=>{const input=$('#'+b.dataset.clear);input.value='';if(input.id==='from'){fromStop=null;toStop=null;$('#to').value='';closeDrop($('#toDrop'))}else toStop=null;closeDrop(input.id==='from'?$('#fromDrop'):$('#toDrop'));updateClear();input.focus();message('Select your boarding stop and destination to continue.')}));
function updateClear(){$$('[data-clear]').forEach(b=>b.classList.toggle('show',!!$('#'+b.dataset.clear).value))}
$('#swap')?.addEventListener('click',()=>{const fi=$('#from'),ti=$('#to');[fi.value,ti.value]=[ti.value,fi.value];[fromStop,toStop]=[toStop,fromStop];closeDrop($('#fromDrop'));closeDrop($('#toDrop'));updateClear();const s=$('#swap');s.classList.remove('swapping');void s.offsetWidth;s.classList.add('swapping');setTimeout(()=>s.classList.remove('swapping'),300);if(fromStop&&toStop)message(Number(fromStop.route_id)===Number(toStop.route_id)?'Locations swapped successfully. The route is ready.':'Locations swapped. Choose stops on the same route for this preview.',Number(fromStop.route_id)!==Number(toStop.route_id));else message('Locations swapped. Complete both stops to continue.')});
document.addEventListener('click',e=>{if(!e.target.closest('.field'))$$('.dropdown').forEach(closeDrop)});
$('#searchForm')?.addEventListener('submit',e=>{e.preventDefault();if(!stopsLoaded)return message('Loading stops. Please try again in a moment.',true);if(!$('#from').value||!$('#to').value||!date.value)return message('Please complete both stops and select a travel date.',true);if(!fromStop||!toStop)return message('Please select stops from the suggestions so the route is exact.',true);if(Number(fromStop.route_id)!==Number(toStop.route_id))return message('For this independent preview, choose stops on the same route.',true);try{sessionStorage.setItem('searchFrom',fromStop.name);sessionStorage.setItem('searchTo',toStop.name);sessionStorage.setItem('travelDate',date.value)}catch(e){}openFrame('../bus-search/bus-search.html')});
window.addEventListener('message',e=>{const d=e.data||{};if(d.type==='themeRequest')applyTheme(d.theme==='dark');if(d.type==='navigateFrame')openFrame(d.url);if(d.type==='closeFrame'){closeFrame(!!d.bookingSuccess);setTimeout(loadDashboardData,180)}if(d.type==='bookingChanged')setTimeout(loadDashboardData,180)});
loadDashboardData();
try{if(sessionStorage.getItem('smartFrameOpen')==='1'&&sessionStorage.getItem('smartFrameUrl')){body.classList.add('frame-mode');frame.src=sessionStorage.getItem('smartFrameUrl')}}catch(e){}
})();
