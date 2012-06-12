var config = module.exports;

config["Node tests"] = {
    rootPath: "../",
    environment: "node",
    sources: ["lib/**/*.js"],
    tests: ["test/node/**/*.js"]/*,
    extensions: [require("buster-lint")],
    "buster-lint": {
        "linterOptions": {
            sloppy: true,
            nomen: true,
            predef: [
                "require",
                "process",
                "__dirname"
            ]
        }
    }*/
};

config["Browser tests"] = {
    rootPath: "../",
    environment: "browser",
    src: ["lib/buster-test-cli/browser/wiring.js"],
    tests: ["test/browser/test-helper.js",
            "test/browser/**/*.js"]
};
