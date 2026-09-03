---
name: pingplot
description: Turn a data file into a chart (PNG by default, SVG/HTML optional) through the pingplot CLI. Use when Matt asks for a chart, graph, or plot from CSV/JSON data. This is a wrapper — it instructs you to drive the CLI; the CLI is the product.
---

# pingplot

Turn a data file (CSV or JSON) into a chart. The CLI does the work — you match
the data to a catalog entry and run it.

## Flow

1. **Read `catalog.md`** to match the data shape to a chart type. Each entry
   states its data contract (shape it expects), the flags that satisfy it, and
   when to use it. The match selects the mark.
2. **Run the CLI** with inline flags for the common case:

   ```
   pingplot --data report.csv --mark bar --x month --y traffic --format png
   ```

   The CLI writes `<data-name>.<format>` next to the data file and prints its
   path. Default format is `png`; charts are static unless you ask for
   interactivity.
3. **Complex or branded charts:** write a Plot spec file and pass it with
   `--spec`. A spec file is a JSON Plot options object — marks named by Plot
   constructor (`barY`, `line`, ...), data in-file or via `--data`, brand
   colors baked into `color.range`. See catalog.md's "Spec files" section.

## Flags

| Flag | Meaning |
| --- | --- |
| `--data <file>` | CSV or JSON input (`.json` = JSON, anything else = CSV) |
| `--mark <type>` | chart type from catalog.md: bar, line, area, dot, donut, box, heatmap, rule, funnel, sparkline |
| `--x <field>` | x channel (field name in the data) |
| `--y <field>` | y channel |
| `--format <fmt>` | `png` \| `svg` \| `html` (default `png`) |
| `--color-range <hex,…>` | ordered colors → the color scale's `range` |
| `--interactive` | hover tooltips — html only; png/svg stay static |
| `--spec <file>` | full Plot options object instead of inline flags |

## Rules

- **Colors:** use Plot defaults unless Matt asks for a palette. No theming, no
  house styling. `--color-range` is the only customization, and it maps
  directly to the color scale's `range`.
- **Tooltips:** only in `--format html --interactive`. PNG/SVG are always
  static.
- **Donut:** inline flags only (`--mark donut --x <label> --y <value>`) — a
  spec file can't express one.
- **Fail loudly:** if the data doesn't match the mark's contract, the CLI says
  what's wrong and exits non-zero. Don't force it; pick a mark that fits the
  shape.
- **Verify:** if you changed the chart (not just re-ran), open the output or
  check its format (`file out.png`) before reporting success.

## Example

Data: `traffic.csv` with columns `month,traffic`. Matt wants a bar chart as a
PNG.

```
pingplot --data traffic.csv --mark bar --x month --y traffic
```

Prints `traffic.png`. Done.