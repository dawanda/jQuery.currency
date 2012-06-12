var helper = require("../../../test-helper");
var buster = require("buster");
buster.autoRun = require("buster-test").autoRun;
buster.testCase = require("buster-test").testCase;
buster.spec = require("buster-test").spec;
assert = buster.assert;
var run = helper.runTest;
var nodeRunner = helper.require("cli/runners/node-runner");
var stdioLogger = require("buster-stdio-logger");
var when = require("when");
var fs = require("fs");
var beforeRun = helper.require("cli/runners/before-run");

buster.testCase("Node runner", {
    setUp: function () {
        this.stub(buster, "autoRun");
        this.options = {};
        this.config = when.defer();
        this.analyzer = when.defer();
        this.group = buster.extend(buster.eventEmitter.create(), {
            resolve: this.stub().returns(this.config.promise),
            runExtensionHook: this.stub(),
            tmpFile: this.stub().returns("/file")
        });
        var loadPaths = this.loadPaths = [];
        this.resourceSet = {
            loadPath: {
                paths: function () { return loadPaths; }
            }
        };
        this.runner = Object.create(nodeRunner);
        this.stdout = "";
        this.stderr = "";
        var self = this;
        this.runner.logger = stdioLogger(
            { write: function (msg) { self.stdout += msg; } },
            { write: function (msg) { self.stderr += msg; } }
        );
        this.stub(fs, "writeFileSync");
        this.stub(process, "exit");
    },

    "resolves config": function () {
        this.runner.run(this.group, this.options);

        assert.calledOnce(this.group.resolve);
    },

    "does not autoRun until config is resolved": function () {
        this.runner.run(this.group, this.options);

        refute.called(buster.autoRun);
    },

    "exits if beforeRunHook fails": function () {
        this.group.runExtensionHook.throws();
        this.runner.run(this.group, this.options);

        assert.calledOnceWith(process.exit, 70);
    },

    "uses buster.autoRun to run tests": function () {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.resolve();
        this.config.resolver.resolve(this.resourceSet);

        this.runner.run(this.group, this.options);

        assert.calledOnce(buster.autoRun);
        assert.calledWith(buster.autoRun, this.options);
    },

    "fires testRun extension hook with test runner": function () {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.resolve();
        this.config.resolver.resolve(this.resourceSet);

        this.runner.run(this.group, this.options);
        buster.autoRun.yieldTo("start", { id: 42 });

        assert.calledOnceWith(this.group.runExtensionHook, "testRun", { id: 42 });
    },

    "registers listener for created test cases": function () {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.resolve();
        this.config.resolver.resolve(this.resourceSet);
        var runner = function () {};
        buster.autoRun.returns(runner);
        this.runner.run(this.group, this.options);

        assert.equals(buster.testCase.onCreate, runner);
        assert.equals(buster.spec.describe.onCreate, runner);
    },

    "calls done callback when complete": function () {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.resolve();
        this.config.resolver.resolve(this.resourceSet);
        var callback = this.spy();
        buster.autoRun.yieldsTo("end", { ok: true, tests: 42 });
        this.runner.run(this.group, {}, callback);

        assert.calledOnce(callback);
        assert.calledWith(callback, null, { ok: true, tests: 42 });
    },

    "requires absolute paths": function () {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.resolve();
        var promise = { then: this.stub() };
        this.group.resolve.returns(promise);
        this.resourceSet.rootPath = "/here";
        this.loadPaths.push("hey.js");
        this.runner.run(this.group, {});

        try {
            promise.then.yield(this.resourceSet);
            throw new Error("Didn't fail");
        } catch (e) {
            assert.match(this.stderr, "/here/hey.js");
        }
    },

    "calls callback with error if using relative paths": function () {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.resolve();
        var promise = { then: this.stub() };
        this.group.resolve.returns(promise);
        this.resourceSet.rootPath = "/here";
        this.loadPaths.push("hey.js");
        var callback = this.spy();
        this.runner.run(this.group, {}, callback);

        try {
            promise.then.yield(this.resourceSet);
        } catch (e) {
            assert.match(this.stderr, "/here/hey.js");
        }

        assert.calledOnce(callback);
        assert.match(callback.args[0][0], {
            code: 65
        });
    },

    "logs load errors": function () {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.resolve();
        var promise = { then: this.stub() };
        this.group.resolve.returns(promise);
        this.runner.run(this.group, {});

        try {
            promise.then.yield({
                loadPath: {
                    paths: this.stub().throws("Error", "Ay caramba")
                }
            });
            throw new Error("Didn't fail");
        } catch (e) {
            assert.match(this.stderr, "Ay caramba");
        }
    },

    "logs config resolution errors": function () {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.resolve();
        this.config.resolver.reject({ message: "Oh noes" });
        this.runner.run(this.group, {});

        assert.match(this.stderr, "Oh noes");
    },

    "runs beforeRun extension hook": function () {
        this.runner.run(this.group, {});

        assert.calledOnceWith(this.group.runExtensionHook, "beforeRun", this.group);
    },

    "processes all resource sets": function () {
        this.stub(this.group, "on");

        this.runner.run(this.group, {});
        assert.equals(this.group.on.callCount, 4);

        var process = this.stub().returns({ then: function () {} });
        this.group.on.args[0][1]({ process: process });
        assert.calledOnce(process);
    },

    "processes resource sets with existing manifest": function () {
        this.stub(fs, "readFileSync").returns('{"/somewhere.js": ["1234"]}');
        this.stub(this.group, "on");

        this.runner.run(this.group, {});
        assert.equals(this.group.on.callCount, 4);

        var process = this.stub().returns({ then: function () {} });
        this.group.on.args[0][1]({ process: process });
        assert.calledWith(process, { "/somewhere.js": ["1234"] });
    },

    "writes manifest when successful": function () {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.resolve();
        this.config.resolver.resolve(this.resourceSet);

        this.runner.run(this.group, this.options);

        assert.calledOnce(fs.writeFileSync);
    },

    "aborts run if analyzer fails": function (done) {
        this.stub(beforeRun, "beforeRunHook");
        this.config.resolver.resolve({});

        this.runner.run(this.group, {}, done(function (err) {
            refute.called(buster.autoRun);
            assert.match(err, {
                code: 70
            });
        }));

        beforeRun.beforeRunHook.yield({});
    },

    "does not write manifest if analyzer fails": function (done) {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.reject();
        this.config.resolver.resolve({});

        this.runner.run(this.group, {}, done(function () {
            refute.called(fs.writeFileSync);
        }));
    },

    "captures console if configured thusly": function () {
        this.stub(nodeRunner, "beforeRunHook").returns(this.analyzer.promise);
        this.analyzer.resolver.resolve();
        this.config.resolver.resolve(this.resourceSet);
        this.stub(buster, "captureConsole");

        this.runner.run(this.group, {
            captureConsole: true
        });

        assert.calledOnce(buster.captureConsole);
    }
});
