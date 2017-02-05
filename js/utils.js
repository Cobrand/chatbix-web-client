var AJAX = {
  get : function(url,response_fun,error_fun) {
    var request = new XMLHttpRequest();
    request.open('GET',url, true);
    request.onload = function() {
      try {
        request.responseJSON = JSON.parse(request.responseText) ;
      } catch (e) {
        request.responseJSON = {}
      }
      response_fun(request);
    };
    request.onerror = function(e) {
      request.responseJSON = JSON.parse(request.responseText) ;
      if (error_fun) {
        error_fun(e,request);
      }
    };
    request.send();
  },
  // parameters must be an object
  post : function(url,parameters,response_fun,error_fun) {
    var request = new XMLHttpRequest();
    request.open('POST',url, true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onload = function() {
      request.responseJSON = JSON.parse(request.responseText) ;
      response_fun(request);
    };
    request.onerror = function(e) {
      try {
        request.responseJSON = JSON.parse(request.responseText) ;
      } catch (e) {
        request.responseJSON = {}
      }
      if (error_fun) {
        error_fun(e,request);
      }
    };
    request.send(JSON.stringify(parameters));
  },
  urlparams_to_string:function(urlparams) {
    var string = "";
    for (var param in urlparams) {
      if (string == "") {
        string += "?"+param+"="+urlparams[param];
      } else {
        string += "&"+param+"="+urlparams[param];
      }
    }
    return string;
  },
}
