import { renderDonutToSvg } from "./render.js";

export const PLOT_CDN = "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/dist/plot.umd.min.js";

// Mirrors specFromPlan in src/spec.js — the page rebuilds the chart client-side.
function clientScript(plan) {
  return `
(function () {
  const plan = ${JSON.stringify(plan).replace(/</g, "\\u003c")};
  const chart = document.getElementById("chart");
  if (typeof Plot === "undefined") {
    chart.textContent = "Plot CDN didn't load \\u2014 check your network connection.";
    return;
  }
  const spec = Object.assign({}, plan.plot);
  spec.marks = plan.marks.map((m) => {
    const opts = Object.assign({}, m.options);
    if (m.tip) opts.tip = true;
    return m.bin ? Plot.rect(m.data || plan.data, Plot.binX({ y: "count" }, opts)) : Plot[m.type](m.data || plan.data, opts);
  });
  chart.appendChild(Plot.plot(spec));
})();
`;
}

export function renderHtml(plan) {
  const body = plan.donut
    ? renderDonutToSvg(plan.donut)
    : `<script src="${PLOT_CDN}"></script>\n  ${clientScript(plan)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>pingplot</title>
<style>
  body { margin: 2rem; font-family: system-ui, sans-serif; color: #222; }
  #chart { max-width: 960px; }
  h1 { font-size: 1rem; font-weight: 600; margin: 0 0 1rem; }
</style>
</head>
<body>
<h1>pingplot</h1>
<div id="chart"></div>
${body}
</body>
</html>
`;
}