Tweetlol.Transaction = Tweetlol.Class.extend({
    init: function(completeCallback, errorCallback) {
        this.completeCallback = completeCallback;
        this.errorCallback = errorCallback;

        this.statements = [];
        this.begun = false;
        this.rolledBack = false;
        this.complete = false;
        this.failed = false;
        this.statementIndex = null;
        this.transactionId = Tweetlol.Transaction.idCounter++;
        this.results = [];
    },
    
    beginTransaction: function(store) {
        this.store = store;
        air.trace("Beginning transaction ", this);
        this.store.connection.begin(null, new air.Responder($.proxy(this.onBeginComplete, this),
                                                            $.proxy(this.onFail, this)));
    },
    
    onFail: function() {
        this.failed = true;
        if (this.begun) {
            this.store.connection.rollback(new air.Responder($.proxy(this.onRollbackComplete, this),
                                                             $.proxy(this.fail, this)));
        } else {
            this.fail();
        }
    },
    
    onRollbackComplete: function() {
        air.trace("Transaction failed and rolled back ", this);
        this.rolledBack = true;
        this.fail();
    },
    
    fail: function() {
        if (this.store) this.store.onTransactionFailed(this);
        if (this.errorCallback) this.errorCallback(this);
    },
    
    onBeginComplete: function() {
        this.begun = true;
        this.doNextStatement();
    },
    
    onStatementComplete: function(result) {
        this.results.push(result);
        this.doNextStatement();
    },
    
    onCommitComplete: function() {
        this.complete = true;
        air.trace("Transaction committed ", this);
        this.store.onTransactionComplete(this);
        if (this.completeCallback) this.completeCallback(this);
    },
    
    doNextStatement: function() {
        if (this.statementIndex === null) {
            this.statementIndex = 0;
        } else {
            this.statementIndex++;
        }
        if (this.statementIndex >= this.statements.length) {
            // Statements all done, we can commit now.
            this.store.connection.commit(new air.Responder($.proxy(this.onCommitComplete, this),
                                                           $.proxy(this.onFail, this)));
        } else {
            // Run one statement.
            var statement = this.statements[this.statementIndex];
            statement.sqlConnection = this.store.connection;
            air.trace("Running SQL statement: ", statement.text, " :: ", JSON.stringify(statement.parameters));
            statement.execute(-1, new air.Responder($.proxy(this.onStatementComplete, this),
                                                    $.proxy(this.onFail, this)));
        }
    },
    
    push: function(sql, parameters) {
        var statement = new air.SQLStatement();
        statement.text = sql;
        if (parameters) {
            for (var parameter in parameters) {
                statement.parameters[":" + parameter] = parameters[parameter];
            }
        }
        this.statements.push(statement);
        return this;
    },
    
    toString: function() {
        return "<" + this.CLASS_NAME + " #" + this.transactionId + ">";
    },
    
    CLASS_NAME: "Tweetlol.Transaction"
});
Tweetlol.Transaction.idCounter = 1;

Tweetlol.Database = Tweetlol.Class.extend({
    
    connection: null,
    connected: false,
    transactionQueue: [],
    runningTransaction: null,
    
    init: function(reference) {
        this.connection = new air.SQLConnection();
        this.connection.openAsync(reference, air.SQLMode.CREATE, new air.Responder($.proxy(this.onDatabaseReady,this), $.proxy(this.onDatabaseFailed, this)));
        Tweetlol.app.addEventListener(Tweetlol.Event.APP_EXIT, $.proxy(this.close, this));
    },
    
    close: function() {
        this.connection.close();
        this.connected = false;
    },
    
    onDatabaseReady: function() {
        this.connected = true;
        this.dispatch();
    },
    
    onDatabaseFailed: function() { air.trace("DATABASE FAILED TO OPEN!!!!!11"); /* FIXME: Error handling */ },
    
    pushTransaction: function(transaction) {
        this.transactionQueue.push(transaction);
        this.dispatch();
    },
    
    dispatch: function() {
        if (this.connected && this.transactionQueue.length > 0 && this.runningTransaction === null) {
            this.runningTransaction = this.transactionQueue.shift();
            this.runningTransaction.beginTransaction(this);
        }
    },
    
    onTransactionComplete: function(transaction) {
        this.runningTransaction = null;
        this.dispatch();
    },
    
    onTransactionFailed: function(transaction) {
        this.runningTransaction = null;
        this.dispatch();
    },
    
    CLASS_NAME: "Tweetlol.Database"
});

Tweetlol.Store = Tweetlol.Database.extend({
    init: function(reference) {
        this._super.apply(this, arguments);
        this.createTables();
    },
    
    createTables: function() {
        var creator = new Tweetlol.Transaction();
        creator.push("create table if not exists users (id TEXT NOT NULL, service TEXT NOT NULL, name TEXT NOT NULL, " +
                     "screen_name TEXT, location TEXT, description TEXT, profile_image_url TEXT, url TEXT, protected BOOLEAN, " +
                     "followers_count INTEGER, friends_count INTEGER, created_at DATETIME, utc_offset INTEGER, time_zone TEXT, " +
                     "statuses_count INTEGER, geo_enabled BOOLEAN, verified BOOLEAN, following BOOLEAN)");
        creator.push("create table if not exists posts (id TEXT NOT NULL, service TEXT, created_at DATETIME NOT NULL, " +
                     "text TEXT NOT NULL, source TEXT, truncated BOOLEAN, in_reply_to_status_id TEXT, in_reply_to_user_id TEXT, " +
                     "favorited BOOLEAN, in_reply_to_screen_name TEXT, retweeted_status TEXT, user TEXT NOT NULL, geo TEXT)");
        creator.push("create unique index if not exists posts_id on posts (id, service)");
        creator.push("create unique index if not exists users_id on users (id, service)");
        creator.push("create unique index if not exists users_name on users (screen_name, service)");
        creator.push("create index if not exists posts_date_desc on posts (created_at desc)");
        this.pushTransaction(creator);
    },
    
    insertPosts: function(posts) {
        var insert = new Tweetlol.Transaction();
        $.each(posts, function(index, post) {
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
            insert.push(sql, params);
        });
        this.pushTransaction(insert);
    },
    
    CLASS_NAME: "Tweetlol.Store"
});

Tweetlol.app.addEventListener(Tweetlol.Event.APP_INIT, function() {
    Tweetlol.Store.store = new Tweetlol.Store(air.File.applicationStorageDirectory.resolvePath("store.db"));
    var f = new air.FileStream();
    f.open(air.File.applicationDirectory.resolvePath("fixture.json"), air.FileMode.READ);
    var data = json_parse(f.readUTFBytes(f.bytesAvailable));
    f.close();
    Tweetlol.Store.store.insertPosts(data, "bodiltest@twitter.com");
});
