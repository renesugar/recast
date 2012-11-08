var Visitor = require("../lib/visitor").Visitor,
    Syntax = require("../lib/syntax"),
    Parser = require("../lib/parser").Parser,
    Printer = require("../lib/printer").Printer;

var lines = [
    "// file comment",
    "exports.foo({",
    "    // some comment",
    "    bar: 42,",
    "    baz: this",
    "});"
];

exports.testVisitor = function(t, assert) {
    var source = lines.join("\n"),
        parser = new Parser(source),
        printer = new Printer(parser),
        ast = parser.getAst(),
        withThis = printer.print(ast).toString(),
        thisExp = /\bthis\b/g;

    assert.ok(thisExp.test(withThis));

    new ThisReplacer().visit(ast);

    assert.strictEqual(
        printer.print(ast).toString(),
        withThis.replace(thisExp, "self"));

    var bc = new BazChecker;

    bc.visit(ast);

    assert.deepEqual(bc.propNames, ["bar", "baz"]);

    new BazRemover().visit(ast);

    bc.clear();
    bc.visit(ast);

    assert.deepEqual(bc.propNames, ["bar"]);

    t.finish();
};

var ThisReplacer = Visitor.extend({
    visitThisExpression: function(expr) {
        return { type: Syntax.Identifier,
                 name: "self" };
    }
});

var BazChecker = Visitor.extend({
    init: function() {
        this.propNames = [];
    },

    clear: function() {
        this.propNames.length = 0;
    },

    visitProperty: function(prop) {
        var key = prop.key;
        this.propNames.push(key.value || key.name);
    }
});

var BazRemover = Visitor.extend({
    visitIdentifier: function(id) {
        if (id.name === "self")
            this.remove();
    }
});

exports.testReindent = function(t, assert) {
    var lines = [
        "a(b(c({",
        "    m: d(function() {",
        "        if (e('y' + 'z'))",
        "            f(42).h()",
        "                 .i()",
        "                 .send();",
        "        g(8);",
        "    })",
        "})));"],

        altered = [
        "a(xxx(function() {",
        "    if (e('y' > 'z'))",
        "        f(42).h()",
        "             .i()",
        "             .send();",
        "    g(8);",
        "}, c(function() {",
        "    if (e('y' > 'z'))",
        "        f(42).h()",
        "             .i()",
        "             .send();",
        "    g(8);",
        "})));"],

        source = lines.join("\n"),
        parser = new Parser(source),
        printer = new Printer(parser),
        ast = parser.getAst();

    var ff = new FunctionFinder;
    ff.visit(ast);

    new ObjectReplacer(ff.funExpr).visit(ast);

    assert.strictEqual(
        altered.join("\n"),
        printer.print(ast).toString());

    t.finish();
};

var FunctionFinder = Visitor.extend({
    visitFunctionExpression: function(expr) {
        this.funExpr = expr;
        this.genericVisit(expr);
    },

    visitBinaryExpression: function(expr) {
        expr.operator = ">";
    }
});

var ObjectReplacer = Visitor.extend({
    init: function(replacement) {
        this.replacement = replacement;
    },

    visitCallExpression: function(expr) {
        this.genericVisit(expr);

        if (expr.callee.type === Syntax.Identifier &&
            expr.callee.name === "b")
        {
            expr.callee.name = "xxx";
            expr["arguments"].unshift(this.replacement);
        }
    },

    visitObjectExpression: function(expr) {
        return this.replacement;
    }
});