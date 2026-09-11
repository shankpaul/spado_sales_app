import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { DatePicker } from '../components/ui/date-picker';
import VehicleIcon from '../components/VehicleIcon';
import CustomerContact from '@/components/CustomerContact';
import CustomerDetails from '../components/CustomerDetails';
import LetterAvatar from '@/components/LetterAvatar';
import { Badge2 } from '@/components/ui/badge2';
import { toast } from 'sonner';
import subscriptionService from '../services/subscriptionService';
import {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_PAYMENT_STATUSES,
  PAYMENT_METHODS,
  ORDER_STATUSES,
  getStatusLabel,
  getStatusColor,
} from '../lib/constants';
import {
  ArrowLeft,
  Calendar,
  Calendar1Icon,
  CalendarClock,
  Clock,
  User,
  Phone,
  MapPin,
  Package,
  IndianRupee,
  Edit,
  Pause,
  Play,
  XCircle,
  Loader2,
  CheckCircle2,
  CheckCircle,
  Eye,
  MoreVertical,
  Repeat,
  ExternalLink,
  AlertTriangle,
  FileText,
  CreditCard,
  Ban,
  Layers,
} from 'lucide-react';
import { formatBookingTime } from '../lib/utilities';
import { format, parseISO } from 'date-fns';

/**
 * Subscription Detail Page
 * Modern, polished view matching Order Detail design patterns
 */
const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('packages');

  // Customer drawer
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);

  // Dialog states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSubscriptionDetails();
      fetchSubscriptionOrders();
    }
  }, [id]);

  const fetchSubscriptionDetails = async () => {
    if (!subscription) {
      setLoading(true);
    }
    try {
      const data = await subscriptionService.getSubscriptionById(id);
      setSubscription(data.subscription);
    } catch (error) {
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionOrders = async () => {
    try {
      const data = await subscriptionService.getSubscriptionOrders(id);
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch subscription orders', error);
    }
  };

  const handlePauseResume = async () => {
    try {
      if (subscription.status === 'active') {
        await subscriptionService.pauseSubscription(id);
        toast.success('Subscription paused successfully');
      } else if (subscription.status === 'paused') {
        await subscriptionService.resumeSubscription(id);
        toast.success('Subscription resumed successfully');
      }
      fetchSubscriptionDetails();
    } catch (error) {
      toast.error('Failed to update subscription');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await subscriptionService.cancelSubscription(id);
      toast.success('Subscription cancelled successfully');
      setIsCancelDialogOpen(false);
      fetchSubscriptionDetails();
    } catch (error) {
      toast.error('Failed to cancel subscription');
    }
  };

  const handleUpdatePayment = async () => {
    if (!paymentAmount || !paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }

    setPaymentLoading(true);
    try {
      await subscriptionService.updatePayment(id, {
        payment_amount: parseFloat(paymentAmount),
        payment_date: paymentDate ? new Date(paymentDate + 'T00:00:00Z').toISOString() : null,
        payment_method: paymentMethod,
      });
      toast.success('Payment updated successfully');
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentDate('');
      setPaymentMethod('');
      fetchSubscriptionDetails();
    } catch (error) {
      toast.error('Failed to update payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getBadgeVariant = (status, type = 'status') => {
    if (status === 'scheduled') return 'amber';

    if (type === 'order') {
      if (status === 'completed') return 'success';
      if (status === 'scheduled') return 'amber';
      if (status === 'confirmed' || status === 'in_progress') return 'info';
      if (status === 'cancelled') return 'destructive';
      return 'secondary';
    }

    if (type === 'payment') {
      if (status === 'paid') return 'success';
      if (status === 'partial') return 'warning';
      return 'destructive';
    }

    if (type === 'status') {
      if (status === 'active') return 'success';
      if (status === 'paused') return 'warning';
      if (status === 'scheduled') return 'amber';
      if (status === 'cancelled') return 'destructive';
      if (status === 'completed' || status === 'expired') return 'secondary';
    }

    return 'outline';
  };

  const canUpdatePayment = subscription && ['pending', 'partial'].includes(subscription.payment_status);

  if (loading && !subscription) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header Skeleton */}
        <div className="border-b sticky top-0 z-10 bg-white">
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-36" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
              <Skeleton className="h-48 rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Subscription not found</p>
          <Button onClick={() => navigate('/subscriptions')} className="mt-4">
            Back to Subscriptions
          </Button>
        </div>
      </div>
    );
  }

  const totalAmount = subscription.subscription_amount || 0;
  const subscriptionTotal = totalAmount * (subscription.months_duration || 1);
  const balance = Math.max(0, subscriptionTotal - (subscription.payment_amount || 0));

  // End Date calculation
  const getEndDate = () => {
    if (!subscription.start_date) return null;
    try {
      const d = new Date(subscription.start_date);
      d.setMonth(d.getMonth() + (subscription.months_duration || 1));
      return d.toISOString();
    } catch {
      return null;
    }
  };

  // Wash completion statistics
  const totalWashes = subscription.washing_schedules?.length || 0;
  const completedWashes = orders.filter((o) => o.status === 'completed').length;
  const pendingWashes = Math.max(0, totalWashes - completedWashes);
  const progressPercent = totalWashes > 0 ? Math.round((completedWashes / totalWashes) * 100) : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <div className="border-b sticky top-0 z-30 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="px-4 sm:px-6">
          <div className="flex flex-col py-2 sm:h-16 justify-center">
            {/* Top Row: Navigation, Badges, and Action Buttons */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="rounded-full flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl sm:text-2xl font-semibold truncate tracking-tight">
                  #SUB-{subscription.id}
                </h1>

                <Badge2 variant={getBadgeVariant(subscription.status)} className="text-[10px] sm:text-xs">
                  {subscription.status === 'scheduled' ? (
                    <Clock className="h-3 w-3 mr-1" />
                  ) : subscription.status === 'paused' ? (
                    <Pause className="h-3 w-3 mr-1 text-yellow-600" />
                  ) : subscription.status === 'cancelled' ? (
                    <XCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <Repeat className="h-3 w-3 mr-1" />
                  )}
                  {getStatusLabel(subscription.status, SUBSCRIPTION_STATUSES)}
                </Badge2>

                <Badge2 variant={getBadgeVariant(subscription.payment_status, 'payment')} className="text-[10px] sm:text-xs hidden sm:inline-flex">
                  <IndianRupee className="h-3 w-3 mr-1" />
                  {getStatusLabel(subscription.payment_status, SUBSCRIPTION_PAYMENT_STATUSES)}
                </Badge2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {subscription.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePauseResume}
                    className="hidden sm:inline-flex gap-1.5 text-xs font-semibold"
                  >
                    <Pause className="h-3.5 w-3.5 text-yellow-600" />
                    Pause
                  </Button>
                )}

                {subscription.status === 'paused' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePauseResume}
                    className="hidden sm:inline-flex gap-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume
                  </Button>
                )}


                {/* More Options Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {subscription.status === 'active' && (
                      <DropdownMenuItem onClick={handlePauseResume}>
                        <Pause className="h-4 w-4 mr-2 text-yellow-600" />
                        Pause Subscription
                      </DropdownMenuItem>
                    )}
                    {subscription.status === 'paused' && (
                      <DropdownMenuItem onClick={handlePauseResume} className="text-green-600 focus:text-green-600">
                        <Play className="h-4 w-4 mr-2" />
                        Resume Subscription
                      </DropdownMenuItem>
                    )}
                    {canUpdatePayment && (
                      <DropdownMenuItem
                        onClick={() => {
                          setPaymentAmount(balance.toString());
                          setIsPaymentDialogOpen(true);
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Update Payment
                      </DropdownMenuItem>
                    )}
                    {subscription.status !== 'cancelled' && subscription.status !== 'expired' && (
                      <DropdownMenuItem
                        onClick={() => setIsCancelDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Cancel Subscription
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile-only Payment Badge Row */}
            <div className="flex sm:hidden items-center gap-2 mt-1.5 ml-11">
              <Badge2 variant={getBadgeVariant(subscription.payment_status, 'payment')} className="text-[10px]">
                <IndianRupee className="h-3 w-3 mr-0.5" />
                {getStatusLabel(subscription.payment_status, SUBSCRIPTION_PAYMENT_STATUSES)}
              </Badge2>
            </div>
          </div>
        </div>
      </div>

      {/* Cancelled Alert Banner */}
      {subscription.status === 'cancelled' && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-full flex-shrink-0">
              <XCircle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-red-900">Subscription Cancelled</h3>
              <p className="mt-0.5 text-xs text-red-700">
                This subscription has been cancelled. Scheduled orders will no longer be fulfilled.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Paused Alert Banner */}
      {subscription.status === 'paused' && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-100 text-yellow-700 rounded-full flex-shrink-0">
              <Pause className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-yellow-900">Subscription Paused</h3>
                <p className="mt-0.5 text-xs text-yellow-800">
                  Washing schedules are temporarily suspended. Resume whenever customer is ready.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handlePauseResume}
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs h-8 gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Resume Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details & Tabs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Meta Strip */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground bg-gray-50 border rounded-xl px-4 py-2.5">
              <span>
                Started{' '}
                <span className="font-semibold text-foreground">
                  {formatDate(subscription.start_date)}
                </span>
              </span>
              <span className="text-gray-300">•</span>
              <span>
                Customer{' '}
                <button
                  type="button"
                  onClick={() => setIsCustomerDetailsOpen(true)}
                  className="font-semibold text-foreground hover:text-primary hover:underline cursor-pointer"
                >
                  {subscription.customer?.name || 'N/A'}
                </button>
              </span>
              <span className="text-gray-300">•</span>
              <span>
                Duration{' '}
                <span className="font-semibold text-foreground">
                  {subscription.months_duration} {subscription.months_duration === 1 ? 'Month' : 'Months'}
                </span>
              </span>
              <span className="text-gray-300">•</span>
              <span className="capitalize">
                Vehicle{' '}
                <span className="font-semibold text-foreground">
                  {subscription.vehicle_type || 'N/A'}
                </span>
              </span>
              <span className="text-gray-300">•</span>
              <span>
                Washes{' '}
                <span className="font-semibold text-foreground">{totalWashes} Total</span>
              </span>
              {subscription.area && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>
                    Area <span className="font-semibold text-foreground">{subscription.area}</span>
                  </span>
                </>
              )}
            </div>

            {/* Quick Cards Grid: Service Location & Subscription Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Service Location Card */}
              <div className="bg-white border rounded-xl p-4 shadow-xs flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-full flex-shrink-0 text-primary">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground opacity-70 block mb-1">
                    Service Location
                  </span>
                  <p className="text-sm font-semibold capitalize text-foreground leading-tight truncate">
                    {subscription.area || 'No location specified'}
                  </p>
                  <div className="flex flex-wrap gap-2 items-center mt-2">
                    {subscription.map_url && (
                      <a
                        href={subscription.map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 bg-primary/5 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> View on Map
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Period & Vehicle Card */}
              <div className="bg-white border rounded-xl p-4 shadow-xs flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-full flex-shrink-0 text-blue-600">
                  <Calendar1Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground opacity-70 block">
                      Period & Vehicle
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary text-xs font-semibold capitalize">
                      <VehicleIcon vehicleType={subscription.vehicle_type} size={14} />
                      <span>{subscription.vehicle_type}</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {formatDate(subscription.start_date)} – {formatDate(getEndDate())}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {subscription.months_duration} {subscription.months_duration === 1 ? 'month' : 'months'} subscription plan
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Information Card */}
            <div className="bg-white border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <LetterAvatar
                  name={subscription.customer?.name}
                  size="md"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsCustomerDetailsOpen(true)}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomerDetailsOpen(true)}
                      className="font-semibold text-base text-foreground hover:text-primary hover:underline cursor-pointer text-left"
                    >
                      {subscription.customer?.name || 'Customer'}
                    </button>
                  </div>
                  <div className="mt-1">
                    {subscription.customer?.phone ? (
                      <CustomerContact
                        phone={subscription.customer.phone}
                        customerName={subscription.customer.name}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No phone number</span>
                    )}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomerDetailsOpen(true)}
                className="text-xs h-8 gap-1.5 shrink-0"
              >
                <User className="h-3.5 w-3.5" />
                View Profile
              </Button>
            </div>

            {/* Tabs for Packages & Add-ons, Washing Schedules, and Order History */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="bg-gray-100 p-1 rounded-xl h-10 w-full sm:w-auto flex">
                <TabsTrigger
                  value="packages"
                  className="flex-1 sm:flex-initial text-xs sm:text-sm gap-2 data-[state=active]:bg-white data-[state=active]:shadow-xs rounded-lg"
                >
                  <Package className="h-4 w-4" />
                  <span>Packages & Add-ons</span>
                  <span className="ml-1 text-[11px] font-semibold px-1.5 py-0.2 bg-gray-200 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full">
                    {(subscription.subscription_packages?.length || 0) +
                      (subscription.subscription_addons?.length || 0)}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="schedules"
                  className="flex-1 sm:flex-initial text-xs sm:text-sm gap-2 data-[state=active]:bg-white data-[state=active]:shadow-xs rounded-lg"
                >
                  <CalendarClock className="h-4 w-4" />
                  <span>Washing Schedules</span>
                  <span className="ml-1 text-[11px] font-semibold px-1.5 py-0.2 bg-gray-200 rounded-full">
                    {totalWashes}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="orders"
                  className="flex-1 sm:flex-initial text-xs sm:text-sm gap-2 data-[state=active]:bg-white data-[state=active]:shadow-xs rounded-lg"
                >
                  <Repeat className="h-4 w-4" />
                  <span>Order History</span>
                  <span className="ml-1 text-[11px] font-semibold px-1.5 py-0.2 bg-gray-200 rounded-full">
                    {orders.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Packages & Add-ons */}
              <TabsContent value="packages" className="space-y-4 focus-visible:outline-none">
                <div className="rounded-xl border bg-white shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 border-b bg-gray-50/60 flex items-center justify-between">
                    <h3 className="font-semibold text-base">Included Packages</h3>
                    <span className="text-xs text-muted-foreground font-medium">
                      {subscription.subscription_packages?.length || 0} package(s)
                    </span>
                  </div>

                  <div className="divide-y">
                    {subscription.subscription_packages?.map((pkg, index) => (
                      <div
                        key={index}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/40 transition-colors"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="p-2.5 bg-primary/10 rounded-xl text-primary flex-shrink-0 mt-0.5">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm sm:text-base text-foreground">
                              {pkg.package?.name || `Package ${index + 1}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Qty: {pkg.quantity} × {formatCurrency(pkg.unit_price)} / month
                              {pkg.discount_value > 0 && (
                                <span className="text-green-600 font-medium ml-1.5">
                                  (-{formatCurrency(pkg.discount_value)} discount)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end">
                          <p className="font-bold text-base text-foreground">
                            {formatCurrency(pkg.price)}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium">per month</p>
                        </div>
                      </div>
                    ))}

                    {(!subscription.subscription_packages ||
                      subscription.subscription_packages.length === 0) && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No packages configured for this subscription.
                        </div>
                      )}
                  </div>
                </div>

                {/* Addons List */}
                {subscription.subscription_addons?.length > 0 && (
                  <div className="rounded-xl border bg-white shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 border-b bg-gray-50/60 flex items-center justify-between">
                      <h3 className="font-semibold text-base">Selected Add-ons</h3>
                      <span className="text-xs text-muted-foreground font-medium">
                        {subscription.subscription_addons.length} add-on(s)
                      </span>
                    </div>

                    <div className="divide-y">
                      {subscription.subscription_addons.map((addon, index) => (
                        <div
                          key={index}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/40 transition-colors"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 flex-shrink-0 mt-0.5">
                              <Layers className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm sm:text-base text-foreground">
                                {addon.addon_name || `Add-on ${index + 1}`}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Qty: {addon.quantity} × {formatCurrency(addon.unit_price)}
                              </p>
                            </div>
                          </div>
                          <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end">
                            <p className="font-bold text-base text-foreground">
                              {formatCurrency(addon.price)}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium">one-time / plan</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Washing Schedules */}
              <TabsContent value="schedules" className="space-y-4 focus-visible:outline-none">
                <div className="rounded-xl border bg-white shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 border-b bg-gray-50/60 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-base">Washing Schedule Roster</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {totalWashes} planned washes across {subscription.months_duration} month(s)
                      </p>
                    </div>
                    <Badge2 variant="outline" className="text-xs">
                      {completedWashes} Completed
                    </Badge2>
                  </div>

                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {subscription.washing_schedules?.map((schedule, index) => {
                      const order = orders.find((o) => o.booking_date === schedule.date);

                      return (
                        <div
                          key={index}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              #{index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">
                                {formatDate(schedule.date)}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {schedule.time_from} - {schedule.time_to}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {order ? (
                              <div className="flex items-center gap-2">
                                {order.status === 'completed' ? (
                                  <Badge2 variant="success">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge2>
                                ) : order.status === 'cancelled' ? (
                                  <Badge2 variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Cancelled
                                  </Badge2>
                                ) : (
                                  <Badge2 variant="amber">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Scheduled
                                  </Badge2>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/orders?orderId=${order.id}`)}
                                  className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/5 gap-1"
                                >
                                  <span>#{order.order_number}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Badge2 variant="outline" className="text-muted-foreground">
                                Pending Generation
                              </Badge2>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {(!subscription.washing_schedules ||
                      subscription.washing_schedules.length === 0) && (
                        <div className="text-center py-10 text-sm text-muted-foreground">
                          No washing schedules found for this subscription.
                        </div>
                      )}
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Order History */}
              <TabsContent value="orders" className="space-y-4 focus-visible:outline-none">
                <div className="rounded-xl border bg-white shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 border-b bg-gray-50/60 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-base">Generated Orders</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Orders created under this subscription
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {orders.length} Order(s)
                    </span>
                  </div>

                  {orders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/40">
                            <TableHead className="font-semibold">Order #</TableHead>
                            <TableHead className="font-semibold">Date & Time</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Assigned Agent</TableHead>
                            <TableHead className="font-semibold text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-gray-50/60">
                              <TableCell className="font-semibold text-primary">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/orders?orderId=${order.id}`)}
                                  className="hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  #{order.order_number}
                                </button>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex flex-col text-xs">
                                  <span className="font-medium text-foreground">
                                    {formatDate(order.booking_date)}
                                  </span>
                                  {formatBookingTime(order.booking_time_from, order.booking_time_to) && (
                                    <span className="text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <Clock className="h-3 w-3" />
                                      {formatBookingTime(order.booking_time_from, order.booking_time_to)}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge2 variant={getBadgeVariant(order.status, 'order')}>
                                  {getStatusLabel(order.status, ORDER_STATUSES)}
                                </Badge2>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs">
                                {order.assigned_agent_name ? (
                                  <span className="font-medium text-foreground">
                                    {order.assigned_agent_name}
                                  </span>
                                ) : (
                                  <Badge2 variant="destructive" className="text-[10px] py-0">
                                    Unassigned
                                  </Badge2>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/orders?orderId=${order.id}`)}
                                  className="h-8 px-2.5 text-xs text-primary hover:bg-primary/5"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Repeat className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm font-medium">No orders generated yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Orders will appear here once created for the scheduled washes.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Notes Card */}
            {subscription.notes && (
              <div className="rounded-xl border bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-2 text-foreground font-semibold text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Subscription Notes</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-muted-foreground border">
                  {subscription.notes}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Payment Details Card (Styled identically to OrderDetail) */}
            <div className="rounded-xl border bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gray-50/60">
                <h3 className="font-semibold text-base">Payment Details</h3>
                <div className="flex items-center gap-2">
                  {subscription.payment_method && (
                    <Badge2 variant="outline" className="text-xs uppercase">
                      {subscription.payment_method.replace('_', ' ')}
                    </Badge2>
                  )}
                  <Badge2 variant={getBadgeVariant(subscription.payment_status, 'payment')}>
                    {getStatusLabel(subscription.payment_status, SUBSCRIPTION_PAYMENT_STATUSES)}
                  </Badge2>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {/* Balance Due Notice */}
                {balance > 0 && canUpdatePayment && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50/80 border border-orange-200/80 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                        <IndianRupee className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-orange-950">
                          Balance Due: {formatCurrency(balance)}
                        </p>
                        <p className="text-[11px] text-orange-800/80">
                          Payment pending for this subscription
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setPaymentAmount(balance.toString());
                        setIsPaymentDialogOpen(true);
                      }}
                      className="text-xs h-7 px-2 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Record
                    </Button>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Per Month</span>
                  <span className="font-medium">{formatCurrency(totalAmount)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{subscription.months_duration} month(s)</span>
                </div>

                {subscription.gst_amount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        {formatCurrency(
                          subscriptionTotal -
                          (subscription.gst_amount || 0) -
                          (subscription.round_off || 0)
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        GST {subscription.gst_percentage ? `(${subscription.gst_percentage}%)` : ''}
                      </span>
                      <span className="font-medium">{formatCurrency(subscription.gst_amount)}</span>
                    </div>

                    {subscription.round_off != null && subscription.round_off !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Round Off</span>
                        <span
                          className={`font-medium ${subscription.round_off >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                        >
                          {subscription.round_off >= 0 ? '+' : ''}
                          {formatCurrency(Math.abs(subscription.round_off))}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="border-t pt-3 mt-1 flex justify-between items-center">
                  <span className="font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold">{formatCurrency(subscriptionTotal)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(subscription.payment_amount || 0)}
                  </span>
                </div>

                {balance > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Balance</span>
                    <span className="font-bold text-orange-600">{formatCurrency(balance)}</span>
                  </div>
                )}

                {subscription.payment_date && (
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Last Payment Date</span>
                    <span className="font-medium text-foreground">
                      {formatDate(subscription.payment_date)}
                    </span>
                  </div>
                )}

                {canUpdatePayment && (
                  <div className="pt-2">
                    <Button
                      variant="info"
                      className="w-full "
                      onClick={() => {
                        setPaymentAmount(balance.toString());
                        setIsPaymentDialogOpen(true);
                      }}
                    >
                      <CreditCard className="h-4 w-4" />
                      Update Payment Details
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Wash Progress & Statistics Card */}
            <div className="rounded-xl border bg-white shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b bg-gray-50/60">
                <h3 className="font-semibold text-base">Washing Progress</h3>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="text-foreground">
                      {completedWashes} / {totalWashes} Washes ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-2.5 rounded-lg bg-gray-50 border">
                    <p className="text-lg font-bold text-foreground">{totalWashes}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Total
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-green-50/60 border border-green-100">
                    <p className="text-lg font-bold text-green-700">{completedWashes}</p>
                    <p className="text-[10px] uppercase font-bold text-green-800/80 tracking-wider">
                      Done
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-orange-50/60 border border-orange-100">
                    <p className="text-lg font-bold text-orange-700">{pendingWashes}</p>
                    <p className="text-[10px] uppercase font-bold text-orange-800/80 tracking-wider">
                      Pending
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-xl border bg-white shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b bg-gray-50/60">
                <h3 className="font-semibold text-base">Subscription Actions</h3>
              </div>
              <div className="p-5 space-y-2.5">
                {subscription.status === 'active' && (
                  <Button
                    variant="outline"
                    onClick={handlePauseResume}
                    className="w-full  gap-2 text-xs"
                  >
                    <Pause className="h-4 w-4 text-yellow-600" />
                    Pause Subscription
                  </Button>
                )}
                {subscription.status === 'paused' && (
                  <Button
                    variant="outline"
                    onClick={handlePauseResume}
                    className="w-full  gap-2 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                  >
                    <Play className="h-4 w-4 text-green-600" />
                    Resume Subscription
                  </Button>
                )}
                {subscription.status !== 'cancelled' && subscription.status !== 'expired' && (
                  <Button
                    variant="destructive"
                    onClick={() => setIsCancelDialogOpen(true)}
                    className="w-full gap-2 text-xs"
                  >
                    <Ban className="h-4 w-4" />
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Details Drawer / Dialog */}
      <CustomerDetails
        customer={subscription.customer}
        open={isCustomerDetailsOpen}
        onOpenChange={setIsCustomerDetailsOpen}
      />

      {/* Update Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Subscription Payment</DialogTitle>
            <DialogDescription>
              Record a new payment for this subscription
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="paymentAmount" className="text-xs font-semibold">
                  Payment Amount (₹) *
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-6 text-xs px-2 text-primary hover:bg-primary/5"
                  onClick={() => setPaymentAmount(Math.max(0, balance).toString())}
                >
                  Pay Full Balance: {formatCurrency(balance)}
                </Button>
              </div>
              <Input
                id="paymentAmount"
                type="number"
                min="0"
                max={balance}
                value={paymentAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > balance) {
                    setPaymentAmount(balance.toString());
                    toast.error(`Amount cannot exceed balance of ${formatCurrency(balance)}`);
                  } else {
                    setPaymentAmount(e.target.value);
                  }
                }}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label htmlFor="paymentDate" className="text-xs font-semibold mb-1.5 block">
                Payment Date
              </Label>
              <DatePicker
                date={paymentDate ? new Date(paymentDate) : null}
                onDateChange={(date) => setPaymentDate(date ? format(date, 'yyyy-MM-dd') : '')}
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod" className="text-xs font-semibold mb-1.5 block">
                Payment Method *
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
                disabled={paymentLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdatePayment} disabled={paymentLoading}>
                {paymentLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel subscription #SUB-{subscription.id} and cancel all future scheduled washes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionDetail;
