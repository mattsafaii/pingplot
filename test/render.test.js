import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

import { main } from "../src/cli.js";
import { renderSpecToSvg, renderDonutToSvg, writePng, PINNED_FONT } from "../src/render.js";
import { buildSpec } from "../src/spec.js";
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

describe("static pipeline (png)", () => {
  it("no --format writes a valid PNG (file reports PNG image data)", async () => {
    const out = join(tempDir(), "out.png");
    const rows = loadData(fixturePath);
    const spec = buildSpec(rows, { mark: "bar", x: "month", y: "traffic" });
    await writePng(renderSpecToSvg(spec), out);
    expect(existsSync(out)).toBe(true);
    const buf = readFileSync(out);
    expect(buf.subarray(1, 4).toString()).toBe("PNG");
  });

  it("the CLI default path produces a PNG next to the data file", async () => {
    const out = join(tempDir(), "report.csv");
    writeFileSync(out, readFileSync(fixturePath));
    const code = await main(["--data", out, "--mark", "bar", "--x", "month", "--y", "traffic"]);
    expect(code).toBe(0);
    const png = out.replace(".csv", ".png");
    expect(existsSync(png)).toBe(true);
    expect(readFileSync(png).subarray(1, 4).toString()).toBe("PNG");
  });

  it("static specs never carry tooltips", () => {
    const rows = loadData(fixturePath);
    const spec = buildSpec(rows, { mark: "bar", x: "month", y: "traffic", interactive: true });
    const svg = renderSpecToSvg(spec);
    expect(svg).not.toMatch(/pointer-events|mouseover|mousemove/);
  });

  it("pins the font family on the rendered SVG", () => {
    const rows = loadData(fixturePath);
    const spec = buildSpec(rows, { mark: "bar", x: "month", y: "traffic" });
    const svg = renderSpecToSvg(spec);
    expect(svg).toContain(PINNED_FONT);
  });
});

describe("reference render", () => {
  it("renders a bar chart with real ink (bars + text, not an empty box)", async () => {
    const rows = loadData(fixturePath);
    const spec = buildSpec(rows, { mark: "bar", x: "month", y: "traffic", colorRange: ["#1d4ed8", "#0f766e"] });
    const png = await sharp(Buffer.from(renderSpecToSvg(spec))).png().toBuffer();
    const { info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    expect(info.width).toBeGreaterThan(100);
    expect(info.height).toBeGreaterThan(100);
    const buf = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data } = buf;
    let ink = 0;
    for (let i = 0; i < data.length; i += buf.info.channels) {
      if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) ink++;
    }
    // bars + axis text produce thousands of non-background pixels
    expect(ink).toBeGreaterThan(1000);
  });

  it("renders a donut from its sentinel spec", () => {
    const rows = loadData(fixturePath);
    const spec = buildSpec(rows, { mark: "donut", x: "month", y: "traffic" });
    const svg = renderDonutToSvg(spec.donut);
    expect(svg).toMatch(/<svg/);
    expect(svg).toMatch(/<path/);
    expect(svg).toContain(PINNED_FONT);
  });
});