import { describe, expect, it } from "vitest";

import { buildPlan } from "../src/spec.js";
import { renderToSvg } from "../src/render.js";
import { loadData } from "../src/load.js";
import { MARKS } from "../src/spec.js";

// Mirrors catalog.md: every entry, its committed fixture, and the flags that
// satisfy its data contract.
const CATALOG = [
  { mark: "bar", fixture: "fixtures/report.csv", args: { x: "month", y: "traffic" } },
  { mark: "line", fixture: "fixtures/report.csv", args: { x: "month", y: "traffic" } },
  { mark: "area", fixture: "fixtures/report.csv", args: { x: "month", y: "traffic" } },
  { mark: "dot", fixture: "fixtures/scatter.csv", args: { x: "visits", y: "conversions" } },
  { mark: "donut", fixture: "fixtures/report.csv", args: { x: "month", y: "traffic" } },
  { mark: "box", fixture: "fixtures/regions.csv", args: { x: "region", y: "traffic" } },
  { mark: "heatmap", fixture: "fixtures/scatter.csv", args: { x: "visits", y: "conversions" } },
  { mark: "rule", fixture: "fixtures/report.csv", args: { y: "traffic" } },
  { mark: "funnel", fixture: "fixtures/funnel.csv", args: { x: "value", y: "stage" } },
  { mark: "sparkline", fixture: "fixtures/report.csv", args: { x: "month", y: "traffic" } },
];

describe("catalog", () => {
  it("every catalog entry exists in the mark list", () => {
    for (const entry of CATALOG) {
      expect(MARKS).toContain(entry.mark);
    }
  });

  it("every catalog entry renders from its committed fixture", () => {
    for (const entry of CATALOG) {
      const rows = loadData(entry.fixture);
      const plan = buildPlan(rows, { mark: entry.mark, ...entry.args });
      const svg = renderToSvg(plan);
      expect(svg.length, `${entry.mark} produces output`).toBeGreaterThan(500);
      expect(svg, `${entry.mark} renders an svg`).toMatch(/^<svg/);
    }
  });

  it("every catalog entry renders a real image via the png pipeline", async () => {
    const sharp = (await import("sharp")).default;
    for (const entry of CATALOG) {
      const rows = loadData(entry.fixture);
      const plan = buildPlan(rows, { mark: entry.mark, ...entry.args });
      const png = await sharp(Buffer.from(renderToSvg(plan))).png().toBuffer();
      expect(png.subarray(1, 4).toString(), `${entry.mark} is a png`).toBe("PNG");
    }
  }, 30000);
});