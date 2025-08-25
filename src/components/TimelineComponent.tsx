import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimelineEntry } from '../services/DatabaseService';
import { formatTime } from '../utils/dateUtils';

interface TimelineComponentProps {
  entries: TimelineEntry[];
  onDelete?: (timelineId: number) => void;
  showDeleteButtons?: boolean;
}

const { width } = Dimensions.get('window');

const TimelineComponent: React.FC<TimelineComponentProps> = ({ 
  entries, 
  onDelete, 
  showDeleteButtons = false 
}) => {
  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No timeline entries yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {entries.map((entry, index) => (
        <View key={entry.id} style={styles.timelineItem}>
          {/* Timeline line */}
          <View style={styles.timelineLine}>
            <View style={styles.timelineDot} />
            {index < entries.length - 1 && <View style={styles.timelineConnector} />}
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.locationName}>{entry.locationName}</Text>
              <View style={styles.headerRight}>
                {entry.timestamp && (
                  <Text style={styles.timestamp}>{formatTime(entry.timestamp)}</Text>
                )}
                {showDeleteButtons && onDelete && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => onDelete(entry.id!)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <View style={styles.locationDetails}>
              <Text style={styles.icon}>{entry.icon || '📍'}</Text>
              {entry.latitude && entry.longitude && (
                <Text style={styles.coordinates}>
                  {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineConnector: {
    width: 2,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  coordinates: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default TimelineComponent;
