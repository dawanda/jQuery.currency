var buster = require("buster");
var syntax = require("../lib/buster-syntax").extension;
var config = require("buster-configuration");
var analyzer = require("buster-analyzer").analyzer;

function process(group, then, errBack) {
    group.resolve().then(function (resourceSet) {
        resourceSet.serialize().then(then, errBack);
    }, errBack);
}

buster.testCase("Syntax extension", {
    setUp: function () {
        this.config = config.create();
        this.analyzer = analyzer.create();
        this.listeners = { fatal: this.spy(), error: this.spy() };
        this.analyzer.on("fatal", this.listeners.fatal);
        this.analyzer.on("error", this.listeners.error);
    },

    "flags fatal on syntax error": function (done) {
        var group = this.config.addGroup("Some tests", {
            resources: [{ path: "/buster.js", content: "va a = 42;" }],
            sources: ["/buster.js"]
        });

        syntax.create().beforeRun(group, this.analyzer);

        process(group, done(function (resource) {
            assert.calledOnce(this.listeners.fatal);
            assert.calledWith(this.listeners.fatal,
                              "Syntax error in /buster.js");
        }.bind(this)), buster.log);
    },

    "flags error on reference error": function (done) {
        var group = this.config.addGroup("Some tests", {
            resources: [{ path: "/buster.js", content: "var a = $('div');" }],
            sources: ["/buster.js"]
        });

        syntax.create().beforeRun(group, this.analyzer);

        process(group, done(function (resource) {
            assert.calledOnce(this.listeners.error);
            assert.calledWith(this.listeners.error,
                              "ReferenceError in /buster.js");
        }.bind(this)));
    },

    "skips reference error if configured thusly": function (done) {
        var group = this.config.addGroup("Some tests", {
            resources: [{ path: "/buster.js", content: "var a = $('div');" }],
            sources: ["/buster.js"]
        });

        syntax.create({
            ignoreReferenceErrors: true
        }).beforeRun(group, this.analyzer);

        process(group, done(function (resource) {
            refute.called(this.listeners.error);
        }.bind(this)));
    },

    "flags fatal on all user sources, not framework": function (done) {
        var group = this.config.addGroup("Some tests", {
            resources: [
                { path: "/buster.js", content: "va a = 42;" },
                { path: "/buster2.js", content: "va a = 42;" },
                { path: "/buster3.js", content: "va a = 42;" },
                { path: "/buster4.js", content: "va a = 42;" }
            ],
            libs: ["/buster.js"],
            sources: ["/buster.js"],
            testHelpers: ["/buster.js"],
            tests: ["/buster.js"]
        });

        group.bundleFramework();
        syntax.create().beforeRun(group, this.analyzer);

        process(group, done(function (resource) {
            assert.equals(this.listeners.fatal.callCount, 4);
        }.bind(this)), buster.log);
    },

    "does not syntax-check non-javascript resources": function (done) {
        var group = this.config.addGroup("Some tests", {
            resources: [{ path: "/buster", content: "va a = 42;" }],
            libs: ["/buster"]
        });

        group.bundleFramework();
        syntax.create().beforeRun(group, this.analyzer);

        process(group, done(function (resource) {
            refute.called(this.listeners.fatal);
        }.bind(this)), buster.log);
    },

    "does not fail file ending in comment": function (done) {
        var group = this.config.addGroup("Some tests", {
            resources: [{ path: "/some.js", content: "// var a = 42;" }],
            libs: ["/some.js"]
        });

        group.bundleFramework();
        syntax.create().beforeRun(group, this.analyzer);

        process(group, done(function (resource) {
            refute.called(this.listeners.fatal);
        }.bind(this)), buster.log);
    }
});
