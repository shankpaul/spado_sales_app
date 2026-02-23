import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import LetterAvatar from '../components/LetterAvatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import orderService from '../services/orderService';
import useOrderStore from '../store/orderStore';
import OrderWizard from '../components/OrderWizard';
import OrderDetail from './OrderDetail';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  getStatusColor,
  getStatusLabel,
} from '../lib/constants';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Calendar,
  User,
  DollarSign,
  Eye,
  Filter,
  X,
  Repeat,
  Blocks,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet';
import { Badge2 } from '@/components/ui/badge2';
import { Skeleton } from '../components/ui/skeleton';
import AssigneeResponseTick from '../components/AssigneeResponseTick';

/**
 * Orders Page Component
 * Manages order list with search, filters, pagination
 */
const Orders = () => {
  const navigate = useNavigate();
  
  // Use order store
  const {
    orders,
    isLoading: loading,
    hasMore,
    page: storePage,
    perPage,
    totalPages,
    totalCount,
    filters,
    agents,
    setFilters,
    fetchOrders,
    fetchPage,
    updateOrder,
    resetPagination,
    fetchAgents,
  } = useOrderStore();
  
  // Load persisted state from localStorage
  const loadPersistedState = () => {
    try {
      const savedFilters = localStorage.getItem('ordersFilters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (error) {
      console.error('Error loading persisted filters:', error);
    }
    return null;
  };

  const persistedState = loadPersistedState();

  const [error, setError] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(persistedState?.searchQuery || '');
  const [searchInput, setSearchInput] = useState(persistedState?.searchQuery || '');
  const [status, setStatus] = useState(persistedState?.status || 'all');
  const [paymentStatus, setPaymentStatus] = useState(persistedState?.paymentStatus || 'all');
  const [dateFrom, setDateFrom] = useState(persistedState?.dateFrom || '');
  const [dateTo, setDateTo] = useState(persistedState?.dateTo || '');
  const [agentId, setAgentId] = useState(persistedState?.agentId || 'all');

  // Temporary filter states (for sheet)
  const [tempStatus, setTempStatus] = useState(persistedState?.status || 'all');
  const [tempPaymentStatus, setTempPaymentStatus] = useState(persistedState?.paymentStatus || 'all');
  const [tempDateFrom, setTempDateFrom] = useState(persistedState?.dateFrom || '');
  const [tempDateTo, setTempDateTo] = useState(persistedState?.dateTo || '');
  const [tempAgentId, setTempAgentId] = useState(persistedState?.agentId || 'all');

  // Pagination states
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Wizard and filter sheet states
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Track if this is the first mount to prevent resetting page from localStorage
  const isFirstMount = useRef(true);
  const hasInitiallyFetched = useRef(false);

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

  // Persist filter state to localStorage
  useEffect(() => {
    const filterState = {
      searchQuery,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      agentId,
      page: storePage
    };
    localStorage.setItem('ordersFilters', JSON.stringify(filterState));
  }, [searchQuery, status, paymentStatus, dateFrom, dateTo, agentId, storePage]);

  // Detect mobile/desktop resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      if (isMobile !== mobile) {
        setIsMobile(mobile);
        // Reset pagination when switching between mobile/desktop
        resetPagination();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, resetPagination]);

  // Fetch agents for filter (fire-and-forget, non-blocking, cached in store)
  useEffect(() => {
    // Only fetch if agents not already loaded
    if (agents.length === 0) {
      fetchAgents();
    }
  }, [agents.length, fetchAgents]);

  // Update store filters when local filters change
  useEffect(() => {
    setFilters({
      search: searchQuery,
      status: status !== 'all' ? status : '',
      payment_status: paymentStatus !== 'all' ? paymentStatus : '',
      date_from: dateFrom,
      date_to: dateTo,
      assigned_to_id: agentId !== 'all' ? agentId : '',
    });
  }, [searchQuery, status, paymentStatus, dateFrom, dateTo, agentId, setFilters]);

  // Fetch orders with proper reset logic
  useEffect(() => {
    // Skip resetting page on first mount (when loading from localStorage)
    if (isFirstMount.current) {
      isFirstMount.current = false;
      hasInitiallyFetched.current = true;

      // Always fetch on mount - use persisted filters but get fresh data
      fetchOrders(true);
      return;
    }

    // Reset and fetch when filters change
    fetchOrders(true);
  }, [searchQuery, status, paymentStatus, dateFrom, dateTo, agentId, fetchOrders]);

  // Infinite scroll observer callback
  const handleObserver = useCallback((entries) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !loadingMore && !loading && isMobile) {
      fetchOrders(); // Fetch next page
    }
  }, [hasMore, loadingMore, loading, isMobile, fetchOrders]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!isMobile) return; // Only for mobile

    const element = observerTarget.current;
    const option = {
      root: null,
      rootMargin: '20px',
      threshold: 0
    };

    const observer = new IntersectionObserver(handleObserver, option);
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [handleObserver, isMobile]);

  // Check if any filters are applied
  const hasActiveFilters = () => {
    return status !== 'all' ||
      paymentStatus !== 'all' ||
      dateFrom !== '' ||
      dateTo !== '' ||
      agentId !== 'all';
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (status !== 'all') count++;
    if (paymentStatus !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (agentId !== 'all') count++;
    return count;
  };

  // Clear all filters
  const clearFilters = () => {
    setStatus('all');
    setPaymentStatus('all');
    setDateFrom('');
    setDateTo('');
    setAgentId('all');
    setTempStatus('all');
    setTempPaymentStatus('all');
    setTempDateFrom('');
    setTempDateTo('');
    setTempAgentId('all');
  };

  // Apply filters from temporary states
  const applyFilters = () => {
    setStatus(tempStatus);
    setPaymentStatus(tempPaymentStatus);
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setAgentId(tempAgentId);
    setIsFilterOpen(false);
  };

  // Sync temp filters with actual when opening sheet
  const handleFilterOpen = (open) => {
    if (open) {
      setTempStatus(status);
      setTempPaymentStatus(paymentStatus);
      setTempDateFrom(dateFrom);
      setTempDateTo(dateTo);
      setTempAgentId(agentId);
    }
    setIsFilterOpen(open);
  };

  // Handle search button click or Enter key
  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  // Clear search input and query
  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Get filter summary for display
  const getFilterSummary = () => {
    const filters = [];
    if (status !== 'all') filters.push(getStatusLabel(status, ORDER_STATUSES));
    if (paymentStatus !== 'all') filters.push(`Payment: ${getStatusLabel(paymentStatus, PAYMENT_STATUSES)}`);
    if (dateFrom) filters.push(`From: ${formatDate(dateFrom)}`);
    if (dateTo) filters.push(`To: ${formatDate(dateTo)}`);
    if (agentId !== 'all') {
      const agent = agents.find(a => String(a.id) === agentId);
      if (agent) filters.push(`Agent: ${agent.name}`);
    }
    return filters;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Get Badge2 variant for status
  const getBadgeVariant = (statusValue, type = 'order') => {
    const color = getStatusColor(
      statusValue,
      type === 'order' ? ORDER_STATUSES : PAYMENT_STATUSES
    );

    const variantMap = {
      gray: 'secondary',
      blue: 'default',
      green: 'success',
      red: 'destructive',
      yellow: 'warning',
      purple: 'outline',
      amber: 'warning',
    };

    return variantMap[color] || 'secondary';
  };

  // Handle wizard success
  const handleWizardSuccess = () => {
    setIsWizardOpen(false);
    // Refresh the list from the beginning
    fetchOrders(true);
  };

  return (
    <div className="p-4 md:p-6  space-y-5">
      {/* Header - Desktop Only */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 items-center"><Blocks className="h-8 w-8" strokeWidth={1.5} /> Orders</h1>
          <p className="text-muted-foreground">Manage customer orders and bookings</p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Order
        </Button>
      </div>

      {/* Mobile Title - Visible only on mobile */}
      <div className="block md:hidden">
        <h1 className="text-2xl font-bold flex items-center gap-2 items-center"><Blocks className="h-6 w-6" strokeWidth={1.5} /> Orders</h1>
        <p className="text-muted-foreground text-sm">Manage customer orders and bookings</p>
      </div>

      {/* Search and Filters - Sticky on Mobile */}
      <div className="sticky top-0 z-10 md:static bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-4 px-4 md:mx-0 md:px-0 flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {/* Single Search Field */}
          <div className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="pl-10 pr-10"
              />
              {searchInput && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} variant="default" className="shrink-0 hidden sm:flex">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Filter Button */}
          <Sheet open={isFilterOpen} onOpenChange={handleFilterOpen}>
            <SheetTrigger asChild>
              <Button
                variant={hasActiveFilters() ? "default" : "outline"}
                className="w-full sm:w-auto relative"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters() && (
                  <Badge2
                    variant="secondary"
                    className="ml-2 bg-white text-primary px-1.5 py-0 text-xs h-5 min-w-[20px]"
                  >
                    {getActiveFilterCount()}
                  </Badge2>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side={isMobile ? "bottom" : "right"}>
              <SheetHeader>
                <SheetTitle>Filter Orders</SheetTitle>
                <SheetDescription>
                  Apply filters to narrow down your order list
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order Status</label>
                  <Select value={tempStatus} onValueChange={setTempStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Status</label>
                  <Select value={tempPaymentStatus} onValueChange={setTempPaymentStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Payment Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Status</SelectItem>
                      {PAYMENT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date From</label>
                    <Input
                      type="date"
                      value={tempDateFrom}
                      onChange={(e) => setTempDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date To</label>
                    <Input
                      type="date"
                      value={tempDateTo}
                      onChange={(e) => setTempDateTo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Agent Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assigned Agent</label>
                  <Select value={tempAgentId} onValueChange={setTempAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agents && agents.map((agent) => (
                        <SelectItem key={agent.id} value={String(agent.id)}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button onClick={applyFilters} className="w-full">
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear All
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {getFilterSummary().map((filter, index) => (
            <Badge2 key={index} variant="secondary" className="gap-1">
              {filter}
            </Badge2>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}

      {/* Orders List */}
      <Card className="border-0 shadow-none md:border-1 md:shadow-sm">
        {loading ? (
          <div className="space-y-4">
            {/* Desktop Skeleton */}
            <div className="hidden md:block">
              <div className="border-b px-4 py-3 flex gap-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-b last:border-0 px-4 py-4 flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="space-y-1 text-right">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load orders</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchOrders} variant="outline">
              Try Again
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or create a new order</p>
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards with Infinite Scroll */}
            <div className="block md:hidden space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => handleOpenOrderDetail(order.id)}
                  className="bg-white shadow-sm border border-gray-100 rounded-xl p-4 active:scale-[0.98] active:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <LetterAvatar name={order.customer_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-base truncate capitalize">
                          {order.customer_name}
                        </div>
                        <div className="font-bold text-primary whitespace-nowrap">
                          {formatCurrency(order.total_amount)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="font-medium">#{order.order_number}</span>
                          {order.subscription_id && (
                            <Badge2
                              variant="info"
                              className="text-[9px] px-1 h-4 flex items-center gap-0.5"
                            >
                              <Repeat className="h-2.5 w-2.5" />
                              Sub
                            </Badge2>
                          )}
                        </div>
                        <Badge2
                          variant={getBadgeVariant(order.payment_status, 'payment')}
                          className="h-5 text-[10px] px-1.5"
                        >
                          {getStatusLabel(order.payment_status, PAYMENT_STATUSES)}
                        </Badge2>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(order.booking_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {order.assigned_agent_name?.split(' ')[0] || 'Unassigned'}
                        {order.assigned_agent_name && (
                          <AssigneeResponseTick status={order.assignee_response} size="xs" />
                        )}
                      </div>
                    </div>
                    <Badge2 variant={getBadgeVariant(order.status, 'order')} className="px-2">
                      {getStatusLabel(order.status, ORDER_STATUSES)}
                    </Badge2>
                  </div>
                </div>
              ))}

              {/* Infinite scroll loader */}
              {hasMore && (
                <div ref={observerTarget} className="flex justify-center py-4">
                  {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                </div>
              )}

              {/* End of list message */}
              {!hasMore && orders.length > 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  You've reached the end of the list ({totalCount} orders)
                </div>
              )}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block overflow-x-auto text-sm">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm">
                    <th className="px-4 py-3 font-semibold">Order #</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Area</th>
                    <th className="px-4 py-3 font-semibold">Booking Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleOpenOrderDetail(order.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium hover:underline text-primary">
                          #{order.order_number}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <LetterAvatar name={order.customer_name} size="xs" />
                          <div className="font-medium capitalize">{order.customer_name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium capitalize">{order.area}</div>
                      </td>
                      <td className="px-4 py-3">{formatDate(order.booking_date)}</td>
                      <td className="px-4 py-3">
                        <Badge2 variant={getBadgeVariant(order.status, 'order')}>
                          {getStatusLabel(order.status, ORDER_STATUSES)}
                        </Badge2>
                      </td>
                      <td className="px-4 py-3">
                        <Badge2 variant={getBadgeVariant(order.payment_status, 'payment')}>
                          {getStatusLabel(order.payment_status, PAYMENT_STATUSES)}
                        </Badge2>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium flex items-center gap-2">
                          {formatCurrency(order.total_amount)}
                          {order.subscription_id && (
                            <Badge2
                              variant="info"
                              className="w-fit text-[10px] px-1.5 h-5 flex items-center gap-1 cursor-pointer hover:bg-secondary/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/subscriptions/${order.subscription_id}`);
                              }}
                            >
                              <Repeat className="h-3 w-3" />
                              Sub
                            </Badge2>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {order.assigned_agent_name ? (
                          <div className="flex items-center gap-2">
                            <LetterAvatar name={order.assigned_agent_name} size="xs" />
                            <div className="font-medium">{order.assigned_agent_name}</div>
                            <AssigneeResponseTick status={order.assignee_response} size="sm" />
                          </div>
                        ) : (
                          <Badge2 variant="danger">Unassigned</Badge2>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Desktop Pagination with Page Numbers */}
      {!isMobile && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((storePage - 1) * perPage + 1, totalCount)} to {Math.min(storePage * perPage, totalCount)} of {totalCount} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPage(Math.max(1, storePage - 1))}
              disabled={storePage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            <div className="flex gap-1">
              {/* First page */}
              {storePage > 3 && (
                <>
                  <Button
                    variant={storePage === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => fetchPage(1)}
                    className="min-w-[40px]"
                  >
                    1
                  </Button>
                  {storePage > 4 && <span className="px-2 flex items-center text-muted-foreground">...</span>}
                </>
              )}

              {/* Pages around current */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === storePage || p === storePage - 1 || p === storePage + 1 || p === storePage - 2 || p === storePage + 2)
                .filter(p => p > 0 && p <= totalPages)
                .map(p => (
                  <Button
                    key={p}
                    variant={storePage === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => fetchPage(p)}
                    disabled={loading}
                    className="min-w-[40px]"
                  >
                    {p}
                  </Button>
                ))}

              {/* Last page */}
              {storePage < totalPages - 2 && (
                <>
                  {storePage < totalPages - 3 && <span className="px-2 flex items-center text-muted-foreground">...</span>}
                  <Button
                    variant={storePage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => fetchPage(totalPages)}
                    className="min-w-[40px]"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPage(Math.min(totalPages, storePage + 1))}
              disabled={storePage === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for Mobile */}
      <div className="md:hidden fixed bottom-20 right-6 z-40">
        <Button
          onClick={() => setIsWizardOpen(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 active:scale-90 transition-all duration-200"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrderId} onOpenChange={(open) => !open && handleCloseOrderDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-3/4 p-0 overflow-y-auto">
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

      {/* Create Order Wizard */}
      <OrderWizard
        open={isWizardOpen}
        onOpenChange={() => setIsWizardOpen(false)}
        onSuccess={handleWizardSuccess}
      />
    </div>
  );
};

export default Orders;
