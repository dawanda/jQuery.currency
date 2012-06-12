var busterArgs = require("buster-args");
var S = require("buster-terminal");
var stdioLogger = require("buster-stdio-logger");
var Path = require("path");
var fs = require("fs");
var Minimatch = require("minimatch").Minimatch;

var colorOpt = {
    "dim": { color: true, bright: false },
    "bright": { color: true, bright: true }
};

var DEFAULT_CONFIG_FILES = ["buster.js", "test/buster.js", "spec/buster.js"];

function createHelpOption(cli) {
    var helpOpt = cli.opt("-h", "--help", "Show this message.", {
        hasValue: true
    });

    // To allow for --help with no value when we have help topics.
    helpOpt.acceptsValueAbsence = true;
    return helpOpt;
}

function createLogLevelOption(cli) {
    return cli.opt("-l", "--log-level", "Set logging level.", {
        values: cli.logger.levels
    });
}

function createVerboseOption(cli) {
    var verbose = cli.opt(
        "-v",
        "--verbose",
        "Increase verbosity level. Include one (log level info) or two time " +
            "(e.g. -vv, log level debug)."
    );

    verbose.addValidator(function (opt, promise) {
        if (opt.timesSet > 2) {
            promise.reject("-v can only be set two times.");
        } else {
            promise.resolve();
        }
    });

    return verbose;
}

function isExistingFile(file) {
    try {
        var stat = fs.statSync(file);
        return stat.isFile();
    } catch (e) {}
}

function tryFileNames(baseDir, files) {
    var i, l;
    for (i = 0, l = files.length; i < l; ++i) {
        var file = Path.join(baseDir, files[i]);
        if (isExistingFile(file)) { return file; }
    }
}

function filterTests(cli, config) {
    var matchers = cli.testFiles().map(function (fileName) {
        return new Minimatch(fileName);
    });
    if (matchers.length === 0) { return; }
    config.on("load:tests", function (rs) {
        rs.filter(function (resource) {
            var file = Path.join(rs.rootPath, resource.path);
            return matchers.every(function (m) { return !m.match(file); });
        }).forEach(function (resource) { rs.remove(resource.path); });
    });
}

function loadArgs(cli, argv) {
    var argvArr = (argv || []).slice(0);
    var env = cli.environmentVariable;

    if (env && typeof process.env[env] === "string") {
        return argvArr.concat(process.env[env].split(" "));
    }

    return argvArr;
}

function setLogLevel(cli) {
    if (cli.logLevelOpt.isSet) {
        cli.logger.level = cli.logLevelOpt.value;
    }

    if (cli.verboseOpt.isSet) {
        var levels = cli.logger.levels;
        var curr = levels.indexOf(cli.logger.level);
        cli.logger.level = levels[curr + cli.verboseOpt.timesSet];
    }
}

function printTopicHelp(cli) {
    var topic = cli.helpOpt.value;

    if (cli.helpTopics.hasOwnProperty(topic)) {
        cli.logger.log(cli.helpTopics[topic]);
    } else {
        cli.logger.error("No such help topic '" + topic +
                          "'. Try without a specific help topic, or one of: " +
                          Object.keys(cli.helpTopics).join(",") + ".");
    }
}

function hasHelpTopics(cli) {
    return typeof cli.helpTopics !== "undefined" &&
        Object.keys(cli.helpTopics).length > 0;
}

function printHelp(cli) {
    if (cli.missionStatement) {
        cli.logger.log(cli.missionStatement + "\n");
    }
    if (cli.usage) { cli.logger.log("Usage: " + cli.usage); }
    if (cli.description) { cli.logger.log(cli.description + "\n"); }

    var signatures = cli.options.map(function (o) { return o.signature; });
    var sigWitdh = S.maxWidth(signatures);
    var descWidth = 80 - sigWitdh - 4;

    cli.options.forEach(function (option) {
        var alignedSignature = S.alignLeft(option.signature, sigWitdh);
        var helpText = option.helpText;
        if (option === cli.helpOpt && hasHelpTopics(cli)) {
            var topics = Object.keys(cli.helpTopics);
            var topicListText;
            if (topics.length === 1) {
                topicListText = topics[0];
            } else {
                topicListText = "[" + topics.join(",") + "]";
            }
            helpText += " See also --help " + topicListText + ".";
        }
        helpText = S.reflow(helpText, descWidth);
        helpText = helpText.split("\n").join("\n" + S.repeat(" ", sigWitdh + 7));
        cli.logger.log("    " + alignedSignature + "   " + helpText);
    });
}

function handleOptions(cli, errors) {
    if (errors) { return cli.logger.error(errors[0]); }

    if (cli.helpOpt.isSet) {
        if (cli.helpOpt.value) {
            printTopicHelp(cli);
        } else {
            printHelp(cli);
        }
        return;
    }

    setLogLevel(cli);
    try {
        if (cli.onRun) { cli.onRun(); }
    } catch (e) {
        cli.logger.error("CLI internal error");
        cli.logger.error(e.stack);
    }
}

function loadOptions(cli) {
    if (cli.hasLoadedOptions) { return; }
    cli.hasLoadedOptions = true;
    cli.helpOpt.hasValue = hasHelpTopics(cli);
    if (cli.loadOptions) { cli.loadOptions(); }
}

function loadConfig(cli, file) {
    var config = require("buster-configuration").create();

    if (!file) {
        throw { message: cli.config.signature + " not provided, and " +
                "none of\n[" + DEFAULT_CONFIG_FILES.join(", ") +
                "] exists" };
    }

    try {
        config.loadFile(file);
    } catch (e) {
        e.message = "Error loading configuration " + file + "\n" + e.message;
        throw e;
    }

    return config;

}

function property(name) {
    return function (object) {
        return object[name];
    };
}

function noGroupsError(cli, file, groups) {
    var groupFilter = cli.groupFilter() && cli.configGroup.value;
    var envFilter = cli.environmentFilter();
    var message = file + " contains no configuration groups";

    function nameAndEnvironment(group) {
        return group.name + " (" + group.environment + ")";
    }

    if (groupFilter && envFilter) {
        message += " for environment '" + envFilter + "' that matches '" +
            groupFilter + "'\nTry one of:\n  " +
            groups.map(nameAndEnvironment).join("\n  ");
    } else if (envFilter) {
        message += " for environment '" + envFilter + "'\n" +
            "Try one of: " + groups.map(property("environment")).join(", ");
    } else if (groupFilter) {
        message += " that matches '" + cli.configGroup.value + "'\n" +
            "Try one of:\n  " + groups.map(property("name")).join("\n  ");
    }

    return { message: message };
}

module.exports = {
    create: function (stdout, stderr) {
        var cli = Object.create(this);
        cli.logger = stdioLogger(stdout, stderr);
        cli.logger.level = "log";
        cli.options = [];
        cli.args = Object.create(busterArgs);
        cli.helpOpt = createHelpOption(cli);
        cli.logLevelOpt = createLogLevelOption(cli);
        cli.verboseOpt = createVerboseOption(cli);

        return cli;
    },

    opt: function (shortFlag, longFlag, helpText, options) {
        var opt = this.args.createOption(shortFlag, longFlag);
        opt.helpText = helpText;

        options = options || {};
        if (options.hasOwnProperty("values")) {
            opt.hasValue = true;
            opt.helpText += " One of " + options.values.join(", ") + ".";
            opt.addValidator(busterArgs.validators.inEnum(options.values));
        }

        if (options.hasOwnProperty("defaultValue")) {
            opt.hasValue = true;
            opt.helpText += " Default is " + options.defaultValue + ".";
            opt.defaultValue = options.defaultValue;
        }

        if (options.hasOwnProperty("hasValue")) {
            opt.hasValue = true;
        }

        if (options.hasOwnProperty("validators")) {
            var validatorName, msg;
            for (validatorName in options.validators) {
                msg = options.validators[validatorName];
                opt.addValidator(busterArgs.validators[validatorName](msg));
            }
        }

        this.options.push(opt);
        return opt;
    },

    opd: function (signature, helpText) {
        var opd = this.args.createOperand();
        opd.signature = signature;
        opd.helpText = helpText;
        this.options.push(opd);
        return opd;
    },

    run: function (argv, callback) {
        loadOptions(this);
        this.args.handle(loadArgs(this, argv), function (errors) {
            handleOptions(this, errors);
            if (callback) { callback(); }
        }.bind(this));
    },

    err: function err(message) {
        this.logger.error(message);
        process.exit(1);
    },

    addConfigOption: function (environment) {
        this.config = this.opt("-c", "--config", "Test configuration file", {
            hasValue: true
        });

        this.configGroup = this.opt(
            "-g",
            "--config-group",
            "Test configuration group(s) to load",
            { hasValue: true }
        );

        this.configTests = this.opt(
            "-t",
            "--tests",
            "Test files (within active configuration) to run",
            { hasValue: true }
        );

        if (environment) {
            this.envFilter = environment;
        } else {
            this.configEnv = this.opt(
                "-e",
                "--environment",
                "Test configuration environment to load",
                { hasValue: true }
            );
        }
    },

    groupFilter: function () {
        var filter = this.configGroup.value;
        return (filter && new RegExp(filter, "i")) || null;
    },

    environmentFilter: function () {
        return this.envFilter || this.configEnv.value;
    },

    testFiles: function () {
        if (!this.configTests.value) { return []; }
        return this.configTests.value.split(",").map(function (path) {
            return Path.resolve(process.cwd(), path);
        });
    },

    findConfigFile: function findConfigFile(baseDir, file) {
        var fileNames = file ? [file] : DEFAULT_CONFIG_FILES;

        while (!file && baseDir !== "/") {
            file = tryFileNames(baseDir, fileNames);
            baseDir = Path.dirname(baseDir);
        }

        return isExistingFile(file) ? file : null;
    },

    loadConfig: function () {
        this.allGroups = [];
        var files = this.config.value || "";
        return files.split(",").reduce(function (config, file) {
            this.configFile = this.findConfigFile(process.cwd(), file);
            if (file && !this.configFile) {
                throw new Error(this.config.signature + ": " + file +
                                " did not match any files");
            }
            var conf = loadConfig(this, this.configFile);
            this.allGroups = this.allGroups.concat(conf.groups);
            conf.filterEnv(this.environmentFilter());
            conf.filterGroup(this.groupFilter());
            filterTests(this, conf);
            config.groups = config.groups.concat(conf.groups);
            this.config.actualValue = config.groups;
            return config;
        }.bind(this), { groups: [] });
    },

    onConfig: function (callback) {
        var config;
        try {
            config = this.loadConfig();
        } catch (e) {
            return callback(e);
        }
        if (config.groups.length === 0) {
            callback(noGroupsError(this, this.configFile, this.allGroups));
        } else {
            callback(undefined, config);
        }
    }
};
