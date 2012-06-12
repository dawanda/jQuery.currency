var http = require("http");

function proxyBackendResponse(proxy, backendRequest, response) {
    backendRequest.on("response", function (res) {
        response.writeHead(res.statusCode, proxy.getHeaders(res));
        res.on("data", function (chunk) { response.write(chunk); });
        res.on("end", function () { response.end(); });
    });
}

exports.create = function (host, port, path) {
    path = (path || "").replace(/\/?$/, "");
    var proxyPath = "", proxyPathRegexp = "";
    var contextPathRegexp = new RegExp("^" + path);

    return {
        host: host,
        port: port,
        path: path,

        getProxyPath: function () {
            return proxyPath;
        },

        setProxyPath: function (ppath) {
            proxyPath = this.proxyPath = (ppath || "").replace(/\/?$/, "");
            proxyPathRegexp = new RegExp("^" + proxyPath);
        },

        respond: function (req, res) {
            var backendRequest = http.request({
                host: host,
                port: port,
                method: req.method,
                headers: req.headers,
                path: path + req.url.replace(proxyPathRegexp, "")
            });

            req.on("data", function (chunk) { backendRequest.write(chunk); });
            req.on("end", function () {
                backendRequest.end();
                proxyBackendResponse(this, backendRequest, res);
            }.bind(this));

            backendRequest.on("error", function () {
                res.writeHead(503, { "Content-Type": "text/plain" });
                res.end("Proxy server at http://" + host + ":" + port +
                        path + " is unavailable");
            });
        },

        getHeaders: function (response) {
            var headers = response.headers;
            var location = headers.location;

            if (location) {
                location = proxyPath + headers.location;
                headers.location = location.replace(contextPathRegexp, "");
            }

            return headers;
        }
    };
};
