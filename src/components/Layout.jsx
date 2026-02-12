import { useState } from 'react';
import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import useAuthStore from '../store/authStore';
import authService from '../services/authService';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Car,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  UserCircle,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelRight,
  User,
  KeyRound,
  ChevronDown,
} from 'lucide-react';
import Logo from './Logo';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

/**
 * Layout Component
 * Responsive layout with sidebar navigation and header
 * Adapts to mobile, tablet, and desktop screens
 */
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    const commonItems = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ];

    const roleBasedItems = {
      admin: [
        { name: 'Customers', href: '/customers', icon: Users },
        { name: 'Orders', href: '/orders', icon: Calendar },
        { name: 'Subscriptions', href: '/subscriptions', icon: Calendar },
        { name: 'Services', href: '/services', icon: Car },
        { name: 'Staff', href: '/staff', icon: UserCircle },
        { name: 'Reports', href: '/reports', icon: BarChart3 },
        { name: 'Financials', href: '/financials', icon: DollarSign },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
      sales_executive: [
        { name: 'Customers', href: '/customers', icon: Users },
        { name: 'Orders', href: '/orders', icon: Calendar },
        { name: 'Subscriptions', href: '/subscriptions', icon: Calendar },
        { name: 'Services', href: '/services', icon: Car },
        { name: 'My Sales', href: '/my-sales', icon: BarChart3 },
      ],
      accountant: [
        { name: 'Transactions', href: '/transactions', icon: DollarSign },
        { name: 'Reports', href: '/reports', icon: BarChart3 },
        { name: 'Invoices', href: '/invoices', icon: ClipboardList },
        { name: 'Payments', href: '/payments', icon: DollarSign },
      ],
    };

    return [...commonItems, ...(roleBasedItems[user?.role] || roleBasedItems.admin)];
  };

  const navigationItems = getNavigationItems();

  // Generate breadcrumbs based on current path
  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', href: '/dashboard' }];

    if (pathSegments.length === 0 || location.pathname === '/dashboard') {
      return breadcrumbs;
    }

    pathSegments.forEach((segment, index) => {
      const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
      const navItem = navigationItems.find(item => item.href === path);

      if (navItem) {
        breadcrumbs.push({ name: navItem.name, href: path });
      } else {
        // Capitalize and format the segment name
        const name = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        breadcrumbs.push({ name, href: path });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const NavItem = ({ item, mobile = false, collapsed = false }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        to={item.href}
        onClick={() => mobile && setSidebarOpen(false)}
        className={`flex items-center gap-3 rounded-lg transition-colors ${collapsed ? 'px-3 py-2 justify-center' : 'px-4 py-2'
          } ${isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-gray-700 hover:bg-gray-100'
          }`}
        title={collapsed ? item.name : undefined}
      >
        <Icon className="h-5 w-5" strokeWidth={1.5} />
        {!collapsed && <span className="">{item.name}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 bg-gray-100 border-r border-gray-200 transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex flex-col justify-center h-16 pt-4  border-gray-200">
            {!sidebarCollapsed ? (
              <h1 className="text-xl font-bold text-primary">
                <Logo width={150} height={30} textColor="#0846c1" className="mb-2" />
              </h1>
            ) : (
              <div className="h-10 w-10 ml-5 rounded-lg bg-white flex items-center justify-center">
                <span className="text-[#0846c1] font-bold text-3xl">S</span>
              </div>
            )}
          </div>


          {/* Collapse Toggle Button */}
          <div className="hidden lg:hidden px-4 py-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5 text-gray-600" />
              ) : (
                <>
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                  <span className="ml-2 text-sm text-gray-600">Collapse</span>
                </>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigationItems.map((item) => (
              <NavItem key={item.name} item={item} mobile={true} collapsed={sidebarCollapsed} />
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Desktop Header */}
        <header className="hidden lg:block sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-1">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="h-5 w-5 text-gray-600" />
                ) : (
                  <PanelRight className="h-5 w-5 text-gray-600" />
                )}
              </button>
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.href}>
                      <BreadcrumbItem>
                        {index === breadcrumbs.length - 1 ? (
                          <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link to={crumb.href}>{crumb.name}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.name || user?.email}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {user?.role?.replace('_', ' ')}
                      </p>
                    </div>
                    <div className='flex items-center cursor-pointer'>
                      <div className="h-10 w-10 rounded-full bg-secondary hover:bg-gray-200 flex items-center justify-center">
                        <UserCircle strokeWidth={1.5} className="h-6 w-6 text-foreground" />
                      </div>
                      <ChevronDown strokeWidth={1.5} className="h-4 w-4 text-gray-500" />
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-1">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      to="/change-password"
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <KeyRound className="h-4 w-4" />
                      <span>Change Password</span>
                    </Link>
                    <div className="border-t my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
          <div className="flex items-center justify-around h-16">
            {/* Dashboard */}
            {navigationItems.find(i => i.name === 'Dashboard') && (
              <Link
                to="/dashboard"
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${location.pathname === '/dashboard' ? 'text-primary font-semibold' : 'text-gray-500'}`}
              >
                <LayoutDashboard className={`h-5 w-5 ${location.pathname === '/dashboard' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                <span className="text-[10px]">Dashboard</span>
              </Link>
            )}

            {/* Orders */}
            {navigationItems.find(i => i.name === 'Orders') && (
              <Link
                to="/orders"
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${location.pathname === '/orders' ? 'text-primary font-semibold' : 'text-gray-500'}`}
              >
                <Calendar className={`h-5 w-5 ${location.pathname === '/orders' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                <span className="text-[10px]">Orders</span>
              </Link>
            )}

            {/* More Menu */}
            <Popover open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${moreMenuOpen ? 'text-primary' : 'text-gray-500'}`}
                >
                  <Menu className={`h-5 w-5 ${moreMenuOpen ? 'stroke-2' : 'stroke-[1.5]'}`} />
                  <span className="text-[10px]">More</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 mb-2" align="center" side="top">
                <div className="grid grid-cols-1 gap-1">
                  {navigationItems
                    .filter(item => !['Dashboard', 'Orders'].includes(item.name))
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setMoreMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100 text-gray-700'}`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                </div>
              </PopoverContent>
            </Popover>

            {/* Profile Menu */}
            <Popover open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${location.pathname === '/profile' || profileMenuOpen ? 'text-primary font-semibold' : 'text-gray-500'}`}
                >
                  <UserCircle className={`h-5 w-5 ${location.pathname === '/profile' || profileMenuOpen ? 'stroke-2' : 'stroke-[1.5]'}`} />
                  <span className="text-[10px]">Profile</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 mb-2" align="end" side="top">
                <div className="space-y-1">
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.name || user?.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.role?.replace('_', ' ')}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile Info</span>
                  </Link>
                  <Link
                    to="/change-password"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>Change Password</span>
                  </Link>
                  <div className="border-t my-1" />
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </nav>

        {/* Page Content */}
        <main className="mb-16 lg:mb-0 lg:mt-0 bg-gray-50">
          <div className="mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
