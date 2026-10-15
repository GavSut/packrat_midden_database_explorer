# Explorer 1.1 — performance and usability update

Prepared against the public repository `gavsut/packrat_midden_database_explorer` at commit `8627cc2bdceb489893c61a669e1062c397457237` on 2026-10-15. The deployed page was inspected interactively. This update has not been pushed or deployed.

## Changes

- **Basemap obstruction fixed:** online raster tiles and the filled offline country layer are now mutually exclusive. Offline outlines also have a dedicated pane below the tile pane, separate from the point renderer. Switching basemaps does not redraw sample markers. Tile event listeners are cleaned up after Leaflet's layer-removal lifecycle.
- **Smaller startup:** exploration data are packed into column arrays and expanded once on load. Initial data: **16,148,944 → 3,559,705 bytes (78.0% reduction)** before HTTP compression. Complete raw tables and documentation load on demand, with loading/error/retry handling and a version check. This is a payload measurement, not a claim of a 78% reduction in browser load time.
- **Less repeated work:** cache converted table objects and point ages; reuse coordinate-group markers; cache sorted and related tables; debounce text input and slider movement; avoid painting the hidden map; index occurrences once per matrix row instead of rescanning them for every taxon.
- **Shorter research workflow:** time-window presets, removable active-filter chips, automatic time-filter activation when bounds are edited, selected-sample count in the download button, expandable map, collapsible sidebar, selectable table page size, a jump to selected samples, clearer missing list status, and wider sidebar fields. The legend sits below the map rather than covering it.
- **Clearer exports:** download progress, duplicate-export prevention, and a frozen query snapshot during asynchronous export. Pending typing is applied before export. All result pages and original source notes remain included.
- **Deployment:** npm cache and quieter dependency installation in the existing GitHub Actions workflow. Scientific checks still gate deployment.

## Verification

- Five Python data/build tests, fifteen core query/export tests, and thirteen DOM integration checks passed.
- Ten representative queries produced identical foreground IDs, context IDs and long-form occurrence exports to the deployed version: all records, pinyon, pinyon 0–10k cal BP, explicit absence, unrecorded taxa, Nevada, radiocarbon ages, calibrated interval overlap, climate ranges and missing-age inclusion.
- Entire 3,331 × 1,815 taxon matrix output is unchanged. A single Node measurement on this machine was 1,650 ms before versus 1,270 ms after; this is not a controlled browser benchmark.
- DOM regression checks cover repeated outline/OSM/Esri switching, no point redraw on basemap changes, delayed source-table loading, map/sidebar controls, filter presets/removal, pagination, sample details, ZIP/GeoJSON, reset, empty results and uncaught errors.
- Original data remain unchanged; all 29,393 occurrence rows and 3,843 age rows remain linked.
- Local asset paths and JavaScript syntax checked. Update archive is extracted and compared byte-for-byte before delivery.

The existing deployment was viewed in a real browser. The changed version was tested with DOM integration (canvas drawing stubbed); its pixel layout, actual tile delivery and hosted deployment are not visually verified here. GitHub publishing is not connected for this task, so the live URL remains unchanged until this update is committed.

## Data files

`site/data/explorer.js` is the initial index. `site/data/details.js` is loaded only for full detail inspection, raw tables and exports that need original rows. `site/loader.js` also supports opening `site/index.html` directly. The old `site/data/database.js` is unused; the build removes it from the generated website. No original files under `data/raw/` are modified.
