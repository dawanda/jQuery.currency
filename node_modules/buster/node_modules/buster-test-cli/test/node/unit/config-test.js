var helper = require("../test-helper");
var buster = require("buster");
var configHelper = helper.require("config");
var testConfig = require("buster-configuration");
var assert = buster.assert;
var refute = buster.refute;
var version = testConfig.VERSION;

buster.assertions.add("isObject", {
    assert: function (object) {
        return typeof object === "object" && !!object;
    },
    assertMessage: "Expected ${0} to be object and not null"
});

function extendConfigGroup(config, env, callback) {
    var group = config.filterEnv(env).groups[0];
    configHelper.bundleFramework(group).resolve().then(
        callback,
        function (err) { buster.log(err); }
    );
}

buster.testCase("Test client configuration", {
    setUp: function () {
        process.chdir(__dirname);
        this.config = testConfig.create();
        this.config.addGroup("Client tests", {});
        this.config.addGroup("Server tests", {
            environment: "node",
            load: ["something.js"]
        });
    },

    tearDown: helper.clientTearDown,

    "preloads session configuration with library": function (done) {
        extendConfigGroup(this.config, "browser", done(function (rs) {
            assert.equals(rs.length, 36);
            assert.isObject(rs.get("/buster/buster-core.js"));
            assert.isObject(rs.get("/buster/buster-event-emitter.js"));
            assert.isObject(rs.get("/buster/buster-evented-logger.js"));
            assert.isObject(rs.get("/buster/buster-assertions.js"));
            assert.isObject(rs.get("/buster/buster-assertions/expect.js"));
            assert.isObject(rs.get("/buster/buster-format.js"));
            assert.isObject(rs.get("/buster/sinon.js"));
            assert.isObject(rs.get("/buster/sinon/spy.js"));
            assert.isObject(rs.get("/buster/sinon/stub.js"));
            assert.isObject(rs.get("/buster/sinon/mock.js"));
            assert.isObject(rs.get("/buster/sinon/collection.js"));
            assert.isObject(rs.get("/buster/sinon/sandbox.js"));
            assert.isObject(rs.get("/buster/sinon/test.js"));
            assert.isObject(rs.get("/buster/sinon/test_case.js"));
            assert.isObject(rs.get("/buster/sinon/assert.js"));
            assert.isObject(
                rs.get("/buster/sinon/util/fake_xml_http_request.js")
            );
            assert.isObject(rs.get("/buster/sinon/util/fake_timers.js"));
            assert.isObject(rs.get("/buster/sinon/util/fake_server.js"));
            assert.isObject(
                rs.get("/buster/sinon/util/fake_server_with_clock.js")
            );
            assert.isObject(rs.get("/buster/buster-test/browser-env.js"));
            assert.isObject(rs.get("/buster/buster-test/spec.js"));
            assert.isObject(rs.get("/buster/buster-test/test-case.js"));
            assert.isObject(rs.get("/buster/buster-test/test-context.js"));
            assert.isObject(rs.get("/buster/buster-test/test-runner.js"));
            assert.isObject(
                rs.get("/buster/buster-test/reporters/json-proxy.js")
            );
            assert.isObject(rs.get("/buster/sinon-buster.js"));
            assert.isObject(rs.get("/buster/bundle-" + version + ".js"));
            assert.isObject(rs.get("/buster/sinon/util/timers_ie.js"));
            assert.isObject(rs.get("/buster/sinon/util/xhr_ie.js"));
            assert.isObject(rs.get("/buster/buster/buster-wiring.js"));
            assert.isObject(rs.get("/buster/wiring.js"));

            assert.equals(rs.loadPath.paths(), [
                "/buster/bundle-" + version + ".js",
                "/buster/compat-" + version + ".js",
                "/buster/wiring.js",
                "/buster/ready.js"]);
        }));
    },

    "loads ready script last": function (done) {
        var config = testConfig.create();
        config.addGroup("Client tests", {
            rootPath: process.cwd(),
            tests: ["config-test.js"]
        });

        extendConfigGroup(config, "browser", done(function (rs) {
            assert.equals(rs.loadPath.paths(), [
                "/buster/bundle-" + version + ".js",
                "/buster/compat-" + version + ".js",
                "/buster/wiring.js",
                "/config-test.js",
                "/buster/ready.js"]);
        }));
    }
});
