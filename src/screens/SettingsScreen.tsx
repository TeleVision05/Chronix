import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { notificationService, NotificationSettings } from '../services/NotificationService';
import { databaseService } from '../services/DatabaseService';
import { locationService } from '../services/LocationService';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: false,
    time: '20:00',
    message: 'Time to capture your day! 📸',
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await notificationService.getNotificationSettings();
      setNotificationSettings(settings);
      
      // Parse time string to Date object for picker
      const [hour, minute] = settings.time.split(':').map(Number);
      const timeDate = new Date();
      timeDate.setHours(hour, minute, 0, 0);
      setTempTime(timeDate);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      const newSettings = { ...notificationSettings, enabled: value };
      await notificationService.scheduleDailyReminder(newSettings);
      setNotificationSettings(newSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTempTime(selectedTime);
      const timeString = selectedTime.toTimeString().slice(0, 5);
      updateNotificationTime(timeString);
    }
  };

  const updateNotificationTime = async (time: string) => {
    try {
      const newSettings = { ...notificationSettings, time };
      await notificationService.scheduleDailyReminder(newSettings);
      setNotificationSettings(newSettings);
    } catch (error) {
      console.error('Error updating notification time:', error);
      Alert.alert('Error', 'Failed to update notification time');
    }
  };

  const exportData = async () => {
    try {
      const entries = await databaseService.getAllDailyEntries();
      
      // Get timeline and image data for each entry
      const fullData = [];
      for (const entry of entries) {
        if (entry.id) {
          const timelines = await databaseService.getTimelineEntries(entry.id);
          const images = await databaseService.getImageEntries(entry.id);
          
          fullData.push({
            ...entry,
            timelineEntries: timelines,
            imageEntries: images,
          });
        }
      }
      
      const exportData = {
        entries: fullData,
        exportDate: new Date().toISOString(),
        version: '1.0.0',
      };

      const dataString = JSON.stringify(exportData, null, 2);
      
      // Create a temporary file
      const fileName = `chronix_export_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, dataString);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Chronix Data',
        });
      } else {
        Alert.alert('Export', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your entries, timeline data, and images. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get all entries first
              const entries = await databaseService.getAllDailyEntries();
              
              // Delete all timeline entries and image entries for each daily entry
              for (const entry of entries) {
                if (entry.id) {
                  // Delete timeline entries
                  const timelines = await databaseService.getTimelineEntries(entry.id);
                  for (const timeline of timelines) {
                    if (timeline.id) {
                      await databaseService.deleteTimelineEntry(timeline.id);
                    }
                  }
                  
                  // Delete image entries and local files
                  const images = await databaseService.getImageEntries(entry.id);
                  for (const image of images) {
                    if (image.id) {
                      // Delete local image file if it exists
                      if (image.localUri) {
                        await databaseService.deleteLocalImage(image.localUri);
                      }
                      await databaseService.deleteImageEntry(image.id);
                    }
                  }
                  
                                // Delete the daily entry
              await databaseService.deleteDailyEntry(entry.id);
            }
          }
          
          // Clear all location data from AsyncStorage
          await locationService.clearAllLocationData();
          
          Alert.alert('Success', 'All data has been cleared successfully.');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear all data');
            }
          },
        },
      ]
    );
  };

  const showLocationDataInfo = () => {
    Alert.alert(
      'Location Data Information',
      `Chronix tracks your location to create timeline entries for your daily activities.

Current Status:
• Location tracking: ${locationService.isLocationTracking() ? 'Active' : 'Inactive'}
• Data storage: Persistent (survives app restarts)
• Background tracking: Foreground only (when app is open)

To get location data:
1. Keep the app open while moving around
2. Location data is automatically saved
3. Create a daily entry to see your timeline

For historical data, you can manually add location data using the addExternalLocationData method in the LocationService.`,
      [{ text: 'OK' }]
    );
  };

  const debugDatabase = async () => {
    try {
      const entries = await databaseService.getAllDailyEntries();
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      let debugInfo = `Total entries: ${entries.length}\n\n`;
      debugInfo += `Today's date: ${todayString}\n\n`;
      
      if (entries.length > 0) {
        debugInfo += 'All entries:\n';
        entries.forEach((entry, index) => {
          debugInfo += `${index + 1}. Date: ${entry.date}, Title: ${entry.title}, ID: ${entry.id}\n`;
        });
      } else {
        debugInfo += 'No entries found in database';
      }
      
      Alert.alert('Database Debug Info', debugInfo, [{ text: 'OK' }]);
    } catch (error) {
      console.error('Debug error:', error);
      Alert.alert('Debug Error', `Error: ${error}`, [{ text: 'OK' }]);
    }
  };

  const resetDatabase = async () => {
    Alert.alert(
      'Reset Database',
      'This will delete all your data and reset the database. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.resetDatabase();
              await locationService.clearAllLocationData();
              Alert.alert('Success', 'Database and location data have been reset. Please restart the app.');
            } catch (error) {
              console.error('Error resetting database:', error);
              Alert.alert('Error', 'Failed to reset database');
            }
          },
        },
      ]
    );
  };

  const formatTime = (timeString: string) => {
    const [hour, minute] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={20} color="#666" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Daily Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get reminded to capture your daily moments
                </Text>
              </View>
            </View>
            <Switch
              value={notificationSettings.enabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>

          {notificationSettings.enabled && (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="time" size={20} color="#666" />
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>Reminder Time</Text>
                    <Text style={styles.settingDescription}>
                      {formatTime(notificationSettings.time)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="chatbubble" size={20} color="#666" />
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>Reminder Message</Text>
                    <Text style={styles.settingDescription}>
                      {notificationSettings.message}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={exportData}>
            <View style={styles.settingInfo}>
              <Ionicons name="download" size={20} color="#666" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Export Data</Text>
                <Text style={styles.settingDescription}>
                  Export all your entries and data
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={clearAllData}>
            <View style={styles.settingInfo}>
              <Ionicons name="trash" size={20} color="#FF3B30" />
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, styles.dangerText]}>
                  Clear All Data
                </Text>
                <Text style={styles.settingDescription}>
                  Permanently delete all entries and data
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Location Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Data</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={showLocationDataInfo}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle" size={20} color="#666" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Location Data Info</Text>
                <Text style={styles.settingDescription}>
                  Learn about location tracking and data sources
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Debug Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={debugDatabase}>
            <View style={styles.settingInfo}>
              <Ionicons name="bug" size={20} color="#666" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Debug Database</Text>
                <Text style={styles.settingDescription}>
                  Check database contents and entries
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={resetDatabase}>
            <View style={styles.settingInfo}>
              <Ionicons name="refresh" size={20} color="#FF3B30" />
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Reset Database</Text>
                <Text style={styles.settingDescription}>
                  Reset database if experiencing issues
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle" size={20} color="#666" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Version</Text>
                <Text style={styles.settingDescription}>1.0.0</Text>
              </View>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="heart" size={20} color="#666" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Made with ❤️</Text>
                <Text style={styles.settingDescription}>
                  Capture and reflect on your daily moments
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.modalCancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Set Reminder Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.modalDoneButton}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempTime}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  timeButton: {
    padding: 4,
  },
  dangerText: {
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalDoneButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default SettingsScreen;
