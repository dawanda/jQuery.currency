var syntax = require("./syntax");

function processor(analyzer, resource, content) {
    var type = resource.mimeType();
    analyzer.checked = analyzer.checked || {};
    if (!/javascript/.test(type) || analyzer.checked[resource.path]) { return; }
    analyzer.checked[resource.path] = true;
    var result = this.checker.check(content, resource.path);
    if (!result.ok) {
        var path = resource.path;
        if (result.errors[0].type === syntax.SYNTAX_ERROR) {
            analyzer.fatal("Syntax error in " + path, result);
        } else {
            analyzer.error("ReferenceError in " + path, result);
        }
    }
}

module.exports = {
    name: "buster-syntax",

    create: function (options) {
        var instance = Object.create(this);
        instance.checked = {};
        instance.checker = syntax.create({
            ignoreReferenceErrors: options && options.ignoreReferenceErrors
        });
        return instance;
    },

    beforeRun: function (config, analyzer) {
        ["libs", "sources", "testHelpers", "tests"].forEach(function (group) {
            config.on("load:" + group, function (resourceSet) {
                resourceSet.addProcessor(processor.bind(this, analyzer));
            }.bind(this));
        }.bind(this));
    }
};
