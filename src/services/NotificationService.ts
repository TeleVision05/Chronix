import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationSettings {
  enabled: boolean;
  time: string; // Format: "HH:MM"
  message: string;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
      return;
    }

    this.isInitialized = true;
  }

  async scheduleDailyReminder(settings: NotificationSettings): Promise<string | null> {
    if (!settings.enabled) {
      await this.cancelDailyReminder();
      return null;
    }

    await this.initialize();

    // Cancel existing reminder
    await this.cancelDailyReminder();

    // Parse time
    const [hour, minute] = settings.time.split(':').map(Number);
    
    // Create trigger for daily at specified time
    const trigger: Notifications.DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };

    // Schedule notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Chronix Reminder',
        body: settings.message || 'Time to capture your day! 📸',
        data: { type: 'daily_reminder' },
      },
      trigger,
    });

    // Save settings
    await this.saveNotificationSettings(settings);

    return identifier;
  }

  async cancelDailyReminder(): Promise<void> {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === 'daily_reminder') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        return JSON.parse(settings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }

    // Default settings
    return {
      enabled: false,
      time: '20:00', // 8 PM
      message: 'Time to capture your day! 📸',
    };
  }

  private async saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  async sendImmediateNotification(title: string, body: string, data?: any): Promise<string> {
    await this.initialize();

    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Send immediately
    });
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Add notification listener for handling when app is in foreground
  addNotificationListener(callback: (notification: Notifications.Notification) => void): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Add notification response listener for handling when user taps notification
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = NotificationService.getInstance();
