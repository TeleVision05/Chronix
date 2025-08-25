import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import { databaseService, ImageEntry } from '../services/DatabaseService';

interface PhotoPickerScreenProps {
  navigation: any;
  route: any;
}

const PhotoPickerScreen: React.FC<PhotoPickerScreenProps> = ({ navigation, route }) => {
  const { entryId } = route.params;
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadExistingImages();
  }, [entryId]);

  const loadExistingImages = async () => {
    try {
      const images = await databaseService.getImageEntries(entryId);
      setExistingImages(images);
    } catch (error) {
      console.error('Error loading existing images:', error);
    }
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library permissions are required to add photos to your entry.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImages = [...selectedImages, result.assets[0].uri];
        setSelectedImages(newImages);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setLoading(false);
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - existingImages.length - selectedImages.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newUris = result.assets.map(asset => asset.uri);
        const newImages = [...selectedImages, ...newUris];
        setSelectedImages(newImages);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    } finally {
      setLoading(false);
    }
  };

  const removeSelectedImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const saveImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Please select at least one image to save');
      return;
    }

    try {
      setUploading(true);
      
      for (let i = 0; i < selectedImages.length; i++) {
        const imageUri = selectedImages[i];
        const order = existingImages.length + i;
        
        // Save image locally
        const localUri = await databaseService.saveImageLocally(imageUri, entryId, order);
        
        // Create image entry
        await databaseService.createImageEntry({
          dailyEntryId: entryId,
          uri: imageUri,
          localUri,
          order,
          createdAt: new Date().toISOString(),
        });
      }

      // Reload existing images
      await loadExistingImages();
      setSelectedImages([]);
      
      Alert.alert('Success', 'Images saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving images:', error);
      Alert.alert('Error', 'Failed to save images');
    } finally {
      setUploading(false);
    }
  };

  const maxImages = 5;
  const remainingSlots = maxImages - existingImages.length - selectedImages.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Photos</Text>
        <TouchableOpacity
          onPress={saveImages}
          disabled={uploading || selectedImages.length === 0}
          style={[
            styles.saveButton,
            (uploading || selectedImages.length === 0) && styles.saveButtonDisabled,
          ]}
        >
          <Text style={[
            styles.saveButtonText,
            (uploading || selectedImages.length === 0) && styles.saveButtonTextDisabled,
          ]}>
            {uploading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Existing Images */}
        {existingImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Existing Photos ({existingImages.length})</Text>
            <View style={styles.imageGrid}>
              {existingImages.map((image, index) => (
                <View key={image.id} style={styles.existingImageContainer}>
                  <Image
                    source={{ uri: image.localUri || image.uri }}
                    style={styles.existingImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Selected Images */}
        {selectedImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Photos ({selectedImages.length})</Text>
            <View style={styles.imageGrid}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.selectedImageContainer}>
                  <Image source={{ uri }} style={styles.selectedImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeSelectedImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Add Photos Section */}
        {remainingSlots > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Photos</Text>
            <Text style={styles.sectionSubtitle}>
              You can add up to {remainingSlots} more photo{remainingSlots !== 1 ? 's' : ''}
            </Text>
            
            <View style={styles.addButtonsContainer}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={takePhoto}
                disabled={loading}
              >
                <Ionicons name="camera" size={32} color="#007AFF" />
                <Text style={styles.addButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addButton}
                onPress={pickFromGallery}
                disabled={loading}
              >
                <Ionicons name="images" size={32} color="#007AFF" />
                <Text style={styles.addButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {remainingSlots === 0 && (
          <View style={styles.maxReachedContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#34C759" />
            <Text style={styles.maxReachedText}>Maximum photos reached</Text>
            <Text style={styles.maxReachedSubtext}>
              You can add up to 5 photos per entry
            </Text>
          </View>
        )}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  existingImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  existingImage: {
    width: '100%',
    height: '100%',
  },
  selectedImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addButtonsContainer: {
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  maxReachedContainer: {
    alignItems: 'center',
    padding: 32,
  },
  maxReachedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  maxReachedSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default PhotoPickerScreen;
