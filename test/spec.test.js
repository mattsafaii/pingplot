import { describe, expect, it } from "vitest";

import { buildSpec, MARKS } from "../src/spec.js";
import { PingplotError } from "../src/errors.js";

const data = [
  { month: "Jan", traffic: 10, region: "A", x: 1, y: 5 },
  { month: "Feb", traffic: 25, region: "B", x: 2, y: 8 },
  { month: "Mar", traffic: 18, region: "A", x: 3, y: 4 },
];

describe("buildSpec", () => {
  it("builds a valid Plot spec for every mark", () => {
    const cases = [
      ["bar", { x: "month", y: "traffic" }],
      ["line", { x: "month", y: "traffic" }],
      ["area", { x: "month", y: "traffic" }],
      ["dot", { x: "region", y: "traffic" }],
      ["box", { x: "region", y: "traffic" }],
      ["heatmap", { x: "x", y: "y" }],
      ["rule", { y: "traffic" }],
      ["funnel", { x: "traffic", y: "month" }],
      ["sparkline", { x: "month", y: "traffic" }],
    ];
    for (const [mark, channels] of cases) {
      const spec = buildSpec(data, { mark, ...channels });
      expect(Array.isArray(spec.marks), `${mark} has marks`).toBe(true);
      expect(spec.marks.length).toBeGreaterThan(0);
    }
  });

  it("maps --color-range to the color scale's range", () => {
    const spec = buildSpec(data, { mark: "bar", x: "month", y: "traffic", colorRange: ["#1d4ed8", "#0f766e"] });
    expect(spec.color).toEqual({ range: ["#1d4ed8", "#0f766e"] });
  });

  it("leaves the color scale alone without --color-range", () => {
    const spec = buildSpec(data, { mark: "bar", x: "month", y: "traffic" });
    expect(spec.color).toBeUndefined();
  });

  it("enables tip only when interactive", () => {
    const plain = buildSpec(data, { mark: "bar", x: "month", y: "traffic" });
    expect(plain.marks[0].tip).toBeNull();
    const interactive = buildSpec(data, { mark: "bar", x: "month", y: "traffic", interactive: true });
    expect(interactive.marks[0].tip).toBeTruthy();
  });

  it("returns a donut sentinel for the donut mark", () => {
    const spec = buildSpec(data, { mark: "donut", x: "month", y: "traffic" });
    expect(spec.donut).toEqual({ rows: data, x: "month", y: "traffic", range: null });
  });

  it("surfaces a missing required channel", () => {
    expect(() => buildSpec(data, { mark: "bar", x: "month" })).toThrow(/needs a --y field/);
  });

  it("surfaces a missing field", () => {
    expect(() => buildSpec(data, { mark: "bar", x: "nope", y: "traffic" })).toThrow(/not found in data/);
  });

  it("surfaces a non-numeric channel where a number is required", () => {
    expect(() => buildSpec(data, { mark: "bar", x: "month", y: "region" })).toThrow(
      /expects a numeric --y field/,
    );
  });

  it("surfaces an unknown mark", () => {
    expect(() => buildSpec(data, { mark: "pie", x: "month", y: "traffic" })).toThrow(/unknown mark/);
  });

  it("surfaces empty data", () => {
    expect(() => buildSpec([], { mark: "bar", x: "month", y: "traffic" })).toThrow(/no data rows/);
  });

  it("exports the full mark list", () => {
    expect(MARKS).toEqual(
      expect.arrayContaining(["bar", "line", "area", "dot", "donut", "box", "heatmap", "rule", "funnel", "sparkline"]),
    );
  });
});

describe("contract errors", () => {
  it("throws PingplotError, not a generic error", () => {
    try {
      buildSpec(data, { mark: "bar", x: "month", y: "region" });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PingplotError);
    }
  });
});