import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageEntry } from '../services/DatabaseService';

interface ImageGalleryProps {
  images: ImageEntry[];
  onImagePress?: (image: ImageEntry, index: number) => void;
  onDelete?: (imageId: number) => void;
  showDeleteButtons?: boolean;
}

const { width } = Dimensions.get('window');
const imageSize = (width - 48) / 3; // 3 images per row with margins

const ImageGallery: React.FC<ImageGalleryProps> = ({ 
  images, 
  onImagePress, 
  onDelete, 
  showDeleteButtons = false 
}) => {
  const [selectedImage, setSelectedImage] = useState<ImageEntry | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleImagePress = (image: ImageEntry, index: number) => {
    if (onImagePress) {
      onImagePress(image, index);
    } else {
      setSelectedImage(image);
      setSelectedIndex(index);
    }
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!selectedImage) return;
    
    const newIndex = direction === 'next' 
      ? Math.min(selectedIndex + 1, images.length - 1)
      : Math.max(selectedIndex - 1, 0);
    
    setSelectedImage(images[newIndex]);
    setSelectedIndex(newIndex);
  };

  if (images.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No photos yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.imageGrid}>
        {images.map((image, index) => (
          <View key={image.id} style={styles.imageWrapper}>
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={() => handleImagePress(image, index)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: image.localUri || image.uri }}
                style={styles.image}
                resizeMode="cover"
              />
              {index === 4 && images.length > 5 && (
                <View style={styles.overlay}>
                  <Text style={styles.overlayText}>+{images.length - 5}</Text>
                </View>
              )}
            </TouchableOpacity>
            {showDeleteButtons && onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDelete(image.id!)}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Full Screen Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.imageCounter}>
              {selectedIndex + 1} of {images.length}
            </Text>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              if (newIndex !== selectedIndex && newIndex < images.length) {
                setSelectedImage(images[newIndex]);
                setSelectedIndex(newIndex);
              }
            }}
          >
            {images.map((image, index) => (
              <View key={image.id} style={styles.modalImageContainer}>
                <Image
                  source={{ uri: image.localUri || image.uri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.navButton, selectedIndex === 0 && styles.navButtonDisabled]}
              onPress={() => navigateImage('prev')}
              disabled={selectedIndex === 0}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navButton, selectedIndex === images.length - 1 && styles.navButtonDisabled]}
              onPress={() => navigateImage('next')}
              disabled={selectedIndex === images.length - 1}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageWrapper: {
    position: 'relative',
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  closeButton: {
    padding: 8,
  },
  imageCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalImageContainer: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  navButton: {
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
});

export default ImageGallery;
