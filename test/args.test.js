import { describe, expect, it } from "vitest";

import { parseArgs, FORMATS } from "../src/args.js";
import { PingplotError } from "../src/errors.js";

describe("parseArgs", () => {
  it("parses every inline flag", () => {
    const options = parseArgs([
      "--data", "report.csv",
      "--mark", "bar",
      "--x", "month",
      "--y", "traffic",
      "--format", "svg",
      "--color-range", "#1d4ed8,#0f766e,#b45309",
      "--interactive",
    ]);
    expect(options).toMatchObject({
      data: "report.csv",
      mark: "bar",
      x: "month",
      y: "traffic",
      format: "svg",
      colorRange: ["#1d4ed8", "#0f766e", "#b45309"],
      interactive: true,
    });
  });

  it("defaults to png, static, no color range", () => {
    const options = parseArgs(["--data", "report.csv", "--mark", "bar"]);
    expect(options.format).toBe("png");
    expect(options.interactive).toBe(false);
    expect(options.colorRange).toBeNull();
    expect(options.x).toBeNull();
    expect(options.y).toBeNull();
  });

  it("parses --spec", () => {
    const options = parseArgs(["--spec", "spec.json"]);
    expect(options.spec).toBe("spec.json");
  });

  it("rejects an unknown flag", () => {
    expect(() => parseArgs(["--nope"])).toThrow(PingplotError);
    expect(() => parseArgs(["--nope"])).toThrow(/unknown option/);
  });

  it("rejects a missing value", () => {
    expect(() => parseArgs(["--data"])).toThrow(PingplotError);
    expect(() => parseArgs(["--data"])).toThrow(/requires a value/);
  });

  it("rejects a flag where a value is expected", () => {
    expect(() => parseArgs(["--data", "--mark"])).toThrow(PingplotError);
    expect(() => parseArgs(["--data", "--mark"])).toThrow(/--data requires a value/);
  });

  it("rejects a bad format", () => {
    expect(() => parseArgs(["--format", "gif"])).toThrow(PingplotError);
    expect(() => parseArgs(["--format", "gif"])).toThrow(/must be one of/);
  });

  it("rejects an empty color range", () => {
    expect(() => parseArgs(["--color-range", ","])).toThrow(PingplotError);
  });

  it("splits and trims color range", () => {
    const options = parseArgs(["--color-range", " #1d4ed8 , #0f766e "]);
    expect(options.colorRange).toEqual(["#1d4ed8", "#0f766e"]);
  });

  it("accepts the supported formats", () => {
    for (const format of FORMATS) {
      expect(parseArgs(["--format", format]).format).toBe(format);
    }
  });
});