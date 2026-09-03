import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import * as Plot from "@observablehq/plot";

import { renderHtml } from "../src/html.js";
import { buildPlan, parseSpecFile } from "../src/spec.js";
import { loadData } from "../src/load.js";

// Execute the page's inline client script in a jsdom context with the real
// Plot global — proves the client-side reconstruction path actually runs and
// renders, rather than only matching a string.
function executeClientScript(html) {
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  const inline = scripts.find((m) => !m[1].includes("src="));
  if (!inline) throw new Error("no inline client script found");

  const dom = new JSDOM("<!DOCTYPE html><body><div id='chart'></div></body>", { pretendToBeVisual: true });
  const previous = { document: globalThis.document, window: globalThis.window, Plot: globalThis.Plot };
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.Plot = Plot;
  try {
    new Function(inline[2])();
    return dom.window.document.getElementById("chart");
  } finally {
    globalThis.document = previous.document;
    globalThis.window = previous.window;
    globalThis.Plot = previous.Plot;
  }
}

describe("html client script executes", () => {
  it("renders a bar chart from inline flags", () => {
    const rows = loadData("fixtures/report.csv");
    const plan = buildPlan(rows, { mark: "bar", x: "month", y: "traffic" });
    const chart = executeClientScript(renderHtml(plan));
    expect(chart.querySelectorAll("svg").length).toBe(1);
    expect(chart.querySelectorAll("rect[fill]").length).toBe(6);
  });

  it("renders a spec-file chart the same way", () => {
    const plan = parseSpecFile("fixtures/spec-bar.json");
    const chart = executeClientScript(renderHtml(plan));
    expect(chart.querySelectorAll("rect[fill]").length).toBe(6);
  });

  it("executes the interactive (tip) path without throwing", () => {
    const rows = loadData("fixtures/report.csv");
    const plan = buildPlan(rows, { mark: "bar", x: "month", y: "traffic", interactive: true });
    const chart = executeClientScript(renderHtml(plan));
    expect(chart.querySelectorAll("svg").length).toBe(1);
  });

  it("renders the heatmap bin reconstruction", () => {
    const rows = loadData("fixtures/scatter.csv");
    const plan = buildPlan(rows, { mark: "heatmap", x: "visits", y: "conversions" });
    const chart = executeClientScript(renderHtml(plan));
    expect(chart.querySelectorAll("svg").length).toBe(1);
  });
});