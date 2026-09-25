// Google Maps Platform key used for Places Autocomplete, Place Details and Geocoding.
//
// Set EXPO_PUBLIC_GOOGLE_MAPS_KEY in a local `.env` file (see `.env.example`).
// Expo inlines every EXPO_PUBLIC_* variable into the JS bundle at build time, so the
// value ships inside the app. Restrict the key in Google Cloud to this app's
// Android package / iOS bundle id and to the Places + Geocoding APIs only.
export const GOOGLE_MAPS_KEY: string = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

if (!GOOGLE_MAPS_KEY) {
  console.warn(
    'EXPO_PUBLIC_GOOGLE_MAPS_KEY is not set: place search and Google geocoding will return no results.'
  );
}
