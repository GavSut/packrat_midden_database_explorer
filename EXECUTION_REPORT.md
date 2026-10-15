# Execution report

Completed 2026-10-15. Work specification: `WORK_PROMPT.md`.

## Delivered

A complete static GUI and GitHub Pages-ready project. The home page is an interactive explorer with a map, filter sidebar, age histogram, paginated samples, linked details, raw-table browser and reproducible downloads. The entire application runs locally; internet is needed only for optional detailed basemaps or GitHub hosting.

The repository includes the original data, data compiler, generated browser assets, local launchers, developer tests, third-party licenses and GitHub Actions build/test/deployment workflow. No remote GitHub repository was created and no site was published; the user requested a package for a repository they will create.

## Data audit

| Item | Count |
|---|---:|
| Original source files | 23 |
| Linked / unlinked / lookup tables | 10 / 4 / 6 |
| Samples | 3,331 |
| Samples with map coordinates | 3,039 |
| Samples without map coordinates | 292 |
| Age rows | 3,843 |
| Taxon definitions | 1,815 |
| Taxon–sample rows | 29,393 |
| References | 336 |
| Samples with modern climate rows | 2,929 |

Every occurrence row and age row joins to a sample. Four case-only IDs were reconciled against unique master-table matches: DG3A → DG3a, GSP2a → GSP2A, MCWC1A → MCWC1a, MCWC1B → MCWC1b. Raw files remain unchanged. The audit records every source SHA-256, size, row count and CSV encoding. No unresolved sample/taxon join errors or missing parsed reference IDs remain.

## Checks performed

**27 automated checks passed:**

- Five Python checks cover number/sentinel handling, selecting preferred ages before numeric availability, failed pooled/infinite dates, original-file hashes and exact deployed copies, and duplicate-ID rejection.
- Fifteen Node checks cover full release counts, complete joins, inclusive point/interval age matching, calibrated/radiocarbon separation, cautious and infinite dates, optional missing dates, taxon any/all logic, explicit absence versus non-records, real pinyon/context filtering, geographic/climate bounds, invalid query rejection, geometry, matrix missingness, relational subsets, CSV quoting and spreadsheet safety, raw numeric filters, and empty exports.
- Seven DOM integration checks exercise application startup, taxon and age controls, linked details, pagination and raw search, full-selection GeoJSON downloads, ZIP archive contents and manifest, reset and empty-result handling. The actual vendored Leaflet and JSZip scripts are loaded. Canvas drawing and dialog support are stubbed in this test environment.

Additional checks: JavaScript syntax; local HTML asset references; ZIP packaging and inclusion of hidden GitHub workflow files.

A reproducible check: exact original-name Pinus monophylla, codes 1 or 2, 0–10,000 calibrated years BP, default recommended-age quality gives **97 foreground samples** and **1,285 context samples**. These are sample counts, not unique site counts. The exported ZIP was unpacked in the integration check and verified to contain related data, source documentation, query metadata and matrices.

## Verification limits and design boundaries

- **Full browser visual rendering and live online tile loading were not tested.** Browser-control tooling was unavailable. DOM integration checks do not establish pixel layout, touch behavior or browser download UX. CSS includes responsive and accessible controls, and the offline outline map removes dependency on external tiles for basic use.
- The GitHub Actions workflow is supplied but has not run on a remote GitHub repository. Enable Pages → GitHub Actions, push the project, then inspect the first deployment.
- Country outlines are coarse Natural Earth orientation data. No missing coordinates are inferred and sensitive/approximate source locations are not refined.
- Synonym expansion is explicit, not automatic. The Pinus monophylla shortcut selects the exact original taxon name; broader concepts require selecting the desired VARNUMs.
- Age-envelope overlap is exploratory, not probability integration. Modern climate data must not be interpreted as reconstructed paleo-climate. Original notes and codes remain available.
- The source code-translation reference table is subset by exact citation matches; exact occurrence-specific standardized values always come from MCOUNT_TRANSLATION. Unlinked and lookup tables remain complete in analysis ZIPs for interpretation context.
- Original source documents are UTF-8 encoded inside analysis ZIPs for convenience; the repository's `data/raw/` and original-file download links preserve original bytes.

## Next action

Unzip, open `site/index.html`, and inspect a familiar sample. To host, upload the project contents—including `.github`—to the root of the new repository. Enable **Settings → Pages → GitHub Actions** and run the included workflow. `README.md` provides exact commands.
