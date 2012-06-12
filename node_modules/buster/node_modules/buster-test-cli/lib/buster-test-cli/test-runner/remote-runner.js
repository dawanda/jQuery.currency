var buster = require("buster-core");
var userAgentParser = require("buster-user-agent-parser");

function getClientStore(runner, msg) {
    if (!runner.clientData) {
        runner.clientData = {};
    }

    if (!runner.clientData[msg.clientId]) {
        runner.clientData[msg.clientId] = {
            id: msg.clientId,
            client: runner.getClient(msg.clientId),
            contexts: [],
            queue: [],
            results: [],
            timer: 0,

            toString: function () {
                return this.client.toString();
            }
        };
    }

    monitorClientTimeout(runner, runner.clientData[msg.clientId]);
    return runner.clientData[msg.clientId];
}

function monitorClientTimeout(runner, client) {
    clearTimeout(client.timer);

    client.timer = setTimeout(function () {
        runner.clientTimeout(client);
    }, runner.timeout || 15000);
}

function clearTimers(clients) {
    for (var id in clients) {
        clearTimeout(clients[id].timer);
    }
}

function queueEvent(runner, msg) {
    var clientStore = getClientStore(runner, msg);

    clientStore.queue.push({
        topic: msg.topic,
        data: msg.data
    });

    return clientStore;
}

function emptyQueueIfTopLevelContext(runner, clientStore, callback) {
    if (clientStore.contexts.length > 0) {
        return;
    }

    while ((event = clientStore.queue.shift())) {
        runner.emit(event.topic, event.data);
    }

    if (typeof callback == "function") {
        callback();
    }
}

function eventQueuer(msg) {
    if (!this.getClient(msg.clientId)) return;
    queueEvent(this, msg);
}

function clientToString() {
    var str = this.browser + " " + this.version + ", " + this.os;
    return str + (this.duplicateNumber ? " (" + this.duplicateNumber + ")" : "");
}

function property(name) {
    return function (object) {
        return object[name];
    };
}

module.exports = buster.extend(buster.create(buster.eventEmitter), {
    create: function (emitter, slaves, config) {
        var runner = Object.create(this);
        runner.console = runner;
        runner.config = config || {};
        runner.slaveIds = (slaves || []).map(property("id"));
        runner.clientCount = runner.slaveIds.length;

        emitter.bind(runner, {
            "ready": "clientReady",
            "log": "log",
            "suite:start": "suiteStart",
            "suite:end": "suiteEnd",
            "context:unsupported": "contextUnsupported",
            "context:start": "contextStart",
            "context:end": "contextEnd",
            "test:async": "testAsync",
            "test:start": "testStart",
            "test:setUp": "testSetUp",
            "test:tearDown": "testTearDown",
            "test:success": "testSuccess",
            "test:error": "testError",
            "test:failure": "testFailure",
            "test:timeout": "testTimeout",
            "test:deferred": "testDeferred"
        });

        return runner;
    },

    clientReady: function (e) {
        if (this.logger) {
            this.logger.debug("Client ready", e, this.slaveIds);
        }
        if (this.slaveIds.indexOf(e.clientId) < 0) return;
        var ua = userAgentParser.parse(e.data);
        var client = this.createClient(e.clientId, ua);
        if (e.client) e.client.emit("tests:run", this.config || {});
        this.emit("client:connect", client);
    },

    suiteStart: function (msg) {
        if (!this.getClient(msg.clientId)) return;

        if (!this.started) {
            this.emit("suite:start");
            this.started = true;
        }

        this.emit("progress:suite:start", { client: this.getClient(msg.clientId) });
    },

    suiteEnd: function (msg) {
        if (!this.getClient(msg.clientId)) return;

        var clientStore = getClientStore(this, msg);
        this.emit("progress:suite:end", { client: this.getClient(msg.clientId) });
        this.results = this.results || [];
        this.results.push(msg.data);
        this.clientCount -= 1;
        if (this.clientCount > 0) return;

        clearTimers(this.clientData);
        this.logger.debug("Emit suite:end");
        this.emit("suite:end", this.getSummarizedResults());
    },

    contextUnsupported: function (msg) {
        if (!this.getClient(msg.clientId)) return;
        queueEvent(this, msg);
        emptyQueueIfTopLevelContext(this, getClientStore(this, msg));
    },

    contextStart: function (msg) {
        if (!this.getClient(msg.clientId)) return;
        var clientStore = getClientStore(this, msg);

        if (clientStore.contexts.length == 0) {
            queueEvent(this, {
                clientId: msg.clientId,
                topic: "context:start",
                data: { name: clientStore.toString() }
            });
        }

        queueEvent(this, msg);
        clientStore.contexts.push(msg.data.name);
    },

    contextEnd: function (msg) {
        if (!this.getClient(msg.clientId)) return;

        var clientStore = getClientStore(this, msg), event;
        clientStore.contexts.pop();
        queueEvent(this, msg);

        emptyQueueIfTopLevelContext(this, clientStore, function () {
            this.emit("context:end", { name: clientStore.toString() });
        }.bind(this));
    },

    log: eventQueuer,
    testAsync: eventQueuer,
    testSetUp: eventQueuer,
    testStart: eventQueuer,
    testTearDown: eventQueuer,
    testDeferred: eventQueuer,

    testSuccess: function (msg) {
        if (!this.getClient(msg.clientId)) return;
        var clientStore = queueEvent(this, msg);

        this.emit("progress:test:success", {
            client: clientStore.client,
            name: msg.data.name,
            contexts: clientStore.contexts
        });
    },

    testError: function (msg) {
        if (!this.getClient(msg.clientId)) return;
        var clientStore = queueEvent(this, msg);

        this.emit("progress:test:error", {
            client: clientStore.client,
            name: msg.data.name,
            contexts: clientStore.contexts,
            error: msg.data.error
        });
    },

    testFailure: function (msg) {
        if (!this.getClient(msg.clientId)) return;
        var clientStore = queueEvent(this, msg);

        this.emit("progress:test:failure", {
            client: clientStore.client,
            name: msg.data.name,
            contexts: clientStore.contexts,
            error: msg.data.error
        });
    },

    testTimeout: function (msg) {
        if (!this.getClient(msg.clientId)) return;
        var clientStore = queueEvent(this, msg);

        this.emit("progress:test:timeout", {
            client: clientStore.client,
            name: msg.data.name,
            contexts: clientStore.contexts
        });
    },

    createClient: function (id, ua) {
        this.clients = this.clients || {};
        var client = buster.extend({ id: id, toString: clientToString }, ua);
        var dupNum, cli;

        for (var cid in this.clients) {
            cli = this.clients[cid];

            if (cli.browser == client.browser && cli.version == client.version &&
                cli.platform == client.platform) {
                dupNum = Math.max(dupNum || 0, cli.duplicateNumber || 0, 1) + 1;
            }
        }

        client.duplicateNumber = dupNum;
        this.clients[id] = client;
        getClientStore(this, { clientId: id }); // Starts the timeout counter

        return this.clients[id];
    },

    getClient: function (id) {
        this.clients = this.clients || {};
        return this.clients[id];
    },

    clientTimeout: function (c) {
        this.emit("client:timeout", this.getClient(c.id));
        this.clientCount -= 1;
        delete this.clients[c.id];
    },

    getSummarizedResults: function () {
        var results = { clients: this.results.length }, prop, val;

        for (var i = 0, l = this.results.length; i < l; ++i) {
            for (prop in this.results[i]) {
                val = this.results[i][prop];

                if (!results.hasOwnProperty(prop)) {
                    results[prop] = val;
                } else if (typeof val == "number") {
                    results[prop] += val;
                } else {
                    results[prop] = results[prop] && val;
                }
            }
        }

        return results;
    }
});
