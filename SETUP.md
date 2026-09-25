# Chronix Setup Guide

## Google Maps Platform key

Place search, place details and the Google geocoding fallback need a Google Maps Platform key.

### 1. Get a key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the key to this app's Android package (`com.therune.Chronix`) and iOS bundle id,
   and to the two APIs above. Expo inlines `EXPO_PUBLIC_*` variables into the JS bundle, so
   the restriction is what protects the key, not secrecy.

### 2. Put it in `.env`

```bash
cp .env.example .env
# then edit .env:
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your-key-here
```

`.env` is git-ignored. `src/config/googleMaps.ts` reads the variable and warns at startup when
it is empty. Restart `npm start` after changing `.env`; Expo reads it at bundle time.

### 3. Features enabled

- **Place Search**: when editing timeline entries, search for real places
- **Autocomplete**: suggestions appear as you type
- **Geocoding**: proper coordinates for map display
- **Place Details**: accurate place names and addresses

## Background location tracking

- **Automatic tracking**: location is tracked even when the app is closed
- **Battery aware**: updates every 5 minutes or when you move 100 meters
  (`timeInterval: 300000`, `distanceInterval: 100` in `LocationService.ts`)
- **Privacy**: data is stored locally on your device
- **Timeline integration**: a stop is recorded after 5 minutes stationary at a new address

### Permissions required

- **Location permission**: to track your location
- **Background location**: to continue tracking when the app is not active

Background location requires a development or production build; it does not run in Expo Go.

## Usage

1. Install the app and grant location permissions
2. Background tracking starts automatically when you first open the app
3. Create a new entry and tap "Edit Timeline" to see your location history
4. Edit locations by tapping the pencil icon and searching for places
5. Reorder or delete timeline entries as needed
6. Save your entry with the customized timeline

## Privacy

- All location data is stored locally on your device
- No location data is sent to external servers (except place search / geocoding to Google)
- You can disable location tracking in your device settings
- Location data can be cleared from the in-app Settings screen

## Troubleshooting

### Location not working
- Check that location permissions are granted
- Ensure location services are enabled on your device
- Try restarting the app

### Place search not working
- Verify `EXPO_PUBLIC_GOOGLE_MAPS_KEY` is set in `.env` and Metro was restarted
- Check that the Places API is enabled in Google Cloud Console
- Ensure you have an active internet connection

### Background tracking issues
- On iOS: Settings > Privacy > Location Services > Chronix > Always
- On Android: Settings > Apps > Chronix > Permissions > Location > Allow all the time
- Some devices have additional battery optimization settings that need to be disabled
