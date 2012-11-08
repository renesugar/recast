var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Syntax = require("../lib/syntax");
var Parser = require("../lib/parser").Parser;
var Visitor = require("../lib/visitor").Visitor;

// Make sure we handle all possible node types in Syntax, and no additional
// types that are not present in Syntax.
exports.testCompleteness = function(t) {
    var printer = path.join(__dirname, "../lib/printer.js");

    fs.readFile(printer, "utf-8", function(err, data) {
        assert.ok(!err);

        var parser = new Parser(data);
        var ast = parser.getAst();
        assert.ok(ast);

        var types = {};
        new GenericPrintVisitor(types).visit(ast);

        for (var name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
                assert.ok(types.hasOwnProperty(name), "unhandled type: " + name);
                assert.strictEqual(Syntax[name], types[name]);
                delete types[name];
            }
        }

        for (name in types) {
            assert.fail(name, "not found in Syntax");
        }

        t.finish();
    });
};

var GenericPrintVisitor = Visitor.extend({
    init: function(types) {
        this.types = types;
    },

    visitFunctionDeclaration: function(decl) {
        if (decl.id &&
            decl.id.type === Syntax.Identifier &&
            decl.id.name === "genericPrint")
        {
            new CaseVisitor(this.types).visit(decl);
        }
    }
})

var CaseVisitor = Visitor.extend({
    init: function(types) {
        this.types = types;
    },

    visitSwitchCase: function(expr) {
        var test = expr.test;
        if (test &&
            test.type === Syntax.MemberExpression &&
            test.object.type === Syntax.Identifier &&
            test.object.name === "Syntax" &&
            test.property.type === Syntax.Identifier)
        {
            var name = test.property.name;
            this.types[name] = Syntax[name];
        }
    }
});
