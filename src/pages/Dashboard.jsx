import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge2 } from '../components/ui/badge2';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Sheet,
  SheetContent,
} from '../components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '../components/ui/drawer';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import OrderDetail from './OrderDetail';
import useAuthStore from '../store/authStore';
import useOrderStore from '../store/orderStore';
import orderService from '../services/orderService';
import dashboardService from '../services/dashboardService';
import { format, isToday, parseISO } from 'date-fns';
import {
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Car,
  ClipboardList,
  UserCheck,
  BarChart3,
  User,
  MapPin,
  Clock10,
  Bell,
  Search,
  ArrowRight,
  ChevronRight,
  Repeat,
  Plus,
  Loader2,
  X,
  Zap,
  CheckCircle2,
  Users2,
  Sparkles,
  MapPinCheck,
  MapPinX,
  UserSearch,
  IndianRupee,
  Activity
} from 'lucide-react';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  getStatusLabel,
  getStatusColor,
} from '../lib/constants';
import LetterAvatar from '../components/LetterAvatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatTime, checkServiceAvailability, getAgentsAvailableToday } from '@/lib/utilities';
import { getBrands, getModelsByBrand, getVehicleType, getVehicleTypes } from '../lib/vehicleData';
import VehicleIcon from '@/components/VehicleIcon';

/**
 * Dashboard Page Component
 * Displays role-specific dashboards for:
 * - Admin: Full system overview
 * - Sales Executive: Sales and customer metrics
 * - Accountant: Financial reports and transactions
 * - Real-time updates via Ably WebSocket
 */
const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Use order store instead of local state
  const {
    upcomingOrders,
    completedOrders,
    isLoading: loadingOrders,
    fetchTodayOrders,
    updateOrder,
  } = useOrderStore();

  // Quick Links Dialog States
  const [vehicleIdentifierOpen, setVehicleIdentifierOpen] = useState(false);
  const [serviceCheckerOpen, setServiceCheckerOpen] = useState(false);
  const [agentsAvailableOpen, setAgentsAvailableOpen] = useState(false);
  const [quickToolsMenuOpen, setQuickToolsMenuOpen] = useState(false);

  // Vehicle Identifier States
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [identifiedType, setIdentifiedType] = useState('');

  // Service Availability States
  const [serviceMapLink, setServiceMapLink] = useState('');
  const [serviceLocation, setServiceLocation] = useState('');
  const [servicePhone, setServicePhone] = useState('');
  const [serviceVehicleType, setServiceVehicleType] = useState('');
  const [servicePackageName, setServicePackageName] = useState('');
  const [availablePackages, setAvailablePackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null);

  // Agents Available States
  const [availableAgents, setAvailableAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Track selected order for detail view
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOrderId = searchParams.get('orderId');

  // Handle opening order detail
  const handleOpenOrderDetail = (orderId) => {
    setSearchParams({ orderId: orderId.toString() });
  };

  // Handle closing order detail
  const handleCloseOrderDetail = () => {
    setSearchParams({});
  };

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Fetch today's orders from store
  useEffect(() => {
    fetchTodayOrders();
  }, [fetchTodayOrders]);

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      const stats = await dashboardService.getStats();
      setDashboardStats(stats);
    } catch (error) {
      // Don't show error to user, just use default values
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch dashboard stats on mount and set up auto-refresh every 10 minutes
  useEffect(() => {
    fetchDashboardStats();

    // Refresh every 10 minutes (600000 ms)
    const refreshInterval = setInterval(() => {
      fetchDashboardStats();
    }, 600000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Handle vehicle identification
  const handleIdentifyVehicle = () => {
    if (selectedBrand && selectedModel) {
      const type = getVehicleType(selectedBrand, selectedModel);
      if (type) {
        setIdentifiedType(type);
      } else {
        toast.error('Could not identify vehicle type');
      }
    } else {
      toast.error('Please select both brand and model');
    }
  };

  // Reset vehicle identifier
  const resetVehicleIdentifier = () => {
    setSelectedBrand('');
    setSelectedModel('');
    setIdentifiedType('');
  };

  // Fetch packages when vehicle type changes
  useEffect(() => {
    if (serviceVehicleType) {
      const fetchPackages = async () => {
        try {
          setLoadingPackages(true);
          const response = await orderService.getPackages(serviceVehicleType, false);
          const loaded = response.packages || [];
          loaded.sort((a, b) => a.name.localeCompare(b.name));
          setAvailablePackages(loaded);
        } finally {
          setLoadingPackages(false);
        }
      };
      fetchPackages();
    } else {
      setAvailablePackages([]);
      setServicePackageName('');
    }
  }, [serviceVehicleType]);

  // Handle service availability check
  const handleCheckAvailability = async () => {
    // Validate required fields - only location is mandatory
    if (!serviceMapLink && !serviceLocation) {
      toast.error('Either map link or location is required');
      return;
    }

    try {
      setCheckingAvailability(true);
      setAvailabilityResult(null);

      const params = {
        customer_phone: servicePhone || undefined,
        vehicle_type: serviceVehicleType || undefined,
        package_name: servicePackageName || undefined
      };

      // Add location parameters
      if (serviceMapLink) {
        params.map_link = serviceMapLink;
      } else if (serviceLocation) {
        params.location = serviceLocation;
      }

      const result = await checkServiceAvailability(params);
      setAvailabilityResult(result);

    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Reset service availability form
  const resetServiceAvailability = () => {
    setServiceMapLink('');
    setServiceLocation('');
    setServicePhone('');
    setServiceVehicleType('');
    setServicePackageName('');
    setAvailablePackages([]);
    setAvailabilityResult(null);
  };

  // Fetch available agents when dialog opens
  useEffect(() => {
    if (agentsAvailableOpen) {
      const fetchAgents = async () => {
        try {
          setLoadingAgents(true);
          const result = await getAgentsAvailableToday();
          setAvailableAgents(result.agents || []);
        } catch (error) {
          toast.error('Failed to load available agents');
          setAvailableAgents([]);
        } finally {
          setLoadingAgents(false);
        }
      };
      fetchAgents();
    }
  }, [agentsAvailableOpen]);



  // Admin Dashboard
  const AdminDashboard = () => {
    // Format currency for display
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(amount || 0);
    };

    // Format percentage change
    const formatPercentage = (percentage) => {
      const sign = percentage > 0 ? '+' : '';
      return `${sign}${percentage.toFixed(1)}%`;
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <StatCard
            title="This Month Revenue"
            value={dashboardStats ? formatCurrency(dashboardStats.revenue.current) : '--'}
            change={dashboardStats ? formatPercentage(dashboardStats.revenue.change_percentage) : '--'}
            icon={<IndianRupee className="h-4 w-4 text-primary-600" />}
            isLoading={statsLoading}
            onClick={() => navigate('/reports')}
          />
          <StatCard
            title="Total Customers"
            value={dashboardStats ? dashboardStats.total_customers.current.toString() : '--'}
            change={dashboardStats ? formatPercentage(dashboardStats.total_customers.change_percentage) : '--'}
            icon={<Users className="h-4 w-4 text-primary-600" />}
            isLoading={statsLoading}
            onClick={() => navigate('/customers')}
          />
          <StatCard
            title="Today's Bookings"
            value={dashboardStats ? formatCurrency(dashboardStats.todays_bookings.current) : '--'}
            change={dashboardStats ? formatPercentage(dashboardStats.todays_bookings.change_percentage) : '--'}
            icon={<Calendar className="h-4 w-4 text-primary-600" />}
            isLoading={statsLoading}
            vsLabel="vs yesterday"
            onClick={() => navigate('/orders')}
          />
          <StatCard
            title="Today's Enquiries"
            value={dashboardStats ? dashboardStats.todays_enquiries.current.toString() : '--'}
            change={dashboardStats ? formatPercentage(dashboardStats.todays_enquiries.change_percentage) : '--'}
            icon={<Car className="h-4 w-4 text-primary-600" />}
            isLoading={statsLoading}
            vsLabel="vs yesterday"
            onClick={() => navigate('/enquiries')}
          />
        </div>

        {/* Response Meter Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResponseMeterCard
            title="Leads Conversion (Last 30 Days)"
            stats={dashboardStats?.response_meter}
            isLoading={statsLoading}
            onClick={() => navigate('/enquiries')}
          />
          <ResponseMeterCard
            title="Leads Conversion (Today)"
            stats={dashboardStats?.todays_response_meter}
            isLoading={statsLoading}
            onClick={() => navigate('/enquiries')}
          />
        </div>

        {/* Target and Pending Payments Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TargetAchievementCard
            stats={dashboardStats?.target_stats}
            isLoading={statsLoading}
          />
          <PendingPaymentsCard
            stats={dashboardStats?.pending_payments}
            isLoading={statsLoading}
            onOrderClick={handleOpenOrderDetail}
          />
        </div>

        {/* Charts Section */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-none shadow-sm md:border md:shadow-none p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-72 w-full rounded-2xl" />
            </Card>
            <Card className="bg-white border-none shadow-sm md:border md:shadow-none p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-72 w-full rounded-2xl" />
            </Card>
            <Card className="bg-white border-none shadow-sm md:border md:shadow-none p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-72 w-full rounded-2xl" />
            </Card>
            <Card className="bg-white border-none shadow-sm md:border md:shadow-none p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-72 w-full rounded-2xl" />
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Monthly Revenue Trend */}
            <Card className="bg-white border-none shadow-sm md:border md:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                  Revenue Trend (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dashboardStats?.chart_data || []}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        stroke="#9ca3af"
                        fontSize={11}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        stroke="#9ca3af"
                        fontSize={11}
                        tickFormatter={(val) => `₹${val}`}
                      />
                      <Tooltip
                        formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart 2: Bookings Trend */}
            <Card className="bg-white border-none shadow-sm md:border md:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-500" />
                  Bookings Trend (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dashboardStats?.chart_data || []}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        stroke="#9ca3af"
                        fontSize={11}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        stroke="#9ca3af"
                        fontSize={11}
                      />
                      <Tooltip
                        formatter={(value) => [value, 'Bookings']}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="bookings"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBookings)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart 3: Enquiries Trend */}
            <Card className="bg-white border-none shadow-sm md:border md:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Car className="h-5 w-5 text-orange-500" />
                  Enquiries Trend (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dashboardStats?.chart_data || []}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorEnquiries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        stroke="#9ca3af"
                        fontSize={11}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        stroke="#9ca3af"
                        fontSize={11}
                      />
                      <Tooltip
                        formatter={(value) => [value, 'Enquiries']}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="enquiries"
                        stroke="#f97316"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorEnquiries)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart 4: New Customers */}
            <Card className="bg-white border-none shadow-sm md:border md:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-500" />
                  New Customers (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardStats?.chart_data || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        stroke="#9ca3af"
                        fontSize={11}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        stroke="#9ca3af"
                        fontSize={11}
                      />
                      <Tooltip
                        formatter={(value) => [value, 'New Customers']}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                      />
                      <Bar
                        dataKey="new_customers"
                        fill="#06b6d4"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // Sales Executive Dashboard
  const SalesExecutiveDashboard = () => {
    // Format currency for display
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(amount || 0);
    };

    // Format percentage change
    const formatPercentage = (percentage) => {
      const sign = percentage > 0 ? '+' : '';
      return `${sign}${percentage.toFixed(1)}%`;
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            title="My Sales This Month"
            value={dashboardStats ? formatCurrency(dashboardStats.revenue.current) : '--'}
            change={dashboardStats ? formatPercentage(dashboardStats.revenue.change_percentage) : '--'}
            icon={<IndianRupee className="h-4 w-4 text-primary-600" />}
            isLoading={statsLoading}
            onClick={() => navigate('/orders')}
          />
          <StatCard
            title="My Todays Sales"
            value={dashboardStats ? formatCurrency(dashboardStats.todays_bookings.current) : '--'}
            change={dashboardStats ? formatPercentage(dashboardStats.todays_bookings.change_percentage) : '--'}
            icon={<Calendar className="h-4 w-4 text-primary-600" />}
            isLoading={statsLoading}
            vsLabel="vs yesterday"
            onClick={() => navigate('/orders')}
          />
          <TargetAchievementCard
            stats={dashboardStats?.target_stats}
            isLoading={statsLoading}
          />
          <PendingPaymentsCard
            stats={dashboardStats?.pending_payments}
            isLoading={statsLoading}
            onOrderClick={handleOpenOrderDetail}
          />
        </div>

        {/* Response Meter Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResponseMeterCard
            title="My Enquiries Response Meter (Last 30 Days)"
            stats={dashboardStats?.response_meter}
            isLoading={statsLoading}
            onClick={() => navigate('/enquiries')}
          />
          <ResponseMeterCard
            title="My Enquiries Response Meter (Today)"
            stats={dashboardStats?.todays_response_meter}
            isLoading={statsLoading}
            onClick={() => navigate('/enquiries')}
          />
        </div>

        {/* Quick Tools - Mobile Only */}
        <div className="md:hidden">
          <Card className="bg-white mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary-600" />
                Quick Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickLinkButton
                className="bg-gray-50 hover:bg-gray-100"
                icon={<Car className="h-5 w-5" />}
                label="Identify Vehicle Type"
                description="Check vehicle category"
                onClick={() => setVehicleIdentifierOpen(true)}
              />
              <QuickLinkButton
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Service Area Checker"
                className="bg-gray-50 hover:bg-gray-100"
                description="Check area is serviceable"
                onClick={() => setServiceCheckerOpen(true)}
              />
              <QuickLinkButton
                icon={<Users2 className="h-5 w-5" />}
                label="Agents Available Today"
                className="bg-gray-50 hover:bg-gray-100"
                description="View available agents"
                onClick={() => setAgentsAvailableOpen(true)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Desktop Grid Layout with Quick Links Column */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Orders Column - Takes 2 columns on desktop */}
          <div className="md:col-span-2 space-y-4">
            <div className="border-none flex flex-col gap-4">
              <div className="text-lg flex items-center justify-between">
                <span className="font-semibold text-xl text-gray-900 flex items-center gap-2">
                  Today's Upcoming Works
                  <span className="text-sm font-medium text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{upcomingOrders.length}</span>
                </span>
              </div>
              <div>
                {loadingOrders ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                  </div>
                ) : upcomingOrders.length > 0 ? (
                  <div className={cn("space-y-3 overflow-y-auto pr-1", completedOrders.length === 0 ? "max-h-[calc(100vh-20rem)]" : "max-h-96")}>
                    {upcomingOrders.map((order) => (
                      <BookingItem
                        key={order.id}
                        order={order}
                        onClick={() => handleOpenOrderDetail(order.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-muted-foreground font-medium">No upcoming orders for today</p>
                  </div>
                )}
              </div>
            </div>

            {(loadingOrders || completedOrders.length > 0) && (
              <div className="border-none flex flex-col gap-4">
                <div className="text-lg flex items-center justify-between">
                  <span className="font-semibold text-xl text-gray-900 flex items-center gap-2">
                    Completed Today
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{completedOrders.length}</span>
                  </span>
                </div>
                <div>
                  {loadingOrders ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full rounded-2xl" />
                      <Skeleton className="h-20 w-full rounded-2xl" />
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1 pb-2">
                      {completedOrders.map((order) => (
                        <BookingItem
                          key={order.id}
                          order={order}
                          onClick={() => handleOpenOrderDetail(order.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Links Column - Desktop Only */}
          <div className="hidden md:block">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary-600" />
                  Quick Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <QuickLinkButton
                  className="bg-gray-50 hover:bg-gray-100"
                  icon={<Car className="h-5 w-5" />}
                  label="Identify Vehicle Type"
                  description="Check vehicle category"
                  onClick={() => setVehicleIdentifierOpen(true)}
                />
                <QuickLinkButton
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  label="Service Area Checker"
                  className="bg-gray-50 hover:bg-gray-100"
                  description="Check area is serviceable"
                  onClick={() => setServiceCheckerOpen(true)}
                />
                <QuickLinkButton
                  icon={<Users2 className="h-5 w-5" />}
                  label="Agents Available Today"
                  className="bg-gray-50 hover:bg-gray-100"
                  description="View available agents"
                  onClick={() => setAgentsAvailableOpen(true)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div >
    );
  };

  // Accountant Dashboard
  const AccountantDashboard = () => {
    // Format currency for display
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(amount || 0);
    };

    // Format percentage change
    const formatPercentage = (percentage) => {
      const sign = percentage > 0 ? '+' : '';
      return `${sign}${percentage.toFixed(1)}%`;
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <StatCard
            title="Today's Revenue"
            value="$3,842"
            change="+18.2%"
            icon={<IndianRupee className="h-4 w-4 text-primary-600" />}
            isLoading={isLoading}
            vsLabel="vs yesterday"
            onClick={() => navigate('/transactions')}
          />
          <StatCard
            title="Pending Payments"
            value="$1,205"
            change="-5.3%"
            icon={<TrendingUp className="h-4 w-4 text-primary-600" />}
            isLoading={isLoading}
            onClick={() => navigate('/transactions')}
          />
          <StatCard
            title="Transactions Today"
            value="48"
            change="+9.7%"
            icon={<BarChart3 className="h-4 w-4 text-primary-600" />}
            isLoading={isLoading}
            vsLabel="vs yesterday"
            onClick={() => navigate('/transactions')}
          />
          <StatCard
            title="Monthly Revenue"
            value={dashboardStats ? formatCurrency(dashboardStats.revenue.current) : '--'}
            change={dashboardStats ? formatPercentage(dashboardStats.revenue.change_percentage) : '--'}
            icon={<DollarSign className="h-4 w-4 text-primary-600" />}
            isLoading={statsLoading}
            onClick={() => navigate('/reports')}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <TransactionItem amount="$125.00" customer="John Doe" status="Completed" />
                  <TransactionItem amount="$89.50" customer="Jane Smith" status="Completed" />
                  <TransactionItem amount="$250.00" customer="Bob Wilson" status="Pending" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="space-y-4">
                  <SummaryItem label="Cash Payments" value="$18,450" percentage="41%" />
                  <SummaryItem label="Card Payments" value="$22,780" percentage="50%" />
                  <SummaryItem label="Online Payments" value="$4,000" percentage="9%" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const getRoleDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'sales_executive':
        return <SalesExecutiveDashboard />;
      case 'accountant':
        return <AccountantDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="p-4 md:p-6 space-y-6">
        {/* Desktop Header - Hidden on Mobile */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user?.role === 'admin' && 'Admin Dashboard'}
                {user?.role === 'sales_executive' && 'Sales Dashboard'}
                {user?.role === 'accountant' && 'Financial Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.name || user?.email}!
              </p>
            </div>
          </div>
        </div>

        {getRoleDashboard()}

        {/* Order Detail Sheet */}
        <Sheet open={!!selectedOrderId} onOpenChange={(open) => !open && handleCloseOrderDetail()}>
          <SheetContent side="right" className="w-full sm:max-w-4xl p-0 overflow-y-auto">
            {selectedOrderId && (
              <OrderDetail
                orderId={selectedOrderId}
                onClose={handleCloseOrderDetail}
                onUpdate={(updatedOrder) => {
                  // Use store's updateOrder to sync across all components
                  updateOrder(updatedOrder);
                }}
              />
            )}
          </SheetContent>
        </Sheet>

        {/* Floating Action Button for Quick Tools on Mobile */}
        <div className="fixed bottom-20 right-4 z-40 md:hidden">
          <button
            onClick={() => setQuickToolsMenuOpen(true)}
            className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center border border-primary/20 active:scale-95 transition-all focus:outline-none"
            title="Quick Tools"
          >
            <Zap className="h-6 w-6 text-yellow-400 fill-yellow-400 animate-pulse" />
          </button>
        </div>

        {/* Quick Tools Floating Menu Dialog */}
        <Dialog open={quickToolsMenuOpen} onOpenChange={setQuickToolsMenuOpen}>
          <DialogContent className="w-[90vw] max-w-md p-6 rounded-2xl">
            <DialogHeader className="text-left flex-shrink-0">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Zap className="h-5 w-5 text-primary-600 fill-primary-600 animate-pulse shrink-0" />
                Quick Tools
              </DialogTitle>
              <DialogDescription>
                Select a utility tool to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <QuickLinkButton
                className="bg-gray-50 hover:bg-primary-50/50"
                icon={<Car className="h-5 w-5" />}
                label="Identify Vehicle Type"
                description="Check vehicle category"
                onClick={() => {
                  setQuickToolsMenuOpen(false);
                  setVehicleIdentifierOpen(true);
                }}
              />
              <QuickLinkButton
                className="bg-gray-50 hover:bg-primary-50/50"
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Service Area Checker"
                description="Check area is serviceable"
                onClick={() => {
                  setQuickToolsMenuOpen(false);
                  setServiceCheckerOpen(true);
                }}
              />
              <QuickLinkButton
                className="bg-gray-50 hover:bg-primary-50/50"
                icon={<Users2 className="h-5 w-5" />}
                label="Agents Available Today"
                description="View available agents"
                onClick={() => {
                  setQuickToolsMenuOpen(false);
                  setAgentsAvailableOpen(true);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Vehicle Identifier Dialog - Desktop */}
        <Dialog open={vehicleIdentifierOpen && !isMobile} onOpenChange={setVehicleIdentifierOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Identify Vehicle Type
              </DialogTitle>
              <DialogDescription>
                Select the vehicle brand and model to identify its type category.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select value={selectedBrand} onValueChange={(value) => {
                  setSelectedBrand(value);
                  setSelectedModel('');
                  setIdentifiedType('');
                }}>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {getBrands().map((brand) => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBrand && (
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsByBrand(selectedBrand).map((model) => (
                        <SelectItem key={model.name} value={model.name}>{model.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {identifiedType && (
                <div className="p-4 rounded-lg bg-blue-50 border border-primary/20">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-primary">Identified Type</span>
                      </div>
                      <p className="text-2xl font-bold text-primary uppercase">{identifiedType}</p>
                    </div>
                    <VehicleIcon vehicleType={identifiedType} size={82} />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleIdentifyVehicle} className="flex-1">
                  Identify
                </Button>
                <Button variant="outline" onClick={resetVehicleIdentifier}>
                  Reset
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Vehicle Identifier Drawer - Mobile */}
        <Drawer open={vehicleIdentifierOpen && isMobile} onOpenChange={setVehicleIdentifierOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="px-4 text-left">
              <DrawerTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Identify Vehicle Type
              </DrawerTitle>
              <DrawerDescription>
                Select the vehicle brand and model to identify its type category.
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="mobile-brand">Brand</Label>
                <Select value={selectedBrand} onValueChange={(value) => {
                  setSelectedBrand(value);
                  setSelectedModel('');
                  setIdentifiedType('');
                }}>
                  <SelectTrigger id="mobile-brand">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {getBrands().map((brand) => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBrand && (
                <div className="space-y-2">
                  <Label htmlFor="mobile-model">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="mobile-model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsByBrand(selectedBrand).map((model) => (
                        <SelectItem key={model.name} value={model.name}>{model.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {identifiedType && (
                <div className="p-4 rounded-lg bg-blue-50 border border-primary/20">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-primary">Identified Type</span>
                      </div>
                      <p className="text-2xl font-bold text-primary uppercase">{identifiedType}</p>
                    </div>
                    <VehicleIcon vehicleType={identifiedType} size={82} />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleIdentifyVehicle} className="flex-1">
                  Identify
                </Button>
                <Button variant="outline" onClick={resetVehicleIdentifier}>
                  Reset
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Service Availability Dialog - Desktop */}
        <Dialog open={serviceCheckerOpen && !isMobile} onOpenChange={(open) => {
          setServiceCheckerOpen(open);
          if (!open) resetServiceAvailability();
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Service Availability Check
              </DialogTitle>
              <DialogDescription>
                Check if our service is available at your location.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Customer Phone */}
              <div className="space-y-2">
                <Label htmlFor="service-phone">Customer Phone <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="service-phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={servicePhone}
                  onChange={(e) => setServicePhone(e.target.value)}
                />
              </div>

              {/* Vehicle Type */}
              <div className="space-y-2">
                <Label htmlFor="service-vehicle-type">Vehicle Type <span className="text-muted-foreground">(optional)</span></Label>
                <Select value={serviceVehicleType} onValueChange={setServiceVehicleType}>
                  <SelectTrigger id="service-vehicle-type">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {getVehicleTypes().map((type) => (
                      <SelectItem key={type} value={type.toLowerCase()}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Informational Note */}
              <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Provide more accurate results based on multiple criteria (customer eligibility, service history, vehicle-specific distance limits).</span>
                </p>
              </div>

              {/* Package Selection */}
              {serviceVehicleType && (
                <div className="space-y-2">
                  <Label htmlFor="service-package">Package (Optional)</Label>
                  <Select
                    value={servicePackageName}
                    onValueChange={setServicePackageName}
                    disabled={loadingPackages}
                  >
                    <SelectTrigger id="service-package">
                      <SelectValue placeholder={loadingPackages ? "Loading packages..." : "Select package"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.name}>
                          {pkg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Map Link */}
              <div className="space-y-2">
                <Label htmlFor="service-map-link">Google Maps Link</Label>
                <Input
                  id="service-map-link"
                  type="url"
                  placeholder="Paste Google Maps link"
                  value={serviceMapLink}
                  onChange={(e) => {
                    setServiceMapLink(e.target.value);
                    if (e.target.value) setServiceLocation('');
                  }}
                />
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t" />
                <span className="text-xs text-muted-foreground font-medium">OR</span>
                <div className="flex-1 border-t" />
              </div>

              {/* Location Name */}
              <div className="space-y-2">
                <Label htmlFor="service-location">Location Name</Label>
                <Input
                  id="service-location"
                  placeholder="Enter location/area name"
                  value={serviceLocation}
                  onChange={(e) => {
                    setServiceLocation(e.target.value);
                    if (e.target.value) setServiceMapLink('');
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Either map link or location name is required
                </p>
              </div>

              {/* Availability Result */}
              {availabilityResult && (
                <div className={`p-4 rounded-lg border ${availabilityResult.available
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${availabilityResult.available
                      ? 'bg-green-100'
                      : 'bg-red-100'
                      }`}>
                      {availabilityResult.available ? (
                        <MapPinCheck className={`h-6 w-6 ${availabilityResult.available
                          ? 'text-green-600'
                          : 'text-red-600'
                          }`} />
                      ) : (
                        <MapPinX className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold mb-1 ${availabilityResult.available
                        ? 'text-green-900'
                        : 'text-red-900'
                        }`}>
                        {availabilityResult.available ? 'Service Available!' : 'Service Unavailable'}
                      </h3>
                      {availabilityResult.available ? (
                        <div className="space-y-1 text-sm text-green-800">
                          <p><strong>Distance:</strong> {availabilityResult.distance_km} km</p>
                          <p><strong>Duration:</strong> ~{availabilityResult.duration_minutes} minutes</p>
                          <p><strong>Nearest Office:</strong> {availabilityResult.nearest_office?.name}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-red-800">{availabilityResult.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 pb-2">
                <Button
                  onClick={handleCheckAvailability}
                  className="flex-1"
                  disabled={checkingAvailability}
                >
                  {checkingAvailability ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Check Availability'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetServiceAvailability}
                  disabled={checkingAvailability}
                >
                  Reset
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Service Availability Drawer - Mobile */}
        <Drawer open={serviceCheckerOpen && isMobile} onOpenChange={(open) => {
          setServiceCheckerOpen(open);
          if (!open) resetServiceAvailability();
        }}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="px-4 text-left">
              <DrawerTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Service Availability Check
              </DrawerTitle>
              <DrawerDescription>
                Check if our service is available at your location.
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4 space-y-4 overflow-y-auto">
              {/* Customer Phone */}
              <div className="space-y-2">
                <Label htmlFor="mobile-service-phone">Customer Phone <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="mobile-service-phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={servicePhone}
                  onChange={(e) => setServicePhone(e.target.value)}
                />
              </div>

              {/* Vehicle Type */}
              <div className="space-y-2">
                <Label htmlFor="mobile-service-vehicle-type">Vehicle Type <span className="text-muted-foreground">(optional)</span></Label>
                <Select value={serviceVehicleType} onValueChange={setServiceVehicleType}>
                  <SelectTrigger id="mobile-service-vehicle-type">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {getVehicleTypes().map((type) => (
                      <SelectItem key={type} value={type.toLowerCase()}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Informational Note */}
              <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Provide more accurate results based on multiple criteria (customer eligibility, service history, vehicle-specific distance limits).</span>
                </p>
              </div>

              {/* Package Selection */}
              {serviceVehicleType && (
                <div className="space-y-2">
                  <Label htmlFor="mobile-service-package">Package (Optional)</Label>
                  <Select
                    value={servicePackageName}
                    onValueChange={setServicePackageName}
                    disabled={loadingPackages}
                  >
                    <SelectTrigger id="mobile-service-package">
                      <SelectValue placeholder={loadingPackages ? "Loading packages..." : "Select package"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.name}>
                          {pkg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Map Link */}
              <div className="space-y-2">
                <Label htmlFor="mobile-service-map-link">Google Maps Link</Label>
                <Input
                  id="mobile-service-map-link"
                  type="url"
                  placeholder="Paste Google Maps link"
                  value={serviceMapLink}
                  onChange={(e) => {
                    setServiceMapLink(e.target.value);
                    if (e.target.value) setServiceLocation('');
                  }}
                />
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t" />
                <span className="text-xs text-muted-foreground font-medium">OR</span>
                <div className="flex-1 border-t" />
              </div>

              {/* Location Name */}
              <div className="space-y-2">
                <Label htmlFor="mobile-service-location">Location Name</Label>
                <Input
                  id="mobile-service-location"
                  placeholder="Enter location/area name"
                  value={serviceLocation}
                  onChange={(e) => {
                    setServiceLocation(e.target.value);
                    if (e.target.value) setServiceMapLink('');
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Either map link or location name is required
                </p>
              </div>

              {/* Availability Result */}
              {availabilityResult && (
                <div className={`p-4 rounded-lg border ${availabilityResult.available
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${availabilityResult.available
                      ? 'bg-green-100'
                      : 'bg-red-100'
                      }`}>
                      {availabilityResult.available ? (
                        <MapPinCheck className={`h-6 w-6 ${availabilityResult.available
                          ? 'text-green-600'
                          : 'text-red-600'
                          }`} />
                      ) : (
                        <MapPinX className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold mb-1 ${availabilityResult.available
                        ? 'text-green-900'
                        : 'text-red-900'
                        }`}>
                        {availabilityResult.available ? 'Service Available!' : 'Service Unavailable'}
                      </h3>
                      {availabilityResult.available ? (
                        <div className="space-y-1 text-sm text-green-800">
                          <p><strong>Distance:</strong> {availabilityResult.distance_km} km</p>
                          <p><strong>Duration:</strong> ~{availabilityResult.duration_minutes} minutes</p>
                          <p><strong>Nearest Office:</strong> {availabilityResult.nearest_office?.name}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-red-800">{availabilityResult.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCheckAvailability}
                  className="flex-1"
                  disabled={checkingAvailability}
                >
                  {checkingAvailability ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Check Availability'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetServiceAvailability}
                  disabled={checkingAvailability}
                >
                  Reset
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Agents Available Sheet */}
        <Sheet open={agentsAvailableOpen} onOpenChange={setAgentsAvailableOpen}>
          <SheetContent side="bottom" className="h-screen p-0 flex flex-col sm:h-auto sm:max-w-md sm:p-6 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:right-auto sm:bottom-auto sm:rounded-lg">
            {/* Mobile App Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10 flex-shrink-0 sm:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Users2 className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold">Agents Available</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAgentsAvailableOpen(false)}
                className="rounded-full h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Desktop Dialog Header */}
            <DialogHeader className="text-left flex-shrink-0 hidden sm:flex">
              <DialogTitle className="flex items-center gap-2">
                <Users2 className="h-5 w-5 text-primary" />
                Agents Available Today
              </DialogTitle>
              <DialogDescription>
                View agents available for service today.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 p-4 pt-12 flex-1 overflow-y-auto sm:py-4">
              {loadingAgents ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : availableAgents.length > 0 ? (
                availableAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <LetterAvatar name={agent.name} size="md" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{agent.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>Checked in: {formatTime(agent.check_in_time)}</span>
                        {agent.is_late && <Badge2 variant="warning" className="text-[9px] h-4">Late</Badge2>}
                      </div>
                      {agent.office && (
                        <p className="text-xs text-muted-foreground mt-0.5">{agent.office}</p>
                      )}
                    </div>
                    <Badge2 variant="success" className="text-xs">Active</Badge2>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-200">
                  <Users2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-muted-foreground font-medium">No agents available</p>
                  <p className="text-xs text-muted-foreground mt-1">All agents have checked out today</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, change, icon, isLoading, vsLabel = "vs last month", onClick }) => (
  <Card
    className={cn(
      "overflow-hidden border-none shadow-sm md:border md:shadow-none transition-all duration-200",
      onClick && "cursor-pointer hover:shadow-md hover:border-primary-100 hover:bg-gray-50/50 active:scale-[0.98]"
    )}
    onClick={onClick}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white">
      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      <div className="p-2 bg-primary/5 rounded-lg">
        {icon}
      </div>
    </CardHeader>
    <CardContent className="bg-white">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn(
              "text-[11px] font-bold px-1.5 py-0.5 rounded-md",
              change.startsWith('+') ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
            )}>
              {change}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">{vsLabel}</span>
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

const ActivityItem = ({ text, time }) => (
  <div className="flex items-start space-x-3 p-3 rounded-xl bg-white border border-gray-100/50 active:bg-gray-50 transition-colors shadow-sm mb-2">
    <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-900 leading-tight">{text}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{time}</p>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
  </div>
);

const QuickActionButton = ({ children }) => (
  <button className="w-full text-left px-4 py-2 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-300 transition-colors">
    {children}
  </button>
);

const BookingItem = ({ order, onClick }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };


  return (
    <div
      className={cn("group p-4 rounded-2xl  border border-gray-100 shadow-sm active:scale-[0.98] active:bg-gray-50 transition-all duration-200 cursor-pointer overflow-hidden relative", order.assigned_agent_name ? "bg-white" : "bg-red-50 border-red-100/50")}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-bold text-gray-900 truncate pr-2">
              {order.customer_name || 'Unnamed Customer'}
            </h3>
            <span className="text-sm font-extrabold text-primary whitespace-nowrap">
              {formatCurrency(order.total_amount)}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">#{order.order_number}</span>
            <Badge2
              variant={order.status === 'completed' ? 'success' : order.status === 'confirmed' ? 'info' : 'warning'}
              className="text-[9px] h-4.5 px-1.5 leading-none font-bold"
            >
              {getStatusLabel(order.status)}
            </Badge2>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <Clock10 className="text-muted-foreground/70" size={11} />
                <span className="text-[11px] text-muted-foreground font-semibold">
                  {formatTime(order.booking_time_from)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="text-muted-foreground/70" size={11} />
                <span className="text-[11px] text-muted-foreground font-semibold truncate max-w-[80px]">
                  {order.area || 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pl-2">
              {order.assigned_agent_name ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100">
                  <LetterAvatar name={order.assigned_agent_name} size="xs" />
                  <span className="text-[10px] font-bold text-gray-600 truncate max-w-[50px]">
                    {order.assigned_agent_name.split(' ')[0]}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-destructive/80 bg-red-50 px-2 py-0.5 rounded-full border border-red-100/50">
                  Unassigned
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground/20 ml-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PerformanceBar = ({ label, value }) => (
  <div className="mb-4">
    <div className="flex justify-between text-xs font-semibold mb-1.5 uppercase tracking-wider text-muted-foreground">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const TransactionItem = ({ amount, customer, status }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm mb-2 active:bg-gray-50 transition-colors">
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
        <DollarSign size={14} />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">{customer}</p>
        <p className="text-[11px] text-muted-foreground font-medium">{amount}</p>
      </div>
    </div>
    <Badge2 variant={status === 'Completed' ? 'success' : 'warning'} className="text-[10px] h-5">
      {status}
    </Badge2>
  </div>
);

const SummaryItem = ({ label, value, percentage }) => (
  <div className="space-y-2 mb-4">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full">
      <div
        className="h-full bg-primary rounded-full transition-all duration-1000"
        style={{ width: percentage }}
      />
    </div>
  </div>
);

// Quick Link Components
const QuickLinkCard = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-95 transition-all"
  >
    <div className="p-3 bg-primary/10 rounded-full mb-2 text-primary">
      {icon}
    </div>
    <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
  </button>
);

const QuickLinkButton = ({ icon, label, description, onClick, className }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-300 transition-all active:scale-[0.98] ${className}`}
  >
    <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
      {icon}
    </div>
    <div className="text-left flex-1">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <ChevronRight className="h-4 w-4 text-muted-foreground/30 self-center" />
  </button>
);

// Dialogs should be added to the return statement in Dashboard component
// Move these to where dialogs are rendered

const CircularProgress = ({ percentage, color = "text-indigo-600", strokeWidth = 8, size = 80, label = "Rate" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        {/* Track circle */}
        <circle
          className="text-gray-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={cn("transition-all duration-500 ease-out", color)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-sm font-bold text-gray-800">{Math.round(percentage)}%</span>
        <span className="block text-[8px] font-semibold text-muted-foreground uppercase leading-none mt-0.5">{label}</span>
      </div>
    </div>
  );
};

const ResponseMeterCard = ({ title, stats, isLoading, onClick }) => {
  const { total_count = 0, contacted = 0, pending = 0, converted = 0 } = stats || {};

  // Calculate Conversion Rate: (Converted / Total) * 100
  const conversionRate = total_count > 0 ? (converted / total_count) * 100 : 0;

  const getProgressColor = (rate) => {
    if (rate >= 40) return "text-emerald-500";
    if (rate >= 20) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border-none shadow-sm md:border md:shadow-none transition-all duration-200 bg-white",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary-100 hover:bg-gray-50/50 active:scale-[0.98]"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-500" />
          {title}
        </CardTitle>
        <span className="text-[10px] hidden md:flex font-semibold text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
          Conversion Rate
        </span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-between py-2">
            <div className="grid grid-cols-3 gap-2 flex-1 pr-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
            <Skeleton className="h-16 w-16 rounded-full animate-pulse ml-2" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-3 gap-2 flex-1 pr-2">
              <div className="space-y-1 relative">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Pending</span>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "text-lg font-bold px-1.5 py-0.5 rounded-md",
                    pending > 0 ? "bg-red-50 text-red-600 font-extrabold" : "text-gray-900"
                  )}>
                    {pending}
                  </span>
                  {pending > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Contacted</span>
                <span className="text-lg font-bold text-indigo-600">{contacted}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Converted</span>
                <span className="text-lg font-bold text-emerald-600">{converted}</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <CircularProgress
                percentage={conversionRate}
                color={getProgressColor(conversionRate)}
                size={70}
                strokeWidth={7}
                label="Conv."
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TargetAchievementCard = ({ stats, isLoading }) => {
  const { target_amount = 0, achieved_amount = 0 } = stats || {};
  const percentage = target_amount > 0 ? (achieved_amount / target_amount) * 100 : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const size = 64;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <Card className="overflow-hidden border-none shadow-sm md:border md:shadow-none bg-white flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white">
        <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          Achievement
        </CardTitle>
        <span className="text-[10px] hidden md:flex font-semibold text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
          Goal
        </span>
      </CardHeader>
      <CardContent className="bg-white flex flex-col justify-center flex-1 py-2">
        {isLoading ? (
          <div className="flex items-center gap-3 w-full py-1">
            <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            {/* Left side: Round graph */}
            <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
              <svg className="transform -rotate-90 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
                {/* Track circle */}
                <circle
                  className="text-gray-100"
                  strokeWidth={strokeWidth}
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx={size / 2}
                  cy={size / 2}
                />
                {/* Progress circle */}
                <circle
                  className="text-emerald-500 transition-all duration-500 ease-out"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx={size / 2}
                  cy={size / 2}
                />
              </svg>
              {/* Center content */}
              <div className="absolute text-center flex items-center justify-center">
                <span className="text-xs font-extrabold text-gray-900 tracking-tight leading-none">
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>

            {/* Right side: Target & Achieved details */}
            <div className="flex-1 pl-3 flex flex-col justify-center space-y-1">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Achieved</p>
                <p className="text-sm font-extrabold text-emerald-600 mt-0.5">{formatCurrency(achieved_amount)}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Target</p>
                <p className="text-xs font-bold text-gray-500 mt-0.5">{formatCurrency(target_amount)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const PendingPaymentsCard = ({ stats, isLoading, onOrderClick }) => {
  const { total_amount = 0, count = 0, orders = [] } = stats || {};
  const [isOpen, setIsOpen] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getPaymentColorClasses = (amount) => {
    if (amount === 0) {
      return {
        text: "text-gray-500",
        badge: "bg-gray-50 text-gray-600 border-gray-100/50",
        iconBg: "bg-gray-50 text-gray-500",
      };
    }
    if (amount > 100) {
      return {
        text: "text-red-600",
        badge: "bg-red-50 text-red-600 border-red-100/50",
        iconBg: "bg-red-50 text-red-500",
      };
    }
    return {
      text: "text-amber-600",
      badge: "bg-amber-50 text-amber-600 border-amber-100/50",
      iconBg: "bg-amber-50 text-amber-500",
    };
  };

  const colors = getPaymentColorClasses(total_amount);

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden border-none shadow-sm md:border md:shadow-none transition-all duration-200 bg-white flex flex-col h-full",
          count > 0 && "cursor-pointer hover:shadow-md hover:border-primary-100 hover:bg-gray-50/50 active:scale-[0.98]"
        )}
        onClick={() => count > 0 && setIsOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pending Payments
          </CardTitle>
          <div className={cn("p-2 rounded-lg", colors.iconBg)}>
            <Clock10 className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="bg-white flex-1 flex flex-col justify-center">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ) : (
            <>
              <div className={cn("text-2xl font-bold tracking-tight", colors.text)}>{formatCurrency(total_amount)}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded-md border", colors.badge)}>
                  {count} {count === 1 ? 'order' : 'orders'} pending
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock10 className={cn("h-5 w-5", total_amount > 100 ? "text-red-500" : (total_amount === 0 ? "text-gray-500" : "text-amber-500"))} />
              Pending Payment Orders
            </DialogTitle>
            <DialogDescription>
              Showing orders with unpaid balances. Click any order to view details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 py-2">
            {orders.map((order) => {
              const orderAmount = order.total_amount || 0;
              const orderColor = orderAmount > 100 ? 'text-red-600' : (orderAmount === 0 ? 'text-gray-500' : 'text-amber-600');
              return (
                <div
                  key={order.id}
                  onClick={() => {
                    setIsOpen(false);
                    onOrderClick && onOrderClick(order.id);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 active:scale-[0.99] transition-all cursor-pointer text-sm"
                >
                  <div>
                    <p className="font-bold text-gray-900">#{order.order_number}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{order.customer_name || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold", orderColor)}>{formatCurrency(orderAmount)}</p>
                    <p className="text-[10px] text-muted-foreground">{format(parseISO(order.booking_date), 'dd MMM yyyy')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Dashboard;
