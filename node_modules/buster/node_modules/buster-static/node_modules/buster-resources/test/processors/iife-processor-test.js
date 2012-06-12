var buster = require("buster");
var resource = require("../../lib/resource");
var iife = require("../../lib/processors/iife");
require("../test-helper");

buster.testCase("Processors", {
    "iife processor": {
        setUp: function () {
            this.resource = resource.create("/buster.js", {
                content: "var buster = {};"
            });
        },

        "wraps content in IIFE": function (done) {
            this.resource.addProcessor(iife());

            assert.content(this.resource,
                           "(function () {var buster = {};}());", done);
        },

        "exports single variable by assigning to global": function (done) {
            this.resource.addProcessor(iife(["buster"]));

            assert.content(this.resource,
                           "(function (__GLOBAL) {var buster = {};" +
                           "__GLOBAL.buster=buster;}" +
                           "(typeof global != \"undefined\" ? global : this));",
                           done);
        },

        "exports multiple variables by assigning to global": function (done) {
            this.resource.addProcessor(iife(["buster", "sinon"]));

            assert.content(this.resource,
                           "(function (__GLOBAL) {var buster = {};" +
                           "__GLOBAL.buster=buster;" +
                           "__GLOBAL.sinon=sinon;}" +
                           "(typeof global != \"undefined\" ? global : this));",
                           done);
        },

        "separates exports from contents with semicolon": function (done) {
            this.resource = resource.create("/buster.js", {
                content: "var buster = {}"
            });
            this.resource.addProcessor(iife(["buster"]));

            assert.content(this.resource,
                           "(function (__GLOBAL) {var buster = {};" +
                           "__GLOBAL.buster=buster;}" +
                           "(typeof global != \"undefined\" ? global : this));",
                           done);
        }
    }
});