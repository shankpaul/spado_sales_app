import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import pushNotificationService from '../services/pushNotifications';
import { toast } from 'sonner';

/**
 * Notification Settings Component
 * Manages push notification preferences
 */
export default function NotificationSettings() {
  const [status, setStatus] = useState({
    supported: false,
    permission: 'default',
    enabled: false,
    blocked: false,
    canEnable: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    updateStatus();
  }, []);

  const updateStatus = () => {
    const newStatus = pushNotificationService.getStatus();
    setStatus(newStatus);
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const success = await pushNotificationService.enable();
      
      if (success) {
        toast.success('Push notifications enabled!');
        updateStatus();
      } else {
        toast.error('Failed to enable push notifications');
      }
    } catch (error) {
      toast.error('Error enabling push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      await pushNotificationService.disable();
      toast.info('To fully disable, revoke permission in browser settings');
      updateStatus();
    } catch (error) {
      toast.error('Error disabling push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const success = await pushNotificationService.showTestNotification();
      if (success) {
        toast.success('Test notification sent!');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      toast.error('Error sending test notification');
    }
  };

  if (!status.supported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-yellow-900">Browser Not Supported</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Push notifications are not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get notified about order updates, assignments, and status changes
          </p>
        </div>
        
        {status.enabled ? (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Enabled</span>
          </div>
        ) : status.blocked ? (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full">
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Blocked</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full">
            <BellOff className="w-4 h-4" />
            <span className="text-sm font-medium">Disabled</span>
          </div>
        )}
      </div>

      {/* Status Info */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Browser Support</span>
          <span className="text-sm font-medium text-green-600">Supported</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Permission Status</span>
          <span className={`text-sm font-medium ${
            status.permission === 'granted' ? 'text-green-600' :
            status.permission === 'denied' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {status.permission.charAt(0).toUpperCase() + status.permission.slice(1)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {status.canEnable && (
          <button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Bell className="w-4 h-4" />
            {isLoading ? 'Enabling...' : 'Enable Notifications'}
          </button>
        )}

        {status.enabled && (
          <>
            <button
              onClick={handleTestNotification}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Bell className="w-4 h-4" />
              Send Test Notification
            </button>
            
            <button
              onClick={handleDisableNotifications}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BellOff className="w-4 h-4" />
              {isLoading ? 'Disabling...' : 'Disable Notifications'}
            </button>
          </>
        )}

        {status.blocked && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900">Notifications Blocked</h4>
                <p className="text-sm text-red-700 mt-1">
                  You've blocked notifications for this site. To enable them:
                </p>
                <ol className="text-sm text-red-700 mt-2 ml-4 list-decimal space-y-1">
                  <li>Click the lock icon in your browser's address bar</li>
                  <li>Find "Notifications" in the permissions list</li>
                  <li>Change it to "Allow"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* What you'll receive */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">You'll receive notifications for:</h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span><strong>Order Status Changes</strong> - When order status is updated</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span><strong>Agent Responses</strong> - When agents accept or reject orders</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span><strong>Order Assignments</strong> - When orders are assigned or reassigned</span>
          </li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          Note: You won't receive notifications for your own actions
        </p>
      </div>
    </div>
  );
}

export { NotificationSettings };
