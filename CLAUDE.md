# Overhead

Overhead is a React Native (Expo) app that finds satellites passing over the user tonight, guides them to each one in the sky, and lets them "catch" it into a collection. It must work fully offline, because the best viewing spots have no signal.

Core loop: **Plan** (Tonight list) → **Point** (Sky view) → **Catch** (hold aim for 3 s) → **Collect** (card in the collection).

It is an interview showcase project, so code quality, tests and a working demo mode matter more than feature count.

## Coding conventions

- No code comments unless absolutely necessary. Use clear names and small functions instead. Only comment on non-obvious reasons, such as a workaround or an external constraint.
- TypeScript strict mode. No `any`.
- Use the project's ESLint and Prettier config. Don't hand-format.
- Use `Text` from `@/ui/Text`, never React Native's (lint enforces it). It caps font scaling at 200% (`MAX_FONT_SCALE`), the largest size the layouts are checked at: Android's maximum and iOS's AX2. Check new screens at that size; rows that can overflow should wrap rather than squeeze.

## Git

- Commits are authored only by the user (Craig Wylie <wyliec94@gmail.com>). Never add `Co-Authored-By` trailers, "Generated with Claude Code" lines or any other mention of Claude or AI tools in commit messages or PR descriptions.
- Commit in logical, reasonably sized chunks, often, as work progresses. Each commit should be one coherent change that builds and passes tests. Don't batch a whole phase into one commit.
- Write commit messages in the imperative mood, with a short subject line and a body only when the reason isn't obvious.

## Stack

- Expo, TypeScript, Expo Router
- State: Zustand (UI and session state only), with persist and MMKV on `settingsStore`
- Data: expo-sqlite and Drizzle ORM, using live queries for reads
- Orbits: satellite.js, loaded from OMM JSON with `json2satrec`
- Translations: i18next, react-i18next and expo-localization
- Animation: Reanimated, Gesture Handler and Skia
- Device: expo-haptics, expo-notifications, NetInfo and device sensors
- Tests: Jest, React Native Testing Library and Maestro

## Working with Expo

- The project is on Expo SDK 58 and runs on Node 24 (`.nvmrc`). Expo APIs change between SDKs, so check the versioned docs at `https://docs.expo.dev/versions/v58.0.0/` (or `https://docs.expo.dev/llms.txt`) rather than relying on memory.
- Add packages with `npx expo install <package>`, never `npm install`, so versions match the SDK. Use `npx expo-doctor` to diagnose dependency problems.
- iOS and Android only; there is no web target.
- `ios/` and `android/` are generated (Continuous Native Generation) and git-ignored. Configure native behaviour through `app.json` and config plugins, never by editing those folders.
- The app runs as a development build (`expo-dev-client`), not Expo Go, because MMKV has native code Expo Go doesn't include. `npm run ios` builds and launches it. Rebuild only after adding or changing a native dependency or `app.json`. For JS-only changes, `npm start` is enough.
- CocoaPods is pinned per project in `Gemfile` and installed into `vendor/bundle`. It needs Ruby 3.3 or later, and this Mac's is Homebrew's keg-only Ruby at `/opt/homebrew/opt/ruby/bin`. Put that first on `PATH` for iOS builds. Never upgrade the global `pod` or system Ruby.
- Android: `npx expo prebuild --platform android`, then `./gradlew app:assembleDebug` (or `assembleRelease`) in `android/` with `JAVA_HOME` set to Android Studio's bundled JBR. The `Pixel_9_API_37` emulator (Android 17, 6 GB RAM) is set up for testing; its virtual sensors can be posed with `adb emu sensor set acceleration|magnetic-field`. The debug build's "nearby devices" prompt comes from `expo-dev-launcher` and isn't in release builds.
- Real-iPhone builds: `npm run ios:device` (Release, no dev server). Leave the team out of the config: with no team in the Xcode project, `expo run:ios` picks the signing certificate and passes `-allowProvisioningUpdates`, which creates the profile. Someone else's team needs their own bundle ID, set with `IOS_BUNDLE_ID` in `.env.local` through `app.config.ts`.
- Routes live in `src/app/` and stay thin: each route file re-exports a screen from `src/features/`.
- Run `npm run lint`, `npm run typecheck` and the tests before calling a task done. `npm run test:coverage` adds a coverage report (HTML in `coverage/`, git-ignored) and fails below the thresholds in `jest.config.js`: a global floor plus stricter ones for `domain/`, `stores/`, `sync/`, `data/repositories/`, `demo/`, `session/` and `translations/`. Raise them when coverage goes up; never lower them to make a run pass. Shared test helpers live in `testing/` folders, which coverage ignores. Reanimated won't load in Jest (nor will its own mock), so hook tests replace it with `src/testing/reanimated.ts`: `jest.mock('react-native-reanimated', () => jest.requireActual('@/testing/reanimated'))`. `jest.config.js` exits early below the `.nvmrc` Node version, because better-sqlite3 segfaults Jest workers on Node 20.

## Architecture rules

- SQLite is the single source of truth for data. Database rows never go into Zustand. Screens read them with Drizzle live queries.
- There is no backend. The only network access is the CelesTrak orbit refresh in `src/sync/`; screens never call an API directly. Sightings stay on the phone.
- All orbit maths lives in the pure `domain/` layer and takes a clock and a location as inputs. Never call `Date.now()` or read sensors inside `domain/`.
- Fast-changing sensor data (compass heading, tilt) stays in Reanimated shared values, never in Zustand.
- Components subscribe to stores with selectors, e.g. `useSkyStore(s => s.selectedNoradId)`.
- Stores in `src/stores/` hold UI and session state only. `settingsStore` persists to MMKV via `persistStorage`, with `partialize` listing exactly what is saved. Pure logic, such as the catch state machine, lives in `src/domain/`, and its store only dispatches events to it. Actions that change nothing must return the same state, so subscribers aren't notified.
- Test stores by calling actions directly, resetting with `useXStore.setState(useXStore.getInitialState())`. Jest swaps MMKV for its in-memory mock in `jest.setup.ts`.
- Time and place are injected through `src/environment/`: `ClockProvider` / `useClock` / `useNow` and `LocationProvider` / `useLocation`. Never call `Date.now()` in components or hooks. `LocationProvider` takes a `fixed` observer and otherwise uses GPS. The session decides it (`src/session/location.ts`): the demo's place, otherwise the city chosen in Settings, otherwise none. Screens that label the chosen city read `useChosenLocation()`, which is empty in the demo. It's one component either way, so switching never remounts the navigation; keep it that way, because swapping provider components resets the Stack. With permission but no fix and no saved location, it reports an estimate (`estimated: true`) from the phone's time zone (`estimatedLocation.ts`: the bundled city the zone is named after, otherwise London) and keeps a `watchPositionAsync` subscription open until the first fix. The estimate is never saved as the last location and isn't labelled on screen. Catch won't start from an estimate, because its passes were worked out for the wrong place.
- The city picker searches `src/data/cities/cities.json` (GeoNames, CC BY 4.0, cities of 100,000 or more plus capitals, English names only) with `searchCities`. Refresh it with `npm run cities:update`. The credit must stay visible in the app; it lives under About in Settings. The last location is saved, rounded to about 1 km, in `settingsStore`, so an offline launch still has an observer.
- Passes are computed into SQLite by the pass cache (`src/data/passCache/`). `refreshPassCache` covers 30 minutes ago to 48 hours ahead, stores only passes with a visible part, and is keyed on the orbit data, rounded location and minimum elevation. The runner lives outside React, cancels runs that have been overtaken and yields to the UI between chunks. `PassCacheProvider` (`src/session/`) schedules it, and `usePassCache().refresh()` forces a recompute for the last requested place at the current time.
- Screens read through query builders in `src/data/queries.ts` with `useLiveQuery` from `src/data/liveQuery/` (lint blocks Drizzle's). Expo SQLite reports every changed row separately, and Drizzle's hook re-ran the whole query for each one, so rewriting a few hundred passes reloaded the Tonight and Sky lists hundreds of times. iOS killed the app for memory (signal 9, no crash report). Ours waits for a burst to settle and reloads once. It reloads only when the table the query selects from changes, not a joined one, so a screen that must follow two tables uses two queries. A screen is a thin data hook plus a presentational view that takes plain props, and tests render the view directly. Anything a test needs from a hook file (such as `staleDaysFor`) lives in its own module, because hook files import native modules (expo-sqlite, Reanimated) that don't load in Jest.
- Screens get the database from `useAppData()` (`src/data/AppDataContext.tsx`), never by importing it. `src/session/appSession.ts` owns the app session (the `AppData` for the device or demo database, plus the demo clock and location) and the root layout remounts everything under `AppDataProvider` when it changes.
- Haptics go through `src/ui/haptics.ts`, which checks the setting; never call `expo-haptics` directly. The motion preference sets Reanimated's global reduce-motion mode (`MotionConfig`), so plain animations follow it automatically. Animations that carry information, such as the clock driving the dots or the catch progress, pass `ALWAYS_ANIMATE`. Use `useReduceMotion()` for anything that isn't a Reanimated animation, such as disabling the card tilt.
- Reminders are local notifications with stable IDs (`pass-<noradId>-<startMinute>`). The scheduled notifications are the source of truth, so nothing else stores them.
- Sky view (`src/features/sky/`): time, paths, dots, zoom and heading all live in Reanimated shared values. Their maths is worklets (`projection.ts`, `timeline.ts`, `domeDots.ts`, `domeGeometry.ts`) that take the precomputed tracks, so nothing re-renders while scrubbing. Keep anything that imports Skia out of the files tests need, because Skia's native module doesn't load in Jest.
- Read and write shared values with `.get()` / `.set()`, not `.value`. The React Compiler lint treats `.value =` in gesture callbacks as mutation.
- Skia 2 paths are built with `Skia.PathBuilder.Make()…build()`. A `Group` applies `transform` before `clip`, so to clip zoomed content, put the clip on an outer group and the transform on an inner one.
- If the device reports a function as undefined right after you've added it, Metro's cache is probably stale. Restart it with `npx expo start --dev-client --clear` before debugging further. After editing a module the root layout loads at start-up (`src/session/appSession.ts` and anything in `src/translations/`, including the translation files), relaunch the app rather than trusting Fast Refresh, which can leave the screen frozen and ignoring taps.
- Catch mode (`src/features/catch/`):
  - Pointing is the compass heading from `expo-location` plus the camera's elevation and roll from `DeviceMotion` gravity (smoothed), in shared values (`usePointing`). Expo reports gravity pointing down in device coordinates on both platforms: lying flat with the screen up gives z = −g. Don't use `DeviceMotion.rotation`: its Euler angles break down with the phone held upright.
  - On Android the heading is worked out from gravity and the `Magnetometer` (`cameraAzimuth` in `cameraHeading.ts`), because `expo-location`'s Android heading is the direction of the phone's top edge (180° off with the phone tilted back at the sky), needs location permission and only reports after a 2° change from north. Its heading is still read for magnetic declination and the calibration hint.
  - Moon calibration stores the offset between the raw reading and the Moon (`src/domain/moon.ts`, within 0.4° of Skyfield) in `calibrationStore`, in memory only. `usePointing` applies it to every reading, and `pointing.raw` keeps the uncorrected one for calibrating. Offsets over 45° are rejected as aimed at the wrong thing.
  - Camera mode (`CameraCatchView`, VisionCamera 5) is offered only with sensors and a back camera, so never on the simulator or in demo mode. The overlay projects the sky with `cameraProjection.ts`: the field of view comes from the lens's 35 mm-equivalent focal length, assuming the 4:3 photo frame fills the view (`resizeMode="cover"`). The catch logic is the same in both modes; only the drawing changes.
  - With no sensor data within 2.5 s (as on the simulator), it falls back to drag-to-aim. Demo mode aims with the compass like normal use on a phone.
  - `CatchScreen` only decides whether to wait for a location, say the pass isn't up (`CatchMessage`) or catch. `useCatch` gathers the pointing, catch session, camera aim, drag gesture (`useAimGesture`) and animated time into props for `CatchView`, which only lays them out.
  - The catch session (`startCatchSession` in `catchSession.ts`) runs outside React, like the pass cache runner: a 50 ms ticker feeds the catch machine (`aimCounts`), and it plays the haptics and logs the catch as each transition happens. Readings count once the pass has started, always with sensors and only while a finger is down in drag-to-aim. `useCatchSession` only starts it, stops it and passes it the pointing.
  - Catch mode opens up to 10 minutes early (`catchWindow` in `src/domain/catchWindow.ts`): Tonight shows Get ready, the marker waits dimmed where the satellite will appear, and nothing can be caught or logged as seen until it does.
  - The Caught screen (`CaughtOverlay` → `CaughtView`) is worked out by `catchSummary.ts`: a new catch or a repeat, a personal best, the set's progress (and whether this catch completes it) and the next worthwhile pass starting within 10 minutes. Its card flip, progress fill and burst live in `CaughtEffects.tsx`, which view tests mock. Rare and Legendary catches get a stronger haptic.
  - Log sightings through `logSighting` (UUIDv7 IDs), from the transition that caught the satellite, never from an effect that watches the catch state.
  - Untested on real hardware: whether the iOS heading follows the back camera when the phone is upright, and how accurate the field of view is. Check both on a phone, using the Moon marker, before the demo.
- Routes outside the tabs: `catch/[passId]` (full-screen modal), `satellite/[noradId]` (modal) and `onboarding`, all declared in the root `Stack`.
- Onboarding (`src/features/onboarding/`) shows on first launch until `onboardingComplete` is set in `settingsStore`, and never in demo mode (`needsOnboarding`). The tabs layout redirects to it and it redirects back, rather than using `Stack.Protected`: a protected screen falling back could land on the `demo` route, and that link turns demo mode on. The settings migration marks installs that already had a location as complete. Location isn't requested at launch until onboarding is done, so the iOS prompt appears from its location step. Show intro again under About replays it. The steps are welcome, how catching works, camera mode, reminders and location. Location comes last and finishes onboarding (with GPS, or Continue once a city is chosen), and it's where Try the demo lives. Skip jumps straight to it, because a place is the one thing the app needs. The camera step's walkthrough is sequenced by `cameraScenes.ts` and drawn by `CameraSky` (Skia), which view tests mock. The catching step's `LoupeDemo` sweeps a pretend finger along a sample night (`sampleNight.ts`) and draws Tonight's own `Loupe`, so it always matches the real magnifier; it holds still on the ISS when motion is reduced.
- Compute pass tracks once, as a point every 10 s stored in `passes`. Worklets interpolate between points, so no orbit maths runs per frame.
- The pass finder (`src/domain/passFinder.ts`) is checked against Skyfield fixtures across all 172 satellites: rise, set and visible boundaries within 2 s. Keep those tolerances. If a change breaks them, fix the change, not the test. It skips ahead while a satellite is out of reach, so one night for the whole catalogue costs about 117k SGP4 propagations: 1.6 s in Node, 1.2 s under Hermes on the simulator. Check `npm run bench` after touching it.
- The database sits behind repository interfaces, so the same code runs on the device and in Node tests.

## Folder structure

```
src/
  domain/        pure TS: pass finder, visibility, angle maths, rarity, collection rules, pass ranking
  data/          Drizzle schema, repositories, migrations, snapshot, pass cache, cities
  sync/          CelesTrak fetcher, refresh rules and triggers
  environment/   injected clock and location
  session/       the app session and the React wiring that starts its data: database gate, pass cache provider, orbit updates
  demo/          the demo pass
  reminders/     pass reminders (local notifications) and their button
  stores/        Zustand: settingsStore, skyStore, catchStore, calibrationStore
  translations/  i18next setup, typed keys, locales/{en,es}/*.json
  features/      tonight/, sky/, catch/, collection/, satellite/, location/, onboarding/, settings/
  ui/            shared components, Skia primitives, haptics, the Loupe and dome projection
```

- Layers only import downwards, and `npm run lint` enforces it (`import/no-restricted-paths` in `eslint.config.js`). `domain/` imports only `domain/`. `data/` imports only `domain/`. Nothing outside `features/` and `app/` imports a feature, and features never import each other: code two features share moves into `domain/` (rules) or `ui/` (components). Tests and `testing/` helpers are exempt.

## Data model

| Table        | Purpose                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| `satellites` | NORAD ID, name, type, owner, launch date and rarity, from the bundled catalogue        |
| `orbits`     | One OMM JSON row per satellite, replaced on refresh                                    |
| `passes`     | Cached predictions with track points, recalculated when orbit data or location changes |
| `sightings`  | UUIDv7 ID, angle error and note. Never edited except the note                          |
| `sync_meta`  | CelesTrak failure counts and retry times per group                                     |

There is no collection table. The collection is derived from sightings.

- The schema lives in `src/data/schema.ts`. After changing it, run `npm run db:generate` and commit the generated files in `src/data/migrations/`. Never edit the generated migrations by hand.
- Times are stored as integer milliseconds since the Unix epoch, not `Date` objects.
- Repositories (`src/data/repositories/`) are synchronous and take a `Database`, which works with both expo-sqlite on the device and better-sqlite3 in tests. Test them with `createTestDatabase()`, which applies the real migrations to an in-memory database.

## Domain rules

- **Catch:** only inside a predicted visible pass window, with the aim (heading plus tilt) within about 10° of the predicted position for 3 s, in any aiming mode (sensors, camera or drag-to-aim). With sensors the aim counts on its own; in drag-to-aim it counts only while a finger is down, because the finger is the aim. Every catch adds to the collection, and there is no separate "seen" state.
- **Catch state machine** (in `catchStore`): idle → aiming → locked → caught / failed.
- **Visibility:** the sun is more than 6° below the horizon, the satellite is in sunlight, and the elevation is above the user's minimum.
- **Rarity** is a fixed function of catalogue data, so every device agrees. It forms a pyramid, each tier larger than the one above (18 / 28 / 57 / 69 in the current snapshot):
  - Legendary: launched before 1980
  - Rare: a named mission (a payload that isn't a station or constellation member)
  - Uncommon: a rocket body launched 1980–1999
  - Common: everything else, including modern rocket bodies, stations, crew and cargo craft, constellation members and debris
- How often a satellite is visible from the user's location is a card stat, never part of rarity, because it varies by place and over time.
- **Collection sets** (`src/domain/collectionSets.ts`): each satellite is in exactly one set, decided in this order. Space stations (`stationMembers`: the objects in CelesTrak's stations group that are docked together, or named ISS, CSS or Tiangong; not the CubeSats and debris CelesTrak also lists there), Observatories and Earth watchers (NORAD ID lists with names), Cold War veterans (launched before 1992), Spent stages (later rocket bodies and debris), Constellations (commercial constellations only), and Spies & secrets for the rest. The set is stored on `satellites` at import, like rarity. A test fails if a listed ID's name no longer matches the bundled catalogue.
- **The collection** is derived, never stored (`deriveCollection`): a satellite is caught at its earliest sighting. Screens read it through `useCollection()` (`src/data/useCollection.ts`), never by assembling the queries themselves.
- **Docked objects** share their station's element set exactly, so `dockingHosts` groups identical orbits and makes the oldest object the host (ISS ZARYA, CSS TIANHE). Docked objects get no passes and are hidden from the collection unless already seen. The orbit repository stores each object's host in `orbits.docked_to` whenever orbits are written, and the launch import fills it in for installs that predate the column. A vehicle that undocks reappears as soon as its own orbit arrives. Read hosts from the column, never by parsing every orbit's JSON on a screen.
- **Brightness** is an estimate, accurate to about a magnitude (`src/domain/brightness.ts`):
  - The standard magnitude (at 1000 km, half lit) is `5.5 − 2.5·log10(RCS)`, from SATCAT's radar cross-section. It's calibrated roughly on the ISS and Hubble, and stored on `satellites` at import.
  - Objects without a cross-section, mostly recent launches, use a typical size for their type. ISS and CSS station modules use 100 m².
  - A pass's `peakMagnitude` is its brightest moment across the visible parts, adjusted for distance and sun angle (diffuse-sphere phase function).
  - Tiers: brilliant ≤ 1, bright ≤ 3, faint beyond. Passes fainter than `NAKED_EYE_LIMIT` (4.5) aren't worth listing.
  - All the constants are starting points to tune against real observations.
- After changing the rarity or set rules, bump `CATALOGUE_RULES_VERSION` in `src/domain/catalogue.ts` so existing installs re-sort their catalogue. A bundled-snapshot test fails if a refresh breaks the rarity pyramid or leaves a set empty.

## Network

- CelesTrak only, for two groups (`visual`, `stations`) and SATCAT. Never fetch the full active catalogue.
- Wait at least 2 hours between fetches per group, because CelesTrak returns HTTP 403 when you download too soon. Back off exponentially on errors and never retry immediately.
- A bundled snapshot of both groups and their SATCAT records lives in `src/data/snapshot/*.json`, so the first launch works offline. `prepareDatabase()` runs the migrations and then `importSnapshot` on every launch. The import is idempotent: it reloads the catalogue only when the snapshot or the rarity rules have changed since the last import, and a group's orbits only when the snapshot is newer than the stored ones. Refresh it with `npm run snapshot:update` (one request per endpoint, so it respects CelesTrak's limits), then commit the JSON.
- Show a staleness banner when orbit data is several days old.
- CelesTrak refresh (`src/sync/celestrak.ts`) keeps per-group failure counts and retry times in `sync_meta`. Backoff starts at 5 minutes and doubles up to 6 hours; a 403 waits the full 2 hours. A failed or malformed response never replaces stored orbits.
- The orbit refresher (`src/sync/orbitRefresher.ts`) is a plain object the session owns, like the pass cache runner. Once started it runs `refreshOrbits` on launch, on returning to the foreground and on reconnecting, one run at a time, and recomputes passes when a group was updated. `OrbitUpdates` (`src/session/`) starts it after the database gate when orbit updates are on, and `useOrbitRefreshStatus()` gives its status to the Orbit data section.

## Translations

- English and Spanish, with Arabic and right-to-left layout as a stretch goal.
- Strings live in `src/translations/locales/<language>/<namespace>.json`: `common` for shared UI, plus one namespace per feature, added when that feature first needs strings. Register new namespaces and languages in `src/translations/resources.ts`.
- Keys are typed, so a missing or misspelt key fails `npm run typecheck`. Plurals use i18next's `_one` / `_other` suffixes with `count`.
- Format times, countdowns and distances with the helpers in `src/translations/format.ts`. Never build them by hand. Satellite names stay untranslated.
- Hermes on iOS has no `Intl.PluralRules`, `Intl.RelativeTimeFormat` or `Intl.Locale`, and its `Intl.NumberFormat` silently converts units to the device region's system. `src/translations/polyfills.ts` loads the `@formatjs` polyfills (forcing NumberFormat) and must stay the first import. When adding a language, add its locale data there too.
- Node has full `Intl`, so passing tests don't prove device behaviour. Check new formatting on a simulator. Hermes' own `Intl.DateTimeFormat` isn't polyfilled and lacks `formatToParts`, so use `format()` only.

## Testing

- Unit tests are Given/When/Then scenarios in nested `describe` blocks, as set out in `docs/unit-tests.md`. Migrate older files with the `migrate-tests` skill.
- Write domain tests first. Pass predictions use a fixed orbit snapshot, a London location and a fixed clock, and must match the Skyfield fixtures within ±2 s.
- CelesTrak tests cover the 2-hour rule and backoff with a fake fetcher and clock. Migration tests check that schema changes keep existing sightings.
- Store tests call actions directly, with no rendering, and cover forbidden state transitions.
- Translation tests fail if any locale is missing a key or a plural form its language needs (Spanish needs `_many` as well as `_one` and `_other`).
- Maestro flows live in `.maestro/` and run with `npm run e2e` against a Release build on the simulator (`npm run ios:release`). A development build won't do: `clearState` wipes its saved server, so it opens on the dev launcher. Run them with Java 17 or later (`JAVA_HOME`), and pass `--device <udid>` when the Android emulator is also running. They start from `clearState` and use the `overhead://demo` link for a known evening. Give elements a flow needs a `testID` (such as `catch-<noradId>`) rather than matching on text that changes.
  - Maestro matches an element's whole accessibility label, and a pressable row joins its texts into one ("ISS (ZARYA), 6:21 PM, Brilliant, …"), so match rows by `testID` or a regex ending in `.*`.
  - Location permission takes `inuse`, `always` or `never`, not `allow` or `deny`.
  - Use `centerElement: true` with `scrollUntilVisible`, or the tap can land on the floating tab bar.
  - Flows that don't open the demo link start with `subflows/finish-onboarding.yaml`. On the location step, the last one, it taps whichever of Use my location and Continue is showing, because with location granted the app may get a GPS fix and swap the button at any moment.
  - Tap tabs by `testID` (`tab-tonight`, `tab-sky`, `tab-collection`, `tab-settings`). Maestro keeps the tab bar's labels from when a flow started, so after a language switch it still sees the English names, though the app and VoiceOver use the new ones.
  - Maestro can't hold a drag in place, so it can't complete an aimed catch.

## Demo mode

- Turn it on with the Demo mode switch in Settings, by tapping the version five times, or with the `overhead://demo` link (`?enabled=0` turns it off). The flag is `demoMode` in `settingsStore`, so it survives a relaunch.
- The demo pass is the first ISS pass over London after the snapshot was taken that peaks at 40° or higher and magnitude −2 or brighter (`src/demo/scenario.ts`). The clock starts a minute before it appears and then runs in real time. It's derived from the snapshot, so it still works after `npm run snapshot:update`; the tests fail if a refresh leaves no such pass.
- Each start deletes and recreates `overhead-demo.db` and imports the bundled snapshot, so demo catches never touch the real collection.
- In demo mode, the CelesTrak refresh (with the offline and staleness banners and the Orbit data section), reminders, onboarding and the chosen city are off. The session says so in its `features` (`src/session/features.ts`): read them with `useSessionFeatures()`, and keep `useDemo()` for showing or switching the demo itself. Catch aims with the compass on a phone (drag-to-aim only where there are no sensors, such as the simulator), but camera mode is off, because Moon calibration would use the demo evening's Moon rather than the real one.

## Build phases

1. Foundation: Expo, tooling, Drizzle schema, i18n, stores, bundled snapshot
2. Domain logic, test first
3. Tonight screen
4. Sky view
5. Catch and collection
6. CelesTrak refresh
7. Polish: demo mode, haptics and reduce motion, Spanish, Maestro, README

Never cut tests or demo mode. Cut first: Arabic and right-to-left layout, achievements.
