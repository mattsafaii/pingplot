#!/usr/bin/env node
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { parseArgs } from "./args.js";
import { PingplotError } from "./errors.js";
import { loadData } from "./load.js";
import { buildSpec } from "./spec.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

export function usage() {
  return `pingplot — data to charts via Observable Plot

Usage:
  pingplot --data <file> --mark <mark> [--x <field>] [--y <field>] [options]
  pingplot --spec <spec.json> [options]

Inline flags:
  --data <file>         CSV or JSON input
  --mark <mark>         chart type: bar, line, area, dot, donut, box,
                        heatmap, rule, funnel, sparkline
  --x <field>           x channel (field name in the data)
  --y <field>           y channel
  --format <fmt>        png | svg | html  (default: png)
  --color-range <hex,…> ordered colors → the color scale's range
  --interactive         hover tooltips (html only)
  --spec <file>         full Plot options object instead of inline flags

  -h, --help            show this help
  -v, --version         print version
`;
}

export function deriveOutputPath(dataPath, format) {
  const base = dataPath.replace(/\.[^.]+$/, "");
  return `${base}.${format}`;
}

export function main(argv) {
  const options = parseArgs(argv);

  if (options.help) {
    console.log(usage());
    return 0;
  }
  if (options.version) {
    console.log(version);
    return 0;
  }

  if (options.spec) {
    throw new PingplotError("--spec is not wired up yet");
  }

  if (!options.data) throw new PingplotError("--data is required");
  const rows = loadData(options.data);
  if (!options.mark) throw new PingplotError("a --mark is required (see --help for the list)");
  buildSpec(rows, options);

  const outputPath = deriveOutputPath(options.data, options.format);
  console.log(outputPath);
  return 0;
}

function run(argv) {
  try {
    const code = main(argv);
    process.exitCode = code ?? 0;
  } catch (err) {
    console.error(`pingplot: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === require.resolve("../src/cli.js");
if (isMain) run(process.argv.slice(2));