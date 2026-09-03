# pingplot

CLI that turns a CSV or JSON file into a chart — PNG by default, SVG or a
self-contained HTML page on request. Charts come from [Observable Plot](https://observablehq.com/plot):
Plot defaults for styling, with custom color palettes as the one option.

## Install

```sh
pnpm install
```

Run it directly, or link it:

```sh
node src/cli.js --data report.csv --mark bar --x month --y traffic
pnpm link   # gives you a `pingplot` command
```

## Use

```sh
pingplot --data report.csv --mark bar --x month --y traffic
```

Writes `report.png` next to the data file and prints the path. The chart type
comes from `--mark`; match your data to a type in [catalog.md](catalog.md).

| Flag | Meaning |
| --- | --- |
| `--data <file>` | CSV or JSON input (`.json` = JSON, anything else = CSV) |
| `--mark <type>` | chart type: bar, line, area, dot, donut, box, heatmap, rule, funnel, sparkline |
| `--x <field>` | x channel (a field name in the data) |
| `--y <field>` | y channel |
| `--format <fmt>` | `png` \| `svg` \| `html` (default `png`) |
| `--color-range <hex,…>` | ordered colors → the color scale's `range` |
| `--interactive` | hover tooltips — html only; png/svg stay static |
| `--spec <file>` | a full Plot options object instead of inline flags |

### Formats

- **png** (default) — rendered server-side and rasterized. `--format html`
  loads Plot from the CDN and renders in the browser, so it needs a network
  connection.
- **svg** — the raw chart as a well-formed SVG file.
- **html** — a self-contained page. `--interactive` adds hover tooltips here;
  png/svg never include them.

### Colors

Plot defaults everywhere — no theming. `--color-range` is the only
customization, and it maps straight to the color scale's `range`, so it works
for categorical, sequential, diverging, or cyclical scales:

```sh
pingplot --data report.csv --mark bar --x month --y traffic --color-range "#1d4ed8,#0f766e,#b45309"
```

For a reusable branded chart, put the palette in a spec file instead.

### Spec files

A spec file is a JSON Plot options object — the way to build a complex chart or
a branded one, with colors baked in. Marks are named by Plot constructor; data
can live in the file or come from `--data`:

```json
{
  "data": [{ "month": "Jan", "traffic": 10 }],
  "marks": [{ "type": "barY", "x": "month", "y": "traffic", "fill": "month" }],
  "color": { "range": ["#1d4ed8", "#0f766e"] }
}
```

```sh
pingplot --spec chart.json
```

Spec files render the same chart as equivalent inline flags. Donut is the one
type a spec file can't express (Plot has no donut mark — pingplot draws it with
`d3.arc`), so donut is inline flags only.

## Chart catalog

[catalog.md](catalog.md) lists every chart type with the data shape it expects,
the Plot marks behind it, and when to reach for it.

## Tests

```sh
pnpm test
```

## Status

Shipped. Local CLI for Matt and his agents; no server, no public distribution.