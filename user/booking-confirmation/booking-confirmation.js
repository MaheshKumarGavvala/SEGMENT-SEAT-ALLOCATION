document.addEventListener("DOMContentLoaded", async () => {
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const list=document.getElementById("bookingList");
  const params=new URLSearchParams(location.search);
  const HIDDEN_KEY="smartSegmentRemovedBookingHistory";
  let allBookings=[];
  let activeFilter=params.get("filter")||"all";

  const toast=(msg,error=false)=>{
    if(typeof showToast==="function"){showToast(msg,error?"error":"success");return}
    const t=document.querySelector(".toast");
    if(t){t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
  };

  const getHidden=()=>{
    try{return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY)||"[]"))}catch(e){return new Set()}
  };
  const saveHidden=set=>{
    localStorage.setItem(HIDDEN_KEY,JSON.stringify([...set]));
  };

  async function fetchBookings(){
    const r=await SmartSegmentAPI.get("/api/bookings/mine");
    return Array.isArray(r.data)?r.data:[];
  }

  function visibleBookings(){
    const hidden=getHidden();
    return allBookings.filter(b=>!hidden.has(String(b.booking_code)));
  }

  function updateCounts(){
    const visible=visibleBookings();
    document.getElementById("totalCount").textContent=visible.length;
    document.getElementById("confirmedCount").textContent=visible.filter(b=>b.status==="confirmed").length;
    document.getElementById("cancelledCount").textContent=visible.filter(b=>b.status==="cancelled").length;
  }

  function passengerRows(b){
    const rows=(b.passengers||[]).map(p=>`
      <div class="detail-row">
        <span>Seat ${esc(p.seat_number)} · ${esc(p.from_stop?.name||b.from_stop?.name||"—")} → ${esc(p.to_stop?.name||b.to_stop?.name||"—")}</span>
        <strong>${esc(p.full_name||"—")}</strong>
      </div>`).join("");
    return rows||'<div class="detail-row"><span>Passenger</span><strong>—</strong></div>';
  }

  function ticketHtml(b){
    const cancelled=b.status==="cancelled";
    const p=b.passengers?.[0];
    const pay=b.payments?.[0];
    const status=cancelled?"Cancelled":"Confirmed";
    return `
      <article class="booking-ticket ${cancelled?"cancelled":""}" data-booking-id="${Number(b.id)||0}" data-code="${esc(b.booking_code)}" data-status="${cancelled?"cancelled":"confirmed"}">
        <button class="ticket-main" type="button" aria-expanded="false">
          <span class="ticket-top">
            <span class="ticket-code-wrap">
              <span class="ticket-code">${esc(b.booking_code)}</span>
              <span class="status-pill ${cancelled?"cancelled":"confirmed"}">${status}</span>
            </span>
            <strong>₹${Number(b.total_fare||0).toLocaleString("en-IN")}</strong>
          </span>
          <span class="ticket-route">
            <span><small>FROM</small><b>${esc(b.from_stop?.name||"—")}</b></span>
            <span class="route-track"><i></i><span></span><i class="fa-solid fa-bus"></i><span></span><i></i></span>
            <span><small>TO</small><b>${esc(b.to_stop?.name||"—")}</b></span>
          </span>
          <span class="ticket-summary">
            <span><i class="fa-regular fa-calendar"></i> ${esc(b.travel_date||"—")}</span>
            <span><i class="fa-solid fa-bus"></i> ${esc(b.bus?.name||"Bus")}</span>
            <span><i class="fa-solid fa-hashtag"></i> ${esc(b.bus?.service_number||"—")}</span>
            <span><i class="fa-solid fa-chair"></i> Seat ${esc(p?.seat_number||"—")}</span>
          </span>
        </button>

        <div class="ticket-details" hidden>
          <div class="detail-grid">
            <div><small>BUS / SERVICE</small><b>${esc(b.bus?.name||"—")}</b><span>${esc(b.bus?.number||"")} · ${esc(b.bus?.service_number||"")}</span></div>
            <div><small>BUS TYPE</small><b>${esc(b.bus?.type||"—")}</b></div>
            <div><small>BOARDING POINT</small><b>${esc(b.from_stop?.name||"—")}</b><span>${esc(b.bus?.departure||"—")}</span></div>
            <div><small>DESTINATION</small><b>${esc(b.to_stop?.name||"—")}</b><span>${esc(b.bus?.arrival||"—")}</span></div>
            <div><small>JOURNEY DATE</small><b>${esc(b.travel_date||"—")}</b></div>
            <div><small>TOTAL PRICE</small><b>₹${Number(b.total_fare||0).toLocaleString("en-IN")}</b></div>
            <div><small>PASSENGER</small><b>${esc(p?.full_name||"—")}</b><span>${esc(p?.gender||"")} · ${esc(p?.age||"")}</span></div>
            <div><small>PAYMENT</small><b>${esc(pay?.method||"—")}</b><span>${esc(pay?.status||"—")}</span></div>
          </div>
          <div class="segment-details"><small>SEAT / SEGMENTS</small>${passengerRows(b)}</div>
          <div class="detail-actions">
            <button class="btn" type="button" data-print-ticket><i class="fa-solid fa-print"></i> Print Ticket</button>
            <button class="btn" type="button" data-download-ticket><i class="fa-solid fa-download"></i> Download Ticket</button>
            <button class="btn" type="button" data-close>Close details</button>
            ${cancelled
              ?`<button class="btn remove-history" type="button" data-remove><i class="fa-solid fa-trash-can"></i> Remove from History</button>`
              :`<button class="btn danger" type="button" data-cancel><i class="fa-solid fa-ban"></i> Cancel Booking</button>`}
          </div>
        </div>
      </article>`;
  }

  function applyFilter(){
    document.querySelectorAll(".history-filter").forEach(btn=>{
      btn.classList.toggle("active",btn.dataset.filter===activeFilter);
    });

    const visible=visibleBookings();
    const filtered=activeFilter==="all"?visible:visible.filter(b=>b.status===activeFilter);

    if(!filtered.length){
      const label=activeFilter==="cancelled"?"No cancelled bookings":"No bookings in this section";
      list.innerHTML=`<div class="history-empty"><div class="empty-icon"><i class="fa-solid fa-ticket"></i></div><strong>${label}</strong><span>Bookings you keep in history will appear here.</span></div>`;
      return;
    }
    list.innerHTML=filtered.map(ticketHtml).join("");
    bindTickets();
  }

  function bookingText(b){
    const passengers=(b.passengers||[]).map(p=>
      `Seat ${p.seat_number||"—"}: ${p.from_stop?.name||b.from_stop?.name||"—"} → ${p.to_stop?.name||b.to_stop?.name||"—"} | ${p.full_name||"—"}`
    ).join("\n");
    return `SMART SEGMENT TICKET\n\nBooking: ${b.booking_code||"—"}\nStatus: ${b.status||"—"}\nBus: ${b.bus?.name||"—"}\nService Number: ${b.bus?.service_number||"—"}\nFrom: ${b.from_stop?.name||"—"}\nTo: ${b.to_stop?.name||"—"}\nTravel Date: ${b.travel_date||"—"}\nPrice: INR ${Number(b.total_fare||0)}\n\nPassenger / Seat\n${passengers||"—"}`;
  }

  function printSingleTicket(b, ticket){
    document.querySelectorAll(".booking-ticket.print-target").forEach(x=>x.classList.remove("print-target"));
    ticket.classList.add("print-target");
    const details=ticket.querySelector(".ticket-details");
    const wasHidden=details?.hidden;
    if(details) details.hidden=false;
    const restore=()=>{
      ticket.classList.remove("print-target");
      if(details) details.hidden=wasHidden;
      window.removeEventListener("afterprint",restore);
    };
    window.addEventListener("afterprint",restore);
    window.print();
    setTimeout(restore,1000);
  }

  function downloadSingleTicket(b){
    const blob=URL.createObjectURL(new Blob([bookingText(b)],{type:"text/plain;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=blob;
    a.download=`smart-segment-${String(b.booking_code||"ticket").replace(/[^a-z0-9_-]/gi,"_")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(blob),1000);
  }

  function bindTickets(){
    list.querySelectorAll(".ticket-main").forEach(btn=>btn.addEventListener("click",()=>{
      const details=btn.closest(".booking-ticket").querySelector(".ticket-details");
      const open=!details.hidden;
      details.hidden=open;
      btn.setAttribute("aria-expanded",String(!open));
    }));

    list.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>{
      const ticket=btn.closest(".booking-ticket");
      ticket.querySelector(".ticket-details").hidden=true;
      ticket.querySelector(".ticket-main").setAttribute("aria-expanded","false");
    }));

    list.querySelectorAll("[data-print-ticket]").forEach(btn=>btn.addEventListener("click",()=>{
      const ticket=btn.closest(".booking-ticket");
      const code=ticket?.dataset.code;
      const booking=allBookings.find(b=>String(b.booking_code)===String(code));
      if(booking&&ticket) printSingleTicket(booking,ticket);
    }));

    list.querySelectorAll("[data-download-ticket]").forEach(btn=>btn.addEventListener("click",()=>{
      const ticket=btn.closest(".booking-ticket");
      const code=ticket?.dataset.code;
      const booking=allBookings.find(b=>String(b.booking_code)===String(code));
      if(booking) downloadSingleTicket(booking);
    }));

    list.querySelectorAll("[data-cancel]").forEach(btn=>btn.addEventListener("click",async()=>{
      const ticket=btn.closest(".booking-ticket");
      const id=Number(ticket?.dataset.bookingId);
      if(!id)return;
      if(!confirm("Are you sure you want to cancel this booking?"))return;
      btn.disabled=true;
      btn.textContent="Cancelling…";
      try{
        await SmartSegmentAPI.patch(`/api/bookings/${id}/cancel`,{});
        toast("Booking cancelled successfully.");
        allBookings=await fetchBookings();
        updateCounts();
        applyFilter();
        window.parent?.postMessage({type:"bookingChanged"},"*");
      }catch(err){
        btn.disabled=false;
        btn.innerHTML='<i class="fa-solid fa-ban"></i> Cancel Booking';
        toast(err.message||"Could not cancel booking.","error");
      }
    }));

    list.querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>{
      const ticket=btn.closest(".booking-ticket");
      const code=ticket?.dataset.code;
      if(!code)return;
      const hidden=getHidden();
      hidden.add(String(code));
      saveHidden(hidden);
      updateCounts();
      applyFilter();
      toast("Cancelled ticket removed from history.");
      window.parent?.postMessage({type:"bookingChanged"},"*");
    }));
  }

  document.querySelectorAll(".history-filter").forEach(btn=>btn.addEventListener("click",()=>{
    activeFilter=btn.dataset.filter;
    applyFilter();
  }));

  const goHome=()=>window.parent!==window.self
    ?window.parent.postMessage({type:"closeFrame"},"*")
    :location.href="../dashboard/index.html";

  document.getElementById("goHome")?.addEventListener("click",goHome);
  document.getElementById("goHomeTop")?.addEventListener("click",goHome);
  try{
    allBookings=await fetchBookings();
    updateCounts();
    applyFilter();
    const wanted=params.get("booking");
    if(wanted){
      const ticket=list.querySelector(`[data-code="${CSS.escape(wanted)}"]`);
      ticket?.querySelector(".ticket-main")?.click();
    }
  }catch(err){
    list.innerHTML=`<div class="history-empty"><div class="empty-icon error"><i class="fa-solid fa-triangle-exclamation"></i></div><strong>Could not load bookings</strong><span>${esc(err.message)}</span></div>`;
  }
});