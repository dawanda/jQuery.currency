var buster = require("buster-core");
var bCli = require("buster-cli");
var fs = require("fs");
var http = require("http");
var resourceMiddleware = require("buster-resources").resourceMiddleware;

// TODO: add test coverage (integration test?)
function configureGroup(group) {
    group.on("load:framework", function (resourceSet) {
        // Test bed
        resourceSet.addResource({
            path: "/",
            file: __dirname + "/index.html"
        });

        // Wiring between framework and user test cases
        resourceSet.addResources([{
            file: require.resolve("buster-test/lib/buster-test/reporters/html"),
            path: "/buster-static-html-reporter.js"
        }, {
            file: require.resolve("buster-test/lib/buster-test/stack-filter"),
            path: "/buster-static-stack-filter.js"
        }, {
            file: require.resolve("./browser-wiring"),
            path: "/buster-static-browser-wiring.js"
        }]);

        // Some neat CSS
        resourceSet.addResource({
            file: require.resolve("buster-test/resources/buster-test.css"),
            path: "/buster-test.css"
        });

        // Runner
        resourceSet.addResource({
            file: require.resolve("./browser-run"),
            path: "/buster-static-browser-run.js"
        });

        resourceSet.then(function (rs) {
            rs.loadPath.append(["/buster-static-stack-filter.js",
                                "/buster-static-browser-wiring.js",
                                "/buster-static-html-reporter.js"]);
        });
    });

    group.on("load:resources", function (resourceSet) {
        resourceSet.loadPath.append(["/buster-static-browser-run.js"]);
    });

    // Load in the builtins
    group.bundleFramework();
}

function runWithConfigGroup(cli, resourceSet) {
    if (cli.path.isSet) {
        cli.writeToDisk(resourceSet);
    } else {
        cli.startServer(resourceSet);
    }
}

function startServer(resourceSet, port, logger) {
    var middleware = resourceMiddleware.create();
    middleware.mount("/", resourceSet);
    var server = http.createServer(function (req, res) {
        if (middleware.respond(req, res)) { return; }
        res.writeHead(404);
        res.write("Not found");
        res.end();
    });
    server.listen(port);

    logger.log("Starting server on http://localhost:" + port + "/");

    return server;
}

module.exports = buster.extend(bCli.create(), {
    loadOptions: function () {
        this.addConfigOption("browser");

        this.port = this.opt("-p", "--port", "The port to run the server on.", {
            defaultValue: 8282
        });

        this.path = this.opd("Output dir",
                             "The directory to write the files to.");
    },

    onRun: function () {
        var self = this;

        this.onConfig(function (err, config) {
            if (err) {
                self.logger.error(err.message);
                return;
            }

            var group = config.groups[0];

            if (group) {
                configureGroup(group);
                group.resolve().then(function (resourceSet) {
                    runWithConfigGroup(self, resourceSet);
                });
            } else {
                self.logger.error("No 'browser' group found in specified " +
                                  "configuration file.");
            }
        });
    },

    startServer: function (resourceSet) {
        this.httpServer = startServer(resourceSet,
                                      this.port.value,
                                      this.logger);
    },

    writeToDisk: function (resourceSet) {
    }
});
