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

| Table | Purpose |
|---|---|
| `satellites` | NORAD ID, name, type, owner, launch date and rarity, from the bundled catalogue |
| `orbits` | One OMM JSON row per satellite, replaced on refresh |
| `passes` | Cached predictions with track points, recalculated when orbit data or location changes |
| `sightings` | UUIDv7 ID, verified flag, angle error and note. Never edited except the note |
| `outbox` | Changes waiting to sync |
| `sync_meta` | Pull cursor and last fetch time per CelesTrak group |

There is no collection table. The collection is derived from verified sightings.

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
- Use typed keys, so a missing key fails at compile time. Namespaces: `common`, `sky`, `collection`, `achievements`.
- Format dates, times, numbers and relative times with `Intl`. Never build them by hand. Satellite names stay untranslated.
- Check Hermes `Intl` support (PluralRules, RelativeTimeFormat) on both platforms. Add `@formatjs` polyfills if needed.

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
