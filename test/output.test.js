import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { main } from "../src/cli.js";
import { renderHtml, PLOT_CDN } from "../src/html.js";
import { renderToSvg } from "../src/render.js";
import { buildPlan, parseSpecFile } from "../src/spec.js";
import { loadData } from "../src/load.js";

let dir;
function tempDir() {
  dir = mkdtempSync(join(tmpdir(), "pingplot-"));
  return dir;
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

const fixturePath = "fixtures/report.csv";

describe("svg output", () => {
  it("--format svg writes a well-formed file (xmllint parses it)", async () => {
    const out = join(tempDir(), "report.csv");
    writeFileSync(out, readFileSync(fixturePath));
    const code = await main(["--data", out, "--mark", "bar", "--x", "month", "--y", "traffic", "--format", "svg"]);
    expect(code).toBe(0);
    const svg = out.replace(".csv", ".svg");
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("xmllint", ["--noout", svg], { encoding: "utf8" });
    expect(result.status).toBe(0, result.stderr);
    expect(readFileSync(svg, "utf8")).toMatch(/^<svg/);
  });

  it("static svg is a real file, not png", async () => {
    const out = join(tempDir(), "report.csv");
    writeFileSync(out, readFileSync(fixturePath));
    await main(["--data", out, "--mark", "line", "--x", "month", "--y", "traffic", "--format", "svg"]);
    const svg = readFileSync(out.replace(".csv", ".svg"), "utf8");
    expect(svg).toMatch(/<svg/);
    expect(svg).not.toMatch(/PNG/);
  });
});

describe("html output", () => {
  it("emits a self-contained page that loads Plot client-side", async () => {
    const out = join(tempDir(), "report.csv");
    writeFileSync(out, readFileSync(fixturePath));
    const code = await main(["--data", out, "--mark", "bar", "--x", "month", "--y", "traffic", "--format", "html"]);
    expect(code).toBe(0);
    const html = readFileSync(out.replace(".csv", ".html"), "utf8");
    expect(html).toContain(`<script src="${PLOT_CDN}"></script>`);
    expect(html).toContain('Plot.plot(spec)');
    expect(html).toContain('id="chart"');
    expect(html).toContain('"type":"barY"');
  });

  it("includes the offline fallback message", () => {
    const rows = loadData(fixturePath);
    const plan = buildPlan(rows, { mark: "bar", x: "month", y: "traffic" });
    const html = renderHtml(plan);
    expect(html).toMatch(/Plot CDN didn't load/);
  });

  it("embeds a donut as pre-rendered svg (no client Plot needed)", () => {
    const rows = loadData(fixturePath);
    const plan = buildPlan(rows, { mark: "donut", x: "month", y: "traffic" });
    const html = renderHtml(plan);
    expect(html).toContain("<svg");
    expect(html).toContain("<path");
    expect(html).not.toContain(PLOT_CDN);
  });

  it("carries interactive tooltips into the client spec only when requested", () => {
    const rows = loadData(fixturePath);
    const plain = buildPlan(rows, { mark: "bar", x: "month", y: "traffic" });
    const interactive = buildPlan(rows, { mark: "bar", x: "month", y: "traffic", interactive: true });
    expect(renderHtml(plain)).not.toContain('"tip":true');
    expect(renderHtml(interactive)).toContain('"tip":true');
  });
});

describe("interactive", () => {
  it("--format html --interactive embeds tooltips and notes the CDN dependency", async () => {
    const out = join(tempDir(), "report.csv");
    writeFileSync(out, readFileSync(fixturePath));
    const errs = [];
    const originalError = console.error;
    console.error = (...args) => errs.push(args.join(" "));
    try {
      const code = await main(["--data", out, "--mark", "bar", "--x", "month", "--y", "traffic", "--format", "html", "--interactive"]);
      expect(code).toBe(0);
    } finally {
      console.error = originalError;
    }
    const html = readFileSync(out.replace(".csv", ".html"), "utf8");
    expect(html).toContain('"tip":true');
    expect(errs.some((e) => /CDN/.test(e))).toBe(true);
  });

  it("--interactive with png stays static but notes the limitation", async () => {
    const out = join(tempDir(), "report.csv");
    writeFileSync(out, readFileSync(fixturePath));
    const errs = [];
    const originalError = console.error;
    console.error = (...args) => errs.push(args.join(" "));
    try {
      await main(["--data", out, "--mark", "bar", "--x", "month", "--y", "traffic", "--format", "png", "--interactive"]);
    } finally {
      console.error = originalError;
    }
    expect(errs.some((e) => /png\/svg stay static/.test(e))).toBe(true);
    const png = readFileSync(out.replace(".csv", ".png"));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
  });
});

describe("spec-file mode", () => {
  it("renders the same chart as equivalent inline flags (outputs match)", () => {
    const rows = loadData(fixturePath);
    const inline = buildPlan(rows, { mark: "bar", x: "month", y: "traffic" });
    const fromFile = parseSpecFile("fixtures/spec-bar.json");
    const svgInline = renderToSvg(inline);
    const svgFile = renderToSvg(fromFile);
    expect(svgFile).toBe(svgInline);
  });

  it("runs end to end from the CLI", async () => {
    const out = join(tempDir(), "spec-bar.json");
    writeFileSync(out, readFileSync("fixtures/spec-bar.json"));
    const code = await main(["--spec", out]);
    expect(code).toBe(0);
    const png = out.replace(".json", ".png");
    expect(readFileSync(png).subarray(1, 4).toString()).toBe("PNG");
  });

  it("accepts a spec file with data coming from --data", async () => {
    const rows = loadData(fixturePath);
    const plan = parseSpecFile("fixtures/spec-bar.json", { rows });
    expect(plan.data).toHaveLength(6);
  });

  it("rejects an unknown mark type", () => {
    const out = join(tempDir(), "bad.json");
    writeFileSync(out, JSON.stringify({ data: [{ x: 1 }], marks: [{ type: "eval", x: "x" }] }));
    expect(() => parseSpecFile(out)).toThrow(/unknown or unsupported mark type/);
  });

  it("rejects a spec file without marks", () => {
    const out = join(tempDir(), "nomarks.json");
    writeFileSync(out, JSON.stringify({ data: [] }));
    expect(() => parseSpecFile(out)).toThrow(/needs a marks array/);
  });

  it("rejects a spec file without data when --data is absent", () => {
    const out = join(tempDir(), "nodata.json");
    writeFileSync(out, JSON.stringify({ marks: [{ type: "barY", x: "x", y: "y" }] }));
    expect(() => parseSpecFile(out)).toThrow(/needs data/);
  });

  it("rejects an invalid spec file", () => {
    const out = join(tempDir(), "bad.json");
    writeFileSync(out, "{not json");
    expect(() => parseSpecFile(out)).toThrow(/invalid spec file/);
  });

  it("merges --color-range into the spec's color scale", () => {
    const plan = parseSpecFile("fixtures/spec-bar.json", { colorRange: ["#1d4ed8"] });
    expect(plan.plot.color).toEqual({ range: ["#1d4ed8"] });
  });
});