var stdioLogger = require("buster-stdio-logger");
var buster = require("buster");
var rmrf = require("rimraf");
var path = require("path");
var fs = require("fs");
var FIXTURES_ROOT = path.resolve(__dirname, "..", "fixtures");

module.exports = {
    FIXTURES_ROOT: FIXTURES_ROOT,

    mockLogger: function mockLogger(context) {
        context.stdout = "";
        context.stderr = "";
        var j = Array.prototype.join;
        var cli = context.cli;
        var level = cli.logger && cli.logger.level;

        cli.logger = stdioLogger(
            { write: function () { context.stdout += j.call(arguments, " "); }},
            { write: function () { context.stderr += j.call(arguments, " "); }}
        );

        if (level) { cli.logger.level = level; }
    },

    mkdir: function (dir) {
        dir = dir.replace(FIXTURES_ROOT, "").replace(/^\//, "");
        var dirs = [FIXTURES_ROOT].concat(dir.split("/")), tmp = "", i, l;
        for (i = 0, l = dirs.length; i < l; ++i) {
            if (dirs[i]) {
                tmp += dirs[i] + "/";
                try {
                    fs.mkdirSync(tmp, "755");
                } catch (e) {}
            }
        }
    },

    writeFile: function (file, contents) {
        file = path.join(FIXTURES_ROOT, file);
        this.mkdir(path.dirname(file));
        fs.writeFileSync(file, contents);
        return file;
    },

    cdFixtures: function () {
        this.mkdir("");
        process.chdir(FIXTURES_ROOT);
    },

    clearFixtures: function (done) {
        rmrf(FIXTURES_ROOT, function (err) {
            if (err) { require("buster").log(err.toString()); }
            done();
        });
    },

    run: function (tc, args, callback) {
        var aso = buster.assert.stdout, rso = buster.refute.stdout;

        buster.refute.stdout = buster.assert.stdout = function (text) {
            this.match(tc.stdout, text);
        };

        buster.refute.stderr = buster.assert.stderr = function (text) {
            this.match(tc.stderr, text);
        };

        tc.cli.run(args, function () {
            callback.apply(tc, arguments);
            buster.assert.stdout = aso;
            buster.refute.stdout = rso;
        });
    }
};
