var Tweetlol = {

    log: air.trace,
    
    extend: function(destination, source) {
        destination = destination || {};
        if(source) {
            for(var property in source) {
                var value = source[property];
                if(value !== undefined) {
                    destination[property] = value;
                }
            }
    
            if(source.hasOwnProperty && source.hasOwnProperty('toString')) {
                destination.toString = source.toString;
            }
        }
        return destination;
    },
    
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
        air.NativeApplication.nativeApplication.addEventListener(air.Event.EXITING, Tweetlol.shutdown);
        
        // Read prefs
        if (Tweetlol.prefsFile.exists) {
            var prefsStream = new air.FileStream();
            prefsStream.open(Tweetlol.prefsFile, air.FileMode.READ);
            var newPrefs = prefsStream.readObject();
            Tweetlol.extend(Tweetlol.prefs, newPrefs);
            prefsStream.close();
        }
    },

    // Called when app is shutting down    
    shutdown: function() {
        // Store prefs
        var prefsStream = new air.FileStream();
        prefsStream.open(Tweetlol.prefsFile, air.FileMode.WRITE);
        prefsStream.writeObject(Tweetlol.prefs);
        prefsStream.close();
    }
};

