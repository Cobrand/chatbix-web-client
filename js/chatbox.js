console.log("Chatbix has started");
var vue = new Vue({
    el: '#app',
    data: {
        focus: true,
        heartbeat_lock: false,
        messages:[],
        last_timestamp:null,
        username:localStorage.username || '',
        unread_message_count:0,
        color:localStorage.usercolor || '#222222',
        preferences:{
            notify_on_mention:true,
            auto_scroll:true,
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
            if (this.messages.length === 0 || override) {
                this.messages = messages;
            } else {
                messages.forEach(function(m){
                    this.messages.push(m);
                }.bind(this))
            };
        },
        heartbeat:function(){
            if (!this.heartbeat_lock) {
                this.heartbeat_lock = true;
                var modifiers = {};
                if (this.username != "") {
                    modifiers["username"] = this.username;
                }
                if (this.last_timestamp != null){
                    modifiers["timestamp"] = this.last_timestamp;
                }
                var heartbeat_url = "/api/heartbeat" + AJAX.urlparams_to_string(modifiers);
                AJAX.get(heartbeat_url,function(req){
                    this.heartbeat_lock = false;
                    this.load_messages(req.responseJSON.messages);
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
            this.active = true
        },
        on_blur:function(){
            this.active = false;
        }
    },
    watch:{
        username: function(new_username) {
            localStorage.username = new_username;
        },
        color: function(new_color) {
            localStorage.usercolor = new_color;
        }
    }
});

vue.startup();
