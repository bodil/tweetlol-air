var testSuites = {
    "test framework consistency tests": new TestSuite().addTests({
        "simple synchronous test": function(assert) {
            assert.ok(true);
        },
        
        "timer test": function(assert, finished, test) {
            test.numAssertionsExpected = 1;
            var timer = new air.Timer(1, 1);
            timer.addEventListener(air.TimerEvent.TIMER, function() {
                assert.ok(true);
                finished();
            });
            timer.start();
        },
        
        "assert test": function(assert) {
            assert.ok(true);
            assert.equal(1, "1");
            assert.equal(1337, 1337);
            assert.notEqual(2+2, 5);
            assert.equal("foo", "foo");
            assert.notEqual([1,2,3], [1,2,3]);
            assert.deepEqual([1,2,3], [1,2,3]);
            assert.deepEqual({ foo: "blerk" }, { "foo": "blerk" });
            assert.ok(!window.assert._deepEqual({ foo: "blerk" }, { foo: "quux" }));
            assert.ok(!window.assert._deepEqual([1,2,3], [1,2,5]));
        },
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
    }),
    
    "Twitter db store": new TestSuite().setup(function() {
        this.dbFile = air.File.createTempFile();
        this.db = new Tweetlol.Store(this.dbFile);
        var f = new air.FileStream();
        f.open(air.File.applicationDirectory.resolvePath("tests/fixture.json"), air.FileMode.READ);
        this.fixture = JSON.parse(f.readUTFBytes(f.bytesAvailable));
        f.close();
    }).teardown(function() {
        this.db.close();
        this.db = null;
        this.dbFile.deleteFile();
    }).addTests({
        "insert a stream of tweets": function(assert, finished, test) {
            test.numAssertionsExpected = 4;
            var expected = ["10326467059::test_service",
                            "10325637869::test_service",
                            "10325622017::test_service",
                            "10324719514::test_service",
                            "10324337764::test_service"];
            var eventHandler = function(event) {
                var result = JSON.parse(event.data);
                assert.ok(result);
                assert.deepEqual(expected, result)
                Tweetlol.app.removeEventListener(Tweetlol.Event.TWEETS_AVAILABLE, eventHandler);
                finished();
            };
            Tweetlol.app.addEventListener(Tweetlol.Event.TWEETS_AVAILABLE, eventHandler);
            test.db.insertPosts(test.fixture, "test_service", function(result) {
                assert.ok(result);
                assert.deepEqual(expected, result)
            });
        },
        "read a list of tweets from the store": function(assert, finished, test) {
            test.db.insertPosts(test.fixture, "test_service", function(result) {
                test.db.getPosts(["10326467059::test_service"], function(posts) {
                    assert.ok(posts);
                    assert.equal(posts.length, 1);
                    var post = posts[0];
                    assert.equal(post.id, "10326467059");
                    assert.equal(post.created_at.getTime(), Tweetlol.parseDate("Thu Mar 11 15:22:11 +0000 2010").getTime());
                    finished();
                });
            });
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
