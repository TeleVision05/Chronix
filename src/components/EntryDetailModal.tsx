import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DailyEntry, TimelineEntry, ImageEntry } from '../services/DatabaseService';
import { getRelativeDateString } from '../utils/dateUtils';
import TimelineComponent from './TimelineComponent';
import ImageGallery from './ImageGallery';

interface EntryDetailModalProps {
  visible: boolean;
  entry: DailyEntry | null;
  timelineEntries: TimelineEntry[];
  imageEntries: ImageEntry[];
  onClose: () => void;
  onEdit?: (entry: DailyEntry) => void;
  onDelete?: (entryId: number) => void;
  onAddTimeline?: (entryId: number) => void;
  onAddImage?: (entryId: number) => void;
}

const { width } = Dimensions.get('window');

const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  visible,
  entry,
  timelineEntries,
  imageEntries,
  onClose,
  onEdit,
  onDelete,
  onAddTimeline,
  onAddImage,
}) => {
  if (!entry) return null;

  const entryDate = new Date(entry.date);
  const hasImages = imageEntries.length > 0;
  const hasTimeline = timelineEntries.length > 0;
  const hasDescription = entry.description && entry.description.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Entry Details</Text>
          <View style={styles.headerActions}>
            {onEdit && (
              <TouchableOpacity onPress={() => onEdit(entry)} style={styles.actionButton}>
                <Ionicons name="create-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity onPress={() => onDelete(entry.id!)} style={styles.actionButton}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Entry Info */}
          <View style={styles.entryInfo}>
            <Text style={styles.title}>{entry.title}</Text>
            <Text style={styles.date}>{getRelativeDateString(entryDate)}</Text>
          </View>

          {/* Description */}
          {hasDescription && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{entry.description}</Text>
            </View>
          )}

          {/* Images */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Photos {hasImages ? `(${imageEntries.length})` : ''}
            </Text>
            {hasImages ? (
              <ImageGallery images={imageEntries} />
            ) : (
              <View style={styles.emptySection}>
                <Ionicons name="images-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No photos yet</Text>
              </View>
            )}
          </View>

          {/* Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Timeline {hasTimeline ? `(${timelineEntries.length} stops)` : ''}
            </Text>
            {hasTimeline ? (
              <TimelineComponent entries={timelineEntries} />
            ) : (
              <View style={styles.emptySection}>
                <Ionicons name="location-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No timeline entries yet</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  entryInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  emptySection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },

});

export default EntryDetailModal;
