import { DependencyGraph, packKey } from "../src/dag/DependencyGraph";
import { GraphInvariantValidator } from "../src/dag/GraphInvariantValidator";
import { Worksheet } from "../src/worksheet";

describe("GraphInvariantValidator standalone contract", () => {
  it("accepts a formula graph whose forward edges, reverse edges, and dirty closure agree", () => {
    const worksheet = new Worksheet("GraphInvariant");
    worksheet.setCellFormula({ row: 1, col: 2 }, "=A1", 3);

    const graph = new DependencyGraph();
    const precedent = packKey(1, 1);
    const formula = packKey(1, 2);
    graph.registerFormulaNode(formula);
    graph.setDependencies(formula, [precedent]);
    graph.markDirty([precedent]);

    expect(() => GraphInvariantValidator.validateAll(graph, worksheet)).not.toThrow();
  });

  it("rejects graph dependencies attached to a cell without a worksheet formula", () => {
    const worksheet = new Worksheet("GraphInvariant");
    const graph = new DependencyGraph();
    const nonFormula = packKey(2, 2);
    graph.registerFormulaNode(nonFormula);
    graph.setDependencies(nonFormula, [packKey(1, 1)]);

    expect(() => GraphInvariantValidator.validateAll(graph, worksheet)).toThrow(
      /ZOMBIE_EDGE/,
    );
  });

  it("rejects dependency edges that disagree with the worksheet formula references", () => {
    const worksheet = new Worksheet("GraphInvariant");
    worksheet.setCellFormula({ row: 1, col: 2 }, "=A1", 3);

    const graph = new DependencyGraph();
    const formula = packKey(1, 2);
    graph.registerFormulaNode(formula);
    graph.setDependencies(formula, [packKey(1, 3)]);

    expect(() => GraphInvariantValidator.validateAll(graph, worksheet)).toThrow(
      /GRAPH_MISMATCH/,
    );
  });

  it("detects a forward/reverse adjacency mismatch through the DEV/TEST validator view", () => {
    const worksheet = new Worksheet("GraphInvariant");
    worksheet.setCellFormula({ row: 1, col: 2 }, "=A1", 3);

    const graph = new DependencyGraph();
    const precedent = packKey(1, 1);
    const formula = packKey(1, 2);
    graph.registerFormulaNode(formula);
    graph.setDependencies(formula, [precedent]);
    graph.markDirty([precedent]);
    // getForwardMap() is explicitly the GraphInvariantValidator DEV/TEST view.
    // EdgeList.delete() constructs the inconsistent graph this validator checks.
    graph.getForwardMap().get(formula)?.delete(precedent);

    expect(() => GraphInvariantValidator.validateAll(graph, worksheet)).toThrow(
      /Missing forward edge/,
    );
  });
});
