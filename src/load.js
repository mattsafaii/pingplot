import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { autoType, csvParse } from "d3-dsv";

import { PingplotError } from "./errors.js";

export function loadData(dataPath) {
  let text;
  try {
    text = readFileSync(dataPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") throw new PingplotError(`data file not found: ${dataPath}`);
    throw new PingplotError(`could not read ${dataPath}: ${err.message}`);
  }

  if (extname(dataPath).toLowerCase() === ".json") {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new PingplotError(`invalid JSON in ${dataPath}: ${err.message}`);
    }
    if (!Array.isArray(parsed)) {
      throw new PingplotError(`JSON data in ${dataPath} must be an array of rows`);
    }
    return parsed;
  }

  return csvParse(text, autoType).map((row) => ({ ...row }));
}