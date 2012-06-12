var helper = require("../../test-helper");
var buster = require("buster");
buster.remoteRunner = helper.require("test-runner/remote-runner");
buster.progressReporter = helper.require("test-runner/progress-reporter");
var assert = buster.assert;
var S = require("buster-terminal");

buster.testCase("Progress reporter", {
    setUp: function () {
        this.clock = this.useFakeTimers();
        this.multicaster = buster.eventEmitter.create();

        this.emit = function (event, data, client) {
            return this.multicaster.emit(event, {
                topic: event,
                data: data,
                clientId: client
            });
        };

        this.clients = [{
            browser: "Chrome",
            version: "9.0.597.107",
            platform: "Linux",
            toString: function () {
                return "Chrome 9.0.597.107 Linux";
            }
        }, {
            browser: "Firefox",
            version: "4.0",
            platform: "Linux",
            toString: function () {
                return "Firefox 4.0 Linux";
            }
        }];

        this.runner = buster.remoteRunner.create(this.multicaster);
        this.runner.createClient(1, this.clients[0]);
        this.runner.createClient(2, this.clients[1]);

        this.io = {
            out: "",
            toString: function () { return this.out; },
            print: function (str) { this.out += str; },
            puts: function (str) { this.out += str + "\n"; }
        };

        this.reporter = buster.progressReporter.create({
            io: this.io
        }).listen(this.runner);
    },

    "should not print anything without clients": function () {
        this.emit("test:success", {});

        assert.equals(S.stripSeq(this.io.toString()), "");
    },

    "should print client when adding": function () {
        this.reporter.addClient(1, this.clients[0]);
        this.reporter.addClient(2, this.clients[1]);

        assert.match(this.io.toString(), "Chrome 9.0.597.107 Linux:");
        assert.match(this.io.toString(), "Firefox 4.0 Linux:");
    },

    "should print dot for test success": function () {
        this.reporter.addClient(1, this.clients[0]);
        this.reporter.addClient(2, this.clients[1]);
        this.io.out = "";
        this.emit("test:success", {}, 1);

        assert.match(this.io.toString(), ".");
    },

    "should print E for test error": function () {
        this.reporter.addClient(1, this.clients[0]);
        this.reporter.addClient(2, this.clients[1]);
        this.io.out = "";
        this.emit("test:error", {}, 1);

        assert.match(this.io.toString(), "E");
    },

    "should print F for test failure": function () {
        this.reporter.addClient(1, this.clients[0]);
        this.reporter.addClient(2, this.clients[1]);
        this.io.out = "";
        this.emit("test:failure", {}, 1);

        assert.match(this.io.toString(), "F");
    },

    "should print T for test timeout": function () {
        this.reporter.addClient(1, this.clients[0]);
        this.reporter.addClient(2, this.clients[1]);
        this.io.out = "";
        this.emit("test:timeout", {}, 1);

        assert.match(this.io.toString(), "T");
    },

    "should save uncaught exceptions until browser connects": function () {
        this.reporter.uncaughtException(1, "Oops");
        refute.match(this.io.toString(), "Oops");
        this.reporter.addClient(1, this.clients[0]);
        assert.match(this.io.toString(), "Oops");
    },

    "immediately prints uncaught exception for known client": function () {
        this.reporter.addClient(1, this.clients[0]);
        this.reporter.uncaughtException(1, "Oops");
        assert.match(this.io.toString(), "Oops");
    }
});
