var buster = require("buster");
var assert = buster.assert;
var testCli = require("../../../lib/buster-test-cli");

buster.testCase("Module index", {
    "should get version": function () {
        assert.match(testCli.VERSION, /^\d+\.\d+\.\d+$/);
    }
});
