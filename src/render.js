import { writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import * as Plot from "@observablehq/plot";
import sharp from "sharp";
import { arc as arcShape, pie as pieShape } from "d3";

import { PingplotError } from "./errors.js";
import { specFromPlan } from "./spec.js";

// Plot's SVG defaults to font-family="system-ui, sans-serif", which rasterizers
// don't always resolve. Pin an explicit stack so text never renders as boxes.
export const PINNED_FONT = "Helvetica, Arial, sans-serif";

let domReady = false;
function ensureDom() {
  if (domReady) return;
  const dom = new JSDOM("<!DOCTYPE html><body></body>");
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  domReady = true;
}

function stripTips(spec) {
  for (const mark of spec.marks) mark.tip = null;
  return spec;
}

function escapeXml(text) {
  return String(text).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
}

export function renderSpecToSvg(spec) {
  ensureDom();
  const el = Plot.plot(stripTips(spec));
  el.setAttribute("font-family", PINNED_FONT);
  return el.outerHTML;
}

export function renderDonutToSvg({ rows, x, y, range }) {
  ensureDom();

  const labels = [...new Set(rows.map((row) => String(row[x])))].sort();
  const slices = labels.map((label) => ({
    label,
    value: rows.filter((row) => String(row[x]) === label).reduce((sum, row) => sum + (Number(row[y]) || 0), 0),
  }));
  if (slices.every((s) => s.value === 0)) throw new PingplotError("donut has nothing to draw: all values are zero");

  const scaleOptions = { type: "categorical", domain: labels };
  if (range) scaleOptions.range = range;
  const scale = Plot.scale({ color: scaleOptions });
  const color = (label) => scale.apply(label);

  const width = 320;
  const height = 200;
  const radius = height / 2 - 20;
  const innerRadius = radius * 0.55;
  const arc = arcShape().innerRadius(innerRadius).outerRadius(radius);
  const pie = pieShape().value((d) => d.value).sort(null)(slices);

  const paths = pie.map((slice) => `<path d="${arc(slice)}" fill="${color(slice.data.label)}"></path>`).join("");
  const legend = labels
    .map(
      (label, i) =>
        `<g transform="translate(0,${i * 15})">
           <rect width="10" height="10" x="0" y="-9" fill="${color(label)}"></rect>
           <text x="16" y="0" font-size="11">${escapeXml(label)}</text>
         </g>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${PINNED_FONT}">
  <g transform="translate(${radius + 10},${height / 2})">${paths}</g>
  <g transform="translate(${radius * 2 + 34},${Math.max(0, height / 2 - (labels.length * 15) / 2)})" font-size="11">${legend}</g>
</svg>`;
}

export async function writePng(svg, outputPath) {
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

export function writeSvg(svg, outputPath) {
  writeFileSync(outputPath, svg);
}

export function renderToSvg(plan) {
  return plan.donut ? renderDonutToSvg(plan.donut) : renderSpecToSvg(specFromPlan(plan));
}

export async function renderPng(plan, outputPath) {
  await writePng(renderToSvg(plan), outputPath);
  return outputPath;
}