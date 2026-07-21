import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import authService from '../services/authService';
import Logo from '../components/Logo';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AccessNotGranted Component
 * Displayed when an authenticated user with the 'agent' role accesses the Sales Dashboard.
 * Displays an Access Not Granted message without showing any navigation menus or dashboard pages,
 * and provides a Logout button.
 */
const AccessNotGranted = () => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
      toast.success('Logged out successfully');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error('Failed to logout. Clearing session...');
      useAuthStore.getState().logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-8">
      <div className="w-full max-w-md text-center">
        <div className="flex flex-col items-center mb-8">
          <Logo width={150} height={50} textColor="#0846c1" className="mb-2" />
        </div>

        <Card className="shadow-xl border-red-100">
          <CardHeader className="space-y-3 pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Access Not Granted
            </CardTitle>
            <CardDescription className="text-gray-600 text-sm">
              Your account role does not have permission to access the Spado Sales Dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <p className="text-xs text-gray-500">
              If you believe this is an error, please contact your administrator to update your account role.
            </p>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="destructive"
              className="w-full flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Logout
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          © 2026 Spado. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AccessNotGranted;
