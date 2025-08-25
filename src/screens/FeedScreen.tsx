import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databaseService, DailyEntry, TimelineEntry, ImageEntry } from '../services/DatabaseService';
import { locationService } from '../services/LocationService';
import { notificationService } from '../services/NotificationService';
import { formatDateForTitle, formatDateForStorage, isToday } from '../utils/dateUtils';
import DailyEntryCard from '../components/DailyEntryCard';
import AddEntryModal from '../components/AddEntryModal';
import EditEntryModal from '../components/EditEntryModal';
import EntryDetailModal from '../components/EntryDetailModal';

interface FeedScreenProps {
  navigation: any;
}

const FeedScreen: React.FC<FeedScreenProps> = ({ navigation }) => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<Map<number, TimelineEntry[]>>(new Map());
  const [imageEntries, setImageEntries] = useState<Map<number, ImageEntry[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);
  const [locationDataSummary, setLocationDataSummary] = useState<{
    todayCount: number;
    totalStoredDays: number;
    lastUpdated: string | null;
  } | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const allEntries = await databaseService.getAllDailyEntries();
      console.log('Loaded entries:', allEntries.length, allEntries);
      setEntries(allEntries);

      // Load timeline and image entries for each daily entry
      const timelineMap = new Map<number, TimelineEntry[]>();
      const imageMap = new Map<number, ImageEntry[]>();

      for (const entry of allEntries) {
        if (entry.id) {
          const timelines = await databaseService.getTimelineEntries(entry.id);
          const images = await databaseService.getImageEntries(entry.id);
          timelineMap.set(entry.id, timelines);
          imageMap.set(entry.id, images);
          console.log(`Entry ${entry.id}: ${timelines.length} timeline entries, ${images.length} images`);
        }
      }

      setTimelineEntries(timelineMap);
      setImageEntries(imageMap);
      
      // Load location data summary
      const summary = await locationService.getLocationDataSummary();
      setLocationDataSummary(summary);
    } catch (error) {
      console.error('Error loading entries:', error);
      Alert.alert('Error', 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }, [loadEntries]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadEntries();
    });

    return unsubscribe;
  }, [navigation, loadEntries]);

  const handleAddEntry = async (title: string, description?: string, timelineEntries?: TimelineEntry[]) => {
    try {
      const today = new Date();
      const dateString = formatDateForStorage(today);
      
      // Check if entry already exists for today
      const existingEntry = await databaseService.getDailyEntry(dateString);
      if (existingEntry) {
        console.log('Existing entry found:', existingEntry);
        Alert.alert(
          'Entry Exists', 
          'An entry for today already exists. You can edit it from the main feed.',
          [{ text: 'OK' }]
        );
        setShowAddModal(false);
        // Refresh the feed to show the existing entry
        await loadEntries();
        return;
      }

      const newEntry: Omit<DailyEntry, 'id'> = {
        date: dateString,
        title: title || formatDateForTitle(today),
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const entryId = await databaseService.createDailyEntry(newEntry);
      const createdEntry = { ...newEntry, id: entryId };
      
      // Create timeline entries from provided data or today's location history
      let finalTimelineEntries: TimelineEntry[] = [];
      
      if (timelineEntries && timelineEntries.length > 0) {
        // Use provided timeline entries
        for (let i = 0; i < timelineEntries.length; i++) {
          const entry = timelineEntries[i];
          const timelineEntry: Omit<TimelineEntry, 'id'> = {
            dailyEntryId: entryId,
            locationName: entry.locationName,
            timestamp: entry.timestamp,
            latitude: entry.latitude,
            longitude: entry.longitude,
            icon: entry.icon,
            order: i,
          };
          
          const timelineId = await databaseService.createTimelineEntry(timelineEntry);
          finalTimelineEntries.push({ ...timelineEntry, id: timelineId });
        }
      } else {
        // Get today's location history and create timeline entries
        const todayLocations = await locationService.getTodayLocationHistory();
        
        for (let i = 0; i < todayLocations.length; i++) {
          const location = todayLocations[i];
          const locationName = await locationService.getLocationName(location.latitude, location.longitude);
          
          const timelineEntry: Omit<TimelineEntry, 'id'> = {
            dailyEntryId: entryId,
            locationName,
            timestamp: location.timestamp,
            latitude: location.latitude,
            longitude: location.longitude,
            icon: locationService.getLocationIcon(locationName),
            order: i,
          };
          
          const timelineId = await databaseService.createTimelineEntry(timelineEntry);
          finalTimelineEntries.push({ ...timelineEntry, id: timelineId });
        }
      }
      
      setEntries(prev => [createdEntry, ...prev]);
      setTimelineEntries(prev => new Map(prev).set(entryId, finalTimelineEntries));
      setImageEntries(prev => new Map(prev).set(entryId, []));
      
      setShowAddModal(false);
      
      // Show success message with timeline info
      if (finalTimelineEntries.length > 0) {
        Alert.alert(
          'Entry Created!',
          `Your daily entry has been created with ${finalTimelineEntries.length} location stops from today.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      Alert.alert('Error', 'Failed to add entry');
    }
  };

  const handleEditEntry = async (entry: DailyEntry, updates: Partial<DailyEntry>) => {
    try {
      if (entry.id) {
        await databaseService.updateDailyEntry(entry.id, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });

        setEntries(prev => 
          prev.map(e => e.id === entry.id ? { ...e, ...updates } : e)
        );
        
        setEditingEntry(null);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteDailyEntry(entryId);
              setEntries(prev => prev.filter(e => e.id !== entryId));
              setTimelineEntries(prev => {
                const newMap = new Map(prev);
                newMap.delete(entryId);
                return newMap;
              });
              setImageEntries(prev => {
                const newMap = new Map(prev);
                newMap.delete(entryId);
                return newMap;
              });
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const handleAddTimeline = async (entryId: number) => {
    try {
      // Get the entry to check if it's for today
      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;

      const entryDate = new Date(entry.date);
      const today = new Date();
      const isToday = entryDate.toDateString() === today.toDateString();

      if (isToday) {
        // For today's entry, get all location history and add missing ones
        const todayLocations = await locationService.getTodayLocationHistory();
        const existingTimelines = timelineEntries.get(entryId) || [];
        const existingLocationTimes = existingTimelines.map(t => t.timestamp);
        
        let addedCount = 0;
        for (const location of todayLocations) {
          if (!existingLocationTimes.includes(location.timestamp)) {
            const locationName = await locationService.getLocationName(location.latitude, location.longitude);
            
            const timelineEntry: Omit<TimelineEntry, 'id'> = {
              dailyEntryId: entryId,
              locationName,
              timestamp: location.timestamp,
              latitude: location.latitude,
              longitude: location.longitude,
              icon: locationService.getLocationIcon(locationName),
              order: existingTimelines.length + addedCount,
            };
            
            const timelineId = await databaseService.createTimelineEntry(timelineEntry);
            const createdTimeline = { ...timelineEntry, id: timelineId };
            
            existingTimelines.push(createdTimeline);
            addedCount++;
          }
        }
        
        if (addedCount > 0) {
          setTimelineEntries(prev => {
            const newMap = new Map(prev);
            newMap.set(entryId, existingTimelines);
            return newMap;
          });
          
          Alert.alert('Timeline Updated', `Added ${addedCount} new location stops to your timeline.`);
        } else {
          Alert.alert('No New Locations', 'No new location data available since your last update.');
        }
      } else {
        // For past entries, add current location
        const timelineEntry = await locationService.createTimelineEntryFromLocation(entryId);
        const existingTimelines = timelineEntries.get(entryId) || [];
        const newOrder = existingTimelines.length;
        
        const newTimelineEntry = {
          ...timelineEntry,
          order: newOrder,
        };

        const timelineId = await databaseService.createTimelineEntry(newTimelineEntry);
        const createdTimeline = { ...newTimelineEntry, id: timelineId };

        setTimelineEntries(prev => {
          const newMap = new Map(prev);
          newMap.set(entryId, [...(newMap.get(entryId) || []), createdTimeline]);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error adding timeline entry:', error);
      Alert.alert('Error', 'Failed to add timeline entry. Please check location permissions.');
    }
  };

  const handleAddImage = async (entryId: number) => {
    // This will be implemented in the AddEntryModal component
    // For now, we'll navigate to a photo picker screen
    navigation.navigate('PhotoPicker', { entryId });
  };

  const handleDeleteTimeline = async (timelineId: number) => {
    try {
      await databaseService.deleteTimelineEntry(timelineId);
      await loadEntries(); // Refresh the data
      console.log('Timeline entry deleted successfully');
    } catch (error) {
      console.error('Error deleting timeline entry:', error);
      Alert.alert('Error', 'Failed to delete timeline entry');
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await databaseService.deleteImageEntry(imageId);
      await loadEntries(); // Refresh the data
      console.log('Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      Alert.alert('Error', 'Failed to delete image');
    }
  };

  const handleSaveTimeline = async (entries: TimelineEntry[]) => {
    try {
      console.log('Starting timeline save with entries:', entries.length);
      
      // Get the current entry being edited
      const currentEntry = editingEntry;
      if (!currentEntry) {
        console.error('No current entry found');
        return;
      }

      console.log('Current entry ID:', currentEntry.id);

      // Delete all existing timeline entries for this entry
      const existingEntries = timelineEntries.get(currentEntry.id!) || [];
      console.log('Existing entries to delete:', existingEntries.length);
      
      for (const existingEntry of existingEntries) {
        if (existingEntry.id) {
          console.log('Deleting timeline entry:', existingEntry.id);
          await databaseService.deleteTimelineEntry(existingEntry.id);
        }
      }

      // Create new timeline entries
      console.log('Creating new timeline entries:', entries.length);
      for (const newEntry of entries) {
        // Validate required fields
        if (!newEntry.locationName || !newEntry.timestamp) {
          console.error('Invalid timeline entry:', newEntry);
          throw new Error('Timeline entry missing required fields');
        }

        const timelineEntry = {
          dailyEntryId: currentEntry.id!,
          locationName: newEntry.locationName,
          timestamp: newEntry.timestamp,
          latitude: newEntry.latitude || undefined,
          longitude: newEntry.longitude || undefined,
          icon: newEntry.icon || undefined,
          order: newEntry.order || 0,
        };
        
        console.log('Creating timeline entry:', timelineEntry);
        await databaseService.createTimelineEntry(timelineEntry);
      }

      // Refresh the data
      console.log('Refreshing entries...');
      await loadEntries();
      console.log('Timeline saved successfully');
    } catch (error) {
      console.error('Error saving timeline:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      Alert.alert('Error', `Failed to save timeline: ${errorMessage}`);
    }
  };

  const renderEntry = ({ item }: { item: DailyEntry }) => {
    const timelines = timelineEntries.get(item.id!) || [];
    const images = imageEntries.get(item.id!) || [];

    return (
      <DailyEntryCard
        entry={item}
        timelineEntries={timelines}
        imageEntries={images}
        onEdit={setEditingEntry}
        onDelete={handleDeleteEntry}
        onAddTimeline={handleAddTimeline}
        onAddImage={handleAddImage}
        onPress={handleEntryPress}
      />
    );
  };

  const handleEntryPress = (entry: DailyEntry) => {
    // Show the detail modal
    setSelectedEntry(entry);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No entries yet</Text>
      <Text style={styles.emptySubtitle}>
        Start capturing your daily moments by adding your first entry
      </Text>
      <TouchableOpacity
        style={styles.emptyAddButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.emptyAddButtonText}>Add First Entry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your memories...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chronix</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Data Status */}
      {locationDataSummary && (
        <View style={styles.locationStatus}>
          <Ionicons name="location" size={16} color="#007AFF" />
          <Text style={styles.locationStatusText}>
            {locationDataSummary.todayCount > 0 
              ? `${locationDataSummary.todayCount} location stops tracked today`
              : 'No location data for today yet'
            }
          </Text>
        </View>
      )}

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id?.toString() || item.date}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <AddEntryModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddEntry}
      />

      {editingEntry && (
        <EditEntryModal
          visible={!!editingEntry}
          entry={editingEntry}
          timelineEntries={timelineEntries.get(editingEntry.id!) || []}
          imageEntries={imageEntries.get(editingEntry.id!) || []}
          onClose={() => setEditingEntry(null)}
          onSave={handleEditEntry}
          onAddTimeline={handleAddTimeline}
          onAddImage={handleAddImage}
          onDeleteTimeline={handleDeleteTimeline}
          onDeleteImage={handleDeleteImage}
          onSaveTimeline={handleSaveTimeline}
        />
      )}

      {selectedEntry && (
        <EntryDetailModal
          visible={!!selectedEntry}
          entry={selectedEntry}
          timelineEntries={timelineEntries.get(selectedEntry.id!) || []}
          imageEntries={imageEntries.get(selectedEntry.id!) || []}
          onClose={() => setSelectedEntry(null)}
          onEdit={setEditingEntry}
          onDelete={handleDeleteEntry}
          onAddTimeline={handleAddTimeline}
          onAddImage={handleAddImage}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  locationStatusText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FeedScreen;
