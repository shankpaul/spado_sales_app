import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
  Sheet,
  SheetContent,
} from './ui/sheet';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import CustomerContact from './CustomerContact';
import CustomerForm from './CustomerForm';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { DatePicker } from './ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import VehicleIcon from './VehicleIcon';
import { ConfirmDialog } from './ui/confirm-dialog';
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
import { toast } from 'sonner';
import subscriptionService from '../services/subscriptionService';
import customerService from '../services/customerService';
import { getBrands, getModelsByBrand, getVehicleType } from '../lib/vehicleData';
import {
  STORAGE_KEYS,
  DRAFT_EXPIRY_HOURS,
  MAX_DISCOUNT_PERCENTAGE,
  DISCOUNT_TYPES,
  PAYMENT_METHODS,
  SUBSCRIPTION_PAYMENT_STATUSES,
  GST_PERCENTAGE,
  generateTimeSlots,
  formatTimeDisplay,
} from '../lib/constants';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  Minus,
  Loader2,
  X,
  Calendar as CalendarIcon,
  Package,
  ShoppingCart,
  Search,
  MapPin,
  IndianRupee,
  Car,
  Truck,
  ArrowLeft,
} from 'lucide-react';
import { format, addMonths } from 'date-fns';

/**
 * Subscription Wizard Component
 * Multi-step wizard for creating subscriptions with localStorage persistence
 * Steps: Customer → Packages → Addons → Washing Schedules → Payment & Summary
 */
const SubscriptionWizard = ({ open, onOpenChange, onSuccess, customerId = null, subscriptionId = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerInitialData, setNewCustomerInitialData] = useState(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [identifyDialog, setIdentifyDialog] = useState({ open: false });
  const [identifyBrand, setIdentifyBrand] = useState('');
  const [identifyModel, setIdentifyModel] = useState('');
  const customerSearchRef = useRef(null);
  const prevMonthsDurationRef = useRef(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Form refs
  const customerFormRef = useRef(null);

  // Data states
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);
  const [existingSubscription, setExistingSubscription] = useState(null);

  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [vehicleType, setVehicleType] = useState('');
  const [monthsDuration, setMonthsDuration] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [packageItems, setPackageItems] = useState([]);
  const [addonItems, setAddonItems] = useState([]);
  const [washingSchedules, setWashingSchedules] = useState([]);
  const [address, setAddress] = useState({
    area: '',
    map_url: '',
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [notes, setNotes] = useState('');

  // Schedule rule states
  const [scheduleMode, setScheduleMode] = useState('manual'); // 'manual' or 'rule-based'
  const [scheduleRule, setScheduleRule] = useState({
    type: 'weekly', // 'weekly' or 'interval'
    weekdays: [], // [0-6] for Sunday-Saturday
    intervalWeeks: 1, // For interval type
    intervalDay: null, // Day of week for interval
    defaultTimeFrom: '09:00',
    defaultTimeTo: '11:00',
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Time slots
  const timeSlots = generateTimeSlots();

  // Load draft from localStorage on mount
  useEffect(() => {
    if (open && !subscriptionId) {
      loadDraft();
    }
  }, [open, subscriptionId]);

  // Fetch initial data
  useEffect(() => {
    if (open) {
      fetchInitialData();
    }
  }, [open]);

  // Fetch existing subscription data when editing
  useEffect(() => {
    if (open && subscriptionId) {
      fetchSubscriptionData();
    }
  }, [open, subscriptionId]);

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
      setHasSearched(false);
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
        setHasSearched(true);
      } catch (error) {
        console.error('Error searching customers:', error);
        toast.error('Failed to search customers');
        setHasSearched(true);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearchTerm]);

  // Auto-save draft
  useEffect(() => {
    if (open && !subscriptionId && selectedCustomer) {
      saveDraft();
    }
  }, [selectedCustomer, vehicleType, monthsDuration, packageItems, addonItems, washingSchedules, address, paymentAmount, paymentMethod, notes]);

  // Generate washing schedules when packages or duration changes
  useEffect(() => {
    if (packageItems.length > 0 && monthsDuration > 0) {
      generateWashingSchedules();
    }
  }, [packageItems, monthsDuration]);

  // Load draft from localStorage
  const loadDraft = () => {
    try {
      const draftData = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_WIZARD_DRAFT);
      if (!draftData) return;

      const draft = JSON.parse(draftData);
      const expiryDate = new Date(draft.expiryDate);

      if (new Date() > expiryDate) {
        localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_WIZARD_DRAFT);
        return;
      }

      // Restore draft data
      if (draft.selectedCustomer) setSelectedCustomer(draft.selectedCustomer);
      if (draft.vehicleType) setVehicleType(draft.vehicleType);
      if (draft.monthsDuration) setMonthsDuration(draft.monthsDuration);
      if (draft.startDate) setStartDate(draft.startDate);
      if (draft.packageItems) setPackageItems(draft.packageItems);
      if (draft.addonItems) setAddonItems(draft.addonItems);
      if (draft.washingSchedules) setWashingSchedules(draft.washingSchedules);
      if (draft.address) setAddress(draft.address);
      if (draft.paymentAmount) setPaymentAmount(draft.paymentAmount);
      if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
      if (draft.notes) setNotes(draft.notes);
    } catch (error) {
      console.error('Error loading draft:', error);
      localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_WIZARD_DRAFT);
    }
  };

  // Save draft to localStorage
  const saveDraft = () => {
    try {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + DRAFT_EXPIRY_HOURS);

      const draft = {
        selectedCustomer,
        vehicleType,
        monthsDuration,
        startDate,
        packageItems,
        addonItems,
        washingSchedules,
        address,
        paymentAmount,
        paymentMethod,
        notes,
        expiryDate: expiryDate.toISOString(),
      };

      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_WIZARD_DRAFT, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  // Clear draft
  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_WIZARD_DRAFT);
  };

  // Handle delete draft
  const handleDeleteDraft = () => {
    clearDraft();
    resetForm();
  };

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      // Fetch packages and addons
      const [packagesRes, addonsRes] = await Promise.all([
        subscriptionService.getSubscriptionPackages(),
        subscriptionService.getAddons(),
      ]);

      setPackages(packagesRes.packages || []);
      setAddons(addonsRes.addons || []);

      // If customerId provided, fetch customer
      if (customerId) {
        const customer = await customerService.getCustomerById(customerId);
        setSelectedCustomer(customer);
        if (customer.area) {
          setAddress({ area: customer.area, map_url: customer.map_url || '' });
        }
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load data');
    }
  };

  // Fetch existing subscription data
  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      const subscription = await subscriptionService.getSubscriptionById(subscriptionId);
      setExistingSubscription(subscription);

      // Populate form with subscription data
      setSelectedCustomer(subscription.customer);
      setVehicleType(subscription.vehicle_type);
      setMonthsDuration(subscription.months_duration);
      setStartDate(subscription.start_date);
      setPackageItems(subscription.packages || []);
      setAddonItems(subscription.addons || []);
      setWashingSchedules(subscription.washing_schedules || []);
      setAddress({ area: subscription.area, map_url: subscription.map_url });
      setPaymentAmount(subscription.payment_amount || '');
      setPaymentDate(subscription.payment_date || '');
      setPaymentMethod(subscription.payment_method || '');
      setPaymentStatus(subscription.payment_status || 'pending');
      setNotes(subscription.notes || '');
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total washes needed
  const calculateTotalWashes = () => {
    return packageItems.reduce((sum, item) => {
      const pkg = packages.find(p => String(p.id) === String(item.package_id));
      return sum + (pkg?.max_washes_per_month || 0) * monthsDuration;
    }, 0);
  };

  // Generate washing schedules (basic - for manual mode)
  const generateWashingSchedules = () => {
    const totalWashes = calculateTotalWashes();

    // Only generate if empty or count changed
    if (washingSchedules.length === 0 || washingSchedules.length !== totalWashes) {
      const newSchedules = Array.from({ length: totalWashes }, () => ({
        date: '',
        time_from: '',
        time_to: '',
        isAutoGenerated: false,
      }));
      setWashingSchedules(newSchedules);
    }
  };

  // Generate washing schedules from rule
  const generateWashingSchedulesFromRule = () => {
    if (!startDate) {
      toast.error('Please select a start date first');
      return;
    }

    const totalWashes = calculateTotalWashes();
    if (totalWashes === 0) {
      toast.error('Please add packages first');
      return;
    }

    const generatedDates = [];
    const startDateObj = new Date(startDate);
    const endDateObj = addMonths(startDateObj, monthsDuration);

    if (scheduleRule.type === 'weekly') {
      if (scheduleRule.weekdays.length === 0) {
        toast.error('Please select at least one day of the week');
        return;
      }

      // Generate dates for selected weekdays
      let currentDate = new Date(startDateObj);
      while (generatedDates.length < totalWashes && currentDate < endDateObj) {
        const dayOfWeek = currentDate.getDay();
        if (scheduleRule.weekdays.includes(dayOfWeek)) {
          generatedDates.push({
            date: format(currentDate, 'yyyy-MM-dd'),
            time_from: scheduleRule.defaultTimeFrom,
            time_to: scheduleRule.defaultTimeTo,
            isAutoGenerated: true,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (scheduleRule.type === 'interval') {
      if (scheduleRule.intervalDay === null) {
        toast.error('Please select a day for the interval');
        return;
      }

      // Generate dates at interval (e.g., every 2 weeks)
      let currentDate = new Date(startDateObj);

      // Find first occurrence of target day
      while (currentDate.getDay() !== scheduleRule.intervalDay && currentDate < endDateObj) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      while (generatedDates.length < totalWashes && currentDate < endDateObj) {
        generatedDates.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          time_from: scheduleRule.defaultTimeFrom,
          time_to: scheduleRule.defaultTimeTo,
          isAutoGenerated: true,
        });
        currentDate.setDate(currentDate.getDate() + (scheduleRule.intervalWeeks * 7));
      }
    }

    if (generatedDates.length < totalWashes) {
      toast.warning(`Only generated ${generatedDates.length} out of ${totalWashes} washes. Consider extending the duration or adjusting the rule.`);
    }

    setWashingSchedules(generatedDates);
    toast.success(`Generated ${generatedDates.length} wash schedules`);
  };

  // Handle customer selection
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm('');
    setShowCustomerSuggestions(false);

    // Pre-fill address if available
    if (customer.area) {
      setAddress({
        area: customer.area,
        map_url: customer.map_url || '',
      });
    }
  };

  // Handle map link parsing (from CustomerContact)
  const handleMapLinkUpdate = (data) => {
    setAddress(prev => ({
      ...prev,
      area: data.area || prev.area,
      map_url: data.map_url || prev.map_url,
    }));
  };

  // Package item handlers
  const addPackageItem = () => {
    setPackageItems([
      ...packageItems,
      {
        package_id: '',
        quantity: 1,
        unit_price: 0,
        price: 0,
        vehicle_type: vehicleType,
        discount: 0,
        discount_type: DISCOUNT_TYPES.FIXED,
        discount_value: 0,
        notes: '',
      },
    ]);
  };

  const removePackageItem = (index) => {
    setPackageItems(packageItems.filter((_, i) => i !== index));
  };

  const updatePackageItem = (index, field, value) => {
    const updated = [...packageItems];
    updated[index][field] = value;

    // Update price when package selected
    if (field === 'package_id') {
      const pkg = packages.find((p) => String(p.id) === String(value));
      if (pkg) {
        updated[index].unit_price = pkg.subscription_price || pkg.unit_price || 0;
        updated[index].vehicle_type = pkg.vehicle_type || vehicleType;
      }
    }

    // Calculate price with discount
    if (['quantity', 'unit_price', 'discount_value', 'discount_type', 'package_id'].includes(field)) {
      const item = updated[index];
      const subtotal = monthsDuration * item.unit_price;
      let discount = 0;

      if (item.discount_type === DISCOUNT_TYPES.PERCENTAGE) {
        // For percentage, discount_value is the percentage amount
        discount = (subtotal * (item.discount_value || 0)) / 100;
      } else {
        // For fixed, discount_value is the fixed amount
        discount = item.discount_value || 0;
      }

      item.discount = discount;
      item.price = Math.max(0, subtotal - discount);
    }

    setPackageItems(updated);
  };

  // Sync package quantities with monthsDuration
  useEffect(() => {
    // Only update if monthsDuration actually changed
    if (packageItems.length > 0 && prevMonthsDurationRef.current !== monthsDuration) {
      const updated = packageItems.map(item => {
        const subtotal = monthsDuration * item.unit_price;
        let discount = 0;

        if (item.discount_type === DISCOUNT_TYPES.PERCENTAGE) {
          // For percentage, discount_value is the percentage amount
          discount = (subtotal * (item.discount_value || 0)) / 100;
        } else {
          // For fixed, discount_value is the fixed amount
          discount = item.discount_value || 0;
        }

        return {
          ...item,
          quantity: 1,
          discount: discount,
          price: Math.max(0, subtotal - discount),
        };
      });
      setPackageItems(updated);
      prevMonthsDurationRef.current = monthsDuration;
    }
  }, [monthsDuration, packageItems]);

  // Addon item handlers
  const addAddonItem = () => {
    setAddonItems([
      ...addonItems,
      {
        addon_id: '',
        quantity: 1,
        unit_price: 0,
        price: 0,
        discount: 0,
        discount_type: DISCOUNT_TYPES.FIXED,
        discount_value: 0,
        application_type: 'all_washes',
        applicable_wash_numbers: [],
      },
    ]);
  };

  const removeAddonItem = (index) => {
    setAddonItems(addonItems.filter((_, i) => i !== index));
  };

  const updateAddonItem = (index, field, value) => {
    const updated = [...addonItems];
    updated[index][field] = value;

    // Update price when addon selected
    if (field === 'addon_id') {
      const addon = addons.find((a) => String(a.id) === String(value));
      if (addon) {
        updated[index].unit_price = addon.unit_price || addon.price || 0;
      }
    }

    // Handle application type change
    if (field === 'application_type') {
      const totalWashes = calculateTotalWashes();
      if (value === 'all_washes') {
        // Select all wash numbers
        updated[index].applicable_wash_numbers = Array.from({ length: totalWashes }, (_, i) => i + 1);
      } else {
        // Clear selections for manual entry
        updated[index].applicable_wash_numbers = [];
      }
    }

    // Calculate price with discount based on selected wash count
    if (['unit_price', 'discount_value', 'discount_type', 'addon_id', 'application_type', 'applicable_wash_numbers'].includes(field)) {
      const item = updated[index];
      const selectedWashCount = item.applicable_wash_numbers?.length || 0;
      const subtotal = item.unit_price * selectedWashCount;
      let discount = 0;

      if (item.discount_type === DISCOUNT_TYPES.PERCENTAGE) {
        // For percentage, discount_value is the percentage amount
        discount = (subtotal * (item.discount_value || 0)) / 100;
      } else {
        // For fixed, discount_value is the fixed amount
        discount = item.discount_value || 0;
      }

      item.discount = discount;
      item.price = Math.max(0, subtotal - discount);
    }

    setAddonItems(updated);
  };

  // Washing schedule handlers
  const updateWashingSchedule = (index, field, value) => {
    const updated = [...washingSchedules];
    updated[index][field] = value;
    // Mark as manually edited if it was auto-generated
    if (updated[index].isAutoGenerated) {
      updated[index].isAutoGenerated = false;
    }
    setWashingSchedules(updated);
  };

  // Validation functions
  const validateStep1 = () => {
    const newErrors = {};
    if (!selectedCustomer) newErrors.customer = 'Please select a customer';
    if (!vehicleType) newErrors.vehicleType = 'Please select vehicle type';
    if (!monthsDuration || monthsDuration < 1) newErrors.monthsDuration = 'Please enter valid duration';
    if (!startDate) newErrors.startDate = 'Please select start date';
    if (!address.area) newErrors.area = 'Please enter service area';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (packageItems.length === 0) {
      newErrors.packages = 'Please add at least one package';
    } else {
      packageItems.forEach((item, index) => {
        if (!item.package_id) newErrors[`package_${index}`] = 'Please select a package';
        if (item.quantity < 1) newErrors[`quantity_${index}`] = 'Quantity must be at least 1';
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};

    // Validate addons if any exist
    addonItems.forEach((item, index) => {
      if (item.addon_id && item.application_type === 'specific_washes') {
        if (!item.applicable_wash_numbers || item.applicable_wash_numbers.length === 0) {
          newErrors[`addon_wash_${index}`] = 'Please select at least one wash for this addon';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors = {};

    // Check if editing subscription has payment status paid/cancelled
    if (subscriptionId && existingSubscription) {
      const canEditSchedules = existingSubscription.payment_status === 'pending';
      if (!canEditSchedules) {
        // Skip validation if can't edit schedules
        return true;
      }
    }

    washingSchedules.forEach((schedule, index) => {
      if (!schedule.date) newErrors[`date_${index}`] = 'Required';
      if (!schedule.time_from) newErrors[`time_from_${index}`] = 'Required';
      if (!schedule.time_to) newErrors[`time_to_${index}`] = 'Required';

      // Validate time_to > time_from
      if (schedule.time_from && schedule.time_to && schedule.time_from >= schedule.time_to) {
        newErrors[`time_${index}`] = 'End time must be after start time';
      }
    });

    // Check for duplicate dates
    const dateMap = new Map();
    washingSchedules.forEach((schedule, index) => {
      if (schedule.date) {
        if (dateMap.has(schedule.date)) {
          newErrors[`date_${index}`] = 'Duplicate date';
          newErrors[`date_${dateMap.get(schedule.date)}`] = 'Duplicate date';
        } else {
          dateMap.set(schedule.date, index);
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep5 = () => {
    const newErrors = {};
    if (canEditPayment) {
      if (!paymentMethod) newErrors.paymentMethod = 'Please select payment method';
      if (!paymentStatus) newErrors.paymentStatus = 'Please select payment status';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      case 4:
        isValid = validateStep4();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      saveDraft();
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    saveDraft();
    setCurrentStep(currentStep - 1);
  };

  // Calculate totals
  const calculateTotals = () => {
    const packageTotal = packageItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const addonTotal = addonItems.reduce((sum, item) => sum + (item.price || 0), 0);
    // Package prices already include quantity (monthsDuration)
    // Addon prices already include selected wash count, no multiplication needed
    const subtotal = packageTotal + addonTotal;
    const gst = (subtotal * GST_PERCENTAGE) / 100;
    const totalBeforeRounding = subtotal + gst;
    const roundedTotal = Math.round(totalBeforeRounding);
    const roundOff = roundedTotal - totalBeforeRounding;

    return {
      packages: packageTotal,
      addons: addonTotal,
      subtotal,
      gst,
      gstPercentage: GST_PERCENTAGE,
      roundOff,
      perMonth: (roundedTotal / monthsDuration),
      total: roundedTotal,
    };
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateStep5()) return;

    setLoading(true);
    try {
      const subscriptionData = {
        customer_id: parseInt(selectedCustomer.id, 10),
        vehicle_type: vehicleType,
        start_date: startDate,
        months_duration: monthsDuration,
        area: address.area,
        map_url: address.map_url,
        packages: packageItems.map(item => ({
          package_id: parseInt(item.package_id, 10),
          quantity: item.quantity,
          unit_price: item.unit_price,
          price: item.price,
          vehicle_type: item.vehicle_type,
          discount: item.discount,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          notes: item.notes || null,
        })),

        addons: addonItems.map(item => ({
          addon_id: parseInt(item.addon_id, 10),
          quantity: 1, // Always 1, pricing based on wash count instead
          unit_price: item.unit_price,
          price: item.price, // Already calculated: unit_price × wash_count - discount
          discount: item.discount,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          applicable_wash_numbers: item.applicable_wash_numbers || [], // Array of wash numbers [1, 2, 3, ...]
        })),
        washing_schedules: washingSchedules,
        payment_amount: paymentAmount ? parseFloat(paymentAmount) : 0,
        payment_date: paymentDate || null,
        payment_method: paymentMethod,
        notes: notes || null,
      };

      await subscriptionService.createSubscription(subscriptionData);

      toast.success('Subscription created successfully');
      clearDraft();
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error(error.response?.data?.message || 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setCurrentStep(1);
    setSelectedCustomer(null);
    setVehicleType('');
    setMonthsDuration(1);
    setStartDate('');
    setPackageItems([]);
    setAddonItems([]);
    setWashingSchedules([]);
    setAddress({ area: '', map_url: '' });
    setPaymentAmount('');
    setPaymentDate('');
    setPaymentMethod('');
    setPaymentStatus('pending');
    setNotes('');
    setErrors({});
  };

  // Handle dialog close
  const handleClose = () => {
    if (!subscriptionId) {
      saveDraft();
    }
    onOpenChange(false);
  };

  // Filtered packages by vehicle type
  const filteredPackages = packages.filter(pkg =>
    !vehicleType || pkg.vehicle_type === vehicleType.toLowerCase()
  );

  const totals = calculateTotals();

  // Check if can edit schedules (only if payment status is pending)
  const canEditSchedules = !subscriptionId || existingSubscription?.payment_status === 'pending';
  const canEditPayment = subscriptionId && ['pending', 'partial'].includes(existingSubscription?.payment_status);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="max-w-4xl p-0 md:p-6 h-full md:h-auto md:max-h-[90vh] w-full rounded-none md:rounded-xl border-0 md:border overflow-hidden flex flex-col"
          onPointerDownOutside={(e) => {
            // Prevent dialog from closing on outside clicks
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
              <h2 className="text-sm font-semibold">
                {subscriptionId ? 'Edit Sub' : 'New Sub'}
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Step {currentStep} of 5
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-destructive"
              onClick={() => setShowClearConfirm(true)}
              disabled={subscriptionId}
            >
              Clear
            </Button>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between mb-4">
            <DialogHeader>
              <DialogTitle>
                {subscriptionId ? 'Edit Subscription' : 'Create New Subscription'}
              </DialogTitle>
              <DialogDescription>
                Step {currentStep} of 5: {
                  currentStep === 1 ? 'Customer & Duration' :
                    currentStep === 2 ? 'Select Packages' :
                      currentStep === 3 ? 'Add-ons (Optional)' :
                        currentStep === 4 ? 'Washing Schedules' :
                          'Payment & Summary'
                }
              </DialogDescription>
            </DialogHeader>
            {!subscriptionId && (
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

          <div className="flex-1 overflow-y-auto px-4 md:px-0">

            {/* Step Progress */}
            {/* <div className="flex items-center justify-between mb-6">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${step <= currentStep ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'
                    }`}>
                    {step}
                  </div>
                  {step < 5 && (
                    <div className={`flex-1 h-0.5 mx-2 ${step < currentStep ? 'bg-primary' : 'bg-muted'
                      }`} />
                  )}
                </div>
              ))}
            </div> */}

            {/* Step 1: Customer & Duration */}
            {currentStep === 1 && (
              <div className="space-y-6 px-1">
                {/* Customer Selection */}
                <div>
                  <Label>Customer *</Label>
                  {selectedCustomer ? (
                    <Card className="p-4 mt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{selectedCustomer.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                          {selectedCustomer.area && (
                            <p className="text-sm text-muted-foreground">{selectedCustomer.area}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCustomer(null)}
                        >
                          Change
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={customerSearchRef}
                        placeholder="Search customer by name or phone..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                      {showCustomerSuggestions && (
                        <Card className="absolute bg-white z-10 w-full mt-1 max-h-60 overflow-y-auto">
                          {customerSearchLoading ? (
                            <div className="p-4 text-center">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </div>
                          ) : customers.length > 0 ? (
                            <div className="divide-y">
                              {customers.map((customer) => (
                                <button
                                  key={customer.id}
                                  type="button"
                                  onClick={() => handleSelectCustomer(customer)}
                                  className="w-full p-4 text-left hover:bg-muted active:bg-secondary/80 active:scale-[0.98] transition-all duration-200 border-b last:border-0"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-semibold text-base">{customer.name}</p>
                                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                                      {customer.area && (
                                        <p className="text-xs text-muted-foreground capitalize mt-1 flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {customer.area}
                                        </p>
                                      )}
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : hasSearched ? (
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
                          ) : null}
                        </Card>
                      )}
                    </div>
                  )}
                  {errors.customer && <p className="text-sm text-destructive mt-1">{errors.customer}</p>}
                </div>

                {/* Vehicle Type */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="vehicleType">Vehicle Type *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setIdentifyDialog({ open: true });
                        setIdentifyBrand('');
                        setIdentifyModel('');
                      }}
                    >
                      <Search className="h-3 w-3 mr-1" />
                      Identify Vehicle Type
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {['hatchback', 'sedan', 'suv', 'luxury'].map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={vehicleType === type ? 'default' : 'outline'}
                        size="sm"
                        className={`flex-1 h-12 flex flex-col md:flex-row items-center justify-center gap-0  md:gap-2 rounded-lg transition-all active:scale-[0.95]
                          }`}
                        onClick={() => setVehicleType(type)}
                      >
                        <VehicleIcon vehicleType={type} size={32} className={vehicleType === type ? 'text-white' : 'text-black'} />
                        <span className="text-xs capitalize font-semibold -mt-2 md:mt-0">{type}</span>
                      </Button>
                    ))}
                  </div>
                  {errors.vehicleType && <p className="text-sm text-destructive mt-1">{errors.vehicleType}</p>}
                </div>

                {/* Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="monthsDuration">Subscription Duration (Months) *</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        className="rounded-full aspect-square active:scale-[0.9]"
                        size="icon"
                        onClick={() => setMonthsDuration(Math.max(1, monthsDuration - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="monthsDuration"
                        type="number"
                        min="1"
                        max="12"
                        disabled={true}
                        value={monthsDuration}
                        onChange={(e) => setMonthsDuration(parseInt(e.target.value) || 1)}
                        placeholder="Enter months"
                        readOnly
                        className="h-8 text-sm text-center bg-secondary"
                      />
                      <Button
                        type="button"
                        className="rounded-full aspect-square active:scale-[0.9]"
                        size="icon"
                        onClick={() => setMonthsDuration(Math.min(12, monthsDuration + 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.monthsDuration && <p className="text-sm text-destructive mt-1">{errors.monthsDuration}</p>}
                  </div>

                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      disabled={false}
                    />
                    {errors.startDate && <p className="text-sm text-destructive mt-1">{errors.startDate}</p>}
                  </div>
                </div>


                {errors.area && <p className="text-sm text-destructive mt-1">{errors.area}</p>}
              </div>
            )}

            {/* Step 2: Packages */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Subscription Packages</h3>
                  <Button type="button" size="sm" onClick={addPackageItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Package
                  </Button>
                </div>

                {packageItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No packages added yet</p>
                    <Button type="button" variant="outline" size="sm" onClick={addPackageItem} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Package
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {packageItems.map((item, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-medium">Package {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePackageItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Package *</Label>
                            <Select
                              value={item.package_id}
                              onValueChange={(value) => updatePackageItem(index, 'package_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select package" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredPackages.map((pkg) => (
                                  <SelectItem key={pkg.id} value={String(pkg.id)}>
                                    {pkg.name} - ₹{pkg.subscription_price || pkg.unit_price}/month ({pkg.max_washes_per_month} washes)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors[`package_${index}`] && (
                              <p className="text-sm text-destructive mt-1">{errors[`package_${index}`]}</p>
                            )}
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
                            <Label className="text-sm">For {monthsDuration} month{monthsDuration > 1 ? 's' : ''}</Label>
                            <h2 className="h-8 text-2xl font-bold">
                              {`₹${item.price.toFixed(2)}`}
                            </h2>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                {errors.packages && <p className="text-sm text-destructive mt-1">{errors.packages}</p>}
              </div>
            )}

            {/* Step 3: Addons */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Add-ons (Optional)</h3>
                  <Button type="button" size="sm" onClick={addAddonItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Add-on
                  </Button>
                </div>

                {addonItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No add-ons selected</p>
                    <Button type="button" variant="outline" size="sm" onClick={addAddonItem} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Add-on
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {addonItems.map((item, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-medium">Add-on {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAddonItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label>Add-on *</Label>
                            <Select
                              value={item.addon_id}
                              onValueChange={(value) => updateAddonItem(index, 'addon_id', value)}
                            >
                              <SelectTrigger>
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

                          {/* Application Type Selection */}
                          <div>
                            <Label className="mb-2 block">Apply To *</Label>
                            <RadioGroup
                              value={item.application_type}
                              onValueChange={(value) => updateAddonItem(index, 'application_type', value)}
                              className="flex gap-4"
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="all_washes" id={`all_washes_${index}`} />
                                <Label htmlFor={`all_washes_${index}`} className="text-sm cursor-pointer">
                                  All Washes ({calculateTotalWashes()} washes)
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="specific_washes" id={`specific_washes_${index}`} />
                                <Label htmlFor={`specific_washes_${index}`} className="text-sm cursor-pointer">
                                  Specific Washes
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* Wash Number Selection (for specific_washes) */}
                          {item.application_type === 'specific_washes' && (
                            <div className="border rounded-lg p-3 bg-muted/30">
                              <Label className=" mb-2 block">Select Wash Numbers</Label>
                              <div className="space-y-3 max-h-48 overflow-y-auto">
                                {(() => {
                                  const totalWashes = calculateTotalWashes();
                                  const washesPerMonth = Math.ceil(totalWashes / monthsDuration);
                                  const months = [];

                                  for (let month = 0; month < monthsDuration; month++) {
                                    const monthStart = month * washesPerMonth + 1;
                                    const monthEnd = Math.min((month + 1) * washesPerMonth, totalWashes);
                                    const monthWashes = [];

                                    for (let wash = monthStart; wash <= monthEnd; wash++) {
                                      monthWashes.push(wash);
                                    }

                                    months.push(
                                      <div key={month} className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">Month {month + 1}</p>
                                        <div className="flex flex-wrap gap-2">
                                          {monthWashes.map(washNum => (
                                            <label key={washNum} className="flex items-center gap-1 cursor-pointer">
                                              <Checkbox
                                                checked={item.applicable_wash_numbers?.includes(washNum)}
                                                onCheckedChange={(checked) => {
                                                  const current = item.applicable_wash_numbers || [];
                                                  const updated = checked
                                                    ? [...current, washNum].sort((a, b) => a - b)
                                                    : current.filter(w => w !== washNum);
                                                  updateAddonItem(index, 'applicable_wash_numbers', updated);
                                                }}
                                              />
                                              <span>#{washNum}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }

                                  return months;
                                })()}
                              </div>
                              {errors[`addon_wash_${index}`] && (
                                <p className="text-xs text-destructive mt-2">{errors[`addon_wash_${index}`]}</p>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
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

                            <div className="text-right">
                              <Label className="text-xs">Total Price</Label>
                              <p className="text-2xl font-bold">₹{item.price?.toFixed(2) || '0.00'}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.applicable_wash_numbers?.length || 0} wash{(item.applicable_wash_numbers?.length || 0) !== 1 ? 'es' : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Washing Schedules */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Washing Schedules</h3>
                    <p className="text-sm text-muted-foreground">
                      Schedule {washingSchedules.length} washes for this subscription
                      {!canEditSchedules && ' (Cannot edit - payment completed/cancelled)'}
                    </p>
                  </div>
                </div>

                {/* Schedule Mode Toggle */}
                {canEditSchedules && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label>Schedule Mode:</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={scheduleMode === 'manual' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setScheduleMode('manual')}
                        >
                          Manual Entry
                        </Button>
                        <Button
                          type="button"
                          variant={scheduleMode === 'rule-based' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setScheduleMode('rule-based')}
                        >
                          Rule-Based
                        </Button>
                      </div>
                    </div>

                    {/* Rule Configuration */}
                    {scheduleMode === 'rule-based' && (
                      <Card className="p-4 bg-muted/50">
                        <h4 className="font-medium mb-3">Schedule Rule</h4>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Pattern Type</Label>
                              <Select
                                value={scheduleRule.type}
                                onValueChange={(value) => setScheduleRule(prev => ({ ...prev, type: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weekly">Weekly (specific days)</SelectItem>
                                  <SelectItem value="interval">Every X weeks</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Default Start Time</Label>
                                <Select
                                  value={scheduleRule.defaultTimeFrom}
                                  onValueChange={(value) => setScheduleRule(prev => ({
                                    ...prev,
                                    defaultTimeFrom: value
                                  }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeSlots.map((time) => (
                                      <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Default End Time</Label>
                                <Select
                                  value={scheduleRule.defaultTimeTo}
                                  onValueChange={(value) => setScheduleRule(prev => ({
                                    ...prev,
                                    defaultTimeTo: value
                                  }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {/* Filter to show only times at least 1 hr after start time */}
                                    {timeSlots
                                      .filter(time => {
                                        if (!scheduleRule.defaultTimeFrom) return true;
                                        const [fromH, fromM] = scheduleRule.defaultTimeFrom.split(':').map(Number);
                                        const [toH, toM] = time.split(':').map(Number);
                                        const fromMinutes = fromH * 60 + fromM;
                                        const toMinutes = toH * 60 + toM;
                                        return toMinutes >= fromMinutes + 60;
                                      })
                                      .map((time) => (
                                        <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Weekly Pattern */}
                          {scheduleRule.type === 'weekly' && (
                            <div>
                              <Label className="text-xs">Select Days</Label>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                  <Button
                                    key={day}
                                    type="button"
                                    variant={scheduleRule.weekdays.includes(index) ? 'default' : 'outline'}
                                    size="sm"
                                    className="w-14"
                                    onClick={() => {
                                      const newWeekdays = scheduleRule.weekdays.includes(index)
                                        ? scheduleRule.weekdays.filter(d => d !== index)
                                        : [...scheduleRule.weekdays, index];
                                      setScheduleRule(prev => ({ ...prev, weekdays: newWeekdays }));
                                    }}
                                  >
                                    {day}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Interval Pattern */}
                          {scheduleRule.type === 'interval' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Every X Weeks</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="4"
                                  value={scheduleRule.intervalWeeks}
                                  onChange={(e) => setScheduleRule(prev => ({
                                    ...prev,
                                    intervalWeeks: parseInt(e.target.value) || 1
                                  }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">On Day</Label>
                                <Select
                                  value={String(scheduleRule.intervalDay)}
                                  onValueChange={(value) => setScheduleRule(prev => ({
                                    ...prev,
                                    intervalDay: parseInt(value)
                                  }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select day" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                                      <SelectItem key={day} value={String(index)}>{day}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {/* Default Time Slots */}


                          <Button
                            type="button"
                            onClick={generateWashingSchedulesFromRule}
                            className="w-full"
                            disabled={!canEditSchedules}
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Generate {calculateTotalWashes()} Wash Dates
                          </Button>
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {washingSchedules.map((schedule, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center relative">
                          <span className="font-bold text-primary">{index + 1}</span>
                          {schedule.isAutoGenerated && (
                            <Badge variant="warning" className="text-[10px] h-4 px-1 absolute -top-2 -right-2">
                              Auto
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-3 flex-1">
                          <div>
                            <Label className="text-xs">Date *</Label>
                            <DatePicker
                              value={schedule.date}
                              onChange={(date) => updateWashingSchedule(index, 'date', date)}
                              disabled={!canEditSchedules}
                            />
                            {errors[`date_${index}`] && (
                              <p className="text-xs text-destructive mt-1">{errors[`date_${index}`]}</p>
                            )}
                          </div>

                          <div>
                            <Label className="text-xs">From Time *</Label>
                            <Select
                              value={schedule.time_from}
                              onValueChange={(value) => updateWashingSchedule(index, 'time_from', value)}
                              disabled={!canEditSchedules}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Start" />
                              </SelectTrigger>
                              <SelectContent>
                                {timeSlots.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {formatTimeDisplay(time)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors[`time_from_${index}`] && (
                              <p className="text-xs text-destructive mt-1">{errors[`time_from_${index}`]}</p>
                            )}
                          </div>

                          <div>
                            <Label className="text-xs">To Time *</Label>
                            <Select
                              value={schedule.time_to}
                              onValueChange={(value) => updateWashingSchedule(index, 'time_to', value)}
                              disabled={!canEditSchedules}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="End" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Filter to show only times at least 1 hr after start time */}
                                {timeSlots
                                  .filter(time => {
                                    if (!schedule.time_from) return true;
                                    // Simple string comparison works for HH:MM format in 24h
                                    // But for 1hr gap logic we need to calculate minutes
                                    const [fromH, fromM] = schedule.time_from.split(':').map(Number);
                                    const [toH, toM] = time.split(':').map(Number);
                                    const fromMinutes = fromH * 60 + fromM;
                                    const toMinutes = toH * 60 + toM;
                                    return toMinutes >= fromMinutes + 60;
                                  })
                                  .map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {formatTimeDisplay(time)}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {errors[`time_to_${index}`] && (
                              <p className="text-xs text-destructive mt-1">{errors[`time_to_${index}`]}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {errors[`time_${index}`] && (
                        <p className="text-sm text-destructive mt-2">{errors[`time_${index}`]}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Payment & Summary */}
            {currentStep === 5 && (
              <div className="space-y-6">
                {/* Summary */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Subscription Summary</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="font-medium">{selectedCustomer?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle Type:</span>
                      <span className="font-medium capitalize">{vehicleType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{monthsDuration} month(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">{startDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Washes:</span>
                      <span className="font-medium">{washingSchedules.length}</span>
                    </div>

                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between text-sm">
                        <span>Packages</span>
                        <span>₹{totals.packages}</span>
                      </div>

                      {addonItems.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm font-medium">
                            <span>Add-ons</span>
                            <span>₹{totals.addons}</span>
                          </div>
                          {addonItems.map((addon, idx) => {
                            const addonDetails = addons.find(a => String(a.id) === String(addon.addon_id));
                            const washCount = addon.applicable_wash_numbers?.length || 0;
                            return (
                              <div key={idx} className="flex justify-between text-xs text-muted-foreground pl-4">
                                <span>
                                  {addonDetails?.name || `Addon ${idx + 1}`}
                                  {addon.application_type === 'all_washes' ? (
                                    <span className="ml-1">(All {washCount} washes)</span>
                                  ) : (
                                    <span className="ml-1">(Wash #{addon.applicable_wash_numbers?.join(', #') || 'None'})</span>
                                  )}
                                </span>
                                <span>₹{addon.price?.toFixed(2) || '0.00'}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex justify-between text-sm border-t pt-2 mt-2">
                        <span>Subtotal</span>
                        <span>₹{totals.subtotal.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span>GST ({totals.gstPercentage}%)</span>
                        <span>₹{totals.gst.toFixed(2)}</span>
                      </div>

                      {totals.roundOff !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Round Off</span>
                          <span className={totals.roundOff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {totals.roundOff >= 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-lg font-bold mt-2 text-primary border-t pt-2">
                        <span>Total Amount <span className='text-sm text-muted-foreground'>(For {monthsDuration} month{monthsDuration > 1 ? 's' : ''})</span></span>
                        <span>₹{totals.total.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Payment Details */}
                {canEditPayment && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Payment Details</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="paymentAmount">Payment Amount</Label>
                        <Input
                          id="paymentAmount"
                          type="number"
                          min="0"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="Enter amount"
                        />
                      </div>

                      <div>
                        <Label htmlFor="paymentDate">Payment Date</Label>
                        <DatePicker
                          value={paymentDate}
                          onChange={setPaymentDate}
                        />
                      </div>

                      <div>
                        <Label htmlFor="paymentMethod">Payment Method *</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger id="paymentMethod">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method.value} value={method.value}>
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.paymentMethod && (
                          <p className="text-sm text-destructive mt-1">{errors.paymentMethod}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="paymentStatus">Payment Status *</Label>
                        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                          <SelectTrigger id="paymentStatus">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBSCRIPTION_PAYMENT_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.paymentStatus && (
                          <p className="text-sm text-destructive mt-1">{errors.paymentStatus}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes..."
                    rows={3}
                  />
                </div>
              </div>
            )}

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
                  ₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              </div>

              {/* Next/Confirm Buttons Slot */}
              <div className="flex-1 flex justify-end">
                {currentStep < 5 ? (
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
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    size="sm"
                    className="h-10 px-4"
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {subscriptionId ? 'Save' : 'Create'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Nested Sub-dialogs */}
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
                        area: customer.area,
                      });
                      // Add to customers list
                      setCustomers(prev => [...prev, customer]);
                      // Pre-fill address
                      setAddress({
                        area: customer.area || '',
                        map_url: customer.map_url || '',
                      });
                    }
                    setCustomerSearchTerm('');
                    toast.success('Customer added and selected');
                  }}
                  onCancel={() => {
                    setShowCustomerForm(false);
                    setNewCustomerInitialData(null);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Identify Vehicle Type Dialog */}
          <Dialog open={identifyDialog.open} onOpenChange={(open) => setIdentifyDialog({ open })}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Identify Vehicle Type</DialogTitle>
                <DialogDescription>
                  Select your vehicle brand and model to auto-detect the vehicle type
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
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
                    setIdentifyDialog({ open: false });
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
                    const detectedType = getVehicleType(identifyBrand, identifyModel);
                    if (detectedType) {
                      setVehicleType(detectedType.toString().toLowerCase());
                      toast.success(`Vehicle identified as ${detectedType}`);
                    }
                    setIdentifyDialog({ open: false });
                    setIdentifyBrand('');
                    setIdentifyModel('');
                  }}
                >
                  Apply
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Clear Draft Confirmation Dialog */}
          <ConfirmDialog
            open={showClearConfirm}
            onOpenChange={setShowClearConfirm}
            onConfirm={() => {
              handleDeleteDraft();
              setShowClearConfirm(false);
            }}
            title="Clear Draft Subscription"
            description="Are you sure you want to clear this draft? All entered information will be lost."
            confirmText="Clear Draft"
            cancelText="Cancel"
            variant="destructive"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionWizard;
