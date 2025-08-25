# Chronix Testing Guide

This guide helps you verify that all features of Chronix are working correctly.

## 🧪 Pre-Testing Setup

1. **Install dependencies**: `npm install`
2. **Set up Google Places API key** (see SETUP.md)
3. **Start the app**: `npm start`
4. **Run on device/simulator**: `npm run ios` or `npm run android`

## 📱 Feature Testing Checklist

### ✅ **1. App Initialization**
- [ ] App launches without errors
- [ ] Loading screen appears briefly
- [ ] Location permissions are requested
- [ ] Background location tracking starts
- [ ] Main feed screen loads

### ✅ **2. Location Tracking**
- [ ] Location permission dialog appears
- [ ] Background tracking notification shows (Android)
- [ ] Location data is being collected (check console logs)
- [ ] App continues tracking when closed

**Test Steps:**
1. Grant location permissions
2. Move around or use location simulation
3. Check console for location updates
4. Close app and verify background tracking

### ✅ **3. Daily Entry Creation**
- [ ] "+" button opens AddEntryModal
- [ ] Default title shows current date
- [ ] Can enter custom title and description
- [ ] "Edit Timeline" button is visible
- [ ] Entry saves successfully

**Test Steps:**
1. Tap "+" button
2. Enter title and description
3. Tap "Save"
4. Verify entry appears in feed

### ✅ **4. Location History Integration**
- [ ] "Edit Timeline" button opens LocationHistoryModal
- [ ] Today's location data loads automatically
- [ ] Location entries show with timestamps
- [ ] Can edit location names
- [ ] Can delete location entries
- [ ] Can reorder entries

**Test Steps:**
1. Create a new entry
2. Tap "Edit Timeline"
3. Verify location history appears
4. Try editing a location name
5. Try deleting an entry
6. Save changes

### ✅ **5. Place Search Functionality**
- [ ] Search box appears when editing location
- [ ] Typing triggers search (after 3+ characters)
- [ ] Search results appear in dropdown
- [ ] Can scroll through search results
- [ ] Can tap to select a place
- [ ] Selected place updates location data

**Test Steps:**
1. Edit a location entry
2. Type "Starbucks" or "123 Main St"
3. Wait for search results
4. Scroll through results
5. Tap on a result
6. Verify location updates

### ✅ **6. Photo Integration**
- [ ] "Add Photos" button works in entry cards
- [ ] PhotoPickerScreen opens
- [ ] Camera permission is requested
- [ ] Can take photos with camera
- [ ] Can select photos from gallery
- [ ] Photos save successfully
- [ ] Photos appear in entry card

**Test Steps:**
1. Open an existing entry
2. Tap "Add Photos"
3. Grant camera permissions
4. Take a photo or select from gallery
5. Save photos
6. Verify photos appear in entry

### ✅ **7. Image Gallery**
- [ ] Photos display in grid layout
- [ ] Can tap to view full screen
- [ ] Full-screen navigation works
- [ ] Photo counter shows correctly
- [ ] Close button works

**Test Steps:**
1. Add photos to an entry
2. Tap on a photo in the grid
3. Navigate between photos
4. Close full-screen view

### ✅ **8. Timeline Display**
- [ ] Timeline entries show in chronological order
- [ ] Location names display correctly
- [ ] Timestamps show properly
- [ ] Icons appear for different location types
- [ ] Expandable cards work

**Test Steps:**
1. Create entry with location history
2. Expand the entry card
3. Verify timeline entries display
4. Check timestamps and location names

### ✅ **9. Data Persistence**
- [ ] Entries persist after app restart
- [ ] Location data persists after app restart
- [ ] Photos persist after app restart
- [ ] Timeline edits persist after app restart

**Test Steps:**
1. Create entries with photos and timeline
2. Close app completely
3. Restart app
4. Verify all data is still there

### ✅ **10. Navigation**
- [ ] Can navigate between screens
- [ ] Back buttons work
- [ ] Modal dismissals work
- [ ] Screen transitions are smooth

**Test Steps:**
1. Navigate to PhotoPicker
2. Navigate to Settings
3. Use back buttons
4. Dismiss modals

## 🔍 Debug Information

### Console Logs to Monitor

**Location Tracking:**
```
Background location tracking started
Background location update: {latitude, longitude, timestamp}
Background location saved to storage
```

**Place Search:**
```
Searching places for query: [query]
Places API success: X results
Search results received: X results
Place selected: [place name]
```

**Timeline Creation:**
```
Rendering search results for index X: Y results
Loading location history...
```

### Common Issues & Solutions

**Location Not Tracking:**
- Check device location settings
- Verify app permissions
- Restart app

**Search Not Working:**
- Verify Google Places API key
- Check internet connection
- Ensure API key has proper permissions

**Photos Not Saving:**
- Check camera/photo library permissions
- Verify device storage space
- Restart app if permissions were denied

**App Crashes:**
- Check console for error messages
- Verify all dependencies are installed
- Clear app cache and restart

## 📊 Performance Testing

### Memory Usage
- Monitor memory usage during extended use
- Check for memory leaks with multiple entries
- Verify app performance with many photos

### Battery Impact
- Monitor battery usage with background tracking
- Check if location updates are properly throttled
- Verify background task efficiency

### Storage Usage
- Monitor local storage usage
- Check photo storage efficiency
- Verify database size growth

## 🚀 Production Readiness

### Final Checklist
- [ ] All features work on both iOS and Android
- [ ] No console errors or warnings
- [ ] App handles edge cases gracefully
- [ ] Performance is acceptable
- [ ] Privacy and security measures are in place
- [ ] User experience is smooth and intuitive

### Recommended Testing Devices
- **iOS**: iPhone 12+ (latest iOS)
- **Android**: Pixel 6+ (latest Android)
- **Test both**: Physical devices and simulators

---

**Testing Complete!** 🎉

If all tests pass, your Chronix app is ready for use. The app should now:
- Track your location throughout the day
- Allow you to create rich timeline entries
- Let you edit and customize your location history
- Support photo integration
- Provide a smooth, intuitive user experience
