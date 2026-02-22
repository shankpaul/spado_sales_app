import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import CustomerForm from '../components/CustomerForm';
import CustomerDetails from '../components/CustomerDetails';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '../components/ui/sheet';
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
import { toast } from 'sonner';
import customerService from '../services/customerService';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ShoppingCart,
  Eye,
  Users,
  MoreVertical,
  Filter,
  ArrowLeft,
  X,
} from 'lucide-react';
import OrderWizard from '../components/OrderWizard';
import { format } from 'date-fns';
import LetterAvatar from '../components/LetterAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

/**
 * Customers Page Component
 * Manages customer list with search, filters, pagination, and CRUD operations
 */
const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDays, setCustomDays] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Refs for infinite scroll
  const observerTarget = useRef(null);
  const isLoadingMore = useRef(false);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isOrderWizardOpen, setIsOrderWizardOpen] = useState(false);
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState(null);

  // Customer details dialog
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [customerForDetails, setCustomerForDetails] = useState(null);

  // Form ref
  const formRef = useRef(null);

  // Fetch customers
  const fetchCustomers = async (pageNum = 1, append = false) => {
    if (!append) {
      setLoading(true);
    }

    try {
      const params = {
        page: pageNum,
        per_page: perPage,
        search: searchTerm,
      };

      // Add date filter
      if (dateFilter !== 'all') {
        if (dateFilter === 'custom' && customDays) {
          params.last_booked_filter = `${customDays}d`;
        } else if (dateFilter !== 'custom') {
          params.last_booked_filter = dateFilter;
        }
      }

      const response = await customerService.getAllCustomers(params);
      const newCustomers = response.customers || [];

      if (append) {
        setCustomers(prev => [...prev, ...newCustomers]);
      } else {
        setCustomers(newCustomers);
      }

      setTotalPages(response.pagination?.total_pages || 1);
      setTotalCount(response.pagination?.total_count || 0);
      setHasMore(pageNum < (response.pagination?.total_pages || 1));
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
      if (!append) {
        setCustomers([]);
      }
    } finally {
      setLoading(false);
      isLoadingMore.current = false;
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch customers on filter/search change
  useEffect(() => {
    setPage(1);
    setCustomers([]);
    fetchCustomers(1, false);
  }, [searchTerm, dateFilter, customDays]);

  // Fetch customers on page change (desktop pagination)
  useEffect(() => {
    if (!isMobile && page > 1) {
      fetchCustomers(page, false);
    }
  }, [page]);

  // Load more for mobile infinite scroll
  const loadMore = useCallback(() => {
    if (!isLoadingMore.current && hasMore && !loading) {
      isLoadingMore.current = true;
      const nextPage = Math.floor(customers.length / perPage) + 1;
      fetchCustomers(nextPage, true);
    }
  }, [hasMore, loading, customers.length, perPage]);

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

  // Open form for add/edit
  const handleOpenForm = (customer = null) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedCustomer) return;

    try {
      await customerService.deleteCustomer(selectedCustomer.id);
      toast.success('Customer deleted successfully');
      setIsDeleteOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Open customer details dialog
  const handleViewDetails = (customer) => {
    setCustomerForDetails(customer);
    setIsDetailsOpen(true);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header - Desktop Only */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" strokeWidth={1.5} />
            Customers
          </h1>
          <p className="text-muted-foreground">Manage your customers</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Header - Mobile Only */}
      <div className="block md:hidden">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" strokeWidth={1.5} />
          Customers
        </h1>
        <p className="text-muted-foreground text-sm">Manage your customer database ({totalCount})</p>
      </div>

      {/* Search and Filters - Improved for Mobile App Feel */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md py-2 -mx-4 px-4 sm:mx-0 sm:px-0 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-10 bg-white border-gray-200 h-10 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex-shrink-0">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-10 w-[130px] bg-white border-gray-200 shadow-sm focus:ring-1 focus:ring-primary">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7d</SelectItem>
                <SelectItem value="1m">Last month</SelectItem>
                <SelectItem value="3m">Last 3m</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Days Input */}
        {dateFilter === 'custom' && (
          <Input
            type="number"
            placeholder="Enter range in days"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            min="1"
            className="h-9 bg-white shadow-sm"
          />
        )}
      </div>
      <Card className="border-0 shadow-none md:border-1 md:shadow-sm">
        {loading ? (
          <div className="space-y-4">
            {/* Desktop Skeleton */}
            <div className="hidden md:block">
              <div className="border-b px-4 py-3 flex gap-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-b last:border-0 px-4 py-4 flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-8 w-8 rounded-full ml-auto" />
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
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <Skeleton className="h-6 w-24 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-muted-foreground font-medium">No customers found</p>
            <Button variant="link" onClick={() => { setSearchTerm(''); setDateFilter('all'); }}>Clear filters</Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    {/* <th className="px-4 py-3 font-medium">Phone</th> */}
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Last Booked</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/50 text-sm" >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <LetterAvatar name={customer.name} size="xs" />
                          <button
                            onClick={() => handleViewDetails(customer)}
                            className="font-medium hover:text-primary hover:underline cursor-pointer transition-colors"
                          >
                            {customer.name || customer.phone}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm capitalize">
                            { [customer.area, customer.city, customer.district].filter(Boolean).join(', ') || 'N/A' }
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(customer.last_booked_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedCustomerForOrder(customer.id);
                              setIsOrderWizardOpen(true);
                            }}>
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Create Order
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenForm(customer)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setIsDeleteOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards - App Style */}
            <div className="md:hidden space-y-3">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white shadow-sm border border-gray-100 rounded-xl p-4 active:scale-[0.98] transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between pb-2">
                        <div className='flex gap-2 items-center'>
                          <LetterAvatar name={customer.name} size="sm" />
                          <div>
                            <button
                              onClick={() => handleViewDetails(customer)}
                              className="font-bold flex items-center gap-2 text-base truncate capitalize hover:text-primary transition-colors text-left"
                            >

                              {customer.name || customer.phone}
                            </button>
                            <div className="flex items-bottom gap-1 text-xs text-muted-foreground">
                              <MapPin size={14} strokeWidth={1.2} />
                              <span className="truncate capitalize">
                                {[customer.area, customer.city, customer.district].filter(Boolean).join(', ') || 'N/A'}
                              </span>
                            </div>
                          </div>

                        </div>



                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedCustomerForOrder(customer.id);
                              setIsOrderWizardOpen(true);
                            }}>
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Create Order
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenForm(customer)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setIsDeleteOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 border-t border-gray-50 pt-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Last Booked: {formatDate(customer.last_booked_at)}</span>
                        </div>
                        <div className="flex ml-auto items-center gap-1.5 ">

                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomerForOrder(customer.id);
                              setIsOrderWizardOpen(true);
                            }}
                            // variant="outline"
                            size="sm"
                            className="flex items-center gap-1.5"
                          >
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
        <div ref={observerTarget} className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
        </div>
      )}

      {/* FAB for Mobile */}
      {isMobile && (
        <Button
          onClick={() => handleOpenForm()}
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg z-40 bg-primary text-white p-0 flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Results Info */}
      {!loading && customers.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {customers.length} of {totalCount} customers
        </div>
      )}

      {/* Customer Form Sheet - App Page Feel on Mobile */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={`w-full ${isMobile ? 'h-full' : 'sm:max-w-2xl'} p-0 flex flex-col bg-gray-50 border-none`}
        >
          {/* App-like Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setIsFormOpen(false)}
              >
                {isMobile ? <ArrowLeft className="h-6 w-6" /> : <X className="h-5 w-5" />}
              </Button>
              <div>
                <h2 className="font-bold text-lg leading-none">
                  {selectedCustomer ? 'Edit Customer' : 'Add Customer'}
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {selectedCustomer ? 'Update details' : 'New entry'}
                </p>
              </div>
            </div>

            <Button
              onClick={() => formRef.current?.submit()}
              className="px-6 h-9 rounded-full shadow-sm"
            >
              Save
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-20">
            <CustomerForm
              ref={formRef}
              customer={selectedCustomer}
              showActions={false}
              onSuccess={(result) => {
                setIsFormOpen(false);
                fetchCustomers();
                toast.success(selectedCustomer ? 'Customer updated successfully' : 'Customer created successfully');
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCustomer?.name} from your customer system.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order Wizard */}
      <OrderWizard
        open={isOrderWizardOpen}
        onOpenChange={setIsOrderWizardOpen}
        customerId={selectedCustomerForOrder}
        onSuccess={() => {
          setIsOrderWizardOpen(false);
          setSelectedCustomerForOrder(null);
        }}
      />

      {/* Customer Details Dialog */}
      <CustomerDetails
        customer={customerForDetails}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </div>
  );
};

export default Customers;
