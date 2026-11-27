# DroneInvest

**[Open the calculator](https://stanleywoosweeleong.github.io/droneinvestcalc/)**

A responsive, browser-local investment calculator for agricultural drone spraying. Compare buying a drone with manual spraying and outsourcing, then export a transparent investment case.

## Features

- Guided farm, equipment, operations and cost inputs; advanced assumptions remain editable.
- Separate manual/drone water and chemical inputs, with quote-inclusion switches.
- Annual economic costs, upfront cash, monthly replacement-aware payback, five-year savings and discounted savings.
- Day-rate, dedicated and existing-staff labour modes; calendar/cycle-limited battery replacement.
- Rounded-load and half-day labour break-even searches, with a separate capacity check.
- Conservative/base/optimistic stress cases, editable scenario copies and one-at-a-time sensitivity analysis.
- Input verification checklist and explicit missing-data flags.
- Multiple named plans saved in local storage; JSON import/export and monthly cash-flow CSV.
- Printable investment report (use the browser's **Save as PDF** option).
- Responsive layouts, accessible form labels, keyboard controls and print styles.

## Run and build

Requires Node.js 22 or later. The app has no runtime dependencies. Run `npm ci` to install the DOM test dependency before running checks.

```sh
npm ci
npm run check
npm test
npm run build
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Serve over HTTP; ES modules do not support opening `index.html` directly as a file. Deploy `dist/` to any static host. Relative asset paths support subdirectory hosting, including GitHub Pages.

`.openai/hosting.json` identifies the associated private Sites deployment. GitHub Actions validates the app and uploads a ready-to-host static build on every push. GitHub Pages publishes `main` at the repository root: `index.html` renders the calculator directly at `/droneinvestcalc/` without redirecting. Its HTML base resolves assets from `src/`, and `.nojekyll` disables README/Jekyll rendering. The build keeps this root entry synchronized with `src/index.html`. The dependency-free source app runs directly as static files, while other hosts can use the identical app copied to `dist/` by the build. The GitHub repository is the user-facing source of truth; the Sites source remote contains the same commit for publication.

## Calculation engine

`src/model.js` is a pure calculation module, independent of the interface. `src/fields.js` contains input metadata and sample defaults. `src/app.js` renders the guided interface and report. `src/storage.js` validates imported plans and preserves locally saved incomplete drafts.

The seven fixture configurations in `tests/workbook-fixtures.json` come from the corrected spreadsheet prepared in this project. Tests verify annual costs, cash expenses, five-year cash flow, discounting, break-even searches and other results against those independently recalculated values. Additional tests cover missing/invalid inputs, scope switches, capacity, replacement boundaries and storage.

Sample baseline: 10 acres, 450 trees, 36 rounds annually, MYR 63,500 upfront investment. Day-rate annual economic cost is MYR 34,004.52 versus manual cost MYR 97,560. Monthly cash payback is 10 months under the sample assumptions. These are **illustrative figures, not verified market quotes or a purchase recommendation**.

## Model boundaries

- Currency is MYR. Starting prices are source-workbook assumptions, not live supplier data.
- Annual economic equipment allocations and five-year cash purchases are deliberately separate.
- Missing optional costs calculate as zero and remain labelled missing. No missing input is silently marked verified.
- A round is not automatically a battery cycle. Both cycle-life and cycles-per-load inputs are needed to use cycle wear.
- One active drone and crew; purchasing multiple drones does not automatically multiply throughput.
- Equal monthly use; constant prices/workload. Battery-pool replacements follow the earlier age/cycle life. Replacements exactly at the five-year horizon are excluded.
- Existing-staff labour has an economic opportunity cost, but only the selected incremental cash share is paid in the cash forecast.
- Payback is the first nonnegative cumulative monthly saving, excluding resale. Later replacements may reduce cumulative savings again.
- Terminal resale affects five-year cash savings and NPV, not annual depreciation or payback.
- Financing is an interest/fee allowance, not a loan amortisation model. No tax, inflation, yield improvement or agronomic efficacy is assumed.
- Break-even search: 1–365 whole rounds and 0.25–100 acres in 0.25-acre increments. Area scenarios preserve tree density and recompute rounding; capacity is separate.
- Stress scenarios are transparent illustrative adjustments, not confidence intervals. Conservative delay increases are capped at 100%.

## Data and privacy

Plan inputs are stored only in browser local storage, with no application account, database or analytics. Clearing browser storage removes plans. Export JSON backups for transfer or safekeeping. The app uses system font fallbacks and has no third-party font dependency. No plan data is sent to a server.

## Verification status

Automated financial and storage tests and static build pass. Browser QA could not run in the authoring environment because the managed preview relay timed out. Desktop/mobile interaction and print appearance should receive a visual acceptance pass on the deployed site.

## Installable PWA and offline use

Open the app online once, then choose **Install app**. Chrome/Edge can show a native install prompt; Safari users can use Share → Add to Home Screen. Dedicated PNG icons include standard 192/512 sizes, maskable variants with a safe-zone design, and a 180px Apple touch icon.

The manifest launches at the project root in standalone mode. The root `sw.js` controls `/droneinvestcalc/`, including its `src/` assets. The static `dist/` build has its own root-relative manifest and worker for hosting at any directory. No special Service-Worker-Allowed header is needed.

The entire local app shell is precached at installation, so calculations, local plans, JSON/CSV exports and report generation work offline after successful setup. Browser print-to-PDF availability remains browser dependent. The status panel shows offline readiness. Plans remain in local storage; the service worker never caches plan data or external requests.

Builds hash the HTML, manifest, app assets and worker template into a release cache name. An update installs completely before being offered. Users select **Update available · reload** to activate it; activation removes only obsolete DroneInvest caches for the same scope. Other open tabs reload on activation, using already autosaved plans. Clearing browser storage removes offline files and saved plans; export backups first.

`npm run build` regenerates tracked `index.html`, `manifest.webmanifest` and `sw.js` for branch-based Pages, plus the independent `dist/` deployment. Commit those generated root files with source updates. The service worker serves a consistent cached release until an update is accepted.

## Mobile layout and languages

The toolbar language switch supports English, Simplified Chinese and Bahasa Melayu. Preference is stored locally and works offline. Interface text, input notes, validation, reports, scenarios and PWA guidance are translated; user-entered names/notes and canonical model values remain unchanged. Locale-aware number/date formatting never changes the MYR currency or financial calculations. Translation messages live in `src/locales/messages.js`; `src/i18n.js` applies them to display text only.

On phones, Inputs/Results tabs avoid scrolling through the whole form to see results. Fields use a single column, 16px input text, larger touch targets and normal page scrolling. The offline/install panel is in document flow rather than covering form controls. Desktop comparison remains side by side.

The update control explicitly handles a waiting worker, an already-activated worker, installation in progress and an activation timeout. It shows progress, re-enables retries on failure and reloads on worker activation even if a controllerchange notification is missed. Worker activation now retains its message event until skipWaiting completes.

## Analysis credit

The original 10-acre drone-spraying cost analysis was prepared by **Bryan Woo (胡学轩)**, in the source workbook `2026-0922 Drone_Spraying_Cost_10acre by Bryan.xlsx`. DroneInvest adapts and extends his analysis with additional scenarios, calculation checks and an interactive application. Bryan Woo is credited for the original analysis in the app footer, methodology page and printable investment report, in English, Chinese and Malay.
