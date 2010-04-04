Tweetlol.parseDate = function(date) {
    var d = Date.parse(date);
    // Parser stupidly ignores timezone, which is UTC, so subtract the offset.
    d.addMinutes(-d.getTimezoneOffset());
    return d;
};
