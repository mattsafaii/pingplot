# Pingplot

CLI that turns data into PNG charts (SVG/HTML optional) via Observable Plot — Plot defaults plus custom color palettes.

## What

PiNGplot is a CLI tool first — it works standalone in bash, no agent required. The Skill file is a wrapper that lets agents drive the same CLI; it is not the product. Two entry points to the same tool: pass data to the CLI and get a chart in the selected format, or an agent does it through the Skill file.

## Stack

- Node 22 (mise), ESM, pnpm
- `@observablehq/plot` (engine), `jsdom` (server-side SVG render), `sharp` (SVG→PNG rasterize), `d3` (data loading)
- Tests: vitest
- No deploy target — local CLI, no server

## Surfaces

- **pingplot CLI:** inline flags for common cases (`--data`, `--mark`, `--x`, `--y`) or a Plot spec file (`--spec`) for complex charts. `--format png|svg|html`, `--color-range`, `--interactive`. Default: PNG, static. Writes the output file and prints its path.
- **catalog.md:** chart types (bar, line, area, dot/scatter, donut, box, heatmap, rule, funnel, sparkline), each with its data contract (data shape it expects), the Plot marks it maps to, and when to use it. Read by the agent via the Skill; shared artifact for a future web app.
- **SKILL.md:** the agent-facing layer — how to match data to a catalog entry, then drive the same CLI. Not a standalone tool; it instructs the agent to call the CLI.

## Core Flow

1. Data file (CSV/JSON) + a request for a chart.
2. Match the data shape to the closest catalog.md contract — that selects the mark.
3. **Direct path (Matt):** `pingplot --data report.csv --mark bar --x month --y traffic --format png` → PNG, ready for the report. Complex case: write a Plot spec file, `pingplot --spec spec.json`.
4. **Agent path:** agent reads SKILL.md, follows the same match → run flow, produces the chart in the requested format. Same CLI underneath.

## Color Handling

Plot defaults for everything — default styling, default schemes (`Turbo` for sequential, `Observable10` for categorical). No themes, no house styling, no style files.

- **Default:** use Plot's built-in `scheme`s as-is.
- **Only customization:** a `--color-range` flag taking an ordered list of hex colors (e.g. `--color-range "#1d4ed8,#0f766e,#b45309"`), usable for categorical, sequential, diverging, or cyclical scales. Maps directly to the color scale's `range` option.
- **Reusable branded charts:** a `--spec` file carries the full Plot options including the `range`. No persistent theme or config.
- **Selection:** Plot's default behavior — the color scale's domain is the distinct values in the color channel in natural ascending order, colors assign to domain values by position. Domain order is controlled Plot-native: set the color scale's `domain` explicitly in the spec, or use a mark's `sort` option.

## No-gos

- No web app or server in v1 (a future web app would render Plot client-side)
- No TUI
- No Chart.js / ECharts — Plot is the only engine
- No full-page report templates in v1 (page-layout layer can come later)
- No exotic marks Plot can't render natively: treemap, candlestick, sankey, network/force graphs
- No interactivity in PNG/SVG output — interactive is HTML-only
- No theming or house styling in v1 — Plot defaults plus optional custom palettes only
- No public distribution, docs, or onboarding — Matt and his agents only

## Todos

Each build todo's description ends with a `Done when:` line — that's the finish line, not your own judgment of done. Where a description carries a `Test:` line, write that test alongside the code rather than afterwards.

The Basecamp list is mirrored into Solo. Close a unit with
`python3 ~/Code/skills/solo/scripts/basecamp-bridge.py ship <todo_id> <sha>`,
which comments the SHA on Basecamp and completes it in both places. Either id
works — the Basecamp one you just finished, or the Solo one from the sidebar.

## Basecamp

Project config (account/project/todolist IDs) is already set in `.basecamp/config.json` (gitignored), so `basecamp` commands work without flags from this directory. To find the PRD doc, run `basecamp docs list` and match by title (`PRD`); the pitch lives on the project's card in the Lab Ideas board.

## Solo

This project runs inside Solo, which manages its processes. Keep the `state` scratchpad current — read it at session start, update it at session end and before context compacts. Follow the `solo` skill for scratchpads, spawned workers, timers, and locks.