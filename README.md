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

## Reference pass fixtures

The pass finder is tested against [Skyfield](https://rhodesmill.org/skyfield/), an independent astronomy library, run on the same bundled snapshot. The plan called for N2YO, but N2YO predicts from its own copy of the orbit data, so differences could come from either the data or our maths. Skyfield uses identical input, so any disagreement is a bug in our code, and the tolerance can be a few seconds instead of 30.

The fixtures are committed in `src/domain/__fixtures__/`. Regenerating them needs Python 3.9 or later, and only after refreshing the snapshot:

```bash
python3 -m venv tools/fixtures/.venv
tools/fixtures/.venv/bin/pip install -r tools/fixtures/requirements.txt
npm run fixtures:passes
```
