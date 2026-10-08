"""Convert map research (docs/map/places.json) into game anchors.

Writes src/content/geography.json: every marked place and drawn line in local
meters, origin at grandma's house. The map is rotated so that Vysokaya street,
from grandma's house to the centre, runs straight up the screen: game "up" is
not north but roughly north-north-east.

    python3 tools/map-editor/export.py

Re-run after editing the map in the editor. The scene builds its layout on
top of these anchors; nothing in the output is edited by hand.
"""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLACES = ROOT / "docs" / "map" / "places.json"
OUT = ROOT / "src" / "content" / "geography.json"
ORIGIN_CATEGORY = "дом бабушки"
# First segment of this line (grandma's house -> centre along Vysokaya street) points up.
UP_ALONG = "nb819wu"

M_PER_DEG_LAT = 111_200
M_PER_DEG_LNG_EQUATOR = 111_300


def main():
    places = json.loads(PLACES.read_text())
    origin = next(p for p in places if p["cat"] == ORIGIN_CATEGORY)["coords"][0]
    lat0, lng0 = origin
    m_per_deg_lng = M_PER_DEG_LNG_EQUATOR * math.cos(math.radians(lat0))

    def to_meters(coord):
        lat, lng = coord
        return (lng - lng0) * m_per_deg_lng, (lat0 - lat) * M_PER_DEG_LAT

    street = next(p for p in places if p["id"] == UP_ALONG)["coords"]
    (ax, ay), (bx, by) = to_meters(street[0]), to_meters(street[1])
    bearing = math.atan2(bx - ax, ay - by)  # clockwise from north
    cos_b, sin_b = math.cos(bearing), math.sin(bearing)

    def to_local(coord):
        x, y = to_meters(coord)
        return [round(x * cos_b + y * sin_b, 1), round(-x * sin_b + y * cos_b, 1)]

    out = {
        "source": "docs/map/places.json",
        "origin": {"lat": lat0, "lng": lng0},
        "units": "meters; y up the screen is negative; origin at grandma's house",
        "upBearingDegrees": round(math.degrees(bearing), 1),
        "places": [
            {
                "id": p["id"],
                "type": p["type"],
                "category": p["cat"],
                "name": p["name"],
                "points": [to_local(c) for c in p["coords"]],
            }
            for p in places
        ],
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(places)} places -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
