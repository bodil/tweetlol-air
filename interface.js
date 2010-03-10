/**
 * Handler for prefs button click.
 */
Tweetlol.runPrefsDialog = function() {
    if (!Tweetlol.prefsDialog) {
        Tweetlol.prefsDialog = air.HTMLLoader.createRootWindow();
        Tweetlol.prefsDialog.load(new air.URLRequest("app:/settings.html"));
        Tweetlol.prefsDialog.window.nativeWindow.addEventListener(air.Event.CLOSING, function() {
            Tweetlol.prefsDialog = null;
        });
    } else {
        Tweetlol.prefsDialog.window.nativeWindow.activate();
    }
};

/**
 * Interface setup.
 */
(function() {
    Tweetlol.app.addEventListener(Tweetlol.Event.APP_INIT, function() {
        if (Tweetlol.prefs.windowState) {
            var state = Tweetlol.prefs.windowState;
            window.nativeWindow.bounds = new air.Rectangle(state.x, state.y, state.width, state.height);
            switch (window.nativeWindow.displayState) {
                case air.NativeWindowDisplayState.MINIMIZED:
                    window.nativeWindow.minimize();
                    break;
                case air.NativeWindowDisplayState.MAXIMIZED:
                    window.nativeWindow.maximize();
                    break;
            }
        }
        window.nativeWindow.activate();
        window.nativeWindow.addEventListener(air.NativeWindowDisplayStateEvent.DISPLAY_STATE_CHANGE, windowStateChanged);
        window.nativeWindow.addEventListener(air.NativeWindowBoundsEvent.MOVE, windowStateChanged);
        window.nativeWindow.addEventListener(air.NativeWindowBoundsEvent.RESIZE, windowStateChanged);
        
        $("#tabs").tabs();
        $("#tweetbox").keyup(tweetInput);
        $("#tweetbox").keydown(tweetInputVerify);
        updateLayout();
        $(window).resize(updateLayout);
    });
    
    function tweetInput(event) {
        if (event.keyCode == 13) {
            // postUpdate($(event.target).val());
            $(event.target).val("");
        }
        updateInputCount();
    }
    
    function tweetInputVerify(event) {
        if ((event.keyCode == 32 || event.keyCode > 40) && getInputCount() >= 140) {
            event.preventDefault();
        }
    }
    
    function updateInputCount() {
        var len = 140 - getInputCount();
        /*
        if (len < Tweetlol.prefs.getCharPref("username").length + 6)
            len = len.toString() + "!";
        */
        $("div.toolbar span.tweet").text(len);
        // if (replyingTo && len == 0) replyingTo = null;
    }
    
    function getInputCount() {
        var tweet = $("#tweetbox").val();
        // tweet = gsub(tweet, urlRe, function(match) { return shortenUrl(match[0]) });
        return tweet.length;
    }
    
    function windowStateChanged() {
        var w = window.nativeWindow;
        Tweetlol.prefs.windowState = { x: w.x, y: w.y, width: w.width, height: w.height, displayState: w.displayState };
        updateLayout();
    }
    
    function updateLayout() {
        var height = document.documentElement.clientHeight;
        height -= $("ul.tabbar").outerHeight();
        height -= $("div.toolbar").outerHeight();
        $("div.view").height(height - 24);
    }
    
})();

