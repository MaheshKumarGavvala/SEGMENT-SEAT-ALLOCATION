(function(){
  window.smartSegmentFrameNavigate=window.smartSegmentFrameNavigate||function(url,title){
    if(window.parent!==window){window.parent.postMessage({type:"navigateFrame",url:url,title:title||""},"*");}
    else window.location.href=url;
  };
})();
