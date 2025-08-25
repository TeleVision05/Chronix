import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

import App from './App';

// Define background location task
TaskManager.defineTask('background-location-task', async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const location = locations[0];
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
      };
      
      console.log('Background location update:', locationData);
      
      // Check if this is a significant location change
      try {
        // Import location service
        const { locationService } = await import('./src/services/LocationService');
        
        // Check if this location change is significant
        const isSignificant = await locationService.checkForSignificantLocationChange(locationData);
        
        if (isSignificant) {
          console.log('Significant location change detected - saving to timeline');
          await locationService.saveSignificantLocation(locationData);
        } else {
          console.log('Location change not significant - skipping entirely');
          // Don't save anything if it's not significant
        }
      } catch (serviceError) {
        console.error('Error checking significant location change:', serviceError);
        // Don't save raw data as fallback - only save significant changes
      }
    }
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
