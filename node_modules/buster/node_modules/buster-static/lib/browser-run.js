/*jslint browser: true*/
(function (B) {
    var runner = B.testRunner.create();
    var reporter = B.reporters.html.create({root: document.body});
    reporter.listen(runner);
    buster.assertions.throwOnFailure = false;
    runner.runSuite(buster.testContext.compile(buster.contextsForStatic));
}(buster));