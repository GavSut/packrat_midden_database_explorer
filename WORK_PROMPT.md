# Work prompt: Packrat Midden Explorer

Build a complete, maintainable graphical research interface for the uploaded USGS North American Packrat Midden Database Version 5.0. Deliver a GitHub-ready repository whose GitHub Pages home page is the explorer. The user will create the remote repository; do not assume a GitHub account or deploy to a different host.

## Inputs and provenance

Use the uploaded ten Linked, four Unlinked, and six Lookup CSV tables, original README, metadata, and data dictionary. Inspect the actual headers, encodings, keys, sentinel values, taxonomic uncertainty, and recommendation flags before joining. Preserve original files byte-for-byte. Record SHA-256 hashes and join audits. Cite Strickland et al. (2022), DOI 10.5066/P91UOARW. Consult the existing midden mapper for continuity, but build an explorer for the whole database.

## Required interface

- A responsive, accessible research workspace with a large interactive map, filter sidebar, summary counts, linked sample table, sample detail panel, age histogram, and raw-table browser.
- Explore all taxa, with a one-click Pinus monophylla preset. Search original and accepted names; select explicit taxon IDs with any/all matching. Do not silently expand uncertain synonyms.
- Filter by text, country, state/province, ecoregion, elevation, taxon-list completeness, use status, reference, taxon, evidence category, age basis and range, age quality, bounding coordinates, and a selected modern-climate variable.
- Keep calibrated calendar BP and radiocarbon BP separate. Select preferred ages before examining numeric availability. Offer point-age and calibrated interval-overlap matching, cautious-date inclusion, and explicit handling of missing ages. Infinite dates are not exact dates. Explain IntCal13 provenance and the envelope interpretation of interval overlap.
- Map colors and labels update with filters. Include optional gray context points from the same geographic/time/quality selection that lack selected-taxon records, labeled not recorded rather than absent. Group colocated samples without losing records. Include a bundled offline outline map and optional online basemaps with visible failure handling.
- Show complete linked sample, age, taxon, abundance, climate, ecoregion and reference information. Retain source notes and questionable/contaminant flags.
- Browse/search all twenty original tables; filter arbitrary raw columns, select columns, and download results.

## Reproducible downloads

Export filtered sample CSV, long-form occurrence CSV, sample GeoJSON, selected-taxon matrix, and a ZIP of related source-table subsets plus README, query manifest, source hashes and matched ages. Preserve all original ages for selected samples separately from matched ages. Do not invent absences: missing matrix records are blank, explicit absence is 0, rare is 1, present is 2; flag/untranslated values remain distinguishable. Clearly separate foreground downloads from gray context points. Save/reload filter JSON and share query state in the URL. Download counts must refer to all results, not the displayed page.

## Implementation and delivery

Prefer a dependency-light static HTML/CSS/JavaScript application with vendored browser dependencies and a Python-standard-library data preparation script. No API keys, database server, external accounts, or CDN dependency for core use. Include original data, reproducible generated assets, launch instructions, a GitHub Pages workflow, CI tests, methodology, data audit, and a concise execution report. Use relative URLs so project-subpath hosting works. Provide a local launcher for macOS and Windows.

## Acceptance criteria

Verify source row counts, unique and foreign keys, joins, sentinel handling, age selection, boundary-inclusive filtering, any/all taxon logic, background selection, geometry validity, matrix missingness, CSV quoting, related-table export consistency and ZIP contents. Test the actual application when supported browser tooling is available; otherwise disclose the browser verification limit and run appropriate programmatic integration tests. Do not claim a hosted deployment or completed browser QA without evidence. Package the finished repository and this work prompt for download.
