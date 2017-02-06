console.log("Chatbix has started");

var vue = new Vue({
    el: '#app',
    data: {
        original_title: window.document.title,
        title_state:0,
        loading_messages:true,
        focus: true,
        heartbeat_lock: false,
        heartbeat_enable: true,
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
            title_blink: localStorage.title_blink != null ? localStorage.title_blink == "true" : false,
            notify_on_mention: true,
            auto_scroll: true,
        },
        history_begin : "2016-07-01",
        history_end : "2016-07-31",
        channels: (function() {
            var channels = localStorage.channels ? JSON.parse(localStorage.channels) : [];
            return channels.map(function(c) {c.current = null; return c;});
        })(),
        channel_candidate: "",
    },
    computed:{
        computed_users_connected:function(){
            return this.users_connected.map(function(u){
                u.active = (u.last_active == u.last_answer);
                u.human_delta = human_delta(u.last_active, u.last_answer);
                return u;
            }).sort(function(a,b){
                return a.username > b.username;
            });
        },
    },
    methods: {
        channel_color:function(name) {
            var c;
            if (name == null) {
                return "#000000";
            }
            if ((c = this.channels.find(function(c){return c.name == name})) != null) {
                return c.color;
            } else {
                return "#000000";
            }
        },
        blink_title:function(){
            if (this.unread_message_count != 0) {
                if (this.title_state == 0) {
                    window.document.title = "("+this.unread_message_count+") New Message - "+ this.original_title;
                    this.title_state = 1;
                } else {
                    window.document.title = "("+this.unread_message_count+") "+ this.original_title;
                    this.title_state = 0;
                }
                setTimeout(this.blink_title.bind(this),1500);
            }
        },
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
                var content_tags = (m.tags >> 8) & 3;
                var html_content;
                m.channel_color = this.channel_color(m.channel);
                if (content_tags == 2) {
                    html_content = esc(m.content).replace(/\n/g,'<br>').replace(/\r/g,'');
                    html_content = "<pre>"+html_content+"</pre>";
                } else if (content_tags == 1) {
                    html_content = md_converter.makeHtml(m.content);
                } else {
                    html_content = esc(m.content)
                        .replace(/\r/g,'')
                        // replace links
                        .replace(/(^|\s)(?:(?:http(s?):\/\/)([\w\.\-]{3,}(?:\:\d{2,5})?(\/\S*)?))/g,"$1<a target='_blank' href='http$2://$3'>$3</a>")
                        // then replace image links
                        .replace(/img:((https?:\/\/)?\S*)(\s|$)/gi,"<a href='$1' target='_blank' rel='noopener noreferrer'><img class='img_chatbox' src='$1'/></a>")
                        .replace(/\n/g,'<br>');
                };
                m.HTMLcontent = html_content;
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
            }.bind(this));
            if (this.messages.length === 0 || override) {
                this.messages = messages;
                this.loading_messages = false;
            } else {
                if (messages.length !== 0) {
                    if (this.focus == false) {
                        var origin_unread_message_count = this.unread_message_count;
                        this.unread_message_count += messages.length;
                        if (this.preferences.title_blink && origin_unread_message_count == 0){
                            this.blink_title();
                        } else if (!this.preferences.title_blink) {
                            window.document.title = "("+this.unread_message_count+") "+this.original_title;
                        }
                    }
                    messages.forEach(function(m){
                        if (m.content.match(new RegExp("@"+this.username.trim(),"i"))){
                            notifyMe("Chatbix - "+m.author+" sent :",m.content);
                        }
                        this.messages.push(m);
                    }.bind(this))
                }
            };
        },
        heartbeat:function(){
            if (!this.heartbeat_lock && this.heartbeat_enable) {
                this.update_channels_cache();
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
                if (this.channels.length > 0) {
                    modifiers["channels"] = this.channels.map(function(c){return c.name}).join();
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
            this.unread_message_count = 0;
            window.document.title = this.original_title;
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
        update_channels_cache:function(){
            if (localStorage.channels != JSON.stringify(this.channels)) {
                localStorage.channels = JSON.stringify(this.channels);
            }
        },
        set_preference:function(prop,string){
            if (string == "false" || string == "0" || string == "FALSE") {
                this.preferences[prop] = false;
                localStorage[prop] = false;
            } else {
                this.preferences[prop] = true;
                localStorage[prop] = true;
            }
        },
        send_message:function(){
            if (this.messagebox.trim() != "" && this.username.trim() != "") {
                var tags = 0;
                var abort = false;
                var match;
                /// COMMANDS :
                if ((match = /^\/md\s/.exec(this.messagebox)) != null) {
                    this.messagebox = this.messagebox.substring(4);
                    tags |= (1 << 8);
                } else if ((match = /^\/code\s/.exec(this.messagebox)) != null) {
                    this.messagebox = this.messagebox.substring(6);
                    tags |= (1 << 9);
                } else if ((match = /^\/set\stitle_blink\s(\w+)/.exec(this.messagebox)) != null) {
                    this.set_preference("title_blink",match[1]);
                    abort = true;
                } else if ((match = /^\/set\sauto_scroll\s(\w+)/.exec(this.messagebox)) != null) {
                    this.set_preference("auto_scroll",match[1]);
                    abort = true;
                } else if ((match = /^\/help/.exec(this.messagebox)) != null) {
                    abort = true;
                    this.spawn_error("help:\n"+
                        "/help : display this message\n"+
                        "/code [message] : sends `message` as a code/monospace content\n"+
                        "/md [message] : sends `message` as a markdown content\n"+
                        "/set title_blink (true|false) : prevents the title from blinking\n"+
                        "/set auto_scroll (true|false) ");
                } else if ((match = /^\/(\w+)/.exec(this.messagebox)) != null) {
                    abort = true;
                    this.spawn_error("unknown command `"+match[1]+"`");
                };
                if (abort) {
                    this.messagebox = "";
                    return;
                }
                AJAX.post("/api/new_message",{
                    username:this.username,
                    content:this.messagebox,
                    auth_key:this.auth_key,
                    tags: tags,
                    color:this.color,
                    channel:this.current_channel != null ? this.channels[this.current_channel].name : null,
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
            }
        },
        spawn_error:function(error_string){
            console.warn(error_string);
            this.messages.push({
                content: error_string,
                HTMLcontent: esc(error_string).replace(/\n/g,'<br>').replace(/\r/g,''),
            });
        },
        history_go:function(){
            this.heartbeat_enable = false;
            this.loading_messages = true;
            var begin = new Date(this.history_begin).getTime() / 1000;
            var end = new Date(this.history_end).getTime() / 1000;
            AJAX.get("/api/get_messages?timestamp="+begin+"&timestamp_end="+end,
                function(req) {
                this.load_messages(req.responseJSON.messages, true);
            }.bind(this));
        },
        load_channel:function(channel,timestamp){
            var remote_url = "/api/get_messages?no_default_channel&channel="+channel;
            if (timestamp) {
                remote_url += "&timestamp="+timestamp;
            }
            AJAX.get(remote_url,function(req){
                this.load_messages(req.responseJSON.messages);
            }.bind(this),
            function(e,req) {
                this.spawn_error("Error when loading channel "+channel+" :"+e);
                console.log("Error when loading channel :");
                console.log(e);
            }.bind(this)
            );
        },
        add_channel:function(){
            if (this.channel_candidate != "") {
                if (this.channels.find(function(c) {
                    return c.name == this.channel_candidate
                }.bind(this)) == null) {
                    var channel = {
                        name:this.channel_candidate,
                        color:"#222222",
                    };
                    this.channels.push(channel);
                    this.load_channel(this.channel_candidate);
                    this.channel_candidate = "";
                }
            }
        },
        set_cur_channel:function(i){
            if (i >= 0 && i < this.channels.length || i == null) {
                if (this.current_channel != null) {
                    this.channels[this.current_channel].current = false;
                }
                this.current_channel = i;
                if (i != null) {
                    this.channels[this.current_channel].current = true;
                }
            }
        },
        del_channel:function(i){
            var channel_name = this.channels[i].name;
            this.messages = this.messages.filter(function(m){
                return m.channel != channel_name
            });
            if (this.current_channel == i) {
                this.current_channel = null;
            } else if (this.current_channel > i) {
                this.current_channel --;
            };
            this.channels.splice(i,1);
        }
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
        if (vue.loading_messages) {
            scroll_debouncer();
        } else {
            window.scrollTo(0,document.body.scrollHeight)
        }
    }
});

Vue.component('message-line',{
    props:['message'],
    template: '#line-template',
});

var scroll_debouncer = _.debounce(function(){
    window.scrollTo(0,document.body.scrollHeight)
}.bind(vue),10,{leading:false, trailing:true});

var md_converter = new showdown.Converter();
