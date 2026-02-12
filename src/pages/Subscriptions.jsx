import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import SubscriptionWizard from '../components/SubscriptionWizard';
import { toast } from 'sonner';
import subscriptionService from '../services/subscriptionService';
import {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_PAYMENT_STATUSES,
  getStatusLabel
} from '../lib/constants';
import {
  Plus,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Package,
  IndianRupee,
  MapPin,
  Pause,
  Play,
  X as XIcon,
  Car,
  Truck,
  Repeat,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge2 } from '@/components/ui/badge2';
import LetterAvatar from '@/components/LetterAvatar';
import { cn } from '@/lib/utils';
import { Skeleton } from '../components/ui/skeleton';

/**
 * Subscriptions Page Component
 * Lists all subscriptions with filters, search, and dual pagination
 */
const Subscriptions = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // States
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Filter states (active filters)
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Temporary filter states (for filter sheet)
  const [tempStatusFilter, setTempStatusFilter] = useState('');
  const [tempPaymentStatusFilter, setTempPaymentStatusFilter] = useState('');
  const [tempVehicleTypeFilter, setTempVehicleTypeFilter] = useState('');
  const [tempStartDateFrom, setTempStartDateFrom] = useState('');
  const [tempStartDateTo, setTempStartDateTo] = useState('');

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null);

  // Refs for infinite scroll
  const observerTarget = useRef(null);
  const isLoadingMore = useRef(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load persisted filters
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        const saved = localStorage.getItem('subscriptionsFilters');
        if (saved) {
          const { status, paymentStatus, vehicleType, dateFrom, dateTo, search } = JSON.parse(saved);
          if (status) {
            setStatusFilter(status);
            setTempStatusFilter(status);
          }
          if (paymentStatus) {
            setPaymentStatusFilter(paymentStatus);
            setTempPaymentStatusFilter(paymentStatus);
          }
          if (vehicleType) {
            setVehicleTypeFilter(vehicleType);
            setTempVehicleTypeFilter(vehicleType);
          }
          if (dateFrom) {
            setStartDateFrom(dateFrom);
            setTempStartDateFrom(dateFrom);
          }
          if (dateTo) {
            setStartDateTo(dateTo);
            setTempStartDateTo(dateTo);
          }
          if (search) setSearchTerm(search);
        }
      } catch (error) {
        console.error('Error loading filters:', error);
      }
    };
    loadPersistedState();
  }, []);

  // Sync temp filters when sheet opens
  useEffect(() => {
    if (isFilterOpen) {
      setTempStatusFilter(statusFilter);
      setTempPaymentStatusFilter(paymentStatusFilter);
      setTempVehicleTypeFilter(vehicleTypeFilter);
      setTempStartDateFrom(startDateFrom);
      setTempStartDateTo(startDateTo);
    }
  }, [isFilterOpen, statusFilter, paymentStatusFilter, vehicleTypeFilter, startDateFrom, startDateTo]);

  // Save filters to localStorage
  useEffect(() => {
    const filters = {
      status: statusFilter,
      paymentStatus: paymentStatusFilter,
      vehicleType: vehicleTypeFilter,
      dateFrom: startDateFrom,
      dateTo: startDateTo,
      search: searchTerm,
    };
    localStorage.setItem('subscriptionsFilters', JSON.stringify(filters));
  }, [statusFilter, paymentStatusFilter, vehicleTypeFilter, startDateFrom, startDateTo, searchTerm]);

  // Fetch subscriptions on filter/search change
  useEffect(() => {
    setPage(1);
    setSubscriptions([]);
    fetchSubscriptions(1, false);
  }, [searchTerm, statusFilter, paymentStatusFilter, vehicleTypeFilter, startDateFrom, startDateTo]);

  // Fetch subscriptions on page change (desktop pagination)
  useEffect(() => {
    if (!isMobile && page > 1) {
      fetchSubscriptions(page, false);
    }
  }, [page]);

  // Load more for mobile infinite scroll
  const loadMore = useCallback(() => {
    if (!isLoadingMore.current && hasMore && !loading) {
      isLoadingMore.current = true;
      const nextPage = Math.floor(subscriptions.length / perPage) + 1;
      fetchSubscriptions(nextPage, true);
    }
  }, [hasMore, loading, subscriptions.length, perPage]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [isMobile, loadMore]);

  // Fetch subscriptions
  const fetchSubscriptions = async (pageNum = 1, append = false) => {
    if (!append) {
      setLoading(true);
    }

    try {
      const params = {
        page: pageNum,
        per_page: perPage,
        search: searchTerm,
      };

      if (statusFilter) params.status = statusFilter;
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter;
      if (vehicleTypeFilter) params.vehicle_type = vehicleTypeFilter;
      if (startDateFrom) params.start_date_from = startDateFrom;
      if (startDateTo) params.start_date_to = startDateTo;

      const response = await subscriptionService.getAllSubscriptions(params);
      const newSubscriptions = response.subscriptions || [];

      if (append) {
        setSubscriptions(prev => [...prev, ...newSubscriptions]);
      } else {
        setSubscriptions(newSubscriptions);
      }

      setTotalPages(response.pagination?.total_pages || 1);
      setTotalCount(response.pagination?.total_count || 0);
      setHasMore(pageNum < (response.pagination?.total_pages || 1));
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
      if (!append) {
        setSubscriptions([]);
      }
    } finally {
      setLoading(false);
      isLoadingMore.current = false;
    }
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Clear all filters
  const clearFilters = () => {
    setTempStatusFilter('');
    setTempPaymentStatusFilter('');
    setTempVehicleTypeFilter('');
    setTempStartDateFrom('');
    setTempStartDateTo('');
  };

  // Apply filters (close sheet and fetch from API)
  const applyFilters = () => {
    // Apply temp filters to active filters
    setStatusFilter(tempStatusFilter);
    setPaymentStatusFilter(tempPaymentStatusFilter);
    setVehicleTypeFilter(tempVehicleTypeFilter);
    setStartDateFrom(tempStartDateFrom);
    setStartDateTo(tempStartDateTo);
    setIsFilterOpen(false);
    // Fetch will be triggered by useEffect watching filter changes
  };

  // Handle create subscription
  const handleCreateSubscription = () => {
    setSelectedSubscriptionId(null);
    setIsWizardOpen(true);
  };

  // Handle subscription success
  const handleSubscriptionSuccess = () => {
    setIsWizardOpen(false);
    setSelectedSubscriptionId(null);
    fetchSubscriptions(1, false);
  };

  // Handle view subscription details
  const handleViewDetails = (subscriptionId) => {
    navigate(`/subscriptions/${subscriptionId}`);
  };

  // Handle pause/resume subscription
  const handleTogglePause = async (subscription, e) => {
    e.stopPropagation();

    try {
      if (subscription.status === 'active') {
        await subscriptionService.pauseSubscription(subscription.id);
        toast.success('Subscription paused successfully');
      } else if (subscription.status === 'paused') {
        await subscriptionService.resumeSubscription(subscription.id);
        toast.success('Subscription resumed successfully');
      }
      fetchSubscriptions(page, false);
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // Get Badge2 variant for status
  const getBadgeVariant = (status, type = 'status') => {
    const statusArray = type === 'payment' ? SUBSCRIPTION_PAYMENT_STATUSES : SUBSCRIPTION_STATUSES;
    const statusObj = statusArray.find(s => s.value === status);
    return statusObj?.variant || 'outline';
  };

  // Active filter count
  const activeFilterCount = [statusFilter, paymentStatusFilter, vehicleTypeFilter, startDateFrom, startDateTo].filter(Boolean).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header - Desktop Only */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="h-8 w-8" strokeWidth={1.5} />
            Subscriptions</h1>
          <p className="text-muted-foreground">Manage recurring service subscriptions</p>
        </div>
        <Button onClick={handleCreateSubscription} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Subscription
        </Button>
      </div>

      {/* Mobile Title - Visible only on mobile */}
      <div className="block md:hidden">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Repeat className="h-6 w-6" strokeWidth={1.5} />
          Subscriptions</h1>
        <p className="text-muted-foreground text-sm">Manage recurring service subscriptions</p>
      </div>

      {/* Search and Filters - Sticky on Mobile */}
      <div className="sticky top-0 z-10 md:static bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-4 px-4 md:mx-0 md:px-0 flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {/* Search */}
          <div className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Button */}
          <Button
            variant={activeFilterCount > 0 ? "default" : "outline"}
            onClick={() => setIsFilterOpen(true)}
            className="w-full sm:w-auto relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge2
                variant="secondary"
                className="ml-2 bg-white text-primary px-1.5 py-0 text-xs h-5 min-w-[20px]"
              >
                {activeFilterCount}
              </Badge2>
            )}
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {statusFilter && (
            <Badge2 variant="secondary" className="gap-1">
              Status: {getStatusLabel(statusFilter, SUBSCRIPTION_STATUSES)}
              <button
                onClick={() => setStatusFilter('')}
                className="ml-1 hover:bg-muted rounded-full"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge2>
          )}
          {paymentStatusFilter && (
            <Badge2 variant="secondary" className="gap-1">
              Payment: {getStatusLabel(paymentStatusFilter, SUBSCRIPTION_PAYMENT_STATUSES)}
              <button
                onClick={() => setPaymentStatusFilter('')}
                className="ml-1 hover:bg-muted rounded-full"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge2>
          )}
          {vehicleTypeFilter && (
            <Badge2 variant="secondary" className="gap-1">
              Vehicle: {vehicleTypeFilter.charAt(0).toUpperCase() + vehicleTypeFilter.slice(1)}
              <button
                onClick={() => setVehicleTypeFilter('')}
                className="ml-1 hover:bg-muted rounded-full"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge2>
          )}
          {(startDateFrom || startDateTo) && (
            <Badge2 variant="secondary" className="gap-1">
              Date: {startDateFrom && formatDate(startDateFrom)}
              {startDateFrom && startDateTo && ' - '}
              {startDateTo && formatDate(startDateTo)}
              <button
                onClick={() => {
                  setStartDateFrom('');
                  setStartDateTo('');
                }}
                className="ml-1 hover:bg-muted rounded-full"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge2>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Subscriptions List */}
      <Card className="border-0 shadow-none md:border-1 md:shadow-sm">
        {loading ? (
          <div className="space-y-4">
            {/* Desktop Skeleton */}
            <div className="hidden md:block">
              <div className="border-b px-4 py-3 flex gap-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-b last:border-0 px-4 py-4 flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-1/5" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-8 w-20 rounded-full ml-auto" />
                </div>
              ))}
            </div>

            {/* Mobile Skeleton */}
            <div className="md:hidden space-y-3 px-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-6 w-full rounded-md" />
                    <Skeleton className="h-6 w-full rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No subscriptions found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Package</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Washes</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium">Next Wash</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((subscription) => (
                    <tr
                      key={subscription.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleViewDetails(subscription.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-normal flex gap-2">
                          <LetterAvatar name={subscription.customer?.name} size="xs" />
                          {subscription.customer?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-1">
                            <span className="capitalize text-sm">
                              {subscription.selected_packages?.[0]?.name || 'N/A'}
                            </span>
                            {subscription.selected_packages?.length > 1 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge2
                                    variant="secondary"
                                    className="h-5 px-1.5 text-[10px] cursor-pointer hover:bg-secondary/80"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    +{subscription.subscription_packages.length - 1}
                                  </Badge2>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3" align="start">
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-xs text-muted-foreground">All Packages</h4>
                                    <ul className="space-y-1">
                                      {subscription.subscription_packages.map((pkg, idx) => (
                                        <li key={idx} className="text-sm capitalize list-disc ml-4">
                                          {pkg.name}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {subscription.months_duration} month(s)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(subscription.start_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {subscription.washing_schedules?.length || 0} scheduled
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge2 variant={getBadgeVariant(subscription.status)}>
                          {getStatusLabel(subscription.status, SUBSCRIPTION_STATUSES)}
                        </Badge2>
                      </td>
                      <td className="px-4 py-3">
                        <Badge2 variant={getBadgeVariant(subscription.payment_status, 'payment')}>
                          {getStatusLabel(subscription.payment_status, SUBSCRIPTION_PAYMENT_STATUSES)}
                        </Badge2>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {subscription.next_wash_date ? formatDate(subscription.next_wash_date) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(subscription.status === 'active' || subscription.status === 'paused') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(subscription.status === 'active' ? 'text-amber-500' : 'text-green-500', 'hover:bg-muted')}
                              onClick={(e) => handleTogglePause(subscription, e)}
                              title={subscription.status === 'active' ? 'Pause' : 'Resume'}
                            >
                              {subscription.status === 'active' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden space-y-3">
              {subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="bg-white border border-gray-100 rounded-xl p-4 space-y-4 active:scale-[0.98] active:bg-gray-50 transition-all duration-200 cursor-pointer shadow-sm"
                  onClick={() => handleViewDetails(subscription.id)}
                >
                  <div className="flex items-center gap-4">
                    <LetterAvatar name={subscription.customer?.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-base truncate capitalize">
                          {subscription.customer?.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge2
                            variant={getBadgeVariant(subscription.status)}
                            className="h-5 text-[10px] px-1.5"
                          >
                            {getStatusLabel(subscription.status, SUBSCRIPTION_STATUSES)}
                          </Badge2>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate max-w-[120px] capitalize">
                            {subscription.subscription_packages?.[0]?.name || 'N/A'}
                          </span>
                        </div>
                        <Badge2
                          variant={getBadgeVariant(subscription.payment_status, 'payment')}
                          className="h-5 text-[10px] px-1.5"
                        >
                          {getStatusLabel(subscription.payment_status, SUBSCRIPTION_PAYMENT_STATUSES)}
                        </Badge2>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{subscription.months_duration} month(s)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{subscription.washing_schedules?.length || 0} washes</span>
                    </div>
                  </div>

                  {subscription.next_wash_date && (
                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-50">
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        Next: {formatDate(subscription.next_wash_date)}
                      </div>
                      <div className="flex gap-2">
                        {(subscription.status === 'active' || subscription.status === 'paused') && (
                          <div
                            className={cn(
                              "p-1.5 rounded-full",
                              subscription.status === 'active' ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
                            )}
                            onClick={(e) => handleTogglePause(subscription, e)}
                          >
                            {subscription.status === 'active' ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Mobile Infinite Scroll Trigger */}
              {isMobile && hasMore && (
                <div ref={observerTarget} className="flex items-center justify-center py-4">
                  {isLoadingMore.current && (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  )}
                </div>
              )}

              {/* End of list message */}
              {!hasMore && subscriptions.length > 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  You've reached the end of the list ({totalCount} subscriptions)
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Desktop Pagination */}
      {!isMobile && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setPage(pageNum)}
                  className="w-10"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
          >
            Last
          </Button>
        </div>
      )}

      {/* Mobile Infinite Scroll Trigger */}
      {isMobile && hasMore && (
        <div ref={observerTarget} className="flex items-center justify-center py-4">
          {isLoadingMore.current && (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          )}
        </div>
      )}

      {/* Floating Action Button (FAB) for Mobile */}
      <div className="md:hidden fixed bottom-20 right-6 z-40">
        <Button
          onClick={handleCreateSubscription}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 active:scale-90 transition-all duration-200"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>

      {/* Filter Sheet */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filter Subscriptions</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Subscription Status</label>
              <Select value={tempStatusFilter || undefined} onValueChange={(value) => setTempStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {SUBSCRIPTION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Payment Status</label>
              <Select value={tempPaymentStatusFilter || undefined} onValueChange={(value) => setTempPaymentStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All payment statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment statuses</SelectItem>
                  {SUBSCRIPTION_PAYMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Vehicle Type</label>
              <Select value={tempVehicleTypeFilter || undefined} onValueChange={(value) => setTempVehicleTypeFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All vehicle types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vehicle types</SelectItem>
                  <SelectItem value="hatchback">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Hatchback
                    </div>
                  </SelectItem>
                  <SelectItem value="sedan">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Sedan
                    </div>
                  </SelectItem>
                  <SelectItem value="suv">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      SUV
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date Range Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium block">Start Date Range</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From</label>
                  <Input
                    type="date"
                    value={tempStartDateFrom}
                    onChange={(e) => setTempStartDateFrom(e.target.value)}
                    max={tempStartDateTo || undefined}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To</label>
                  <Input
                    type="date"
                    value={tempStartDateTo}
                    onChange={(e) => setTempStartDateTo(e.target.value)}
                    min={tempStartDateFrom || undefined}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Clear All
              </Button>
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Subscription Wizard */}
      <SubscriptionWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={handleSubscriptionSuccess}
        subscriptionId={selectedSubscriptionId}
      />
    </div>
  );
};

export default Subscriptions;
