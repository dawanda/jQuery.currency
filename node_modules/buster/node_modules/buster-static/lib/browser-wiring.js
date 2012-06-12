(function (B) {
    B.contextsForStatic = [];
    B.addTestContext = function (context) {
        B.contextsForStatic.push(context);
    };
    B.testCase.onCreate = B.addTestContext;
    B.spec.describe.onCreate = B.addTestContext;
}(buster));