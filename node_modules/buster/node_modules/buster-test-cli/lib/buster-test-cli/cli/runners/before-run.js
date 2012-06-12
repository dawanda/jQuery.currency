var buster = require("buster-core");
var ba = require("buster-analyzer");

module.exports = {
    create: function (config, io, options) {
        options = options || {};
        var analyzer = ba.analyzer.create();
        analyzer.failOn(options.failOn || "fatal");

        return buster.extend(Object.create(this), {
            config: config,
            io: io,
            color: options.color,
            bright: options.bright,
            warnings: options.warnings || "all",
            analyzer: analyzer
        });
    },

    addExtension: function (extension) {
        this.config.extensions.push(extension);
        return this;
    },

    beforeRunHook: function (onFail) {
        try {
            var reporter = ba.fileReporter.create(this.warnings, {
                io: this.io,
                color: this.color,
                bright: this.bright
            }).listen(this.analyzer);
            this.analyzer.on("fail", onFail);
            this.config.runExtensionHook("beforeRun", this.config, this.analyzer);
        } catch (e) {
            this.logger.error(e.message);
            process.exit(70);
        }
    }
};
