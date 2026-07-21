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
      .then(response => {
        const allAgents = response.users || response || [];
        const activeAgents = allAgents.filter(agent => !agent.locked);
        set({ agents: activeAgents });
      })
      .catch(error => { });
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
      set({ error: error.message, isLoading: false });
    }
  },

  /**
   * Update a single order in all relevant arrays
   * This is called after any order update to keep data in sync
   */
  updateOrder: (updatedOrder) => {
    const state = get();

    // Find the existing order in memory to preserve/merge fields
    const existingOrder = state.orders.find(o => o.id === updatedOrder.id) ||
      state.upcomingOrders.find(o => o.id === updatedOrder.id) ||
      state.completedOrders.find(o => o.id === updatedOrder.id);

    // Normalize updatedOrder to make sure it includes fields for list views (like assigned_agent_name)
    const normalizedOrder = {
      ...existingOrder,
      ...updatedOrder,
      assigned_agent_name: updatedOrder.assigned_agent_name || updatedOrder.assigned_to?.name || (existingOrder ? existingOrder.assigned_agent_name : null),
      total_amount: updatedOrder.total_amount !== undefined ? String(updatedOrder.total_amount) : (existingOrder ? existingOrder.total_amount : undefined),
    };

    // Update in main orders array
    set({
      orders: state.orders.map(order =>
        order.id === normalizedOrder.id ? normalizedOrder : order
      ),
    });

    // Update in upcoming/completed orders if they exist
    const isUpcoming = normalizedOrder.status === 'confirmed' || normalizedOrder.status === 'in_progress';
    const isCompleted = normalizedOrder.status === 'completed';

    // Update upcoming orders
    let newUpcoming = state.upcomingOrders.map(order =>
      order.id === normalizedOrder.id ? normalizedOrder : order
    );

    // Update completed orders
    let newCompleted = state.completedOrders.map(order =>
      order.id === normalizedOrder.id ? normalizedOrder : order
    );

    // Handle status changes - move between lists
    if (isCompleted && !state.completedOrders.find(o => o.id === normalizedOrder.id)) {
      // Order became completed, add to completed and remove from upcoming
      newCompleted = [...newCompleted, normalizedOrder];
      newUpcoming = newUpcoming.filter(o => o.id !== normalizedOrder.id);
    } else if (isUpcoming && !state.upcomingOrders.find(o => o.id === normalizedOrder.id)) {
      // Order became upcoming, add to upcoming and remove from completed
      newUpcoming = [...newUpcoming, normalizedOrder].sort((a, b) => {
        const timeA = new Date(a.booking_time_from).getTime();
        const timeB = new Date(b.booking_time_from).getTime();
        return timeA - timeB;
      });
      newCompleted = newCompleted.filter(o => o.id !== normalizedOrder.id);
    } else if (!isUpcoming && !isCompleted) {
      // Order was cancelled or draft - remove from both lists
      newUpcoming = newUpcoming.filter(o => o.id !== normalizedOrder.id);
      newCompleted = newCompleted.filter(o => o.id !== normalizedOrder.id);
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
    // Avoid double initialization
    if (get().realtimeConnected || get().realtimeStatus === 'connecting') {
      return;
    }
    set({ realtimeStatus: 'connecting' });

    try {
      await ablyClient.initialize();

      // Subscribe to connection state changes
      ablyClient.onConnectionStateChange((state) => {
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

        set({
          realtimeConnected: state === 'connected',
          realtimeStatus: mappedStatus
        });
      });

      // Subscribe to all orders channel
      ablyClient.subscribeToOrders((eventName, data) => {
        get().handleRealtimeEvent(eventName, data);
      });

    } catch (error) {
      set({ realtimeStatus: 'failed' });
    }
  },

  /**
   * Handle real-time events from Ably
   */
  handleRealtimeEvent: async (eventName, eventData) => {
    if (!eventData) return;

    // Normalize event payload: Ably events can send { order_id, data: { ... } } or { order_id, ... } directly
    const order_id = eventData.order_id || eventData.id || eventData.data?.id || eventData.data?.order_id;
    const payload = eventData.data || eventData;

    if (!order_id) return;

    // Deduplicate rapid repeated socket events (within 3 seconds window)
    const eventKey = `${eventName}:${order_id}:${payload.new_status || payload.status || payload.cancel_reason || ''}`;
    const now = Date.now();
    const recentEvents = get()._recentEvents || {};
    if (recentEvents[eventKey] && (now - recentEvents[eventKey] < 3000)) {
      return;
    }
    set({
      _recentEvents: {
        ...recentEvents,
        [eventKey]: now,
      }
    });

    // Get current user to filter out self-triggered events
    const currentUser = useAuthStore.getState().user;
    const currentUserId = currentUser?.id;

    // Skip if this event was triggered by the current user
    if (payload?.changed_by_id && currentUserId && Number(payload.changed_by_id) === Number(currentUserId)) {
      return;
    }

    switch (eventName) {
      case 'order.created':
        try {
          const res = await orderService.getOrderById(order_id);
          const order = res?.order || res;
          if (order && order.id) {
            get().addOrder(order);
            const orderNum = order.order_number || payload.order_number || order_id;
            toast.success(`New order created: #${orderNum}`);
          }
        } catch (error) {
        }
        break;

      case 'order.updated':
      case 'order.status_changed':
      case 'order.assigned':
      case 'order.reassigned':
      case 'order.feedback_added':
      case 'order.assignee_response_updated':
        try {
          const res = await orderService.getOrderById(order_id);
          const order = res?.order || res;
          if (order && order.id) {
            get().updateOrder(order);
            const orderNum = order.order_number || payload.order_number || order_id;

            if (eventName === 'order.status_changed') {
              const statusLabel = payload.new_status || order.status;
              toast.info(`Order #${orderNum} status: ${statusLabel}`);
            } else if (eventName === 'order.assigned' || eventName === 'order.reassigned') {
              toast.info(`Order #${orderNum} ${eventName === 'order.assigned' ? 'assigned' : 'reassigned'}`);
            } else if (eventName === 'order.assignee_response_updated' && payload.assignee_response !== 'accepted') {
              toast.info(`Order #${orderNum} response: ${payload.assignee_response}`);
            }
          }
        } catch (error) {
        }
        break;

      case 'order.cancelled':
        try {
          const res = await orderService.getOrderById(order_id);
          const order = res?.order || res;
          const orderNum = order?.order_number || payload.order_number || order_id;
          if (order && order.id) {
            get().updateOrder(order);
          }
          const reason = payload.cancel_reason || order?.cancel_reason || '';
          toast.warning(`Order #${orderNum} cancelled${reason ? `: ${reason}` : ''}`);
        } catch (error) {
          const orderNum = payload.order_number || order_id;
          const reason = payload.cancel_reason || '';
          toast.warning(`Order #${orderNum} cancelled${reason ? `: ${reason}` : ''}`);
        }
        break;

      case 'order.journey_tracked':
        try {
          const res = await orderService.getOrderById(order_id);
          const order = res?.order || res;
          if (order && order.id) {
            get().updateOrder(order);
          }
        } catch (error) {
        }
        break;

      default:
        break;
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
