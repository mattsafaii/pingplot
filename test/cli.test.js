import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { main, deriveOutputPath, usage } from "../src/cli.js";
import { PingplotError } from "../src/errors.js";

let dir;
function fixture(name, content) {
  dir = mkdtempSync(join(tmpdir(), "pingplot-"));
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("cli validation", () => {
  it("missing data file fails cleanly", () => {
    expect(() => main(["--data", "missing.csv", "--mark", "bar"])).toThrow(PingplotError);
    expect(() => main(["--data", "missing.csv", "--mark", "bar"])).toThrow(/data file not found/);
  });

  it("missing data file exits non-zero with a clear message, no stack trace", async () => {
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync(process.execPath, ["src/cli.js", "--data", "missing.csv"], {
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/pingplot:/);
    expect(result.stderr).toMatch(/data file not found/);
    expect(result.stderr).not.toMatch(/at /); // no stack frames
  });

  it("requires a data file", () => {
    expect(() => main(["--mark", "bar"])).toThrow(/--data is required/);
  });

  it("requires a mark in inline mode", () => {
    const path = fixture("report.csv", "month,traffic\nJan,10\n");
    expect(() => main(["--data", path])).toThrow(/--mark is required/);
  });

  it("rejects --spec until wired up", () => {
    expect(() => main(["--spec", "spec.json"])).toThrow(PingplotError);
  });

  it("help prints usage and exits 0", () => {
    const code = main(["--help"]);
    expect(code).toBe(0);
    expect(usage()).toMatch(/--mark/);
    expect(usage()).toMatch(/--color-range/);
  });
});

describe("output path", () => {
  it("derives the output path from the data file and format", () => {
    expect(deriveOutputPath("report.csv", "png")).toBe("report.png");
    expect(deriveOutputPath("report.csv", "svg")).toBe("report.svg");
    expect(deriveOutputPath("report.csv", "html")).toBe("report.html");
    expect(deriveOutputPath("data/report.json", "png")).toBe("data/report.png");
  });

  it("default format is png", () => {
    const path = fixture("report.csv", "month,traffic\nJan,10\n");
    const code = main(["--data", path, "--mark", "bar", "--x", "month", "--y", "traffic"]);
    expect(code).toBe(0);
  });
});