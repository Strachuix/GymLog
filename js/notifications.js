// notifications.js - Notifications Management Module
class NotificationManager {
  constructor() {
    this.permission = 'default';
    this.isSupported = 'Notification' in window;
  }

  /**
   * Initialize notifications
   */
  async init() {
    if (!this.isSupported) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    this.permission = Notification.permission;
    console.log('Notification permission:', this.permission);
    
    return this.permission === 'granted';
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!this.isSupported) {
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        this.showNotification('GymLog', {
          body: 'Powiadomienia zostały włączone!',
          icon: './icons/icon-192x192.png',
          badge: './icons/icon-72x72.png'
        });
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Show a notification
   */
  showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Cannot show notification - permission not granted');
      return null;
    }

    const defaultOptions = {
      icon: './icons/icon-192x192.png',
      badge: './icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (options.url) {
          window.location.href = options.url;
        }
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Schedule a workout reminder
   */
  async scheduleReminder(message, delayMinutes = 60) {
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    const delay = delayMinutes * 60 * 1000;
    setTimeout(() => {
      this.showNotification('GymLog Przypomnienie', {
        body: message || 'Czas na trening!',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png',
        tag: 'workout-reminder',
        requireInteraction: true,
        actions: [
          { action: 'start', title: 'Rozpocznij trening' },
          { action: 'dismiss', title: 'Przypomnij później' }
        ]
      });
    }, delay);

    console.log(`Reminder scheduled for ${delayMinutes} minutes`);
    return true;
  }

  /**
   * Notify about new personal record
   */
  notifyPersonalRecord(exerciseName, recordType, value) {
    this.showNotification('🏆 Nowy Rekord!', {
      body: `Gratulacje! Osiągnąłeś nowy rekord w ${exerciseName}: ${value} ${recordType}`,
      icon: './icons/icon-192x192.png',
      badge: './icons/icon-72x72.png',
      tag: 'personal-record',
      requireInteraction: true,
      url: './stats.html'
    });
  }

  /**
   * Notify about completed session
   */
  notifySessionComplete(sessionName, exerciseCount) {
    this.showNotification('✅ Sesja Zakończona!', {
      body: `Ukończono sesję "${sessionName}" z ${exerciseCount} ćwiczeniami`,
      icon: './icons/icon-192x192.png',
      badge: './icons/icon-72x72.png',
      tag: 'session-complete'
    });
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.isSupported && this.permission === 'granted';
  }

  /**
   * Get permission status
   */
  getPermission() {
    return this.permission;
  }
}

// Create global instance
const notificationManager = new NotificationManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await notificationManager.init();
});

// Service Worker notification handler
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'NOTIFICATION') {
      notificationManager.showNotification(event.data.title, event.data.options);
    }
  });
}
