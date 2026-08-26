# Retirement Calculator

A simple, self-contained retirement calculator with two tools: a savings
projector and a defined-benefit pension estimator.

No build step, no dependencies — just static HTML/CSS/JS, so it can be
hosted directly on GitHub Pages.

## Features

**Savings Calculator**
- Projects savings growth from your current age to retirement, using
  monthly contributions and compounding returns.
- Simulates withdrawals in retirement (adjusted for inflation) against a
  configurable post-retirement return rate.
- Shows total contributed, projected balance at retirement, the age your
  savings are projected to run out (if any), and a chart of your balance
  over time.

**Pension Calculator**
- Estimates an annual defined-benefit pension as years of service ×
  accrual rate × final average salary, reduced for starting before your
  plan's normal retirement age.
- Shows the estimated annual/monthly pension, the early-retirement
  reduction applied, and the income replacement ratio.
- One click sends the estimated pension into the Savings Calculator's
  "other income" field.

**Monte Carlo Simulation** (part of the Savings Calculator)
- Runs hundreds to thousands of randomized versions of the savings
  projection, drawing a new annual return/inflation rate from a normal
  distribution (centered on your assumptions, with a standard deviation
  you set) each year of each simulation.
- Reports the probability your savings last through your life expectancy,
  the median and 10th-percentile ending balance, and the median age
  savings run out across failed runs.
- Draws a "fan chart" of the 10th/50th/90th percentile balance over time,
  so you can see the range of outcomes instead of a single line.

## Running locally

Just open `index.html` in a browser, or serve the folder with any static
file server, e.g.:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploying to GitHub Pages

1. Push this repo to GitHub (or merge this branch into your default branch).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch".
4. Choose the branch (e.g. `main`) and folder `/ (root)`, then save.
5. GitHub will publish the site at `https://<username>.github.io/<repo>/`.

## Disclaimer

This tool provides a simplified educational projection only. It is not
financial advice. Actual investment returns, inflation, and expenses will
vary, often significantly, from any fixed assumptions.
