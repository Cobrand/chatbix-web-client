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
      try {
        request.responseJSON = JSON.parse(request.responseText) ;
      } catch (e) {
        request.responseJSON = {}
      }
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
      try {
        request.responseJSON = JSON.parse(request.responseText) ;
      } catch (e) {
        request.responseJSON = {}
      }
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

function esc(string) {
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function notifyMe(title,body,url){
    var notif = new Notification(title,{body:body});
    notif.onclick = function(){
        window.focus();
    }
}

function grantNotificationRights() {
    if (!("Notification" in window)) {
        console.error("This browser does not support notifications");
    }
    else if (Notification.permission === "granted") {
        console.info("Right to notify user has been granted.");
    }
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function (permission) {
            if(!('permission' in Notification)) {
                Notification.permission = permission;
            }
            if (permission === "granted") {
                console.info("Right to notify user has been granted.");
            }
        });
    }
}

grantNotificationRights();

function human_delta(tb, te) {
    var delta = te - tb;
    if (delta < 10) {
        return "<10s";
    } else if (delta < 60) {
        return Math.floor(delta / 5) * 5 +"s";
    } else if (delta < 3600) {
        return Math.floor(delta / 60) + "m";
    } else {
        return Math.floor(delta / 3600) + "h";
    }
}
