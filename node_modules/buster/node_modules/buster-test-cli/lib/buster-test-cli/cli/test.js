var fs = require("fs");
var path = require("path");
var buster = require("buster-core");

var colorOpt = {
    "none": { color: false, bright: false },
    "dim": { color: true, bright: false },
    "bright": { color: true, bright: true }
};

/* Remember to keep in sync with docs at https://github.com/busterjs/buster-docs/tree/master/site/docs/test */

module.exports = buster.extend(buster.create(require("buster-cli")), {
    missionStatement: "Run Buster.JS tests on node, in browsers, or both",
    usage: "buster-test [options] [filters]",
    description:
        "\nOptionally provide a test name filter to run a selection of tests:\n" +
        "`buster-test configuration` runs all contexts/tests with the word\n" +
        "'configuration' in their name.",
    environmentVariable: "BUSTER_TEST_OPT",

    onRun: function () {
        var options = buster.extend({
            reporter: this.reporter.value,
            filters: this.filters.value,
            cwd: process.cwd(),
            server: this.serverConfig(),
            cacheResources: !this.reset.isSet,
            warnings: this.warnings.value,
            failOn: this.failOn.value,
            captureConsole: !this.releaseConsole.isSet,
            staticResourcePath: this.staticResourcePath.isSet,
            logPassedMessages: this.logAll.isSet
        }, colorOpt[this.color.value]);

        this.onConfig(function (err, config) {
            if (err) {
                this.logger.e(err.message);
                if (err.stack) this.logger.e(err.stack);
            } else {
                this.runConfig(config.groups || [], options);
            }
        }.bind(this));
    },

    runConfig: function (groups, options) {
        var runs;
        var runGroup = function (err, results) {
            if (!runs) {
                runs = [];
            } else {
                runs.push({ error: err, results: results });
            }
            var group = groups.shift();
            if (!group) { return process.exit(exitCode(runs)); }
            this.logger.info("Running tests:", group.name);
            this.logger.info("Loading:", "\n  " + files(group).join("\n  "));
            var runner = this.loadRunner(group.environment);
            if (runner) { runner.run(group, options, runGroup); }
        }.bind(this);
        runGroup();
    },

    loadOptions: function () {
        this.addConfigOption();

        this.reporter = this.opt("-r", "--reporter", "Test output reporter", {
            defaultValue: "dots",
            validators: { "reporter": "No such reporter '${1}'" }
        });

        this.color = this.opt("-C", "--color", "Output color scheme", {
            values: ["dim", "bright", "none"],
            defaultValue: "bright"
        });

        this.server = this.opt("-s", "--server", "Hostname and port to a running buster-server instance (for browser tests)", {
            defaultValue: "http://localhost:1111"
        });

        this.reset = this.opt("-R", "--reset",
                              "Don't use cached resources on the server.");

        this.warnings = this.opt("-W", "--warnings", "Warnings to print", {
            values: ["fatal", "error", "warning", "all", "none"],
            defaultValue: "all"
        });

        this.failOn = this.opt("-F", "--fail-on", "Fail on warnings at this level", {
            values: ["fatal", "error", "warning"],
            defaultValue: "fatal"
        });

        this.logAll = this.opt(
            "-L",
            "--log-all",
            "Log all messages, including for passed tests"
        );

        this.releaseConsole = this.opt(
            "-o",
            "--release-console",
            "By default, Buster captures log messages from console.log " +
            "and friends. It does so by replacing the global console object " +
            "with the buster.console object. This option skips this hijacking.");

        this.staticResourcePath = this.opt(
            "-p",
            "--static-paths",
            "Serve files over a static URL on the server. Reusing paths "+
                "across test runs makes it possible to use breakpoints, " +
                "but increases the risk of stale resources due to the " +
                "browser caching too eagerly");

        this.args.addShorthand("--node", ["-e", "node"]);
        this.args.addShorthand("--browser", ["-e", "browser"]);

        this.filters = this.args.createOperand();
        this.filters.greedy = true;
    },

    serverConfig: function () {
        var server = this.server.value;
        server = (/^:/.test(server) ? "127.0.0.1" : "") + server;
        return (!/^http\:\/\//.test(server) ? "http://" : "") + server;
    },

    loadRunner: function (env, config) {
        var module = "./runners/" + env + "-runner";
        if (!moduleExists(module)) {
            return this.err("Unknown environment '" + env + "'. Try one of:\n" +
                            availableRunners().join(", "));
        }

        var runner = Object.create(require("./runners/" + env + "-runner"));
        runner.logger = this.logger;
        return runner;
    }
});

var EX_SOFTWARE = 70;

function exitCode(runs) {
    for (var i = 0, l = runs.length; i < l; ++i) {
        if (runs[i].error) { return runs[i].error.code || EX_SOFTWARE; }
        if (!runs[i].results.ok) { return 1; }
    }
    return 0;
}

function moduleExists(module) {
    try {
        return fs.statSync(path.join(__dirname, module + ".js")).isFile();
    } catch (e) {
        return false;
    }
}

function availableRunners() {
    return fs.readdirSync(path.join(__dirname, "runners"));
}

module.exports.helpTopics = {};
Object.defineProperty(module.exports.helpTopics, "reporters", {
    enumerable: true,
    get: function () {
        var testReporters = require("buster-test").reporters
        var reporters = Object.keys(testReporters).filter(function (r) {
            return typeof testReporters[r] == "object";
        });

        return "Buster.JS ships with a set of built-in reporters. These can be used by\n" +
"providing the name to the -r/--reporter option:\n" +
"buster-test -r dots\n\n" +
"The dots reporter is the default reporter. Built-in reporters\n" +
"include:\n" + reporters.join("\n") + "\n\n" +
"Custom reporters\n" +
"Buster.JS can use custom reporters that are reachable through the node\n" +
"module system. Assume you have a reporter that looks like:\n\n" +
"module.exports = {\n" +
"    create: function (options) {\n" +
"        // ...\n" +
"    },\n\n" +
"    listen: function (runner) {\n" +
"        // ...\n" +
"    },\n\n" +
"    // ...\n" +
"};\n\n" +
"When this reporter is available on the node load path, say in the\n" +
"my-reporter module, you can use it the following way:\n" +
"`buster-test -r my-reporter`\n\n" +
"If your module is not the main export from the module, you can provide the\n" +
"'path' to the correct object using the following syntax: \n" +
"`buster-test -r my-reporters#console.fancy`\n\n" +
"This will cause Buster to load the `my-reporters' module, and try to use\n" +
"the `console.fancy' object exported from it.\n\n" +
"The BUSTER_REPORTER environment variable\n" +
"If you want a different reporter, but don't want to specify it for each\n" +
"run, you can specify the BUSTER_REPORTER environment variable in e.g. ,\n" +
".bashrc and Buster will use this reporter as long as another one is not\n" +
"specified with the -r option.\n\n" +
"For information on implementing custom reporters, refer to the online docs\n" +
"at http://busterjs.org/docs/buster-test/reporters/";
    }
});

require("buster-args").validators.reporter = function (errMsg) {
    return function (arg, promise) {
        try {
            require("buster-test").reporters.load(arg.value);
            promise.resolve();
        } catch (e) {
            promise.reject(
                arg.signature + ": " + errMsg.replace("${1}", arg.value) +
                    "\n" + e.message + "\nLearn more about reporters with " +
                    "`buster-test -h reporters`");
        }
    };
};

function files(config) {
    return config.resourceSet && config.resourceSet.load || [];
}
