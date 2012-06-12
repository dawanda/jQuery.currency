var buster = require("buster");
var helper = require("./helper");
var terminal = require("../lib/buster-terminal");

buster.testCase("Relative grid", {
    setUp: function () {
        this.terminal = helper.createAsciiTerminal(this);
        this.grid = terminal.createRelativeGrid(this.terminal);
    },

    "prints text": function () {
        this.grid.puts("Hey");
        assert.stdout("Hey\n");
    },

    "overwrites text": function () {
        this.grid.puts("Hey");
        this.grid.go(0, 0);
        this.grid.puts("Yo!");
        assert.stdout("Yo!\n");
    },

    "calculates correct position and length for colorized text": function () {
        var t = terminal.create({ color: true });
        this.grid.puts(t.green("Hey"));
        this.grid.go(0, 0);
        this.grid.puts("Yo mister green");
        assert.stdout("Yo mister green\n");
    },

    "inserts blank lines when walking past max y": function () {
        this.grid.puts("Hey");
        this.grid.go(0, 5);
        assert.stdout("Hey\n\n\n\n\n");
    },

    "goes to non-existing coordinate": function () {
        this.grid.puts("Hey");
        this.grid.go(5, 5);
        this.grid.puts("Yo");
        this.grid.puts("Hmm");
        assert.stdout("Hey\n\n\n\n\n     Yo\nHmm\n");
    }
});
