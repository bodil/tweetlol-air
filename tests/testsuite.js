var testSuites = {
    "test framework consistency tests": new TestSuite().addTests({
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
    }),

    "SQL store": new TestSuite().setup(function() {
        this.dbFile = air.File.createTempFile();
        this.db = new Tweetlol.Database(this.dbFile);
    }).teardown(function() {
        this.db.close();
        this.db = null;
        this.dbFile.deleteFile();
    }).addTests({
        "setup and perform basic query": function(assert, finished, test) {
            var transaction = new Tweetlol.Transaction(function(t) {
                var result = t.results[2];
                assert.ok(result);
                assert.ok(result.complete, "select statement completed");
                assert.equal(result.data.length, 1);
                assert.equal(result.data[0].foo, "bar");
                finished();
            }, function() {
                assert.ok(false, "transaction failed");
            });
            transaction.push("create table test (foo TEXT NOT NULL)");
            transaction.push("insert into test (foo) values (:foo)", { "foo": "bar" });
            transaction.push("select foo from test");
            test.db.pushTransaction(transaction);
        },
        "transaction failure": function(assert, finished, test) {
            var transaction = new Tweetlol.Transaction(function() {
                assert.ok(false, "transaction succeeded - was supposed to fail");
            }, function() {
                finished();
            });
            transaction.push("crash please");
            test.db.pushTransaction(transaction);
        }
    })
};

runSuites(testSuites, function(stats) {
    air.trace(stats.numSuites + " suites run, " + stats.numFailed + " failed.");
    if (stats.numFailed) {
        air.trace("\n*** TESTS FAILING!!!!!!!1\n");
    }
    air.NativeApplication.nativeApplication.dispatchEvent(new air.Event(air.Event.EXITING));
    air.NativeApplication.nativeApplication.exit(stats.numFailed);
});
