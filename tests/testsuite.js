/*
test("a test", function() {
    equals("hello kitty", "hello " + "kitty");
});
*/

var suite = new TestSuite("my test suite");
suite.addTests({
    "simple synchronous test": function(assert) {
        assert.ok(true);
    },
    
    "timer test": function(assert, finished, test) {
        test.numAssertionsExpected = 1;
        var timer = new air.Timer(100, 1);
        timer.addEventListener(air.TimerEvent.TIMER, function() {
            assert.ok(true);
            finished();
        });
        timer.start();
    }
});

suite.runTests(function() {
    air.NativeApplication.nativeApplication.dispatchEvent(new air.Event(air.Event.EXITING));
    air.NativeApplication.nativeApplication.exit(0);
});


