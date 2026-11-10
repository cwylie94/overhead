# Overhead

Overhead finds the satellites passing over you tonight, guides you to them in the sky, and lets you catch them into a collection. It works fully offline, because the best places to watch from have no signal.

- **Tonight** lists the visible passes for the next two nights, with when and where to look.
- **Sky** shows the dome overhead with each satellite's path.
- **Catch** guides you to a satellite during its pass. Hold the crosshair on it for 3 seconds to catch it.
- **Collection** groups what you've caught into themed sets.

Built with Expo SDK 58, React Native and TypeScript, for iOS and Android. [docs/design.md](docs/design.md) covers how it works, the architecture and the trade-offs.

## Set up

These steps are for a Mac. Android also builds on Windows and Linux with the same tools.

1. Install Node 24 with [nvm](https://github.com/nvm-sh/nvm). The repo's `.nvmrc` sets the version:

   ```bash
   nvm install
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

### iOS

1. Install Xcode from the App Store and open it once to finish setup. Under Settings → Components, install an iOS simulator.
2. Install Ruby 3.3 or later for CocoaPods (macOS ships 2.6, which is too old), and put it first on your `PATH`:

   ```bash
   brew install ruby
   echo 'export PATH="$(brew --prefix ruby)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
   ```

3. Install CocoaPods into the project:

   ```bash
   bundle install
   ```

### Android

1. Install [Android Studio](https://developer.android.com/studio) and go through its setup wizard. Then open the SDK Manager and install Android SDK Platform 37.
2. Create an emulator in the Device Manager, such as a Pixel with the latest system image.
3. Tell the build where Java and the SDK are:

   ```bash
   cat >> ~/.zshrc <<'EOF'
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
   EOF
   source ~/.zshrc
   ```

## Run in a simulator or emulator

```bash
npm run ios
```

```bash
npm run android
```

The first build takes several minutes. Each command builds the app, installs it, starts the dev server and opens the app. Overhead uses native modules, so it runs as a [development build](https://docs.expo.dev/develop/development-builds/introduction/), not in Expo Go. After the first build, `npm start` is enough for JavaScript changes. Rebuild after adding a native package or changing `app.json`.

A simulator has no GPS, compass or camera:

- **Location:** choose a city when the app asks for your location, or set one in the iOS Simulator under Features → Location. The Android emulator starts with a location already set.
- **Aiming:** in Catch, drag to aim instead of moving the phone.

To try a catch at any time, turn on **Demo mode** in Settings. It replays an evening with a bright ISS pass over London that starts a minute later.

## Run on a phone

These commands build a Release version, which runs without the dev server, so you can take it outside.

### iPhone

1. In Xcode, go to Settings → Accounts and add your Apple ID. A free account works. Select your team, choose Manage Certificates, and add an Apple Development certificate.
2. Apple lets only one team use a bundle ID, so choose your own. Copy `.env.example` to `.env.local` and set `IOS_BUNDLE_ID`, for example `com.yourname.overhead`.
3. On the iPhone, turn on Settings → Privacy & Security → Developer Mode, then connect it by cable and unlock it.
4. Build and install the app:

   ```bash
   npm run ios:device
   ```

   If you have more than one signing certificate, choose yours when prompted.

5. With a free account, trust the certificate on the phone under Settings → General → VPN & Device Management. The app then runs for 7 days before you need to reinstall it.

### Android phone

1. Turn on Developer options, then USB debugging, and connect the phone by cable.
2. Accept the debugging prompt on the phone, then run:

   ```bash
   npm run android:device
   ```

## Checks

```bash
npm run lint && npm run typecheck && npm test
```

The [scripts table](docs/design.md#scripts) lists the rest, including the Maestro end-to-end flows.

## Credits

- Orbit data from [CelesTrak](https://celestrak.org/).
- City data from [GeoNames](https://www.geonames.org/), under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
