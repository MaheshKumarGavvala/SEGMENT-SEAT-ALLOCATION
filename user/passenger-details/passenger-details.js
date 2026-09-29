document.addEventListener("DOMContentLoaded",()=>{
 const bus=(()=>{try{return JSON.parse(sessionStorage.getItem("selectedBus")||"null")}catch(e){return null}})();
 const normalSeat=sessionStorage.getItem("selectedSeat");
 const segments=(()=>{try{return Object.values(JSON.parse(sessionStorage.getItem("smartSegmentSelectedSegmentSeats")||"{}"))}catch(e){return []}})();

 const inputs=[...document.querySelectorAll(".form-grid input, .form-grid select")];
 const [name,age,gender,mobile,email,idProof,idProofNumber]=inputs;
 const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

 // Restore any unfinished passenger form when returning to this page.
 try{
   const draft=JSON.parse(sessionStorage.getItem("passengerDetailsDraft")||"null");
   if(draft){
     if(name)name.value=draft.full_name||"";
     if(age)age.value=draft.age||"";
     if(gender)gender.value=draft.gender||"";
     if(mobile)mobile.value=String(draft.mobile||"").replace(/\D/g,"").slice(0,10);
     if(email)email.value=draft.email||"";
     if(idProof)idProof.value=draft.id_proof_type||"";
     if(idProofNumber)idProofNumber.value=draft.id_proof_number||"";
   }
 }catch(e){}

 name?.addEventListener("input",()=>name.value=name.value.toUpperCase());
 idProofNumber?.addEventListener("input",()=>idProofNumber.value=idProofNumber.value.toUpperCase());
 mobile?.addEventListener("input",()=>{mobile.value=mobile.value.replace(/\D/g,"").slice(0,10);});

 const savePassengerDraft=()=>{
   try{
     sessionStorage.setItem("passengerDetailsDraft",JSON.stringify({
       full_name:name?.value?.trim().toUpperCase()||"",
       age:age?.value?Number(age.value):"",
       gender:gender?.value?.toUpperCase()||"",
       mobile:mobile?.value?.replace(/\D/g,"")||"",
       email:email?.value?.trim().toLowerCase()||"",
       id_proof_type:idProof?.value?.toUpperCase()||"",
       id_proof_number:idProofNumber?.value?.trim().toUpperCase()||""
     }));
   }catch(e){}
 };
 [name,age,gender,mobile,email,idProof,idProofNumber].forEach(el=>el?.addEventListener("input",savePassengerDraft));
 [gender,idProof].forEach(el=>el?.addEventListener("change",savePassengerDraft));

 const selectedRows=segments.length
   ?segments
   :(normalSeat?[{seat:normalSeat,from:"Full journey",to:"Complete route"}]:[]);

 // Current UI intentionally has no seat icon/badge and no "Passenger 1" label.
 const summary=document.querySelector(".journey-summary .empty");
 if(summary){
   summary.innerHTML=selectedRows.length
     ?`<i class="fa-solid fa-route"></i>
        <strong>${esc(bus?.name||"Selected bus")}</strong>
        <span>${selectedRows.map(x=>segments.length
          ?`<b>Segment Selection</b><br>${esc(x.from)} → ${esc(x.to)} · Seat ${esc(x.seat)}`
          :`Seat ${esc(x.seat)} · Full journey`).join("<br><br>")}</span>`
     :`<i class="fa-solid fa-triangle-exclamation"></i>
        <strong>Select your seat first</strong>
        <span>Return to seat selection and choose at least one seat.</span>`;
 }

 const back=document.querySelector('a[href*="seat-selection.html"]');
 back?.addEventListener("click",e=>{
   e.preventDefault();
   const u=new URL(segments.length
     ?"../segment-selection/seat-selection.html"
     :"../seat-selection/seat-selection.html",location.href);
   u.searchParams.set("embedded","1");
   if(window.parent!==window.self)
     parent.postMessage({type:"navigateFrame",url:u.href,title:segments.length?"Segment Selection":"Seat Selection"},"*");
   else location.href=u.href;
 });

 const next=document.querySelector('a[href*="payment.html"]');
 next?.addEventListener("click",e=>{
   e.preventDefault();
   if(!selectedRows.length){showToast("Select a seat before continuing.");return}
   if(!name?.value.trim()||!age?.value||!gender?.value||!mobile?.value.trim()||!idProof?.value||!idProofNumber?.value.trim()){
     showToast("Please complete all required passenger details.");return;
   }
   const phone=mobile.value.replace(/\D/g,"");
   if(phone.length!==10){showToast("Enter a valid 10-digit mobile number.");mobile.focus();return}

   const passengerData={
     full_name:name.value.trim().toUpperCase(),
     age:Number(age.value),
     gender:gender.value.toUpperCase(),
     mobile:phone,
     email:email.value.trim().toLowerCase(),
     id_proof_type:idProof.value.toUpperCase(),
     id_proof_number:idProofNumber.value.trim().toUpperCase()
   };
   sessionStorage.setItem("passengerDetails",JSON.stringify(passengerData));
   sessionStorage.setItem("passengerDetailsDraft",JSON.stringify(passengerData));

   const u=new URL("../payment/payment.html",location.href);
   u.searchParams.set("embedded","1");
   if(window.parent!==window.self)
     parent.postMessage({type:"navigateFrame",url:u.href,title:"Payment"},"*");
   else location.href=u.href;
 });
});