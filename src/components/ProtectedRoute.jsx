import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import AccessNotGranted from '../pages/AccessNotGranted';
import { USER_ROLES } from '../lib/constants';

/**
 * ProtectedRoute Component
 * Guards routes that require authentication
 * Can optionally restrict access based on user roles
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string|Array<string>} props.allowedRoles - Optional role(s) that can access this route
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Users with 'agent' role do not have access to sales dashboard pages or menus
  if (user?.role === USER_ROLES.AGENT || user?.role === 'agent') {
    return <AccessNotGranted />;
  }

  // Check if user has required role (if specified)
  if (allowedRoles) {
    const userRole = user?.role;
    const hasAccess = Array.isArray(allowedRoles)
      ? allowedRoles.includes(userRole)
      : allowedRoles === userRole;

    if (!hasAccess) {
      // User doesn't have permission, redirect to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and authorized
  return children;
};

export default ProtectedRoute;
