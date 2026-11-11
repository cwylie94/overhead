# How Overhead works

## What it does

The loop is **Plan → Point → Catch → Collect**:

- **Tonight** lists every visible pass for the next two nights, with when and where to look, how bright it will be and how rare it is. You can ask for a reminder 5 minutes before. It uses GPS, or a city you choose in Settings, which also works if you'd rather not share your location.
- **Sky** shows the dome overhead with each satellite's path. Drag the timeline to see the sky later tonight, pinch to zoom, or turn on Compass to match the dome to the way you're facing.
- **Catch** points you at a satellite during its pass, and opens up to 10 minutes early so you can get ready. Keep the crosshair on it for 3 seconds, guided by haptic pulses, to catch it; with the phone's sensors there's no need to touch the screen. The catch reveals its card, with how close you were, your set's progress and the next pass worth catching. On a phone you can show the camera behind the crosshair, with the satellite's path drawn over the real sky, and line up the Moon to correct the compass.
- **Collection** groups everything you've caught into themed sets, with a card for each satellite.

Built with Expo (SDK 58), React Native and TypeScript, in English and Spanish.

## Demo mode

Demo mode replays a fixed evening so the app can be shown anywhere, any time. Turn on the Demo mode switch in Settings (tapping the version number five times also works), or open the `overhead://demo` link (`overhead://demo?enabled=0` turns it off).

- The clock starts a minute before a bright ISS pass over London, picked from the bundled orbit data, and runs in real time from there.
- Catch mode aims with the compass on a phone, and falls back to drag-to-aim on a simulator. Camera mode is off, because the demo's Moon isn't where the real one is.
- It runs on its own database, recreated each time the demo starts, so demo catches never reach your real collection. Reminders and the orbit refresh are off.

## Scripts

| Script                            | What it does                                |
| --------------------------------- | ------------------------------------------- |
| `npm start`                       | Start the dev server for an installed build |
| `npm run ios` / `npm run android` | Build and launch the development build      |
| `npm run ios:device`              | Build a Release app for a connected iPhone  |
| `npm run android:device`          | Build a Release app for an Android phone    |
| `npm run ios:release`             | Build a Release app for the simulator       |
| `npm run lint`                    | Lint with ESLint                            |
| `npm run format`                  | Format with Prettier                        |
| `npm run typecheck`               | Type-check with TypeScript                  |
| `npm test`                        | Run the Jest test suite                     |
| `npm run test:coverage`           | Run the tests and check coverage thresholds |
| `npm run db:generate`             | Generate a migration from the schema        |
| `npm run snapshot:update`         | Refresh the bundled CelesTrak snapshot      |
| `npm run cities:update`           | Refresh the bundled GeoNames city list      |
| `npm run fixtures:passes`         | Regenerate the Skyfield reference passes    |
| `npm run bench`                   | Time pass finding for the whole catalogue   |
| `npm run e2e`                     | Run the Maestro flows on the simulator      |

## Architecture

```
src/
  domain/        pure TypeScript: pass finder, sun, look angles, rarity, sets, brightness, catch state machine
  data/          SQLite schema (Drizzle), repositories, migrations, bundled snapshot, pass cache
  sync/          CelesTrak refresh and its triggers
  environment/   injected clock and location
  session/       the app session that swaps in demo mode, and the wiring that starts its data
  demo/          the demo pass
  reminders/     pass reminders as local notifications
  features/      tonight, sky, catch, collection, satellite, location, onboarding, settings
  stores/        Zustand for UI and session state, persisted to MMKV
  translations/  i18next with typed keys, English and Spanish
```

- **Layers only import downwards.** `domain/` is pure, `data/` depends only on it, and features never import each other; what two features share lives in `domain/` or `ui/`. A lint rule enforces this.
- **SQLite is the single source of truth.** Screens read with Drizzle live queries, so a catch or a new pass list shows up everywhere without any state passed around. Zustand only holds UI state such as the selected satellite or the catch in progress.
- **Orbit maths is pure and injected.** Everything in `domain/` takes the time and the observer as arguments, and the app gets them from a `ClockProvider` and a location provider. That is what makes the tests deterministic and lets demo mode swap in a fixed evening without touching any screen.
- **Passes are computed once and cached.** The pass cache works out 48 hours of passes for the whole catalogue in chunks of 12 satellites on a background worker runtime from react-native-worklets, so the screens stay responsive while it runs (one night takes about 1.2 s under Hermes) and stores each pass with a track point every 10 seconds. It reruns only when the orbits or the minimum elevation change, or you move more than 5 km. A 5 km move shifts a satellite 400 km up by under 1°, well inside the 10° catch tolerance, so GPS jitter and altitude readings don't trigger a rerun.
- **The Sky view never re-renders while it moves.** Time, zoom and heading are Reanimated shared values, and the dome is drawn with Skia from worklets that interpolate the stored tracks, so scrubbing stays smooth.
- **The database comes from an app session.** The root layout reads the session (the database, its repositories and the pass cache runner, plus the demo clock and location in demo mode) and remounts the app when it changes.

### Finding passes

`findPasses` scans each satellite's orbit (SGP4, via satellite.js) at a coarse step, refines the peak with a golden-section search and the rise and set times by bisection, and skips ahead while the satellite is too far round the Earth to be seen. A pass counts as visible while the satellite is sunlit, above the minimum elevation and the sky is dark. Brightness is estimated from the satellite's radar cross-section, distance and sun angle.

## Orbit data

Everything stays on the phone; there is no account and no server. The only network access is CelesTrak. The app refreshes orbits on launch, on returning to the foreground, and when the network comes back, at most once every 2 hours per group, because CelesTrak blocks clients that ask more often. After a failure it backs off from 5 minutes, doubling up to 6 hours, and keeps the existing orbits. Settings shows how old the orbit data is.

## Reference pass fixtures

The pass finder is tested against [Skyfield](https://rhodesmill.org/skyfield/), an independent astronomy library, run on the same bundled snapshot. The plan called for N2YO, but N2YO predicts from its own copy of the orbit data, so differences could come from either the data or our maths. Skyfield uses identical input, so any disagreement is a bug in our code, and the tolerance can be a few seconds instead of 30.

The fixtures are committed in `src/domain/__fixtures__/`. Regenerating them needs Python 3.9 or later, and only after refreshing the snapshot:

```bash
python3 -m venv tools/fixtures/.venv
tools/fixtures/.venv/bin/pip install -r tools/fixtures/requirements.txt
npm run fixtures:passes
```

## Testing

- **Jest** covers the domain maths, repositories (against in-memory SQLite with the real migrations), schema migrations, stores, the CelesTrak refresh, formatting, translations and the presentational views. Run `npm test`, or `npm run test:coverage` for a coverage table (the full report is in `coverage/index.html`).
- **Pass predictions** are checked against Skyfield for every satellite in the snapshot, to within 2 seconds.
- **Maestro** flows in `.maestro/` drive onboarding, the demo evening, the demo toggle and the language switch on a simulator. Install the [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro) (it needs Java 17 or later), install a Release build with `npm run ios:release`, then run `npm run e2e`. The flows need a Release build: each one clears the app's data, which sends a development build back to its server picker. Maestro can't hold a drag in place, so the aim-and-hold catch itself is covered by the catch state machine's tests and by hand.

## Trade-offs

- **A chosen city can't be verified.** Catches made with a city set in place of GPS still count, so the setting suits planning and people who'd rather not share their location, but nothing stops someone catching another city's satellites. Times stay in the phone's time zone, which can confuse when planning a trip.

- **Skyfield instead of N2YO for reference passes**, as explained above.
- **Brightness is an estimate.** Magnitudes come from radar cross-section, which is only a rough proxy for how much sunlight a satellite reflects, so they are good to about one magnitude. The constants are calibrated on the ISS and Hubble.
- **Rarity and sets are rules, not a curated list.** Rarity follows a pyramid (few legendary, many common) from launch date, object type and whether it's a station or constellation member. Sets are mostly rules with two short named lists. That keeps a snapshot refresh from needing manual work, at the cost of the odd surprising choice.
- **A bundled snapshot plus a cautious refresh.** The app ships with orbit data so the first launch works offline, and refreshes each CelesTrak group at most every 2 hours.
- **No server.** Catches live only on the phone, which keeps the app simple and private, but a lost phone means a lost collection.
- **Camera mode corrects the compass instead of trusting it.** Phone compasses are often 5–15° off, which is more than the catch tolerance. Lining up the Moon, whose position the app works out to within 0.4°, measures that error directly. The correction lasts for the session, because the error changes as you move.
- **Expo with development builds, not ejected.** Native code (MMKV, Skia, sensors) comes in through config plugins, so `ios/` and `android/` are generated and never edited.

## Next steps

- Try camera mode on a real phone: check the heading follows the back camera when the phone is upright, and the overlay lines up with the Moon away from the centre. On Android the heading is computed from the magnetometer and checked against the emulator's virtual sensors, so it still needs a real Android phone.
- Calibrate on bright planets as well as the Moon, for nights when the Moon is down.
- Calibrate brightness against real observations.
- Group docked station modules (the ISS currently appears as ZARYA, NAUKA and POISK).
- Let people move their collection to a new phone, for example with an export file.
- Show times in a chosen city's own time zone, and accept local-language city names (Londres, Edimburgo).
- Add Arabic with right-to-left layout.
