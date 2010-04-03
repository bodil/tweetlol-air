/*
 * This is basically http://github.com/bentomas/node-async-testing ported to AIR.
 */
var assert = {
    fail: function(actual, expected, message, operator, stackStartFunction) {
        throw new assert.AssertionError({
            message: message,
            actual: actual,
            expected: expected,
            operator: operator,
            stackStartFunction: stackStartFunction
        });
    },
    
    ok: function(value, message) {
        if (!!!value) 
            assert.fail(value, true, message, "==", assert.ok);
    },
    
    equal: function(actual, expected, message) {
        if (actual != expected) 
            assert.fail(actual, expected, message, "==", assert.equal);
    },
    
    notEqual: function(actual, expected, message) {
        if (actual == expected) {
            assert.fail(actual, expected, message, "!=", assert.notEqual);
        }
    },
    
    AssertionError: Class.extend({
        init: function(options) {
            this.name = "AssertionError";
            this.message = options.message;
            this.actual = options.actual;
            this.expected = options.expected;
            this.operator = options.operator;
            var stackStartFunction = options.stackStartFunction || assert.fail;
            
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, stackStartFunction);
            }
        },
        
        toString: function() {
            if (this.message) {
                return [this.name + ":", this.message].join(' ');
            } else {
                return [this.name + ":", JSON.stringify(this.expected), this.operator, JSON.stringify(this.actual)].join(" ");
            }
        }
    })
};

var AssertWrapper = function(test) {
    var test = this.__test = test;
    var assertion_functions = ['ok', 'equal', 'notEqual', 'deepEqual', 'notDeepEqual', 'strictEqual', 'notStrictEqual', 'throws', 'doesNotThrow'];
    
    assertion_functions.forEach(function(func_name) {
        this[func_name] = function() {
            try {
                assert[func_name].apply(null, arguments);
                test.__numAssertions++;
            } catch (err) {
                if (err instanceof assert.AssertionError) {
                    test.failed(err);
                }
            }
        }
    }, this);
};

var Test = Class.extend({
    init: function(name, func, suite) {
        this.assert = new AssertWrapper(this);
        this.numAssertionsExpected = null;
        
        this.__events = new air.EventDispatcher();
        
        this.__name = name;
        this.__phase = 'setup';
        this.__func = func;
        this.__suite = suite;
        this.__finishedCallback = null;
        this.__numAssertions = 0;
        this.__finished = false;
        this.__failure = null;
        this.__symbol = '.';
    },
    
    run: function() {
        var self = this;
        
        try {
            this.__phase = 'test';
            this.__func(this.assert, function() {
                self.finish();
            }, this);
        } catch (err) {
            if (this.__events.hasEventListener('uncaughtException')) {
                var event = new air.ErrorEvent('uncaughtException', false, false, err);
                this.__events.dispatchEvent(event);
            } else {
                this.failed(err);
            }
        }
        
        // they didn't ask for the finish function so assume it is synchronous
        if (this.__func.length < 2) {
            this.finish();
        }
    },
    
    finish: function() {
        if (!this.__finished) {
            this.__finished = true;
            
            if (this.__failure === null && this.numAssertionsExpected !== null) {
                try {
                    var message = this.numAssertionsExpected + (this.numAssertionsExpected == 1 ? ' assertion was ' : ' assertions were ') +
                    'expected but ' +
                    this.__numAssertions +
                    ' fired';
                    assert.equal(this.numAssertionsExpected, this.__numAssertions, message);
                } catch (err) {
                    this.__failure = err;
                    this.__symbol = 'F';
                }
            }
            
            if (this.__finishedCallback) {
                this.__finishedCallback(this.__numAssertions);
            }
        }
    },
    
    failureString: function() {
        var output = '';
        
        if (this.__symbol == 'F') {
            output += '  test "' + this.__name + '" failed: \n';
        } else {
            output += '  test "' + this.__name + '" threw an error';
            if (this.__phase !== 'test') {
                output += ' during ' + this.__phase;
            }
            output += ': \n';
        }
        
        if (this.__failure.stack) {
            this.__failure.stack.split("\n").forEach(function(line) {
                output += '  ' + line + '\n';
            });
            
        } else {
            output += '  ' + this.__failure;
        }
        
        return output;
    },
    
    failed: function(err) {
        this.__failure = err;
        if (err instanceof assert.AssertionError) {
            this.__symbol = 'F';
        } else {
            this.__symbol = 'E';
        }
        
        if (!this.__finished) {
            this.finish();
        }
    }
});

var TestSuite = Class.extend({
    init: function(name) {
        this.name = name;
        this.wait = true;
        this.tests = [];
        this.numAssertions = 0;
        this.numFinishedTests = 0;
        this.numFailedTests = 0;
        this.finished = false;
        this.callback = null;
        
        this._setup = null;
        this._teardown = null;
        
        var suite = this;
        air.NativeApplication.nativeApplication.addEventListener(air.Event.EXITING, function() {
            if (!suite.wait) {
                suite.finish();
            }
        });
        
        // I'm having trouble doing instance of tests to see if something
        // is a test suite, so i'll add a property nothing is likely to have
        this.nodeAsyncTesting = 42;
    },
    
    finish: function() {
        if (this.finished) {
            return;
        }
        
        this.finished = true;
        
        var failures = [];
        this.tests.forEach(function(t) {
            if (!t.__finished) {
                t.finish();
            }
            if (t.__failure !== null) {
                this.numFailedTests++;
                failures.push(t);
            }
        }, this);
        
        
        output = '\n';
        output += this.tests.length + ' test' + (this.tests.length == 1 ? '' : 's') + '; ';
        output += failures.length + ' failure' + (failures.length == 1 ? '' : 's') + '; ';
        output += this.numAssertions + ' assertion' + (this.numAssertions == 1 ? '' : 's') + ' ';
        air.trace(output);
        
        air.trace('');
        failures.forEach(function(t) {
            air.trace(t.failureString());
        });
        
        if (this.callback) {
            this.callback();
        }
    },
    
    setup: function(func) {
        this._setup = func;
        return this;
    },
    
    teardown: function(func) {
        this._teardown = func;
        return this;
    },
    
    waitForTests: function(yesOrNo) {
        if (typeof yesOrNo == 'undefined') {
            yesOrNo = true;
        }
        this.wait = yesOrNo;
        return this;
    },
    
    addTests: function(tests) {
        for (var testName in tests) {
            var t = new Test(testName, tests[testName], this);
            this.tests.push(t);
        };
        
        return this;
    },
    
    runTests: function(callback) {
        if (callback) {
            this.callback = callback;
        }
        air.trace('Running "' + this.name + '"');
        this.runTest(0);
    },
    
    runTest: function(testIndex) {
        if (testIndex >= this.tests.length) {
            return;
        }
        
        var t = this.tests[testIndex];
        t.__finishedCallback = finishedCallback;
        var suite = this;
        
        var wait = suite.wait;
        
        if (wait) {
            // if we are waiting then let's assume we are only running one test at 
            // a time, so we can catch all errors
            var errorListener = function(err) {
                if (t.__events.hasEventListener('uncaughtException')) {
                    t.__events.dispatchEvent(new air.ErrorEvent('uncaughtException', false, false, err));
                } else {
                    t.failed(err);
                }
            };
            air.NativeApplication.nativeApplication.addEventListener('uncaughtException', errorListener);
            
            var exitListener = function() {
                air.trace("\n\nOoops! The process exited in the middle of the test '" + t.__name + "'\nDid you forget to finish it?\n");
            };
            air.NativeApplication.nativeApplication.addEventListener(air.Event.EXITING, exitListener);
        } else {
            air.trace('  Starting test "' + this.__name + '"');
        }
        
        try {
            if (this._setup) {
                if (this._setup.length == 0) {
                    this._setup.call(t);
                    afterSetup();
                } else {
                    this._setup.call(t, afterSetup, t);
                }
            } else {
                afterSetup();
            }
        } catch (err) {
            t.failed(err);
        }
        
        function afterSetup() {
            t.run();
            
            if (!wait) {
                suite.runTest(testIndex + 1);
            }
        }
        
        function finishedCallback(numAssertions) {
            var teardownCallback = function() {
                suite.numAssertions += numAssertions;
                suite.numFinishedTests++;
                
                if (wait) {
                    air.trace("  " + t.__name + ": " + (t.__symbol === "." ? "OK" : "FAILED"));
                    air.NativeApplication.nativeApplication.removeEventListener('uncaughtException', errorListener);
                    air.NativeApplication.nativeApplication.removeEventListener(air.Event.EXITING, exitListener);
                    suite.runTest(testIndex + 1);
                }
                
                if (suite.numFinishedTests == suite.tests.length) {
                    suite.finish();
                }
            }
            
            try {
                if (suite._teardown) {
                    t.__phase = 'teardown';
                    if (suite._teardown.length == 0) {
                        suite._teardown.call(t);
                        teardownCallback();
                    } else {
                        suite._teardown.call(t, teardownCallback, t);
                    }
                } else {
                    teardownCallback();
                }
            } catch (err) {
                t.failed(err);
                teardownCallback();
            }
        }
    }
});

var runSuites = function(module, callback) {
    var suites = [];
    
    for (var suiteName in module) {
        var suite = module[suiteName];
        
        if (suite && suite.nodeAsyncTesting == 42) {
            suite.name = suiteName;
            suites.push(suite);
        }
    }
    
    var stats = {
        numSuites: 0,
        numFailed: 0
    };
    
    function runNextSuite() {
        if (suites.length < 1) {
            return callback ? callback(stats) : null;
        }
        var suite = suites.shift();
        suite.runTests(function() {
            if (suites.length > 0) {
                sys.error('----------------------------------\n');
            }
            stats.numSuites++;
            if (suite.numFailedTests > 0) {
                stats.numFailed++;
            }
            runNextSuite();
        });
    }
    
    sys.puts('');
    runNextSuite();
};
