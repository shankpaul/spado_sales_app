import { useEffect } from 'react';
import { toast } from 'sonner';
import useOnlineStatus from '../hooks/useOnlineStatus';

/**
 * OfflineNotice Component
 * Displays toast notifications when network connectivity changes
 */
const OfflineNotice = () => {
  const { isOnline, wasOffline } = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) {
      toast.error('You are offline', {
        description: 'Please check your internet connection',
        duration: Infinity, // Keep showing until back online
        id: 'offline-notice',
      });
    } else if (wasOffline) {
      toast.dismiss('offline-notice');
      toast.success('You are back online', {
        description: 'Connection restored',
        duration: 3000,
      });
    }
  }, [isOnline, wasOffline]);

  return null; // This component doesn't render anything visible
};

export default OfflineNotice;
