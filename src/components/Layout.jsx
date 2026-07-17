import { useState, useEffect } from 'react';
import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import useAuthStore from '../store/authStore';
import useOrderStore from '../store/orderStore';
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
  Smartphone,
  Download,
  Briefcase,
  PackageOpen,
  Bell,
  Tag,
  Gift,
  Building,
  Package,
  Layers,
} from 'lucide-react';
import usePWAInstall from '../hooks/usePWAInstall';
import Logo from './Logo';
import RealtimeStatus from './RealtimeStatus';
import NotificationSettings from './NotificationSettings';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

/**
 * Layout Component
 * Responsive layout with sidebar navigation and header
 * Adapts to mobile, tablet, and desktop screens
 */
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuthStore();
  const { initializeRealtime } = useOrderStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { isInstallable, handleInstallClick } = usePWAInstall();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [profileSubmenuOpen, setProfileSubmenuOpen] = useState(false);

  const triggerHapticFeedback = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(15);
    }
  };

  // Initialize real-time updates for all authenticated pages
  useEffect(() => {
    initializeRealtime();

    // Note: We don't disconnect on unmount because real-time
    // should stay connected across all pages. It will disconnect on logout.
  }, [initializeRealtime]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  // Navigation items grouped by category based on user role
  const getNavigationGroups = () => {
    const role = user?.role || 'admin';

    const groups = {
      admin: [
        {
          title: 'Overview',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'Todays Work', href: '/todays-work', icon: ClipboardList }
          ]
        },
        {
          title: 'Sales & CRM',
          items: [
            { name: 'Customers', href: '/customers', icon: Users },
            { name: 'Enquiries', href: '/enquiries', icon: PackageOpen },
            { name: 'Orders', href: '/orders', icon: Calendar },
            { name: 'Subscriptions', href: '/subscriptions', icon: Calendar }
          ]
        },
        {
          title: 'Marketing',
          items: [
            { name: 'Offers', href: '/offers', icon: Tag },
            { name: 'Campaigns', href: '/campaigns', icon: Gift },
            { name: 'Partners', href: '/partners', icon: Building }
          ]
        },
        {
          title: 'Catalog & Config',
          items: [
            { name: 'Packages', href: '/packages', icon: Package },
            { name: 'Addons', href: '/addons', icon: Layers },
            { name: 'Checklists', href: '/checklist-items', icon: ClipboardList }
          ]
        },
        {
          title: 'User Management',
          items: [
            { name: 'System Users', href: '/users', icon: UserCircle },
            { name: 'Employees', href: '/employees', icon: Briefcase },
            { name: 'Reports', href: '/reports', icon: BarChart3 }
          ]
        }
      ],
      sales_executive: [
        {
          title: 'Overview',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'Todays Work', href: '/todays-work', icon: ClipboardList }
          ]
        },
        {
          title: 'Sales & CRM',
          items: [
            { name: 'Customers', href: '/customers', icon: Users },
            { name: 'Enquiries', href: '/enquiries', icon: PackageOpen },
            { name: 'Orders', href: '/orders', icon: Calendar },
            { name: 'Subscriptions', href: '/subscriptions', icon: Calendar }
          ]
        },
        {
          title: 'Marketing',
          items: [
            { name: 'Campaigns', href: '/campaigns', icon: Gift },
            { name: 'Partners', href: '/partners', icon: Building }
          ]
        }
      ],
      accountant: [
        {
          title: 'Overview',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
          ]
        },
        {
          title: 'Finance',
          items: [
            { name: 'Transactions', href: '/transactions', icon: DollarSign },
            { name: 'Reports', href: '/reports', icon: BarChart3 },
            { name: 'Invoices', href: '/invoices', icon: ClipboardList },
            { name: 'Payments', href: '/payments', icon: DollarSign }
          ]
        }
      ]
    };

    return groups[role] || groups.admin;
  };

  const navigationGroups = getNavigationGroups();
  const navigationItems = navigationGroups.flatMap(group => group.items);

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
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link
          to={item.href}
          onClick={() => mobile && setSidebarOpen(false)}
          className={`flex items-center text-sm gap-3 rounded-lg transition-colors ${collapsed ? 'px-3 py-2 justify-center' : 'px-4 py-2'
            } ${isActive
              ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
              : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
          {!collapsed && <span className="">{item.name}</span>}
        </Link>

        {collapsed && isHovered && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-md whitespace-nowrap shadow-lg z-50 pointer-events-none select-none animate-in fade-in slide-in-from-left-2 duration-150">
            {item.name}
            {/* Popover Arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-gray-900" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-x-clip">

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/10 backdrop-blur-[2px] z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 bg-[#fbfbfb] border-r border-gray-200 transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
          <nav className={`flex-grow p-4 space-y-6 ${sidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
            {navigationGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                {!sidebarCollapsed && (
                  <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                    {group.title}
                  </p>
                )}
                {sidebarCollapsed && (
                  <div className="border-b border-gray-200/60 my-2 mx-2" />
                )}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavItem key={item.name} item={item} mobile={true} collapsed={sidebarCollapsed} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Sidebar Bottom Area (Install button + Connection Status) */}
          <div className="p-4 pb-20 lg:pb-4 border-t border-gray-200 space-y-3 flex-shrink-0">
            {isInstallable && (
              <Button
                onClick={handleInstallClick}
                className={`flex items-center justify-center cursor-pointer gap-3 w-full rounded-xl transition-all duration-200 px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 font-semibold border border-transparent hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                title="Install App"
              >
                <Download className="h-5 w-5 animate-bounce" style={{ animationDuration: '2s' }} />
                {!sidebarCollapsed && <span>Install App</span>}
              </Button>
            )}
            <div className={sidebarCollapsed ? 'flex justify-center' : ''}>
              <RealtimeStatus collapsed={sidebarCollapsed} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Sticky Header */}
        <header className="hidden lg:block sticky top-0 z-30 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-1">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(true);
                  } else {
                    setSidebarCollapsed(!sidebarCollapsed);
                  }
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <Menu className="h-5 w-5 text-gray-600 lg:hidden" />
                <span className="hidden lg:inline">
                  {sidebarCollapsed ? (
                    <PanelLeft className="h-5 w-5 text-gray-600" />
                  ) : (
                    <PanelRight className="h-5 w-5 text-gray-600" />
                  )}
                </span>
              </button>
              <div className="hidden sm:block">
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
              <div className="sm:hidden text-sm font-bold text-gray-900 truncate max-w-[150px]">
                {breadcrumbs[breadcrumbs.length - 1]?.name}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors">

                    <div className='flex items-center cursor-pointer'>
                      <div className="h-10 w-10 rounded-full bg-secondary hover:bg-gray-200 flex items-center justify-center">
                        <UserCircle strokeWidth={1.5} className="h-6 w-6 text-foreground" />
                      </div>
                      <ChevronDown strokeWidth={1.5} className="h-4 w-4 text-gray-500" />
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="px-3 py-2 border-b mb-1.5">
                    <p className="text-sm font-semibold text-gray-900 truncate capitalize">
                      {user?.name || user?.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">
                      {user?.role?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <KeyRound className="h-4 w-4" />
                      <span>Change Password</span>
                    </Link>
                    <button
                      onClick={() => setNotificationSettingsOpen(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <Bell className="h-4 w-4" />
                      <span>Notifications</span>
                    </button>
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
                onClick={triggerHapticFeedback}
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
                onClick={triggerHapticFeedback}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${location.pathname === '/orders' ? 'text-primary font-semibold' : 'text-gray-500'}`}
              >
                <Calendar className={`h-5 w-5 ${location.pathname === '/orders' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                <span className="text-[10px]">Orders</span>
              </Link>
            )}

            {/* Enquiries */}
            {navigationItems.find(i => i.name === 'Enquiries') && (
              <Link
                to="/enquiries"
                onClick={triggerHapticFeedback}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${location.pathname === '/enquiries' ? 'text-primary font-semibold' : 'text-gray-500'}`}
              >
                <PackageOpen className={`h-5 w-5 ${location.pathname === '/enquiries' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                <span className="text-[10px]">Enquiries</span>
              </Link>
            )}

            {/* More Menu */}
            <Popover
              open={moreMenuOpen}
              onOpenChange={(open) => {
                setMoreMenuOpen(open);
                if (!open) setProfileSubmenuOpen(false);
              }}
            >
              <PopoverTrigger asChild>
                <button
                  onClick={triggerHapticFeedback}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${moreMenuOpen ? 'text-primary' : 'text-gray-500'}`}
                >
                  <Menu className={`h-5 w-5 ${moreMenuOpen ? 'stroke-2' : 'stroke-[1.5]'}`} />
                  <span className="text-[10px]">More</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 mb-2 max-h-[80vh] overflow-y-auto" align="center" side="top">
                <div className="grid grid-cols-1 gap-1">
                  {navigationItems
                    .filter(item => !['Dashboard', 'Orders', 'Enquiries'].includes(item.name))
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

                  {isInstallable && (
                    <>
                      <div className="border-t my-1" />
                      <button
                        onClick={() => {
                          setMoreMenuOpen(false);
                          handleInstallClick();
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                      >
                        <Download className="h-4 w-4 animate-bounce" style={{ animationDuration: '2s' }} />
                        <span>Install Spado App</span>
                      </button>
                    </>
                  )}

                  {/* Collapsible Profile Menu */}
                  <div className="border-t my-1" />
                  <button
                    onClick={() => setProfileSubmenuOpen(!profileSubmenuOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-gray-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <UserCircle className="h-4 w-4" />
                      <span>Profile</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${profileSubmenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileSubmenuOpen && (
                    <div className="pl-4 pr-1 py-1 mt-1 space-y-1 bg-gray-50/50 rounded-md border border-gray-100">
                      <div className="px-3 py-1.5 bg-gray-50 rounded-md">
                        <p className="text-xs font-semibold text-gray-900 truncate capitalize">
                          {user?.name || user?.email}
                        </p>
                        <p className="text-[10px] text-gray-500 capitalize mt-0.5">
                          {user?.role?.replace('_', ' ')}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          setProfileSubmenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        <span>View Profile</span>
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          setProfileSubmenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                      >
                        <KeyRound className="h-4 w-4" />
                        <span>Change Password</span>
                      </Link>
                      <button
                        onClick={() => {
                          setMoreMenuOpen(false);
                          setProfileSubmenuOpen(false);
                          setNotificationSettingsOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-gray-700 transition-colors text-left"
                      >
                        <Bell className="h-4 w-4" />
                        <span>Notifications</span>
                      </button>
                      <div className="border-t my-1" />
                      <button
                        onClick={() => {
                          setMoreMenuOpen(false);
                          setProfileSubmenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-red-600 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </nav>

        {/* Page Content */}
        <main className="mb-16 lg:mb-0 lg:mt-0 bg-[#fbfbfb] min-h-[calc(100vh-4rem)]">
          <div className="mx-auto">
            {children}
          </div>
        </main>

        {/* Notification Settings Dialog */}
        <Dialog open={notificationSettingsOpen} onOpenChange={setNotificationSettingsOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Notification Settings</DialogTitle>
              <DialogDescription>
                Manage your push notification preferences
              </DialogDescription>
            </DialogHeader>
            <NotificationSettings />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Layout;
