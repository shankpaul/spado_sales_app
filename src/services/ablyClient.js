import * as Ably from 'ably';
import apiClient from './apiClient';

/**
 * Ably Real-Time Client for Order Updates
 * Uses token authentication with JWT
 */

class AblyClientService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.connectionStateListeners = [];
  }

  /**
   * Initialize Ably client with token auth
   */
  async initialize(forceReconnect = false) {
    console.log('='.repeat(80));
    console.log('[Ably] 🚀 INITIALIZE CALLED');
    console.log('='.repeat(80));
    
    if (this.client && !forceReconnect) {
      console.log('[Ably] Client already initialized, skipping...');
      return;
    }

    // If forcing reconnect, close existing connection first
    if (this.client && forceReconnect) {
      console.log('[Ably] Force reconnect - closing existing connection...');
      this.client.close();
      this.client = null;
      this.subscriptions.clear();
    }

    try {
      console.log('[Ably] Creating Ably Realtime client...');
      
      this.client = new Ably.Realtime({
        authCallback: async (tokenParams, callback) => {
          try {
            console.log('[Ably] 🔑 authCallback triggered - requesting token from backend...');
            console.log('[Ably] Token params:', tokenParams);
            const response = await apiClient.post('/realtime/auth');
            console.log('[Ably] ✓ Auth token received from backend');
            console.log('[Ably] Token data:', response.data);
            const tokenRequest = response.data;
            callback(null, tokenRequest);
          } catch (error) {
            console.error('[Ably] ❌ Token auth failed:', error);
            console.error('[Ably] Error details:', error.response?.data || error.message);
            callback(error, null);
          }
        },
        // Auto-reconnect on disconnect
        disconnectedRetryTimeout: 3000,
        suspendedRetryTimeout: 10000,
        // Log level for debugging
        log: { level: 4 }, // 0-4, 4 is most verbose
      });

      // Setup connection state listeners
      this.client.connection.on('connecting', () => {
        console.log('[Ably] Connecting to Ably');
        this.isConnected = false;
        this.notifyConnectionStateChange('connecting');
      });

      this.client.connection.on('connected', () => {
        console.log('[Ably] Connected to Ably');
        this.isConnected = true;
        this.notifyConnectionStateChange('connected');
      });

      this.client.connection.on('disconnected', () => {
        console.log('[Ably] Disconnected from Ably');
        this.isConnected = false;
        this.notifyConnectionStateChange('disconnected');
      });

      this.client.connection.on('suspended', () => {
        console.log('[Ably] Connection suspended');
        this.isConnected = false;
        this.notifyConnectionStateChange('suspended');
      });

      this.client.connection.on('failed', (error) => {
        console.error('[Ably] Connection failed:', error);
        console.error('[Ably] Error code:', error.code, 'Message:', error.message);
        this.isConnected = false;
        this.notifyConnectionStateChange('failed');
      });

      this.client.connection.on('update', (stateChange) => {
        console.log('[Ably] Connection update:', stateChange);
        if (stateChange.reason) {
          console.error('[Ably] Update reason:', stateChange.reason);
        }
      });

      // Emit initial state
      const initialState = this.client.connection.state;
      console.log('[Ably] Initial connection state:', initialState);
      this.notifyConnectionStateChange(initialState);

      console.log('[Ably] Client initialized, waiting for connection...');
    } catch (error) {
      console.error('[Ably] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Subscribe to all orders channel
   */
  subscribeToOrders(callback) {
    if (!this.client) {
      console.error('[Ably] Client not initialized');
      return null;
    }

    const channelName = 'orders';
    
    if (this.subscriptions.has(channelName)) {
      console.log(`[Ably] Already subscribed to ${channelName}`);
      return this.subscriptions.get(channelName);
    }

    const channel = this.client.channels.get(channelName);
    
    // Subscribe to all order events
    const eventHandler = (message) => {
      console.log(`[Ably] Event received on ${channelName}:`, message.name, message.data);
      callback(message.name, message.data);
    };

    channel.subscribe(eventHandler);
    
    this.subscriptions.set(channelName, { channel, eventHandler });
    console.log(`[Ably] Subscribed to ${channelName}`);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to a specific order channel
   */
  subscribeToOrder(orderId, callback) {
    if (!this.client) {
      console.error('[Ably] Client not initialized');
      return null;
    }

    const channelName = `orders:${orderId}`;
    
    if (this.subscriptions.has(channelName)) {
      console.log(`[Ably] Already subscribed to ${channelName}`);
      return this.subscriptions.get(channelName);
    }

    const channel = this.client.channels.get(channelName);
    
    const eventHandler = (message) => {
      console.log(`[Ably] Event received on ${channelName}:`, message.name, message.data);
      callback(message.name, message.data);
    };

    channel.subscribe(eventHandler);
    
    this.subscriptions.set(channelName, { channel, eventHandler });
    console.log(`[Ably] Subscribed to ${channelName}`);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to user channel (for user-specific notifications)
   */
  subscribeToAgent(agentId, callback) {
    if (!this.client) {
      console.error('[Ably] Client not initialized');
      return null;
    }

    const channelName = `user:${agentId}`;
    
    if (this.subscriptions.has(channelName)) {
      console.log(`[Ably] Already subscribed to ${channelName}`);
      return this.subscriptions.get(channelName);
    }

    const channel = this.client.channels.get(channelName);
    
    const eventHandler = (message) => {
      console.log(`[Ably] Event received on ${channelName}:`, message.name, message.data);
      callback(message.name, message.data);
    };

    channel.subscribe(eventHandler);
    
    this.subscriptions.set(channelName, { channel, eventHandler });
    console.log(`[Ably] Subscribed to ${channelName}`);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to all enquiries channel
   */
  subscribeToEnquiries(callback) {
    if (!this.client) {
      console.error('[Ably] Client not initialized');
      return null;
    }

    const channelName = 'enquiries';
    
    if (this.subscriptions.has(channelName)) {
      console.log(`[Ably] Already subscribed to ${channelName}`);
      return this.subscriptions.get(channelName);
    }

    const channel = this.client.channels.get(channelName);
    
    // Handle channel state changes (detect permission errors)
    channel.on('failed', (stateChange) => {
      if (stateChange.reason && stateChange.reason.code === 40160) {
        console.error('[Ably] ⚠️ Channel permission denied - token needs refresh');
        console.error('[Ably] Please log out and log back in to get updated permissions');
      }
    });
    
    // Subscribe to all enquiry events
    const eventHandler = (message) => {
      console.log(`[Ably] Event received on ${channelName}:`, message.name, message.data);
      callback(message.name, message.data);
    };

    channel.subscribe(eventHandler);
    
    this.subscriptions.set(channelName, { channel, eventHandler });
    console.log(`[Ably] Subscribed to ${channelName}`);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to a specific enquiry channel
   */
  subscribeToEnquiry(enquiryId, callback) {
    if (!this.client) {
      console.error('[Ably] Client not initialized');
      return null;
    }

    const channelName = `enquiries:${enquiryId}`;
    
    if (this.subscriptions.has(channelName)) {
      console.log(`[Ably] Already subscribed to ${channelName}`);
      return this.subscriptions.get(channelName);
    }

    const channel = this.client.channels.get(channelName);
    
    // Handle channel state changes (detect permission errors)
    channel.on('failed', (stateChange) => {
      if (stateChange.reason && stateChange.reason.code === 40160) {
        console.error('[Ably] ⚠️ Channel permission denied - token needs refresh');
        console.error('[Ably] Please log out and log back in to get updated permissions');
      }
    });
    
    const eventHandler = (message) => {
      console.log(`[Ably] Event received on ${channelName}:`, message.name, message.data);
      callback(message.name, message.data);
    };

    channel.subscribe(eventHandler);
    
    this.subscriptions.set(channelName, { channel, eventHandler });
    console.log(`[Ably] Subscribed to ${channelName}`);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName) {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      const { channel, eventHandler } = subscription;
      channel.unsubscribe(eventHandler);
      this.subscriptions.delete(channelName);
      console.log(`[Ably] Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    this.subscriptions.forEach((_, channelName) => {
      this.unsubscribe(channelName);
    });
  }

  /**
   * Add connection state listener
   */
  onConnectionStateChange(listener) {
    this.connectionStateListeners.push(listener);
    
    // Return cleanup function
    return () => {
      const index = this.connectionStateListeners.indexOf(listener);
      if (index > -1) {
        this.connectionStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all connection state listeners
   */
  notifyConnectionStateChange(state) {
    this.connectionStateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[Ably] Error in connection state listener:', error);
      }
    });
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return this.client?.connection.state || 'initialized';
  }

  /**
   * Force reconnect with new token
   */
  async reconnect() {
    console.log('[Ably] 🔄 Forcing reconnect to get new token...');
    await this.initialize(true);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.client) {
      this.unsubscribeAll();
      this.client.close();
      this.client = null;
      this.isConnected = false;
      console.log('[Ably] Client disconnected');
    }
  }
}

// Export singleton instance
const ablyClient = new AblyClientService();
export default ablyClient;
