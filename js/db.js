// db.js - IndexedDB Management Module
const DB_NAME = 'GymLogDB';
const DB_VERSION = 2;

class GymLogDB {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize database connection
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Database failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('Upgrading database...');

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { 
            keyPath: 'id' 
          });
          sessionsStore.createIndex('date', 'date', { unique: false });
          sessionsStore.createIndex('sessionName', 'sessionName', { unique: false });
        }

        // Exercises store
        if (!db.objectStoreNames.contains('exercises')) {
          const exercisesStore = db.createObjectStore('exercises', { 
            keyPath: 'id' 
          });
          exercisesStore.createIndex('sessionId', 'sessionId', { unique: false });
          exercisesStore.createIndex('exerciseName', 'exerciseName', { unique: false });
          exercisesStore.createIndex('category', 'category', { unique: false });
          exercisesStore.createIndex('date', 'date', { unique: false });
        }

        // Locations store
        if (!db.objectStoreNames.contains('locations')) {
          const locationsStore = db.createObjectStore('locations', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          locationsStore.createIndex('locationName', 'locationName', { unique: false });
        }

        // User profile store
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'id' });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Weight history store
        if (!db.objectStoreNames.contains('weightHistory')) {
          const weightStore = db.createObjectStore('weightHistory', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          weightStore.createIndex('date', 'date', { unique: false });
        }
      };
    });
  }

  /**
   * Generic method to add data to a store
   */
  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to get data by ID
   */
  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to get all data from a store
   */
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get data by index
   */
  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to update data
   */
  async update(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to delete data by ID
   */
  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete all data from a store
   */
  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Export all data as JSON
   */
  async exportData() {
    const data = {
      sessions: await this.getAll('sessions'),
      exercises: await this.getAll('exercises'),
      locations: await this.getAll('locations'),
      userProfile: await this.getAll('userProfile'),
      weightHistory: await this.getAll('weightHistory'),
      settings: await this.getAll('settings'),
      exportDate: new Date().toISOString()
    };
    return data;
  }

  /**
   * Import data from JSON
   */
  async importData(data) {
    try {
      // Clear existing data
      await this.clear('sessions');
      await this.clear('exercises');
      await this.clear('locations');
      await this.clear('userProfile');
      await this.clear('weightHistory');
      await this.clear('settings');

      // Import new data
      if (data.sessions) {
        for (const session of data.sessions) {
          await this.add('sessions', session);
        }
      }
      if (data.exercises) {
        for (const exercise of data.exercises) {
          await this.add('exercises', exercise);
        }
      }
      if (data.locations) {
        for (const location of data.locations) {
          await this.add('locations', location);
        }
      }
      if (data.userProfile) {
        for (const profile of data.userProfile) {
          await this.add('userProfile', profile);
        }
      }
      if (data.weightHistory) {
        for (const weight of data.weightHistory) {
          await this.add('weightHistory', weight);
        }
      }
      if (data.settings) {
        for (const setting of data.settings) {
          await this.add('settings', setting);
        }
      }

      return { success: true, message: 'Data imported successfully' };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Count records in a store
   */
  async count(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get records with date range filter
   */
  async getByDateRange(storeName, startDate, endDate) {
    const all = await this.getAll(storeName);
    return all.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
    });
  }
}

// Create global instance
const db = new GymLogDB();

// Make db globally available immediately
window.db = db;

// Initialize immediately (don't wait for DOMContentLoaded)
db.init().then(() => {
  console.log('✅ GymLog DB initialized successfully');
  console.log('Database object:', db.db);
}).catch(error => {
  console.error('❌ Failed to initialize database:', error);
  console.error('Error details:', error.message, error.stack);
});
