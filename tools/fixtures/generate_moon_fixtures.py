import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import skyfield
from skyfield.api import Loader, wgs84

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "src" / "domain" / "__fixtures__" / "skyfield-moon-london.json"
CACHE = Path(__file__).resolve().parent / ".cache"

OBSERVER = {"latitude": 51.5072, "longitude": -0.1276, "altitude": 0.011}
START = datetime(2026, 11, 1, 0, 0, tzinfo=timezone.utc)
DAYS = 30
STEP_HOURS = 5


def main():
    load = Loader(str(CACHE))
    ts = load.timescale()
    ephemeris = load("de421.bsp")
    earth, moon = ephemeris["earth"], ephemeris["moon"]
    observer = earth + wgs84.latlon(
        OBSERVER["latitude"], OBSERVER["longitude"], elevation_m=OBSERVER["altitude"] * 1000
    )

    positions = []
    for step in range(0, DAYS * 24, STEP_HOURS):
        t = ts.from_datetime(START + timedelta(hours=step))
        elevation, azimuth, _ = observer.at(t).observe(moon).apparent().altaz()
        positions.append(
            {
                "time": int(round(t.utc_datetime().timestamp() * 1000)),
                "azimuth": round(float(azimuth.degrees), 4),
                "elevation": round(float(elevation.degrees), 4),
            }
        )

    OUTPUT.write_text(
        json.dumps(
            {
                "generator": f"skyfield {skyfield.__version__} with de421",
                "observer": OBSERVER,
                "positions": positions,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {len(positions)} moon positions to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
