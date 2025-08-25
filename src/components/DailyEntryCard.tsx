import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DailyEntry, TimelineEntry, ImageEntry } from '../services/DatabaseService';
import { getRelativeDateString } from '../utils/dateUtils';

interface DailyEntryCardProps {
  entry: DailyEntry;
  timelineEntries: TimelineEntry[];
  imageEntries: ImageEntry[];
  onEdit?: (entry: DailyEntry) => void;
  onDelete?: (entryId: number) => void;
  onAddTimeline?: (entryId: number) => void;
  onAddImage?: (entryId: number) => void;
  onPress?: (entry: DailyEntry) => void;
}

const { width } = Dimensions.get('window');
const cardWidth = width - 32; // 16px margin on each side
const imageHeight = cardWidth * 0.6; // 60% of card width for image

const DailyEntryCard: React.FC<DailyEntryCardProps> = ({
  entry,
  timelineEntries,
  imageEntries,
  onEdit,
  onDelete,
  onAddTimeline,
  onAddImage,
  onPress,
}) => {
  const entryDate = new Date(entry.date);
  const hasImages = imageEntries.length > 0;
  const hasTimeline = timelineEntries.length > 0;
  const hasDescription = entry.description && entry.description.trim().length > 0;

  const handlePress = () => {
    if (onPress) {
      onPress(entry);
    }
  };

  const getFirstImage = () => {
    return imageEntries.length > 0 ? imageEntries[0] : null;
  };

  const truncateDescription = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.9}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={styles.date}>
            {getRelativeDateString(entryDate)}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Content indicators */}
          <View style={styles.contentIndicators}>
            {hasDescription && (
              <Ionicons name="text" size={14} color="#666" />
            )}
            {hasTimeline && (
              <Ionicons name="location" size={14} color="#666" />
            )}
            {hasImages && (
              <Ionicons name="images" size={14} color="#666" />
            )}
          </View>
          
          {/* Action menu */}
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Preview */}
      {hasImages && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getFirstImage()?.localUri || getFirstImage()?.uri }}
            style={styles.image}
            resizeMode="cover"
          />
          {imageEntries.length > 1 && (
            <View style={styles.imageCount}>
              <Ionicons name="images" size={16} color="#fff" />
              <Text style={styles.imageCountText}>+{imageEntries.length - 1}</Text>
            </View>
          )}
        </View>
      )}

      {/* Content Preview */}
      <View style={styles.content}>
        {/* Description */}
        {hasDescription && (
          <Text style={styles.description} numberOfLines={3}>
            {truncateDescription(entry.description!)}
          </Text>
        )}

        {/* Timeline Preview */}
        {hasTimeline && (
          <View style={styles.timelinePreview}>
            <Ionicons name="location" size={16} color="#007AFF" />
            <Text style={styles.timelinePreviewText}>
              {timelineEntries.length} location{timelineEntries.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color="#666" />
          </TouchableOpacity>
          
          <View style={styles.spacer} />
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  menuButton: {
    padding: 4,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: imageHeight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageCount: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  timelinePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timelinePreviewText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  spacer: {
    flex: 1,
  },
});

export default DailyEntryCard;
