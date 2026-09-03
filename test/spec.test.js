import { describe, expect, it } from "vitest";

import { buildPlan, specFromPlan, MARKS } from "../src/spec.js";
import { PingplotError } from "../src/errors.js";

const data = [
  { month: "Jan", traffic: 10, region: "A", x: 1, y: 5 },
  { month: "Feb", traffic: 25, region: "B", x: 2, y: 8 },
  { month: "Mar", traffic: 18, region: "A", x: 3, y: 4 },
];

describe("buildPlan", () => {
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
      const spec = specFromPlan(buildPlan(data, { mark, ...channels }));
      expect(Array.isArray(spec.marks), `${mark} has marks`).toBe(true);
      expect(spec.marks.length).toBeGreaterThan(0);
    }
  });

  it("maps --color-range to the color scale's range", () => {
    const spec = specFromPlan(buildPlan(data, { mark: "bar", x: "month", y: "traffic", colorRange: ["#1d4ed8", "#0f766e"] }));
    expect(spec.color).toEqual({ range: ["#1d4ed8", "#0f766e"] });
  });

  it("leaves the color scale alone without --color-range", () => {
    const spec = specFromPlan(buildPlan(data, { mark: "bar", x: "month", y: "traffic" }));
    expect(spec.color).toBeUndefined();
  });

  it("enables tip only when interactive", () => {
    const plain = buildPlan(data, { mark: "bar", x: "month", y: "traffic" });
    expect(plain.marks[0].tip).toBe(false);
    const interactive = buildPlan(data, { mark: "bar", x: "month", y: "traffic", interactive: true });
    expect(interactive.marks[0].tip).toBe(true);
    const spec = specFromPlan(interactive);
    expect(spec.marks[0].tip).toBeNull();
  });

  it("returns a donut sentinel for the donut mark", () => {
    const spec = buildPlan(data, { mark: "donut", x: "month", y: "traffic" });
    expect(spec.donut).toEqual({ rows: data, x: "month", y: "traffic", range: null });
  });

  it("surfaces a missing required channel", () => {
    expect(() => buildPlan(data, { mark: "bar", x: "month" })).toThrow(/needs a --y field/);
  });

  it("surfaces a missing field", () => {
    expect(() => buildPlan(data, { mark: "bar", x: "nope", y: "traffic" })).toThrow(/not found in data/);
  });

  it("surfaces a non-numeric channel where a number is required", () => {
    expect(() => buildPlan(data, { mark: "bar", x: "month", y: "region" })).toThrow(
      /expects a numeric --y field/,
    );
  });

  it("surfaces an unknown mark", () => {
    expect(() => buildPlan(data, { mark: "pie", x: "month", y: "traffic" })).toThrow(/unknown mark/);
  });

  it("surfaces empty data", () => {
    expect(() => buildPlan([], { mark: "bar", x: "month", y: "traffic" })).toThrow(/no data rows/);
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
      buildPlan(data, { mark: "bar", x: "month", y: "region" });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PingplotError);
    }
  });
});

describe("plan serialization", () => {
  it("produces a JSON-serializable plan", () => {
    const plan = buildPlan(data, { mark: "bar", x: "month", y: "traffic", colorRange: ["#1d4ed8"] });
    const roundTrip = JSON.parse(JSON.stringify(plan));
    expect(roundTrip.marks[0].type).toBe("barY");
    expect(roundTrip.plot.color).toEqual({ range: ["#1d4ed8"] });
    expect(roundTrip.data).toHaveLength(data.length);
  });

  it("derives funnel x1/x2 columns so the plan stays plain JSON", () => {
    const plan = buildPlan(data, { mark: "funnel", x: "traffic", y: "month" });
    const roundTrip = JSON.parse(JSON.stringify(plan));
    expect(roundTrip.data[0].__x1).toBeCloseTo(-10 / 2);
    expect(roundTrip.data[0].__x2).toBeCloseTo(10 / 2);
    expect(roundTrip.marks[0].type).toBe("barX");
  });

  it("specFromPlan rebuilds the same Plot spec the plan describes", () => {
    const plan = buildPlan(data, { mark: "bar", x: "month", y: "traffic" });
    const spec = specFromPlan(plan);
    expect(spec.marks[0].data).toBe(plan.data);
    expect(spec.marks[0].channels.x).toBeDefined();
    expect(spec.marks[0].channels.y1).toBeDefined();
  });
});