import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import CustomerForm from '../components/CustomerForm';
import CustomerDetails from '../components/CustomerDetails';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
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
} from 'lucide-react';
import OrderWizard from '../components/OrderWizard';
import { format } from 'date-fns';

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
    <div className="p-4 md:p-2 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Customers</option>
            <option value="7d">Last 7 days</option>
            <option value="1m">Last month</option>
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="custom">Custom days</option>
          </select>

          {/* Custom Days Input */}
          {dateFilter === 'custom' && (
            <Input
              type="number"
              placeholder="Enter days"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              min="1"
            />
          )}
        </div>

      {/* Customer List */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No customers found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Name</th>
                    {/* <th className="px-4 py-3 font-medium">Phone</th> */}
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Last Booked</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleViewDetails(customer)}
                            className="font-medium hover:text-primary hover:underline cursor-pointer transition-colors"
                          >
                            {customer.name}
                          </button>
                        </div>
                      </td>
                      {/* <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {customer.phone}
                        </div>
                      </td> */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {customer.city || customer.area || customer.district || 'N/A'}
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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenForm(customer)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y">
              {customers.map((customer) => (
                <div key={customer.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => handleViewDetails(customer)}
                          className="font-medium hover:text-primary hover:underline cursor-pointer transition-colors"
                        >
                          {customer.name}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(customer)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCustomerForOrder(customer.id);
                          setIsOrderWizardOpen(true);
                        }}
                        title="Create Order"
                      >
                        <ShoppingCart className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenForm(customer)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {customer.city || customer.area || customer.district || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Last booked: {formatDate(customer.last_booked_at)}
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
        <div ref={observerTarget} className="flex items-center justify-center py-4">
          {isLoadingMore.current && (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          )}
        </div>
      )}

      {/* Results Info */}
      {!loading && customers.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {customers.length} of {totalCount} customers
        </div>
      )}

      {/* Customer Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
            <DialogDescription>
              Fill in the customer details below. Map link will auto-fill location fields.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            customer={selectedCustomer}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchCustomers();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCustomer?.name} from your customer database.
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
          toast.success('Order created successfully');
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
