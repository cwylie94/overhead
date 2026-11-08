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
