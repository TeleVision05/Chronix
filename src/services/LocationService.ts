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
  // Initialize the service
  async initialize(): Promise<void> {
    console.log('LocationService initialized - Manual entry only mode');
  }

  // Create a manual timeline entry from coordinates and name
  async createManualTimelineEntry(
    dailyEntryId: number,
    locationName: string,
    latitude: number,
    longitude: number,
    timestamp?: string
  ): Promise<TimelineEntry> {
    const entryTimestamp = timestamp || new Date().toISOString();
    
    return {
      dailyEntryId,
      locationName,
      timestamp: entryTimestamp,
      latitude,
      longitude,
      icon: this.getLocationIcon(locationName),
      order: 0, // This will be set by the calling function
    };
  }

  // Get location name using reverse geocoding
  async getLocationName(latitude: number, longitude: number): Promise<string> {
    try {
      // Use Google Geocoding API
      const apiKey = 'AIzaSyDpPWBTMeLogmz5ZmwlPDXu1Fs1RTQJeuA';
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Error getting location name:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  // Get location icon based on name
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

  // Get current location data summary (always empty for manual mode)
  async getLocationDataSummary(): Promise<{
    todayCount: number;
    totalStoredDays: number;
    lastUpdated: string | null;
  }> {
    return {
      todayCount: 0,
      totalStoredDays: 0,
      lastUpdated: null,
    };
  }

  // Clear all location data (no-op for manual mode)
  async clearAllLocationData(): Promise<void> {
    console.log('Manual mode - no location data to clear');
  }

  // Get location history for timeline (always empty for manual mode)
  async getLocationHistoryForTimeline(date: Date): Promise<LocationData[]> {
    return [];
  }

  // Get today's location history (always empty for manual mode)
  async getTodayLocationHistory(): Promise<LocationData[]> {
    return [];
  }

  // Check if location tracking is active (always false for manual mode)
  isLocationTracking(): boolean {
    return false;
  }
}

export const locationService = new LocationService();
