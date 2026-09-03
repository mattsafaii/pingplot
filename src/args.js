import { PingplotError } from "./errors.js";

export const FORMATS = ["png", "svg", "html"];

export function parseArgs(argv) {
  const options = {
    data: null,
    mark: null,
    x: null,
    y: null,
    format: "png",
    colorRange: null,
    interactive: false,
    spec: null,
    help: false,
    version: false,
  };

  const value = (name, i) => {
    if (i + 1 >= argv.length) throw new PingplotError(`--${name} requires a value`);
    return argv[i + 1];
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--data":
        options.data = value("data", i);
        i++;
        break;
      case "--mark":
        options.mark = value("mark", i);
        i++;
        break;
      case "--x":
        options.x = value("x", i);
        i++;
        break;
      case "--y":
        options.y = value("y", i);
        i++;
        break;
      case "--format":
        options.format = value("format", i);
        i++;
        if (!FORMATS.includes(options.format)) {
          throw new PingplotError(`--format must be one of ${FORMATS.join(", ")} (got "${options.format}")`);
        }
        break;
      case "--color-range": {
        const raw = value("color-range", i);
        i++;
        options.colorRange = raw.split(",").map((s) => s.trim()).filter(Boolean);
        if (options.colorRange.length === 0) throw new PingplotError("--color-range needs at least one color");
        break;
      }
      case "--interactive":
        options.interactive = true;
        break;
      case "--spec":
        options.spec = value("spec", i);
        i++;
        break;
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-v":
      case "--version":
        options.version = true;
        break;
      default:
        if (arg.startsWith("-")) throw new PingplotError(`unknown option: ${arg}`);
        throw new PingplotError(`unexpected argument: ${arg}`);
    }
  }

  return options;
}