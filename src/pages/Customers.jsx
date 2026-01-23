import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { ComboBox } from '../components/ui/combobox';
import { toast } from 'sonner';
import customerService from '../services/customerService';
import locationService from '../services/locationService';
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
} from 'lucide-react';
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
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    has_whatsapp: true,
    area: '',
    city: '',
    district: '',
    state: 'Kerala',
    country: 'India',
    latitude: null,
    longitude: null,
    map_link: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [mapLinkLoading, setMapLinkLoading] = useState(false);

  // Location data
  const [states] = useState(locationService.getStates());
  const [districts, setDistricts] = useState(locationService.getDistricts('Kerala'));
  const [cities, setCities] = useState(locationService.getCities('Kerala'));
  const [areaOptions, setAreaOptions] = useState([]);

  // Fetch customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
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
      setCustomers(response.customers || []);
      setTotalPages(response.pagination?.total_pages || 1);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, searchTerm, dateFilter, customDays]);

  // Update districts and cities when state changes
  useEffect(() => {
    if (formData.state) {
      const newDistricts = locationService.getDistricts(formData.state);
      const newCities = locationService.getCities(formData.state);
      setDistricts(newDistricts);
      setCities(newCities);
      
      // Reset district and city if they don't exist in new lists
      if (!newDistricts.includes(formData.district)) {
        setFormData((prev) => ({ ...prev, district: '' }));
      }
      if (!newCities.includes(formData.city)) {
        setFormData((prev) => ({ ...prev, city: '' }));
      }
    }
  }, [formData.state]);

  // Handle map link paste
  const handleMapLinkChange = async (value) => {
    setFormData((prev) => ({ ...prev, map_link: value }));

    if (value && value.includes('google.com/maps')) {
      setMapLinkLoading(true);
      try {
        const { latitude, longitude } = customerService.parseMapLink(value);
        
        if (latitude && longitude) {
          setFormData((prev) => ({ ...prev, latitude, longitude }));
          
          // Fetch address details
          const addressData = await customerService.reverseGeocode(latitude, longitude);
          setFormData((prev) => ({
            ...prev,
            area: addressData.area || prev.area,
            city: addressData.city || prev.city,
            district: addressData.district || prev.district,
            state: addressData.state || prev.state,
            country: addressData.country || prev.country,
          }));
          
          toast.success('Location details fetched successfully');
        } else {
          toast.warning('Could not extract coordinates from the link');
        }
      } catch (error) {
        console.error('Error processing map link:', error);
        toast.error('Failed to process map link');
      } finally {
        setMapLinkLoading(false);
      }
    }
  };

  // Open form for add/edit
  const handleOpenForm = (customer = null) => {
    if (customer) {
      setSelectedCustomer(customer);
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        has_whatsapp: customer.has_whatsapp ?? true,
        area: customer.area || '',
        city: customer.city || '',
        district: customer.district || '',
        state: customer.state || 'Kerala',
        country: 'India',
        latitude: customer.latitude || null,
        longitude: customer.longitude || null,
        map_link: customer.map_link || '',
      });
    } else {
      setSelectedCustomer(null);
      setFormData({
        name: '',
        phone: '',
        has_whatsapp: true,
        area: '',
        city: '',
        district: '',
        state: 'Kerala',
        country: 'India',
        latitude: null,
        longitude: null,
        map_link: '',
      });
    }
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setFormLoading(true);

    try {
      // Prepare data with country default to India
      const submitData = { ...formData, country: 'India' };
      
      if (selectedCustomer) {
        await customerService.updateCustomer(selectedCustomer.id, submitData);
        toast.success('Customer updated successfully');
      } else {
        await customerService.createCustomer(submitData);
        toast.success('Customer created successfully');
      }
      
      setIsFormOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setFormLoading(false);
    }
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
    setPage(1); // Reset to first page
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
      <Card className="p-4">
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
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
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
              onChange={(e) => {
                setCustomDays(e.target.value);
                setPage(1);
              }}
              min="1"
            />
          )}
        </div>
      </Card>

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
                    <th className="px-4 py-3 font-medium">Phone</th>
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
                          <span className="font-medium">{customer.name}</span>
                          {customer.has_whatsapp && (
                            <MessageCircle className="h-4 w-4 text-green-600" title="WhatsApp" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {customer.phone}
                        </div>
                      </td>
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
                        <h3 className="font-medium">{customer.name}</h3>
                        {customer.has_whatsapp && (
                          <MessageCircle className="h-4 w-4 text-green-600" />
                        )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
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
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setFormErrors({ ...formErrors, name: '' });
                  }}
                  className={formErrors.name ? 'border-destructive' : ''}
                />
                {formErrors.name && (
                  <p className="text-xs text-destructive">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 border rounded-md bg-muted">
                    <span className="text-sm">+91</span>
                  </div>
                  <div className="flex-1">
                    <Input
                      id="phone"
                      type="tel"
                      maxLength={10}
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, phone: value });
                        setFormErrors({ ...formErrors, phone: '' });
                      }}
                      placeholder="10 digit number"
                      className={formErrors.phone ? 'border-destructive' : ''}
                    />
                  </div>
                </div>
                {formErrors.phone && (
                  <p className="text-xs text-destructive">{formErrors.phone}</p>
                )}
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                Using WhatsApp on this number
              </Label>
              <div className="flex items-center space-x-2 h-9">
                <Switch
                  id="whatsapp"
                  checked={formData.has_whatsapp}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, has_whatsapp: checked })
                  }
                />
                <span className="text-sm text-muted-foreground">
                  {formData.has_whatsapp ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Map Link */}
            <div className="space-y-2">
              <Label htmlFor="map_link">Google Maps Link</Label>
              <div className="relative">
                <Textarea
                  id="map_link"
                  value={formData.map_link}
                  onChange={(e) => handleMapLinkChange(e.target.value)}
                  placeholder="Paste Google Maps link here to auto-fill location..."
                  rows={2}
                  disabled={mapLinkLoading}
                />
                {mapLinkLoading && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>

            {/* State, District, City */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <ComboBox
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                  options={states}
                  placeholder="Select state"
                />
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <ComboBox
                  value={formData.district}
                  onValueChange={(value) => setFormData({ ...formData, district: value })}
                  options={districts}
                  placeholder="Select district"
                  emptyText={formData.state ? 'No districts available' : 'Select state first'}
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <ComboBox
                  value={formData.city}
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                  options={cities}
                  placeholder="Select city"
                  emptyText={formData.state ? 'No cities available' : 'Select state first'}
                />
              </div>
            </div>

            {/* Area */}
            <div className="space-y-2">
              <Label htmlFor="area">Area / Locality</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="Enter area or locality name"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedCustomer ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
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
    </div>
  );
};

export default Customers;
