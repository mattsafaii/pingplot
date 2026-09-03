import * as Plot from "@observablehq/plot";

import { PingplotError } from "./errors.js";

export const MARKS = [
  "bar",
  "line",
  "area",
  "dot",
  "donut",
  "box",
  "heatmap",
  "rule",
  "funnel",
  "sparkline",
];

// The channel each mark expects, and the value type it requires.
// "number" rows must be numeric; "any" just needs the field to exist;
// "ordered" must exist (number, date, or string all work).
const CONTRACTS = {
  bar: { x: "any", y: "number" },
  line: { x: "ordered", y: "number" },
  area: { x: "ordered", y: "number" },
  dot: { x: "any", y: "number" },
  box: { x: "any", y: "number" },
  heatmap: { x: "number", y: "number" },
  rule: { y: "number" },
  funnel: { x: "number", y: "any" },
  sparkline: { x: "ordered", y: "number" },
  donut: { x: "any", y: "number" },
};

function column(rows, field) {
  return rows.map((row) => row[field]);
}

function validateContract(rows, mark, options) {
  const contract = CONTRACTS[mark];
  if (!contract) throw new PingplotError(`unknown mark "${mark}" (expected one of ${MARKS.join(", ")})`);

  if (rows.length === 0) throw new PingplotError("no data rows to chart");

  for (const [channel, kind] of Object.entries(contract)) {
    const field = options[channel];
    if (field == null) {
      throw new PingplotError(`mark "${mark}" needs a --${channel} field`);
    }
    const values = column(rows, field);
    const present = values.some((v) => v !== null && v !== undefined);
    if (!present) {
      const columns = Object.keys(rows[0]).join(", ");
      throw new PingplotError(`field "${field}" not found in data (columns: ${columns})`);
    }
    if (kind === "number") {
      const bad = values.find((v) => v !== null && v !== undefined && (typeof v !== "number" || Number.isNaN(v)));
      if (bad !== undefined) {
        throw new PingplotError(
          `mark "${mark}" expects a numeric --${channel} field, but "${field}" contains non-numeric values (e.g. "${bad}")`,
        );
      }
    }
  }
}

function withTip(options, interactive) {
  return interactive ? { ...options, tip: true } : options;
}

function buildMark(data, mark, x, y, interactive) {
  switch (mark) {
    case "bar":
      return Plot.barY(data, withTip({ x, y, fill: x }, interactive));
    case "line":
      return Plot.line(data, withTip({ x, y }, interactive));
    case "area":
      return Plot.areaY(data, withTip({ x, y1: 0, y2: y }, interactive));
    case "dot":
      return Plot.dot(data, withTip({ x, y }, interactive));
    case "box":
      return Plot.boxY(data, withTip({ x, y }, interactive));
    case "heatmap":
      return Plot.rect(data, Plot.binX({ y: "count" }, withTip({ x, y, fill: "count" }, interactive)));
    case "rule":
      return Plot.ruleY(data, withTip({ y }, interactive));
    case "funnel":
      return Plot.barX(
        data,
        withTip({ y, x1: (d) => -d[x] / 2, x2: (d) => d[x] / 2, fill: y }, interactive),
      );
    case "sparkline":
      return Plot.line(data, withTip({ x, y }, interactive));
    default:
      throw new PingplotError(`unknown mark "${mark}"`);
  }
}

export function buildSpec(rows, options) {
  validateContract(rows, options.mark, options);

  if (options.mark === "donut") {
    return { donut: { rows, x: options.x, y: options.y, range: options.colorRange ?? null } };
  }

  const marks = [buildMark(rows, options.mark, options.x, options.y, options.interactive)];
  const spec = { marks };
  if (options.colorRange) spec.color = { range: options.colorRange };
  if (options.mark === "funnel") {
    spec.x = { ticks: [] };
  }
  if (options.mark === "sparkline") {
    spec.height = 60;
    spec.margin = 4;
    spec.x = { ticks: [], label: null };
    spec.y = { ticks: [], label: null };
  }
  return spec;
}