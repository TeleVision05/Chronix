# Chronix

A personal daily-timeline app for iOS and Android (Expo SDK 53, React Native 0.79, TypeScript).
It tracks your location in the background, turns stops into a daily timeline, lets you correct
stops with Google Places search, and attaches photos to each day. Everything is stored on the
device (SQLite + AsyncStorage); the only network call is to Google for place search/geocoding.

**Status: experimental.** Typecheck and unit tests pass; the app has not been re-verified on a
device since commit `5bfffb6`. An alternative "manual entry only" design lives on branch
`wip/manual-location-mode`. See [ROADMAP.md](./ROADMAP.md) for what is decided and what is not.

## Install

Requires Node >= 22.18 (the tests use Node's native TypeScript stripping) and either Xcode or
Android Studio. Background location does not work in Expo Go; use a dev-client build.

```bash
git clone git@github.com:TeleVision05/Chronix.git
cd Chronix
npm install
```

## Configure

Copy [.env.example](./.env.example) to `.env` and set:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps Platform key with Places API + Geocoding API enabled. Restrict it to the app's Android package `com.therune.Chronix` / iOS bundle id; Expo inlines `EXPO_PUBLIC_*` into the bundle. |

Without it the app still runs; place search and Google geocoding return nothing and
`src/config/googleMaps.ts` logs a warning. More detail in [SETUP.md](./SETUP.md).

## Run

```bash
npm start          # Metro; press i / a for a simulator with a dev client installed
npm run ios        # build and run the iOS dev client
npm run android    # build and run the Android dev client (android/ is committed)
```

Production builds go through EAS (`eas.json`):

```bash
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
```

## Test

```bash
npm run typecheck   # tsc --noEmit (strict)
npm test            # node --test tests/*.test.mjs  (pure logic only)
```

Location tracking, camera and notifications need a device; [TESTING.md](./TESTING.md) is the
manual checklist for those.

## Layout

```
index.ts              registers the background location task, then the app
App.tsx               boots DB, notifications, background tracking
src/services/         LocationService, DatabaseService, NotificationService
src/config/           googleMaps.ts (reads the env var)
src/screens/          Feed, PhotoPicker, Settings
src/components/       timeline cards, entry modals, image gallery
src/utils/            dateUtils (unit-tested)
tests/                node:test suites
```

Tracking parameters (in `src/services/LocationService.ts`): update every 5 minutes or 100 m;
a stop is recorded after 5 minutes stationary within 100 m at a new geocoded name.

## Roadmap

[ROADMAP.md](./ROADMAP.md): first item is rotating the Google key that was hard-coded in the
public history.

## License

MIT.
