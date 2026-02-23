import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge2 } from '../components/ui/badge2';
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
  UserSearch
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
 */
const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
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
          setAvailablePackages(response.packages || []);
        } catch (error) {
          console.error('Error fetching packages:', error);
          toast.error('Failed to load packages');
          setAvailablePackages([]);
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
      console.error('Error checking availability:', error);
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
          console.error('Error fetching agents:', error);
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
  const AdminDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="$12,458"
          change="+12.5%"
          icon={<DollarSign className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Customers"
          value="1,248"
          change="+8.2%"
          icon={<Users className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Today's Bookings"
          value="32"
          change="+5.1%"
          icon={<Calendar className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Services"
          value="12"
          change="+2.3%"
          icon={<Car className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              Recent Activity
            </CardTitle>
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
                <ActivityItem text="New booking from John Doe" time="5 minutes ago" />
                <ActivityItem text="Payment received for #12345" time="15 minutes ago" />
                <ActivityItem text="Service completed for #12344" time="1 hour ago" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <QuickActionButton>New Booking</QuickActionButton>
              <QuickActionButton>Add Customer</QuickActionButton>
              <QuickActionButton>View Reports</QuickActionButton>
              <QuickActionButton>Manage Staff</QuickActionButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Sales Executive Dashboard
  const SalesExecutiveDashboard = () => (
    <div className="space-y-6">
      {/* this feature will enabled later */}
      {/* <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard
          title="My Sales Today"
          value="$2,450"
          change="+15.3%"
          icon={<DollarSign className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="New Customers"
          value="24"
          change="+12.0%"
          icon={<UserCheck className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Bookings"
          value="8"
          change="-3.5%"
          icon={<Calendar className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Completed Today"
          value="18"
          change="+7.8%"
          icon={<Car className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
      </div> */}

      {/* Quick Links - Mobile Only */}
      <div className="md:hidden grid grid-cols-3 gap-2">
        <QuickLinkCard
          icon={<Car className="h-5 w-5" />}
          label="Vehicle Type"
          onClick={() => setVehicleIdentifierOpen(true)}
        />
        <QuickLinkCard
          icon={<MapPin className="h-5 w-5" />}
          label="Area Checker"
          onClick={() => setServiceCheckerOpen(true)}
        />
        <QuickLinkCard
          icon={<Users2 className="h-5 w-5" />}
          label="Agents"
          onClick={() => setAgentsAvailableOpen(true)}
        />
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary-600" />
                Quick Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickLinkButton
                icon={<Car className="h-5 w-5" />}
                label="Identify Vehicle Type"
                description="Check vehicle category"
                onClick={() => setVehicleIdentifierOpen(true)}
              />
              <QuickLinkButton
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Service Area Checker"
                description="Check area is serviceable"
                onClick={() => setServiceCheckerOpen(true)}
              />
              <QuickLinkButton
                icon={<Users2 className="h-5 w-5" />}
                label="Agents Today"
                description="View available agents"
                onClick={() => setAgentsAvailableOpen(true)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );

  // Accountant Dashboard
  const AccountantDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value="$3,842"
          change="+18.2%"
          icon={<DollarSign className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Payments"
          value="$1,205"
          change="-5.3%"
          icon={<TrendingUp className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Transactions Today"
          value="48"
          change="+9.7%"
          icon={<BarChart3 className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Monthly Revenue"
          value="$45,230"
          change="+22.1%"
          icon={<DollarSign className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
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
      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b md:hidden">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LetterAvatar name={user?.name} size="md" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Welcome back,</p>
              <h2 className="text-sm font-bold truncate max-w-[150px]">{user?.name || user?.email}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-10 w-10"
              onClick={() => navigate('/customers')}
            >
              <UserSearch className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Desktop Header - Hidden on Mobile */}
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'admin' && 'Admin Dashboard'}
            {user?.role === 'sales_executive' && 'Sales Dashboard'}
            {user?.role === 'accountant' && 'Financial Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name || user?.email}!
          </p>
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

        {/* Vehicle Identifier Sheet */}
        <Sheet open={vehicleIdentifierOpen} onOpenChange={setVehicleIdentifierOpen}>
          <SheetContent side="bottom" className="h-screen p-0 sm:h-auto sm:max-w-md sm:p-6 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:right-auto sm:bottom-auto sm:rounded-lg">
            {/* Mobile App Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10 sm:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold">Vehicle Type Identifier</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVehicleIdentifierOpen(false)}
                className="rounded-full h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Desktop Dialog Header */}
            <DialogHeader className="text-left flex-shrink-0 hidden sm:flex">
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Identify Vehicle Type
              </DialogTitle>
              <DialogDescription>
                Select the vehicle brand and model to identify its type category.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 p-4 flex-1 overflow-y-auto sm:py-4">
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
          </SheetContent>
        </Sheet>

        {/* Service Availability Sheet */}
        <Sheet open={serviceCheckerOpen} onOpenChange={(open) => {
          setServiceCheckerOpen(open);
          if (!open) resetServiceAvailability();
        }}>
          <SheetContent side="bottom" className="h-screen p-0 sm:h-auto sm:max-w-md sm:p-6 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:right-auto sm:bottom-auto sm:rounded-lg">
            {/* Mobile App Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10 sm:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold">Service Availability</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setServiceCheckerOpen(false)}
                className="rounded-full h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Desktop Dialog Header */}
            <DialogHeader className="text-left flex-shrink-0 hidden sm:flex">
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Service Availability Check
              </DialogTitle>
              <DialogDescription>
                Check if our service is available at your location.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 p-4 flex-1 overflow-y-auto sm:py-4">
              {/* Customer Phone */}
              <div className="space-y-2">
                <Label htmlFor="service-phone">Customer Phone</Label>
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
                <Label htmlFor="service-vehicle-type">Vehicle Type</Label>
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
                  <span>Customer phone and vehicle type are optional but provide more accurate results based on multiple criteria (customer eligibility, service history, vehicle-specific distance limits).</span>
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
                <div className={`p-4 rounded-lg border ${
                  availabilityResult.available 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      availabilityResult.available 
                        ? 'bg-green-100' 
                        : 'bg-red-100'
                    }`}>
                      {availabilityResult.available ? (
                        <MapPinCheck className={`h-6 w-6 ${
                          availabilityResult.available 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`} />
                      ) : (
                        <MapPinX className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold mb-1 ${
                        availabilityResult.available 
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
          </SheetContent>
        </Sheet>

        {/* Agents Available Sheet */}
        <Sheet open={agentsAvailableOpen} onOpenChange={setAgentsAvailableOpen}>
          <SheetContent side="bottom" className="h-screen p-0 sm:h-auto sm:max-w-md sm:p-6 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:right-auto sm:bottom-auto sm:rounded-lg">
            {/* Mobile App Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10 sm:hidden">
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
            
            <div className="space-y-3 p-4 flex-1 overflow-y-auto sm:py-4">
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
const StatCard = ({ title, value, change, icon, isLoading }) => (
  <Card className="overflow-hidden border-none shadow-sm md:border-1 md:shadow-none active:scale-[0.98] transition-all duration-200">
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
            <span className="text-[10px] text-muted-foreground font-medium">vs last month</span>
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

const QuickLinkButton = ({ icon, label, description, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-300 transition-all active:scale-[0.98]"
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

export default Dashboard;
