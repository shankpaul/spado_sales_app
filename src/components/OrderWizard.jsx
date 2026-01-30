import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import CustomerForm from './CustomerForm';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ComboBox } from './ui/combobox';
import { DatePicker } from './ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Card } from './ui/card';
import { toast } from 'sonner';
import orderService from '../services/orderService';
import customerService from '../services/customerService';
import { getBrands, getModelsByBrand, getVehicleType, getVehicleTypes } from '../lib/vehicleData';
import {
  STORAGE_KEYS,
  DRAFT_EXPIRY_HOURS,
  MAX_DISCOUNT_PERCENTAGE,
  DISCOUNT_TYPES,
} from '../lib/constants';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  Minus,
  Loader2,
  X,
  Check,
  Calendar,
  User as UserIcon,
  MapPin,
  Package,
  ShoppingCart,
  Car,
  Truck,
  Search,
  Phone,
  PenIcon,
} from 'lucide-react';

/**
 * Order Wizard Component
 * Multi-step wizard for creating/editing orders with localStorage persistence
 * Props: open, onOpenChange, onSuccess, customerId, orderId
 */
const OrderWizard = ({ open, onOpenChange, onSuccess, customerId = null, orderId = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [identifyDialog, setIdentifyDialog] = useState({ open: false, index: null });
  const [identifyBrand, setIdentifyBrand] = useState('');
  const [identifyModel, setIdentifyModel] = useState('');
  const [deletePackageDialog, setDeletePackageDialog] = useState({ open: false, index: null });
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const customerSearchRef = useRef(null);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editCustomerData, setEditCustomerData] = useState({ phone: '', area: '', city: '' });
  
  // Data states
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);
  const [agents, setAgents] = useState([]);
  
  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [packageItems, setPackageItems] = useState([]);
  const [addonItems, setAddonItems] = useState([]);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTimeFrom, setBookingTimeFrom] = useState('');
  const [bookingTimeTo, setBookingTimeTo] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [address, setAddress] = useState({
    area: '',
    city: '',
    district: '',
    state: '',
    map_link: '',
  });
  const [customerPhone, setCustomerPhone] = useState(''); // Order-specific customer phone
  const [notes, setNotes] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState({});

  // Load draft from localStorage on mount
  useEffect(() => {
    if (open && !orderId) {
      loadDraft();
    }
  }, [open, orderId]);

  // Prefetch data
  useEffect(() => {
    if (open) {
      fetchInitialData();
    }
  }, [open]);

  // Fetch and prefill order data when editing
  useEffect(() => {
    if (open && orderId) {
      fetchOrderData();
    }
  }, [open, orderId]);

  // Debounced customer search
  useEffect(() => {
    if (!customerSearchTerm || customerSearchTerm.length < 2) {
      setCustomers([]);
      setShowCustomerSuggestions(false);
      return;
    }

    setShowCustomerSuggestions(true);
    const timeoutId = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const response = await customerService.getAllCustomers({
          search: customerSearchTerm,
          limit: 20,
        });
        setCustomers(response.customers || []);
      } catch (error) {
        console.error('Error searching customers:', error);
        toast.error('Failed to search customers');
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [customerSearchTerm]);

  // Click outside handler for customer suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target)) {
        setShowCustomerSuggestions(false);
      }
    };

    if (showCustomerSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerSuggestions]);

  // Load draft with expiry check
  const loadDraft = () => {
    try {
      const draft = localStorage.getItem(STORAGE_KEYS.ORDER_WIZARD_DRAFT);
      if (draft) {
        const { data, timestamp } = JSON.parse(draft);
        const now = new Date().getTime();
        const hoursPassed = (now - timestamp) / (1000 * 60 * 60);
        
        if (hoursPassed < DRAFT_EXPIRY_HOURS) {
          // Check if customerId conflicts with draft
          if (customerId && data.selectedCustomer?.id !== customerId) {
            setShowDraftDialog(true);
          } else {
            restoreDraft(data);
          }
        } else {
          clearDraft();
        }
      } else if (customerId) {
        // If no draft but customerId provided, pre-select customer
        fetchCustomerById(customerId);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      clearDraft();
    }
  };

  // Restore draft data
  const restoreDraft = (data) => {
    setCurrentStep(data.currentStep || 1);
    setSelectedCustomer(data.selectedCustomer || null);
    setPackageItems(data.packageItems || []);
    setAddonItems(data.addonItems || []);
    setBookingDate(data.bookingDate || '');
    setBookingTimeFrom(data.bookingTimeFrom || '');
    setBookingTimeTo(data.bookingTimeTo || '');
    setSelectedAgent(data.selectedAgent || '');
    setAddress(data.address || { area: '', city: '', district: '', state: '', map_link: '' });
    setCustomerPhone(data.customerPhone || '');
    setNotes(data.notes || '');
    toast.info('Draft order restored');
  };

  // Save to localStorage (only for new orders, not edit mode)
  const saveDraft = (step = currentStep) => {
    // Don't save draft when editing existing order
    if (orderId) return;
    
    const draftData = {
      currentStep: step,
      selectedCustomer,
      packageItems,
      addonItems,
      bookingDate,
      bookingTimeFrom,
      bookingTimeTo,
      selectedAgent,
      customerPhone,
      address,
      notes,
    };
    
    localStorage.setItem(
      STORAGE_KEYS.ORDER_WIZARD_DRAFT,
      JSON.stringify({
        data: draftData,
        timestamp: new Date().getTime(),
      })
    );
  };

  // Clear draft
  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEYS.ORDER_WIZARD_DRAFT);
  };

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      const [packagesRes, addonsRes, agentsRes] = await Promise.all([
        orderService.getPackages(),
        orderService.getAddons(),
        orderService.getUsersByRole('agent'),
      ]);
      setPackages(packagesRes.packages || packagesRes || []);
      setAddons(addonsRes.addons || addonsRes || []);
      setAgents(agentsRes.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  // Fetch customer by ID
  const fetchCustomerById = async (id) => {
    try {
      const customer = await customerService.getCustomerById(id);
      setSelectedCustomer(customer);
      // Add to customers list if not already there
      setCustomers(prev => {
        const exists = prev.some(c => c.id === customer.id);
        return exists ? prev : [...prev, customer];
      });
      // Prefill address from customer
      if (customer) {
        setAddress({
          area: customer.area || '',
          city: customer.city || '',
          district: customer.district || '',
          state: customer.state || '',
          map_link: customer.map_link || '',
        });
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  };

  // Extract time in HH:MM format from datetime string
  const extractTimeFromDateTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // Fetch and prefill order data for editing
  const fetchOrderData = async () => {
    setLoading(true);
    try {
      const response = await orderService.getOrderById(orderId);
      const order = response.order;
      
      if (order) {
        // Store order status
        setOrderStatus(order.status);
        
        // Set customer
        if (order.customer) {
          setSelectedCustomer({
            id: order.customer_id,
            name: order.customer.name,
            phone: order.customer.phone,
            email: order.customer.email,
          });
          // Set order-specific customer phone (might differ from customer profile)
          setCustomerPhone(order.customer_phone || order.customer.phone || '');
          // Add to customers list for display
          setCustomers([{
            id: order.customer_id,
            name: order.customer.name,
            phone: order.customer.phone,
            email: order.customer.email,
            area: order.customer.area,
            city: order.customer.city,
          }]);
        }
       
        // Set packages with all necessary fields
        const orderPackages = order.packages?.map(pkg => ({
          package_id: String(pkg.package.id), // Convert to string for Select component
          package_name: pkg.package.name,
          vehicle_type: pkg.vehicle_type,
          quantity: pkg.quantity || 1,
          unit_price: parseFloat(pkg.price) || 0,
          discount_value: parseFloat(pkg.discount) || 0,
          discount_type: pkg.discount_type,
          total_price: parseFloat(pkg.total_price) || 0,
          notes: pkg.notes || '',
          package: pkg.package, // Include full package details
        })) || [];
        setPackageItems(orderPackages);
        
        // Set addons
        const orderAddons = order.addons?.map(addon => ({
          addon_id: String(addon.addon.id), // Convert to string for Select component
          addon_name: addon.addon_name,
          quantity: addon.quantity || 1,
          unit_price: parseFloat(addon.price) || 0,
          discount_value: parseFloat(addon.discount) || 0,
          discount_type: addon.discount_type,
          total_price: parseFloat(addon.total_price) || 0,
          addon: addon.addon, // Include full addon details
        })) || [];
        setAddonItems(orderAddons);
        
        // Set booking details
        setBookingDate(order.booking_date || '');
        setBookingTimeFrom(extractTimeFromDateTime(order.booking_time_from));
        setBookingTimeTo(extractTimeFromDateTime(order.booking_time_to));
        
        // Set agent
        setSelectedAgent(order.assigned_to?.id?.toString() || '');
        
        // Set address
        setAddress({
          area: order.area || '',
          city: order.city || '',
          district: order.district || '',
          state: order.state || '',
          map_link: order.map_link || '',
        });
        
        // Set notes
        setNotes(order.notes || '');
        
        toast.success('Order data loaded');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order data');
    } finally {
      setLoading(false);
    }
  };

  // Handle draft dialog
  const handleUseDraft = () => {
    const draft = localStorage.getItem(STORAGE_KEYS.ORDER_WIZARD_DRAFT);
    if (draft) {
      const { data } = JSON.parse(draft);
      restoreDraft(data);
    }
    setShowDraftDialog(false);
  };

  const handleStartFresh = () => {
    clearDraft();
    if (customerId) {
      fetchCustomerById(customerId);
    }
    setShowDraftDialog(false);
  };

  // Handle delete draft
  const handleDeleteDraft = () => {
    clearDraft();
    resetWizard();
    toast.success('Draft deleted');
  };

  // Reset wizard
  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedCustomer(null);
    setPackageItems([]);
    setAddonItems([]);
    setBookingDate('');
    setBookingTimeFrom('');
    setBookingTimeTo('');
    setCustomerPhone('');
    setSelectedAgent('');
    setAddress({ area: '', city: '', district: '', state: '', map_link: '' });
    setNotes('');
    setOrderStatus('');
    setErrors({});
  };

  // Close handler
  const handleClose = () => {
    // Only save draft for new orders, not when editing
    if (!orderId) {
      saveDraft(currentStep);
    }
    onOpenChange(false);
  };

  // Step validation
  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!selectedCustomer) {
        newErrors.customer = 'Please select a customer';
      }
    }
    
    if (step === 2) {
      if (packageItems.length === 0) {
        newErrors.packages = 'Please add at least one package';
      }
      packageItems.forEach((item, index) => {
        if (!item.vehicle_type) newErrors[`package_${index}_vehicle_type`] = 'Required';
        if (!item.package_id) newErrors[`package_${index}_package`] = 'Required';
        if (!item.quantity || item.quantity < 1) newErrors[`package_${index}_quantity`] = 'Required';
      });
    }
    
    if (step === 3) {
      // Validate addons if any are added
      addonItems.forEach((item, index) => {
        if (!item.addon_id) newErrors[`addon_${index}_addon`] = 'Required';
        if (!item.quantity || item.quantity < 1) newErrors[`addon_${index}_quantity`] = 'Required';
      });
    }
    
    if (step === 4) {
      if (!bookingDate) newErrors.bookingDate = 'Required';
      if (!bookingTimeFrom) newErrors.bookingTimeFrom = 'Required';
      if (!bookingTimeTo) newErrors.bookingTimeTo = 'Required';
      if (!address.area) newErrors.area = 'Area is required';
      
      // Validate time range
      if (bookingTimeFrom && bookingTimeTo && bookingTimeFrom >= bookingTimeTo) {
        newErrors.bookingTimeTo = 'End time must be after start time';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(currentStep)) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveDraft(nextStep);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // Package item handlers
  const addPackageItem = () => {
    setPackageItems([
      ...packageItems,
      {
        brand: '',
        model: '',
        vehicle_type: '',
        package_id: '',
        quantity: 1,
        unit_price: 0,
        discount_type: DISCOUNT_TYPES.FIXED,
        discount_value: 0,
      },
    ]);
  };

  const removePackageItem = (index) => {
    setPackageItems(packageItems.filter((_, i) => i !== index));
  };

  const updatePackageItem = (index, field, value) => {
    const updated = [...packageItems];
    updated[index][field] = value;
    
    // Auto-fill vehicle type when brand and model selected
    if (field === 'model' && updated[index].brand) {
      const vehicleType = getVehicleType(updated[index].brand, value);
      if (vehicleType) {
        updated[index].vehicle_type = vehicleType;
      }
    }
    
    // Update price when package selected
    if (field === 'package_id') {
      const pkg = packages.find((p) => String(p.id) === String(value));
      if (pkg) {
        updated[index].unit_price = pkg.unit_price || pkg.price || 0;
      }
    }
    
    setPackageItems(updated);
    saveDraft();
  };

  // Calculate line total
  const calculateLineTotal = (item) => {
    const subtotal = item.quantity * item.unit_price;
    let discount = 0;
    
    if (item.discount_type === DISCOUNT_TYPES.PERCENTAGE) {
      discount = (subtotal * item.discount_value) / 100;
    } else {
      discount = item.discount_value;
    }
    
    // Ensure discount doesn't exceed 50% of subtotal
    const maxDiscount = subtotal * 0.5;
    discount = Math.min(discount, maxDiscount);
    
    return subtotal - discount;
  };

  // Generate time options in 30-minute intervals
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 6; hour <= 20; hour++) {
      for (let minute of [0, 30]) {
        const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const displayHour = hour === 12 ? 12 : hour > 12 ? hour - 12 : hour;
        const period = hour < 12 ? 'AM' : 'PM';
        const displayTime = `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
        times.push({ value: timeValue, label: displayTime });
      }
    }
    return times;
  };

  // Calculate totals
  const calculateTotals = () => {
    const packageTotal = packageItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
    const addonTotal = addonItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
    return {
      packages: packageTotal,
      addons: addonTotal,
      total: packageTotal + addonTotal,
    };
  };

  // Addon item handlers
  const addAddonItem = () => {
    setAddonItems([
      ...addonItems,
      {
        addon_id: '',
        quantity: 1,
        unit_price: 0,
        discount_type: DISCOUNT_TYPES.FIXED,
        discount_value: 0,
      },
    ]);
  };

  const removeAddonItem = (index) => {
    setAddonItems(addonItems.filter((_, i) => i !== index));
  };

  const updateAddonItem = (index, field, value) => {
    const updated = [...addonItems];
    updated[index][field] = value;
    
    if (field === 'addon_id') {
      const addon = addons.find((a) => String(a.id) === String(value));
      if (addon) {
        updated[index].unit_price = addon.unit_price || addon.price || 0;
      }
    }
    
    setAddonItems(updated);
    saveDraft();
  };

  // Submit handlers
  const handleSubmit = async (status = null) => {
    if (!validateStep(4)) return;
    // If no status provided and in edit mode, keep current status
    const finalStatus = status || orderStatus || 'draft';
    console.log('Submitting order with status:', finalStatus);
    setLoading(true);
    try {
      const orderData = {
        customer_id: selectedCustomer.id,
        customer_phone: customerPhone || selectedCustomer.phone, // Order-specific phone
        status: finalStatus,
        booking_date: bookingDate,
        booking_time_from: bookingTimeFrom,
        booking_time_to: bookingTimeTo,
        agent_id: selectedAgent,
        address,
        notes,
        packages: packageItems.map((item) => ({
          package_id: item.package_id,
          // brand: item.brand,
          // model: item.model,
          vehicle_type: item.vehicle_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
        })),
        addons: addonItems.map((item) => ({
          addon_id: item.addon_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
        })),
      };
      
      if (orderId) {
        await orderService.updateOrder(orderId, orderData);
        toast.success('Order updated successfully');
      } else {
        await orderService.createOrder(orderData);
        toast.success(`Order ${finalStatus === 'draft' ? 'saved as draft' : 'confirmed'} successfully`);
      }
      
      clearDraft();
      resetWizard();
      onSuccess();
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error(error.response?.data?.message || 'Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  // Render step content (continued in next part due to size)
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  // Step 1: Customer Selection
  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label>Select Customer *</Label>
        <div className="relative" ref={customerSearchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer by name or phone..."
              value={selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.phone}` : customerSearchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setCustomerSearchTerm(value);
                setSelectedCustomer(null);
              }}
              onFocus={() => {
                if (customerSearchTerm.length >= 2) {
                  setShowCustomerSuggestions(true);
                }
              }}
              className="pl-10"
            />
            {customerSearchLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {/* Suggestions Dropdown */}
          {showCustomerSuggestions && customerSearchTerm.length >= 2 && (
            <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto shadow-lg">
              {customerSearchLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Searching...
                </div>
              ) : customers.length > 0 ? (
                <div className="py-1">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors border-b last:border-b-0"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerPhone(customer.phone || ''); // Initialize order-specific phone
                        setCustomerSearchTerm('');
                        setShowCustomerSuggestions(false);
                        setAddress({
                          area: customer.area || '',
                          city: customer.city || '',
                          district: customer.district || '',
                          state: customer.state || '',
                          map_link: customer.map_link || '',
                        });
                        saveDraft();
                      }}
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                        {customer.area && (
                          <>
                            <span>•</span>
                            <MapPin className="h-3 w-3" />
                            {customer.area}
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No customers found matching "{customerSearchTerm}"
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setShowCustomerSuggestions(false);
                      setShowCustomerForm(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Customer
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
        {errors.customer && <p className="text-sm text-destructive mt-1">{errors.customer}</p>}
      </div>
      
      {selectedCustomer && (
        <Card className="p-4 bg-secondary/50">
          <div className="flex justify-between items-start">
            <div className="space-y-2 text-sm flex-1">
              <div><strong>Name:</strong> {selectedCustomer.name}</div>
              
              {editingCustomer ? (
                <div className='grid grid-cols-2 gap-2 '>
                  <div>
                    <Label className="text-xs">Phone (Order-specific)</Label>
                    <Input
                      value={editCustomerData.phone}
                      onChange={(e) => setEditCustomerData({ ...editCustomerData, phone: e.target.value })}
                      placeholder="Phone number"
                      className="h-8"
                    />
                  </div>
                  <div className="flex gap-2 pt-5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setCustomerPhone(editCustomerData.phone);
                        setAddress({
                          ...address,
                          area: editCustomerData.area || address.area,
                          city: editCustomerData.city || address.city,
                        });
                        setEditingCustomer(false);
                        saveDraft();
                        toast.success('Order details updated');
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCustomer(false);
                        setEditCustomerData({ phone: '', area: '', city: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <strong>Phone:</strong> {customerPhone || selectedCustomer.phone}
                    {customerPhone && customerPhone !== selectedCustomer.phone && (
                      <span className="text-xs text-muted-foreground ml-2">(Order-specific)</span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-1">
              {!editingCustomer && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditCustomerData({
                      phone: customerPhone || selectedCustomer.phone || '',
                      area: address.area || selectedCustomer.area || '',
                      city: address.city || selectedCustomer.city || '',
                    });
                    setEditingCustomer(true);
                  }}
                  title="Edit details"
                >
                  <PenIcon className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearchTerm('');
                  setEditingCustomer(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">

          <div>
            <Label className="text-xs">Map Link</Label>
            <Input
              value={address.map_link}
              onChange={(e) => {
                setAddress({ ...address, map_link: e.target.value });
                saveDraft();
              }}
              placeholder="Google Maps link"
            />
          </div>
          
          <div>
            <Label className="text-xs">Area</Label>
            <Input
              value={address.area}
              onChange={(e) => {
                setAddress({ ...address, area: e.target.value });
                saveDraft();
              }}
              placeholder="Area or locality"
            />
            {errors.area && <p className="text-sm text-destructive mt-1">{errors.area}</p>}
          </div>
          
          {/* <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">City</Label>
              <Input
                value={address.city}
                onChange={(e) => {
                  setAddress({ ...address, city: e.target.value });
                  saveDraft();
                }}
                placeholder="City"
              />
            </div>
            
            <div>
              <Label className="text-xs">District</Label>
              <Input
                value={address.district}
                onChange={(e) => {
                  setAddress({ ...address, district: e.target.value });
                  saveDraft();
                }}
                placeholder="District"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-xs">State</Label>
            <Input
              value={address.state}
              onChange={(e) => {
                setAddress({ ...address, state: e.target.value });
                saveDraft();
              }}
              placeholder="State"
            />
          </div> */}
          
          
        </div>
    </div>
  );

  // Step 2: Package Selection (simplified for now)
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Service Packages *</Label>
        <Button type="button" size="sm" onClick={addPackageItem}>
          <Plus className="h-4 w-4 mr-1" />
          Add Package
        </Button>
      </div>
      
      {errors.packages && <p className="text-sm text-destructive">{errors.packages}</p>}
      
      {packageItems.length === 0 ? (
        <Card className="p-8 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No packages added yet</p>
          <p className="text-xs text-muted-foreground mb-4">Add service packages to proceed with the order</p>
          <Button type="button" variant="outline" size="sm" onClick={addPackageItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service Package
          </Button>
        </Card>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {packageItems.map((item, index) => {
            const hasError = errors[`package_${index}_vehicle_type`] || errors[`package_${index}_package`];
            return (
          <Card key={index} className={`p-4 `}>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="font-medium">Service {index + 1}</span>
                <div className='flex gap-2 items-center'>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs cursor-pointer"
                      onClick={() => {
                        setIdentifyDialog({ open: true, index });
                        setIdentifyBrand('');
                        setIdentifyModel('');
                      }}
                    >
                      <Search className="h-3 w-3 mr-1" />
                      Identify Vehicle Type
                    </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletePackageDialog({ open: true, index })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              
              {hasError && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded">
                  <X className="h-4 w-4" />
                  <span>
                    {errors[`package_${index}_vehicle_type`] && 'Vehicle type is required. '}
                    {errors[`package_${index}_package`] && 'Package selection is required.'}
                  </span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <div className={`flex gap-2 `}>
                    {[{ type: 'hatchback', icon: Car }, { type: 'sedan', icon: Car }, { type: 'suv', icon: Truck }].map(({ type, icon: Icon }) => (
                      <Button
                        key={type}
                        type="button"
                        variant={item.vehicle_type === type ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1 h-10 flex flex-row gap-2 rounded-full cursor-pointer"
                        onClick={() => updatePackageItem(index, 'vehicle_type', type)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs capitalize">{type}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs">Package *</Label>
                  <div>
                    <Select
                      value={item.package_id}
                      onValueChange={(value) => updatePackageItem(index, 'package_id', value)}
                      disabled={!item.vehicle_type}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages
                          .filter((p) => p.vehicle_type?.toLowerCase() === item.vehicle_type?.toLowerCase())
                          .map((pkg) => (
                            <SelectItem key={pkg.id} value={String(pkg.id)}>
                              {pkg.name} - ₹{pkg.unit_price || pkg.price || pkg.base_price}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs">Quantity *</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      className="h-8 w-8  aspect-square rounded-full"
                      onClick={() => {
                        const newQty = Math.max(1, item.quantity - 1);
                        updatePackageItem(index, 'quantity', newQty);
                      }}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      readOnly
                      className="h-8 text-sm text-center bg-secondary"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-8 w-8 aspect-square rounded-full"
                      onClick={() => {
                        updatePackageItem(index, 'quantity', item.quantity + 1);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs">Discount</Label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      min="0"
                      value={item.discount_value}
                      onChange={(e) => updatePackageItem(index, 'discount_value', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                    <Select
                      value={item.discount_type}
                      onValueChange={(value) => updatePackageItem(index, 'discount_type', value)}
                    >
                      <SelectTrigger className="h-8 w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DISCOUNT_TYPES.FIXED}>₹</SelectItem>
                        <SelectItem value={DISCOUNT_TYPES.PERCENTAGE}>%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className='text-right'>
                  <Label className="text-sm">Package Amount</Label>
                  <h2 className="h-8 text-2xl font-bold">
                    {`₹${calculateLineTotal(item).toFixed(2)}`}
                  </h2>
                </div>
              </div>
            </div>
          </Card>
          );
        })}
        </div>
      )}
    </div>
  );

  // Step 3: Add-ons (similar to packages but simpler)
  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <Label>Add-on Services (Optional)</Label>
          <p className="text-xs text-muted-foreground">Additional services for the order</p>
        </div>
        <Button type="button" size="sm" onClick={addAddonItem}>
          <Plus className="h-4 w-4 mr-1" />
          Add Add-on
        </Button>
      </div>
      
      {addonItems.length === 0 ? (
        <Card className="p-8 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No add-ons selected</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={addAddonItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Add-on
          </Button>
        </Card>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {addonItems.map((item, index) => {
            const hasError = errors[`addon_${index}_addon`];
            return (
            <Card key={index} className={`p-4`}>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-medium">Add-on {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAddonItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                
                {hasError && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded">
                    <X className="h-4 w-4" />
                    <span>Add-on selection is required</span>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Add-on Service *</Label>
                    <div>
                      <Select
                        value={item.addon_id}
                        onValueChange={(value) => updateAddonItem(index, 'addon_id', value)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select add-on" />
                        </SelectTrigger>
                        <SelectContent>
                          {addons.map((addon) => (
                            <SelectItem key={addon.id} value={String(addon.id)}>
                              {addon.name} - ₹{addon.unit_price || addon.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Quantity *</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        className="h-8 w-8 rounded-full aspect-square"
                        onClick={() => {
                          const newQty = Math.max(1, item.quantity - 1);
                          updateAddonItem(index, 'quantity', newQty);
                        }}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        readOnly
                        className="h-8 text-sm text-center bg-secondary"
                      />
                      <Button
                        type="button"
                        size="icon"
                        className="h-8 w-8 rounded-full aspect-square"
                        onClick={() => {
                          updateAddonItem(index, 'quantity', item.quantity + 1);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  
                  <div>
                    <Label className="text-xs">Discount</Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        min="0"
                        value={item.discount_value}
                        onChange={(e) => updateAddonItem(index, 'discount_value', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                      <Select
                        value={item.discount_type}
                        onValueChange={(value) => updateAddonItem(index, 'discount_type', value)}
                      >
                        <SelectTrigger className="h-8 w-16 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DISCOUNT_TYPES.FIXED}>₹</SelectItem>
                          <SelectItem value={DISCOUNT_TYPES.PERCENTAGE}>%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className='text-right'>
                  <Label className="text-sm">Addon Amount</Label>
                  <h2 className="h-8 text-2xl font-bold">
                    {`₹${calculateLineTotal(item).toFixed(2)}`}
                  </h2>
                </div>
                </div>
              </div>
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );

  // Step 4: Booking Details
  const renderStep4 = () => {
    const totals = calculateTotals();
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className='space-y-4'>
            <div className='flex gap-2'>
              <div className='w-50'>
                <Label>Booking Date *</Label>
                <DatePicker
                  value={bookingDate}
                  onChange={(value) => {
                    setBookingDate(value);
                    saveDraft();
                  }}
                />
                {errors.bookingDate && <p className="text-sm text-destructive mt-1">{errors.bookingDate}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Time *</Label>
                <Select
                  value={bookingTimeFrom}
                  onValueChange={(value) => {
                    setBookingTimeFrom(value);
                    
                    // Auto-calculate toTime (30 minutes later)
                    if (value) {
                      const [hours, minutes] = value.split(':').map(Number);
                      const fromDate = new Date();
                      fromDate.setHours(hours, minutes);
                      fromDate.setMinutes(fromDate.getMinutes() + 30);
                      const toHours = String(fromDate.getHours()).padStart(2, '0');
                      const toMinutes = String(fromDate.getMinutes()).padStart(2, '0');
                      setBookingTimeTo(`${toHours}:${toMinutes}`);
                    }
                    saveDraft();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeOptions().map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bookingTimeFrom && <p className="text-sm text-destructive mt-1">{errors.bookingTimeFrom}</p>}
              </div>
              
              <div>
                <Label>To Time *</Label>
                <Select
                  value={bookingTimeTo}
                  onValueChange={(value) => {
                    setBookingTimeTo(value);
                    saveDraft();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeOptions()
                      .filter((time) => !bookingTimeFrom || time.value > bookingTimeFrom)
                      .map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.bookingTimeTo && <p className="text-sm text-destructive mt-1">{errors.bookingTimeTo}</p>}
              </div>
            </div>
              
            </div>
          
            <div>
              <Label>Assign Agent (Optional)</Label>
              <Select value={selectedAgent || "unassigned"} onValueChange={(value) => {
                setSelectedAgent(value === "unassigned" ? "" : value);
                saveDraft();
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={String(agent.id)}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className='flex-grow flex flex-col'>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  saveDraft();
                }}
                placeholder="Additional notes..."
                className="flex-grow resize-none"
                rows={8}
              />
            </div>
          </div>
          <Card className="p-4 bg-secondary/50">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Packages Total:</span>
              <span className="font-medium">₹{totals.packages.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Add-ons Total:</span>
              <span className="font-medium">₹{totals.addons.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>Grand Total:</span>
              <span>₹{totals.total.toFixed(2)}</span>
            </div>
          </div>
        </Card>
        </div>
        
      </div>
    );
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-6">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center flex-1">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            step === currentStep
              ? 'border-primary bg-primary text-primary-foreground'
              : step < currentStep
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30 bg-background text-muted-foreground'
          }`}>
            {step < currentStep ? <Check className="h-4 w-4" /> : step}
          </div>
          {step < 4 && (
            <div className={`flex-1 h-0.5 mx-2 ${
              step < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {orderId ? 'Edit Order' : 'Create New Order'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Step {currentStep} of 4
                </p>
              </div>
              {!orderId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteDraft}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Draft
                </Button>
              )}
            </div>
            
            {/* Step Indicator */}
            {renderStepIndicator()}
            
            {/* Step Content */}
            <div className="min-h-[400px] pt-5">
              {renderStepContent()}
            </div>
            
            {/* Mobile Bottom Navigation */}
            <div className="sticky bottom-0 bg-background border-t pt-4 pb-2 -mx-6 px-6 md:static md:border-0 md:p-0">
              <div className="flex flex-col md:flex-row justify-between items-center gap-3 lg:ml-7">
                <div className="flex justify-between items-center w-full md:w-auto gap-3">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2 w-full md:w-auto md:ml-auto lg:mr-10">
                  {currentStep < 4 && (
                    <div className="flex items-center gap-2 text-lg font-bold md:ml-4">
                      <span>Total:</span>
                      <span>₹{calculateTotals().total.toFixed(2)}</span>
                    </div>
                  )}

                  {currentStep < 4 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={loading}
                      className="flex-1 md:flex-none"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : orderId ? (
                    // Edit mode buttons
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSubmit()}
                        disabled={loading}
                      >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save
                      </Button>
                      {(orderStatus === 'draft' || orderStatus === 'tentative') && (
                        <Button
                          type="button"
                          onClick={() => handleSubmit('confirmed')}
                          disabled={loading}
                        >
                          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Confirm Order
                        </Button>
                      )}
                      {orderStatus !== 'draft' && orderStatus !== 'tentative' && (
                        <Button
                          type="button"
                          onClick={() => handleSubmit()}
                          disabled={loading}
                        >
                          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Update Order
                        </Button>
                      )}
                    </>
                  ) : (
                    // Create mode buttons
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSubmit('draft')}
                        disabled={loading}
                      >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save as Draft
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSubmit('confirmed')}
                        disabled={loading}
                      >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Confirm Order
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Draft Conflict Dialog */}
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing Draft Found</AlertDialogTitle>
            <AlertDialogDescription>
              You have an existing draft order. Would you like to continue with the draft or start a new order?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartFresh}>Start Fresh</AlertDialogCancel>
            <AlertDialogAction onClick={handleUseDraft}>Continue Draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Package Confirmation Dialog */}
      <ConfirmDialog
        open={deletePackageDialog.open}
        onOpenChange={(open) => !open && setDeletePackageDialog({ open: false, index: null })}
        onConfirm={() => {
          if (deletePackageDialog.index !== null) {
            removePackageItem(deletePackageDialog.index);
          }
        }}
        title="Remove Package"
        description="Are you sure you want to remove this package from the order? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Vehicle Identification Dialog */}
      <Dialog open={identifyDialog.open} onOpenChange={(open) => setIdentifyDialog({ open, index: null })}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Identify Vehicle Type</h3>
              <p className="text-sm text-muted-foreground">Enter brand and model to auto-detect vehicle type</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label>Brand</Label>
                <Select value={identifyBrand} onValueChange={setIdentifyBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {getBrands().map((brand) => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Model</Label>
                <Select value={identifyModel} onValueChange={setIdentifyModel} disabled={!identifyBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {identifyBrand && getModelsByBrand(identifyBrand).map((model) => (
                      <SelectItem key={model.name} value={model.name}>{model.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {identifyBrand && identifyModel && (
                <Card className="p-3 bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        Detected: {getVehicleType(identifyBrand, identifyModel) || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">{identifyBrand} {identifyModel}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIdentifyDialog({ open: false, index: null });
                  setIdentifyBrand('');
                  setIdentifyModel('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!identifyBrand || !identifyModel}
                onClick={() => {
                  const vehicleType = getVehicleType(identifyBrand, identifyModel);
                  if (vehicleType && identifyDialog.index !== null) {
                    updatePackageItem(identifyDialog.index, 'brand', identifyBrand);
                    updatePackageItem(identifyDialog.index, 'model', identifyModel);
                    updatePackageItem(identifyDialog.index, 'vehicle_type', vehicleType.toString().toLowerCase());
                    toast.success(`Vehicle identified as ${vehicleType}`);
                  }
                  setIdentifyDialog({ open: false, index: null });
                  setIdentifyBrand('');
                  setIdentifyModel('');
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Form Dialog */}
      <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Fill in the customer details below. Map link will auto-fill location fields.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            onSuccess={(newCustomer) => {
              setShowCustomerForm(false);
              // Auto-select the new customer
              if (newCustomer && newCustomer.customer) {
                const customer = newCustomer.customer;
                setSelectedCustomer({
                  id: customer.id,
                  name: customer.name,
                  phone: customer.phone,
                  email: customer.email,
                });
                // Add to customers list
                setCustomers(prev => [...prev, customer]);
                // Pre-fill address
                setAddress({
                  area: customer.area || '',
                  city: customer.city || '',
                  district: customer.district || '',
                  state: customer.state || '',
                  map_link: customer.map_link || '',
                });
              }
              toast.success('Customer added and selected');
            }}
            onCancel={() => setShowCustomerForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrderWizard;
