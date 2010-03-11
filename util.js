Tweetlol.parseDate = function(date) {
    air.trace(date);
    var m = date.match(/(.*) \(.*\)$/);
    air.trace("foo");
    if (m) date = m.group(1);
    air.trace(date);
    var d = Date.parse(date);
    air.trace(d);
    return d;
};
