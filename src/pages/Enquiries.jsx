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
import ablyClient from '../services/ablyClient';
import useEnquiryStore from '../store/enquiryStore';
import {
  ENQUIRY_SOURCE_OPTIONS,
  ENQUIRY_SOURCE_LABELS,
  ENQUIRY_STATUS_OPTIONS,
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_STATUS_COLORS,
  SENTIMENT_OPTIONS,
  SENTIMENT_LABELS,
  SENTIMENT_EMOJIS,
  SENTIMENT_COLORS,
} from '../constants/enquiryConstants';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Calendar,
  User,
  Phone,
  Eye,
  Filter,
  X,
  MessageSquare,
  Bell,
  PackageOpen,
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
import EnquiryDetail from './EnquiryDetail';
import EnquiryWizard from '../components/EnquiryWizard';

/**
 * Enquiries Page Component
 * Manages enquiry/lead list with search, filters, pagination
 */
const Enquiries = () => {
  const navigate = useNavigate();
  
  // Use enquiry store
  const {
    enquiries,
    isLoading: loading,
    hasMore,
    page: storePage,
    perPage,
    totalPages,
    totalCount,
    filters,
    setFilters,
    fetchEnquiries,
    fetchPage,
    resetPagination,
  } = useEnquiryStore();
  
  // Load persisted state from localStorage
  const loadPersistedState = () => {
    try {
      const savedFilters = localStorage.getItem('enquiriesFilters');
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
  const [source, setSource] = useState(persistedState?.source || 'all');
  const [sentiment, setSentiment] = useState(persistedState?.sentiment || 'all');
  const [dateFrom, setDateFrom] = useState(persistedState?.dateFrom || '');
  const [dateTo, setDateTo] = useState(persistedState?.dateTo || '');
  const [assignedToId, setAssignedToId] = useState(persistedState?.assignedToId || 'all');

  // Temporary filter states (for sheet)
  const [tempStatus, setTempStatus] = useState(persistedState?.status || 'all');
  const [tempSource, setTempSource] = useState(persistedState?.source || 'all');
  const [tempSentiment, setTempSentiment] = useState(persistedState?.sentiment || 'all');
  const [tempDateFrom, setTempDateFrom] = useState(persistedState?.dateFrom || '');
  const [tempDateTo, setTempDateTo] = useState(persistedState?.dateTo || '');
  const [tempAssignedToId, setTempAssignedToId] = useState(persistedState?.assignedToId || 'all');

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

  // Track selected enquiry for detail view
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEnquiryId = searchParams.get('enquiryId');

  // Handle opening enquiry detail
  const handleOpenEnquiryDetail = (enquiryId) => {
    setSearchParams({ enquiryId: enquiryId.toString() });
  };

  // Handle closing enquiry detail
  const handleCloseEnquiryDetail = () => {
    setSearchParams({});
  };

  // Persist filter state to localStorage
  useEffect(() => {
    const filterState = {
      searchQuery,
      status,
      source,
      sentiment,
      dateFrom,
      dateTo,
      assignedToId,
      page: storePage
    };
    localStorage.setItem('enquiriesFilters', JSON.stringify(filterState));
  }, [searchQuery, status, source, sentiment, dateFrom, dateTo, assignedToId, storePage]);

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

  // Update store filters when local filters change
  useEffect(() => {
    setFilters({
      search: searchQuery,
      status: status !== 'all' ? status : '',
      source: source !== 'all' ? source : '',
      sentiment: sentiment !== 'all' ? sentiment : '',
      date_from: dateFrom,
      date_to: dateTo,
      assigned_to_id: assignedToId !== 'all' ? assignedToId : '',
    });
  }, [searchQuery, status, source, sentiment, dateFrom, dateTo, assignedToId, setFilters]);

  // Fetch enquiries with proper reset logic
  useEffect(() => {
    // Skip resetting page on first mount (when loading from localStorage)
    if (isFirstMount.current) {
      isFirstMount.current = false;
      hasInitiallyFetched.current = true;

      // Always fetch on mount - use persisted filters but get fresh data
      fetchEnquiries(true);
      return;
    }

    // Reset and fetch when filters change
    fetchEnquiries(true);
  }, [searchQuery, status, source, sentiment, dateFrom, dateTo, assignedToId, fetchEnquiries]);

  // Infinite scroll observer callback
  const handleObserver = useCallback((entries) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !loadingMore && !loading && isMobile) {
      fetchEnquiries(); // Fetch next page
    }
  }, [hasMore, loadingMore, loading, isMobile, fetchEnquiries]);

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

  // Subscribe to real-time enquiry updates - only when this page is open
  useEffect(() => {
    console.log('[Enquiries] Page opened - setting up Ably subscription');
    
    let unsubscribe = null;

    // Initialize Ably client and subscribe
    const setupSubscription = async () => {
      try {
        await ablyClient.initialize();
        
        // Subscribe to enquiries channel
        unsubscribe = ablyClient.subscribeToEnquiries((eventName, eventData) => {
          console.log('[Enquiries] Received event:', eventName, eventData);

          // Handle different event types
          if (eventName === 'enquiry.created') {
            toast.success('New Enquiry', {
              description: `New enquiry from ${eventData.data.contact_name || 'Unknown'} via ${eventData.data.source || 'unknown'}`,
            });
            // Refresh the list to show new enquiry
            fetchEnquiries(true);
          } else if (eventName === 'enquiry.updated' || eventName === 'enquiry.status_changed') {
            console.log('[Enquiries] Enquiry updated, refreshing list');
            // Refresh the list to show updates
            fetchEnquiries(true);
          } else if (eventName === 'enquiry.assigned') {
            toast.info('Enquiry Assigned', {
              description: `Enquiry from ${eventData.data.contact_name || 'Unknown'} has been assigned`,
            });
            fetchEnquiries(true);
          } else if (eventName === 'enquiry.comment_added') {
            console.log('[Enquiries] Comment added to enquiry', eventData.enquiry_id);
            // Optionally update comment count in the list
          }
        });
      } catch (err) {
        console.error('[Enquiries] Failed to setup Ably subscription:', err);
      }
    };

    setupSubscription();

    // Cleanup on unmount - unsubscribe when leaving the page
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        console.log('[Enquiries] Page closed - cleaning up Ably subscription');
        unsubscribe();
      }
    };
  }, []); // Run only once on mount, cleanup on unmount

  // Check if any filters are applied
  const hasActiveFilters = () => {
    return status !== 'all' ||
      source !== 'all' ||
      sentiment !== 'all' ||
      dateFrom !== '' ||
      dateTo !== '' ||
      assignedToId !== 'all';
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (status !== 'all') count++;
    if (source !== 'all') count++;
    if (sentiment !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (assignedToId !== 'all') count++;
    return count;
  };

  // Clear all filters
  const clearFilters = () => {
    setStatus('all');
    setSource('all');
    setSentiment('all');
    setDateFrom('');
    setDateTo('');
    setAssignedToId('all');
    setTempStatus('all');
    setTempSource('all');
    setTempSentiment('all');
    setTempDateFrom('');
    setTempDateTo('');
    setTempAssignedToId('all');
  };

  // Apply filters from temporary states
  const applyFilters = () => {
    setStatus(tempStatus);
    setSource(tempSource);
    setSentiment(tempSentiment);
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setAssignedToId(tempAssignedToId);
    setIsFilterOpen(false);
  };

  // Sync temp filters with actual when opening sheet
  const handleFilterOpen = (open) => {
    if (open) {
      setTempStatus(status);
      setTempSource(source);
      setTempSentiment(sentiment);
      setTempDateFrom(dateFrom);
      setTempDateTo(dateTo);
      setTempAssignedToId(assignedToId);
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
    if (status !== 'all') filters.push(ENQUIRY_STATUS_LABELS[status]);
    if (source !== 'all') filters.push(`Source: ${ENQUIRY_SOURCE_LABELS[source]}`);
    if (sentiment !== 'all') filters.push(`${SENTIMENT_EMOJIS[sentiment]} ${SENTIMENT_LABELS[sentiment]}`);
    if (dateFrom) filters.push(`From: ${formatDate(dateFrom)}`);
    if (dateTo) filters.push(`To: ${formatDate(dateTo)}`);
    if (assignedToId !== 'all') {
      // TODO: Get user name from users list when available
      filters.push(`Assigned`);
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

  // Get Badge2 variant for status
  const getBadgeVariant = (statusValue) => {
    const color = ENQUIRY_STATUS_COLORS[statusValue] || 'gray';
   return color|| 'secondary';
  };

  // Get Badge2 variant for sentiment
  const getSentimentBadgeVariant = (sentimentValue) => {
    const color = SENTIMENT_COLORS[sentimentValue] || 'secondary';
    
    return color || 'secondary';
  };

  // Handle wizard success
  const handleWizardSuccess = () => {
    setIsWizardOpen(false);
    // Refresh the list from the beginning
    fetchEnquiries(true);
  };

  // Check if follow-up is needed (follow-up date in the past or today)
  const isFollowUpNeeded = (followupDate) => {
    if (!followupDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followup = new Date(followupDate);
    followup.setHours(0, 0, 0, 0);
    return followup <= today;
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header - Desktop Only */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageOpen className="h-8 w-8" strokeWidth={1.5} /> Enquiries
          </h1>
          <p className="text-muted-foreground">Track and manage customer enquiries</p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Enquiry
        </Button>
      </div>

      {/* Mobile Title - Visible only on mobile */}
      <div className="block md:hidden">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackageOpen className="h-6 w-6" strokeWidth={1.5} /> Enquiries
        </h1>
        <p className="text-muted-foreground text-sm">Track and manage customer enquiries</p>
      </div>

      {/* Search and Filters - Sticky on Mobile */}
      <div className="sticky top-0 z-10 bg-gray-50 pb-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {/* Single Search Field */}
          <div className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search enquiries..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="pl-10 pr-10 bg-white border-gray-200 shadow-xs"
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
                <SheetTitle>Filter Enquiries</SheetTitle>
                <SheetDescription>
                  Apply filters to narrow down your enquiry list
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={tempStatus} onValueChange={setTempStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {ENQUIRY_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source</label>
                  <Select value={tempSource} onValueChange={setTempSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {ENQUIRY_SOURCE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sentiment Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sentiment</label>
                  <Select value={tempSentiment} onValueChange={setTempSentiment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sentiments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiments</SelectItem>
                      {SENTIMENT_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {SENTIMENT_EMOJIS[s.value]} {s.label}
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

                {/* TODO: Assigned To Filter - need users list */}
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

      {/* Enquiries List */}
      <Card className="border-0 shadow-none md:border rounded-lg md:shadow-sm bg-white">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load enquiries</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchEnquiries(true)} variant="outline">
              Try Again
            </Button>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No enquiries found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or create a new enquiry</p>
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Enquiry
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards with Infinite Scroll */}
            <div className="block md:hidden space-y-3">
              {enquiries.map((enquiry) => (
                <div
                  key={enquiry.id}
                  onClick={() => handleOpenEnquiryDetail(enquiry.id)}
                  className="bg-white shadow-sm border border-gray-100 rounded-xl p-4 active:scale-[0.98] active:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <LetterAvatar 
                      name={enquiry.customer?.name || enquiry.contact_name || 'Unknown'} 
                      size="sm" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-base truncate capitalize">
                          {enquiry.customer?.name || enquiry.contact_name || 'Unknown'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{enquiry.contact_phone}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ENQUIRY_SOURCE_LABELS[enquiry.source]}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(enquiry.created_at)}
                      </div>
                      {enquiry.followup_date && (
                        <div className="flex items-center gap-1">
                          <Bell className={`h-3 w-3 ${isFollowUpNeeded(enquiry.followup_date) ? 'text-red-500' : ''}`} />
                          {formatDate(enquiry.followup_date)}
                        </div>
                      )}
                    </div>
                    <Badge2 variant={getBadgeVariant(enquiry.status)} className="px-2">
                      {ENQUIRY_STATUS_LABELS[enquiry.status]}
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
              {!hasMore && enquiries.length > 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  You've reached the end of the list ({totalCount} enquiries)
                </div>
              )}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block overflow-x-auto text-sm">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm">
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Area</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Next Follow-up</th>
                    <th className="px-4 py-3 font-semibold">Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.map((enquiry) => (
                    <tr
                      key={enquiry.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleOpenEnquiryDetail(enquiry.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <LetterAvatar 
                            name={enquiry.customer?.name || enquiry.contact_name || 'Unknown'} 
                            size="xs" 
                          />
                          <div>
                            <div className="font-medium capitalize">
                              {enquiry.customer?.name || enquiry.contact_name || 'Unknown'}
                            </div>
                            {enquiry.contact_email && (
                              <div className="text-xs text-muted-foreground">
                                {enquiry.contact_email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{enquiry.contact_phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium capitalize">
                          {ENQUIRY_SOURCE_LABELS[enquiry.source]}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium capitalize">{enquiry.area || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge2 variant={getBadgeVariant(enquiry.status)}>
                          {ENQUIRY_STATUS_LABELS[enquiry.status]}
                        </Badge2>
                      </td>
                      <td className="px-4 py-3">
                        {enquiry.followup_date ? (
                          <div className={`flex items-center gap-1 ${isFollowUpNeeded(enquiry.followup_date) ? 'text-red-500 font-medium' : ''}`}>
                            <Bell className="h-3 w-3" />
                            {formatDate(enquiry.followup_date)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{formatDate(enquiry.updated_at)}</td>
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
            Showing {Math.min((storePage - 1) * perPage + 1, totalCount)} to {Math.min(storePage * perPage, totalCount)} of {totalCount} enquiries
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

      {/* Enquiry Detail Sheet */}
      <Sheet open={!!selectedEnquiryId} onOpenChange={(open) => !open && handleCloseEnquiryDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-3/4 p-0 overflow-y-auto">
          {selectedEnquiryId && (
            <EnquiryDetail
              enquiryId={selectedEnquiryId}
              onClose={handleCloseEnquiryDetail}
              onUpdate={(updatedEnquiry) => {
                // Refresh the enquiry to get latest data
                fetchEnquiries(true);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Enquiry Wizard */}
      <EnquiryWizard
        open={isWizardOpen}
        onOpenChange={() => setIsWizardOpen(false)}
        onSuccess={handleWizardSuccess}
      />
    </div>
  );
};

export default Enquiries;
