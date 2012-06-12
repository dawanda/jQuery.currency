var buster = require("buster");
var analyzer = require("../lib/buster-analyzer").analyzer;

buster.testCase("AnalyzerTest", {
    setUp: function () {
        this.analyzer = analyzer.create();
        this.listener = this.spy();
    },

    "emits fatal event": function () {
        this.analyzer.on("fatal", this.listener);
        this.analyzer.fatal("Oh", { id: 42 });

        assert.calledOnceWith(this.listener, "Oh", { id: 42 });
    },

    "emits error event": function () {
        this.analyzer.on("error", this.listener);
        this.analyzer.error("Oh", { id: 42 });

        assert.calledOnceWith(this.listener, "Oh", { id: 42 });
    },

    "emits warning event": function () {
        this.analyzer.on("warning", this.listener);
        this.analyzer.warning("Oh", { id: 42 });

        assert.calledOnceWith(this.listener, "Oh", { id: 42 });
    },

    "failOn": {
        "throws when setting non-existent level": function () {
            assert.exception(function () {
                this.analyzer.failOn("bogus");
            }.bind(this));
        },

        "does not throw when setting existent levels": function () {
            refute.exception(function () {
                this.analyzer.failOn("warning");
                this.analyzer.failOn("error");
                this.analyzer.failOn("fatal");
            }.bind(this));
        }
    },

    "status": {
        "is not failed by default": function () {
            refute(this.analyzer.status().failed);
        },

        "is not failed after error": function () {
            this.analyzer.error("Uh-oh");
            refute(this.analyzer.status().failed);
        },

        "is not failed after warning": function () {
            this.analyzer.warning("Uh-oh");
            refute(this.analyzer.status().failed);
        },

        "fails when receiving a fatal event": function () {
            this.analyzer.fatal("Oh noes");

            assert(this.analyzer.status().failed);
        },

        "failOn(error)": {
            setUp: function () {
                this.analyzer.failOn("error");
            },

            "fails on error": function () {
                this.analyzer.error("Oh noes");

                assert(this.analyzer.status().failed);
            },

            "fails on fatal": function () {
                this.analyzer.fatal("Oh noes");

                assert(this.analyzer.status().failed);
            },

            "does not fail on warning": function () {
                this.analyzer.warning("Oh noes");

                refute(this.analyzer.status().failed);
            }
        },

        "failOn(warning)": {
            setUp: function () {
                this.analyzer.failOn("warning");
            },

            "fails on error": function () {
                this.analyzer.error("Oh noes");

                assert(this.analyzer.status().failed);
            },

            "fails on fatal": function () {
                this.analyzer.fatal("Oh noes");

                assert(this.analyzer.status().failed);
            },

            "fails on warning": function () {
                this.analyzer.warning("Oh noes");

                assert(this.analyzer.status().failed);
            }
        }
    },

    "status includes stats": function () {
        this.analyzer.fatal("Ding!");
        this.analyzer.fatal("Dong!");
        this.analyzer.error("Ding!");
        this.analyzer.error("Dong!");
        this.analyzer.error("Poing!");
        this.analyzer.warning("Ding!");
        this.analyzer.warning("Dong!");
        this.analyzer.warning("Poing!");
        this.analyzer.warning("Pooong!");

        assert.equals(this.analyzer.status(), {
            failed: true,
            fatals: 2,
            errors: 3,
            warnings: 4
        });
    },

    "emits fail on first fatal": function () {
        var callback = this.stub();
        this.analyzer.on("fail", callback);

        this.analyzer.fatal("Oh noes", {});

        assert.calledOnce(callback);
        assert.calledWith(callback, this.analyzer.status());
    },

    "does not emit fail on second fatal": function () {
        var callback = this.stub();
        this.analyzer.on("fail", callback);

        this.analyzer.fatal("Oh noes", {});
        this.analyzer.fatal("Srsly", {});

        assert.calledOnce(callback);
    },

    "does not emit fail on non-fatal event": function () {
        var callback = this.stub();
        this.analyzer.on("fail", callback);

        this.analyzer.warning("Oh noes", {});

        refute.called(callback);
    },

    "emits fail on first fail when failOn warning": function () {
        this.analyzer.failOn("warning");
        var callback = this.stub();
        this.analyzer.on("fail", callback);

        this.analyzer.warning("Oh noes", {});

        assert.calledOnce(callback);
        assert.calledWith(callback, this.analyzer.status());
    },

    "emits warning induced fail only once": function () {
        this.analyzer.failOn("warning");
        var callback = this.stub();
        this.analyzer.on("fail", callback);

        this.analyzer.warning("Oh noes", {});
        this.analyzer.error("Oh noes", {});
        this.analyzer.fatal("Oh noes", {});

        assert.calledOnce(callback);
    },

    "emits fail on first fail when failOn error": function () {
        this.analyzer.failOn("error");
        var callback = this.stub();
        this.analyzer.on("fail", callback);

        this.analyzer.error("Oh noes", {});

        assert.calledOnce(callback);
        assert.calledWith(callback, this.analyzer.status());
    },

    "emits error induced fail only once": function () {
        this.analyzer.failOn("error");
        var callback = this.stub();
        this.analyzer.on("fail", callback);

        this.analyzer.error("Oh noes", {});
        this.analyzer.warning("Oh noes", {});
        this.analyzer.fatal("Oh noes", {});

        assert.calledOnce(callback);
    }
});
