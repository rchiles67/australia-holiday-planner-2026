"""Extract a browser-sized Australia boundary from Natural Earth 1:10m data."""

from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlretrieve
from zipfile import ZipFile

import geopandas as gpd
from shapely import box
from shapely.geometry import mapping


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = PROJECT_ROOT / "src" / "map-data" / "australia-10m.json"
SOURCE_URL = "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries.zip"


def read_countries() -> gpd.GeoDataFrame:
    with TemporaryDirectory(prefix="drift-natural-earth-") as temp_directory:
        temp_path = Path(temp_directory)
        archive_path = temp_path / "countries.zip"
        urlretrieve(SOURCE_URL, archive_path)
        with ZipFile(archive_path) as archive:
            archive.extractall(temp_path)
        return gpd.read_file(temp_path / "ne_10m_admin_0_countries.shp")


def main() -> None:
    countries = read_countries()
    australia = countries.loc[countries["ADM0_A3"] == "AUS"].to_crs("EPSG:4326")

    if len(australia) != 1:
        raise RuntimeError(f"Expected one Australia feature, found {len(australia)}")

    continental_extent = box(112.0, -44.5, 154.0, -9.0)
    geometry = australia.geometry.iloc[0].intersection(continental_extent)
    geometry = geometry.simplify(0.01, preserve_topology=True)

    feature = {
        "type": "Feature",
        "properties": {
            "name": "Australia",
            "source": "Natural Earth 1:10m Admin 0 Countries, version 5.1.1",
            "source_url": "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/",
            "license": "Public domain",
        },
        "geometry": mapping(geometry),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(feature, separators=(",", ":")), encoding="utf-8")

    print(f"Wrote {OUTPUT_PATH}")
    print(f"Geometry type: {geometry.geom_type}; valid: {geometry.is_valid}")
    print(f"Bounds: {tuple(round(value, 4) for value in geometry.bounds)}")


if __name__ == "__main__":
    main()
