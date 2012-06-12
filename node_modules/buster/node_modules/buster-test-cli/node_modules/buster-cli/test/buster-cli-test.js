var buster = require("buster");
var busterEventedLogger = require("buster-evented-logger");
var assert = buster.assert;
var refute = buster.refute;
var busterCli = require("../lib/buster-cli");
var cliHelper = require("../lib/test-helper");

buster.testCase("buster-cli", {
    setUp: function () {
        this.cli = busterCli.create();
    },

    "has logger": function () {
        assert(busterEventedLogger.isPrototypeOf(this.cli.logger));
    },

    "runs without callback": function () {
        cliHelper.mockLogger(this);
        this.cli.run(["--help"]);
        assert(true);
    },

    "generic help output": {
        setUp: function () {
            cliHelper.mockLogger(this);
        },

        "includes mission statement": function (done) {
            var self = this;
            var statement = "A small CLI that only lives in the test suite.";
            this.cli.missionStatement = statement;
            this.cli.run(["--help"], done(function () {
                assert.match(self.stdout, statement);
            }));
        },

        "includes description": function (done) {
            var self = this;
            var desc = "How about that.";
            this.cli.description = desc;
            this.cli.run(["--help"], done(function () {
                assert.match(self.stdout, desc);
            }));
        },

        "lists help output for all options, including --help": function (done) {
            var self = this;
            var portOpt = this.cli.opt("-p", "--port", "Help text is here.");

            this.cli.run(["--help"], done(function () {
                assert.match(self.stdout, /-h\/--help \s*Show this message\./);
                assert.match(self.stdout, /-p\/--port \s*Help text is here\./);
            }));
        }
    },

    "log levels": {
        setUp: function () {
            cliHelper.mockLogger(this);
        },

        "set to log by default": function (done) {
            this.cli.onRun = function () {
                this.logger.info("Yo man");
                this.logger.log("Hey");
            };

            cliHelper.run(this, [], done(function () {
                refute.stdout("Yo man");
                assert.stdout("Hey");
            }));
        },

        "set to info with --log-level": function (done) {
            this.cli.onRun = function () {
                this.logger.info("Yo man");
                this.logger.log("Hey");
            };

            cliHelper.run(this, ["--log-level", "info"], done(function () {
                assert.stdout("Yo man");
            }));
        },

        "include --log-level in help output": function (done) {
            cliHelper.run(this, ["-h"], done(function () {
                assert.stdout("-l/--log-level");
                assert.stdout("Set logging level");
            }));
        },

        "fail if providing -l without argument": function (done) {
            cliHelper.run(this, ["-l"], done(function () {
                assert.stderr("No value specified");
            }));
        },

        "fails if providing illegal logging level": function (done) {
            cliHelper.run(this, ["-l", "dubious"], done(function () {
                assert.stderr("one of [error, warn, log, info, debug], " +
                              "got dubious");
            }));
        },
        
        "sets to info with -v": function (done) {
            this.cli.onRun = function () {
                this.logger.debug("Yo man");
                this.logger.info("Hey");
            };

            cliHelper.run(this, ["-v"], done(function () {
                refute.stdout("Yo man");
                assert.stdout("Hey");
            }));
        },

        "sets to debug with -vv": function (done) {
            this.cli.onRun = function () {
                this.logger.debug("Yo man");
                this.logger.info("Hey");
            };

            cliHelper.run(this, ["-vv"], done(function () {
                assert.stdout("Yo man");
            }));
        },

        "fails if setting -v more than twice": function (done) {
            cliHelper.run(this, ["-vvv"], done(function () {
                assert.stderr("-v can only be set two times.");
            }));
        }
    },

    "option": {
        setUp: function () {
            this.port = this.cli.opt("-p", "--port", "Help text is here.", {});
        },

        "is addressable by short key": function (done) {
            this.cli.run(["-p"], done(function () {
                assert(this.port.isSet);
            }.bind(this)));
        },

        "is addressable by long key": function (done) {
            this.cli.run(["--port"], done(function () {
                assert(this.port.isSet);
            }.bind(this)));
        }
    },

    "calls 'loadOptions' once if present": function (done) {
        cliHelper.mockLogger(this);
        this.cli.loadOptions = this.spy();

        this.cli.run(["--help"], function () {
            this.cli.run(["--help"], done(function () {
                assert(this.cli.loadOptions.calledOnce);
            }.bind(this)));
        }.bind(this));
    },

    "help topics": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.cli.helpTopics = {
                "topic": "This is the text for the topic.",
                "other": "Another topic"
            };
        },

        "is listed with the description of --help": function (done) {
            this.cli.run(["--help"], done(function () {
                assert.match(this.stdout, "See also --help [topic,other].");
            }.bind(this)));
        },

        "prints topic help with --help sometopic": function (done) {
            this.cli.run(["--help", "topic"], done(function () {
                assert.equals(this.stdout, "This is the text for the topic.\n");
            }.bind(this)));
        },

        "prints error message with --help noneexistingtopic": function (done) {
            this.cli.run(["--help", "doesnotexist"], done(function () {
                assert.equals(this.stderr, "No such help topic " +
                              "'doesnotexist'. Try without a specific help " +
                              "topic, or one of: topic,other.\n");
            }.bind(this)));
        },

        "prints topic unwrapped when just one topic": function (done) {
            var self = this;

            this.cli.helpTopics = {
                "topic": "This is the text for the topic."
            };

            this.cli.run(["--help"], done(function () {
                assert.match(self.stdout, "See also --help topic.");
            }.bind(this)));
        },

        "should not print topic information when no topics": function (done) {
            this.cli.helpTopics = {};
            this.cli.run(["--help"], done(function () {
                refute.match(this.stdout, "See also --help [].");
            }.bind(this)));
        }
    },

    "option restricted to list of values": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.aaaOpt = this.cli.opt("-a", "--aaa", "Aaaaa!", {
                values: ["foo", "bar", "baz"]
            });
        },

        "lists available options in help output": function (done) {
            this.cli.run(["--help"], done(function () {
                assert.match(this.stdout, "One of foo, bar, baz.");
            }.bind(this)));
        },

        "gets value set when value passed to it": function (done) {
            this.cli.run(["-a", "bar"], done(function () {
                assert.equals(this.aaaOpt.value, "bar");
            }.bind(this)));
        },

        "errors when getting a value not in the list": function (done) {
            this.cli.run(["-a", "lolcat"], done(function () {
                // The actual error message comes from buster-args.
                // TODO: Find a better way to test the error msg here.
                refute.equals(this.stderr, "");
            }.bind(this)));
        }
    },

    "option with default value": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.aaaOpt = this.cli.opt("-f", "--ffff", "Fffffuuu", {
                defaultValue: "DRM"
            });
        },

        "prints default value in help text": function (done) {
            this.cli.run(["--help"], done(function () {
                assert.match(this.stdout, "Default is DRM.");
            }.bind(this)));
        },

        "should have default value": function (done) {
            var self = this;
            this.cli.run([], function () {
                assert.equals(self.aaaOpt.value, "DRM");
                done();
            });
        },

        "should provide overridden value": function (done) {
            var self = this;
            this.cli.run(["-f", "gaming consoles"], function () {
                assert.equals(self.aaaOpt.value, "gaming consoles");
                done();
            });
        },

        " should fail with no value": function (done) {
            // Not failing. Probably a flaw in buster-args.
            var self = this;
            this.cli.run(["-f"], function () {
                refute.equals(self.stderr, "");
                done();
            });
        }
    },

    "option with value": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.someOpt = this.cli.opt("-s", "--ss", "A creeper.", {
                hasValue: true
            });
        },

        "should get value assigned": function (done) {
            var self = this;
            this.cli.run(["-s", "ssssssBOOOOOM!"], function () {
                assert.equals(self.someOpt.value, "ssssssBOOOOOM!");
                done();
            });
        }
    },

    "option with validator": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.anOpt = this.cli.opt("-c", "--character", "The character.", {
                validators: {"required": "Here's a custom error msg."}
            });
        },

        "should perform validation": function (done) {
            var self = this;
            this.cli.run([], function () {
                assert.match(self.stderr, "Here's a custom error msg.");
                done();
            });
        }
    },

    "operand": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.fooOpd = this.cli.opd("Foo", "Does a foo.");
        },

        "should be listed in --help output": function (done) {
            var self = this;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, /Foo + {3}Does a foo/);
                done();
            });
        },

        "should get value assigned": function (done) {
            var self = this;
            this.cli.run(["some value"], function () {
                assert.equals(self.fooOpd.value, "some value");
                done();
            });
        }
    },

    "should call onRun when there are no errors": function (done) {
        this.cli.onRun = done(function () {
            assert(true);
        });

        this.cli.run([], function () {});
    },

    "should not call onRun when there are errors": function () {
        var self = this;
        cliHelper.mockLogger(this);
        this.cli.onRun = this.spy();
        var someOpt = this.cli.opt("-a", "--aa", "Aaaaa");
        someOpt.addValidator(function (arg, promise) {
            promise.reject("An error.");
        });
        this.cli.run(["-a"], function () {
            refute(self.cli.onRun.called);
            done();
        });
    },

    "panicking": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.stub(process, "exit");
        },

        "should logg to stderr": function (done) {
            var self = this;

            this.cli.onRun = function () {
                this.err("Uh-oh! Trouble!");
            };

            this.cli.run([], function () {
                assert.equals(self.stdout, "");
                assert.match(self.stderr, "Uh-oh! Trouble!");
                done();
            });
        }
    },

    "configuration": {
        setUp: function () {
            cliHelper.cdFixtures();
            cliHelper.mockLogger(this);
            this.cli.addConfigOption();
        },

        tearDown: function (done) {
            var mod;
            for (mod in require.cache) {
                if (/fixtures/.test(mod)) {
                    delete require.cache[mod];
                }
            }
            cliHelper.clearFixtures(done);
        },

        "fails if config does not exist": function (done) {
            this.cli.run(["-c", "file.js"], function () {
                this.cli.onConfig(done(function (err) {
                    assert.match(err.message, "-c/--config: file.js did not match any files");
                }.bind(this)));
            }.bind(this));
        },

        "fails if config is a directory": function (done) {
            cliHelper.mkdir("buster");

            this.cli.run(["-c", "buster"], function () {
                this.cli.onConfig(done(function (err) {
                    assert.match(err.message, "-c/--config: buster did not match any files");
                }.bind(this)));
            }.bind(this));
        },

        "fails if default config does not exist": function (done) {
            this.cli.run([], function () {
                this.cli.onConfig(done(function (err) {
                    assert(err);
                    assert.match(err.message,
                                 "-c/--config not provided, and none of\n" +
                                 "[buster.js, test/buster.js, spec/buster.js]" +
                                 " exists");
                }));
            }.bind(this));
        },

        "fails if config contains errors": function (done) {
            cliHelper.writeFile("buster.js", "modul.exports");

            this.cli.run(["-c", "buster.js"], done(function () {
                this.cli.onConfig(function (err) {
                    assert.match(err.message,
                                 "Error loading configuration buster.js");
                    assert.match(err.message, "modul is not defined");
                    assert.match(err.stack, /\d+:\d+/);
                });
            }.bind(this)));
        },

        "fails if configuration has no groups": function (done) {
            cliHelper.writeFile("buster.js", "");

            this.cli.run([], function () {
                this.cli.onConfig(done(function (err) {
                    assert(err);
                    assert.match(err.message,
                                 "buster.js contains no configuration");
                }));
            }.bind(this));
        },

        "configuration with --config": {
            setUp: function () {
                var json = JSON.stringify({
                    "Node tests": { environment: "node" },
                    "Browser tests": { environment: "browser" }
                });

                cliHelper.writeFile("buster.js", "module.exports = " + json);
                cliHelper.writeFile("buster2.js", "module.exports = " + json);
            },

            "loads configuration": function (done) {
                var self = this;
                this.cli.run(["-c", "buster.js"], function () {
                    this.cli.onConfig(done(function (err, config) {
                        assert.defined(config);
                    }));
                }.bind(this));
            },

            "loads multiple configuration files": function (done) {
                var self = this;
                this.cli.run(["-c", "buster.js,buster2.js"], function () {
                    this.cli.onConfig(done(function (err, config) {
                        assert.equals(config.groups.length, 4);
                    }));
                }.bind(this));
            }
        },

        "smart configuration loading": {
            setUp: function () {
                cliHelper.mkdir("somewhere/nested/place");
                this.assertConfigLoaded = function (done) {
                    this.cli.run([], function () {
                        this.cli.onConfig(function (err) {
                            refute.defined(err);
                            done();
                        });
                    }.bind(this));
                };
            },

            tearDown: cliHelper.clearFixtures,

            "with config in root directory": {
                setUp: function () {
                    var cfg = { environment: "node" };
                    cliHelper.writeFile("buster.js", "module.exports = " +
                                        JSON.stringify({ "Node tests": cfg }));
                },

                "finds configuration in parent directory": function (done) {
                    process.chdir("somewhere");
                    this.assertConfigLoaded(done);
                },

                "finds configuration three levels down": function (done) {
                    process.chdir("somewhere/nested/place");
                    this.assertConfigLoaded(done);
                }
            },

            "with config in root/test directory": {
                setUp: function () {
                    var cfg = { environment: "node" };
                    cliHelper.mkdir("test");
                    cliHelper.writeFile("test/buster.js", "module.exports = " +
                                        JSON.stringify({ "Node tests": cfg }));
                },

                "finds configuration in parent directory": function (done) {
                    process.chdir("somewhere");
                    this.assertConfigLoaded(done);
                },

                "finds configuration three levels down": function (done) {
                    process.chdir("somewhere/nested/place");
                    this.assertConfigLoaded(done);
                }
            }
        },

        "config groups": {
            setUp: function () {
                var json = JSON.stringify({
                    "Node tests": { environment: "node" },
                    "Browser tests": { environment: "browser" }
                });
                cliHelper.writeFile("buster.js", "module.exports = " + json);
            },

            tearDown: cliHelper.clearFixtures,

            "should only yield config for provided group": function (done) {
                var self = this;

                this.cli.run(["-g", "Browser tests"], function () {
                    this.cli.onConfig(done(function (err, config) {
                        assert.equals(config.groups.length, 1);
                        assert.equals(config.groups[0].name, "Browser tests");
                    }));
                }.bind(this));
            },

            "only yields config for fuzzily matched group": function (done) {
                var self = this;
                this.cli.run(["-g", "browser"], function () {
                    this.cli.onConfig(done(function (err, config) {
                        assert.equals(config.groups.length, 1);
                        assert.equals(config.groups[0].name, "Browser tests");
                    }));
                }.bind(this));
            },

            "fails if no groups match": function (done) {
                this.cli.run(["-g", "stuff"], function () {
                    this.cli.onConfig(done(function (err, config) {
                        assert.match(err.message,
                                     "buster.js contains no configuration " +
                                     "groups that matches 'stuff'");
                        assert.match(err.message, "Try one of");
                        assert.match(err.message, "Browser tests");
                        assert.match(err.message, "Node tests");
                    }));
                }.bind(this));
            }
        },

        "config environments": {
            setUp: function () {
                var json = JSON.stringify({
                    "Node tests": { environment: "node" },
                    "Browser tests": { environment: "browser" }
                });
                cliHelper.writeFile("buster.js", "module.exports = " + json);
            },

            "only yields config for provided environment": function (done) {
                var self = this;
                this.cli.run(["-e", "node"], function () {
                    this.cli.onConfig(done(function (err, config) {
                        assert.equals(config.groups.length, 1);
                        assert.equals(config.groups[0].name, "Node tests");
                    }));
                }.bind(this));
            },

            "matches config environments with --environment": function (done) {
                var self = this;

                this.cli.run(["--environment", "browser"], function () {
                    this.cli.onConfig(done(function (err, config) {
                        assert.equals(config.groups.length, 1);
                        assert.equals(config.groups[0].name, "Browser tests");
                    }));
                }.bind(this));
            },

            "fails if no environments match": function (done) {
                this.cli.run(["-e", "places"], function () {
                    this.cli.onConfig(done(function (err, config) {
                        assert(err);
                        assert.match(err.message,
                                     "buster.js contains no configuration " +
                                     "groups for environment 'places'");
                        assert.match(err.message, "Try one of");
                        assert.match(err.message, "browser");
                        assert.match(err.message, "node");
                    }));
                }.bind(this));
            },

            "fails if no groups match environment and group": function (done) {
                this.cli.run(["-e", "node", "-g", "browser"], function () {
                    this.cli.onConfig(done(function (err) {
                        assert(err);
                        assert.match(err.message,
                                     "buster.js contains no configuration " +
                                     "groups for environment 'node' that " +
                                     "matches 'browser'");
                        assert.match(err.message, "Try one of");
                        assert.match(err.message, "Node tests (node)");
                        assert.match(err.message, "Browser tests (browser)");
                    }));
                }.bind(this));
            }
        },

        "config files": {
            setUp: function () {
                var json = JSON.stringify({
                    "Node tests": {
                        environment: "node",
                        sources: ["src/1.js"],
                        tests: ["test/**/*.js"]
                    }
                });
                cliHelper.writeFile("buster.js", "module.exports = " + json);

                cliHelper.writeFile("src/1.js", "Src #1");
                cliHelper.writeFile("test/1.js", "Test #1");
                cliHelper.writeFile("test/2.js", "Test #2");
                cliHelper.writeFile("test/other/1.js", "Other test #1");
                cliHelper.writeFile("test/other/2.js", "Other test #2");
            },

            tearDown: cliHelper.clearFixtures,

            "strips unmatched files in tests": function (done) {
                this.cli.run(["--tests", "test/1.js"], function () {
                    this.cli.onConfig(function (err, config) {
                        config.groups[0].resolve().then(done(function (rs) {
                            assert.equals(rs.loadPath.paths().length, 2);
                            refute.defined(rs.get("test2.js"));
                        }));
                    });
                }.bind(this));
            },

            "matches directories in tests": function (done) {
                this.cli.run(["--tests", "test/other/**"], function () {
                    this.cli.onConfig(function (err, config) {
                        config.groups[0].resolve().then(done(function (rs) {
                            assert.equals(rs.loadPath.paths().length, 3);
                            assert.defined(rs.get("test/other/1.js"));
                            refute.defined(rs.get("test/2.js"));
                        }));
                    });
                }.bind(this));
            },

            "fails on non-existent tests": "Don't know where to do this - " +
                "the error spawns in the load:tests handler.\nMust keep " +
                "state to handle properly(?)",

            "resolves relative paths": function (done) {
                process.chdir("..");
                this.cli.run(["-c", "fixtures/buster.js",
                              "--tests", "fixtures/test/1.js"], function () {
                    this.cli.onConfig(function (err, config) {
                        config.groups[0].resolve().then(done(function (rs) {
                            assert.equals(rs.loadPath.paths().length, 2);
                            refute.defined(rs.get("test2.js"));
                        }));
                    });
                }.bind(this));
            },

            "//finds config in dir specified by --tests": function (done) {
                process.chdir("..");
                this.cli.run(["--tests", "fixtures/test/1.js"], function () {
                    this.cli.onConfig(function (err, config) {
                        config.resolveGroups(done(function (err, groups) {
                            var rs = groups[0].resourceSet;
                            assert.equals(rs.loadPath.paths().length, 2);
                            refute.defined(rs.get("test2.js"));
                        }));
                    });
                }.bind(this));
            }
        }
    },

    "configuration with specified environment": {
        setUp: function () {
            cliHelper.cdFixtures();
            cliHelper.mockLogger(this);
            var json = JSON.stringify({
                "Node tests": { environment: "node" },
                "Browser tests": { environment: "browser" }
            });
            cliHelper.writeFile("buster.js", "module.exports = " + json);
        },

        "set to browser": {
            setUp: function () {
                this.cli.addConfigOption("browser");
            },

            "should only contain browser groups": function (done) {
                var self = this;
                this.cli.run([], function () {
                    self.cli.onConfig(done(function (err, config) {
                        assert.equals(config.groups.length, 1);
                        assert.equals(config.groups[0].environment, "browser");
                    }));
                });
            }
        },

        "set to node": {
            setUp: function () {
                this.cli.addConfigOption("node");
            },

            "should only contain node groups": function (done) {
                var self = this;
                this.cli.run([], function () {
                    self.cli.onConfig(done(function (err, config) {
                        assert.equals(config.groups.length, 1);
                        assert.equals(config.groups[0].environment, "node");
                    }));
                });
            }
        }
    },

    "cli customization": {
        setUp: function () {
            this.busterOpt = process.env.BUSTER_OPT;
        },

        tearDown: function () {
            process.env.BUSTER_OPT = this.busterOpt;
        },

        "adds command-line options set with environment variable": function () {
            var stub = this.stub(this.cli.args, "handle");
            this.cli.environmentVariable = "BUSTER_OPT";
            process.env.BUSTER_OPT = "--color none -r specification";

            this.cli.run([]);

            assert.calledWith(stub, ["--color", "none", "-r", "specification"]);
        },

        "does not add cli options when no env variable is set": function () {
            var stub = this.stub(this.cli.args, "handle");
            process.env.BUSTER_OPT = "--color none -r specification";

            this.cli.run([]);

            assert.calledWith(stub, []);
        }
    }
});
