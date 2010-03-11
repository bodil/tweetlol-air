Tweetlol.Store = Class.extend({
    
    connection: null,
    queryQueue: [],
    runningQuery: null,
    connected: false,
    begun: false,
    notifyQueue: [],
    
    init: function(reference) {
        this.connection = new air.SQLConnection();
        this.connection.openAsync(reference, air.SQLMode.CREATE, new air.Responder($.proxy(this.onDatabaseReady,this), $.proxy(this.onDatabaseFailed, this)));
        Tweetlol.app.addEventListener(Tweetlol.Event.APP_EXIT, $.proxy(function() {
            this.connection.close();
            this.connected = false;
        }, this));
        this.createTables();
    },
    
    onDatabaseReady: function() {
        this.connected = true;
        this.dispatchQueries();
    },
    
    onDatabaseFailed: function() { air.trace("DATABASE FAILED TO OPEN!!!!!11"); /* FIXME: Error handling */ },
    
    pushQuery: function(sql, parameters, callback) {
        var statement = new air.SQLStatement();
        statement.sqlConnection = this.connection;
        statement.text = sql;
        if (parameters) {
            for (var parameter in parameters) {
                statement.parameters[":" + parameter] = parameters[parameter];
            }
        }
        this.queryQueue.push({ statement: statement, callback: callback });
        this.dispatchQueries();
    },
    
    dispatchQueries: function() {
        if (this.connected && this.queryQueue.length > 0 && this.runningQuery === null) {
            this.runningQuery = this.queryQueue.shift();
            air.trace("Running SQL statement: ", this.runningQuery.statement.text, " :: ", this.runningQuery.statement.parameters);
            this.runningQuery.statement.execute(-1, new air.Responder($.proxy(this.onQueryComplete, this), $.proxy(this.onQueryError, this)));
        }
    },
    
    onQueryComplete: function() {
        var query = this.runningQuery, result = this.runningQuery.statement.getResult();
        air.trace("SQL execution complete: ", result);
        if (query.callback) {
            query.callback(result);
        }
        this.runningQuery = null;
        this.dispatchQueries();
    },
    
    onQueryError: function() {
        if (this.runningQuery.callback) {
            this.runningQuery.callback(null);
        }
        this.runningQuery = null;
        this.dispatchQueries();
    },
    
    createTables: function() {
        this.pushQuery("create table if not exists users (id TEXT NOT NULL, service TEXT NOT NULL, name TEXT NOT NULL, " +
                        "screen_name TEXT, location TEXT, description TEXT, profile_image_url TEXT, url TEXT, protected BOOLEAN, " +
                        "followers_count INTEGER, friends_count INTEGER, created_at DATETIME, utc_offset INTEGER, time_zone TEXT, " +
                        "statuses_count INTEGER, geo_enabled BOOLEAN, verified BOOLEAN, following BOOLEAN)");
        this.pushQuery("create table if not exists posts (id TEXT NOT NULL, service TEXT, created_at DATETIME NOT NULL, " +
                        "text TEXT NOT NULL, source TEXT, truncated BOOLEAN, in_reply_to_status_id TEXT, in_reply_to_user_id TEXT, " +
                        "favorited BOOLEAN, in_reply_to_screen_name TEXT, retweeted_status TEXT, user TEXT NOT NULL, geo TEXT)");
        this.pushQuery("create unique index if not exists posts_id on posts (id, service)");
        this.pushQuery("create unique index if not exists users_id on users (id, service)");
        this.pushQuery("create unique index if not exists users_name on users (screen_name, service)");
        this.pushQuery("create index if not exists posts_date_desc on posts (created_at desc)");
    },
    
    insertPosts: function(posts) {
        for (var i = 0, l = posts.length; i < l; i++) {
            this.insertPost(posts[i], i === (l - 1));
        }
    },
    
    insertPost: function(post, notify) {
        var sql = "insert or ignore into posts (id, service, created_at, text, source, in_reply_to_status_id, in_reply_to_user_id, " +
                  "favorited, in_reply_to_screen_name, retweeted_status, user, geo) values (:id, :service, :created_at, :text, :source, " + 
                  ":in_reply_to_status_id, :in_reply_to_user_id, :favorited, :in_reply_to_screen_name, :retweeted_status, :user, :geo)";
        var params = {
            id: post.id,
            service: "bodiltest@twitter.com",
            created_at: Tweetlol.parseDate(post.created_at),
            text: post.text,
            source: post.source,
            in_reply_to_status_id: post.in_reply_to_status_id,
            in_reply_to_user_id: post.in_reply_to_user_id,
            favorited: post.favorited,
            in_reply_to_screen_name: post.in_reply_to_screen_name,
            retweeted_status: post.retweeted_status,
            user: post.user.id,
            geo: post.geo
        };
        this.pushQuery(sql, params);
    }
});

Tweetlol.app.addEventListener(Tweetlol.Event.APP_INIT, function() {
    Tweetlol.Store.store = new Tweetlol.Store(air.File.applicationStorageDirectory.resolvePath("store.db"));
    var f = new air.FileStream();
    f.open(air.File.applicationDirectory.resolvePath("fixture.json"), air.FileMode.READ);
    var data = jsonParse(f.readUTFBytes(f.bytesAvailable));
    f.close();
    Tweetlol.Store.store.insertPosts(data, "bodiltest@twitter.com");
});
