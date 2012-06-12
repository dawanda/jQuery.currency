var http = require("http");
var cliHelper = require("buster-cli/lib/test-helper");

var helper = module.exports = {
    writeFile: cliHelper.writeFile,
    mkdir: cliHelper.mkdir,
    cdFixtures: cliHelper.cdFixtures,
    mockLogger: cliHelper.mockLogger,

    require: function (mod) {
        return require("../../lib/buster-test-cli/" + mod);
    },

    cliTestSetUp: function (cli) {
        return function () {
            this.stub(process, "exit");
            cliHelper.cdFixtures();
            this.cli = cli.create();
            cliHelper.mockLogger(this);
        }
    },

    clientTearDown: function (done) {
        cliHelper.clearFixtures(done);
    },

    runTest: function (args, callback) {
        return function (done) {
            helper.run(this, args, done(callback));
        };
    },

    run: function (tc, args, callback) {
        tc.cli.run(args);

        setTimeout(function () {
            callback.call(tc);
        }, 10);
    },

    requestHelperFor: function (host, port) {
        var helper = Object.create(this);
        helper.host = host;
        helper.port = port;

        return helper;
    },

    request: function (method, url, headers, callback) {
        if (typeof headers == "function") {
            callback = headers;
            headers = {};
        }

        http.request({
            method: method.toUpperCase(),
            host: this.host || "localhost",
            port: this.port || 9999,
            path: url,
            headers: headers
        }, function (res) {
            var body = "";
            res.on("data", function (chunk) { body += chunk; });
            res.on("end", function () { callback(res, body); });
        }).end();
    },

    get: function (url, headers, callback) {
        return this.request("GET", url, headers, callback);
    },

    post: function (url, headers, callback) {
        return this.request("POST", url, headers, callback);
    },

    captureSlave: function (ua, callback) {
        this.get("/capture", { "User-Agent": ua }, function (res, body) {
            var uid = res.headers.location.split("/").pop();
            var url = "/clients/" + uid + "/createMulticast";

            this.post(url, { "User-Agent": ua }, function (res, body) {
                callback();
            }.bind(this));
        }.bind(this));
    }
};
