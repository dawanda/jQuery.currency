var buster = require("buster-core");
buster.stackFilter = require("buster-test").stackFilter;
var path = require("path");
var url = require("url");
var busterClient = require("buster-client").client;
var bRemoteRunner = require("../../test-runner/remote-runner");
var bProgressReporter = require("../../test-runner/progress-reporter");
var bReporters = require("buster-test").reporters;
var bConfigExt = require("../../config");
var beforeRun = require("./before-run");
var syntax = require("buster-syntax");
var terminal = require("buster-terminal");

// Error codes, as per FreeBSD's sysexit(3)
// Errors are mapped to sysexit(3) error codes wherever that makes sense
var EX_DATAERR = 65;
var EX_SOFTWARE = 70;
var EX_TEMPFAIL = 75;
var EX_PROTOCOL = 76;
var EX_CONFIG = 78;

module.exports = {
    run: function (config, options, done) {
        this.config = config;
        this.options = buster.extend({}, options, config.options);
        this.callback = done;
        this.termOpt = terminalOptions.call(this);
        this.server = url.parse(options.server);
        var client = busterClient.create(this.server.port, this.server.hostname);
        client.cacheResources = !!options.cacheResources;
        bConfigExt.bundleFramework(config);
        this.beforeRunHook(config, options, client.abort.bind(client));
        config.resolve().then(function (resourceSet) {
            this.options = buster.extend({}, options, config.options);
            this.logger.info("Creating browser session");
            client.createSession({
                resourceSet: resourceSet,
                joinable: false,
                managed: true,
                staticResourcePath: options.staticResourcePath
            }).then(this.runSession.bind(this), this.onError.bind(this));
        }.bind(this), function (err) {
            return this.onError(err);
        }.bind(this));
    },

    beforeRunHook: function (config, options, onError) {
        var io = createIOStream(this.logger, "warn");
        var hook = beforeRun.create(config, io, options);
        hook.logger = this.logger;

        hook.addExtension(syntax.extension.create({
            ignoreReferenceErrors: true
        })).beforeRunHook(onError);
    },

    runSession: function (session) {
        var opt = this.options || {};
        var logger = this.logger;
        logger.debug("Connected to server");

        if (logger.level == "debug") {
            session.onMessage(function () { logger.debug.apply(logger, arguments); });
        }

        if (session.slaves.length == 0) {
            return runComplete.call(this, session);
        }

        if (opt.reporter && opt.reporter !== "dots") {
            var t = terminal.create(terminalOptions.call(this));
            session.on("uncaughtException", function (msg) {
                logger.warn(t.yellow("Uncaught exception: " + msg.data.message));
            });
        }

        logger.debug("Initializing remote runner with " + (session.slaves || []).length + " slaves");
        var runnerConfig = runnerConfiguration(opt, ["autoRun", "filters", "captureConsole"]);
        var messaging = session.messagingClient;
        var remoteRunner = bRemoteRunner.create(messaging, session.slaves, runnerConfig);
        remoteRunner.logger = logger;
        var reporter = createReporter.call(this, remoteRunner, session, opt);
        remoteRunner.on("suite:end", runComplete.bind(this, session));
        try {
            this.config.runExtensionHook("testRun", remoteRunner, messaging);
        } catch (e) {
            this.logger.error(e.message);
            process.exit(70);
        }
    },

    onError: function (err) {
        var file;
        if (/ECONNREFUSED/.test(err.message)) {
            this.logger.e("Unable to connect to server");
            this.logger.e("Please make sure that buster-server is running at " +
                          this.server.href);
            err.code = EX_TEMPFAIL;
        } else if (/ENOENT/.test(err.message) && /'.*\*.*'/.test(err.message)) {
            file = err.message.match(/'(.*)'/)[1].replace(process.cwd() + "/", "");
            this.logger.e("Configured pattern '" + file + "' does not match any files");
            this.logger.e("Unable to continue");
            err.code = EX_DATAERR;
        } else if (/ENOENT/.test(err.message)) {
            file = err.message.match(/'(.*)'/)[1].replace(process.cwd() + "/", "");
            this.logger.e("Configured path '" + file + "' is not a file or directory");
            this.logger.e("Unable to continue");
            err.code = EX_DATAERR;
        } else if (err.name == "AbortedError") {
            this.logger.d("Session creation aborted, presumably by analyzer");
            err.code = EX_SOFTWARE;
        } else {
            this.logger.e(err.message || err);
            err.code = EX_CONFIG;
        }
        if (typeof this.callback == "function") {
            this.callback(err);
        }
    }
};

function runComplete(session, results) {
    var callback = this.callback || function () {};
    var logger = this.logger;
    var error = null;

    if (session.slaves.length == 0) {
        var server = this.server && this.server.href || "http://??";
        error = new Error("No slaves connected, nothing to do.\n" +
                          "Capture browsers at " + server + " and try again.");
        error.code = EX_PROTOCOL;
        error.type = "NoSlavesError";
        logger.warn("No slaves connected, nothing to do.");
        logger.warn("Capture browsers at " + server + " and try again.");
        logger.warn("You can do it, the force is with you!");
    }

    session.close().then(function () {
        logger.info("Successfully closed session");
        callback(error, results);
    }, function (err) {
        logger.debug("Failed closing session");
        logger.warn(err.message);
        var error = new Error("Failed closing session: " + err.message);
        error.code = EX_TEMPFAIL;
        error.type = "SessionCloseError";
        callback(error);
    });
}

function runnerConfiguration(options, keys) {
    return buster.extend(keys.reduce(function (opts, key) {
        if (options.hasOwnProperty(key)) opts[key] = options[key];
        return opts;
    }, {}), {
        failOnNoAssertions: typeof options.failOnNoAssertions == "boolean" ? options.failOnNoAssertions : true
    });
}

function createIOStream(logger, level) {
    var stream = logger.streamForLevel(level);

    return {
        puts: function (msg) { return stream.write(msg + "\n"); },
        print: function (msg) { return stream.write(msg); }
    };
}

function createReporter(runner, session, options) {
    var logger = this.logger;
    var terminalOpt = terminalOptions.call(this);

    if (!options.reporter || options.reporter == "dots") {
        var progressReporter = bProgressReporter.create(terminalOpt).listen(runner);

        runner.on("client:connect", function (client) {
            progressReporter.addClient(client.id, client);
        });

        session.on("uncaughtException", function (msg) {
            progressReporter.uncaughtException(msg.clientId, msg.data.message);
        });
    }

    var server = this.server || {};

    var reporter = bReporters.load(options.reporter || "dots").create(
        buster.extend({
            logPassedMessages: !!options.logPassedMessages,
            displayProgress: false,
            cwd: "http://" + server.hostname + ":" + server.port + session.resourcesPath
        }, terminalOpt)
    ).listen(runner);
    reporter.contextsInPackageName = 2;
    buster.stackFilter.filters = ["/buster/bundle-",
                                  "buster/wiring",
                                  "buster-capture-server/node_modules"];

    return reporter;
}

function serverConfig(opt) {
    if (opt && opt.server) return url.parse(opt.server);
    return { hostname: "localhost", port: "1111" };
}

function terminalOptions() {
    return {
        io: createIOStream(this.logger, "log"),
        color: !!this.options.color,
        bright: !!this.options.bright
    };
}
