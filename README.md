# Overhead

Overhead finds the satellites passing over you tonight, guides you to them in the sky, and lets you catch them into a collection. It works fully offline.

Built with Expo (SDK 58), React Native and TypeScript.

## Getting started

Requires Node 22.13 or later (`nvm use` picks up `.nvmrc`). iOS builds also need Xcode and Ruby 3.3 or later for CocoaPods, which is pinned in the `Gemfile`.

The app runs as a [development build](https://docs.expo.dev/develop/development-builds/introduction/), not Expo Go, because it uses native modules Expo Go doesn't include.

```bash
npm install
bundle install
npm run ios
```

After the first build, `npm start` is enough for JavaScript changes. Rebuild with `npm run ios` after adding a native dependency or changing `app.json`.

## Scripts

| Script                            | What it does                                |
| --------------------------------- | ------------------------------------------- |
| `npm start`                       | Start the dev server for an installed build |
| `npm run ios` / `npm run android` | Build and launch the development build      |
| `npm run lint`                    | Lint with ESLint                            |
| `npm run format`                  | Format with Prettier                        |
| `npm run typecheck`               | Type-check with TypeScript                  |
| `npm test`                        | Run the Jest test suite                     |
| `npm run db:generate`             | Generate a migration from the schema        |
| `npm run snapshot:update`         | Refresh the bundled CelesTrak snapshot      |
| `npm run fixtures:passes`         | Regenerate the Skyfield reference passes    |
| `npm run bench`                   | Time pass finding for the whole catalogue   |

## Sync

Sightings are written to SQLite with an outbox entry in the same transaction, so catching works offline. When a sync URL is set, the app pushes the outbox to a small [Hono](https://hono.dev/) Worker on Cloudflare with a D1 database, and pulls changes made on other devices. It syncs on launch, on returning to the foreground, when the network comes back, and from Sync now in Settings. There is no login: each install creates an anonymous account ID.

- **Push is idempotent.** The server inserts sightings or ignores ones it already has, and the app deletes outbox entries only once the server confirms them, so a crash or a dropped response never loses or duplicates a catch.
- **Pull uses a version cursor.** Every push bumps a per-account version, and pull returns everything after the device's cursor, a page at a time.
- **Only notes change.** A sighting is never edited after it's logged except for its note, where the last edit to reach the server wins.

The same sync run refreshes orbits from CelesTrak, at most once every 2 hours per group, because CelesTrak blocks clients that ask more often. After a failure it backs off from 5 minutes, doubling up to 6 hours, and keeps the existing orbits.

To run the Worker locally:

```bash
cd server
npm install
npm run db:migrate:local
npm run dev
```

Then point the app at it in `.env.local` (see `.env.example`) and restart the dev server:

```ini
EXPO_PUBLIC_SYNC_URL=http://127.0.0.1:8787
```

Deploying needs a Cloudflare account. Create a D1 database with `npx wrangler d1 create overhead`, put its ID in `server/wrangler.toml`, then run `npm run db:migrate:remote` and `npm run deploy` in `server/`.

## Reference pass fixtures

The pass finder is tested against [Skyfield](https://rhodesmill.org/skyfield/), an independent astronomy library, run on the same bundled snapshot. The plan called for N2YO, but N2YO predicts from its own copy of the orbit data, so differences could come from either the data or our maths. Skyfield uses identical input, so any disagreement is a bug in our code, and the tolerance can be a few seconds instead of 30.

The fixtures are committed in `src/domain/__fixtures__/`. Regenerating them needs Python 3.9 or later, and only after refreshing the snapshot:

```bash
python3 -m venv tools/fixtures/.venv
tools/fixtures/.venv/bin/pip install -r tools/fixtures/requirements.txt
npm run fixtures:passes
```
