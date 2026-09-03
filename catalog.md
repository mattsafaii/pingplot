# pingplot chart catalog

Chart types you can ask pingplot for. Each entry states its **data contract**
(the shape it expects), the **Plot marks** it maps to, and **when to use it**.

Every type renders from a committed fixture (`fixtures/`); the catalog test
loops them all. Pass data with `--data file.csv` (or `.json`) and pick a type
with `--mark <type>`. Field names go through `--x` and `--y`.

Color rules apply everywhere: no `--color-range` means Plot's default schemes
(`Observable10` categorical, `Turbo` sequential); `--color-range` sets the
color scale's `range`.

## bar

- **Contract:** rows with a categorical `x` and a numeric `y`.
- **Inline:** `--mark bar --x <category> --y <number>`
- **Plot marks:** `Plot.barY(data, { x, y, fill: x })`
- **Use when:** comparing one number across categories — monthly traffic, per-region totals.
- **Notes:** bars are colored by category, so `--color-range` recolors them.

## line

- **Contract:** rows with an ordered `x` and a numeric `y` (numbers, dates, or strings).
- **Inline:** `--mark line --x <ordered> --y <number>`
- **Plot marks:** `Plot.line(data, { x, y })`
- **Use when:** showing a trend over an ordered axis.

## area

- **Contract:** ordered `x`, numeric `y`.
- **Inline:** `--mark area --x <ordered> --y <number>`
- **Plot marks:** `Plot.areaY(data, { x, y1: 0, y2: y })`
- **Use when:** emphasizing magnitude over time (volume, running totals).

## dot / scatter

- **Contract:** an `x` and a numeric `y`; numeric x gives a scatter, categorical x gives a dot plot.
- **Inline:** `--mark dot --x <field> --y <number>`
- **Plot marks:** `Plot.dot(data, { x, y })`
- **Use when:** showing the relationship between two variables, or a value per item.

## donut

- **Contract:** rows with a label and a value — `--x <label>` `--y <value>`. Duplicate labels are summed.
- **Inline:** `--mark donut --x <label> --y <value>`
- **Plot marks:** none native — rendered with `d3.arc` (Plot has no donut mark). Slices follow the same color rule as categorical scales (labels in ascending order, `--color-range` recolors).
- **Use when:** showing share of a whole.
- **Notes:** inline flags only — a `--spec` file can't express a donut (no Plot mark to name).

## box

- **Contract:** a categorical `x` (groups) and a numeric `y` (the distribution per group).
- **Inline:** `--mark box --x <category> --y <number>`
- **Plot marks:** `Plot.boxY(data, { x, y })`
- **Use when:** comparing distributions across groups (median, spread, outliers).

## heatmap

- **Contract:** numeric `x` and numeric `y`.
- **Inline:** `--mark heatmap --x <number> --y <number>`
- **Plot marks:** `Plot.rect(data, Plot.binX({ y: "count" }, { x, y, fill: "count" }))` — a binned density, filled by count.
- **Use when:** showing where points cluster; the color scale is sequential, so `--color-range` should be a sequential ramp.

## rule

- **Contract:** a numeric `y`; draws a horizontal reference line at each value.
- **Inline:** `--mark rule --y <number>`
- **Plot marks:** `Plot.ruleY(data, { y })`
- **Use when:** marking thresholds or target lines.

## funnel

- **Contract:** a value and a stage — `--x <value>` `--y <stage>`.
- **Inline:** `--mark funnel --x <value> --y <stage>`
- **Plot marks:** `Plot.barX(data, { y, x1: -value/2, x2: value/2, fill: y })` — centered bars whose width tracks the value.
- **Use when:** showing a conversion pipeline narrowing across stages.

## sparkline

- **Contract:** ordered `x`, numeric `y`.
- **Inline:** `--mark sparkline --x <ordered> --y <number>`
- **Plot marks:** `Plot.line(data, { x, y })` with no axes, 60px tall.
- **Use when:** a tiny inline trend with no axis furniture.

---

## Spec files (`--spec`)

A spec file is a JSON Plot options object — the full setup for a complex or
branded chart, with the brand colors baked into `color.range`:

```json
{
  "data": [{ "month": "Jan", "traffic": 10 }],
  "marks": [{ "type": "barY", "x": "month", "y": "traffic", "fill": "month" }],
  "color": { "range": ["#1d4ed8", "#0f766e"] }
}
```

- `marks` are named by Plot constructor (`barY`, `line`, `areaY`, `dot`, `boxY`, `rect`, `ruleY`, ...); data can live in the file (`data`) or come from `--data`.
- Any other key (`color`, `width`, `x`, `y`, `margin`, ...) is passed to Plot as a plot option.
- Donut is the one chart type a spec file can't express (no Plot mark to name) — use inline flags for it.
- Renders the same chart as equivalent inline flags.