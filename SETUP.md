# Chronix Setup Guide

## Google Places API Setup

To enable place search functionality in the app, you need to set up a Google Places API key:

### 1. Get a Google Places API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your app's bundle identifier for security

### 2. Update the API Key

In `src/services/LocationService.ts`, replace `'YOUR_GOOGLE_PLACES_API_KEY'` with your actual API key:

```typescript
const apiKey = 'your-actual-api-key-here';
```

### 3. Features Enabled

With the API key configured, you'll have access to:

- **Place Search**: When editing timeline entries, you can search for real places
- **Autocomplete**: Suggestions appear as you type
- **Geocoding**: Proper coordinates for map display
- **Place Details**: Accurate place names and addresses

## Background Location Tracking

The app now supports background location tracking with the following features:

- **Automatic Tracking**: Location is tracked even when the app is closed
- **Battery Optimized**: Updates every 5 minutes or when you move 500 meters
- **Privacy Focused**: Data is stored locally on your device
- **Timeline Integration**: Location data automatically populates your daily timeline

### Permissions Required

The app will request:
- **Location Permission**: To track your location
- **Background Location**: To continue tracking when the app is not active

## Usage

1. **Download the app** and grant location permissions
2. **Background tracking starts automatically** when you first open the app
3. **Create a new entry** and tap "Edit Timeline" to see your location history
4. **Edit locations** by tapping the pencil icon and searching for places
5. **Reorder or delete** timeline entries as needed
6. **Save your entry** with the customized timeline

## Privacy

- All location data is stored locally on your device
- No location data is sent to external servers (except for place search)
- You can disable location tracking in your device settings
- Background tracking can be stopped in the app settings

## Troubleshooting

### Location Not Working
- Check that location permissions are granted
- Ensure location services are enabled on your device
- Try restarting the app

### Place Search Not Working
- Verify your Google Places API key is correctly set
- Check that the Places API is enabled in Google Cloud Console
- Ensure you have an active internet connection

### Background Tracking Issues
- On iOS: Go to Settings > Privacy > Location Services > Chronix > Always
- On Android: Go to Settings > Apps > Chronix > Permissions > Location > Allow all the time
- Some devices may have additional battery optimization settings that need to be disabled
