import React, { useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DailyEntry, TimelineEntry, ImageEntry } from '../services/DatabaseService';
import TimelineComponent from './TimelineComponent';
import ImageGallery from './ImageGallery';
import LocationHistoryModal from './LocationHistoryModal';

interface EditEntryModalProps {
  visible: boolean;
  entry: DailyEntry | null;
  timelineEntries: TimelineEntry[];
  imageEntries: ImageEntry[];
  onClose: () => void;
  onSave: (entry: DailyEntry, updates: Partial<DailyEntry>) => void;
  onAddTimeline?: (entryId: number) => void;
  onAddImage?: (entryId: number) => void;
  onDeleteTimeline?: (timelineId: number) => void;
  onDeleteImage?: (imageId: number) => void;
  onSaveTimeline?: (entries: TimelineEntry[]) => void;
}

const EditEntryModal: React.FC<EditEntryModalProps> = ({
  visible,
  entry,
  timelineEntries,
  imageEntries,
  onClose,
  onSave,
  onAddTimeline,
  onAddImage,
  onDeleteTimeline,
  onDeleteImage,
  onSaveTimeline,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLocationHistory, setShowLocationHistory] = useState(false);

  useEffect(() => {
    if (entry) {
      setTitle(entry.title || '');
      setDescription(entry.description || '');
    }
  }, [entry]);

  const handleSubmit = async () => {
    if (!entry || !title.trim()) {
      Alert.alert('Error', 'Please enter a title for your entry');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: Partial<DailyEntry> = {
        title: title.trim(),
        description: description.trim() || undefined,
      };
      
      await onSave(entry, updates);
    } catch (error) {
      console.error('Error updating entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    const hasChanges = title !== (entry?.title || '') || description !== (entry?.description || '');
    
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              // Reset to original values
              setTitle(entry?.title || '');
              setDescription(entry?.description || '');
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const handleDeleteTimeline = (timelineId: number) => {
    Alert.alert(
      'Delete Timeline Entry',
      'Are you sure you want to delete this timeline entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteTimeline?.(timelineId),
        },
      ]
    );
  };

  const handleDeleteImage = (imageId: number) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteImage?.(imageId),
        },
      ]
    );
  };

  if (!entry) return null;

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
          <Text style={styles.headerTitle}>Edit Entry</Text>
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.dateText}>{entry.date}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter title..."
              placeholderTextColor="#999"
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

          {/* Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Photos {imageEntries.length > 0 ? `(${imageEntries.length})` : ''}
              </Text>
              {onAddImage && imageEntries.length < 5 && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => onAddImage(entry.id!)}
                >
                  <Ionicons name="add" size={16} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>
            {imageEntries.length > 0 ? (
              <View style={styles.photoSection}>
                <ImageGallery 
                  images={imageEntries} 
                  onDelete={handleDeleteImage}
                  showDeleteButtons={true}
                />
              </View>
            ) : (
              <View style={styles.emptySection}>
                <Ionicons name="images-outline" size={32} color="#ccc" />
                <Text style={styles.emptyText}>No photos yet</Text>
                {onAddImage && (
                  <TouchableOpacity
                    style={styles.addContentButton}
                    onPress={() => onAddImage(entry.id!)}
                  >
                    <Ionicons name="camera" size={16} color="#007AFF" />
                    <Text style={styles.addContentButtonText}>Add Photos</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Timeline Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Timeline {timelineEntries.length > 0 ? `(${timelineEntries.length} stops)` : ''}
              </Text>
              <View style={styles.timelineActions}>
                {onAddTimeline && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => onAddTimeline(entry.id!)}
                  >
                    <Ionicons name="add" size={16} color="#007AFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.editTimelineButton}
                  onPress={() => setShowLocationHistory(true)}
                >
                  <Ionicons name="create-outline" size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
            {timelineEntries.length > 0 ? (
              <View style={styles.timelineSection}>
                <TimelineComponent 
                  entries={timelineEntries}
                  onDelete={handleDeleteTimeline}
                  showDeleteButtons={true}
                />
              </View>
            ) : (
              <View style={styles.emptySection}>
                <Ionicons name="location-outline" size={32} color="#ccc" />
                <Text style={styles.emptyText}>No timeline entries yet</Text>
                {onAddTimeline && (
                  <TouchableOpacity
                    style={styles.addContentButton}
                    onPress={() => onAddTimeline(entry.id!)}
                  >
                    <Ionicons name="add" size={16} color="#007AFF" />
                    <Text style={styles.addContentButtonText}>Add Timeline Entry</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Location History Modal */}
        {showLocationHistory && (
          <LocationHistoryModal
            visible={showLocationHistory}
            date={new Date(entry.date)}
            existingEntries={timelineEntries}
            onClose={() => setShowLocationHistory(false)}
            onSave={async (entries) => {
              try {
                await onSaveTimeline?.(entries);
                setShowLocationHistory(false);
              } catch (error) {
                console.error('Error saving timeline entries:', error);
                Alert.alert('Error', 'Failed to save timeline entries');
              }
            }}
          />
        )}
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
    padding: 16,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timelineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    padding: 4,
  },
  editTimelineButton: {
    padding: 4,
  },
  photoSection: {
    marginBottom: 8,
  },
  timelineSection: {
    marginBottom: 8,
  },
  emptySection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  addContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  addContentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EditEntryModal;
