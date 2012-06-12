var helper = require("../../test-helper").requestHelperFor("localhost", "9999");
var http = require("http");
var buster = require("buster");
buster.serverCli = helper.require("cli/server");
var assert = buster.assert;
var refute = buster.refute;
var run = helper.runTest;
buster.server = require("buster-capture-server");

buster.testCase("buster-server binary", {
    setUp: helper.cliTestSetUp(buster.serverCli),
    tearDown: helper.cliTestTearDown,

    "run": {
        "should print to stderr if option handling fails":
        run(["--hey"], function () {
            refute.equals(this.stderr, "");
        }),

        "should print help message": run(["--help"], function () {
            assert.match(this.stdout, "Server for automating");
            assert.match(this.stdout, "-h/--help");
            assert.match(this.stdout, "-p/--port");
        }),

        "should start server on default port": function (done) {
            var createServer = this.stub(this.cli, "createServer");

            helper.run(this, [], done(function () {
                assert.calledOnce(createServer);
                assert.calledWith(createServer, 1111);
            }));
        },

        "should start server on specified port": function (done) {
            var createServer = this.stub(this.cli, "createServer");

            helper.run(this, ["-p", "3200"], done(function () {
                assert.calledOnce(createServer);
                assert.calledWith(createServer, 3200);
            }));
        },

        "should print message if address is already in use": function (done) {
            var error = new Error("EADDRINUSE, Address already in use");
            this.stub(this.cli, "createServer").throws(error);

            helper.run(this, ["-p", "3200"], done(function () {
                assert.match(this.stderr, "Address already in use. Pick another " +
                             "port with -p/--port to start buster-server");
            }));
        },

        "should print message if address is already in use (async)": function (done) {
            var server = buster.eventEmitter.create();
            this.stub(http, "createServer").returns(server);

            helper.run(this, ["-p", "3200"], done(function () {
                assert.match(this.stderr, "Address already in use. Pick another " +
                             "port with -p/--port to start buster-server");
            }));

            server.emit("error", new Error("EADDRINUSE, Address already in use"));
        },

        "should bind to specified address": function (done) {
            var createServer = this.stub(this.cli, "createServer");

            helper.run(this, ["-b", "0.0.0.0"], done(function () {
                assert.calledOnce(createServer);
                assert.calledWithExactly(createServer, 1111, "0.0.0.0");
            }));
        },

        "should bind to undefined when address not specified": function (done) {
            var createServer = this.stub(this.cli, "createServer");

            helper.run(this, [], done(function () {
                assert.calledOnce(createServer);
                assert.calledWithExactly(createServer, 1111, undefined);
            }));
        }
    },

    "createServer": {
        setUp: function (done) {
            this.server = this.cli.createServer(9999);
            done();
        },

        tearDown: function (done) {
            this.server.on("close", done);
            this.server.close();
        },

        "should redirect client when capturing": function (done) {
            helper.get("/capture", done(function (res, body) {
                assert.equals(res.statusCode, 302);
                assert.match(res.headers.location, /\/slaves\/[0-9a-z\-]+\/browser$/);
            }));
        },

        "should serve header when captured": function (done) {
            helper.get("/capture", function (res, body) {
                var headerUrl = res.headers.location.replace("/browser", "/header");
                helper.get(headerUrl, done(function (res, body) {
                    assert.equals(res.statusCode, 200);
                    assert.match(body, "test slave");
                }));
            });
        },

        "should serve static pages": function (done) {
            helper.get("/stylesheets/buster.css", done(function (res, body) {
                assert.equals(res.statusCode, 200);
                assert.match(body, "body {");
            }));
        },

        "should serve templated pages": function (done) {
            helper.get("/", done(function (res, body) {
                assert.equals(res.statusCode, 200);
                assert.match(body, "<h1>Capture browser as test slave</h1>");
            }));
        },

        "should report no slaves initially": function (done) {
            helper.get("/", done(function (res, body) {
                assert.equals(res.statusCode, 200);
                assert.match(body, "<h2>No captured slaves</h2>");
            }));
        },

        "should report connected slaves": function (done) {
            helper.captureSlave("Mozilla/5.0 (X11; Linux x86_64; rv:2.0.1) Gecko/20100101 Firefox/4.0.1", function () {
                helper.get("/", done(function (res, body) {
                    assert.equals(res.statusCode, 200);
                    assert.match(body, "<h2>Captured slaves</h2>");
                }));
            });
        },

        "should report name of connected clients": function (done) {
            helper.captureSlave("Mozilla/5.0 (X11; Linux x86_64; rv:2.0.1) Gecko/20100101 Firefox/4.0.1", function () {
                helper.get("/", done(function (res, body) {
                    assert.match(body, "<li class=\"firefox linux\">");
                    assert.match(body, "<h3>Firefox 4.0.1 | Linux</h3>");
                }));
            });
        },

        "should report name newly connected ones": function (done) {
            helper.get("/", function (res, body) {
                helper.captureSlave("Mozilla/5.0 (X11; Linux x86_64; rv:2.0.1) Gecko/20100101 Firefox/4.0.1", function () {
                    helper.get("/", done(function (res, body) {
                        assert.match(body, "<li class=\"firefox linux\">");
                        assert.match(body, "<h3>Firefox 4.0.1 | Linux</h3>");
                    }));
                });
            });
        }
    }
});
