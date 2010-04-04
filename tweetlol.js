var Tweetlol = {
    
    Event: {
        APP_INIT: "tweetlol.app_init",
        APP_EXIT: "tweetlol.app_exit",
        TWEETS_AVAILABLE: "tweetlol.tweets_available"
    },
    
    app: air.NativeApplication.nativeApplication,

    log: air.trace,
    
    prefs: {
        accounts: [
            {
                type: "twitter",
                username: "test",
                password: "foobar"
            }
        ]
    },

    prefsFile: air.File.applicationStorageDirectory.resolvePath("settings"),

    /**
     * This is run on application load.
     */
    init: function() {
        // Setup for shutdown
        Tweetlol.app.addEventListener(air.Event.EXITING, Tweetlol.shutdown);
        
        // Read prefs
        if (Tweetlol.prefsFile.exists) {
            var prefsStream = new air.FileStream();
            prefsStream.open(Tweetlol.prefsFile, air.FileMode.READ);
            var newPrefs = prefsStream.readObject();
            $.extend(true, Tweetlol.prefs, newPrefs);
            prefsStream.close();
        }
        
        // Signal listeners that app is ready
        Tweetlol.app.dispatchEvent(new air.Event(Tweetlol.Event.APP_INIT));
    },

    /**
     * Called when app is shutting down.
     */
    shutdown: function() {
        Tweetlol.app.dispatchEvent(new air.Event(Tweetlol.Event.APP_EXIT));
        // Store prefs
        var prefsStream = new air.FileStream();
        prefsStream.open(Tweetlol.prefsFile, air.FileMode.WRITE);
        prefsStream.writeObject(Tweetlol.prefs);
        prefsStream.close();
    }
};

Tweetlol.Class = Class.extend({
    toString: function() {
        return "<" + this.CLASS_NAME + ">";
    },
    
    CLASS_NAME: "Tweetlol.Class"
});

