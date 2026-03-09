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
      console.warn('[Push] Push notifications not supported in this browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      console.log('[Push] Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('[Push] Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker() {
    if (!this.isSupported()) {
      console.warn('[Push] Service workers not supported');
      return null;
    }

    try {
      // Register the service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[Push] Service worker registered:', this.registration);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready');

      return this.registration;
    } catch (error) {
      console.error('[Push] Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Initialize push notifications
   * Call this after user login
   */
  async initialize() {
    console.log('[Push] Initializing push notifications...');

    // Check support
    if (!this.isSupported()) {
      console.warn('[Push] Push notifications not supported');
      return false;
    }

    // Register service worker
    const registration = await this.registerServiceWorker();
    if (!registration) {
      console.error('[Push] Failed to register service worker');
      return false;
    }

    // Check current permission
    const currentPermission = this.getPermission();
    console.log('[Push] Current permission:', currentPermission);

    if (currentPermission === 'granted') {
      console.log('[Push] ✓ Push notifications already enabled');
      return true;
    }

    if (currentPermission === 'denied') {
      console.warn('[Push] Push notifications denied by user');
      return false;
    }

    // Permission is 'default', don't auto-request
    // Let user explicitly enable via UI
    console.log('[Push] Push notifications available, waiting for user action');
    return false;
  }

  /**
   * Enable push notifications (request permission and subscribe)
   */
  async enable() {
    console.log('[Push] Enabling push notifications...');

    // Request permission
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('[Push] Permission not granted:', permission);
      return false;
    }

    console.log('[Push] ✓ Push notifications enabled');
    return true;
  }

  /**
   * Disable push notifications
   */
  async disable() {
    console.log('[Push] Disabling push notifications...');
    
    // Note: We can't revoke browser permission programmatically
    // User must do it manually in browser settings
    // We can only stop showing the UI prompt
    
    console.log('[Push] Push notifications disabled (user must revoke permission in browser settings)');
    return true;
  }

  /**
   * Show a test notification
   */
  async showTestNotification() {
    if (!this.registration) {
      console.error('[Push] Service worker not registered');
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
      
      console.log('[Push] ✓ Test notification shown');
      return true;
    } catch (error) {
      console.error('[Push] Error showing test notification:', error);
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
