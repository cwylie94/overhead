import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import sgp4
import skyfield
from skyfield.api import EarthSatellite, Loader, wgs84

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "src" / "data" / "snapshot"
OUTPUT = ROOT / "src" / "domain" / "__fixtures__" / "skyfield-london.json"
CACHE = Path(__file__).resolve().parent / ".cache"

OBSERVER = {"latitude": 51.5072, "longitude": -0.1276, "altitude": 0.011}
MIN_ELEVATION = 10.0
SUN_DARK_BELOW = -6.0
WINDOW_START = datetime(2026, 11, 8, 16, 0, tzinfo=timezone.utc)
WINDOW_HOURS = 72
LOOK_ANGLE_SATELLITES = [25544, 48274, 20580, 694]


def millis(t):
    return int(round(t.utc_datetime().timestamp() * 1000))


def load_satellites(ts):
    satellites = {}
    for group in ("visual", "stations"):
        for record in json.loads((SNAPSHOT / f"{group}.json").read_text()):
            satellites[record["NORAD_CAT_ID"]] = EarthSatellite.from_omm(ts, record)
    return dict(sorted(satellites.items()))


def visible_intervals(satellite, observer, earth, sun, ephemeris, ts, rise, set_):
    seconds = np.arange(0, (set_ - rise) * 86400 + 1, 1.0)
    times = ts.tt_jd(rise.tt + seconds / 86400)
    sunlit = satellite.at(times).is_sunlit(ephemeris)
    sun_elevation = (earth + observer).at(times).observe(sun).apparent().altaz()[0].degrees
    elevation = (satellite - observer).at(times).altaz()[0].degrees
    visible = sunlit & (sun_elevation < SUN_DARK_BELOW) & (elevation >= MIN_ELEVATION)

    intervals = []
    start = None
    for index, flag in enumerate(visible):
        if flag and start is None:
            start = index
        if not flag and start is not None:
            intervals.append([millis(times[start]), millis(times[index - 1])])
            start = None
    if start is not None:
        intervals.append([millis(times[start]), millis(times[len(visible) - 1])])
    return intervals


def find_passes(satellite, observer, earth, sun, ephemeris, ts, t0, t1):
    times, events = satellite.find_events(observer, t0, t1, altitude_degrees=MIN_ELEVATION)
    passes = []
    current = None
    for t, event in zip(times, events):
        if event == 0:
            current = {"rise": t, "peaks": []}
        elif event == 1 and current is not None:
            current["peaks"].append(t)
        elif event == 2 and current is not None and current["peaks"]:
            elevations = [(satellite - observer).at(p).altaz()[0].degrees for p in current["peaks"]]
            peak_index = int(np.argmax(elevations))
            passes.append(
                {
                    "riseAt": millis(current["rise"]),
                    "peakAt": millis(current["peaks"][peak_index]),
                    "setAt": millis(t),
                    "maxElevation": round(float(elevations[peak_index]), 3),
                    "visible": visible_intervals(
                        satellite, observer, earth, sun, ephemeris, ts, current["rise"], t
                    ),
                }
            )
            current = None
    return passes


def look_angle(satellite, observer, ephemeris, t):
    elevation, azimuth, distance = (satellite - observer).at(t).altaz()
    return {
        "time": millis(t),
        "azimuth": round(float(azimuth.degrees), 4),
        "elevation": round(float(elevation.degrees), 4),
        "rangeKm": round(float(distance.km), 3),
        "sunlit": bool(satellite.at(t).is_sunlit(ephemeris)),
    }


def main():
    load = Loader(str(CACHE))
    ts = load.timescale()
    ephemeris = load("de421.bsp")
    earth, sun = ephemeris["earth"], ephemeris["sun"]
    observer = wgs84.latlon(
        OBSERVER["latitude"], OBSERVER["longitude"], elevation_m=OBSERVER["altitude"] * 1000
    )

    t0 = ts.from_datetime(WINDOW_START)
    t1 = ts.from_datetime(WINDOW_START + timedelta(hours=WINDOW_HOURS))
    satellites = load_satellites(ts)

    passes = []
    for norad_id, satellite in satellites.items():
        for found in find_passes(satellite, observer, earth, sun, ephemeris, ts, t0, t1):
            passes.append({"noradId": norad_id, **found})
    passes.sort(key=lambda p: (p["riseAt"], p["noradId"]))

    sample_times = [
        ts.from_datetime(WINDOW_START + timedelta(hours=hours)) for hours in range(0, WINDOW_HOURS, 3)
    ]
    sun_positions = []
    for t in sample_times:
        elevation, azimuth, _ = (earth + observer).at(t).observe(sun).apparent().altaz()
        sun_positions.append(
            {
                "time": millis(t),
                "azimuth": round(float(azimuth.degrees), 4),
                "elevation": round(float(elevation.degrees), 4),
            }
        )

    look_angles = []
    for norad_id in LOOK_ANGLE_SATELLITES:
        for t in sample_times[::4]:
            look_angles.append({"noradId": norad_id, **look_angle(satellites[norad_id], observer, ephemeris, t)})

    fixture = {
        "generatedWith": {"skyfield": skyfield.__version__, "sgp4": sgp4.__version__},
        "observer": OBSERVER,
        "minElevation": MIN_ELEVATION,
        "sunDarkBelow": SUN_DARK_BELOW,
        "window": {"start": millis(t0), "end": millis(t1)},
        "sun": sun_positions,
        "lookAngles": look_angles,
        "passes": passes,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(fixture, separators=(",", ":")) + "\n")

    visible = sum(1 for p in passes if p["visible"])
    print(f"{len(passes)} passes for {len(satellites)} satellites, {visible} with a visible part")
    print(f"Written to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
