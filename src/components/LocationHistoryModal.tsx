import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationData, PlaceSearchResult, locationService } from '../services/LocationService';
import { TimelineEntry } from '../services/DatabaseService';
import { formatTime } from '../utils/dateUtils';

interface LocationHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (entries: TimelineEntry[]) => void;
  date: Date;
  existingEntries?: TimelineEntry[];
}

interface EditableLocationEntry {
  id?: number;
  locationName: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  icon: string;
  order: number;
  isEditing?: boolean;
  searchQuery?: string;
  searchResults?: PlaceSearchResult[];
  isSearching?: boolean;
}

const LocationHistoryModal: React.FC<LocationHistoryModalProps> = ({
  visible,
  onClose,
  onSave,
  date,
  existingEntries = [],
}) => {
  const [entries, setEntries] = useState<EditableLocationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadLocationHistory();
    }
  }, [visible, date]);

  const loadLocationHistory = async () => {
    setIsLoading(true);
    try {
      // If we have existing entries, use those as the primary data
      if (existingEntries && existingEntries.length > 0) {
        const editableEntries: EditableLocationEntry[] = existingEntries.map((entry, index) => ({
          id: entry.id,
          locationName: entry.locationName,
          timestamp: entry.timestamp,
          latitude: entry.latitude,
          longitude: entry.longitude,
          icon: entry.icon,
          order: index,
        }));
        setEntries(editableEntries);
      } else {
        // Only load raw location history if no existing entries
        const locationHistory = await locationService.getLocationHistoryForTimeline(date);
        
        // Convert to editable entries
        const editableEntries: EditableLocationEntry[] = locationHistory.map((location, index) => ({
          locationName: location.locationName || 'Unknown Location',
          timestamp: location.timestamp,
          latitude: location.latitude,
          longitude: location.longitude,
          icon: locationService.getLocationIcon(location.locationName || ''),
          order: index,
        }));

        setEntries(editableEntries);
      }
    } catch (error) {
      console.error('Error loading location history:', error);
      Alert.alert('Error', 'Failed to load location history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEntry = (index: number) => {
    const updatedEntries = [...entries];
    updatedEntries[index] = { ...updatedEntries[index], isEditing: true };
    setEntries(updatedEntries);
  };

  const handleSaveEntry = (index: number) => {
    const updatedEntries = [...entries];
    updatedEntries[index] = { ...updatedEntries[index], isEditing: false };
    setEntries(updatedEntries);
  };

  const handleDeleteEntry = (index: number) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this location entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedEntries = entries.filter((_, i) => i !== index);
            setEntries(updatedEntries.map((entry, i) => ({ ...entry, order: i })));
          },
        },
      ]
    );
  };

  const handleSearchPlaces = async (index: number, query: string) => {
    console.log('Searching places for query:', query);
    const updatedEntries = [...entries];
    updatedEntries[index] = { 
      ...updatedEntries[index], 
      searchQuery: query,
      isSearching: true 
    };
    setEntries(updatedEntries);

    try {
      const results = await locationService.searchPlaces(query);
      console.log('Search results received:', results.length, 'results');
      updatedEntries[index] = { 
        ...updatedEntries[index], 
        searchResults: results,
        isSearching: false 
      };
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error searching places:', error);
      updatedEntries[index] = { 
        ...updatedEntries[index], 
        searchResults: [],
        isSearching: false 
      };
      setEntries(updatedEntries);
    }
  };

  const handleSelectPlace = async (index: number, place: PlaceSearchResult) => {
    try {
      const placeDetails = await locationService.getPlaceDetails(place.place_id);
      
      const updatedEntries = [...entries];
      if (placeDetails) {
        // Use place details if available
        updatedEntries[index] = {
          ...updatedEntries[index],
          locationName: placeDetails.name,
          latitude: placeDetails.latitude,
          longitude: placeDetails.longitude,
          icon: locationService.getLocationIcon(placeDetails.name),
          isEditing: false,
          searchResults: undefined,
          searchQuery: undefined,
        };
      } else {
        // For geocoding results or when place details are not available
        // Use the description as the location name and try to get coordinates
        const locationName = place.description || place.structured_formatting.main_text;
        
        // Try to get coordinates using geocoding
        try {
          const geocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=AIzaSyDpPWBTMeLogmz5ZmwlPDXu1Fs1RTQJeuA`
          );
          const geocodeData = await geocodeResponse.json();
          
          if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
            const result = geocodeData.results[0];
            updatedEntries[index] = {
              ...updatedEntries[index],
              locationName: locationName,
              latitude: result.geometry.location.lat,
              longitude: result.geometry.location.lng,
              icon: locationService.getLocationIcon(locationName),
              isEditing: false,
              searchResults: undefined,
              searchQuery: undefined,
            };
          } else {
            // Fallback: just use the name without coordinates
            updatedEntries[index] = {
              ...updatedEntries[index],
              locationName: locationName,
              icon: locationService.getLocationIcon(locationName),
              isEditing: false,
              searchResults: undefined,
              searchQuery: undefined,
            };
          }
        } catch (geocodeError) {
          console.error('Error geocoding address:', geocodeError);
          // Fallback: just use the name without coordinates
          updatedEntries[index] = {
            ...updatedEntries[index],
            locationName: locationName,
            icon: locationService.getLocationIcon(locationName),
            isEditing: false,
            searchResults: undefined,
            searchQuery: undefined,
          };
        }
      }
      
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error getting place details:', error);
      Alert.alert('Error', 'Failed to get place details');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert to TimelineEntry format
      const timelineEntries: TimelineEntry[] = entries.map(entry => ({
        dailyEntryId: 0, // Will be set by the calling component
        locationName: entry.locationName,
        timestamp: entry.timestamp,
        latitude: entry.latitude,
        longitude: entry.longitude,
        icon: entry.icon,
        order: entry.order,
      }));

      await onSave(timelineEntries);
      handleClose();
    } catch (error) {
      console.error('Error saving timeline entries:', error);
      Alert.alert('Error', 'Failed to save timeline entries');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFromLocationHistory = async () => {
    try {
      // Get raw location history for the date
      const locationHistory = await locationService.getLocationHistoryForTimeline(date);
      
      // Convert to editable entries
      const newEntries: EditableLocationEntry[] = locationHistory.map((location, index) => ({
        locationName: location.locationName || 'Unknown Location',
        timestamp: location.timestamp,
        latitude: location.latitude,
        longitude: location.longitude,
        icon: locationService.getLocationIcon(location.locationName || ''),
        order: entries.length + index,
      }));

      // Merge with existing entries, avoiding duplicates
      const existingTimestamps = entries.map(e => e.timestamp);
      const uniqueNewEntries = newEntries.filter(entry => 
        !existingTimestamps.includes(entry.timestamp)
      );

      if (uniqueNewEntries.length > 0) {
        const mergedEntries = [...entries, ...uniqueNewEntries];
        setEntries(mergedEntries.map((entry, index) => ({ ...entry, order: index })));
        Alert.alert('Added', `Added ${uniqueNewEntries.length} new location entries from your location history.`);
      } else {
        Alert.alert('No New Data', 'No new location data available to add.');
      }
    } catch (error) {
      console.error('Error adding from location history:', error);
      Alert.alert('Error', 'Failed to add from location history');
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    
    if (entries.some(entry => entry.isEditing)) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setEntries([]);
              onClose();
            },
          },
        ]
      );
    } else {
      setEntries([]);
      onClose();
    }
  };

  const renderSearchResults = (index: number) => {
    const entry = entries[index];
    console.log('Rendering search results for index', index, ':', entry.searchResults?.length || 0, 'results');
    if (!entry.searchResults || entry.searchResults.length === 0) return null;

    return (
      <View style={styles.searchResultsContainer}>
        <ScrollView 
          style={styles.searchResultsList}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {entry.searchResults.map((place, placeIndex) => (
            <TouchableOpacity
              key={place.place_id}
              style={styles.searchResultItem}
              onPress={() => {
                console.log('Place selected:', place.structured_formatting.main_text);
                handleSelectPlace(index, place);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.searchResultMain}>{place.structured_formatting.main_text}</Text>
              <Text style={styles.searchResultSecondary}>{place.structured_formatting.secondary_text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderEntry = ({ item, index }: { item: EditableLocationEntry; index: number }) => (
    <View style={styles.entryContainer}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryTime}>{formatTime(item.timestamp)}</Text>
        <View style={styles.entryActions}>
          {item.isEditing ? (
            <TouchableOpacity onPress={() => handleSaveEntry(index)} style={styles.actionButton}>
              <Ionicons name="checkmark" size={20} color="#007AFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => handleEditEntry(index)} style={styles.actionButton}>
              <Ionicons name="pencil" size={20} color="#666" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDeleteEntry(index)} style={styles.actionButton}>
            <Ionicons name="trash" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {item.isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={item.searchQuery || item.locationName}
            onChangeText={(text) => {
              const updatedEntries = [...entries];
              updatedEntries[index] = { ...updatedEntries[index], searchQuery: text };
              setEntries(updatedEntries);
              
              // Clear previous search results if query is too short
              if (text.length <= 2) {
                updatedEntries[index] = { ...updatedEntries[index], searchResults: undefined };
                setEntries(updatedEntries);
              } else {
                // Debounce the search
                setTimeout(() => {
                  handleSearchPlaces(index, text);
                }, 300);
              }
            }}
            placeholder="Search for a place..."
            autoFocus
          />
          {item.isSearching && (
            <ActivityIndicator size="small" color="#007AFF" style={styles.searchingIndicator} />
          )}
          {renderSearchResults(index)}
        </View>
      ) : (
        <View style={styles.entryContent}>
          <Text style={styles.entryIcon}>{item.icon}</Text>
          <Text style={styles.entryLocation}>{item.locationName}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Timeline</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={[
              styles.saveButton,
              isSaving && styles.saveButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.saveButtonText,
                isSaving && styles.saveButtonTextDisabled,
              ]}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Add from Location History Button */}
          {!isLoading && entries.length > 0 && (
            <View style={styles.addFromHistorySection}>
              <TouchableOpacity
                style={styles.addFromHistoryButton}
                onPress={handleAddFromLocationHistory}
              >
                <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                <Text style={styles.addFromHistoryText}>Add from Location History</Text>
              </TouchableOpacity>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading location history...</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No location data found for this date</Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              renderItem={renderEntry}
              keyExtractor={(item, index) => `${item.timestamp}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  addFromHistorySection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addFromHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  addFromHistoryText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  entryContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryIcon: {
    fontSize: 20,
  },
  entryLocation: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  editContainer: {
    position: 'relative',
    zIndex: 1,
  },
  editInput: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  searchingIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  searchResultMain: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  searchResultSecondary: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default LocationHistoryModal;
