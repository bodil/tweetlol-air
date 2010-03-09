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
        if (replyingTo && len == 0) replyingTo = null;
    }
    
    function getInputCount() {
        var tweet = $("#tweetbox").val();
        // tweet = gsub(tweet, urlRe, function(match) { return shortenUrl(match[0]) });
        return tweet.length;
    }
    
    function updateLayout() {
        var height = document.documentElement.clientHeight;
        height -= $("ul.tabbar").outerHeight();
        height -= $("div.toolbar").outerHeight();
        $("div.view").height(height);
    }
    
    function updateTabs() {
        // var old = activeTab;
        $("ul.tabbar li").each(function() {
            var view = $("#" + $(this).attr("id") + "View");
            if ($(this).hasClass("active")) {
                // activeTab = $(this).attr("id");
                $(view).show();
            }
            else $(view).hide();
        });
        /*
        if (old != activeTab) {
            var last = lastUpdate[activeTab];
            var now = new Date().getTime();
            last += 60000 * Tweetlol.prefs.getIntPref("refreshInterval");
            if (last < now) refreshTweets();
        }
        */
    }

})();

