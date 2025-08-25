import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export interface DailyEntry {
  id?: number;
  date: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  id?: number;
  dailyEntryId: number;
  locationName: string;
  timestamp?: string;
  latitude?: number;
  longitude?: number;
  icon?: string;
  order: number;
}

export interface ImageEntry {
  id?: number;
  dailyEntryId: number;
  uri: string;
  localUri?: string;
  order: number;
  createdAt: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<void> {
    try {
      console.log('Initializing database...');
      this.db = await SQLite.openDatabaseAsync('chronix.db');
      console.log('Database opened successfully');
      await this.createTables();
      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      console.error('Database not available for creating tables');
      throw new Error('Database not initialized');
    }

    try {
      console.log('Creating daily_entries table...');
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS daily_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);

      console.log('Creating timeline_entries table...');
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS timeline_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dailyEntryId INTEGER NOT NULL,
          locationName TEXT NOT NULL,
          timestamp TEXT,
          latitude REAL,
          longitude REAL,
          icon TEXT,
          order_num INTEGER NOT NULL,
          FOREIGN KEY (dailyEntryId) REFERENCES daily_entries (id) ON DELETE CASCADE
        );
      `);

      console.log('Creating image_entries table...');
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS image_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dailyEntryId INTEGER NOT NULL,
          uri TEXT NOT NULL,
          localUri TEXT,
          order_num INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (dailyEntryId) REFERENCES daily_entries (id) ON DELETE CASCADE
        );
      `);
      console.log('All tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  // Database health check
  private async ensureDatabase(): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized, attempting to reinitialize...');
      await this.initDatabase();
    }
  }

  // Daily Entries
  async createDailyEntry(entry: Omit<DailyEntry, 'id'>): Promise<number> {
    await this.ensureDatabase();
    
    try {
      const result = await this.db!.runAsync(
        'INSERT INTO daily_entries (date, title, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [entry.date, entry.title, entry.description || null, entry.createdAt, entry.updatedAt]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error creating daily entry:', error);
      throw error;
    }
  }

  async getDailyEntry(date: string): Promise<DailyEntry | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.getFirstAsync<DailyEntry>(
      'SELECT * FROM daily_entries WHERE date = ?',
      [date]
    );
    return result || null;
  }

  async getAllDailyEntries(): Promise<DailyEntry[]> {
    await this.ensureDatabase();
    
    try {
      console.log('Fetching all daily entries...');
      const result = await this.db!.getAllAsync<DailyEntry>(
        'SELECT * FROM daily_entries ORDER BY date DESC'
      );
      console.log(`Found ${result.length} daily entries`);
      return result;
    } catch (error) {
      console.error('Error fetching daily entries:', error);
      throw error;
    }
  }

  async updateDailyEntry(id: number, updates: Partial<DailyEntry>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await this.db.runAsync(
      `UPDATE daily_entries SET ${fields} WHERE id = ?`,
      [...values, id]
    );
  }

  async deleteDailyEntry(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync('DELETE FROM daily_entries WHERE id = ?', [id]);
  }

  // Timeline Entries
  async createTimelineEntry(entry: Omit<TimelineEntry, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.runAsync(
      'INSERT INTO timeline_entries (dailyEntryId, locationName, timestamp, latitude, longitude, icon, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [entry.dailyEntryId, entry.locationName, entry.timestamp || null, entry.latitude || null, entry.longitude || null, entry.icon || null, entry.order]
    );
    return result.lastInsertRowId;
  }

  async getTimelineEntries(dailyEntryId: number): Promise<TimelineEntry[]> {
    await this.ensureDatabase();
    
    try {
      const result = await this.db!.getAllAsync<TimelineEntry>(
        'SELECT * FROM timeline_entries WHERE dailyEntryId = ? ORDER BY order_num ASC',
        [dailyEntryId]
      );
      return result;
    } catch (error) {
      console.error('Error fetching timeline entries:', error);
      throw error;
    }
  }

  async updateTimelineEntry(id: number, updates: Partial<TimelineEntry>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await this.db.runAsync(
      `UPDATE timeline_entries SET ${fields} WHERE id = ?`,
      [...values, id]
    );
  }

  async deleteTimelineEntry(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync('DELETE FROM timeline_entries WHERE id = ?', [id]);
  }

  // Image Entries
  async createImageEntry(entry: Omit<ImageEntry, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.runAsync(
      'INSERT INTO image_entries (dailyEntryId, uri, localUri, order_num, createdAt) VALUES (?, ?, ?, ?, ?)',
      [entry.dailyEntryId, entry.uri, entry.localUri || null, entry.order, entry.createdAt]
    );
    return result.lastInsertRowId;
  }

  async getImageEntries(dailyEntryId: number): Promise<ImageEntry[]> {
    await this.ensureDatabase();
    
    try {
      const result = await this.db!.getAllAsync<ImageEntry>(
        'SELECT * FROM image_entries WHERE dailyEntryId = ? ORDER BY order_num ASC',
        [dailyEntryId]
      );
      return result;
    } catch (error) {
      console.error('Error fetching image entries:', error);
      throw error;
    }
  }

  async updateImageEntry(id: number, updates: Partial<ImageEntry>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await this.db.runAsync(
      `UPDATE image_entries SET ${fields} WHERE id = ?`,
      [...values, id]
    );
  }

  async deleteImageEntry(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync('DELETE FROM image_entries WHERE id = ?', [id]);
  }

  // Utility methods
  async saveImageLocally(uri: string, dailyEntryId: number, order: number): Promise<string> {
    const fileName = `chronix_${dailyEntryId}_${order}_${Date.now()}.jpg`;
    const localUri = `${FileSystem.documentDirectory}images/${fileName}`;
    
    // Ensure images directory exists
    const imagesDir = `${FileSystem.documentDirectory}images/`;
    const dirInfo = await FileSystem.getInfoAsync(imagesDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
    }
    
    await FileSystem.copyAsync({
      from: uri,
      to: localUri
    });
    
    return localUri;
  }

  async deleteLocalImage(localUri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(localUri);
    } catch (error) {
      console.error('Error deleting local image:', error);
    }
  }

  // Reset database (for debugging)
  async resetDatabase(): Promise<void> {
    try {
      console.log('Resetting database...');
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
      }
      
      // Delete the database file
      const dbPath = `${FileSystem.documentDirectory}SQLite/chronix.db`;
      const dbInfo = await FileSystem.getInfoAsync(dbPath);
      if (dbInfo.exists) {
        await FileSystem.deleteAsync(dbPath);
        console.log('Database file deleted');
      }
      
      // Reinitialize
      await this.initDatabase();
      console.log('Database reset complete');
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }
}

export const databaseService = new DatabaseService();
