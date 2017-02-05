console.log("Chatbix has started");
var vue = new Vue({
    el: '#app',
    data: {
        focus: true,
        heartbeat_lock: false,
        messages:[],
        users_connected:[],
        current_channel:null,
        auth_key:null,
        messagebox:"",
        last_timestamp:null,
        username:localStorage.username || '',
        pub_username:localStorage.username || '',
        unread_message_count:0,
        color:localStorage.usercolor || '#222222',
        preferences:{
            notify_on_mention:true,
            auto_scroll:true,
        }
    },
    computed:{
        computed_users_connected:function(){
            return this.users_connected.map(function(u){
                u.active = (u.last_active == u.last_answer);
                return u;
            }).sort(function(a,b){
                return a.username > b.username;
            });
        }
    },
    methods: {
        load_messages:function(messages,override){
            if (messages.length !== 0) {
                if (this.last_timestamp == null) {
                    this.last_timestamp = messages[messages.length - 1].timestamp;
                } else {
                    this.last_timestamp = Math.max(messages[messages.length - 1].timestamp, override ? 0 : this.last_timestamp);
                }
            }
            messages = messages.map(function(m){
                var date = new Date(m.timestamp * 1000);
                var now = new Date(Date.now());
                var date_string = "";
                
                if (date.getDate() == now.getDate() &&
                    date.getMonth() == now.getMonth() &&
                    date.getFullYear() == now.getFullYear()) {
                    // it's today !
                } else {
                    date_string += 
                        (date.getDate() < 10 ? "0":"")+date.getDate()+"-"
                        +(date.getMonth() < 9 ? "0":"") +(date.getMonth()+1)
                        +"-"+date.getFullYear()+" ";
                };
                date_string +=
                    (date.getHours() < 10 ? "0":"") + date.getHours()+":"
                    +(date.getMinutes() < 10 ? "0":"") +date.getMinutes()+":"
                    +(date.getSeconds() < 10 ? "0":"") +date.getSeconds();
                m.human_date = date_string;
                return m;
            });
            if (this.messages.length === 0 || override) {
                this.messages = messages;
            } else {
                if (messages.length !== 0) {
                    this.unread_message_count += messages.length;
                    messages.forEach(function(m){
                        this.messages.push(m);
                    }.bind(this))
                }
            };
        },
        heartbeat:function(){
            if (!this.heartbeat_lock) {
                this.heartbeat_lock = true;
                var modifiers = {};
                if (this.focus == false) {
                    modifiers["active"] = "false";
                }
                if (this.username != "") {
                    modifiers["username"] = this.pub_username;
                }
                if (this.last_timestamp != null){
                    modifiers["timestamp"] = this.last_timestamp;
                }
                var heartbeat_url = "/api/heartbeat" + AJAX.urlparams_to_string(modifiers);
                AJAX.get(heartbeat_url,function(req){
                    this.heartbeat_lock = false;
                    this.load_messages(req.responseJSON.messages);
                    this.users_connected = req.responseJSON.users_connected;
                }.bind(this),
                function(e,req) {
                    this.heartbeat_lock = false;
                    console.log("Error in heartbeat:");
                    console.log(e);
                }.bind(this)
                );
            }
        },
        loop_heartbeat:function(){
            this.heartbeat();
            setTimeout(this.loop_heartbeat.bind(this),this.focus ? 750 : 5000)
        },
        startup:function(){
            this.loop_heartbeat();
            window.onblur = this.on_blur.bind(this);
            window.onfocus = this.on_focus.bind(this);
        },
        on_focus:function(){
            this.focus = true;
            this.heartbeat();
        },
        on_blur:function(){
            this.focus = false;
            this.heartbeat();
        },
        enter_key:function(e){
            if (!e.shiftKey) {
                e.preventDefault();
                this.send_message();
            }
        },
        send_message:function(){
            AJAX.post("/api/new_message",{
                username:this.username,
                content:this.messagebox,
                auth_key:this.auth_key,
                color:this.color,
                channel:this.current_channel,
            },function(req){
                if (req.status >= 400 && req.status < 500) {
                    this.spawn_error("Error when sending message: Received 4** status code:"+
                        req.responseJSON.error || req.responseText);
                } else if (req.status >= 500 && req.status < 600) {
                    this.spawn_error("Error when sending message: Received 5** status code:"+
                        req.responseJSON ? req.responseJSON.error : "is the server online ?");
                }
            }.bind(this),function(err,req){
                this.spawn_error("Error when sending message: unable to connect");
            }.bind(this));
            this.messagebox = "";
        },
        spawn_error:function(error_string){
            console.warn(error_string);
            this.messages.push({
                content:error_string
            });
        },
    },
    watch:{
        username: function(new_username) {
            localStorage.username = new_username;
            username_debouncer();
        },
        color: function(new_color) {
            localStorage.usercolor = new_color;
        },
    }
});

var username_debouncer = _.debounce(function(){
    this.pub_username = this.username;
}.bind(vue),1000,{leading:false,trailing:true});
vue.startup();

document.getElementById("chatbox").addEventListener("DOMNodeInserted", function(){
    if (vue.preferences.auto_scroll) {
        window.scrollTo(0,document.body.scrollHeight)
    }
    //scroll_debouncer();
});

// var scroll_debouncer = _.debounce(function(){
//    window.scrollTo(0,document.body.scrollHeight)
// }.bind(vue),10,{leading:false, trailing:true});
