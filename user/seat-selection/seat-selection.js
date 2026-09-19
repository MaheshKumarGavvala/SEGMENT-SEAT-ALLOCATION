(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);

  const savedTheme = (() => { try { return localStorage.getItem("smartSegmentTheme"); } catch { return null; }})();
  document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";

  const themeToggle = $("#themeToggle");
  function syncThemeToggle() {
    const dark = document.documentElement.dataset.theme === "dark";
    themeToggle.setAttribute("aria-checked", String(dark));
    themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    themeToggle.title = dark ? "Switch to light theme" : "Switch to dark theme";
  }
  syncThemeToggle();
  themeToggle.addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme === "dark";
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("smartSegmentTheme", next); } catch {}
    syncThemeToggle();
  });

  function getData() {
    const d = {from:params.get("from"),to:params.get("to"),date:params.get("date"),bus:params.get("bus"),type:params.get("type"),fare:params.get("fare"),service:params.get("service")};
    try {
      d.from ||= sessionStorage.getItem("searchFrom");
      d.to ||= sessionStorage.getItem("searchTo");
      d.date ||= sessionStorage.getItem("travelDate");
      const bus = JSON.parse(sessionStorage.getItem("selectedBus") || "null");
      if (bus) {
        d.bus ||= bus.name || bus.operator;
        d.type ||= bus.type;
        d.fare ||= bus.fare;
        d.service ||= bus.number || bus.id;
      }
    } catch {}
    return d;
  }

  const d = getData();
  const from = d.from || "—";
  const to = d.to || "—";
  const fare = Number(d.fare) || 680;

  $("#fromStop").textContent = from;
  $("#toStop").textContent = to;
  $("#busName").textContent = d.bus || "Selected bus";
  $("#busType").textContent = `${d.type || "Selected service"} · ${d.service || ""}`;
  $("#fare").textContent = `₹${fare.toLocaleString("en-IN")}`;
  $("#totalFare").textContent = `₹${fare.toLocaleString("en-IN")}`;
  if (d.date) {
    const dt = new Date(`${d.date}T00:00:00`);
    if (!Number.isNaN(dt.getTime())) $("#journeyDate").textContent = dt.toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"});
  }

  const occupied = new Set();
  const selected = {seat:null};
  const grid = $("#seatGrid");
  let totalSeats = 32;
  let availabilityReady = false;

  function seatType(n) {
    const pos = n % 4;
    if (pos === 1 || pos === 0) return pos === 1 ? "window-left" : "window-right";
    return "aisle";
  }
  function seatPosition(n) {
    const t = seatType(n);
    return t === "aisle" ? "Aisle" : "Window";
  }

  function seatHTML(n) {
    const occ = occupied.has(n);
    const type = seatType(n);
    const label = occ ? `Seat ${n}, occupied` : `Seat ${n}, ${seatPosition(n)}, available`;
    return `<button class="seat ${occ ? "occupied" : "available"} ${type}" ${occ ? "disabled" : ""} data-seat="${n}" aria-label="${label}" title="${label}">
      <span class="seat-card"><span class="seat-number">${n}</span></span>
    </button>`;
  }

  function buildGrid() {
    grid.innerHTML="";
    for (let row=0; row<Math.ceil(totalSeats/4); row++) {
      const nums=[row*4+1,row*4+2,row*4+3,row*4+4];
      nums.forEach((n,idx)=>{
        if(n>totalSeats)return;
        if(idx===2)grid.insertAdjacentHTML("beforeend", '<div class="aisle-gap" aria-hidden="true"></div>');
        grid.insertAdjacentHTML("beforeend", seatHTML(n));
      });
    }
  }
  buildGrid();

  function toast(msg) {
    const t=$("#toast");
    t.textContent=msg;
    t.classList.add("show");
    clearTimeout(window.__toast);
    window.__toast=setTimeout(()=>t.classList.remove("show"),1800);
  }

  function render() {
    $$(".seat.selected").forEach(x=>x.classList.remove("selected"));
    const n=selected.seat;
    $("#selectionBadge").textContent=n || "0";
    $("#selectedCount").textContent=n ? "1" : "0";
    $("#availableCount").textContent=totalSeats-occupied.size;
    $("#occupiedCount").textContent=occupied.size;
    $("#continueBtn").disabled=!n;
    $("#clearBtn").hidden=!n;
    $("#seatDetails").hidden=!n;
    // Segment seat selection is available only when no full-journey seat is selected.
    const segmentButton = $("#segmentLarge");
    segmentButton.disabled = Boolean(n);
    segmentButton.setAttribute("aria-disabled", String(Boolean(n)));

    if (!n) {
      $("#selectionTitle").textContent="No seat selected";
      $("#selectedPreview").innerHTML=`<div class="preview-empty"><div class="preview-seat-icon">+</div><strong>Choose a seat</strong><span>Your seat details will appear here</span></div>`;
      return;
    }

    const btn=$(`.seat[data-seat="${n}"]`);
    if(btn) btn.classList.add("selected");
    $("#selectionTitle").textContent=`Seat ${n} selected`;
    $("#detailSeat").textContent=n;
    $("#detailPosition").textContent=seatPosition(n);
    $("#selectedPreview").innerHTML=`<div class="selected-seat-card"><div class="seat-large"><div class="seat-number-large">${n}</div><div><strong>Full journey seat</strong><span>${from} → ${to}</span></div></div><div class="mini-confirm">✓ Available for your journey</div></div>`;
  }

  function selectSeat(n) {
    if (!availabilityReady) { toast("Seat availability is still loading."); return; }
    if (occupied.has(n)) return;
    if (selected.seat===n) {
      selected.seat=null;
      toast(`Seat ${n} deselected`);
    } else {
      const old=selected.seat;
      selected.seat=n;
      toast(old ? `Seat changed from ${old} to ${n}` : `Seat ${n} selected`);
    }
    render();
  }

  // Use event delegation because the seat grid is rebuilt after availability loads.
  // This keeps seat clicks working even after buildGrid() replaces the buttons.
  grid.addEventListener("click", e => {
    const btn = e.target.closest(".seat.available");
    if (!btn || btn.disabled) return;
    selectSeat(Number(btn.dataset.seat));
  });

  $$(".tool").forEach(tool => tool.addEventListener("click", () => {
    $$(".tool").forEach(x=>x.classList.remove("active"));
    tool.classList.add("active");
    const filter=tool.dataset.filter;
    $$(".seat").forEach(seat => {
      const match = filter === "all" || (filter === "window" && (seat.classList.contains("window-left") || seat.classList.contains("window-right"))) || (filter === "aisle" && seat.classList.contains("aisle"));
      seat.classList.toggle("dimmed", !match);
    });
  }));

  $("#clearBtn").addEventListener("click",()=>{selected.seat=null;render();toast("Seat selection cleared");});

  function go(path,title) {
    const u=new URL(path,location.href);
    u.searchParams.set("embedded","1");
    if(window.parent!==window) parent.postMessage({type:"navigateFrame",url:u.href,title},"*");
    else location.href=u.href;
  }

  function persist() {
    try {
      sessionStorage.setItem("selectedSeat", String(selected.seat));
      sessionStorage.setItem("selectedSeats", JSON.stringify([selected.seat]));
      sessionStorage.setItem("seatSelectionMode","full-journey");
      try { const bus=JSON.parse(sessionStorage.getItem("selectedBus")||"null"); if(bus?.fromStopId!=null) sessionStorage.setItem("normalFromStopId",String(bus.fromStopId)); if(bus?.toStopId!=null) sessionStorage.setItem("normalToStopId",String(bus.toStopId)); } catch {}
      sessionStorage.setItem("seatFare",String(fare));
      sessionStorage.setItem("selectedSeatPosition",seatPosition(selected.seat));
    } catch {}
  }

  $("#continueBtn").addEventListener("click",()=>{
    if(!selected.seat)return;
    persist();
    go("../passenger-details/passenger-details.html","Passenger Details");
  });
  $("#segmentLarge").addEventListener("click",()=>go("../segment-selection/seat-selection.html","Segment Seat Selection"));

  ["#brandLink","#homeLink"].forEach(sel=>$(sel).addEventListener("click",e=>{
    if(window.parent!==window.self){e.preventDefault();parent.postMessage({type:"closeFrame"},"*");}
  }));
  $("#accountBtn").addEventListener("click",()=>toast("Passenger profile"));

document.addEventListener("keydown", e => {
    if (e.key === "Escape" && selected.seat) { selected.seat=null; render(); toast("Selection cleared"); }
  });

  async function loadAvailability() {
    const b=(()=>{try{return JSON.parse(sessionStorage.getItem("selectedBus")||"null")}catch(e){return null}})();
    const fromId=b?.fromStopId, toId=b?.toStopId, routeId=b?.route?.id, date=sessionStorage.getItem("travelDate")||"";
    if(!b?.id || !routeId || !fromId || !toId){
      toast("Bus route information is missing. Return to Bus Search.");
      return;
    }
    try {
      const r=await SmartSegmentAPI.get(`/api/segments/availability?bus_id=${b.id}&route_id=${routeId}&from_stop_id=${fromId}&to_stop_id=${toId}&travel_date=${encodeURIComponent(date)}`);
      const info=r.data||{}; totalSeats=Number(info.bus?.total_seats||b.seats||32); occupied.clear();
      (info.seats||[]).forEach(x=>{if(x.status!=="available")occupied.add(Number(x.seat_number))});
      if(info.fare!=null){sessionStorage.setItem("seatFare",String(info.fare));$("#fare").textContent=`₹${Number(info.fare).toLocaleString("en-IN")}`;$("#totalFare").textContent=`₹${Number(info.fare).toLocaleString("en-IN")}`;}
      buildGrid(); availabilityReady=true; render();
    } catch(e) { toast(e.message||"Could not load seat availability."); }
  }
  try {
    const old=Number(sessionStorage.getItem("selectedSeat"));
    if(old) selected.seat=old;
  } catch {}
  render();
  loadAvailability();
})();