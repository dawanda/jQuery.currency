var B = require("buster-core");
var test = require("buster-test");
B.autoRun = test.autoRun;
B.testCase = test.testCase;
B.spec = test.spec;
var path = require("path");
var beforeRun = require("./before-run");
var when = require("when");
var fs = require("fs");

// Error codes, as per FreeBSD's sysexit(3)
// Errors are mapped to sysexit(3) error codes wherever that makes sense
var EX_DATAERR = 65;
var EX_SOFTWARE = 70;

function writeManifest(fileName, manifests) {
    var manifest = B.extend.apply(B, manifests);
    fs.writeFileSync(fileName, JSON.stringify(manifest), "utf-8");
}

function runTests(rs, manifests, logger, config, options, done) {
    try {
        writeManifest(config.tmpFile("buster-cache"), manifests);
        var runner = B.autoRun(options, {
            start: B.bind(config, "runExtensionHook", "testRun"),
            end: B.partial(done, null)
        });
        B.testCase.onCreate = runner;
        B.spec.describe.onCreate = runner;

        var fullPath = B.partial(path.join, rs.rootPath);
        rs.loadPath.paths().map(fullPath).forEach(require);
    } catch (e) {
        logger.e(e.stack);
        e.code = EX_DATAERR;
        done(e);
    }
}

function readManifest(fileName) {
    try {
        return JSON.parse(fs.readFileSync(fileName));
    } catch (e) {
        return {};
    }
}

function processSection(config, section) {
    var d = when.defer();
    config.on("load:" + section, function (resourceSet) {
        resourceSet.process(readManifest(config.tmpFile("buster-cache"))).then(
            B.bind(d.resolver, "resolve"),
            B.bind(d.resolver, "reject")
        );
    });
    return d.promise;
}

function createIOStream(logger, level) {
    var stream = logger.streamForLevel(level);

    return {
        puts: function (msg) { return stream.write(msg + "\n"); },
        print: function (msg) { return stream.write(msg); }
    };
}

module.exports = {
    run: function (config, options, done) {
        if (options.captureConsole &&
            typeof buster.captureConsole === "function") {
            buster.captureConsole();
        }
        var promise = this.beforeRunHook(config, options);

        when.all([config.resolve(), promise]).then(function (values) {
            runTests(values[0], values[1], this.logger, config, options, done);
        }.bind(this), function (err) {
            if (this.logger) {
                this.logger.e(err && err.message || err);
            }
            done(err);
        }.bind(this));
    },

    beforeRunHook: function (config, options) {
        var d = when.defer();
        var io = createIOStream(this.logger, "warn");
        var hook = beforeRun.create(config, io, options);
        hook.logger = this.logger;

        hook.beforeRunHook(function (stats) {
            var err = new Error("Pre-condition failed");
            err.type = "AnalyzerError";
            err.code = EX_SOFTWARE;
            d.resolver.reject(err);
            d = null;
        });

        var sections = ["libs", "sources", "testHelpers", "tests"];
        when.all(sections.map(B.partial(processSection, config))).then(
            function (manifests) { if (d) { d.resolver.resolve(manifests); } },
            function (err) { if (d) { d.resolver.reject(err); } }
        );
        return d.promise;
    }
};
