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

// A plan is a plain-JSON description of a chart: the data plus a list of
// Plot marks given by constructor name and channel options. It is the single
// source of truth — specFromPlan turns it into a Plot spec for server-side
// rendering, and the HTML page reconstructs it client-side.
function markPlan(mark, x, y, interactive) {
  const tip = interactive ? true : false;
  switch (mark) {
    case "bar":
      return { type: "barY", options: { x, y, fill: x }, tip };
    case "line":
      return { type: "line", options: { x, y }, tip };
    case "area":
      return { type: "areaY", options: { x, y1: 0, y2: y }, tip };
    case "dot":
      return { type: "dot", options: { x, y }, tip };
    case "box":
      return { type: "boxY", options: { x, y }, tip };
    case "heatmap":
      return { type: "rect", bin: true, options: { x, y, fill: "count" }, tip };
    case "rule":
      return { type: "ruleY", options: { y }, tip };
    case "funnel":
      return { type: "barX", options: { y, x1: "__x1", x2: "__x2", fill: y }, tip };
    case "sparkline":
      return { type: "line", options: { x, y }, tip };
    default:
      throw new PingplotError(`unknown mark "${mark}"`);
  }
}

export function buildPlan(rows, options) {
  validateContract(rows, options.mark, options);

  if (options.mark === "donut") {
    return { donut: { rows, x: options.x, y: options.y, range: options.colorRange ?? null } };
  }

  const plan = {
    data: rows,
    color: options.colorRange ?? null,
    marks: [markPlan(options.mark, options.x, options.y, options.interactive)],
    extras: {},
  };

  if (options.mark === "funnel") {
    const field = options.x;
    plan.data = rows.map((row) => ({ ...row, __x1: -row[field] / 2, __x2: row[field] / 2 }));
    plan.extras.funnel = true;
  }
  if (options.mark === "sparkline") plan.extras.sparkline = true;

  return plan;
}

export function specFromPlan(plan) {
  const marks = plan.marks.map((m) => {
    const options = { ...m.options };
    return m.bin
      ? Plot.rect(plan.data, Plot.binX({ y: "count" }, options))
      : Plot[m.type](plan.data, options);
  });

  const spec = { marks };
  if (plan.color) spec.color = { range: plan.color };
  if (plan.extras?.funnel) spec.x = { ticks: [] };
  if (plan.extras?.sparkline) {
    spec.height = 60;
    spec.margin = 4;
    spec.x = { ticks: [], label: null };
    spec.y = { ticks: [], label: null };
  }
  return spec;
}

export function buildSpec(rows, options) {
  const plan = buildPlan(rows, options);
  if (plan.donut) return plan;
  return specFromPlan(plan);
}