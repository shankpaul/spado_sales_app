# Ably Real-Time Frontend Setup Guide

## Overview

This document describes the Ably WebSocket integration in the React Sales Dashboard for real-time order updates.

## Architecture

### Components

1. **AblyClient Service** (`src/services/ablyClient.js`)
   - Singleton service managing Ably connection
   - Token-based authentication via `/api/v1/realtime/auth` endpoint
   - Auto-reconnect on disconnect/suspend
   - Channel subscription management

2. **Order Store** (`src/store/orderStore.js`)
   - Zustand state management for all orders
   - Real-time event handlers
   - State synchronization across components

3. **RealtimeStatus Component** (`src/components/RealtimeStatus.jsx`)
   - Visual connection status indicator
   - Shows: Connected, Disconnected, Connecting, Failed

4. **Page Integrations**
   - **Dashboard**: Initializes real-time connection globally
   - **Orders**: Displays all order updates
   - **OrderDetail**: Subscribes to specific order channel

## Installation

```bash
npm install ably
```

## How It Works

### 1. Connection Flow

```
User Login → Dashboard Mount → initializeRealtime()
→ AblyClient.initialize() → POST /api/v1/realtime/auth
→ Receive Ably Token → Connect to Ably
→ Subscribe to channels → Receive events
```

### 2. Channel Strategy

- **`orders`** - All order events (global)
- **`orders:{id}`** - Specific order events
- **`agent:{user_id}`** - Agent-specific notifications

### 3. Event Types

| Event | Description | Handler |
|-------|-------------|---------|
| `order.created` | New order created | Adds order to store, shows toast |
| `order.updated` | Order data changed | Fetches & updates order |
| `order.status_changed` | Status changed | Updates order, shows toast |
| `order.assigned` | Agent assigned | Updates order, shows toast |
| `order.reassigned` | Agent reassigned | Updates order, shows toast |
| `order.cancelled` | Order cancelled | Updates order, shows toast |
| `order.feedback_added` | Customer feedback | Fetches & updates order |
| `order.assignee_response_updated` | Agent response | Fetches & updates order |
| `order.journey_tracked` | Travel tracked | Fetches & updates order |

### 4. State Updates

Real-time events trigger state updates:

```javascript
// Event arrives
order.updated → handleRealtimeEvent()
→ Fetch fresh order data
→ updateOrder(order)
→ React components re-render
```

## Usage

### Initialization

The Dashboard component initializes the connection on mount:

```javascript
const { initializeRealtime } = useOrderStore();

useEffect(() => {
  initializeRealtime();
  // Connection stays alive across pages
}, [initializeRealtime]);
```

### Subscribing to Specific Orders

OrderDetail component subscribes to individual orders:

```javascript
useEffect(() => {
  ablyClient.subscribeToOrder(orderId, (eventName, data) => {
    // Reload order when any update occurs
    fetchOrderDetails();
  });

  return () => {
    ablyClient.unsubscribe(`orders:${orderId}`);
  };
}, [orderId]);
```

### Connection Status

Display connection state anywhere:

```javascript
import { RealtimeStatus } from '@/components/RealtimeStatus';

// In your component
<RealtimeStatus />
```

### Manual Subscription (Advanced)

```javascript
import ablyClient from '@/services/ablyClient';
import useOrderStore from '@/store/orderStore';

const { realtimeConnected, realtimeStatus } = useOrderStore();

// Subscribe to all orders
ablyClient.subscribeToOrders((eventName, data) => {
  console.log('Event:', eventName, data);
});

// Subscribe to specific order
ablyClient.subscribeToOrder(123, (eventName, data) => {
  console.log('Order 123 event:', eventName);
});

// Subscribe to agent channel
ablyClient.subscribeToAgent(456, (eventName, data) => {
  console.log('Agent 456 event:', eventName);
});

// Check connection state
if (realtimeConnected) {
  console.log('Connected to Ably');
}
```

## Testing

### 1. Start Backend Server

```bash
cd spado-go
ABLY_API_KEY=your_key go run cmd/auth-service/main.go
```

### 2. Start Frontend

```bash
cd spado-sales-dashboard
npm run dev
```

### 3. Test Real-Time Updates

**Option A: Use Two Browser Windows**

1. Open Dashboard in Browser A
2. Open Dashboard in Browser B
3. Create order in Browser A
4. See it appear in Browser B (real-time)

**Option B: Use API + Browser**

1. Open Dashboard in browser
2. Create order via Postman/curl:
   ```bash
   curl -X POST http://localhost:8080/api/v1/orders \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{...}'
   ```
3. See order appear in browser immediately

**Option C: Browser Console Testing**

```javascript
// In browser console
const orderStore = window.__ZUSTAND_STORES__?.orderStore;
console.log('Orders:', orderStore?.getState().orders);
console.log('Connected:', orderStore?.getState().realtimeConnected);
```

### 4. Test Events

- **Create Order** → Check `order.created` toast
- **Update Status** → Check `order.status_changed` toast
- **Assign Agent** → Check `order.assigned` toast
- **Open OrderDetail** → Edit order → Check live update in detail view

## Connection States

| State | Description | UI Indicator |
|-------|-------------|--------------|
| `connected` | Live connection active | Green "Live" badge |
| `disconnected` | Not connected | Gray "Offline" badge |
| `connecting` | Attempting connection | Blue spinning "Connecting..." |
| `failed` | Connection failed | Red "Failed" badge |

## Troubleshooting

### Connection Not Establishing

1. **Check Backend**:
   ```bash
   # Verify Ably key configured
   echo $ABLY_API_KEY
   
   # Check auth endpoint
   curl -X POST http://localhost:8080/api/v1/realtime/auth \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Check Browser Console**:
   ```
   [Ably] Client initialized
   [Ably] Connected to Ably
   [OrderStore] Ably subscriptions active
   ```

3. **Check Network Tab**:
   - Should see WebSocket connection to `realtime.ably.io`
   - POST to `/api/v1/realtime/auth` should return token

### Events Not Received

1. **Verify Subscription**:
   ```javascript
   // Browser console
   console.log(ablyClient.subscriptions);
   // Should show: Map { 'orders' => Channel {...} }
   ```

2. **Check Channel Permissions**:
   - Admins: `orders:*`, `agent:*`
   - Sales: `orders:*`
   - Agents: `orders:*`, `agent:{user_id}:subscribe`

3. **Verify Backend Publishing**:
   ```bash
   # Backend logs should show
   [Publisher] Publishing order.created to channels: [orders orders:123]
   ```

### Updates Not Reflecting

1. **Check Event Handler**:
   ```javascript
   // Add logging to handleRealtimeEvent in orderStore.js
   console.log('[OrderStore] Event:', eventName, eventData);
   ```

2. **Verify API Fetch**:
   - Event handlers fetch fresh data from API
   - Check network tab for GET `/api/v1/orders/{id}`

3. **Check Store Update**:
   ```javascript
   // Browser console - watch store
   const unsubscribe = useOrderStore.subscribe(
     state => console.log('Orders updated:', state.orders.length)
   );
   ```

## Auto-Reconnect

Connection automatically retries:

- **Disconnected**: Retry every 3 seconds
- **Suspended**: Retry every 10 seconds
- **Failed**: User must refresh (shows "Failed" status)

## Performance Notes

1. **Non-Blocking**: All event publishing uses goroutines (backend)
2. **Efficient Updates**: Only fetches changed order, not full list
3. **Smart State Management**: Updates orders in-place, no full re-render
4. **Toast Throttling**: Critical events only (no spam)

## Security

- **Token Auth**: JWT-based Ably tokens expire in 24 hours
- **Role-Based Permissions**: Channels restricted by user role
- **Secure Transport**: TLS WebSocket connection
- **No API Key Exposure**: Key only in backend, tokens issued per-user

## Next Steps

- **Push Notifications**: Integrate with mobile app notifications
- **Presence**: Show which agents are online
- **Typing Indicators**: Real-time chat for order notes
- **Optimistic Updates**: Update UI before server confirms

## Support

For issues:
1. Check browser console for errors
2. Check backend logs for publishing errors
3. Verify Ably dashboard for connection metrics
4. Check Ably API key permissions and quota
