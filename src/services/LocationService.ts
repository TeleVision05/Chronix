import * as Location from 'expo-location';
import { TimelineEntry } from './DatabaseService';

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: string;
  locationName?: string;
}

export interface PlaceSearchResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

class LocationService {
  private isBackgroundTracking = false;
  private currentLocation: LocationData | null = null;
  private lastSignificantLocation: LocationData | null = null;
  private lastLocationUpdate: LocationData | null = null;
  private stationaryStartTime: number | null = null;
  private readonly STATIONARY_THRESHOLD = 5 * 60 * 1000; // 5 minutes stationary
  private readonly LOCATION_RADIUS = 100; // 100 meters radius to consider "same location"

  async requestPermissions(): Promise<boolean> {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    return foregroundStatus === 'granted' && backgroundStatus === 'granted';
  }

  async startBackgroundLocationTracking(): Promise<void> {
    if (this.isBackgroundTracking) return;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Location permissions not granted');
    }

    // Enable location services
    await Location.enableNetworkProviderAsync();

    try {
      // Start background location updates
      await Location.startLocationUpdatesAsync('background-location-task', {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 300000, // Update every 5 minutes
        distanceInterval: 100, // Update when moved 100 meters (lower threshold for better detection)
        foregroundService: {
          notificationTitle: 'Chronix Location Tracking',
          notificationBody: 'Tracking your location for timeline',
          notificationColor: '#007AFF',
        },
      });

      this.isBackgroundTracking = true;
      console.log('Background location tracking started');
    } catch (error) {
      console.error('Error starting background location tracking:', error);
      throw error;
    }
  }

  async stopBackgroundLocationTracking(): Promise<void> {
    try {
      await Location.stopLocationUpdatesAsync('background-location-task');
      this.isBackgroundTracking = false;
      console.log('Background location tracking stopped');
    } catch (error) {
      console.error('Error stopping background location tracking:', error);
    }
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    if (!this.currentLocation) {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        this.currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error getting current location:', error);
        return null;
      }
    }
    
    return this.currentLocation;
  }

  async getLocationName(latitude: number, longitude: number): Promise<string> {
    try {
      console.log(`Getting location name for: ${latitude}, ${longitude}`);
      
      // Try Expo's reverse geocoding first
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      console.log('Reverse geocode result:', reverseGeocode);

      if (reverseGeocode.length > 0) {
        const location = reverseGeocode[0];
        console.log('Location object:', location);
        
        // Build a more comprehensive address
        const parts = [];
        
        if (location.name) parts.push(location.name);
        if (location.street) parts.push(location.street);
        if (location.district) parts.push(location.district);
        if (location.city) parts.push(location.city);
        if (location.region) parts.push(location.region);
        
        const address = parts.filter(Boolean).join(', ');
        
        if (address) {
          console.log('Generated address:', address);
          return address;
        }
      }
      
      // Fallback: Use Google Geocoding API if available
      try {
        const apiKey = 'AIzaSyDpPWBTMeLogmz5ZmwlPDXu1Fs1RTQJeuA'; // User provided API key
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
        );
        
        const data = await response.json();
        
        if (data.status === 'OK' && data.results.length > 0) {
          const result = data.results[0];
          const address = result.formatted_address;
          console.log('Google geocoding result:', address);
          return address;
        }
      } catch (googleError) {
        console.error('Google geocoding failed:', googleError);
      }
      
      // Final fallback: Return coordinates
      console.log('Using coordinates as fallback');
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      
    } catch (error) {
      console.error('Error getting location name:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  async createTimelineEntryFromLocation(
    dailyEntryId: number,
    locationName?: string,
    customName?: string
  ): Promise<TimelineEntry> {
    const location = await this.getCurrentLocation();
    
    if (!location) {
      throw new Error('Unable to get current location');
    }

    const name = customName || locationName || await this.getLocationName(location.latitude, location.longitude);
    
    return {
      dailyEntryId,
      locationName: name,
      timestamp: location.timestamp,
      latitude: location.latitude,
      longitude: location.longitude,
      icon: this.getLocationIcon(name),
      order: 0, // This will be set by the calling function
    };
  }

  getLocationIcon(locationName: string): string {
    const name = locationName.toLowerCase();
    
    if (name.includes('home') || name.includes('house')) return '🏠';
    if (name.includes('work') || name.includes('office')) return '💼';
    if (name.includes('gym') || name.includes('fitness')) return '💪';
    if (name.includes('restaurant') || name.includes('cafe') || name.includes('food')) return '🍽️';
    if (name.includes('park') || name.includes('garden')) return '🌳';
    if (name.includes('mall') || name.includes('shopping')) return '🛍️';
    if (name.includes('hospital') || name.includes('clinic')) return '🏥';
    if (name.includes('school') || name.includes('university')) return '🎓';
    if (name.includes('airport') || name.includes('station')) return '✈️';
    if (name.includes('beach') || name.includes('coast')) return '🏖️';
    if (name.includes('mountain') || name.includes('hike')) return '⛰️';
    
    return '📍'; // Default location icon
  }

  // Smart location change detection - only save when stationary at a destination
  async checkForSignificantLocationChange(newLocation: LocationData): Promise<boolean> {
    try {
      console.log('Checking for significant location change...');
      
      // Load the last significant location from storage if not in memory
      if (!this.lastSignificantLocation) {
        await this.loadLastSignificantLocation();
      }
      
      // If this is the first location ever, start tracking
      if (!this.lastSignificantLocation) {
        console.log('First location ever - starting to track');
        this.lastLocationUpdate = newLocation;
        this.stationaryStartTime = Date.now();
        return false; // Don't save first location immediately
      }
      
      // If no previous update, start tracking
      if (!this.lastLocationUpdate) {
        console.log('Starting location tracking');
        this.lastLocationUpdate = newLocation;
        this.stationaryStartTime = Date.now();
        return false;
      }
      
      // Calculate distance from last update
      const distance = this.calculateDistance(
        this.lastLocationUpdate.latitude,
        this.lastLocationUpdate.longitude,
        newLocation.latitude,
        newLocation.longitude
      );
      
      console.log(`Distance from last update: ${distance.toFixed(1)}m`);
      
      // If moved significantly (>100m), reset stationary timer
      if (distance > this.LOCATION_RADIUS) {
        console.log('Moved significantly - resetting stationary timer');
        this.lastLocationUpdate = newLocation;
        this.stationaryStartTime = Date.now();
        return false;
      }
      
      // If within radius, check if been stationary long enough
      if (this.stationaryStartTime && distance <= this.LOCATION_RADIUS) {
        const stationaryTime = Date.now() - this.stationaryStartTime;
        console.log(`Stationary for ${(stationaryTime / 1000 / 60).toFixed(1)} minutes`);
        
        if (stationaryTime >= this.STATIONARY_THRESHOLD) {
          // Been stationary for 5+ minutes, check if this is a new location
          const newLocationName = await this.getLocationName(newLocation.latitude, newLocation.longitude);
          newLocation.locationName = newLocationName;
          
          const lastLocationName = this.lastSignificantLocation.locationName || '';
          const hasLocationNameChanged = this.hasLocationNameChanged(lastLocationName, newLocationName);
          
          if (hasLocationNameChanged) {
            console.log('Stationary at new location - marking as significant');
            this.lastSignificantLocation = newLocation;
            await this.saveLastSignificantLocation(newLocation);
            // Reset stationary timer to avoid duplicate saves
            this.stationaryStartTime = Date.now();
            return true;
          } else {
            console.log('Stationary at same location - not significant');
            return false;
          }
        }
      }
      
      console.log('Not stationary long enough or same location - not significant');
      return false;
      
    } catch (error) {
      console.error('Error checking for significant location change:', error);
      return false;
    }
  }

  // Compare location names to detect significant changes
  private hasLocationNameChanged(oldName: string, newName: string): boolean {
    if (!oldName || !newName) return true;
    
    const oldParts = oldName.toLowerCase().split(',').map(part => part.trim());
    const newParts = newName.toLowerCase().split(',').map(part => part.trim());
    
    // Check if the main part (first part) has changed
    if (oldParts[0] !== newParts[0]) {
      console.log(`Main location changed: "${oldParts[0]}" -> "${newParts[0]}"`);
      return true;
    }
    
    // Check if the street name has changed (second part)
    if (oldParts.length > 1 && newParts.length > 1 && oldParts[1] !== newParts[1]) {
      console.log(`Street changed: "${oldParts[1]}" -> "${newParts[1]}"`);
      return true;
    }
    
    // Check if city has changed (third part)
    if (oldParts.length > 2 && newParts.length > 2 && oldParts[2] !== newParts[2]) {
      console.log(`City changed: "${oldParts[2]}" -> "${newParts[2]}"`);
      return true;
    }
    
    return false;
  }

  async saveSignificantLocation(location: LocationData): Promise<void> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `significant_locations_${today}`;
      
      // Get existing significant locations
      const existingData = await AsyncStorage.default.getItem(key);
      const locations = existingData ? JSON.parse(existingData) : [];
      
      // Add new significant location
      locations.push(location);
      
      // Keep only last 24 hours of data
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const filteredLocations = locations.filter((loc: LocationData) => 
        new Date(loc.timestamp) > oneDayAgo
      );
      
      // Save back to storage
      await AsyncStorage.default.setItem(key, JSON.stringify(filteredLocations));
      console.log(`Saved significant location: ${location.locationName}`);
    } catch (error) {
      console.error('Error saving significant location:', error);
    }
  }

  async loadSignificantLocations(date: Date): Promise<LocationData[]> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `significant_locations_${dateString}`;
      
      const data = await AsyncStorage.default.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading significant locations:', error);
      return [];
    }
  }

  private async saveLastSignificantLocation(location: LocationData): Promise<void> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem('last_significant_location', JSON.stringify(location));
    } catch (error) {
      console.error('Error saving last significant location:', error);
    }
  }

  private async loadLastSignificantLocation(): Promise<void> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const data = await AsyncStorage.default.getItem('last_significant_location');
      if (data) {
        this.lastSignificantLocation = JSON.parse(data);
        console.log('Loaded last significant location from storage:', this.lastSignificantLocation?.locationName);
      }
    } catch (error) {
      console.error('Error loading last significant location:', error);
    }
  }

  // Calculate distance between two coordinates in meters
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async clearAllLocationData(): Promise<void> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      
      // Get all keys from AsyncStorage
      const allKeys = await AsyncStorage.default.getAllKeys();
      
      // Filter keys that start with 'location_history_' or 'significant_locations_'
      const locationKeys = allKeys.filter(key => 
        key.startsWith('location_history_') || key.startsWith('significant_locations_')
      );
      
      // Remove all location data keys
      if (locationKeys.length > 0) {
        await AsyncStorage.default.multiRemove(locationKeys);
        console.log(`Cleared ${locationKeys.length} location data entries`);
      }
      
      // Also remove the last significant location
      await AsyncStorage.default.removeItem('last_significant_location');
      
      // Reset tracking state
      this.lastSignificantLocation = null;
    } catch (error) {
      console.error('Error clearing location data:', error);
    }
  }

  async getLocationHistoryForTimeline(date: Date): Promise<LocationData[]> {
    // Get significant locations for the specified date
    const locations = await this.loadSignificantLocations(date);
    console.log(`Loaded ${locations.length} significant locations for timeline`);
    
    // Sort by timestamp to ensure chronological order
    const sortedLocations = locations.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return sortedLocations;
  }

  async getTodayLocationHistory(): Promise<LocationData[]> {
    const today = new Date();
    return await this.getLocationHistoryForTimeline(today);
  }

  // Place search functionality for manual timeline editing
  async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    try {
      const apiKey = 'AIzaSyDpPWBTMeLogmz5ZmwlPDXu1Fs1RTQJeuA';
      
      // Use Places Autocomplete with more comprehensive types
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&types=geocode|establishment`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK') {
        console.log('Places API success:', data.predictions.length, 'results');
        return data.predictions;
      } else {
        console.error('Places API error:', data.status, data.error_message);
        
        // Fallback to geocoding for addresses
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
        );
        
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
          console.log('Geocoding fallback success:', geocodeData.results.length, 'results');
          // Convert geocoding results to PlaceSearchResult format
          const geocodeResults: PlaceSearchResult[] = geocodeData.results.slice(0, 5).map((result: any, index: number) => ({
            place_id: result.place_id || `geocode_${index}`,
            description: result.formatted_address,
            structured_formatting: {
              main_text: result.formatted_address.split(',')[0] || result.formatted_address,
              secondary_text: result.formatted_address.split(',').slice(1).join(',').trim() || ''
            }
          }));
          
          return geocodeResults;
        }
        
        return [];
      }
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string): Promise<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null> {
    try {
      const apiKey = 'AIzaSyDpPWBTMeLogmz5ZmwlPDXu1Fs1RTQJeuA';
      
      // For places API results
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry&key=${apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const place = data.result;
        return {
          name: place.name,
          address: place.formatted_address,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  isLocationTracking(): boolean {
    return this.isBackgroundTracking;
  }

  // Method to get current location data summary
  async getLocationDataSummary(): Promise<{
    todayCount: number;
    totalStoredDays: number;
    lastUpdated: string | null;
  }> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const today = new Date().toISOString().split('T')[0];
      const todayKey = `significant_locations_${today}`;
      
      // Get today's count
      const todayData = await AsyncStorage.default.getItem(todayKey);
      const todayCount = todayData ? JSON.parse(todayData).length : 0;
      
      // Get total stored days (simplified - just check for today for now)
      const totalStoredDays = todayData ? 1 : 0;
      
      // Get last updated
      const lastUpdated = todayData ? new Date().toISOString() : null;
      
      return {
        todayCount,
        totalStoredDays,
        lastUpdated,
      };
    } catch (error) {
      console.error('Error getting location data summary:', error);
      return {
        todayCount: 0,
        totalStoredDays: 0,
        lastUpdated: null,
      };
    }
  }
}

export const locationService = new LocationService();
