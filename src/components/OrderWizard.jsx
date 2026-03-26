import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
  Sheet,
  SheetContent,
} from './ui/sheet';
import { Button } from './ui/button';
import { calculateBookingDuration, reverseGeocode } from '../lib/utilities';
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
import { Skeleton } from './ui/skeleton';
import VehicleIcon from './VehicleIcon';
import { toast } from 'sonner';
import orderService from '../services/orderService';
import customerService from '../services/customerService';
import offerService from '../services/offerService';
import loyaltyService from '../services/loyaltyService';
import useOrderStore from '../store/orderStore';
import { getBrands, getModelsByBrand, getVehicleType, getVehicleTypes } from '../lib/vehicleData';
import {
  STORAGE_KEYS,
  DRAFT_EXPIRY_HOURS,
  MAX_DISCOUNT_PERCENTAGE,
  DISCOUNT_TYPES,
  GST_PERCENTAGE,
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
  ArrowLeft,
  LoaderCircle,
  AlertCircle,
  Tag,
  Gift,
  Percent,
  Coins,
  Info,
} from 'lucide-react';

/**
 * Order Wizard Component
 * Multi-step wizard for creating/editing orders with localStorage persistence
 * Props: open, onOpenChange, onSuccess, customerId, orderId, enquiryId
 */
const OrderWizard = ({ open, onOpenChange, onSuccess, customerId = null, orderId = null, enquiryId = null }) => {
  // Get agents from store
  const { agents, fetchAgents } = useOrderStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [identifyDialog, setIdentifyDialog] = useState({ open: false, index: null });
  const [identifyBrand, setIdentifyBrand] = useState('');
  const [identifyModel, setIdentifyModel] = useState('');
  const [deletePackageDialog, setDeletePackageDialog] = useState({ open: false, index: null });
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerInitialData, setNewCustomerInitialData] = useState(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const customerSearchRef = useRef(null);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editCustomerData, setEditCustomerData] = useState({ phone: '', area: '', city: '' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mapLinkLoading, setMapLinkLoading] = useState(false);
  const [mapLinkError, setMapLinkError] = useState(false);

  // Offer states
  const [availableOffers, setAvailableOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offerDetailsDialog, setOfferDetailsDialog] = useState({ open: false, offer: null });

  // Loyalty points states
  const [loyaltySummary, setLoyaltySummary] = useState(null);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [maxRedeemablePoints, setMaxRedeemablePoints] = useState(0);

  // Form refs
  const customerFormRef = useRef(null);
  const appliedOfferRef = useRef(null); // Track which offer has been applied to prevent duplicates

  // Data states
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);

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
  const [submitError, setSubmitError] = useState('');
  const [otherStepErrors, setOtherStepErrors] = useState([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (open && !orderId) {
      loadDraft();
    }
    // Reset submit attempted state when dialog opens/closes
    if (!open) {
      setSubmitAttempted(false);
      setErrors({});
      setOtherStepErrors([]);
      appliedOfferRef.current = null;
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

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Handle map link changes with reverse geocoding
  useEffect(() => {
    if (!address.map_link || address.map_link.trim() === '') {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setMapLinkLoading(true);
      setMapLinkError(false);
      try {
        // Backend API handles parsing (including shortened URLs), expansion, and geocoding
        const addressDetails = await reverseGeocode(address.map_link);
        
        if (addressDetails) {
          // Update address fields with geocoded data
          setAddress(prev => ({
            ...prev,
            area: addressDetails.area || prev.area,
            city: addressDetails.city || prev.city,
            district: addressDetails.district || prev.district,
            state: addressDetails.state || prev.state,
          }));
          
          toast.success('Address details populated from map link');
          setMapLinkError(false);
          saveDraft();
        }
      } catch (error) {
        toast.error('Failed to process map link. Please enter area manually.');
        setMapLinkError(true);
      } finally {
        setMapLinkLoading(false);
      }
    }, 1000); // 1 second debounce to avoid processing while user is typing

    return () => clearTimeout(timeoutId);
  }, [address.map_link]);

  // Fetch available offers when step 4 is reached
  useEffect(() => {
    const fetchOffers = async () => {
      // Only fetch when on step 4
      if (currentStep !== 4) {
        return;
      }

      // Clear offers if no customer or packages
      if (!selectedCustomer || packageItems.length === 0) {
        setAvailableOffers([]);
        setSelectedOffer(null);
        return;
      }

      setLoadingOffers(true);
      try {
        const packageIds = packageItems.map(item => parseInt(item.package_id)).filter(id => !isNaN(id));
        const addonIds = addonItems.map(item => parseInt(item.addon_id)).filter(id => !isNaN(id));
        
        if (packageIds.length === 0) {
          setAvailableOffers([]);
          setSelectedOffer(null);
          return;
        }

        const response = await offerService.getAvailableOffers({
          package_ids: packageIds,
          addon_ids: addonIds,
          customer_id: selectedCustomer.id,
        });
        
        const offers = response.data || [];
        setAvailableOffers(offers);

        // Check if previously selected offer is still valid
        if (selectedOffer) {
          const isStillValid = offers.some(offer => offer.id === selectedOffer.id);
          if (!isStillValid) {
            // Remove offer if no longer valid
            removeOfferRewards(selectedOffer.id);
            setSelectedOffer(null);
          }
        }
      } catch (error) {
        setAvailableOffers([]);
        if (selectedOffer) {
          removeOfferRewards(selectedOffer.id);
          setSelectedOffer(null);
        }
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, [currentStep, selectedCustomer, packageItems, addonItems]);

  // Fetch loyalty points when customer is selected or step 4 is reached
  useEffect(() => {
    const fetchLoyaltyData = async () => {
      // Only fetch when on step 4
      if (currentStep !== 4) {
        return;
      }

      // Clear loyalty data if no customer
      if (!selectedCustomer) {
        setLoyaltySummary(null);
        setPointsToRedeem('');
        setMaxRedeemablePoints(0);
        return;
      }

      setLoadingLoyalty(true);
      try {
        const summary = await loyaltyService.getCustomerSummary(selectedCustomer.id);
        setLoyaltySummary(summary.data);

        // Calculate max redeemable based on current order total
        const totals = calculateTotals();
        if (totals.subtotalAfterDiscount > 0) {
          const maxRedeemable = await loyaltyService.calculateMaxRedeemable(
            selectedCustomer.id,
            totals.subtotalAfterDiscount
          );
          const newMaxRedeemable = maxRedeemable.data.max_redeemable_points || 0;
          setMaxRedeemablePoints(newMaxRedeemable);

          // If user has already entered points, validate they're still within the new max
          if (pointsToRedeem && parseInt(pointsToRedeem) > newMaxRedeemable) {
            setPointsToRedeem(newMaxRedeemable);
          }
        }
      } catch (error) {
        setLoyaltySummary(null);
        setMaxRedeemablePoints(0);
      } finally {
        setLoadingLoyalty(false);
      }
    };

    fetchLoyaltyData();
  }, [currentStep, selectedCustomer, packageItems, addonItems, selectedOffer]);

  // Check if selected offer is still valid when available offers change
  useEffect(() => {
    // Only proceed if we're on step 4 and have checked offers
    if (currentStep !== 4 || loadingOffers) return;

    // If an offer is selected but not in available offers, it was already removed in fetchOffers
    // This useEffect is now mainly for edge cases
    if (selectedOffer && availableOffers.length > 0) {
      const isStillAvailable = availableOffers.some(offer => offer.id === selectedOffer.id);
      if (!isStillAvailable) {
        removeOfferRewards(selectedOffer.id);
        setSelectedOffer(null);
      }
    }
  }, [availableOffers, selectedOffer, currentStep, loadingOffers]);

  // Auto-apply offer rewards when an offer is selected
  useEffect(() => {
    if (selectedOffer) {
      // Only apply if this offer hasn't been applied yet
      if (appliedOfferRef.current !== selectedOffer.id) {
        // Check if offer has reward packages or addons
        if ((selectedOffer.reward_packages && selectedOffer.reward_packages.length > 0) ||
            (selectedOffer.reward_addons && selectedOffer.reward_addons.length > 0)) {
          applyOfferRewards(selectedOffer);
          appliedOfferRef.current = selectedOffer.id;
          toast.success(`${selectedOffer.name} applied with rewards!`);
        }
      }
    } else {
      // Clear the ref when no offer is selected
      appliedOfferRef.current = null;
    }
  }, [selectedOffer]);

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
    setSelectedOffer(data.selectedOffer || null);
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
      selectedOffer,
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
      const [packagesRes, addonsRes] = await Promise.all([
        orderService.getPackages(),
        orderService.getAddons(),
      ]);
      setPackages(packagesRes.packages || packagesRes || []);
      setAddons(addonsRes.addons || addonsRes || []);
      // Fetch agents from store if not already loaded
      if (agents.length === 0) {
        fetchAgents();
      }
    } catch (error) {
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

  // Extract date in YYYY-MM-DD format from datetime string
  const extractDateFromDateTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
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
          package_id: String(pkg.package_id), // Convert to string for Select component
          package_name: pkg.package_name || pkg.name,
          vehicle_type: pkg.vehicle_type,
          quantity: pkg.quantity || 1,
          unit_price: parseFloat(pkg.price) || 0,
          discount_value: parseFloat(pkg.discount) || 0,
          discount_type: pkg.discount_type,
          total_price: parseFloat(pkg.total_price) || 0,
          notes: pkg.notes || '',
          package: pkg, // Include full package details
        })) || [];
        setPackageItems(orderPackages);

        // Set addons
        const orderAddons = order.addons?.map(addon => ({
          addon_id: String(addon.addon_id), // Convert to string for Select component
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
        setBookingDate(extractDateFromDateTime(order.booking_date));
        setBookingTimeFrom(extractTimeFromDateTime(order.booking_time_from));
        setBookingTimeTo(extractTimeFromDateTime(order.booking_time_to));

        // Set agent
        setSelectedAgent(order.assigned_to?.id?.toString() || '');

        // Set address from order.address object
        setAddress({
          area: order.address?.area || '',
          city: order.address?.city || '',
          district: order.address?.district || '',
          state: order.address?.state || '',
          map_link: order.address?.map_link || '',
        });

        // Set notes
        setNotes(order.notes || '');

        // Set redeemed points if any
        if (order.points_redeemed) {
          setPointsToRedeem(order.points_redeemed);
        }

      }
    } catch (error) {
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
    setSubmitError('');
    setErrors({});
    setOtherStepErrors([]);
    setSubmitAttempted(false);
    setSelectedOffer(null);
    setAvailableOffers([]);
    appliedOfferRef.current = null;
  };

  // Close handler
  const handleClose = () => {
    // Only save draft for new orders, not when editing
    if (!orderId) {
      saveDraft(currentStep);
    }
    onOpenChange(false);
  };

  // Get validation errors for a specific step (without setting state)
  const getStepErrors = (step) => {
    const stepErrors = {};

    if (step === 1) {
      if (!selectedCustomer) {
        stepErrors.customer = 'Please select a customer';
      }
    }

    if (step === 2) {
      if (packageItems.length === 0) {
        stepErrors.packages = 'Please add at least one package';
      }
      packageItems.forEach((item, index) => {
        if (!item.vehicle_type) stepErrors[`package_${index}_vehicle_type`] = 'Required';
        if (!item.package_id) stepErrors[`package_${index}_package`] = 'Required';
        if (!item.quantity || item.quantity < 1) stepErrors[`package_${index}_quantity`] = 'Required';
      });
    }

    if (step === 3) {
      // Validate addons if any are added
      addonItems.forEach((item, index) => {
        if (!item.addon_id) stepErrors[`addon_${index}_addon`] = 'Required';
        if (!item.quantity || item.quantity < 1) stepErrors[`addon_${index}_quantity`] = 'Required';
      });
    }

    if (step === 4) {
      if (!bookingDate) stepErrors.bookingDate = 'Required';
      if (!bookingTimeFrom) stepErrors.bookingTimeFrom = 'Required';
      if (!bookingTimeTo) stepErrors.bookingTimeTo = 'Required';

      // Validate time range
      if (bookingTimeFrom && bookingTimeTo && bookingTimeFrom >= bookingTimeTo) {
        stepErrors.bookingTimeTo = 'End time must be after start time';
      }
    }

    return stepErrors;
  };

  // Check errors in all other steps and collect them
  const checkOtherStepsErrors = () => {
    const errorMessages = [];
    
    for (let step = 1; step <= 4; step++) {
      if (step === currentStep) continue; // Skip current step
      
      const stepErrors = getStepErrors(step);
      const errorCount = Object.keys(stepErrors).length;
      
      if (errorCount > 0) {
        const stepName = ['Customer', 'Packages', 'Add-ons', 'Booking date'][step - 1];
        errorMessages.push({
          step,
          stepName,
          message: `Step ${step} (${stepName}) has ${errorCount} error${errorCount > 1 ? 's' : ''}`,
        });
      }
    }
    
    setOtherStepErrors(errorMessages);
  };

  // Step validation (only validate without showing errors unless submit attempted)
  const validateStep = (step, showErrors = false) => {
    const newErrors = getStepErrors(step);
    
    if (showErrors) {
      setErrors(newErrors);
      
      // Also check other steps for errors to display alerts
      if (Object.keys(newErrors).length === 0) {
        checkOtherStepsErrors();
      }
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // Validate all steps and show errors
  const validateAllSteps = () => {
    let allValid = true;
    let firstInvalidStep = null;

    // Check all steps
    for (let step = 1; step <= 4; step++) {
      const stepErrors = getStepErrors(step);
      if (Object.keys(stepErrors).length > 0) {
        allValid = false;
        if (firstInvalidStep === null) {
          firstInvalidStep = step;
        }
      }
    }

    // If invalid, show errors and navigate to first invalid step
    if (!allValid && firstInvalidStep !== null) {
      setCurrentStep(firstInvalidStep);
      const currentStepErrors = getStepErrors(firstInvalidStep);
      setErrors(currentStepErrors);
      checkOtherStepsErrors();
    }

    return allValid;
  };

  // Navigation handlers
  const handleNext = () => {
    // Validate current step before proceeding
    const isValid = validateStep(currentStep, true);
    
    if (!isValid) {
      // Show validation errors and stay on current step
      // toast.error('Please fix the errors before proceeding');
      return;
    }
    
    // Proceed to next step
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    // Clear errors for the new step
    setErrors({});
    
    saveDraft(nextStep);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setSubmitError(''); // Clear submit errors when navigating back
    
    // If submit was attempted, re-validate to show/update errors for the new step
    if (submitAttempted) {
      const prevStepErrors = getStepErrors(currentStep - 1);
      setErrors(prevStepErrors);
      checkOtherStepsErrors();
    }
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
    const itemToRemove = packageItems[index];
    
    // If removing a reward item, clear the associated offer
    if (itemToRemove?.is_reward && itemToRemove?.offer_id) {
      if (selectedOffer && selectedOffer.id === itemToRemove.offer_id) {
        removeOfferRewards(itemToRemove.offer_id);
        setSelectedOffer(null);
        toast.info('Offer removed as reward package was deleted');
        return; // removeOfferRewards will handle the removal
      }
    }
    
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
    const subtotal = packageTotal + addonTotal;
    
    // Apply offer discount if selected
    let offerDiscount = 0;
    if (selectedOffer) {
      if (selectedOffer.discount_type === 'fixed') {
        offerDiscount = selectedOffer.discount_value;
      } else if (selectedOffer.discount_type === 'percentage') {
        offerDiscount = (subtotal * selectedOffer.discount_value) / 100;
      }
    }
    
    const subtotalAfterDiscount = Math.max(0, subtotal - offerDiscount);
    
    // Apply loyalty points discount (points_to_redeem is the discount value in rupees)
    const pointsDiscount = pointsToRedeem || 0;
    const subtotalAfterPointsDiscount = Math.max(0, subtotalAfterDiscount - pointsDiscount);
    
    const gst = (subtotalAfterPointsDiscount * GST_PERCENTAGE) / 100;
    const totalBeforeRounding = subtotalAfterPointsDiscount + gst;
    const roundedTotal = Math.round(totalBeforeRounding);
    const roundOff = roundedTotal - totalBeforeRounding;
    
    return {
      packages: packageTotal,
      addons: addonTotal,
      subtotal,
      offerDiscount,
      subtotalAfterDiscount,
      pointsDiscount,
      subtotalAfterPointsDiscount,
      gst,
      gstPercentage: GST_PERCENTAGE,
      roundOff,
      total: roundedTotal,
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
    const itemToRemove = addonItems[index];
    
    // If removing a reward item, clear the associated offer
    if (itemToRemove?.is_reward && itemToRemove?.offer_id) {
      if (selectedOffer && selectedOffer.id === itemToRemove.offer_id) {
        removeOfferRewards(itemToRemove.offer_id);
        setSelectedOffer(null);
        toast.info('Offer removed as reward addon was deleted');
        return; // removeOfferRewards will handle the removal
      }
    }
    
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

  // Apply offer rewards (add reward packages and addons)
  const applyOfferRewards = (offer) => {
    if (!offer) return;

    // Track IDs of reward items being added
    const rewardPackageIds = new Set();
    const rewardAddonIds = new Set();

    // Add reward packages to the order
    if (offer.reward_packages && offer.reward_packages.length > 0) {
      offer.reward_packages.forEach(pkg => {
        rewardPackageIds.add(pkg.id);
        
        // Check if this reward package is already in the order
        const existingIndex = packageItems.findIndex(item => 
          String(item.package_id) === String(pkg.id) && item.is_reward === true
        );

        if (existingIndex === -1) {
          // Find the package details from the packages list to get vehicle type
          const packageDetails = packages.find(p => String(p.id) === String(pkg.id));
          // Add new reward package
          setPackageItems(prev => [...prev, {
            brand: '',
            model: '',
            vehicle_type: packageDetails?.vehicle_type || '',
            package_id: String(pkg.id),
            quantity: 1,
            unit_price: packageDetails?.unit_price || packageDetails?.price || 0,
            discount_type: DISCOUNT_TYPES.PERCENTAGE,
            discount_value: 100,
            is_reward: true, // Mark as reward item
            offer_id: offer.id,
          }]);
        }
      });
    }

    // Add reward addons to the order
    if (offer.reward_addons && offer.reward_addons.length > 0) {
      offer.reward_addons.forEach(addon => {
        rewardAddonIds.add(addon.id);
        
        // Check if this reward addon is already in the order
        const existingIndex = addonItems.findIndex(item => 
          String(item.addon_id) === String(addon.id) && item.is_reward === true
        );

        if (existingIndex === -1) {
          // Find the addon details from the addons list to get unit price
          const addonDetails = addons.find(a => String(a.id) === String(addon.id));
          
          // Add new reward addon
          setAddonItems(prev => [...prev, {
            addon_id: String(addon.id),
            quantity: 1,
            unit_price: addonDetails?.unit_price || addonDetails?.price || 0,
            discount_type: DISCOUNT_TYPES.PERCENTAGE,
            discount_value: 100,
            is_reward: true, // Mark as reward item
            offer_id: offer.id,
          }]);
        }
      });
    }

    saveDraft();
  };

  // Remove offer rewards from the order
  const removeOfferRewards = (offerId) => {
    if (!offerId) return;

    // Remove reward packages added by this offer
    setPackageItems(prev => prev.filter(item => 
      !(item.is_reward === true && item.offer_id === offerId)
    ));

    // Remove reward addons added by this offer
    setAddonItems(prev => prev.filter(item => 
      !(item.is_reward === true && item.offer_id === offerId)
    ));

    // Clear the applied offer ref if it matches
    if (appliedOfferRef.current === offerId) {
      appliedOfferRef.current = null;
    }

    saveDraft();
  };

  // Submit handlers
  const handleSubmit = async (status = null) => {
    setSubmitError(''); // Clear previous errors
    setSubmitAttempted(true); // Mark that submit has been attempted
    
    // Validate all steps and show errors if any
    const allValid = validateAllSteps();
    if (!allValid) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    // If no status provided and in edit mode, keep current status
    const finalStatus = status || orderStatus || 'draft';
    setLoading(true);
    try {
      // Convert time to ISO 8601 datetime format with timezone (RFC3339)
      const bookingDateISO = bookingDate ? `${bookingDate}T00:00:00Z` : null;
      const bookingTimeFromISO = bookingTimeFrom ? `${bookingDate}T${bookingTimeFrom}:00Z` : null;
      const bookingTimeToISO = bookingTimeTo ? `${bookingDate}T${bookingTimeTo}:00Z` : null;

      const orderData = {
        customer_id: parseInt(selectedCustomer.id, 10),
        enquiry_id: enquiryId ? parseInt(enquiryId, 10) : undefined, // Link to enquiry if provided
        contact_phone: customerPhone || selectedCustomer.phone, // Order-specific phone
        status: finalStatus,
        booking_date: bookingDateISO,
        booking_time_from: bookingTimeFromISO,
        booking_time_to: bookingTimeToISO,
        assigned_to_id: selectedAgent && selectedAgent !== 'unassigned' ? parseInt(selectedAgent, 10) : null,
        offer_id: selectedOffer ? parseInt(selectedOffer.id, 10) : null,
        points_redeemed: pointsToRedeem || 0,
        notes,
        packages: packageItems.map((item) => ({
          package_id: parseInt(item.package_id, 10),
          // brand: item.brand,
          // model: item.model,
          vehicle_type: item.vehicle_type,
          quantity: item.quantity,
          price: item.unit_price,
          discount_type: item.discount_type,
          discount: item.discount_value || 0,
        })),
        addons: addonItems.map((item) => ({
          addon_id: parseInt(item.addon_id, 10),
          quantity: item.quantity,
          price: item.unit_price,
          discount_type: item.discount_type,
          discount: item.discount_value || 0,
        })),
        ...address
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
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save order';
      setSubmitError(errorMessage);
      toast.error(errorMessage);
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

  // Render alerts for errors in other steps (only if submit has been attempted)
  const renderOtherStepErrors = () => {
    if (!submitAttempted || otherStepErrors.length === 0) return null;

    return (
      <div className="mb-4 space-y-2">
        {otherStepErrors.map((error, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900"
          >
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{error.message}</p>
              <button
                onClick={() => {
                  setCurrentStep(error.step);
                  setOtherStepErrors([]);
                }}
                className="text-xs text-amber-700 hover:text-amber-900 underline mt-1 font-medium"
              >
                Go to {error.stepName} →
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Step 1: Customer Selection
  const renderStep1 = () => (
    <div className="space-y-4">
      {renderOtherStepErrors()}
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
              disabled={!!orderId}
            />
            {customerSearchLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showCustomerSuggestions && customerSearchTerm.length >= 2 && (
            <Card className="absolute bg-white z-50 w-full mt-1 max-h-64 overflow-y-auto shadow-lg">
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
                      className="w-full px-4 py-3 text-left hover:bg-secondary active:bg-secondary/80 active:scale-[0.99] transition-all border-b last:border-b-0"
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
                      // Check if search term looks like a phone number (digits, spaces, +, -, parentheses)
                      const phonePattern = /^[\d\s+\-()]+$/;
                      const isPhone = phonePattern.test(customerSearchTerm.trim());
                      
                      if (isPhone) {
                        // Prefill phone number
                        setNewCustomerInitialData({ phone: customerSearchTerm.trim() });
                      } else {
                        setNewCustomerInitialData(null);
                      }
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
              {!orderId && (
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
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">

        <div>
          <Label className="text-xs">Map Link</Label>
          <div className="relative">
            <Input
              value={address.map_link}
              onChange={(e) => {
                setAddress({ ...address, map_link: e.target.value });
              }}
              placeholder="Google Maps link"
              disabled={mapLinkLoading}
            />
            {mapLinkLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Paste Google Maps link to auto-fill address details
          </p>
        </div>

        <div>
          <Label className="text-xs flex items-center">Area
            
          </Label>
          <Input
            value={address.area}
            onChange={(e) => {
              setAddress({ ...address, area: e.target.value });
              setMapLinkError(false); // Clear error when user manually edits
              saveDraft();
            }}
            placeholder="Area or locality"
          />
          {mapLinkLoading && (
              <span className="text-blue-500 text-xs flex items-center gap-1 mt-2"><LoaderCircle className="h-3 w-3 mr-1 animate-spin" /> Identifying the Area from map link</span>
            )}
            {mapLinkError && !mapLinkLoading && (
              <span className="text-amber-500 text-xs mt-2">Sorry!! Unable to find the location, please update manually</span>
            )}
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
  const renderStep2 = () => {
    const hasRewardPackages = packageItems.some(item => item.is_reward);
    
    return (
    <div className="space-y-4">
      {renderOtherStepErrors()}
      <div className="flex justify-between items-center">
        <Label>Service Packages *</Label>
        <Button type="button" size="sm" onClick={addPackageItem}>
          <Plus className="h-4 w-4 mr-1" />
          Add Package
        </Button>
      </div>

      {errors.packages && <p className="text-sm text-destructive">{errors.packages}</p>}

      {hasRewardPackages && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
          <Info className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
          <div className="text-green-800">
            <span className="font-medium">Offer rewards included:</span> Items marked with the "Offer Reward" badge are complimentary and cannot be modified or removed.
          </div>
        </div>
      )}

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
        <div className="space-y-4">
          {packageItems.map((item, index) => {
            const hasError = errors[`package_${index}_vehicle_type`] || errors[`package_${index}_package`];
            return (
              <Card key={index} className={`p-4 ${item.is_reward ? 'bg-green-50 border-green-200' : ''}`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Service {index + 1}</span>
                      {item.is_reward && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                          <Gift className="h-3 w-3" />
                          <span>Offer Reward</span>
                        </div>
                      )}
                    </div>
                    <div className='flex gap-2 items-center'>
                      {!item.is_reward && (
                        <>
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
                        </>
                      )}
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
                        {['hatchback', 'sedan', 'suv', 'luxury'].map((type) => (
                          <Button
                            key={type}
                            type="button"
                            variant={item.vehicle_type === type ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 h-12 flex flex-col md:flex-row items-center justify-center gap-0  md:gap-2 rounded-lg cursor-pointer active:scale-[0.95] transition-all"
                            onClick={() => updatePackageItem(index, 'vehicle_type', type)}
                            disabled={item.is_reward}
                          >
                            <VehicleIcon vehicleType={type} size={32} className={item.vehicle_type === type ? 'text-white' : 'text-black'} />
                            <span className="text-xs capitalize font-semibold -mt-2 md:mt-0">{type}</span>
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
                          disabled={!item.vehicle_type || item.is_reward}
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
                          disabled={item.quantity <= 1 || item.is_reward}
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
                          disabled={item.is_reward}
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
                          placeholder="0"
                          value={item.discount_value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = value === '' ? 0 : parseFloat(value);
                            updatePackageItem(index, 'discount_value', isNaN(numValue) ? 0 : numValue);
                          }}
                          className="h-8 text-sm"
                          disabled={item.is_reward}
                        />
                        <Select
                          value={item.discount_type}
                          onValueChange={(value) => updatePackageItem(index, 'discount_type', value)}
                          disabled={item.is_reward}
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
  };

  // Step 3: Add-ons (similar to packages but simpler)
  const renderStep3 = () => {
    const hasRewardAddons = addonItems.some(item => item.is_reward);

    return (
      <div className="space-y-4">
        {renderOtherStepErrors()}
        
        {hasRewardAddons && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <Info className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div className="text-green-800">
              <span className="font-medium">Offer rewards included:</span> Items marked with the "Offer Reward" badge are complimentary and cannot be modified or removed.
            </div>
          </div>
        )}

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
        <div className="space-y-4">
          {addonItems.map((item, index) => {
            const hasError = errors[`addon_${index}_addon`];
            return (
              <Card key={index} className={`p-4 ${item.is_reward ? 'bg-green-50 border-green-200' : ''}`}>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Add-on {index + 1}</span>
                      {item.is_reward && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                          <Gift className="h-3 w-3" />
                          <span>Offer Reward</span>
                        </div>
                      )}
                    </div>
                    {!item.is_reward && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAddonItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
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
                          disabled={item.is_reward}
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
                          disabled={item.quantity <= 1 || item.is_reward}
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
                          disabled={item.is_reward}
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
                          placeholder="0"
                          value={item.discount_value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = value === '' ? 0 : parseFloat(value);
                            updateAddonItem(index, 'discount_value', isNaN(numValue) ? 0 : numValue);
                          }}
                          className="h-8 text-sm"
                          disabled={item.is_reward}
                        />
                        <Select
                          value={item.discount_type}
                          onValueChange={(value) => updateAddonItem(index, 'discount_type', value)}
                          disabled={item.is_reward}
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
  };

  // Step 4: Booking Details
  const renderStep4 = () => {
    const totals = calculateTotals();

    return (
      <div className="space-y-4">
        {renderOtherStepErrors()}
        {submitError && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error submitting order</p>
              <p className="text-sm text-destructive/90 mt-1">{submitError}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-destructive/20"
              onClick={() => setSubmitError('')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className='space-y-4'>
            <div className='flex gap-2'>
              <div className='w-35 md:w-50'>
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
                  <Label>From *</Label>
                  <Select
                    value={bookingTimeFrom}
                    onValueChange={(value) => {
                      setBookingTimeFrom(value);

                      // Auto-calculate toTime (60 minutes later)
                      if (value) {
                        const [hours, minutes] = value.split(':').map(Number);
                        const fromDate = new Date();
                        fromDate.setHours(hours, minutes);
                        fromDate.setMinutes(fromDate.getMinutes() + 120);
                        const toHours = String(fromDate.getHours()).padStart(2, '0');
                        const toMinutes = String(fromDate.getMinutes()).padStart(2, '0');
                        setBookingTimeTo(`${toHours}:${toMinutes}`);
                      }
                      saveDraft();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {(() => {
                        // Check if booking date is today
                        const today = new Date();
                        const todayStr = today.toISOString().split('T')[0];
                        const isToday = bookingDate === todayStr;
                        
                        if (!isToday) {
                          // Not today - show all times
                          return generateTimeOptions().map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ));
                        }
                        
                        // Today - filter times after current time
                        const currentHour = today.getHours();
                        const currentMinute = today.getMinutes();
                        const currentTimeInMinutes = currentHour * 60 + currentMinute;
                        
                        return generateTimeOptions()
                          .filter((time) => {
                            const [hours, minutes] = time.value.split(':').map(Number);
                            const timeInMinutes = hours * 60 + minutes;
                            return timeInMinutes > currentTimeInMinutes;
                          })
                          .map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ));
                      })()}
                    </SelectContent>
                  </Select>
                  {errors.bookingTimeFrom && <p className="text-sm text-destructive mt-1">{errors.bookingTimeFrom}</p>}
                </div>

                <div>
                  <Label>To *</Label>
                  <Select
                    value={bookingTimeTo}
                    onValueChange={(value) => {
                      setBookingTimeTo(value);
                      saveDraft();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {(() => {
                        // Check if booking date is today
                        const today = new Date();
                        const todayStr = today.toISOString().split('T')[0];
                        const isToday = bookingDate === todayStr;
                        const currentHour = today.getHours();
                        const currentMinute = today.getMinutes();
                        const currentTimeInMinutes = currentHour * 60 + currentMinute;
                        
                        return generateTimeOptions()
                          .filter((time) => {
                            const [hours, minutes] = time.value.split(':').map(Number);
                            const timeInMinutes = hours * 60 + minutes;
                            
                            // Must be after the "From" time
                            if (bookingTimeFrom) {
                              const [fromHours, fromMinutes] = bookingTimeFrom.split(':').map(Number);
                              const fromTimeInMinutes = fromHours * 60 + fromMinutes;
                              if (timeInMinutes <= fromTimeInMinutes) return false;
                            }
                            
                            // If today, must be after current time
                            if (isToday && timeInMinutes <= currentTimeInMinutes) return false;
                            
                            return true;
                          })
                          .map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ));
                      })()}
                    </SelectContent>
                  </Select>
                  {errors.bookingTimeTo && <p className="text-sm text-destructive mt-1">{errors.bookingTimeTo}</p>}
                </div>
              </div>

            </div>
            {bookingTimeFrom && bookingTimeTo && (
              <div className='text-blue-500 text-sm font-medium'>
                {calculateBookingDuration(bookingTimeFrom, bookingTimeTo)}
              </div>
            )}

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

            {/* Available Offers Section */}
            <div>
              <Label className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Available Offers
              </Label>
              {loadingOffers ? (
                <div className="space-y-2 mt-2">
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                        <div className="flex items-center gap-1 mt-2">
                          <Skeleton className="h-3 w-3" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                        <div className="flex items-center gap-1 mt-2">
                          <Skeleton className="h-3 w-3" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </Card>
                </div>
              ) : availableOffers.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {selectedOffer ? (
                    <Card className="p-3 bg-green-50 border-green-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-700">{selectedOffer.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{selectedOffer.description}</p>
                          <div className="flex items-center gap-1 mt-2 text-sm font-semibold text-green-600">
                            <Percent className="h-3 w-3" />
                            {selectedOffer.discount_type === 'percentage' ? (
                              <span>{selectedOffer.discount_value}% Off</span>
                            ) : (
                              <span>₹{selectedOffer.discount_value} Off</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeOfferRewards(selectedOffer.id);
                            setSelectedOffer(null);
                            saveDraft();
                            toast.info('Offer removed');
                          }}
                          className="text-red-600 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {availableOffers.map((offer) => (
                        <Card key={offer.id} className="p-3 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-primary" />
                                <span className="font-medium">{offer.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setOfferDetailsDialog({ open: true, offer })}
                                  className="text-blue-600 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                  title="View offer details"
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                              <div className="flex items-center gap-1 mt-2 text-xs  text-primary">
                                <Percent className="h-3 w-3" />
                                {offer.discount_type === 'percentage' ? (
                                  <span>{offer.discount_value}% Off</span>
                                ) : (
                                  <span>₹{offer.discount_value} Off</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOffer(offer);
                                saveDraft();
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-1 rounded border border-green-700 transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No offers available for the selected items</p>
              )}
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
                rows={isMobile ? 3 : 5}
              />
            </div>
          </div>
          
          <div className='space-y-4'>
            {/* Loyalty Points Redemption Section */}
            <div>
              <Label className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Loyalty Points
              </Label>
              {loadingLoyalty ? (
                <div className="space-y-3 mt-2">
                  <Card className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </Card>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="h-10 flex-1" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </div>
                </div>
              ) : loyaltySummary ? (
                <div className="space-y-3 mt-2">
                  <Card className="p-3 bg-blue-50 border-blue-200">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">Available Points:</span>
                        <span className="text-lg font-bold text-blue-600">{loyaltySummary.current_balance}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-blue-700">
                        <span>Points Value:</span>
                        <span>₹{loyaltySummary.current_value_in_rupees?.toFixed(2)}</span>
                      </div>
                      {maxRedeemablePoints > 0 && (
                        <div className="flex items-center justify-between text-xs text-blue-700">
                          <span>Max Redeemable:</span>
                          <span>{maxRedeemablePoints} points (₹{maxRedeemablePoints.toFixed(2)})</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {maxRedeemablePoints > 0 && loyaltySummary.current_balance >= (loyaltySummary.min_redeem_points || 100) ? (
                    <div className="space-y-2">
                      <Label htmlFor="pointsToRedeem" className="text-sm">
                        Redeem Points (Min: {loyaltySummary.min_redeem_points})
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="pointsToRedeem"
                          type="number"
                          min="0"
                          max={maxRedeemablePoints}
                          step="1"
                          value={pointsToRedeem || ''}
                          disabled={loyaltySummary.current_balance < (loyaltySummary.min_redeem_points || 100)}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            
                            // If empty, keep it empty (don't force to 0)
                            if (inputValue === '') {
                              setPointsToRedeem('');
                              return;
                            }
                            
                            const value = parseInt(inputValue);
                            if (isNaN(value)) {
                              return;
                            }
                            
                            const minPoints = loyaltySummary.min_redeem_points || 100;
                            
                            // Allow typing any value (including below minimum) for flexibility
                            // Only show error when user tries to submit or moves away from input
                            if (value > maxRedeemablePoints) {
                              toast.error(`Maximum ${maxRedeemablePoints} points can be redeemed for this order`);
                              setPointsToRedeem(maxRedeemablePoints);
                              return;
                            }
                            
                            setPointsToRedeem(value);
                          }}
                          onBlur={(e) => {
                            // Validate on blur (when user leaves the input)
                            const value = parseInt(e.target.value);
                            const minPoints = loyaltySummary.min_redeem_points || 100;
                            
                            if (isNaN(value) || e.target.value === '') {
                              setPointsToRedeem('');
                              return;
                            }
                            
                            if (value > 0 && value < minPoints) {
                              toast.error(`Minimum ${minPoints} points required for redemption`);
                              setPointsToRedeem('');
                            }
                          }}
                          placeholder="Enter points to redeem"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPointsToRedeem(maxRedeemablePoints)}
                          disabled={maxRedeemablePoints === 0}
                        >
                          Max
                        </Button>
                        {pointsToRedeem > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPointsToRedeem('')}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      {pointsToRedeem > 0 && (
                        <p className="text-sm text-green-600 font-medium">
                          Discount: ₹{(pointsToRedeem || 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {loyaltySummary.current_balance < (loyaltySummary.min_redeem_points || 100)
                        ? `Minimum ${loyaltySummary.min_redeem_points || 100} points required for redemption. Customer currently have ${loyaltySummary.current_balance} points.`
                        : 'Maximum redeemable points (50% of order value) is 0 for this order amount'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No loyalty points available</p>
              )}
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
              <div className="flex justify-between border-t pt-2">
                <span>Subtotal:</span>
                <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.offerDiscount > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <Gift className="h-3 w-3" />
                      Offer Discount:
                    </span>
                    <span className="font-medium">-₹{totals.offerDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>After Discount:</span>
                    <span>₹{totals.subtotalAfterDiscount.toFixed(2)}</span>
                  </div>
                </>
              )}
              {totals.pointsDiscount > 0 && (
                <>
                  <div className="flex justify-between text-blue-600">
                    <span className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      Points Redeemed ({pointsToRedeem} pts):
                    </span>
                    <span className="font-medium">-₹{totals.pointsDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>After Points:</span>
                    <span>₹{totals.subtotalAfterPointsDiscount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>GST ({totals.gstPercentage}%):</span>
                <span className="font-medium">₹{totals.gst.toFixed(2)}</span>
              </div>
              {totals.roundOff !== 0 && (
                <div className="flex justify-between">
                  <span>Round Off:</span>
                  <span className={`font-medium ${totals.roundOff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totals.roundOff >= 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Grand Total:</span>
                <span>₹{totals.total.toFixed(0)}</span>
              </div>
            </div>
          </Card>
          </div>
        </div>

      </div>
    );
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-4 px-2">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center flex-1">
          <div className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full border-2 text-xs md:text-sm font-medium transition-colors ${step === currentStep
            ? 'border-primary bg-primary text-primary-foreground'
            : step < currentStep
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30 bg-background text-muted-foreground'
            }`}>
            {step < currentStep ? <Check className="h-4 w-4" /> : step}
          </div>
          {step < 4 && (
            <div className={`flex-1 h-0.5 mx-1 md:mx-2 ${step < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
              }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        // Only close if explicitly set to false, not on random state changes
        if (!isOpen) {
          handleClose();
        }
      }}>
        <DialogContent 
          className="max-w-4xl p-0 md:p-6 h-full md:h-auto md:max-h-[90vh] w-full rounded-none md:rounded-xl border-0 md:border overflow-hidden flex flex-col"
          onPointerDownOutside={(e) => {
            // Prevent dialog from closing on outside clicks
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Prevent ESC key from closing dialog accidentally
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            // Prevent any outside interactions from closing dialog
            e.preventDefault();
          }}
        >
          {/* Mobile Header */}
          <div className="md:hidden sticky top-0 z-20 bg-background border-b px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-primary"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <div className="text-center">
              <h2 className="font-bold text-base">
                {orderId ? 'Edit Order' : 'New Order'}
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Step {currentStep} of 4
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-destructive"
              onClick={() => setShowClearConfirm(true)}
              disabled={orderId}
            >
              Clear
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-0">
            <div className="space-y-6 px-1">
              {/* Desktop Header */}
              <div className="hidden md:flex items-center justify-between mb-2">
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
                    onClick={() => setShowClearConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Draft
                  </Button>
                )}
              </div>

              {/* Step Indicator */}
              {/* {renderStepIndicator()} */}

              {/* Step Content */}
              <div className="min-h-[400px] pb-24 md:pb-0">
                {renderStepContent()}
              </div>
            </div>
          </div>

          {/* Sticky Bottom Navigation */}
          <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-md border-t px-4 py-4 md:px-6 md:py-0 md:static md:bg-transparent md:border-0 md:mt-6">
            <div className="flex items-center justify-between w-full h-12 md:h-auto gap-2">
              {/* Back Button Slot */}
              <div className="flex-1 flex justify-start">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    disabled={loading}
                    className="h-10 px-2 md:px-4 md:border md:bg-background"
                  >
                    <ChevronLeft className="h-5 w-5 md:mr-1" />
                    <span className="hidden md:inline">Back</span>
                  </Button>
                )}
              </div>

              {/* Centered Amount */}
              <div className="flex-[2] flex flex-col items-center justify-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-semibold leading-none mb-1">
                  Total
                </span>
                <span className="text-lg font-bold leading-none">
                  ₹{calculateTotals().total.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              </div>

              {/* Next/Confirm Buttons Slot */}
              <div className="flex-1 flex justify-end">
                <div className="flex gap-2">
                  {currentStep < 4 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={loading}
                      size="sm"
                      className="h-10 px-4"
                    >
                      <span className="hidden md:inline mr-1">Next</span>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  ) : orderId ? (
                    // Edit mode buttons
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSubmit()}
                        disabled={loading || loadingOffers || loadingLoyalty}
                        size="sm"
                        className="h-10 hidden md:flex"
                      >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSubmit('confirmed')}
                        disabled={loading || loadingOffers || loadingLoyalty}
                        size="sm"
                        className="h-10 px-4"
                      >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {orderStatus === 'draft' || orderStatus === 'tentative' ? 'Confirm' : 'Update'}
                      </Button>
                    </>
                  ) : (
                    // Create mode buttons
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSubmit('draft')}
                        disabled={loading || loadingOffers || loadingLoyalty}
                        size="sm"
                        className="h-10 hidden md:flex"
                      >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Draft
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSubmit('confirmed')}
                        disabled={loading || loadingOffers || loadingLoyalty}
                        size="sm"
                        className="h-10 px-4"
                      >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Confirm
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sub-dialogs nested inside main DialogContent to prevent interaction issues with parent */}

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

          {/* Clear Draft Confirmation Dialog */}
          <ConfirmDialog
            open={showClearConfirm}
            onOpenChange={setShowClearConfirm}
            onConfirm={() => {
              handleDeleteDraft();
              setShowClearConfirm(false);
            }}
            title="Clear Draft Order"
            description="Are you sure you want to clear this draft? All entered information will be lost."
            confirmText="Clear Draft"
            cancelText="Cancel"
            variant="destructive"
          />

          {/* Vehicle Identification Dialog */}
          <Dialog open={identifyDialog.open} onOpenChange={(open) => setIdentifyDialog({ open, index: null })}>
            <DialogContent className="sm:max-w-md">
              {/* ... (Keep existing content inside) ... */}
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

          {/* Offer Details Dialog */}
          <Dialog open={offerDetailsDialog.open} onOpenChange={(open) => setOfferDetailsDialog({ open, offer: null })}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Offer Details
                </DialogTitle>
              </DialogHeader>
              {offerDetailsDialog.offer && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Offer Name</Label>
                    <p className="text-base font-medium mt-1">{offerDetailsDialog.offer.name}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{offerDetailsDialog.offer.description || 'No description available'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Discount Type</Label>
                      <p className="text-sm mt-1 capitalize">{offerDetailsDialog.offer.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Discount Value</Label>
                      <p className="text-lg font-bold text-primary mt-1">
                        {offerDetailsDialog.offer.discount_type === 'percentage' 
                          ? `${offerDetailsDialog.offer.discount_value}%` 
                          : `₹${offerDetailsDialog.offer.discount_value}`}
                      </p>
                    </div>
                  </div>

                  {offerDetailsDialog.offer.min_order_value && (
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Minimum Order Value</Label>
                      <p className="text-sm mt-1">₹{offerDetailsDialog.offer.min_order_value}</p>
                    </div>
                  )}

                  {offerDetailsDialog.offer.max_discount_amount && (
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Maximum Discount Amount</Label>
                      <p className="text-sm mt-1">₹{offerDetailsDialog.offer.max_discount_amount}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Valid From</Label>
                      <p className="text-sm mt-1">
                        {offerDetailsDialog.offer.start_date 
                          ? new Date(offerDetailsDialog.offer.start_date).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })
                          : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Valid Until</Label>
                      <p className="text-sm mt-1">
                        {offerDetailsDialog.offer.end_date 
                          ? new Date(offerDetailsDialog.offer.end_date).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {offerDetailsDialog.offer.applicable_vehicle_types && offerDetailsDialog.offer.applicable_vehicle_types.length > 0 && (
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Applicable Vehicle Types</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {offerDetailsDialog.offer.applicable_vehicle_types.map((type, index) => (
                          <span key={index} className="px-2 py-1 bg-secondary text-xs rounded capitalize">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {offerDetailsDialog.offer.applicable_packages && offerDetailsDialog.offer.applicable_packages.length > 0 && (
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Applicable Packages</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {offerDetailsDialog.offer.applicable_packages.map((pkg, index) => (
                          <span key={index} className="px-2 py-1 bg-secondary text-xs rounded">
                            {pkg.name || `Package #${pkg.id}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {offerDetailsDialog.offer.terms_and_conditions && (
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Terms & Conditions</Label>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{offerDetailsDialog.offer.terms_and_conditions}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => setOfferDetailsDialog({ open: false, offer: null })}
                      variant="outline"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Customer Form Sheet - App Page Feel on Mobile */}
          <Sheet open={showCustomerForm} onOpenChange={(open) => {
            setShowCustomerForm(open);
            if (!open) {
              setNewCustomerInitialData(null);
            }
          }}>
            <SheetContent
              side={isMobile ? "bottom" : "right"}
              className={`w-full ${isMobile ? 'h-full' : 'sm:max-w-xl'} p-0 flex flex-col bg-gray-50 border-none z-50`}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setShowCustomerForm(false)}
                  >
                    {isMobile ? <ArrowLeft className="h-6 w-6" /> : <X className="h-5 w-5" />}
                  </Button>
                  <div>
                    <h2 className="font-bold text-lg leading-none">Add Customer</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">New entry</p>
                  </div>
                </div>

                <Button
                  onClick={() => customerFormRef.current?.submit()}
                  className="px-6 h-9 rounded-full shadow-sm"
                >
                  Save
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 pb-20">
                <CustomerForm
                  ref={customerFormRef}
                  customer={newCustomerInitialData}
                  showActions={false}
                  onSuccess={(newCustomer) => {
                    setShowCustomerForm(false);
                    setNewCustomerInitialData(null);
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
                  }}
                  onCancel={() => {
                    setShowCustomerForm(false);
                    setNewCustomerInitialData(null);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </DialogContent>
      </Dialog >
    </>
  );
};

export default OrderWizard;
