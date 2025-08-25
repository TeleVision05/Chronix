# Chronix - Daily Life Timeline App

Chronix is a comprehensive daily life tracking app that automatically records your location throughout the day and allows you to create rich timeline entries with photos and place information.

## 🌟 Features

### 📍 **Automatic Location Tracking**
- **Background tracking** - Works even when app is closed
- **Battery optimized** - Updates every 5 minutes or when you move 500 meters
- **Privacy focused** - All data stored locally on your device
- **Smart clustering** - Groups nearby locations to create meaningful timeline entries

### 📝 **Daily Timeline Creation**
- **Location history integration** - Automatically loads your day's location data
- **Place search & editing** - Search for real places with Google Places API
- **Timeline customization** - Reorder, edit, or delete location entries
- **Rich place information** - Proper coordinates for map display

### 📸 **Photo Integration**
- **Camera integration** - Take photos directly in the app
- **Gallery selection** - Choose from your photo library
- **Image gallery** - View photos in a beautiful grid layout
- **Full-screen viewing** - Tap to view photos in detail

### 🎨 **Beautiful UI/UX**
- **Modern design** - Clean, intuitive interface
- **Smooth animations** - Expandable timeline cards
- **Responsive layout** - Works on all screen sizes
- **Dark mode ready** - Consistent theming

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator (or physical device)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Chronix
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Google Places API** (see [SETUP.md](./SETUP.md))
   - Get a Google Places API key
   - Update `src/services/LocationService.ts` with your API key

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   ```

## 📱 How It Works

### 1. **First Launch**
- App requests location permissions
- Background tracking starts automatically
- Location data is stored locally with date-based organization

### 2. **Daily Usage**
- App tracks your location in the background
- No user interaction required during the day
- Data is clustered to avoid duplicate entries

### 3. **Creating Entries**
- Tap "+" to create a new daily entry
- App automatically loads today's location history
- Tap "Edit Timeline" to customize locations
- Search for real places to improve accuracy
- Add photos from camera or gallery

### 4. **Viewing Your Timeline**
- Expand timeline cards to see full details
- View location history with timestamps
- Browse photos in gallery view
- Edit entries anytime

## 🔧 Technical Architecture

### **Services**
- **LocationService** - Handles location tracking and place search
- **DatabaseService** - SQLite database for local storage
- **NotificationService** - Handles app notifications

### **Components**
- **FeedScreen** - Main timeline view
- **AddEntryModal** - Entry creation with location history
- **LocationHistoryModal** - Timeline editing with place search
- **PhotoPickerScreen** - Camera and gallery integration
- **DailyEntryCard** - Expandable timeline cards
- **ImageGallery** - Photo viewing and management

### **Data Flow**
1. **Background tracking** → Location data stored in AsyncStorage
2. **Entry creation** → Location history loaded and clustered
3. **Timeline editing** → Place search and customization
4. **Photo addition** → Images saved locally and linked to entries
5. **Data persistence** → All data stored in SQLite database

## 🛡️ Privacy & Security

- **Local storage only** - No data sent to external servers
- **Location permissions** - Only used for timeline creation
- **Photo privacy** - Images stored locally on device
- **API usage** - Google Places API only for place search

## 🔍 Troubleshooting

### Location Not Working
- Check location permissions in device settings
- Ensure location services are enabled
- Restart the app if needed

### Place Search Issues
- Verify Google Places API key is set correctly
- Check internet connection
- Ensure API key has proper permissions

### Photo Issues
- Grant camera and photo library permissions
- Check device storage space
- Restart app if permissions were denied

### Background Tracking
- **iOS**: Settings > Privacy > Location Services > Chronix > Always
- **Android**: Settings > Apps > Chronix > Permissions > Location > Allow all the time
- Disable battery optimization for the app

## 📋 Development

### Project Structure
```
src/
├── components/          # Reusable UI components
├── screens/            # Main app screens
├── services/           # Business logic and APIs
├── navigation/         # Navigation configuration
└── utils/             # Helper functions
```

### Key Dependencies
- **expo-location** - Location tracking
- **expo-sqlite** - Local database
- **expo-image-picker** - Camera and gallery
- **expo-task-manager** - Background tasks
- **@react-navigation** - Navigation

### Building for Production
```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the SETUP.md file
3. Open an issue on GitHub

---

**Chronix** - Capture your daily journey, one location at a time. 📍✨
