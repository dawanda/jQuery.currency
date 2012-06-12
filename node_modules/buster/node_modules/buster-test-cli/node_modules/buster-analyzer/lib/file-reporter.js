var B = require("buster-core");
var terminal = require("buster-terminal");

function spaces(num) {
    var str = "";
    while (num--) { str += " "; }
    return str;
}

function tabsUntil(line, col) {
    var i, num = 0;
    for (i = 0; i < col; ++i) {
        if (/\t/.test(line.substr(i, 1))) {
            num += 1;
        }
    }
    return num;
}

function printError(error) {
    this.print(error.file || "<anonymous>");
    if (typeof error.line === "number") { this.print(":" + error.line); }
    if (typeof error.col === "number") { this.print(":" + error.col); }
    if (error.description) { this.print(" " + error.description); }
    this.print("\n");
    if (!error.content) { return; }
    this.puts(error.content.replace(/\t/g, "    "));
    if (typeof error.col === "number") {
        var numTabs = tabsUntil(error.content, error.col - 1);
        var tabOffset = (numTabs * 4) - numTabs;
        var indent = spaces(error.col - 1 + tabOffset);
        this.puts(indent + "^");
    }
}

module.exports = {
    create: function (threshold, options) {
        return B.extend(buster.create(this), {
            threshold: threshold,
            io: options.io,
            term: terminal.create(options)
        });
    },

    listen: function (analyzer) {
        analyzer.on("fatal", B.bind(this, "fatal"));
        analyzer.on("error", B.bind(this, "error"));
        analyzer.on("warning", B.bind(this, "warning"));
        return this;
    },

    fatal: function (message, data) {
        this.format(message, data, "Fatal", "red");
    },

    error: function (message, data) {
        if (this.threshold === "fatal") { return; }
        this.format(message, data, "Error", "yellow");
    },

    warning: function (message, data) {
        if (["fatal", "error"].indexOf(this.threshold) >= 0) { return; }
        this.format(message, data, "Warning", "grey");
    },

    format: function (message, data, label, color) {
        this.io.puts(this.term[color]("[" + label + "] " + message));
        if (data && data.errors) {
            data.errors.filter(function (err) {
                return !!err;
            }).forEach(B.bind(this.io, printError));
        }
        if (data && !data.errors && data.hasOwnProperty("toString")) {
            this.io.puts("    " + data.toString());
        }
    }
};
