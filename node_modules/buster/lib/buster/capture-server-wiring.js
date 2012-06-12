/*jslint browser: true*/
(function (B) {
    function wireTestRunner(emitter) {
        var runner = B.testRunner.create();
        var reporter = B.reporters.jsonProxy.create(emitter);
        reporter.listen(runner);
        var wiring = B.wire.testRunner(runner);
        B.run = wiring.run;

        emitter.on("tests:run", function (msg) {
            wiring.ready(msg && msg.data);
        });
    }

    B.configureTestClient = function (emitter) {
        var ready, connected;

        function emitReady() {
            if (ready && connected) {
                emitter.emit("ready", navigator.userAgent);
                emitReady = function () {};
            }
        }

        B.ready = function () {
            ready = true;
            emitReady();
        };

        emitter.connect(function () {
            connected = true;
            emitReady(emitter);
        });

        B.wire.uncaughtErrors(emitter);
        B.wire.logger(emitter);
        wireTestRunner(emitter);
    };

    if (B.publish && B.subscribe) {
        var emitter = B.bayeuxEmitter.create(B, {
            id: buster.env.id
        });
        B.emit = B.bind(emitter, "emit");
        B.on = B.bind(emitter, "on");
        B.configureTestClient(emitter);
    }
}(buster));
