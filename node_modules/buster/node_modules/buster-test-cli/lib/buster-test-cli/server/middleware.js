var fs = require("fs");
var ejs = require("ejs");
var path = require("path");
var buster = require("buster-core");
var captureServer = require("buster-capture-server");
var TEMPLATE_ROOT = path.join(path.dirname(__filename), "../../../templates");
var userAgentParser = require("buster-user-agent-parser");
var resourceSet = require("buster-resources").resourceSet;

function template(name, locals, callback) {
    var templatePath = path.join(TEMPLATE_ROOT, name + ".ejs");

    fs.readFile(templatePath, "utf-8", function (err, data) {
        if (err) throw err;
        callback(ejs.render(data, { locals: locals }));
    });
}

function addHeader(masterOfPuppets) {
    template("header", {}, function (string) {
        var rs = resourceSet.create();
        rs.addResource({ path: "/", content: string });
        masterOfPuppets.header(80, rs);
    });
}

module.exports = {
    create: function (httpServer) {
        var server = Object.create(this);
        server.captureServer = captureServer.create();
        addHeader(server.captureServer);
        if (httpServer) server.captureServer.attach(httpServer);

        server.captureServer.oncapture = function (req, res, slave) {
            res.writeHead(302, { "Location": slave.url });
            res.end();
        };

        server.captureServer.capturePath = "/capture";
        return server;
    },

    respond: function (req, res) {
        if (this.serveTemplate(req, res)) return true;
        return false;
    },

    serveTemplate: function (req, res) {
        if (req.url != "/") return;
        res.writeHead(200, { "Content-Type": "text/html" });

        var slaves = this.captureServer.slaves().map(function (slave) {
            var ua = userAgentParser.parse(slave.userAgent);
            ua.userAgent = slave.userAgent;
            return ua;
        });

        template("index", { slaves: slaves }, function (string) {
            res.end(string);
        });

        return true;
    }
};
