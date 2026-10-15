# Bundled assets

- Leaflet **1.9.4**, BSD 2-Clause: https://leafletjs.com/ . Files and license in `site/vendor/`. Downloaded from the official project's published package and repository.
- JSZip **3.10.1**, MIT or GPLv3; distributed here under MIT: https://stuk.github.io/jszip/ . License in `site/vendor/`.
- Natural Earth **1:110m country outlines**, public domain: https://www.naturalearthdata.com/about/terms-of-use/ . Source GeoJSON: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson . Fetched 2026-10-15. Geometry unchanged; generated JavaScript strips unused properties. This overview is not a precise political, ownership or navigation map.
- Optional OpenStreetMap raster tiles: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright . Tiles are requested only when the user selects that basemap; not downloaded for bulk offline use.
- Optional Esri World Topographic Map tiles: © Esri and contributors. Attribution is displayed by Leaflet when enabled. Requires a network connection and provider availability.

Database: original uploaded USGS Version 5.0 release. See source README for rights, limitations and citation. All 23 uploaded source files are preserved byte-for-byte.
