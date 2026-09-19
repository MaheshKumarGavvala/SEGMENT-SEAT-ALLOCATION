document.addEventListener("DOMContentLoaded",()=>{
 const methods=[...document.querySelectorAll(".payment-method")];
 let method="UPI";methods.forEach(btn=>btn.addEventListener("click",()=>{methods.forEach(x=>x.classList.remove("active"));btn.classList.add("active");method=btn.querySelector("b")?.textContent||"UPI"}));
 const inputs=[...document.querySelectorAll(".otp input")];
 inputs.forEach((input,i)=>{input.addEventListener("input",()=>{input.value=input.value.replace(/\D/g,"").slice(0,1);if(input.value&&inputs[i+1])inputs[i+1].focus()});input.addEventListener("keydown",e=>{if(e.key==="Backspace"&&!input.value&&inputs[i-1])inputs[i-1].focus()})});
 const bus=(()=>{try{return JSON.parse(sessionStorage.getItem("selectedBus")||"null")}catch(e){return null}})();
 const readPassenger=()=>{
   try{
     const saved=JSON.parse(sessionStorage.getItem("passengerDetails")||"null")||{};
     const draft=JSON.parse(sessionStorage.getItem("passengerDetailsDraft")||"null")||{};
     // Prefer the latest draft values, but retain any completed values from the saved record.
     const p={...saved,...draft};
     return {
       full_name:String(p.full_name||p.fullName||"").trim().toUpperCase(),
       age:p.age===""||p.age==null?"":Number(p.age),
       gender:String(p.gender||"").trim().toUpperCase(),
       mobile:String(p.mobile||"").replace(/\D/g,""),
       email:String(p.email||"").trim().toLowerCase(),
       id_proof_type:String(p.id_proof_type||p.idProofType||"").trim().toUpperCase(),
       id_proof_number:String(p.id_proof_number||p.idProofNumber||"").trim().toUpperCase()
     };
   }catch(e){return null}
 };
 let passenger=readPassenger();
 const passengerIsValid=p=>!!(p&&p.full_name&&Number.isFinite(Number(p.age))&&Number(p.age)>=1&&Number(p.age)<=120&&p.gender&&/^\d{10}$/.test(String(p.mobile||""))&&p.id_proof_type&&p.id_proof_number);
 const segmentMap=(()=>{try{return JSON.parse(sessionStorage.getItem("smartSegmentSelectedSegmentSeats")||"{}")}catch(e){return {}}})();
 let segments=Object.values(segmentMap); const normalSeat=sessionStorage.getItem("selectedSeat"); const normalFromStopId=sessionStorage.getItem("normalFromStopId")||bus?.fromStopId; const normalToStopId=sessionStorage.getItem("normalToStopId")||bus?.toStopId; if(!segments.length&&normalSeat&&normalFromStopId&&normalToStopId) segments=[{key:"normal",seat:normalSeat,fare:Number(sessionStorage.getItem("seatFare")||0)||680,from:"Full journey",to:"Complete route",fromStopId:Number(normalFromStopId),toStopId:Number(normalToStopId)}];
 const holdTokens=segments.map(s=>{try{return JSON.parse(sessionStorage.getItem("smartSegmentHold:"+s.key)||"null")?.token||""}catch(_){return ""}});
 const summary=document.querySelector(".fare-summary"), total=segments.reduce((sum,x)=>sum+Number(x.fare||0),0);
 // Fetch exact segment fares so the amount shown and charged are identical.
 let fareReady=false;
 async function loadFare(){
   let amount=0;
   try{
     if(!segments.length) throw new Error("Booking information is incomplete.");
     for(const s of segments){
       if(typeof SmartSegmentAPI!=="undefined"&&bus?.id&&bus?.route?.id&&s.fromStopId!==undefined&&s.toStopId!==undefined){
         const r=await SmartSegmentAPI.get(`/api/segments/availability?bus_id=${bus.id}&route_id=${bus.route.id}&from_stop_id=${s.fromStopId}&to_stop_id=${s.toStopId}&travel_date=${encodeURIComponent(sessionStorage.getItem("travelDate")||"")}`);
         s.fare=Number(r.data.fare||s.fare||0);
       } else { s.fare=Number(s.fare||680); }
       amount+=s.fare;
     }
     sessionStorage.setItem("smartSegmentSelectedSegmentSeats",JSON.stringify(Object.fromEntries(segments.map(s=>[s.key,s]))));
     if(summary)summary.innerHTML=`<div><span>Journey fare</span><strong>₹${amount.toLocaleString("en-IN")}</strong></div><div><span>Taxes / Fees</span><strong>₹0</strong></div><div class="total"><span>Total</span><strong>₹${amount.toLocaleString("en-IN")}</strong></div>`;
     fareReady=true;
     document.getElementById("continuePayment").disabled=false;
   }catch(err){
     if(summary)summary.innerHTML=`<div class="empty compact"><i class="fa-solid fa-triangle-exclamation"></i><strong>Fare could not be loaded</strong><span>${err.message}</span></div>`;
     document.getElementById("continuePayment").disabled=true;
   }
 }
 document.getElementById("continuePayment").disabled=true;
 loadFare();
 const verification=document.getElementById("verification");
 document.getElementById("continuePayment").onclick=()=>{
   if(!fareReady||!segments.length){showToast("Booking information is incomplete or fare is not ready.");return}
   passenger=readPassenger();
   if(!passengerIsValid(passenger)){showToast("Complete passenger details are required before payment.");return}
   sessionStorage.setItem("passengerDetails",JSON.stringify(passenger));
   verification.hidden=false;document.body.classList.add("verification-open");inputs[0]?.focus()
 };
 document.getElementById("cancelVerify").onclick=()=>{verification.hidden=true;document.body.classList.remove("verification-open")};
 document.getElementById("verifyPay").onclick=async()=>{
   const code=inputs.map(x=>x.value).join("");
   if(code.length!==5){showToast("Enter all 5 digits.");return}
   const btn=document.getElementById("verifyPay");btn.disabled=true;btn.textContent="Processing…";
   try{
     passenger=readPassenger();
     if(!passengerIsValid(passenger))throw new Error("Complete passenger details are required before payment.");
     sessionStorage.setItem("passengerDetails",JSON.stringify(passenger));
     if(typeof SmartSegmentAPI!=="undefined"&&bus?.id&&bus?.route?.id){
       const r=await SmartSegmentAPI.post("/api/payments/checkout",{bus_id:bus.id,route_id:bus.route.id,travel_date:sessionStorage.getItem("travelDate"),method,passenger,hold_tokens:holdTokens,verification_code:code,segments:segments.map(s=>({from_stop_id:s.fromStopId,to_stop_id:s.toStopId,seat_number:s.seat,fare:Number(s.fare||0)}))});
       const result=r.data;
       sessionStorage.setItem("lastBookingResult",JSON.stringify(result));
       segments.forEach(s=>sessionStorage.removeItem("smartSegmentHold:"+s.key));
       sessionStorage.removeItem("smartSegmentSelectedSegmentSeats");
       sessionStorage.removeItem("selectedSeat");
       sessionStorage.removeItem("selectedSeats");
       sessionStorage.removeItem("normalFromStopId");
       sessionStorage.removeItem("normalToStopId");
       sessionStorage.removeItem("passengerDetails");
       if(window.parent!==window.self) parent.postMessage({type:"closeFrame",bookingSuccess:true},"*");
       else location.href=new URL("../dashboard/index.html",location.href).href;
     } else { throw new Error("Booking service is unavailable. Please return to Bus Search and try again."); }
   }catch(err){
     // A failed verification closes the PIN dialog. The user can click
     // Continue Payment again to retry with a fresh 5-digit code.
     showToast(err.message||"Payment verification failed.");
     verification.hidden=true;
     document.body.classList.remove("verification-open");
     inputs.forEach(x=>x.value="");
     btn.disabled=false;
     btn.textContent="Verify & Pay";
   }
 };
 const back=document.querySelector('a[href*="passenger-details.html"]');back?.addEventListener("click",e=>{if(window.top!==window.self&&window.smartSegmentFrameNavigate){e.preventDefault();window.smartSegmentFrameNavigate(new URL("../passenger-details/passenger-details.html",location.href).href)}});
});
