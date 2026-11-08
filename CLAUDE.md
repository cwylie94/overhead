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
- Libraries with native code need a development build (`npx expo run:ios` / `run:android`), not Expo Go.
- Routes live in `src/app/` and stay thin: each route file re-exports a screen from `src/features/`.
- Run `npm run lint`, `npm run typecheck` and the tests before calling a task done.

## Architecture rules

- SQLite is the single source of truth for data. Database rows never go into Zustand. Screens read them with Drizzle live queries.
- Only the sync engine talks to the network. Screens never call an API directly.
- All orbit maths lives in the pure `domain/` layer and takes a clock and a location as inputs. Never call `Date.now()` or read sensors inside `domain/`.
- Fast-changing sensor data (compass heading, tilt) stays in Reanimated shared values, never in Zustand.
- Components subscribe to stores with selectors, e.g. `useSkyStore(s => s.selectedId)`.
- Compute pass tracks once, as a point every 10 s stored in `passes`. Worklets interpolate between points, so no orbit maths runs per frame.
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

There is no collection table. The collection is derived from verified sightings.

- The schema lives in `src/data/schema.ts`. After changing it, run `npm run db:generate` and commit the generated files in `src/data/migrations/`. Never edit the generated migrations by hand.
- Times are stored as integer milliseconds since the Unix epoch, not `Date` objects.
- Repositories (`src/data/repositories/`) are synchronous and take a `Database`, which works with both expo-sqlite on the device and better-sqlite3 in tests. Test them with `createTestDatabase()`, which applies the real migrations to an in-memory database.

## Domain rules

- **Catch:** only inside a predicted visible pass window, with the aim (heading plus tilt) within about 10° of the predicted position for 2 s. "I saw it" logs an unverified sighting. Only verified sightings add to the collection.
- **Catch state machine** (in `catchStore`): idle → aiming → locked → caught / failed.
- **Visibility:** the sun is more than 6° below the horizon, the satellite is in sunlight, and the elevation is above the user's minimum.
- **Rarity** is a fixed function of catalogue data:
  - Legendary: launched before 1980
  - Rare: visible fewer than 2 nights a week, or a rocket body
  - Uncommon: a named mission outside the big constellations
  - Common: everything else

## Network and sync

- CelesTrak only, for two groups (`visual`, `stations`) and SATCAT. Never fetch the full active catalogue.
- Wait at least 2 hours between fetches per group, because CelesTrak returns HTTP 403 when you download too soon. Back off exponentially on errors and never retry immediately.
- Ship a bundled snapshot of both groups and the catalogue, so the first launch works offline.
- Show a staleness banner when orbit data is several days old.
- Writing a sighting and its outbox entry happens in one transaction. Push is idempotent (the server inserts or ignores by ID). Delete outbox entries only after the server confirms them.
- Identity is an anonymous account ID generated on the device. There is no login.
- N2YO is used only for test fixtures and is never called by the app.

## i18n

- English and Spanish, with Arabic and right-to-left layout as a stretch goal.
- Strings live in `src/i18n/locales/<language>/<namespace>.json`: `common` for shared UI, plus one namespace per feature, added when that feature first needs strings. Register new namespaces and languages in `src/i18n/resources.ts`.
- Keys are typed, so a missing or misspelt key fails `npm run typecheck`. Plurals use i18next's `_one` / `_other` suffixes with `count`.
- Format times, countdowns and distances with the helpers in `src/i18n/format.ts`. Never build them by hand. Satellite names stay untranslated.
- Hermes on iOS has no `Intl.PluralRules`, `Intl.RelativeTimeFormat` or `Intl.Locale`, and its `Intl.NumberFormat` silently converts units to the device region's system. `src/i18n/polyfills.ts` loads the `@formatjs` polyfills (forcing NumberFormat) and must stay the first import. When adding a language, add its locale data there too.
- Node has full `Intl`, so passing tests don't prove device behaviour. Check new formatting on a simulator.

## Testing

- Write domain tests first. Pass predictions use a fixed orbit snapshot, a London location and a fixed clock, and must match N2YO fixtures within ±30 s.
- Sync tests run against in-memory SQLite: push replay is harmless, the cursor advances, a crash mid-sync loses nothing, and the 2-hour rule is enforced.
- Store tests call actions directly, with no rendering, and cover forbidden state transitions.
- Translation tests fail if any locale is missing a key.

## Demo mode

Demo mode injects a fixed clock and location ("tonight 21:12, London") and the bundled snapshot, and replays a recorded ISS pass. A drag on the screen stands in for the compass. To turn it on, tap the version number in Settings five times. A demo flag is available for Maestro.

## Build phases

1. Foundation: Expo, tooling, Drizzle schema, i18n, stores, bundled snapshot
2. Domain logic, test first
3. Tonight screen
4. Sky view
5. Catch and collection
6. Sync: outbox engine, Hono Worker, CelesTrak refresh
7. Polish: demo mode, haptics and reduce motion, Spanish, Maestro, README

Never cut sync, tests or demo mode. Cut first: Arabic and right-to-left layout, a camera background in Catch mode, achievements.
