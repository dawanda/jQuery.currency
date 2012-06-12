var buster = require("buster");
var fileReporter = require("../lib/buster-analyzer").fileReporter;

function io() {
    var output = [];
    return {
        print: function (text) { output.push(text); },
        puts: function (text) { this.print(text + "\n"); },
        toString: function () { return output.join(""); }
    };
}

buster.testCase("Analyzer reporter", {
    setUp: function () {
        this.analyzer = buster.eventEmitter.create();
        var ios = this.io = io();
        buster.assertions.add("IO", {
            assert: function (string) {
                this.out = ios.toString();
                return buster.assertions.match(this.out, string);
            },
            assertMessage: "Expected IO ${out} to include ${0}",
            refuteMessage: "Expected IO ${out} not to include ${0}"
        });
    },

    "fatal threshold": {
        setUp: function () {
            this.reporter = fileReporter.create("fatal", { io: this.io });
            this.reporter.listen(this.analyzer);
        },

        "prints fatal message": function () {
            this.analyzer.emit("fatal", "Oh noes", {});
            assert.IO("[Fatal] Oh noes");
        },

        "does not print error message": function () {
            this.analyzer.emit("error", "Oh noes", {});
            refute.match(this.io.toString(), "Oh noes");
        },

        "does not print warning message": function () {
            this.analyzer.emit("warning", "Oh noes", {});
            refute.match(this.io.toString(), "Oh noes");
        }
    },

    "error threshold": {
        setUp: function () {
            this.reporter = fileReporter.create("error", { io: this.io });
            this.reporter.listen(this.analyzer);
        },

        "prints fatal message": function () {
            this.analyzer.emit("fatal", "Oh noes", {});
            assert.IO("Oh noes");
        },

        "prints error message": function () {
            this.analyzer.emit("error", "Oh noes", {});
            assert.IO("[Error] Oh noes");
        },

        "does not print warning message": function () {
            this.analyzer.emit("warning", "Oh noes", {});
            refute.match(this.io.toString(), "Oh noes");
        }
    },

    "warning threshold": {
        setUp: function () {
            this.reporter = fileReporter.create("warning", { io: this.io });
            this.reporter.listen(this.analyzer);
        },

        "prints fatal message": function () {
            this.analyzer.emit("fatal", "Oh noes", {});
            assert.IO("Oh noes");
        },

        "prints error message": function () {
            this.analyzer.emit("error", "Oh noes", {});
            assert.IO("Oh noes");
        },

        "prints warning message": function () {
            this.analyzer.emit("warning", "Oh noes", {});
            assert.IO("[Warning] Oh noes");
        }
    },

    "all threshold": {
        setUp: function () {
            this.reporter = fileReporter.create("all", {
                io: this.io,
                color: true
            });
            this.reporter.listen(this.analyzer);
        },

        "prints warning message": function () {
            this.analyzer.emit("warning", "Oh noes", {});
            assert.IO("Oh noes");
        },

        "prints fatal message in red": function () {
            this.analyzer.emit("fatal", "Oh noes", {});
            assert.IO("\x1b[31m[Fatal] Oh noes\x1b[0m");
        },

        "prints error message in yellow": function () {
            this.analyzer.emit("error", "Oh noes", {});
            assert.IO("\x1b[33m[Error] Oh noes\x1b[0m");
        },

        "prints warning message in grey": function () {
            this.analyzer.emit("warning", "Oh noes", {});
            assert.IO("\x1b[38;5;8m[Warning] Oh noes\x1b[0m");
        }
    },

    "message formatting": {
        setUp: function () {
            this.reporter = fileReporter.create("warning", { io: this.io });
            this.reporter.listen(this.analyzer);
        },

        "prints file name, line and column": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "stuff.js",
                line: 2,
                col: 13
            }]});

            assert.IO("stuff.js:2:13");
        },

        "prints file name and line": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "stuff.js",
                line: 2
            }]});

            assert.IO("stuff.js:2");
            refute.IO("undefined");
        },

        "prints anonymous for missing file name": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                line: 2,
                col: 13
            }]});

            assert.IO("<anonymous>:2:13");
        },

        "prints description": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                line: 2,
                col: 13,
                description: "Uh-oh"
            }]});

            assert.IO("<anonymous>:2:13 Uh-oh");
        },

        "skips line and column if not present": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js"
            }]});

            refute.IO(/\d:\d/);
        },

        "prints script content after line label": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                content: "Hey"
            }]});

            assert.IO("hey.js\nHey\n");
        },

        "does not print content if not present": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js"
            }]});

            refute.IO("undefined");
        },

        "replaces tab characters with spaces": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                content: "\tHey \tthere"
            }]});

            assert.IO("\n    Hey     there\n");
        },

        "prints caret at col on next line after content": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                line: 10,
                col: 5,
                content: "Hey there"
            }]});

            assert.IO("\nHey there\n");
            assert.IO("\n    ^\n");
        },

        "prints caret on column 1": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                line: 7,
                col: 1,
                content: "var a;"
            }]});

            assert.IO("\nvar a;\n");
            assert.IO("\n^\n");
        },

        "prints caret adjusted for tabs": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                line: 132,
                col: 2,
                content: "\tHey \tthere"
            }]});

            assert.IO("\n    Hey     there\n");
            assert.IO("\n    ^\n");
        },

        "prints caret adjusted for multiple tabs": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                line: 2,
                col: 7,
                content: "\tHey \tthere"
            }]});

            assert.IO("\n    Hey     there\n");
            assert.IO("\n            ^\n");
        },

        "prints object's toString if there's no 'errors'": function () {
            this.analyzer.emit("error", "Oops", {
                toString: function () {
                    return "Yay";
                }
            });

            assert.IO("Oops\n    Yay\n");
        }
    }
});
