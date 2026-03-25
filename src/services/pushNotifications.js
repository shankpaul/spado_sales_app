/**
 * Push Notifications Service
 * Handles web push notification registration and management
 */

class PushNotificationService {
  constructor() {
    this.registration = null;
    this.permission = 'default';
  }

  /**
   * Check if push notifications are supported
   */
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Get current notification permission status
   */
  getPermission() {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!this.isSupported()) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      return 'denied';
    }
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker() {
    if (!this.isSupported()) {
      return null;
    }

    try {
      // Register the service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      return this.registration;
    } catch (error) {
      return null;
    }
  }

  /**
   * Initialize push notifications
   * Call this after user login
   */
  async initialize() {

    // Check support
    if (!this.isSupported()) {
      return false;
    }

    // Register service worker
    const registration = await this.registerServiceWorker();
    if (!registration) {
      return false;
    }

    // Check current permission
    const currentPermission = this.getPermission();

    if (currentPermission === 'granted') {
      return true;
    }

    if (currentPermission === 'denied') {
      return false;
    }

    // Permission is 'default', don't auto-request
    // Let user explicitly enable via UI
    return false;
  }

  /**
   * Enable push notifications (request permission and subscribe)
   */
  async enable() {

    // Request permission
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      return false;
    }

    return true;
  }

  /**
   * Disable push notifications
   */
  async disable() {
    
    // Note: We can't revoke browser permission programmatically
    // User must do it manually in browser settings
    // We can only stop showing the UI prompt
    
    return true;
  }

  /**
   * Show a test notification
   */
  async showTestNotification() {
    if (!this.registration) {
      return false;
    }

    try {
      await this.registration.showNotification('Test Notification', {
        body: 'Push notifications are working!',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'test',
        requireInteraction: false,
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get notification status for display
   */
  getStatus() {
    const permission = this.getPermission();
    const supported = this.isSupported();

    return {
      supported,
      permission,
      enabled: permission === 'granted',
      blocked: permission === 'denied',
      canEnable: supported && permission === 'default',
    };
  }
}

// Export singleton instance
const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
