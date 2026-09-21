(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], root=document.documentElement;
const params=new URLSearchParams(location.search);
let stops=[], occupied=new Set(), from=-1,to=-1,currentSelected=null,totalSeats=32,apiReady=false;
const data=(()=>{let d={from:params.get('from'),to:params.get('to'),date:params.get('date')};try{d.from ||= sessionStorage.getItem('searchFrom');d.to ||= sessionStorage.getItem('searchTo');d.date ||= sessionStorage.getItem('travelDate');d.bus=JSON.parse(sessionStorage.getItem('selectedBus')||'null')}catch(e){}return d})();
const bus=data.bus;
function esc(v){return String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]))}
function toast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),1900)}
function setTheme(dark){root.dataset.theme=dark?'dark':'light';try{localStorage.setItem('smartSegmentTheme',dark?'dark':'light')}catch(e){}if($('#theme'))$('#theme').textContent=dark?'☼':'☾'}
setTheme(localStorage.getItem('smartSegmentTheme')==='dark');$('#theme').onclick=()=>setTheme(root.dataset.theme!=='dark');window.addEventListener('message',e=>{if(e.data?.type==='theme')setTheme(e.data.theme==='dark')});
function allocations(){try{return JSON.parse(sessionStorage.getItem('smartSegmentSelectedSegmentSeats')||'{}')}catch(e){return {}}}
function saveAlloc(a){sessionStorage.setItem('smartSegmentSelectedSegmentSeats',JSON.stringify(a))}
function hasOverlap(a,b,c,d){return Math.max(a,c)<Math.min(b,d)}
function stopInternalCovered(i){return Object.values(allocations()).some(x=>i>Number(x.fromStopIndex)&&i<Number(x.toStopIndex))}
function segmentAvailable(a,b){return a>=0&&b>a&&!Object.values(allocations()).some(x=>hasOverlap(a,b,Number(x.fromStopIndex),Number(x.toStopIndex)))}
function renderTimeline(){
 $('#timeline').innerHTML=stops.map((s,i)=>{
   const internal=stopInternalCovered(i), selectedFrom=i===from,selectedTo=i===to,range=from>=0&&to>=0&&i>=from&&i<=to;
   let disabled=internal;
   if(from<0) disabled=internal||!stops.some((_,j)=>j>i&&segmentAvailable(i,j));
   else if(to<0) disabled=i<=from||internal||!segmentAvailable(from,i);
   return `<div class="timeline-node ${selectedFrom?'selected-from':''} ${selectedTo?'selected-to':''} ${range?'in-range':''} ${internal?'covered':''}"><button type="button" data-i="${i}" ${disabled?'disabled':''} aria-label="${esc(s.name)}">${esc(s.code)}</button><span class="stop-code">${esc(s.code)} · ${esc(s.name)}</span><span class="stop-city">${esc(s.city)}</span><span class="stop-tag">STOP ${String(i+1).padStart(2,'0')}${internal?' · LOCKED':''}</span></div>`
 }).join('');
 $$('.timeline-node button').forEach(b=>b.onclick=()=>pickStop(Number(b.dataset.i)));
}
function pickStop(i){
 if(stopInternalCovered(i))return toast('This stop is inside an already allocated segment.');
 if(from<0){from=i;to=-1;hideMap();toast(`Boarding stop ${stops[i].code} selected`)}
 else if(to<0&&i>from){if(!segmentAvailable(from,i))return toast('That journey section is already allocated.');to=i;showMap();toast(`Segment ${stops[from].code} → ${stops[to].code} ready`)}
 else if(i===from){from=-1;to=-1;hideMap()}
 else if(i===to){to=-1;hideMap()}
 else if(i>from){if(!segmentAvailable(from,i))return toast('That journey section is already allocated.');to=i;showMap()}
 else{from=i;to=-1;hideMap()}
 renderAll();
}
function updateStopUI(){
 const count=(from>=0?1:0)+(to>=0?1:0);$('#stopCounter').textContent=count;
 $('#fromName').textContent=from>=0?stops[from].name:'Select a stop';$('#fromCity').textContent=from>=0?stops[from].city:'—';
 $('#toName').textContent=to>=0?stops[to].name:'Select a later stop';$('#toCity').textContent=to>=0?stops[to].city:'—';
 $('#clearFrom').parentElement.classList.toggle('has-value',from>=0);$('#clearTo').parentElement.classList.toggle('has-value',to>=0);
 $('#segmentText').textContent=from>=0&&to>=0?`${stops[from].code} · ${stops[from].city} → ${stops[to].code} · ${stops[to].city}`:'Choose two stops';
 const ready=from>=0&&to>from;$('#helperTitle').textContent=ready?'Segment ready':from>=0?'Now choose a later stop':'Start with your boarding stop';$('#helperText').textContent=ready?'Seat map opened automatically. Choose an available seat.':'Choose any available stop on the route.';
 if(ready)$('#mapSegment').textContent=`${stops[from].code} → ${stops[to].code}`;
}
function seatConflicted(n){return Object.values(allocations()).some(x=>Number(x.seat)===n&&hasOverlap(from,to,Number(x.fromStopIndex),Number(x.toStopIndex)))}
function buildSeats(){const grid=$('#seatGrid');grid.innerHTML='';for(let r=0;r<Math.ceil(totalSeats/4);r++){[1,2,3,4].forEach((pos,idx)=>{const n=r*4+pos;if(n>totalSeats)return;if(idx===2)grid.insertAdjacentHTML('beforeend','<div class="aisle"></div>');const b=document.createElement('button');b.className='seat';b.dataset.seat=n;b.innerHTML=`<span class="seat-body"><span class="seat-number">${n}</span></span>`;grid.appendChild(b)})}renderSeats()}
function renderSeats(){if(from<0||to<0)return;let avail=0;$$('.seat').forEach(b=>{const n=Number(b.dataset.seat);b.className='seat';b.disabled=false;if(occupied.has(n)){b.classList.add('occupied');b.disabled=true}else if(seatConflicted(n)){b.classList.add('locked');b.disabled=true}else{b.classList.add('available');avail++}if(currentSelected===n)b.classList.add('selected')});$('#availabilityCount').textContent=`${avail} seats`;$('#mapStatus').textContent=currentSelected?`Seat ${currentSelected} selected for ${stops[from].code} → ${stops[to].code}.`:'Select an available seat.'}
async function refreshSegmentAvailability(){
 if(!bus?.id||!bus?.route?.id||from<0||to<0)return;
 try{const r=await SmartSegmentAPI.get(`/api/segments/availability?bus_id=${bus.id}&route_id=${bus.route.id}&from_stop_id=${stops[from].id}&to_stop_id=${stops[to].id}&travel_date=${encodeURIComponent(data.date||'')}`);const info=r.data||{};totalSeats=Number(info.bus?.total_seats||bus.seats||32);occupied.clear();(info.seats||[]).forEach(x=>{if(x.status!=='available')occupied.add(Number(x.seat_number));});currentSelected=null;buildSeats();apiReady=true;if(info.fare!=null)$('#mapStatus').textContent=`${stops[from].code} → ${stops[to].code} · ₹${Number(info.fare).toLocaleString('en-IN')} per seat`;renderAll()}catch(e){toast(e.message||'Could not load live seat availability.');apiReady=false}}
function showMap(){if(from<0||to<0)return;currentSelected=null;$('#mapCard').hidden=false;$('#mapSegment').textContent=`${stops[from].code} → ${stops[to].code}`;refreshSegmentAvailability();$('#mapCard').scrollIntoView({behavior:'smooth',block:'start'})}
function hideMap(){currentSelected=null;$('#mapCard').hidden=true}
async function selectSeat(n){if(!apiReady||from<0||to<0)return toast('Seat availability is still loading.');if(occupied.has(n)||seatConflicted(n))return toast('That seat is not available for this segment.');
 // Recheck immediately before committing the selection.
 try{const r=await SmartSegmentAPI.get(`/api/segments/availability?bus_id=${bus.id}&route_id=${bus.route.id}&from_stop_id=${stops[from].id}&to_stop_id=${stops[to].id}&travel_date=${encodeURIComponent(data.date||'')}`);const live=r.data;const seat=live.seats?.find(x=>Number(x.seat_number)===n);if(!seat||seat.status!=='available')return toast(`Seat ${n} is no longer available.`);const a=allocations();const key=`${from}-${to}-${n}-${Date.now()}`;a[key]={key,from:stops[from].name,to:stops[to].name,fromCode:stops[from].code,toCode:stops[to].code,fromStopIndex:from,toStopIndex:to,fromStopId:stops[from].id,toStopId:stops[to].id,seat:n,fare:Number(live.fare),bus:bus.name||'Selected bus'};saveAlloc(a);currentSelected=null;renderAll();renderSeats();toast(`Seat ${n} selected for ${stops[from].code} → ${stops[to].code}`)}catch(e){toast(e.message||'Could not verify seat.')}}
function renderSummary(){const arr=Object.values(allocations());$('#segmentCount').textContent=arr.length;$('#segmentsList').innerHTML=arr.length?arr.map(x=>`<div class="segment-item"><div class="segment-top"><span class="seat-chip">${esc(x.seat)}</span><div class="segment-route"><b>Seat ${esc(x.seat)}</b><small>${esc(x.fromCode)} → ${esc(x.toCode)}</small></div><button class="remove-segment" data-key="${esc(x.key)}" title="Remove">×</button></div></div>`).join(''):'<div class="empty">Select a seat and its segment will appear here instantly.</div>';$$('.remove-segment').forEach(b=>b.onclick=()=>{const a=allocations();delete a[b.dataset.key];saveAlloc(a);renderAll();if(from>=0&&to>=0)refreshSegmentAvailability();toast('Seat segment removed. The seat is available again.')});const can=isJourneyComplete(arr);$('#continueBtn').disabled=!can;$('#continueBtn').classList.toggle('disabled',!can)}
function isJourneyComplete(arr){
 if(!arr.length||!stops.length)return false;

 // The required journey is the From/To selected by the user.
 // Do not rely only on the bus route's endpoint IDs.
 const matchStop=value=>{
   if(value==null)return -1;
   const q=String(value).trim().toLowerCase();
   if(!q)return -1;
   return stops.findIndex(s=>[
     s.id,s.code,s.name,s.city
   ].some(v=>String(v??'').trim().toLowerCase()===q));
 };

 let startIndex=matchStop(data.from);
 let endIndex=matchStop(data.to);

 // Fallback to the selected bus endpoint IDs when the search values
 // cannot be matched directly to the loaded route stops.
 if(startIndex<0&&bus?.fromStopId!=null)
   startIndex=stops.findIndex(s=>Number(s.id)===Number(bus.fromStopId));
 if(endIndex<0&&bus?.toStopId!=null)
   endIndex=stops.findIndex(s=>Number(s.id)===Number(bus.toStopId));

 if(startIndex<0||endIndex<0||endIndex<=startIndex)return false;

 const sorted=[...arr].sort((a,b)=>Number(a.fromStopIndex)-Number(b.fromStopIndex));

 // The selected segments must start at the searched From stop,
 // end at the searched To stop, and cover the journey continuously.
 if(Number(sorted[0].fromStopIndex)!==startIndex)return false;
 if(Number(sorted.at(-1).toStopIndex)!==endIndex)return false;

 for(let i=1;i<sorted.length;i++){
   if(Number(sorted[i].fromStopIndex)!==Number(sorted[i-1].toStopIndex))return false;
 }

 return true;
}
function renderAll(){renderTimeline();updateStopUI();renderSummary();if(!$('#mapCard').hidden&&from>=0&&to>=0)renderSeats()}
async function init(){
 $('#busName').textContent=bus?.name||'Selected bus';$('#busType').textContent=`${bus?.type||'Bus'} · ${bus?.service||bus?.number||''}`;
 try{const r=await SmartSegmentAPI.get(`/api/routes/${bus?.route?.id}/stops`);const allStops=r.data||[];if(allStops.length<2)throw new Error('Route stops are unavailable.');const wantedFrom=String(data.from||'').trim().toLowerCase(),wantedTo=String(data.to||'').trim().toLowerCase();if(wantedFrom&&wantedTo){const start=allStops.findIndex(s=>String(s.name||'').trim().toLowerCase()===wantedFrom),end=allStops.findIndex(s=>String(s.name||'').trim().toLowerCase()===wantedTo);if(start<0||end<0||end<=start)throw new Error('Searched journey stops are unavailable.');stops=allStops.slice(start,end+1)}else{stops=allStops}}catch(e){toast(e.message||'Could not load route stops from the server.');return}
 renderAll();
}
$('#changeSegment').onclick=()=>{from=-1;to=-1;hideMap();renderAll();document.querySelector('.stop-card')?.scrollIntoView({behavior:'smooth',block:'start'});toast('Choose the next journey segment')};$('#clearFrom').onclick=()=>{from=-1;to=-1;hideMap();renderAll()};$('#clearTo').onclick=()=>{to=-1;hideMap();renderAll()};$('#seatGrid').addEventListener('click',e=>{const b=e.target.closest('.seat');if(b&&!b.disabled)selectSeat(Number(b.dataset.seat))});$('#clearAll').onclick=()=>{saveAlloc({});from=-1;to=-1;hideMap();renderAll();toast('All selected seat segments cleared')};
$('#continueBtn').onclick=()=>{const arr=Object.values(allocations());if(!isJourneyComplete(arr))return;sessionStorage.setItem('seatSelectionMode','segment');sessionStorage.removeItem('selectedSeat');sessionStorage.setItem('selectedSeats',JSON.stringify(arr.map(x=>x.seat)));const u=new URL('../passenger-details/passenger-details.html',location.href);u.searchParams.set('embedded','1');parent.postMessage({type:'navigateFrame',url:u.href,title:'Passenger Details'},'*')};
['#brandLink','#homeLink'].forEach(sel=>{const el=$(sel);if(el)el.onclick=e=>{if(window.parent!==window.self){e.preventDefault();parent.postMessage({type:'closeFrame'},'*')}}});
init();
})();
