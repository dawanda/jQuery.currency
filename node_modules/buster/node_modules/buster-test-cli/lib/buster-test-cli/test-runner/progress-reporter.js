var terminal = require("buster-terminal");

module.exports = {
    create: function (opt) {
        var reporter = Object.create(this);
        reporter.terminal = terminal.create(opt);
        reporter.matrix = terminal.createMatrix({
            io: opt && opt.io,
            columns: 2
        });
        reporter.matrix.resizeColumn(1, 80);
        reporter.matrix.freezeColumn(1);
        return reporter;
    },

    listen: function (runner) {
        runner.bind(this, {
            "progress:test:success": "testSuccess",
            "progress:test:error": "testError",
            "progress:test:failure": "testFailure",
            "progress:test:timeout": "testTimeout"
        });

        return this;
    },

    testSuccess: function (test) {
        this.print(test.client, ".");
    },

    testError: function (test) {
        this.print(test.client, this.terminal.yellow("E"));
    },

    testFailure: function (test) {
        this.print(test.client, this.terminal.red("F"));
    },

    testTimeout: function (test) {
        this.print(test.client, this.terminal.red("T"));
    },

    displayProgress: function (client, output) {
        if (!this.list) {
            return this.bufferOutput(client, output);
        }

        this.print(client, output);
    },

    print: function (client, output) {
        this.matrix.rowById(this.clients[client.id].id).append(1, output);
    },

    addClient: function (clientId, agent) {
        this.clients = this.clients || {};
        this.clients[clientId] = {
            id: this.matrix.addRow([agent.toString() + ":", ""]),
            name: agent.toString()
        };
        this.printUncaughtExceptions(clientId);
    },

    uncaughtException: function (clientId, message) {
        if (!this.clients || !this.clients[clientId]) {
            return this.queueException(clientId, message);
        }
        this.printUncaughtException(clientId, message);
    },

    queueException: function (id, message) {
        if (!this.exceptionQueue) { this.exceptionQueue = {}; }
        if (!this.exceptionQueue[id]) { this.exceptionQueue[id] = []; }
        this.exceptionQueue[id].push(message);
    },

    printUncaughtException: function (clientId, message) {
        var name = this.clients[clientId].name;
        var pattern = /Uncaught ([^\s]+Error): /;
        var matches = message.match(pattern);
        var err = matches && matches[1] || "Exception";
        var pieces = message.split(/^([^\s]+:\d+)/);
        message = pieces.shift() + pieces.shift() + " Uncaught " + err + ":" +
            pieces.join(" ").replace(pattern, "");
        this.matrix.insertRow(0, [this.terminal.yellow(name),
                                  this.terminal.yellow(message)]);
    },

    printUncaughtExceptions: function (id) {
        if (!this.exceptionQueue || !this.exceptionQueue[id]) { return; }
        this.exceptionQueue[id].forEach(function (ex) {
            this.printUncaughtException(id, ex);
        }.bind(this));
    }
};
