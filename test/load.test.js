import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadData } from "../src/load.js";
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

describe("loadData", () => {
  it("loads CSV into typed rows", () => {
    const path = fixture("report.csv", "month,traffic\nJan,10\nFeb,25\n");
    const rows = loadData(path);
    expect(rows).toEqual([
      { month: "Jan", traffic: 10 },
      { month: "Feb", traffic: 25 },
    ]);
    expect(typeof rows[0].traffic).toBe("number");
  });

  it("loads JSON into rows, preserving types", () => {
    const path = fixture("report.json", '[{"month":"Jan","traffic":10},{"month":"Feb","traffic":25}]');
    const rows = loadData(path);
    expect(rows).toEqual([
      { month: "Jan", traffic: 10 },
      { month: "Feb", traffic: 25 },
    ]);
    expect(typeof rows[1].traffic).toBe("number");
  });

  it("fails cleanly on a missing file", () => {
    expect(() => loadData("nope.csv")).toThrow(PingplotError);
    expect(() => loadData("nope.csv")).toThrow(/data file not found/);
  });

  it("fails cleanly on invalid JSON", () => {
    const path = fixture("report.json", "{not json");
    expect(() => loadData(path)).toThrow(PingplotError);
    expect(() => loadData(path)).toThrow(/invalid JSON/);
  });

  it("fails cleanly when JSON is not an array", () => {
    const path = fixture("report.json", '{"month":"Jan"}');
    expect(() => loadData(path)).toThrow(/must be an array/);
  });
});