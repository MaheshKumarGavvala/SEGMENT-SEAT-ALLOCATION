(() => {
const root=document.documentElement,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const params=new URLSearchParams(location.search);
try {
  const sf=sessionStorage.getItem("searchFrom");
  const st=sessionStorage.getItem("searchTo");
  const sd=sessionStorage.getItem("travelDate");
  if(sf) $("#from").textContent=sf;
  if(st) $("#to").textContent=st;
  if(sd){
    const dt=new Date(`${sd}T00:00:00`);
    if(!Number.isNaN(dt.getTime())){
      $("#date").textContent=dt.toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"});
      const day=dt.toLocaleDateString(undefined,{weekday:"long"});
      const dateWrap=$("#date").parentElement;
      const spans=dateWrap?.querySelectorAll("span");
      if(spans?.length) spans[0].textContent=day;
    }
  }
}catch(e){}

function theme(dark){root.dataset.theme=dark?"dark":"light";localStorage.setItem("smartSegmentTheme",dark?"dark":"light");$("#theme").textContent=dark?"☼":"☾"}
theme(localStorage.getItem("smartSegmentTheme")==="dark");
$("#theme").onclick=()=>theme(root.dataset.theme!=="dark");
$("#modify").onclick=()=>window.parent!==window ? parent.postMessage({type:"closeFrame"},"*") : history.back();
$("#edit").onclick=()=>window.parent!==window ? parent.postMessage({type:"closeFrame"},"*") : history.back();

let buses=[];
async function loadBuses(){
  const from=sessionStorage.getItem("searchFrom")||"";
  const to=sessionStorage.getItem("searchTo")||"";
  const date=sessionStorage.getItem("travelDate")||"";
  try{
    const r=await SmartSegmentAPI.get(`/api/buses/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`);
    buses=(r.data||[]).map(x=>({op:x.name,num:x.service_number||x.number,type:x.type,dep:String(x.departure).slice(0,5),arr:String(x.arrival).slice(0,5),fare:Number(x.fare),seats:Number(x.seats),tag:"Available",amen:["AC","USB"],id:x.id,route:x.route,fromStopId:x.from_stop_id,toStopId:x.to_stop_id}));
  }catch(e){
    buses=[]; renderError(e.message||'Could not load buses. Please check the backend connection.'); return;
  }
  render();
}
const mins=t=>{const [h,m]=t.split(":").map(Number);return h*60+m};
const fmt=t=>{let [h,m]=t.split(":").map(Number),ap=h>=12?"PM":"AM";h=h%12||12;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ap}`};
const dur=(a,b)=>{let n=mins(b)-mins(a);if(n<0)n+=1440;return `${Math.floor(n/60)}h ${n%60}m`};
function esc(v){return String(v).replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[m]))}
function renderError(msg){
  $('#count').textContent='0';
  $('#results').innerHTML=`<div class="card" style="padding:24px"><strong>Unable to load buses</strong><p style="color:var(--muted)">${esc(msg)}</p><button class="choose" id="retrySearch">Retry</button></div>`;
  $('#retrySearch')?.addEventListener('click',loadBuses);
}
function render(){
let data=[...buses],sort=$("#sort").value;
if(sort==="departure")data.sort((a,b)=>mins(a.dep)-mins(b.dep));
if(sort==="fare")data.sort((a,b)=>a.fare-b.fare);
if(sort==="seats")data.sort((a,b)=>b.seats-a.seats);
$("#count").textContent=data.length;
$("#results").innerHTML=data.map((x,i)=>`
<article class="card">
 <div class="operator"><div class="op-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 17V7.5A2.5 2.5 0 0 1 8.5 5h7A2.5 2.5 0 0 1 18 7.5V17M6 10h12M8 19h.01M16 19h.01M7 17v2m10-2v2"/></svg></div><div class="op-copy"><strong>${esc(x.op)}</strong><small>${esc(x.type)} · ${esc(x.num)}</small><div class="badges"><span>${esc(x.tag)}</span>${x.amen.slice(0,2).map(a=>`<span>${esc(a)}</span>`).join("")}</div></div></div>
 <div><div class="timeline-row"><div class="time"><strong>${fmt(x.dep)}</strong><small>${esc(sessionStorage.getItem("searchFrom")||"Boarding")}</small></div><div class="line"><i></i><b>→</b><i></i></div><div class="time"><strong>${fmt(x.arr)}</strong><small>${esc(sessionStorage.getItem("searchTo")||"Destination")}</small></div></div><div class="duration">${dur(x.dep,x.arr)} journey</div></div>
 <div class="meta"><div><small>SEATS</small><strong class="available">${x.seats} available</strong></div><div><small>FARE / PASSENGER</small><strong class="fare">₹${x.fare.toLocaleString("en-IN")}</strong></div></div>
 <button class="choose" data-i="${i}">View seats&nbsp; →</button>
</article>`).join("");
$$(".choose").forEach(b=>b.onclick=()=>{
 const x=data[+b.dataset.i];
 try{
  sessionStorage.setItem("selectedBus",JSON.stringify({id:x.id,name:x.op,number:x.num,service:x.num,type:x.type,fare:x.fare,seats:x.seats,route:x.route,fromStopId:x.fromStopId,toStopId:x.toStopId}));
  sessionStorage.setItem("seatSelectionMode","normal");
 }catch(e){}
 const u=new URL("../seat-selection/seat-selection.html",location.href);u.searchParams.set("embedded","1");
 parent.postMessage({type:"navigateFrame",url:u.href,title:"Seat Selection"},"*");
});
}
window.addEventListener("message",e=>{if(e.data?.type==="theme")root.dataset.theme=e.data.theme});$("#sort").onchange=render;loadBuses();
})();