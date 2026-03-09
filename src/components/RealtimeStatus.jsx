import { useEffect, useState } from 'react';
import useOrderStore from '../store/orderStore';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

/**
 * Real-time connection status indicator
 * Shows current Ably connection state with visual feedback
 */
export default function RealtimeStatus({ collapsed = false }) {
  const { realtimeConnected, realtimeStatus } = useOrderStore();
  
  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      label: 'Live',
      description: 'Real-time updates active'
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-gray-400',
      bgColor: 'bg-gray-50',
      label: 'Offline',
      description: 'Not connected'
    },
    connecting: {
      icon: Loader2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      label: 'Connecting...',
      description: 'Establishing connection',
      animate: true
    },
    failed: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: 'Failed',
      description: 'Connection failed'
    }
  };

  const config = statusConfig[realtimeStatus] || statusConfig.disconnected;
  const Icon = config.icon;

  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
      <div 
        className={`flex items-center gap-1.5 rounded-full ${config.bgColor} ${
          collapsed ? 'p-2' : 'px-2 py-1'
        }`}
        title={collapsed ? `${config.label} - ${config.description}` : undefined}
      >
        <Icon 
          className={`${collapsed ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${config.color} ${config.animate ? 'animate-spin' : ''}`}
        />
        {!collapsed && (
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        )}
      </div>
    </div>
  );
}

export { RealtimeStatus };
