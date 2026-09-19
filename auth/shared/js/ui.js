(function(){
  window.showToast=window.showToast||function(message){
    var el=document.querySelector(".toast");
    if(!el){el=document.createElement("div");el.className="toast";document.body.appendChild(el);}
    el.textContent=message; el.classList.add("show");
    clearTimeout(window.__smartToast); window.__smartToast=setTimeout(function(){el.classList.remove("show")},2200);
  };
})();
