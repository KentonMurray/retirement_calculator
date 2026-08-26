# Retirement Calculator

A simple, self-contained retirement savings calculator. It projects how your
savings will grow before retirement, then simulates drawdown after
retirement to estimate whether your money will last.

No build step, no dependencies — just static HTML/CSS/JS, so it can be
hosted directly on GitHub Pages.

## Features

- Projects savings growth from your current age to retirement, using
  monthly contributions and compounding returns.
- Simulates withdrawals in retirement (adjusted for inflation) against a
  configurable post-retirement return rate.
- Shows total contributed, projected balance at retirement, the age your
  savings are projected to run out (if any), and a chart of your balance
  over time.

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
