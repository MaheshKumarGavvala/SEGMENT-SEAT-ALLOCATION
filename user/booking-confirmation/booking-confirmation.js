document.addEventListener("DOMContentLoaded", async () => {
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#039;"}[m]));
  const card=document.querySelector(".card.section"), params=new URLSearchParams(location.search);
  const toast=(msg,error=false)=>{if(typeof showToast==='function'){showToast(msg,error?'error':'success');return}alert(msg)};
  let result=null;
  try{result=JSON.parse(sessionStorage.getItem("lastBookingResult")||"null")}catch(_){ }

  async function fetchBookings(){
    if(typeof SmartSegmentAPI==='undefined')throw new Error('Booking service is unavailable.');
    const r=await SmartSegmentAPI.get("/api/bookings/mine");
    return Array.isArray(r.data)?r.data:[];
  }

  function passengerLines(b){
    return (b.passengers||[]).map(p=>`<div class="detail-row"><span>Seat ${esc(p.seat_number)}</span><strong>${esc(p.full_name||'—')}</strong></div>`).join('') || '<div class="detail-row"><span>Passenger</span><strong>—</strong></div>';
  }

  function ticketHtml(b){
    const p=b.passengers?.[0], pay=b.payments?.[0], cancelled=b.status==='cancelled';
    const status=cancelled?'Cancelled':'Confirmed';
    return `<article class="booking-ticket ${cancelled?'cancelled':''}" data-booking-id="${Number(b.id)||0}">
      <button class="ticket-main" type="button" aria-expanded="false">
        <span class="ticket-top"><span><span class="ticket-code">${esc(b.booking_code)}</span><span class="status-pill ${cancelled?'cancelled':'active'}">${status}</span></span><strong>₹${Number(b.total_fare||0).toLocaleString('en-IN')}</strong></span>
        <span class="ticket-route"><span><small>FROM</small><b>${esc(b.from_stop?.name||'—')}</b></span><span class="route-track"><i></i><span></span><i class="fa-solid fa-bus"></i><span></span><i></i></span><span><small>TO</small><b>${esc(b.to_stop?.name||'—')}</b></span></span>
        <span class="ticket-summary"><span>${esc(b.bus?.name||'Bus')}</span><span>Service ${esc(b.bus?.service_number||'—')}</span><span>${esc(b.travel_date||'—')}</span><span>Seat ${esc(p?.seat_number||'—')}</span></span>
      </button>
      <div class="ticket-details" hidden>
        <div class="detail-grid">
          <div><small>BUS / SERVICE</small><b>${esc(b.bus?.name||'—')}</b><span>${esc(b.bus?.number||'')} · ${esc(b.bus?.service_number||'')}</span></div>
          <div><small>BUS TYPE</small><b>${esc(b.bus?.type||'—')}</b></div>
          <div><small>BOARDING POINT</small><b>${esc(b.from_stop?.name||'—')}</b><span>Departure ${esc(b.bus?.departure||'—')}</span></div>
          <div><small>DESTINATION</small><b>${esc(b.to_stop?.name||'—')}</b><span>Arrival ${esc(b.bus?.arrival||'—')}</span></div>
          <div><small>JOURNEY DATE</small><b>${esc(b.travel_date||'—')}</b></div>
          <div><small>TOTAL PRICE</small><b>₹${Number(b.total_fare||0).toLocaleString('en-IN')}</b></div>
          <div><small>PASSENGER</small><b>${esc(p?.full_name||'—')}</b><span>${esc(p?.gender||'')} · ${esc(p?.age||'')}</span></div>
          <div><small>PAYMENT</small><b>${esc(pay?.method||'—')}</b><span>${esc(pay?.status||'—')}</span></div>
        </div>
        <div class="segment-details"><small>SEAT / SEGMENTS</small>${passengerLines(b)}</div>
        <div class="detail-actions">
          <button class="btn" type="button" data-close>Close details</button>
          ${cancelled?'':'<button class="btn danger" type="button" data-cancel>Cancel Booking</button>'}
        </div>
      </div>
    </article>`;
  }

  async function render(bookings){
    const chosen=params.get('booking')?bookings.filter(b=>b.booking_code===params.get('booking')):bookings;
    if(!chosen.length){
      card.innerHTML=`<div class="empty"><i class="fa-solid fa-ticket"></i><strong>No bookings yet</strong><span>Complete a journey from the passenger booking flow to see your ticket here.</span></div>`;
      return;
    }
    card.innerHTML=`<div class="section-heading"><div><span class="section-label">MY BOOKINGS</span><h2 class="section-title">Your tickets</h2><p class="section-description">Click a ticket to view the complete journey details.</p></div></div>
      <div class="booking-list">${chosen.map(ticketHtml).join('')}</div>
      <div class="ticket-actions"><button class="btn" id="printTicket" type="button">Print ticket</button><button class="btn" id="downloadTicket" type="button">Download ticket</button><button class="btn primary" id="goHome" type="button">Go to Dashboard</button></div>`;

    card.querySelectorAll('.ticket-main').forEach(btn=>btn.addEventListener('click',()=>{
      const details=btn.parentElement.querySelector('.ticket-details');
      const open=!details.hidden; details.hidden=open; btn.setAttribute('aria-expanded',String(!open));
    }));
    card.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>{
      const details=btn.closest('.ticket-details'), main=btn.closest('.booking-ticket').querySelector('.ticket-main');
      details.hidden=true;main.setAttribute('aria-expanded','false');
    }));
    card.querySelectorAll('[data-cancel]').forEach(btn=>btn.addEventListener('click',async()=>{
      const ticket=btn.closest('.booking-ticket'),id=Number(ticket?.dataset.bookingId);if(!id)return;
      if(!confirm('Are you sure you want to cancel this booking?'))return;
      btn.disabled=true;btn.textContent='Cancelling…';
      try{
        const cancelResult=await SmartSegmentAPI.patch(`/api/bookings/${id}/cancel`,{});
        // A cancelled booking is no longer counted by /api/segments/availability,
        // so its seat/segments are immediately available to other users.
        // Clear only stale client-side booking selections; do not remove ticket history.
        sessionStorage.removeItem('selectedSeat');
        sessionStorage.removeItem('selectedSeats');
        sessionStorage.removeItem('smartSegmentSelectedSegmentSeats');
        sessionStorage.removeItem('holdTokens');
        window.dispatchEvent(new CustomEvent('smartSegmentBookingChanged',{detail:cancelResult?.data||{id,status:'cancelled'}}));
        toast('Booking cancelled successfully. The seat is now available again.');
        const fresh=await fetchBookings();
        await render(fresh);
      }catch(err){btn.disabled=false;btn.textContent='Cancel Booking';toast(err.message||'Could not cancel booking.','error')}
    }));
    card.querySelector('#printTicket')?.addEventListener('click',()=>window.print());
    card.querySelector('#downloadTicket')?.addEventListener('click',()=>{
      const text=chosen.map(b=>`SMART SEGMENT\nBooking: ${b.booking_code}\nStatus: ${b.status}\nBus: ${b.bus?.name||''}\nService Number: ${b.bus?.service_number||''}\nFrom: ${b.from_stop?.name||''}\nTo: ${b.to_stop?.name||''}\nBoarding Point: ${b.from_stop?.name||''}\nDestination Point: ${b.to_stop?.name||''}\nTravel Date: ${b.travel_date||''}\nSeat(s): ${(b.passengers||[]).map(p=>`${p.seat_number}`).join(', ')}\nPassenger: ${b.passengers?.[0]?.full_name||''}\nPrice: INR ${b.total_fare||0}`).join('\n\n');
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));a.download='smart-segment-ticket.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    });
    card.querySelector('#goHome')?.addEventListener('click',()=>parent.postMessage({type:'closeFrame'},'*'));
  }

  try{
    let bookings=[];
    if(result?.bookings?.length){
      // Use the fresh server list so My Bookings immediately reflects cancellation/status changes.
      bookings=await fetchBookings();
    }else bookings=await fetchBookings();
    await render(bookings);
  }catch(err){
    card.innerHTML=`<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i><strong>Could not load bookings</strong><span>${esc(err.message)}</span></div>`;
  }
});
