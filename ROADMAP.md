# Chronix roadmap

> **Do this first: rotate and restrict the Google Maps key in Google Cloud.**
> The key `AIzaSyDpPW...JeuA` was hard-coded in `src/services/LocationService.ts` and
> `src/components/LocationHistoryModal.tsx` and is in the **public** git history of
> `TeleVision05/Chronix` (every commit up to and including `6171580`). Moving it to
> `EXPO_PUBLIC_GOOGLE_MAPS_KEY` (this commit) stops new leaks; it does not un-leak the old value.
> In Google Cloud: create a new key, restrict it to the Android package `com.therune.Chronix`
> / iOS bundle id and to the Places + Geocoding APIs, put it in `.env`, then delete the old key.

## Current state (2026-09-25)

Expo SDK 53 / React Native 0.79.5 / React 19 app, TypeScript `strict`. Single-user, on-device
journaling app: tracks location in the background, clusters stops into a daily timeline, and
attaches photos to a daily entry.

What is in the code and what verified it:

| Area | Where | Verified by |
|---|---|---|
| Typecheck | whole repo | `npm run typecheck` (`tsc --noEmit`) passes, 2026-09-25 |
| Date helpers | `src/utils/dateUtils.ts` | `npm test`: 4 `node:test` cases in `tests/dateUtils.test.mjs`, 4 pass / 0 fail, 2026-09-25 |
| SQLite storage | `src/services/DatabaseService.ts` (`daily_entries`, `timeline_entries`, `image_entries`) | code read only, not run on a device this session |
| Background location task | `index.ts` (`background-location-task`) → `LocationService.checkForSignificantLocationChange` (5 min stationary, 100 m radius) | code read only |
| Place search / details / reverse geocode | `LocationService.searchPlaces`, `getPlaceDetails`, `getLocationName` (expo-location first, Google Geocoding fallback) | code read only |
| Photos | `src/screens/PhotoPickerScreen.tsx`, `src/components/ImageGallery.tsx` | code read only |
| Daily reminder notifications | `src/services/NotificationService.ts` | code read only |
| Screens | `Feed`, `PhotoPicker`, `Settings` (`src/navigation/AppNavigator.tsx`) | code read only |

**UNVERIFIED:** nobody in the last two agent sessions ran the app on a simulator or device. The
last commit that touched runtime behaviour on a device was `5bfffb6`. Treat "boots and tracks"
as unproven until Milestone 3's device check is done.

Branches:

- `main` at `6171580` + this commit: automatic background tracking (the original design).
- `wip/manual-location-mode` at `61f6a7c`: the owner's alternative direction, see Milestone 2.

## Known gaps and bugs

- **Leaked key** (above). `EXPO_PUBLIC_*` values are inlined into the JS bundle, so even the new
  key can be pulled out of an APK. The fix is app-restriction on the key, not hiding it.
- **Day boundaries use UTC, not local time.** `LocationService.saveSignificantLocation`,
  `loadSignificantLocations` and `dateUtils.formatDateForStorage` all key by
  `toISOString().split('T')[0]`. In Pacific time, anything after 17:00 PDT is filed under the
  next day, so an evening stop shows up in tomorrow's timeline.
- **Background significance state is in-memory.** `lastLocationUpdate` and
  `stationaryStartTime` live on the `locationService` singleton; only `lastSignificantLocation`
  is persisted to AsyncStorage. If the OS recycles the headless JS context between location
  updates (common on Android after the process is killed), the stationary timer restarts and a
  stop may never reach the 5-minute threshold. Needs a device test to confirm or clear.
- **First-ever location is never saved** (`checkForSignificantLocationChange` returns `false`
  on the first fix and only saves when the geocoded *name* later changes), so a user who stays
  home all day gets an empty timeline for day one.
- `LocationService.getLocationDataSummary` hard-codes `totalStoredDays` to 0/1 and reports
  `lastUpdated` as "now" rather than the real last fix (the code comments say "simplified").
- **Tests cover only `dateUtils`.** `calculateDistance`, `hasLocationNameChanged` and the
  significance state machine are pure logic and untested.
- **No lint, no formatter, no pre-commit hook.** Nothing stops a bad commit today.
- **Four files exceed 500 lines:** `LocationHistoryModal.tsx` (665), `FeedScreen.tsx` (654),
  `SettingsScreen.tsx` (595), `LocationService.ts` (557).
- **Docs drift:** README/SETUP said "500 meters"; the code uses `distanceInterval: 100` and
  `LOCATION_RADIUS = 100`. README said Node 16+; `npm test` needs Node >= 22.18 (type
  stripping). Both corrected in this commit.
- `android/` (prebuild output) is committed; `ios/` is not. `android/app/debug.keystore` is the
  stock React Native debug keystore, fine for debug builds, never for a release signing config.
- `app.json` requests `RECORD_AUDIO` / `NSMicrophoneUsageDescription` "for video recording";
  no video capture exists in `src/`. App-store review will ask why.
- `npm run web` is defined but the app depends on `expo-sqlite`, `expo-task-manager` and
  background location; the web target is not a real target.

## Milestones

### M1. Close the key leak

- [ ] Create a new Google Maps key, restricted to `com.therune.Chronix` (+ iOS bundle id) and
      to the Places API + Geocoding API.
- [ ] Put it in `.env` as `EXPO_PUBLIC_GOOGLE_MAPS_KEY`; confirm `.env` is git-ignored.
- [ ] Delete the old key `AIzaSyDpPW...JeuA` in Google Cloud.
- [ ] Optional: rewrite history to purge the string (`git filter-repo`) and force-push, only
      if the owner accepts breaking every existing clone. Deleting the key makes this optional.

**Done when:** `curl "https://maps.googleapis.com/maps/api/geocode/json?address=x&key=<old key>"`
returns `REQUEST_DENIED`, and a fresh clone with `.env` set returns place suggestions in the
"Edit Timeline" search box (screenshot).

### M2. Decide the tracking model (auto vs manual)

`wip/manual-location-mode` (`61f6a7c`, pushed alongside `main` so it is not lost) is the
owner's competing direction. It:

- deletes the background task from `index.ts` and all tracking code from `LocationService.ts`
  (557 → ~120 lines; keeps `searchPlaces`, `getPlaceDetails`, `getLocationName`, icons);
- removes `expo-location` from `app.json` plugins and drops `ACCESS_*_LOCATION`,
  `ACCESS_BACKGROUND_LOCATION` and `FOREGROUND_SERVICE` permissions;
- turns `FeedScreen`'s "add timeline entry" into a manual flow through `LocationHistoryModal`;
- was branched from `5bfffb6`, so it also **lacks** the typecheck/test scripts and the tests
  added in `6171580`.
- Its commit message and `App.tsx` comment mention a "Life360 only mode", i.e. importing stops
  from Life360 instead of tracking them, but no Life360 code exists on the branch.

Options: (a) keep auto-tracking on `main` and delete the branch; (b) adopt manual-only: rebase
the branch onto `main`, restore `package.json` scripts and `tests/`, merge; (c) both, behind a
Settings toggle, which keeps the background-location permission prompt for everyone.

- [ ] Owner picks (a), (b) or (c) and records it here.
- [ ] Merge or delete `wip/manual-location-mode` accordingly.
- [ ] Update the README status line and `app.json` permissions to match.

**Done when:** `git branch -r` shows no `wip/` branch, `npm test` and `npm run typecheck` pass on
`main`, and the README's status line names the chosen model.

### M3. Make the tracking pipeline trustworthy (only if M2 keeps auto-tracking)

- [ ] Key stored days by local date (one helper used by `saveSignificantLocation`,
      `loadSignificantLocations`, `getLocationDataSummary`, `formatDateForStorage`).
- [ ] Persist `lastLocationUpdate` / `stationaryStartTime` to AsyncStorage so the stationary
      timer survives a JS-context restart.
- [ ] Save the first fix of the day as a stop instead of discarding it.
- [ ] Extract `calculateDistance`, `hasLocationNameChanged` and the significance decision into
      `src/utils/locationMath.ts` and cover them in `tests/`.
- [ ] Device run: dev-client build (`npx eas build --profile development`), stay put 6 minutes,
      confirm one stop appears; move 200 m, wait 6 minutes, confirm a second.

**Done when:** `npm test` reports the new cases passing and a screenshot of the Feed shows two
stops with correct local timestamps after the device walk above.

### M4. Guardrails: lint, format, hooks, file sizes

- [ ] Add ESLint (`eslint-config-expo`) + Prettier with committed config.
- [ ] Add husky + lint-staged so `npm run lint` and `tsc --noEmit` run pre-commit.
- [ ] Split `LocationHistoryModal.tsx`, `FeedScreen.tsx`, `SettingsScreen.tsx` and
      `LocationService.ts` so no file exceeds 500 lines (search UI, entry list, and the
      Google client are natural seams).
- [ ] Drop the `web` script or make it fail with a clear message.

**Done when:** a commit with a deliberate lint error is rejected by the hook (paste the hook
output), and `wc -l src/**/*.ts*` shows no file over 500.

### M5. A build someone else can install

- [ ] Fix or justify the `RECORD_AUDIO` / microphone permission.
- [ ] Decide whether `android/` stays committed or is regenerated by `expo prebuild` in CI;
      do the same for `ios/`.
- [ ] `npx eas build --platform android --profile preview` and `--platform ios --profile preview`.
- [ ] Walk `TESTING.md` sections 1 to 10 on a physical device and tick them in the file.

**Done when:** two EAS build URLs are pasted here and every checkbox in `TESTING.md` is ticked
with a date.

## Won't do / out of scope

- Accounts, cloud sync, sharing or any server component: the README's privacy promise is
  "local storage only" and the roadmap keeps it.
- A web build: native-only modules make it a non-target.
- A backend proxy for the Google key: for a single-user personal app, key restriction is the
  right size; a proxy adds hosting to a project with no server.
- Rewriting to a different navigation or state library.

## Open questions for the owner

1. Auto-tracking, manual-only, or a toggle (M2)? This decides whether M3 happens at all.
2. Is Life360 import a real plan? If so, is there an API you have access to, or was this a
   manual-export idea?
3. Do you want the leaked key purged from history (force-push, breaks clones) or is deleting
   the key in Google Cloud enough?
4. Should `android/` stay in git? It is 10 MB of generated files that `expo prebuild` recreates.
5. Is there a planned video feature that justifies the microphone permission, or can it go?
6. Which device do you actually run this on? M3 and M5 need one named device to test against.
