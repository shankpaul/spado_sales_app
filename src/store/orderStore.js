import { create } from 'zustand';
import orderService from '../services/orderService';
import { format } from 'date-fns';
import ablyClient from '../services/ablyClient';
import { toast } from 'sonner';
import useAuthStore from './authStore';

/**
 * Order Store using Zustand
 * Single source of truth for all order data across the application
 * Manages orders, filtering, and updates without redundant API calls
 * Includes real-time updates via Ably WebSocket
 */

const useOrderStore = create((set, get) => ({
  // State
  orders: [], // All orders in memory
  upcomingOrders: [], // Today's confirmed/in_progress orders
  completedOrders: [], // Today's completed orders
  agents: [], // All agents (cached)
  isLoading: false,
  error: null,
  
  // Real-time connection state
  realtimeConnected: false,
  realtimeStatus: 'disconnected', // 'disconnected', 'connected', 'connecting', 'failed'
  
  // Filters
  filters: {
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    assignedToId: '',
  },
  
  // Pagination for Orders page
  page: 1,
  hasMore: true,
  perPage: 20,
  totalPages: 1,
  totalCount: 0,

  // Actions
  
  /**
   * Set loading state
   */
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Set error state
   */
  setError: (error) => set({ error }),

  /**
   * Update filters
   */
  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

  /**
   * Reset filters
   */
  resetFilters: () => set({
    filters: {
      status: '',
      search: '',
      dateFrom: '',
      dateTo: '',
      assignedToId: '',
    },
  }),

  /**
   * Fetch agents (fire-and-forget, cached in store)
   * Call this once on app load, then all components use cached data
   */
  fetchAgents: () => {
    orderService.getUsersByRole('agent')
      .then(response => set({ agents: response.users || [] }))
      .catch(error => console.error('Error fetching agents:', error));
  },

  /**
   * Fetch today's orders for Dashboard
   * Splits into upcoming and completed
   */
  fetchTodayOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await orderService.getAllOrders({
        booking_date: today,
        per_page: 100,
      });

      const allTodayOrders = response.orders || [];

      // Split into upcoming and completed
      const upcoming = allTodayOrders
        .filter(order => order.status === 'confirmed' || order.status === 'in_progress')
        .sort((a, b) => {
          const timeA = new Date(a.booking_time_from).getTime();
          const timeB = new Date(b.booking_time_from).getTime();
          return timeA - timeB;
        });

      const completed = allTodayOrders.filter(
        order => order.status === 'completed'
      );

      set({
        upcomingOrders: upcoming,
        completedOrders: completed,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching today orders:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  /**
   * Fetch orders with filters for Orders page
   * Supports pagination and infinite scroll
   */
  fetchOrders: async (reset = false) => {
    const state = get();
    
    if (reset) {
      set({ page: 1, orders: [], hasMore: true });
    }

    const currentPage = reset ? 1 : state.page;
    
    set({ isLoading: true, error: null });
    try {
      const params = {
        page: currentPage,
        per_page: state.perPage,
        ...state.filters,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await orderService.getAllOrders(params);
      const newOrders = response.orders || [];

      set({
        orders: reset ? newOrders : [...state.orders, ...newOrders],
        hasMore: newOrders.length === state.perPage,
        page: currentPage + 1,
        isLoading: false,
        totalPages: response.pagination?.total_pages || 1,
        totalCount: response.pagination?.total_count || 0,
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  /**
   * Fetch specific page for desktop pagination
   */
  fetchPage: async (pageNumber) => {
    const state = get();
    
    set({ isLoading: true, error: null });
    try {
      const params = {
        page: pageNumber,
        per_page: state.perPage,
        ...state.filters,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await orderService.getAllOrders(params);
      const newOrders = response.orders || [];

      set({
        orders: newOrders,
        page: pageNumber,
        hasMore: pageNumber < (response.pagination?.total_pages || 1),
        isLoading: false,
        totalPages: response.pagination?.total_pages || 1,
        totalCount: response.pagination?.total_count || 0,
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  /**
   * Update a single order in all relevant arrays
   * This is called after any order update to keep data in sync
   */
  updateOrder: (updatedOrder) => {
    const state = get();

    // Update in main orders array
    set({
      orders: state.orders.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      ),
    });

    // Update in upcoming/completed orders if they exist
    const isUpcoming = updatedOrder.status === 'confirmed' || updatedOrder.status === 'in_progress';
    const isCompleted = updatedOrder.status === 'completed';

    // Update upcoming orders
    let newUpcoming = state.upcomingOrders.map(order =>
      order.id === updatedOrder.id ? updatedOrder : order
    );

    // Update completed orders
    let newCompleted = state.completedOrders.map(order =>
      order.id === updatedOrder.id ? updatedOrder : order
    );

    // Handle status changes - move between lists
    if (isCompleted && !state.completedOrders.find(o => o.id === updatedOrder.id)) {
      // Order became completed, add to completed and remove from upcoming
      newCompleted = [...newCompleted, updatedOrder];
      newUpcoming = newUpcoming.filter(o => o.id !== updatedOrder.id);
    } else if (isUpcoming && !state.upcomingOrders.find(o => o.id === updatedOrder.id)) {
      // Order became upcoming, add to upcoming and remove from completed
      newUpcoming = [...newUpcoming, updatedOrder].sort((a, b) => {
        const timeA = new Date(a.booking_time_from).getTime();
        const timeB = new Date(b.booking_time_from).getTime();
        return timeA - timeB;
      });
      newCompleted = newCompleted.filter(o => o.id !== updatedOrder.id);
    } else if (!isUpcoming && !isCompleted) {
      // Order was cancelled or draft - remove from both lists
      newUpcoming = newUpcoming.filter(o => o.id !== updatedOrder.id);
      newCompleted = newCompleted.filter(o => o.id !== updatedOrder.id);
    }

    // Filter and sort upcoming orders
    newUpcoming = newUpcoming
      .filter(order => order.status === 'confirmed' || order.status === 'in_progress')
      .sort((a, b) => {
        const timeA = new Date(a.booking_time_from).getTime();
        const timeB = new Date(b.booking_time_from).getTime();
        return timeA - timeB;
      });

    // Filter completed orders
    newCompleted = newCompleted.filter(order => order.status === 'completed');

    set({
      upcomingOrders: newUpcoming,
      completedOrders: newCompleted,
    });
  },

  /**
   * Add a new order to the store
   */
  addOrder: (newOrder) => {
    const state = get();
    set({
      orders: [newOrder, ...state.orders],
    });

    // Also update today's lists if applicable
    const today = format(new Date(), 'yyyy-MM-dd');
    if (newOrder.booking_date === today) {
      if (newOrder.status === 'confirmed' || newOrder.status === 'in_progress') {
        set({
          upcomingOrders: [...state.upcomingOrders, newOrder].sort((a, b) => {
            const timeA = new Date(a.booking_time_from).getTime();
            const timeB = new Date(b.booking_time_from).getTime();
            return timeA - timeB;
          }),
        });
      } else if (newOrder.status === 'completed') {
        set({
          completedOrders: [...state.completedOrders, newOrder],
        });
      }
    }
  },

  /**
   * Remove an order from the store
   */
  removeOrder: (orderId) => {
    const state = get();
    set({
      orders: state.orders.filter(order => order.id !== orderId),
      upcomingOrders: state.upcomingOrders.filter(order => order.id !== orderId),
      completedOrders: state.completedOrders.filter(order => order.id !== orderId),
    });
  },

  /**
   * Reset pagination
   */
  resetPagination: () => set({ page: 1, orders: [], hasMore: true }),

  /**
   * Clear all orders
   */
  clearOrders: () => set({
    orders: [],
    upcomingOrders: [],
    completedOrders: [],
    page: 1,
    hasMore: true,
  }),

  /**
   * Initialize real-time updates via Ably
   */
  initializeRealtime: async () => {
    console.log('='.repeat(80));
    console.log('[OrderStore] ⚡ INITIALIZING REALTIME UPDATES - START');
    console.log('='.repeat(80));
    
    try {
      console.log('[OrderStore] Calling ablyClient.initialize()...');
      
      await ablyClient.initialize();
      
      console.log('[OrderStore] ✓ ablyClient.initialize() completed');
      
      // Subscribe to connection state changes
      ablyClient.onConnectionStateChange((state) => {
        console.log('[OrderStore] Ably connection state changed to:', state);
        
        const stateMap = {
          initialized: 'connecting',
          connecting: 'connecting',
          connected: 'connected',
          disconnected: 'disconnected',
          suspended: 'connecting',
          failed: 'failed',
          closing: 'disconnected',
          closed: 'disconnected',
        };
        
        const mappedStatus = stateMap[state] || 'disconnected';
        console.log('[OrderStore] Mapped status:', mappedStatus);
        
        set({ 
          realtimeConnected: state === 'connected',
          realtimeStatus: mappedStatus
        });
      });

      console.log('[OrderStore] Subscribing to orders channel...');
      
      // Subscribe to all orders channel
      ablyClient.subscribeToOrders((eventName, data) => {
        get().handleRealtimeEvent(eventName, data);
      });

      console.log('[OrderStore] ✓ Ably subscriptions active');
      console.log('='.repeat(80));
    } catch (error) {
      console.error('='.repeat(80));
      console.error('[OrderStore] ❌ FAILED TO INITIALIZE ABLY');
      console.error('[OrderStore] Error:', error);
      console.error('[OrderStore] Error stack:', error.stack);
      console.error('='.repeat(80));
      set({ realtimeStatus: 'failed' });
    }
  },

  /**
   * Handle real-time events from Ably
   */
  handleRealtimeEvent: async (eventName, eventData) => {
    console.log('[OrderStore] Received event:', eventName, eventData);
    
    const { order_id, data } = eventData;
    
    // Get current user to filter out self-triggered events
    const currentUser = useAuthStore.getState().user;
    const currentUserId = currentUser?.id;
    
    // Skip if this event was triggered by the current user
    if (data?.changed_by_id && currentUserId && data.changed_by_id === currentUserId) {
      console.log('[OrderStore] Skipping self-triggered event:', eventName, 'by user', currentUserId);
      return;
    }

    switch (eventName) {
      case 'order.created':
        // Fetch the new order and add to store
        try {
          const order = await orderService.getOrder(order_id);
          get().addOrder(order);
          toast.success(`New order created: ${data.order_number || order_id}`);
        } catch (error) {
          console.error('[OrderStore] Error fetching new order:', error);
        }
        break;

      case 'order.updated':
      case 'order.status_changed':
      case 'order.assigned':
      case 'order.reassigned':
      case 'order.feedback_added':
      case 'order.assignee_response_updated':
        // Fetch updated order and update in store
        try {
          const order = await orderService.getOrder(order_id);
          get().updateOrder(order);
          
          // Show toast notification for status changes
          if (eventName === 'order.status_changed') {
            toast.info(`Order ${order.order_number} status: ${data.new_status}`);
          } else if (eventName === 'order.assigned' || eventName === 'order.reassigned') {
            toast.info(`Order ${order.order_number} ${eventName === 'order.assigned' ? 'assigned' : 'reassigned'}`);
          } else if (eventName === 'order.assignee_response_updated') {
            toast.info(`Order ${order.order_number} response: ${data.assignee_response}`);
          }
        } catch (error) {
          console.error('[OrderStore] Error fetching updated order:', error);
        }
        break;

      case 'order.cancelled':
        // Remove from upcoming/completed, update in orders list
        try {
          const order = await orderService.getOrder(order_id);
          get().updateOrder(order);
          toast.warning(`Order ${order.order_number} cancelled: ${data.cancel_reason || ''}`);
        } catch (error) {
          console.error('[OrderStore] Error fetching cancelled order:', error);
        }
        break;

      case 'order.journey_tracked':
        // Fetch updated order (journey info updated)
        try {
          const order = await orderService.getOrder(order_id);
          get().updateOrder(order);
        } catch (error) {
          console.error('[OrderStore] Error fetching order with journey:', error);
        }
        break;

      default:
        console.log('[OrderStore] Unhandled event:', eventName);
    }
  },

  /**
   * Disconnect real-time updates
   */
  disconnectRealtime: () => {
    ablyClient.disconnect();
    set({ 
      realtimeConnected: false,
      realtimeStatus: 'disconnected'
    });
  },
}));

export default useOrderStore;
