import { readFileSync } from "node:fs";
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

// Plot mark constructors a --spec file is allowed to name. A whitelist, not an
// allowlist of every mark: transforms, scales, and data loading are out.
const SPEC_MARK_TYPES = new Set([
  "area", "areaX", "areaY", "arrow", "auto", "barX", "barY", "boxX", "boxY",
  "cell", "cellX", "cellY", "centroid", "circle", "contour", "crosshair",
  "crosshairX", "crosshairY", "delaunayLink", "delaunayMesh", "density", "dot",
  "dotX", "dotY", "frame", "geo", "graticule", "gridX", "gridY", "hexagon",
  "hexgrid", "image", "legend", "line", "lineX", "lineY", "link", "map",
  "pointer", "pointerX", "pointerY", "raster", "rect", "rectX", "rectY",
  "ruleX", "ruleY", "sphere", "spike", "text", "textX", "textY", "tickX",
  "tickY", "tree", "treeLink", "treeNode", "vector", "voronoi", "voronoiMesh",
  "waffleX", "waffleY",
]);

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

function assertNumericField(rows, field, channelLabel) {
  const values = column(rows, field);
  const bad = values.find((v) => v !== null && v !== undefined && (typeof v !== "number" || Number.isNaN(v)));
  if (bad !== undefined) {
    throw new PingplotError(
      `${channelLabel} field, but "${field}" contains non-numeric values (e.g. "${bad}")`,
    );
  }
}

function assertFieldExists(rows, field, context) {
  const values = column(rows, field);
  const present = values.some((v) => v !== null && v !== undefined);
  if (!present) {
    const columns = Object.keys(rows[0]).join(", ");
    throw new PingplotError(`${context}: field "${field}" not found in data (columns: ${columns})`);
  }
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
    assertFieldExists(rows, field, `mark "${mark}"`);
    if (kind === "number") assertNumericField(rows, field, `mark "${mark}" expects a numeric --${channel}`);
  }
}

// A chart description is plain JSON: the data, a list of marks given by Plot
// constructor name and channel options, and plot-level options (color, scales,
// size). It is the single source of truth — specFromPlan renders it
// server-side, and the HTML page reconstructs it client-side. Inline flags and
// --spec files both produce one.
function markPlan(mark, x, y, interactive) {
  const tip = Boolean(interactive);
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

  let data = rows;
  const plot = {};
  if (options.colorRange) plot.color = { range: options.colorRange };
  if (options.mark === "funnel") {
    const field = options.x;
    data = rows.map((row) => ({ ...row, __x1: -row[field] / 2, __x2: row[field] / 2 }));
    plot.x = { ticks: [] };
  }
  if (options.mark === "sparkline") {
    plot.height = 60;
    plot.margin = 4;
    plot.x = { ticks: [], label: null };
    plot.y = { ticks: [], label: null };
  }

  return {
    data,
    marks: [markPlan(options.mark, options.x, options.y, options.interactive)],
    plot,
  };
}

// Plot constructor names whose length channel must be numeric. Spec-file marks
// are arbitrary Plot marks, so only these unambiguous ones get a numeric check.
const NUMERIC_CHANNEL = new Map([
  ["barY", "y"], ["boxY", "y"], ["areaY", "y"], ["ruleY", "y"],
  ["barX", "x"], ["boxX", "x"], ["areaX", "x"], ["ruleX", "x"],
]);

// Channels that almost always reference a data field (fill/stroke/text accept
// literals like color names, so they are deliberately excluded).
const POSITION_CHANNELS = new Set(["x", "y", "x1", "x2", "y1", "y2", "r", "value", "angle"]);

function validateSpecFileMarks(data, marks) {
  if (data.length === 0) throw new PingplotError("no data rows to chart");

  for (const mark of marks) {
    const rows = mark.data ?? data;
    if (rows.length === 0) throw new PingplotError(`mark "${mark.type}" has no data rows`);
    for (const [channel, value] of Object.entries(mark.options)) {
      if (typeof value !== "string" || !POSITION_CHANNELS.has(channel)) continue;
      assertFieldExists(rows, value, `mark "${mark.type}"`);
    }
    const numericChannel = NUMERIC_CHANNEL.get(mark.type);
    const numericField = numericChannel ? mark.options[numericChannel] : null;
    if (typeof numericField === "string") {
      assertNumericField(mark.data ?? data, numericField, `mark "${mark.type}" expects a numeric ${numericChannel}`);
    }
  }
}

export function parseSpecFile(specPath, { rows = null, interactive = false, colorRange = null } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(specPath, "utf8"));
  } catch (err) {
    throw new PingplotError(`invalid spec file ${specPath}: ${err.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PingplotError("spec file must be a Plot options object");
  }
  if (!Array.isArray(parsed.marks) || parsed.marks.length === 0) {
    throw new PingplotError("spec file needs a marks array");
  }

  const data = parsed.data ?? rows;
  if (!data) throw new PingplotError('spec file needs data (a "data" array in the file, or --data)');

  const { data: _ignored, marks: rawMarks, ...plot } = parsed;
  if (colorRange) plot.color = { ...(plot.color ?? {}), range: colorRange };

  const marks = rawMarks.map((mark) => {
    if (!mark || typeof mark !== "object") throw new PingplotError("each mark in the spec file must be an object");
    const { type, data: markData, bin, ...options } = mark;
    if (!SPEC_MARK_TYPES.has(type)) {
      throw new PingplotError(`unknown or unsupported mark type "${type}"`);
    }
    return {
      type,
      options,
      bin: Boolean(bin),
      data: markData ?? data,
      tip: Boolean(interactive || mark.tip),
    };
  });

  validateSpecFileMarks(data, marks);

  return { data, marks, plot };
}

export function specFromPlan(plan) {
  const marks = plan.marks.map((m) => {
    const options = { ...m.options };
    const data = m.data ?? plan.data;
    return m.bin ? Plot.rect(data, Plot.binX({ y: "count" }, options)) : Plot[m.type](data, options);
  });
  return { ...plan.plot, marks };
}