var version = require("../buster-test-cli").VERSION;
var when = require("when");

function addWiringAndReady(rs) {
    when.all(["wiring.js", "ready.js"].map(function (f) {
        return rs.addResource({
            file: require.resolve("./browser/" + f),
            path: "/buster/" + f
        });
    })).then(function () {
        rs.loadPath.append("/buster/wiring.js");
    });
}

function loadReady(rs) {
    rs.loadPath.append("/buster/ready.js");
}

module.exports = {
    bundleFramework: function (group) {
        group.on("load:framework", addWiringAndReady);
        group.on("load:resources", loadReady);
        return group.bundleFramework();
    }
};
