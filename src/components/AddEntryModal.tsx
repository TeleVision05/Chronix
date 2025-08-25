import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateForTitle } from '../utils/dateUtils';
import { locationService } from '../services/LocationService';
import LocationHistoryModal from './LocationHistoryModal';
import { TimelineEntry } from '../services/DatabaseService';

interface AddEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, description?: string, timelineEntries?: TimelineEntry[]) => void;
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLocationHistory, setShowLocationHistory] = useState(false);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);

  const today = new Date();
  const defaultTitle = formatDateForTitle(today);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your entry');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(title.trim(), description.trim() || undefined, timelineEntries);
      resetForm();
    } catch (error) {
      console.error('Error adding entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationHistorySave = (entries: TimelineEntry[]) => {
    setTimelineEntries(entries);
    setShowLocationHistory(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTimelineEntries([]);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    if (title.trim() || description.trim()) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };

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
          <Text style={styles.headerTitle}>New Entry</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            style={[
              styles.saveButton,
              (!title.trim() || isSubmitting) && styles.saveButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.saveButtonText,
                (!title.trim() || isSubmitting) && styles.saveButtonTextDisabled,
              ]}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder={defaultTitle}
              placeholderTextColor="#999"
              autoFocus
              maxLength={100}
            />
            <Text style={styles.characterCount}>
              {title.length}/100
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your day..."
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {description.length}/1000
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              You can add photos and timeline entries after creating this entry.
            </Text>
          </View>

          <View style={styles.locationInfoSection}>
            <Ionicons name="location" size={20} color="#007AFF" />
            <Text style={styles.locationInfoText}>
              Location tracking is active. Your daily timeline will be automatically populated with today's location data.
            </Text>
            <TouchableOpacity
              style={styles.editTimelineButton}
              onPress={() => setShowLocationHistory(true)}
            >
              <Text style={styles.editTimelineButtonText}>Edit Timeline</Text>
            </TouchableOpacity>
          </View>

          {timelineEntries.length > 0 && (
            <View style={styles.timelinePreviewSection}>
              <Text style={styles.timelinePreviewTitle}>Timeline Preview ({timelineEntries.length} locations)</Text>
              {timelineEntries.slice(0, 3).map((entry, index) => (
                <View key={index} style={styles.timelinePreviewItem}>
                  <Text style={styles.timelinePreviewIcon}>{entry.icon}</Text>
                  <Text style={styles.timelinePreviewLocation}>{entry.locationName}</Text>
                </View>
              ))}
              {timelineEntries.length > 3 && (
                <Text style={styles.timelinePreviewMore}>+{timelineEntries.length - 3} more locations</Text>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <LocationHistoryModal
        visible={showLocationHistory}
        onClose={() => setShowLocationHistory(false)}
        onSave={handleLocationHistorySave}
        date={today}
        existingEntries={timelineEntries}
      />
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
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    color: '#1a1a1a',
  },
  descriptionInput: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    color: '#1a1a1a',
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  locationInfoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  locationInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  editTimelineButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  editTimelineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timelinePreviewSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timelinePreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  timelinePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  timelinePreviewIcon: {
    fontSize: 16,
  },
  timelinePreviewLocation: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  timelinePreviewMore: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default AddEntryModal;
