# Overhead

Overhead is a React Native (Expo) app that finds satellites passing over the user tonight, guides them to each one in the sky, and lets them "catch" it into a collection. It must work fully offline, because the best viewing spots have no signal.

Core loop: **Plan** (Tonight list) → **Point** (Sky view) → **Catch** (hold aim for 2 s) → **Collect** (card in the collection).

It is an interview showcase project, so code quality, tests and a working demo mode matter more than feature count.

## Coding conventions

- No code comments unless absolutely necessary. Use clear names and small functions instead. Only comment on non-obvious reasons, such as a workaround or an external constraint.
- TypeScript strict mode. No `any`.
- Use the project's ESLint and Prettier config. Don't hand-format.

## Git

- Commits are authored only by the user (Craig Wylie <wyliec94@gmail.com>). Never add `Co-Authored-By` trailers, "Generated with Claude Code" lines or any other mention of Claude or AI tools in commit messages or PR descriptions.
- Commit in logical, reasonably sized chunks, often, as work progresses. Each commit should be one coherent change that builds and passes tests. Don't batch a whole phase into one commit.
- Write commit messages in the imperative mood, with a short subject line and a body only when the reason isn't obvious.

## Stack

- Expo, TypeScript, Expo Router
- State: Zustand (UI and session state only), with persist and MMKV on `settingsStore`
- Data: expo-sqlite and Drizzle ORM, using live queries for reads
- Orbits: satellite.js, loaded from OMM JSON with `json2satrec`
- i18n: i18next, react-i18next and expo-localization
- Animation: Reanimated, Gesture Handler and Skia
- Device: expo-haptics, expo-notifications, NetInfo and device sensors
- Backend: Hono on Cloudflare Workers with D1
- Tests: Jest, React Native Testing Library and Maestro

## Working with Expo

- The project is on Expo SDK 58 and runs on Node 24 (`.nvmrc`). Expo APIs change between SDKs, so check the versioned docs at `https://docs.expo.dev/versions/v58.0.0/` (or `https://docs.expo.dev/llms.txt`) rather than relying on memory.
- Add packages with `npx expo install <package>`, never `npm install`, so versions match the SDK. Use `npx expo-doctor` to diagnose dependency problems.
- iOS and Android only; there is no web target.
- `ios/` and `android/` are generated (Continuous Native Generation) and git-ignored. Configure native behaviour through `app.json` and config plugins, never by editing those folders.
- The app runs as a development build (`expo-dev-client`), not Expo Go, because MMKV has native code Expo Go doesn't include. `npm run ios` builds and launches it. Rebuild only after adding or changing a native dependency or `app.json`. For JS-only changes, `npm start` is enough.
- CocoaPods is pinned per project in `Gemfile` and installed into `vendor/bundle`. It needs Ruby 3.3 or later, and this Mac's is Homebrew's keg-only Ruby at `/opt/homebrew/opt/ruby/bin`. Put that first on `PATH` for iOS builds. Never upgrade the global `pod` or system Ruby.
- Real-iPhone builds: `npm run ios:device` (Release, no dev server). The team ID comes from `APPLE_TEAM_ID` in `.env.local` through `app.config.ts`, so it stays out of git. Build with `EXPO_PUBLIC_SYNC_URL=` empty, because the local Worker's `127.0.0.1` means the phone itself. A new profile needs `xcodebuild … -allowProvisioningUpdates` once, which `expo run:ios` doesn't pass.
- Routes live in `src/app/` and stay thin: each route file re-exports a screen from `src/features/`.
- Run `npm run lint`, `npm run typecheck` and the tests before calling a task done.

## Architecture rules

- SQLite is the single source of truth for data. Database rows never go into Zustand. Screens read them with Drizzle live queries.
- Only the sync engine talks to the network. Screens never call an API directly.
- All orbit maths lives in the pure `domain/` layer and takes a clock and a location as inputs. Never call `Date.now()` or read sensors inside `domain/`.
- Fast-changing sensor data (compass heading, tilt) stays in Reanimated shared values, never in Zustand.
- Components subscribe to stores with selectors, e.g. `useSkyStore(s => s.selectedNoradId)`.
- Stores in `src/stores/` hold UI and session state only. `settingsStore` and `syncStore` (last sync time and account ID) persist to MMKV via `persistStorage`, with `partialize` listing exactly what is saved. Pure logic, such as the catch state machine, lives in `src/domain/`, and its store only dispatches events to it. Actions that change nothing must return the same state, so subscribers aren't notified.
- Test stores by calling actions directly, resetting with `useXStore.setState(useXStore.getInitialState())`. Jest swaps MMKV for its in-memory mock in `jest.setup.ts`.
- Time and place are injected through `src/environment/`: `ClockProvider` / `useClock` / `useNow` and `LocationProvider` / `useLocation`. Never call `Date.now()` in components or hooks. `LocationProvider` takes a `fixed` observer (the demo location, or a city chosen in Settings as `customLocation`) and otherwise uses GPS. It's one component either way, so switching never remounts the navigation; keep it that way, because swapping provider components resets the Stack.
- The city picker searches `src/data/cities/cities.json` (GeoNames, CC BY 4.0, cities of 100,000 or more plus capitals, English names only) with `searchCities`. Refresh it with `npm run cities:update`. The credit must stay visible in the picker. The last location is saved, rounded to about 1 km, in `settingsStore`, so an offline launch still has an observer.
- Passes are computed into SQLite by the pass cache (`src/data/passCache/`). `refreshPassCache` covers 30 minutes ago to 48 hours ahead, stores only passes with a visible part, and is keyed on the orbit data, rounded location and minimum elevation. The runner lives outside React, cancels runs that have been overtaken and yields to the UI between chunks. `PassCacheProvider` schedules it, and `usePassCache().refresh()` forces a recompute.
- Screens read through query builders in `src/data/queries.ts` with `useLiveQuery` from `src/data/liveQuery/` (lint blocks Drizzle's). Expo SQLite reports every changed row separately, and Drizzle's hook re-ran the whole query for each one, so rewriting a few hundred passes reloaded the Tonight and Sky lists hundreds of times. iOS killed the app for memory (signal 9, no crash report). Ours waits for a burst to settle and reloads once. A screen is a thin data hook plus a presentational view that takes plain props, and tests render the view directly. Anything a test needs from a hook file (such as `staleDaysFor`) lives in its own module, because hook files import native modules (expo-sqlite, Reanimated) that don't load in Jest.
- Screens get the database from `useAppData()` (`src/data/AppDataContext.tsx`), never by importing it. `src/demo/session.ts` owns the app session (the `AppData` for the device or demo database, plus the demo clock and location) and the root layout remounts everything under `AppDataProvider` when it changes.
- Haptics go through `src/ui/haptics.ts`, which checks the setting; never call `expo-haptics` directly. The motion preference sets Reanimated's global reduce-motion mode (`MotionConfig`), so plain animations follow it automatically. Animations that carry information, such as the clock driving the dots or the catch progress, pass `ALWAYS_ANIMATE`. Use `useReduceMotion()` for anything that isn't a Reanimated animation, such as disabling the card tilt.
- Reminders are local notifications with stable IDs (`pass-<noradId>-<startMinute>`). The scheduled notifications are the source of truth, so nothing else stores them.
- Sky view (`src/features/sky/`): time, paths, dots, zoom and heading all live in Reanimated shared values. Their maths is worklets (`projection.ts`, `timeline.ts`, `domeDots.ts`, `domeGeometry.ts`) that take the precomputed tracks, so nothing re-renders while scrubbing. Keep anything that imports Skia out of the files tests need, because Skia's native module doesn't load in Jest.
- Read and write shared values with `.get()` / `.set()`, not `.value`. The React Compiler lint treats `.value =` in gesture callbacks as mutation.
- Skia 2 paths are built with `Skia.PathBuilder.Make()…build()`. A `Group` applies `transform` before `clip`, so to clip zoomed content, put the clip on an outer group and the transform on an inner one.
- If the device reports a function as undefined right after you've added it, Metro's cache is probably stale. Restart it with `npx expo start --dev-client --clear` before debugging further. After editing a module the root layout loads at start-up (`src/demo/session.ts`, `src/i18n/`, the translation files), relaunch the app rather than trusting Fast Refresh, which can leave the screen frozen and ignoring taps.
- Catch mode (`src/features/catch/`):
  - Pointing is the compass heading from `expo-location` plus the camera's elevation and roll from `DeviceMotion` gravity (smoothed), in shared values (`usePointing`). Expo reports gravity pointing down in device coordinates on both platforms: lying flat with the screen up gives z = −g. Don't use `DeviceMotion.rotation`: its Euler angles break down with the phone held upright.
  - Moon calibration stores the offset between the raw reading and the Moon (`src/domain/moon.ts`, within 0.4° of Skyfield) in `calibrationStore`, in memory only. `usePointing` applies it to every reading, and `pointing.raw` keeps the uncorrected one for calibrating. Offsets over 45° are rejected as aimed at the wrong thing.
  - Camera mode (`CameraCatchView`, VisionCamera 5) is offered only with sensors and a back camera, so never on the simulator or in demo mode. The overlay projects the sky with `cameraProjection.ts`: the field of view comes from the lens's 35 mm-equivalent focal length, assuming the 4:3 photo frame fills the view (`resizeMode="cover"`). The catch logic is the same in both modes; only the drawing changes.
  - With no sensor data within 2.5 s (as on the simulator), it falls back to drag-to-aim. Demo mode can force that.
  - A 50 ms JS ticker feeds the catch machine, with readings that count only while a finger is down and the pass has started.
  - Catch mode opens up to 10 minutes early (`catchWindow` in `src/domain/catchWindow.ts`): Tonight shows Get ready, the marker waits dimmed where the satellite will appear, and nothing can be caught or logged as seen until it does.
  - Log sightings through `logSighting` (UUIDv7 IDs), and guard against duplicates with something stable such as the catch time, never a flag an effect resets.
  - Untested on real hardware: whether the iOS heading follows the back camera when the phone is upright, and how accurate the field of view is. Check both on a phone, using the Moon marker, before the demo.
- Routes outside the tabs: `catch/[passId]` (full-screen modal) and `satellite/[noradId]` (modal), both declared in the root `Stack`.
- Compute pass tracks once, as a point every 10 s stored in `passes`. Worklets interpolate between points, so no orbit maths runs per frame.
- The pass finder (`src/domain/passFinder.ts`) is checked against Skyfield fixtures across all 172 satellites: rise, set and visible boundaries within 2 s. Keep those tolerances. If a change breaks them, fix the change, not the test. It skips ahead while a satellite is out of reach, so one night for the whole catalogue costs about 117k SGP4 propagations: 1.6 s in Node, 1.2 s under Hermes on the simulator. Check `npm run bench` after touching it.
- The database sits behind repository interfaces, so the same code runs on the device and in Node tests.

## Folder structure

```
src/
  domain/    pure TS: pass finder, visibility, angle maths, rarity, collection rules
  data/      Drizzle schema, repositories, migrations
  sync/      outbox, push/pull, CelesTrak fetcher, refresh rules
  stores/    Zustand: settingsStore, skyStore, catchStore, syncStore
  i18n/      i18next setup, typed keys, locales/{en,es}/*.json
  features/  tonight/, sky/, catch/, collection/, settings/
  ui/        shared components, Skia primitives, haptics
server/      Hono Worker with D1: the sync API, its migrations and tests
```

## Data model

| Table        | Purpose                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| `satellites` | NORAD ID, name, type, owner, launch date and rarity, from the bundled catalogue        |
| `orbits`     | One OMM JSON row per satellite, replaced on refresh                                    |
| `passes`     | Cached predictions with track points, recalculated when orbit data or location changes |
| `sightings`  | UUIDv7 ID, verified flag, angle error and note. Never edited except the note           |
| `outbox`     | Changes waiting to sync                                                                |
| `sync_meta`  | Pull cursor and last fetch time per CelesTrak group                                    |

There is no collection table. The collection is derived from sightings.

- The schema lives in `src/data/schema.ts`. After changing it, run `npm run db:generate` and commit the generated files in `src/data/migrations/`. Never edit the generated migrations by hand.
- Times are stored as integer milliseconds since the Unix epoch, not `Date` objects.
- Repositories (`src/data/repositories/`) are synchronous and take a `Database`, which works with both expo-sqlite on the device and better-sqlite3 in tests. Test them with `createTestDatabase()`, which applies the real migrations to an in-memory database.

## Domain rules

- **Catch:** only inside a predicted visible pass window, with the aim (heading plus tilt) within about 10° of the predicted position for 2 s, in any aiming mode (sensors, camera or drag-to-aim). Every catch adds to the collection, and there is no separate "seen" state. The `verified` column stays in the schema and the sync protocol so older clients keep working; new sightings always set it.
- **Catch state machine** (in `catchStore`): idle → aiming → locked → caught / failed.
- **Visibility:** the sun is more than 6° below the horizon, the satellite is in sunlight, and the elevation is above the user's minimum.
- **Rarity** is a fixed function of catalogue data, so every device agrees. It forms a pyramid, each tier larger than the one above (18 / 28 / 57 / 69 in the current snapshot):
  - Legendary: launched before 1980
  - Rare: a named mission (a payload that isn't a station or constellation member)
  - Uncommon: a rocket body launched 1980–1999
  - Common: everything else, including modern rocket bodies, stations, crew and cargo craft, constellation members and debris
- How often a satellite is visible from the user's location is a card stat, never part of rarity, because it varies by place and over time.
- **Collection sets** (`src/domain/collectionSets.ts`): each satellite is in exactly one set, decided in this order. Space stations (`stationMembers`: the objects in CelesTrak's stations group that are docked together, or named ISS, CSS or Tiangong; not the CubeSats and debris CelesTrak also lists there), Observatories and Earth watchers (NORAD ID lists with names), Cold War veterans (launched before 1992), Spent stages (later rocket bodies and debris), Constellations (commercial constellations only), and Spies & secrets for the rest. The set is stored on `satellites` at import, like rarity. A test fails if a listed ID's name no longer matches the bundled catalogue.
- **The collection** is derived, never stored (`deriveCollection`): a satellite is caught at its earliest sighting.
- **Docked objects** share their station's element set exactly, so `dockingHosts` groups identical orbits and makes the oldest object the host (ISS ZARYA, CSS TIANHE). Docked objects get no passes and are hidden from the collection unless already seen. It's worked out when read, not stored, so a vehicle that undocks reappears as soon as its own orbit arrives.
- **Brightness** is an estimate, accurate to about a magnitude (`src/domain/brightness.ts`):
  - The standard magnitude (at 1000 km, half lit) is `5.5 − 2.5·log10(RCS)`, from SATCAT's radar cross-section. It's calibrated roughly on the ISS and Hubble, and stored on `satellites` at import.
  - Objects without a cross-section, mostly recent launches, use a typical size for their type. ISS and CSS station modules use 100 m².
  - A pass's `peakMagnitude` is its brightest moment across the visible parts, adjusted for distance and sun angle (diffuse-sphere phase function).
  - Tiers: brilliant ≤ 1, bright ≤ 3, faint beyond. Passes fainter than `NAKED_EYE_LIMIT` (4.5) aren't worth listing.
  - All the constants are starting points to tune against real observations.
- After changing the rarity or set rules, bump `CATALOGUE_RULES_VERSION` in `src/domain/catalogue.ts` so existing installs re-sort their catalogue. A bundled-snapshot test fails if a refresh breaks the rarity pyramid or leaves a set empty.

## Network and sync

- CelesTrak only, for two groups (`visual`, `stations`) and SATCAT. Never fetch the full active catalogue.
- Wait at least 2 hours between fetches per group, because CelesTrak returns HTTP 403 when you download too soon. Back off exponentially on errors and never retry immediately.
- A bundled snapshot of both groups and their SATCAT records lives in `src/data/snapshot/*.json`, so the first launch works offline. `prepareDatabase()` runs the migrations and then `importSnapshot` on every launch. The import is idempotent: it reloads the catalogue only when the snapshot or the rarity rules have changed since the last import, and a group's orbits only when the snapshot is newer than the stored ones. Refresh it with `npm run snapshot:update` (one request per endpoint, so it respects CelesTrak's limits), then commit the JSON.
- Show a staleness banner when orbit data is several days old.
- CelesTrak refresh (`src/sync/celestrak.ts`) keeps per-group failure counts and retry times in `sync_meta`. Backoff starts at 5 minutes and doubles up to 6 hours; a 403 waits the full 2 hours. A failed or malformed response never replaces stored orbits.
- Writing a sighting and its outbox entry happens in one transaction. Push is idempotent (the server inserts or ignores by ID). Delete outbox entries only after the server confirms them.
- Identity is an anonymous account ID (UUIDv7) generated on the device and kept in `syncStore`. Once set it is never replaced. There is no login.
- Sync (`src/sync/`):
  - `runSync` pushes the outbox, pulls changes, then refreshes orbits, and refreshes passes if orbits changed. `SyncProvider` runs it on launch, on returning to the foreground, on reconnecting and from Sync now in Settings, one run at a time.
  - Push sends up to `MAX_PUSH_BATCH` changes and deletes only the entries the server lists in `accepted`. A sighting is marked synced only when none of its changes are still pending.
  - The server bumps a per-account version for every push and stamps each changed row with it. Pull returns rows above the cursor in version order, `PULL_PAGE_SIZE` at a time; the cursor is stored in `sync_meta` under `sync.pullCursor`.
  - Only the note can change after a sighting is logged. The last note edit to reach the server wins, and a pull never overwrites a sighting with a pending local change.
  - The wire types live in `server/src/protocol.ts` and are shared by the app and the Worker. Change them in one place, and keep old clients working.
- The server (`server/`) is its own npm package. Run `npm install` and `npm run db:migrate:local` there once, then `npm run dev` serves it on port 8787. The app syncs only when `EXPO_PUBLIC_SYNC_URL` is set (in `.env.local`, see `.env.example`). Without it, sightings stay on the device and orbits still refresh. Restart Metro after changing it, because `EXPO_PUBLIC_` values are inlined at bundle time.
- Server routes take a structural `D1Like` type, so tests run the real app against `fakeD1` (better-sqlite3). The root `tsconfig.json` excludes `server/`, which has its own type check against the Workers types (`npm run typecheck` in `server/`).
- Deploying needs a Cloudflare account: create the D1 database, put its ID in `server/wrangler.toml` in place of the placeholder, run `npm run db:migrate:remote`, then `npm run deploy`.
- Pass fixtures come from Skyfield, never a live API. N2YO isn't used.

## i18n

- English and Spanish, with Arabic and right-to-left layout as a stretch goal.
- Strings live in `src/i18n/locales/<language>/<namespace>.json`: `common` for shared UI, plus one namespace per feature, added when that feature first needs strings. Register new namespaces and languages in `src/i18n/resources.ts`.
- Keys are typed, so a missing or misspelt key fails `npm run typecheck`. Plurals use i18next's `_one` / `_other` suffixes with `count`.
- Format times, countdowns and distances with the helpers in `src/i18n/format.ts`. Never build them by hand. Satellite names stay untranslated.
- Hermes on iOS has no `Intl.PluralRules`, `Intl.RelativeTimeFormat` or `Intl.Locale`, and its `Intl.NumberFormat` silently converts units to the device region's system. `src/i18n/polyfills.ts` loads the `@formatjs` polyfills (forcing NumberFormat) and must stay the first import. When adding a language, add its locale data there too.
- Node has full `Intl`, so passing tests don't prove device behaviour. Check new formatting on a simulator. Hermes' own `Intl.DateTimeFormat` isn't polyfilled and lacks `formatToParts`, so use `format()` only.

## Testing

- Write domain tests first. Pass predictions use a fixed orbit snapshot, a London location and a fixed clock, and must match the Skyfield fixtures within ±2 s.
- Sync tests run two simulated devices against the real Worker app over in-memory SQLite (`src/sync/__tests__/sync.test.ts`): push replay is harmless, the cursor advances, a crash mid-sync loses nothing, and note edits reach the other device. CelesTrak tests cover the 2-hour rule and backoff with a fake fetcher and clock.
- Store tests call actions directly, with no rendering, and cover forbidden state transitions.
- Translation tests fail if any locale is missing a key or a plural form its language needs (Spanish needs `_many` as well as `_one` and `_other`).
- Maestro flows live in `.maestro/` and run with `npm run e2e` against a running build. They start from `clearState` and use the `overhead://demo` link for a known evening. Give elements a flow needs a `testID` (such as `catch-<noradId>`) rather than matching on text that changes. Maestro can't hold a drag in place, so it can't complete an aimed catch.

## Demo mode

- Turn it on by tapping the version in Settings five times, or with the `overhead://demo` link (`?enabled=0` turns it off). The flag is `demoMode` in `settingsStore`, so it survives a relaunch.
- The demo pass is the first ISS pass over London after the snapshot was taken that peaks at 40° or higher and magnitude −2 or brighter (`src/demo/scenario.ts`). The clock starts a minute before it appears and then runs in real time. It's derived from the snapshot, so it still works after `npm run snapshot:update`; the tests fail if a refresh leaves no such pass.
- Each start deletes and recreates `overhead-demo.db` and imports the bundled snapshot, so demo catches never touch the real collection.
- In demo mode, sync, the CelesTrak refresh, reminders, the staleness banner and the pending-changes badge are off, and Catch mode forces drag-to-aim.

## Build phases

1. Foundation: Expo, tooling, Drizzle schema, i18n, stores, bundled snapshot
2. Domain logic, test first
3. Tonight screen
4. Sky view
5. Catch and collection
6. Sync: outbox engine, Hono Worker, CelesTrak refresh
7. Polish: demo mode, haptics and reduce motion, Spanish, Maestro, README

Never cut sync, tests or demo mode. Cut first: Arabic and right-to-left layout, achievements.
