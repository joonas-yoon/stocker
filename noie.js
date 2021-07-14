function noie(string){
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");
    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)){
        alert(string || "This website does not support internet explorer");
    }
    return false;
}
