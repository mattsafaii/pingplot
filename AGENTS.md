# Pingplot

CLI that turns data into PNG charts (SVG/HTML optional) via Observable Plot — Plot defaults plus custom color palettes.

## What

pingplot is a CLI tool first — it works standalone in bash, no agent required. Data in, chart out, in the requested format.

## Stack

- Node 18+ (built on 22), ESM, pnpm
- `@observablehq/plot` (engine), `jsdom` (server-side SVG render), `sharp` (SVG→PNG rasterize), `d3-dsv` (CSV parsing), `d3-shape` (donut arcs)
- Tests: vitest (`pnpm test`)

## Surfaces

- **pingplot CLI:** inline flags for common cases (`--data`, `--mark`, `--x`, `--y`) or a Plot spec file (`--spec`) for complex charts. `--format png|svg|html`, `--color-range`, `--interactive`. Default: PNG, static. Writes the output file and prints its path.
- **catalog.md:** chart types (bar, line, area, dot/scatter, donut, box, heatmap, rule, funnel, sparkline), each with its data contract (data shape it expects), the Plot marks it maps to, and when to use it.
- **docs/:** ARCHITECTURE.md and DECISIONS.md explain the design.

## Core Flow

1. Data file (CSV/JSON) + a request for a chart.
2. Match the data shape to the closest catalog.md contract — that selects the mark.
3. `pingplot --data report.csv --mark bar --x month --y traffic --format png` → PNG. Complex case: write a Plot spec file, `pingplot --spec spec.json`.

## Color Handling

Plot defaults for everything — default styling, default schemes (`Turbo` for sequential, `Observable10` for categorical). No themes, no house styling, no style files.

- **Default:** use Plot's built-in `scheme`s as-is.
- **Only customization:** a `--color-range` flag taking an ordered list of hex colors (e.g. `--color-range "#1d4ed8,#0f766e,#b45309"`), usable for categorical, sequential, diverging, or cyclical scales. Maps directly to the color scale's `range` option.
- **Reusable branded charts:** a `--spec` file carries the full Plot options including the `range`. No persistent theme or config.
- **Selection:** Plot's default behavior — the color scale's domain is the distinct values in the color channel in natural ascending order, colors assign to domain values by position. Domain order is controlled Plot-native: set the color scale's `domain` explicitly in the spec, or use a mark's `sort` option.

## No-gos

- No web app or server (a future web app would render Plot client-side)
- No TUI
- No Chart.js / ECharts — Plot is the only engine
- No full-page report templates
- No exotic marks Plot can't render natively: treemap, candlestick, sankey, network/force graphs
- No interactivity in PNG/SVG output — interactive is HTML-only
- No theming or house styling — Plot defaults plus optional custom palettes only