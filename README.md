# Meteorite Landings Map

## Overview
Meteorite Landings Map is an interactive explorer of meteorite discoveries around the world. It visualises meteorite locations on a Leaflet map and allows users to filter by year and mass range while surfacing direct links to the original Meteoritical Bulletin records.

The project uses a local, scraped Meteoritical Bulletin dataset rather than the older NASA API feed. This gives the map a broader and more complete dataset, with all records retaining coordinates and more recent coverage.

## Project goals
- Explore meteorite landing locations on a world map
- Filter by mass and year
- Surface meteorite classification, location, and source link details
- Provide a more complete dataset than the older NASA API-based versions commonly found online

## Data source
This project uses the Meteoritical Bulletin as its primary data source:
- https://www.lpi.usra.edu/meteor/metbull.php

### Dataset details
- Total entries: 83,625
- All entries include coordinates
- Data cutoff: October 2024

This is more complete than the older NASA API dataset, which only contains around 45,700 records and stops at 2013. The NASA feed is no longer a reliable or comprehensive source for this project.

## Tech stack
- HTML
- CSS
- JavaScript
- Leaflet
- Leaflet.markercluster

## How it works
The project loads a local CSV file from the repository, parses the meteorite records, validates the coordinates, and renders clusters and markers on the map. Each marker includes a popup with key meteorite information, including place, year, mass, class, and a direct link to the Meteoritical Bulletin entry.

## Project notes
The earlier NASA API approach was limited by incomplete coverage, a smaller dataset, and outdated cutoff dates. This project now relies on the Meteoritical Bulletin data, which is more complete and better suited for a modern interactive meteorite explorer.

## Attributions and resources
- Map rendering: Leaflet JS — https://leafletjs.com/
- Clustering: Leaflet.markercluster — https://github.com/Leaflet/Leaflet.markercluster
- Base map tiles: OpenStreetMap — https://www.openstreetmap.org/
- Meteorite records: Meteoritical Bulletin — https://www.lpi.usra.edu/meteor/metbull.php

## Webpage link
**Webpage at https://sweeteyesbirb.github.io/Meteorite-Landings-Map/**
