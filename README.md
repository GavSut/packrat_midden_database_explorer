# Packrat Midden Explorer

A complete, static research interface for the **USGS North American Packrat Midden Database, Version 5.0**. The explorer is the home page of the GitHub Pages site. No account, API key, backend, or browser package installation is needed.

## Open it now

Unzip the project, keep the folders together, and open **`site/index.html`** in your browser. Core mapping, filters and downloads work without internet. The offline map uses bundled country outlines; detailed online basemaps are optional.

Alternatively, from the project directory:

```bash
python3 scripts/serve.py
```

This opens `http://127.0.0.1:8765/`. macOS users can run `Launch.command` (Terminal: `bash Launch.command`); Windows users with Python can run `Launch.bat`. If opening files directly is restricted in your browser, use the Python launcher.

## Make it your GitHub website

1. Create an empty GitHub repository, for example **packrat-midden-explorer**, with `main` as its default branch.
2. Put the **contents** of this project at the repository root. Include the `.github` folder; do not upload just the ZIP or nest everything inside another folder. Using Git is recommended because GUI uploads can omit hidden files.
3. In the repository, choose **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Push a commit, or use **Actions → Build and publish Midden Explorer → Run workflow**. The workflow rebuilds the data, runs checks, and publishes `site/`.
5. Open the URL displayed by the deployment, normally `https://YOUR-USERNAME.github.io/packrat-midden-explorer/`. Put it in the repository’s **About → Website** field for easy access.

Example terminal commands, after creating your empty repository:

```bash
cd packrat-midden-explorer
git init -b main
git add .
git commit -m "Add complete packrat midden database explorer"
git remote add origin https://github.com/YOUR-USERNAME/packrat-midden-explorer.git
git push -u origin main
```

Replace `YOUR-USERNAME` and the repository name. No remote repository has been created or published for you. GitHub Pages access depends on repository visibility and account plan. A Pages deployment makes the bundled database available to its audience.

The workflow follows [GitHub’s official Pages instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Project-relative asset paths also work at a repository subpath.

## Explore and download

- **Explore:** interactive grouped map, age/elevation/evidence colors, optional age labels, complete sample table and details, age histogram, and four selection counts.
- **Filters:** locality text, explicit taxa with any/all logic, abundance codes, calibrated versus radiocarbon ages, interval overlap, cautious ages, geography, coordinate bounds, elevation, ecoregion, modern climate, source and quality codes.
- **Pinus monophylla preset:** exact original scientific-name match, codes 1 or 2. Explicitly select other VARNUMs to include varieties, uncertain identifications or hybrids.
- **Gray context:** same non-taxon filters, but no records of any selected taxon. Not confirmed absence. Context is excluded from analysis downloads.
- **Data tables:** browse all 20 source tables and every column, filter text/numbers, choose columns and download the full result. Original bytes remain available separately.
- **Download:** sample CSV, long-form occurrence CSV, GeoJSON, taxon matrix or complete analysis ZIP. All matching rows are exported, not just the visible page.
- **Save / load filters:** portable JSON; **Copy view link** stores the query in the URL fragment. With local file URLs, share the filter JSON instead.

## Scientific interpretation

Selection is at **SAMCODE** level. Colocated samples are grouped visually without collapsing their records. Preferred ages are selected before checking numeric availability; no fallback from calendar to radiocarbon scale. The methods page explains pooled recommendations, cautious ages, calibrated envelopes and infinite dates.

The original calibration is **IntCal13 / CALIB 7.0.4**, not IntCal20. Both age scales use BP relative to 1950. The map and histogram show the youngest usable preferred point age under current filters; they are not uncertainty-aware chronological analyses.

Taxon codes are **0 absent, 1 rare, 2 present, 9 possible contaminant**. Unrecorded matrix cells remain empty. Source notes, partial lists and uncertain identifications need review. Accepted names and synonyms are searchable/inspectable without automatic taxonomic merging.

Missing numeric values (`99999`, blanks, `n/a`) become null in normalized outputs, while original tables retain the source values. Climate columns describe modern climate. Missing coordinates never remove a sample from a non-spatial selection; GeoJSON retains it with null geometry.

## Contents

| Path | Purpose |
|---|---|
| `site/index.html` | Main explorer page |
| `site/app.js`, `site/style.css` | Interface and presentation |
| `site/core.js` | Pure filtering and export logic |
| `site/data/database.js` | Generated complete database |
| `site/data/audit.json` | Source hashes and join audit |
| `site/vendor/` | Leaflet, JSZip, Natural Earth outlines and licenses |
| `data/raw/` | Unchanged uploaded CSVs, README, dictionary and metadata |
| `scripts/build_data.py` | Reproducible compiler; Python standard library only |
| `scripts/serve.py` | Local launcher |
| `tests/` | Data, query and export checks |
| `.github/workflows/pages.yml` | Build/test/publish workflow |
| `WORK_PROMPT.md` | Executed work specification |
| `EXECUTION_REPORT.md` | What was implemented and verified |

## Updating the dataset

Replace the corresponding original files under `data/raw/` and run:

```bash
python3 scripts/build_data.py
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/test_core.cjs
```

Optional DOM interaction checks (requires Node.js and the development dependency):

```bash
npm ci --ignore-scripts
npm test
```

The DOM test stubs canvas drawing; it does not replace a visual browser review.

Commit the changed sources and generated assets together. The compiler checks duplicate IDs, orphan references and one-to-one count translations. Four unique case-only source discrepancies are reconciled and listed in the audit; the raw files are never rewritten. Arbitrary ID differences stop the build. If a future release changes its schema, update the compiler and methodology deliberately.

## Source and attribution

Strickland, L.E., Thompson, R.S., Anderson, K.H., Pelltier, R.T., Shafer, S.L., Bartlein, P.J., Schumann, R.R., and McFadden, A.K., 2022, **USGS North American Packrat Midden Database, Version 5.0**, U.S. Geological Survey data release. https://doi.org/10.5066/P91UOARW.

The release’s original disclaimer, citations and data dictionary are preserved. Third-party source material remains under its applicable terms. This interface is not an official USGS product. Application code is MIT licensed; see `LICENSE`. Dependency licenses and map attribution are in `THIRD_PARTY.md`.
