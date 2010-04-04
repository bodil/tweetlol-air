/*
 * This is basically http://github.com/bentomas/node-async-testing ported to AIR.
 * Assert functions are from Node.js.
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
    
    deepEqual: function deepEqual(actual, expected, message) {
        if (!assert._deepEqual(actual, expected)) {
            assert.fail(actual, expected, message, "deepEqual", assert.deepEqual);
        }
    },
    
    _deepEqual: function(actual, expected) {
        // 7.1. All identical values are equivalent, as determined by ===.
        if (actual === expected) {
            return true;
            
        // 7.2. If the expected value is a Date object, the actual value is
        // equivalent if it is also a Date object that refers to the same time.
        } else {
            if (actual instanceof Date && expected instanceof Date) {
                return actual.getTime() === expected.getTime();
                
            // 7.3. Other pairs that do not both pass typeof value == "object",
            // equivalence is determined by ==.
            } else {
                if (typeof actual != 'object' && typeof expected != 'object') {
                    return actual == expected;
                    
                // 7.4. For all other Object pairs, including Array objects, equivalence is
                // determined by having the same number of owned properties (as verified
                // with Object.prototype.hasOwnProperty.call), the same set of keys
                // (although not necessarily the same order), equivalent values for every
                // corresponding key, and an identical "prototype" property. Note: this
                // accounts for both named and indexed properties on Arrays.
                } else {
                    return assert.objEquiv(actual, expected);
                }
            }
        }
    },
    
    isUndefinedOrNull: function(value) {
        return value === null || value === undefined;
    },
    
    isArguments: function(object) {
        return Object.prototype.toString.call(object) == '[object Arguments]';
    },
    
    objectKeys: function(o) {
        var l = [];
        for (k in o) l.push(k);
        return l;
    },
    
    objEquiv: function(a, b) {
        if (assert.isUndefinedOrNull(a) || assert.isUndefinedOrNull(b)) 
            return false;
        // an identical "prototype" property.
        if (a.prototype !== b.prototype) 
            return false;
        //~~~I've managed to break Object.keys through screwy arguments passing.
        //   Converting to array solves the problem.
        if (assert.isArguments(a)) {
            if (!assert.isArguments(b)) {
                return false;
            }
            a = Array.prototype.slice.call(a);
            b = Array.prototype.slice.call(b);
            return assert._deepEqual(a, b);
        }
        try {
            var ka = assert.objectKeys(a), kb = assert.objectKeys(b), key, i;
        } catch (e) {//happens when one is a string literal and the other isn't
            return false;
        }
        // having the same number of owned properties (keys incorporates hasOwnProperty)
        if (ka.length != kb.length) 
            return false;
        //the same set of keys (although not necessarily the same order),
        ka.sort();
        kb.sort();
        //~~~cheap key test
        for (i = ka.length - 1; i >= 0; i--) {
            if (ka[i] != kb[i]) 
                return false;
        }
        //equivalent values for every corresponding key, and
        //~~~possibly expensive deep test
        for (i = ka.length - 1; i >= 0; i--) {
            key = ka[i];
            if (!assert._deepEqual(a[key], b[key])) 
                return false;
        }
        return true;
    },
    
    
    AssertionError: Class.extend({
        init: function(options) {
            this.name = "AssertionError";
            this.message = options.message;
            this.actual = options.actual;
            this.expected = options.expected;
            this.operator = options.operator;
            var stackStartFunction = options.stackStartFunction || assert.fail;
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
        
        if (this.__failure.stackTrace) {
            output += '  ' + this.__failure + '\n';
            this.__failure.stackTrace.forEach(function(line) {
                output += '    ' + line.sourceURL + ':' + line.line + ' ' + line.functionName + '\n';
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
                air.trace('----------------------------------\n');
            }
            stats.numSuites++;
            if (suite.numFailedTests > 0) {
                stats.numFailed++;
            }
            runNextSuite();
        });
    }
    
    air.trace("");
    runNextSuite();
};
