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
    
    if (this.client && !forceReconnect) {
      return;
    }

    // If forcing reconnect, close existing connection first
    if (this.client && forceReconnect) {
      this.client.close();
      this.client = null;
      this.subscriptions.clear();
    }

    try {
      
      this.client = new Ably.Realtime({
        authCallback: async (tokenParams, callback) => {
          try {
            const response = await apiClient.post('/realtime/auth');
            const tokenRequest = response.data;
            callback(null, tokenRequest);
          } catch (error) {
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
        this.isConnected = false;
        this.notifyConnectionStateChange('connecting');
      });

      this.client.connection.on('connected', () => {
        this.isConnected = true;
        this.notifyConnectionStateChange('connected');
      });

      this.client.connection.on('disconnected', () => {
        this.isConnected = false;
        this.notifyConnectionStateChange('disconnected');
      });

      this.client.connection.on('suspended', () => {
        this.isConnected = false;
        this.notifyConnectionStateChange('suspended');
      });

      this.client.connection.on('failed', (error) => {
        this.isConnected = false;
        this.notifyConnectionStateChange('failed');
      });

      this.client.connection.on('update', (stateChange) => {
      });

      // Emit initial state
      const initialState = this.client.connection.state;
      this.notifyConnectionStateChange(initialState);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to all orders channel
   */
  subscribeToOrders(callback) {
    if (!this.client) {
      return null;
    }

    const channelName = 'orders';
    
    if (this.subscriptions.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = this.client.channels.get(channelName);
    
    // Subscribe to all order events
    const eventHandler = (message) => {
      callback(message.name, message.data);
    };

    channel.subscribe(eventHandler);
    
    this.subscriptions.set(channelName, { channel, eventHandler });

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to a specific order channel
   */
  subscribeToOrder(orderId, callback) {
    if (!this.client) {
      return null;
    }

    const channelName = `orders:${orderId}`;
    
    if (this.subscriptions.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = this.client.channels.get(channelName);
    
    const eventHandler = (message) => {
      callback(message.name, message.data);
    };

    channel.subscribe(eventHandler);
    
    this.subscriptions.set(channelName, { channel, eventHandler });

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to user channel (for user-specific notifications)
   */
  subscribeToAgent(agentId, callback) {
    if (!this.client) {
      return null;
    }

    const channelName = `user:${agentId}`;
    
    if (this.subscriptions.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = this.client.channels.get(channelName);
    
    const eventHandler = (message) => {
      callback(message.name, message.data);
    };

    channel.subscribe(eventHandler);
    
    this.subscriptions.set(channelName, { channel, eventHandler });

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to all enquiries channel
   */
  subscribeToEnquiries(callback) {
    if (!this.client) {
      return null;
    }

    const channelName = 'enquiries';
    
    if (this.subscriptions.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = this.client.channels.get(channelName);
    
    // Handle channel state changes (detect permission errors)
    channel.on('failed', (stateChange) => {
    });
    
    // Subscribe to all enquiry events
    const eventHandler = (message) => {
      callback(message.name, message.data);
    };

    channel.subscribe(eventHandler);
    
    this.subscriptions.set(channelName, { channel, eventHandler });

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to a specific enquiry channel
   */
  subscribeToEnquiry(enquiryId, callback) {
    if (!this.client) {
      return null;
    }

    const channelName = `enquiries:${enquiryId}`;
    
    if (this.subscriptions.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = this.client.channels.get(channelName);
    
    // Handle channel state changes (detect permission errors)
    channel.on('failed', (stateChange) => {
    });
    
    const eventHandler = (message) => {
      callback(message.name, message.data);
    };

    channel.subscribe(eventHandler);
    
    this.subscriptions.set(channelName, { channel, eventHandler });

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
    }
  }
}

// Export singleton instance
const ablyClient = new AblyClientService();
export default ablyClient;
