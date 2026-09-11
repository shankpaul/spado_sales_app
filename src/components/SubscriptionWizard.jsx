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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from './ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction as AlertDialogActionConfirm,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import subscriptionService from '../services/subscriptionService';
import customerService from '../services/customerService';
import offerService from '../services/offerService';
import campaignService from '../services/campaignService';
import { Badge2 } from './ui/badge2';
import LetterAvatar from './LetterAvatar';
import VehicleIdentifier from './VehicleIdentifier';
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
  UserPlus,
  Gift,
  Tag,
  Percent,
  Info,
  CreditCard,
  Check,
  CheckCircle2,
  Sparkles,
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

  // Offers & Coupons states
  const [availableOffers, setAvailableOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [isCouponVerified, setIsCouponVerified] = useState(false);
  const [verifiedCouponData, setVerifiedCouponData] = useState(null);
  const [isCustomerCouponsOpen, setIsCustomerCouponsOpen] = useState(false);
  const [customerCoupons, setCustomerCoupons] = useState([]);
  const [loadingCustomerCoupons, setLoadingCustomerCoupons] = useState(false);
  const [offerDetailsDialog, setOfferDetailsDialog] = useState({ open: false, offer: null });

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
  }, [selectedCustomer, vehicleType, monthsDuration, packageItems, addonItems, washingSchedules, address, paymentAmount, paymentMethod, notes, selectedOffer, couponCode, isCouponVerified]);

  // Fetch available offers when step 5 is reached
  useEffect(() => {
    const fetchOffers = async () => {
      if (currentStep !== 5) {
        return;
      }

      if (!selectedCustomer) {
        setAvailableOffers([]);
        setSelectedOffer(null);
        return;
      }

      setLoadingOffers(true);
      try {
        const packageIds = packageItems.map(item => parseInt(item.package_id)).filter(id => !isNaN(id));
        const addonIds = addonItems.map(item => parseInt(item.addon_id)).filter(id => !isNaN(id));

        const response = await offerService.getAvailableOffers({
          package_ids: packageIds,
          addon_ids: addonIds,
          customer_id: selectedCustomer.id,
        });

        const offers = response.data || [];
        setAvailableOffers(offers);

        // Check if previously selected offer is still valid
        if (selectedOffer) {
          const isCouponLinked = isCouponVerified;
          if (!isCouponLinked) {
            const isStillValid = offers.some(offer => offer.id === selectedOffer.id);
            if (!isStillValid) {
              setSelectedOffer(null);
            }
          }
        }
      } catch (error) {
        setAvailableOffers([]);
        if (selectedOffer && !isCouponVerified) {
          setSelectedOffer(null);
        }
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, [currentStep, selectedCustomer, packageItems, addonItems]);

  // Generate washing schedules when packages, duration, or startDate changes
  useEffect(() => {
    if (packageItems.length > 0 && monthsDuration > 0 && !subscriptionId) {
      generateWashingSchedules();
    }
  }, [packageItems, monthsDuration, startDate, subscriptionId]);

  // Ensure schedules have dates when entering Step 4
  useEffect(() => {
    if (currentStep === 4 && (!subscriptionId || existingSubscription?.payment_status === 'pending')) {
      const totalWashes = calculateTotalWashes();
      if (totalWashes > 0 && (washingSchedules.length !== totalWashes || washingSchedules.some(s => !s.date))) {
        generateWashingSchedules();
      }
    }
  }, [currentStep, subscriptionId, existingSubscription]);

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
      if (draft.selectedOffer) setSelectedOffer(draft.selectedOffer);
      if (draft.couponCode) setCouponCode(draft.couponCode);
      if (draft.isCouponVerified) setIsCouponVerified(draft.isCouponVerified);
      if (draft.verifiedCouponData) setVerifiedCouponData(draft.verifiedCouponData);
    } catch (error) {
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
        selectedOffer,
        couponCode,
        isCouponVerified,
        verifiedCouponData,
        expiryDate: expiryDate.toISOString(),
      };

      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_WIZARD_DRAFT, JSON.stringify(draft));
    } catch (error) {
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

      const loadedPackages = packagesRes.packages || [];
      loadedPackages.sort((a, b) => a.name.localeCompare(b.name));
      setPackages(loadedPackages);
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
      setPackageItems((subscription.packages || []).map(pkg => {
        const discountVal = parseFloat(pkg.discount_value || pkg.discount) || 0;
        return {
          ...pkg,
          enable_custom_discount: discountVal > 0
        };
      }));
      setAddonItems((subscription.addons || []).map(addon => {
        const discountVal = parseFloat(addon.discount_value || addon.discount) || 0;
        return {
          ...addon,
          enable_custom_discount: discountVal > 0
        };
      }));
      setWashingSchedules(subscription.washing_schedules || []);
      setAddress({ area: subscription.area, map_url: subscription.map_url });
      setPaymentAmount(subscription.payment_amount || '');
      setPaymentDate(subscription.payment_date || '');
      setPaymentMethod(subscription.payment_method || '');
      setPaymentStatus(subscription.payment_status || 'pending');
      setNotes(subscription.notes || '');
    } catch (error) {
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

  // Helper to safely parse local date without timezone shifts
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return new Date(dateStr);
  };

  // Calculate default dates evenly spaced starting from startDate
  const calculateDefaultScheduleDates = (totalWashes, baseStartDate, duration) => {
    if (!totalWashes || totalWashes <= 0) return [];
    const start = parseLocalDate(baseStartDate);

    // Determine interval in days
    let intervalDays = 7;
    const durationMonths = Math.max(1, duration || 1);
    const washesPerMonth = totalWashes / durationMonths;

    if (washesPerMonth > 4) {
      // More than 1 wash a week
      intervalDays = Math.max(1, Math.floor((durationMonths * 30) / totalWashes));
    } else if (washesPerMonth < 3 && totalWashes > 1) {
      // e.g. 1 or 2 washes a month -> ~14 days (fortnightly)
      intervalDays = Math.max(7, Math.floor((durationMonths * 30) / totalWashes));
    } else {
      // Standard weekly
      intervalDays = 7;
    }

    const dates = [];
    for (let i = 0; i < totalWashes; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (i * intervalDays));
      dates.push(format(d, 'yyyy-MM-dd'));
    }
    return dates;
  };

  // Generate washing schedules (with dates pre-filled for manual mode)
  const generateWashingSchedules = (force = false) => {
    const totalWashes = calculateTotalWashes();
    if (totalWashes === 0) {
      setWashingSchedules([]);
      return;
    }

    const defaultDates = calculateDefaultScheduleDates(totalWashes, startDate, monthsDuration);

    // Regenerate if empty, count changed, or forced
    if (force || washingSchedules.length !== totalWashes) {
      const newSchedules = Array.from({ length: totalWashes }, (_, index) => {
        const existing = !force ? washingSchedules[index] : null;
        return {
          date: existing?.date || defaultDates[index] || '',
          time_from: existing?.time_from || scheduleRule.defaultTimeFrom || '09:00',
          time_to: existing?.time_to || scheduleRule.defaultTimeTo || '11:00',
          isAutoGenerated: false,
        };
      });
      setWashingSchedules(newSchedules);
    } else {
      // If count matches but any dates or times are missing, populate them
      const hasMissingInfo = washingSchedules.some(s => !s.date || !s.time_from || !s.time_to);
      if (hasMissingInfo) {
        const updated = washingSchedules.map((schedule, index) => ({
          ...schedule,
          date: schedule.date || defaultDates[index] || '',
          time_from: schedule.time_from || scheduleRule.defaultTimeFrom || '09:00',
          time_to: schedule.time_to || scheduleRule.defaultTimeTo || '11:00',
        }));
        setWashingSchedules(updated);
      }
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
        enable_custom_discount: false,
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
        enable_custom_discount: false,
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

  // Coupon & Offer helper functions
  const fetchCustomerCoupons = async () => {
    if (!selectedCustomer) return;
    setLoadingCustomerCoupons(true);
    try {
      const phone = selectedCustomer.phone || '';
      if (!phone) {
        setCustomerCoupons([]);
        return;
      }
      const response = await campaignService.getAllCoupons({ search: phone });
      const coupons = response.data || [];
      const activeCoupons = coupons.filter(coupon =>
        coupon.status !== 'cancelled' &&
        coupon.status !== 'completed' &&
        coupon.status !== 'expired' &&
        coupon.remaining_uses > 0
      );
      setCustomerCoupons(activeCoupons);
    } catch (err) {
      toast.error('Failed to fetch customer coupons');
    } finally {
      setLoadingCustomerCoupons(false);
    }
  };

  const verifyAndApplyCoupon = async (code) => {
    if (!code) {
      setCouponError('Please enter a coupon code');
      return;
    }
    if (!selectedCustomer) {
      setCouponError('Please select a customer first');
      return;
    }

    setVerifyingCoupon(true);
    setCouponError('');
    try {
      const phone = selectedCustomer.phone || '';
      const response = await campaignService.validateCoupon(
        code.trim().toUpperCase(),
        selectedCustomer.id,
        phone
      );

      if (response.valid && response.data) {
        setIsCouponVerified(true);
        setVerifiedCouponData(response.data);
        setCouponCode(code.trim().toUpperCase());
        toast.success('Coupon verified successfully!');

        // Auto-apply the linked offer from coupon
        const couponData = response.data;
        const offerId = couponData.offer_id;

        if (offerId && offerId > 0) {
          try {
            const offerRes = await offerService.getOfferById(offerId);
            if (offerRes && offerRes.data) {
              setSelectedOffer(offerRes.data);
              saveDraft();
            } else {
              setSelectedOffer({
                id: offerId,
                name: couponData.offer_name || 'Coupon Offer',
                description: '',
                discount_type: 'fixed',
                discount_value: 0,
                coupon_required: true,
              });
              saveDraft();
            }
          } catch (_) {
            setSelectedOffer({
              id: offerId,
              name: couponData.offer_name || 'Coupon Offer',
              description: '',
              discount_type: 'fixed',
              discount_value: 0,
              coupon_required: true,
            });
            saveDraft();
          }
        } else {
          toast.error('Associated offer not found for this coupon.');
        }
        setIsCustomerCouponsOpen(false);
      } else {
        setCouponError('Coupon is invalid or cannot be applied');
      }
    } catch (error) {
      const msg = error.response?.data?.errors?.[0] || 'Coupon validation failed';
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setVerifyingCoupon(false);
    }
  };

  const handleVerifyCoupon = async () => {
    await verifyAndApplyCoupon(couponCode);
  };

  const handleRemoveOffer = () => {
    setSelectedOffer(null);
    setCouponCode('');
    setIsCouponVerified(false);
    setVerifiedCouponData(null);
    setCouponError('');
    saveDraft();
  };

  // Render list of active coupons for selected customer
  const renderCustomerCouponsList = () => {
    if (loadingCustomerCoupons) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Searching coupons...</span>
        </div>
      );
    }

    if (customerCoupons.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground space-y-2">
          <Gift className="h-8 w-8 mx-auto opacity-30 text-gray-500" />
          <p className="text-sm">No active coupons found for this customer.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 mt-2">
        {customerCoupons.map((coupon) => (
          <Card key={coupon.id} className="p-3 border hover:border-primary/45 hover:bg-primary/5 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider">
                    {coupon.code}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-700 mt-2">
                  Campaign: {coupon.campaign_name || 'Campaign Offer'}
                </p>
                {coupon.offer_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Offer: {coupon.offer_name}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                  <div>
                    <span className="font-semibold text-gray-700">Uses Left:</span> {coupon.remaining_uses} / {coupon.allowed_uses}
                  </div>
                  {coupon.expiry_date && (
                    <div>
                      <span className="font-semibold text-gray-700">Expiry:</span> {new Date(coupon.expiry_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => verifyAndApplyCoupon(coupon.code)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs py-1 h-8 px-3 shrink-0 cursor-pointer"
              >
                Apply
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    const packageTotal = packageItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const addonTotal = addonItems.reduce((sum, item) => sum + (item.price || 0), 0);
    // Package prices already include quantity (monthsDuration)
    // Addon prices already include selected wash count, no multiplication needed
    const subtotal = packageTotal + addonTotal;

    // Calculate Offer Discount
    let offerDiscount = 0;
    if (selectedOffer) {
      if (selectedOffer.discount_type === 'percentage') {
        offerDiscount = (subtotal * selectedOffer.discount_value) / 100;
        if (selectedOffer.max_discount_amount && offerDiscount > selectedOffer.max_discount_amount) {
          offerDiscount = selectedOffer.max_discount_amount;
        }
      } else {
        offerDiscount = selectedOffer.discount_value;
      }
    }
    offerDiscount = Math.min(offerDiscount, subtotal);
    const subtotalAfterDiscount = Math.max(0, subtotal - offerDiscount);

    const gst = (subtotalAfterDiscount * GST_PERCENTAGE) / 100;
    const totalBeforeRounding = subtotalAfterDiscount + gst;
    const roundedTotal = Math.round(totalBeforeRounding);
    const roundOff = roundedTotal - totalBeforeRounding;

    return {
      packages: packageTotal,
      addons: addonTotal,
      subtotal,
      offerDiscount,
      subtotalAfterDiscount,
      gst,
      gstPercentage: GST_PERCENTAGE,
      roundOff,
      perMonth: monthsDuration > 0 ? (roundedTotal / monthsDuration) : roundedTotal,
      total: roundedTotal,
    };
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateStep5()) return;

    setLoading(true);
    try {
      const calculatedTotals = calculateTotals();
      const offerDiscount = calculatedTotals.offerDiscount || 0;

      // Distribute offer discount to package items so backend calculateSubscriptionAmount matches
      const updatedPackages = packageItems.map((item, idx) => {
        let additionalDiscountValue = 0;
        if (idx === 0 && offerDiscount > 0) {
          additionalDiscountValue = offerDiscount;
        }

        const baseDiscountValue = item.discount_value || 0;
        const totalDiscountValue = baseDiscountValue + additionalDiscountValue;

        return {
          package_id: parseInt(item.package_id, 10),
          quantity: item.quantity,
          unit_price: item.unit_price,
          price: item.price,
          vehicle_type: item.vehicle_type,
          discount: item.discount,
          discount_type: item.discount_type,
          discount_value: totalDiscountValue,
          notes: item.notes || null,
        };
      });

      // Construct notes including offer details if applied
      let finalNotes = notes || '';
      if (selectedOffer && offerDiscount > 0) {
        const offerNote = `[Offer Applied: ${selectedOffer.name}${couponCode ? ` (Coupon: ${couponCode})` : ''} - Discount: ₹${offerDiscount.toFixed(2)}]`;
        finalNotes = finalNotes ? `${finalNotes}\n${offerNote}` : offerNote;
      }

      const subscriptionData = {
        customer_id: parseInt(selectedCustomer.id, 10),
        vehicle_type: vehicleType,
        start_date: startDate,
        months_duration: monthsDuration,
        area: address.area,
        map_url: address.map_url,
        packages: updatedPackages,
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
        notes: finalNotes || null,
      };

      await subscriptionService.createSubscription(subscriptionData);

      toast.success('Subscription created successfully');
      clearDraft();
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
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
    setSelectedOffer(null);
    setCouponCode('');
    setVerifyingCoupon(false);
    setCouponError('');
    setIsCouponVerified(false);
    setVerifiedCouponData(null);
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
                {subscriptionId ? 'Edit Subscription' : 'New Subscription'}
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
                <div className="rounded-xl border bg-card">
                  <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                        <Search className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-semibold text-sm">Select Customer</span>
                      <span className="text-red-500 text-xs font-bold -ml-1">*</span>
                    </div>

                    {!subscriptionId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCustomerSuggestions(false);
                          const term = (customerSearchTerm || '').trim();
                          const isPhone = /^[\d\s+\-()]+$/.test(term);
                          if (term) {
                            setNewCustomerInitialData(isPhone ? { phone: term } : { name: term });
                          } else {
                            setNewCustomerInitialData(null);
                          }
                          setShowCustomerForm(true);
                        }}
                        className="h-7.5 px-2.5 text-xs gap-1.5 font-medium text-primary hover:text-primary hover:bg-primary/5 border-primary/25 cursor-pointer shadow-2xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>New Customer</span>
                      </Button>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="relative" ref={customerSearchRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          autoComplete="off"
                          placeholder="Search by name or phone..."
                          value={selectedCustomer ? `${selectedCustomer.name} — ${selectedCustomer.phone}` : customerSearchTerm}
                          onChange={(e) => {
                            setCustomerSearchTerm(e.target.value);
                            setSelectedCustomer(null);
                          }}
                          onFocus={() => {
                            if (customerSearchTerm.length >= 2) setShowCustomerSuggestions(true);
                          }}
                          className="pl-10 h-11 text-sm"
                          disabled={!!subscriptionId}
                        />
                        {customerSearchLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>

                      {showCustomerSuggestions && (
                        <Card className="absolute bg-white z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg border border-gray-100">
                          {customerSearchLoading ? (
                            <div className="p-4 text-center">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                            </div>
                          ) : customers.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                              {(() => {
                                const getCustomerScore = (customer, term) => {
                                  if (!term) return 0;
                                  const cleanTerm = term.toLowerCase().trim();
                                  const name = (customer.name || '').toLowerCase();
                                  const phone = (customer.phone || '').toLowerCase();
                                  
                                  if (name === cleanTerm || phone === cleanTerm) return 100;
                                  if (name.startsWith(cleanTerm) || phone.startsWith(cleanTerm)) return 80;
                                  if (name.includes(cleanTerm) || phone.includes(cleanTerm)) return 50;
                                  return 10;
                                };

                                const scoredCustomers = customers.map(c => ({
                                  ...c,
                                  score: getCustomerScore(c, customerSearchTerm)
                                }));
                                
                                const bestMatches = scoredCustomers.filter(c => c.score >= 80);
                                const otherMatches = scoredCustomers.filter(c => c.score < 80);

                                const renderCustomerRow = (customer) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => {
                                      handleSelectCustomer(customer);
                                      setShowCustomerSuggestions(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left hover:bg-secondary active:bg-secondary/80 active:scale-[0.98] transition-all flex items-center justify-between border-b last:border-b-0 border-gray-50 cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <LetterAvatar name={customer.name} size="sm" className="shrink-0" />
                                      <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm capitalize truncate">{customer.name}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">{customer.phone}</p>
                                        {customer.area && (
                                          <p className="text-[11px] text-muted-foreground capitalize mt-0.5 flex items-center gap-1 truncate">
                                            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                                            {customer.area}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                                  </button>
                                );

                                return (
                                  <>
                                    {bestMatches.length > 0 && (
                                      <div>
                                        <div className="px-3 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50/70 uppercase tracking-wider">
                                          Best Matches
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                          {bestMatches.map(renderCustomerRow)}
                                        </div>
                                      </div>
                                    )}
                                    {otherMatches.length > 0 && (
                                      <div>
                                        <div className="px-3 py-1 text-[10px] font-bold text-gray-500 bg-gray-50 uppercase tracking-wider border-t border-gray-100">
                                          Other Matches
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                          {otherMatches.map(renderCustomerRow)}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
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
                                  const term = (customerSearchTerm || '').trim();
                                  const isPhone = /^[\d\s+\-()]+$/.test(term);
                                  setNewCustomerInitialData(term ? (isPhone ? { phone: term } : { name: term }) : null);
                                  setShowCustomerForm(true);
                                }}
                                className="gap-2 cursor-pointer"
                              >
                                <Plus className="h-4 w-4" />
                                Create New Customer
                              </Button>
                            </div>
                          ) : null}
                        </Card>
                      )}
                    </div>

                    {/* Selected Customer Inline display */}
                    {selectedCustomer && (
                      <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50/90 rounded-xl border border-blue-100/80 shadow-2xs mt-3 overflow-hidden transition-all duration-200">
                        <div className="p-3.5 sm:p-4 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <LetterAvatar name={selectedCustomer.name} size="md" className="shrink-0 font-bold shadow-xs" />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 text-sm truncate capitalize">{selectedCustomer.name}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                                <span className="font-medium text-gray-700">{selectedCustomer.phone}</span>
                                {selectedCustomer.area && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    {selectedCustomer.area}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {!subscriptionId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomer(null);
                                setCustomerSearchTerm('');
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer"
                            >
                              Change
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {errors.customer && <p className="text-xs text-destructive font-medium">{errors.customer}</p>}
                  </div>
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
                            <div className="flex items-center space-x-2 mb-1">
                              <Checkbox
                                id={`pkg-discount-enable-${index}`}
                                checked={item.enable_custom_discount || false}
                                onCheckedChange={(checked) => {
                                  updatePackageItem(index, 'enable_custom_discount', !!checked);
                                  if (!checked) {
                                    updatePackageItem(index, 'discount_value', 0);
                                  }
                                }}
                              />
                              <label 
                                htmlFor={`pkg-discount-enable-${index}`} 
                                className="text-[10px] font-medium text-gray-600 cursor-pointer select-none"
                              >
                                Enable Custom Discount
                              </label>
                            </div>
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
                                disabled={!item.enable_custom_discount}
                              />
                              <Select
                                value={item.discount_type}
                                onValueChange={(value) => updatePackageItem(index, 'discount_type', value)}
                                disabled={!item.enable_custom_discount}
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
                              <div className="flex items-center space-x-2 mb-1">
                                <Checkbox
                                  id={`addon-discount-enable-${index}`}
                                  checked={item.enable_custom_discount || false}
                                  onCheckedChange={(checked) => {
                                    updateAddonItem(index, 'enable_custom_discount', !!checked);
                                    if (!checked) {
                                      updateAddonItem(index, 'discount_value', 0);
                                    }
                                  }}
                                />
                                <label 
                                  htmlFor={`addon-discount-enable-${index}`} 
                                  className="text-[10px] font-medium text-gray-600 cursor-pointer select-none"
                                >
                                  Enable Custom Discount
                                </label>
                              </div>
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
                                  disabled={!item.enable_custom_discount}
                                />
                                <Select
                                  value={item.discount_type}
                                  onValueChange={(value) => updateAddonItem(index, 'discount_type', value)}
                                  disabled={!item.enable_custom_discount}
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
                          onClick={() => {
                            setScheduleMode('manual');
                            generateWashingSchedules(false);
                          }}
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

                    {/* Manual Mode Info Banner */}
                    {scheduleMode === 'manual' && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-900">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                          <span>
                            {startDate
                              ? `Dates auto-filled from start date (${format(parseLocalDate(startDate), 'dd MMM yyyy')}). You can adjust any date or time individually below.`
                              : 'Select a Start Date in Step 1 to automatically schedule dates.'}
                          </span>
                        </div>
                        {startDate && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              generateWashingSchedules(true);
                              toast.success('Schedule dates re-filled from start date');
                            }}
                            className="h-7 text-xs font-semibold bg-white border-blue-200 text-primary hover:bg-blue-50 shrink-0 self-start sm:self-auto cursor-pointer"
                          >
                            Auto-fill Dates
                          </Button>
                        )}
                      </div>
                    )}

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
                                <Label className="text-xs">From</Label>
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
                                <Label className="text-xs">To</Label>
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

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
                          <div className="col-span-2 md:col-span-1">
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

            {/* Step 5: Offers, Payment & Summary */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
                  {/* LEFT COLUMN: Offers, Coupons, Payment Method, Notes */}
                  <div className="space-y-4">
                    {/* Offers & Coupons Card */}
                    <div className="rounded-xl border bg-card shadow-2xs">
                      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-3 border-b">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100">
                            <Gift className="h-4 w-4 text-amber-600" />
                          </div>
                          <span className="font-semibold text-sm">Offers & Coupons</span>
                        </div>
                        {selectedCustomer && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs font-semibold text-primary cursor-pointer hover:underline inline-flex items-center gap-1"
                            onClick={() => {
                              setIsCustomerCouponsOpen(true);
                              fetchCustomerCoupons();
                            }}
                          >
                            <Search className="h-3.5 w-3.5" />
                            <span>Search Coupons</span>
                          </Button>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        {!selectedOffer && (
                          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
                            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                              <Tag className="h-3.5 w-3.5" />
                              Apply Coupon Code
                            </p>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter coupon code"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                className="uppercase font-mono text-sm h-9 border-gray-300 bg-white"
                              />
                              <Button
                                type="button"
                                disabled={verifyingCoupon}
                                onClick={handleVerifyCoupon}
                                className="bg-primary hover:bg-primary/90 text-white font-medium h-9 shrink-0 cursor-pointer"
                              >
                                {verifyingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                              </Button>
                            </div>
                            {couponError && <p className="text-xs text-red-500 font-semibold">{couponError}</p>}
                            <p className="text-[10px] text-muted-foreground">Have a promotional code? Enter it here to unlock rewards.</p>
                          </div>
                        )}

                        {loadingOffers ? (
                          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                            <span>Checking available offers...</span>
                          </div>
                        ) : selectedOffer ? (
                          <div className="rounded-lg border border-green-200 bg-green-50 p-3.5 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Tag className="h-4 w-4 text-green-600 shrink-0" />
                                  <span className="font-semibold text-green-800 text-sm capitalize">{selectedOffer.name}</span>
                                  {selectedOffer.coupon_required && (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200">
                                      Coupon Required
                                    </span>
                                  )}
                                  {isCouponVerified && !selectedOffer.coupon_required && (
                                    <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                                      Via Coupon
                                    </span>
                                  )}
                                </div>
                                {selectedOffer.description && (
                                  <p className="text-xs text-green-700/80 mt-1 line-clamp-2">{selectedOffer.description}</p>
                                )}
                                <div className="flex items-center gap-1 mt-1.5 text-xs font-bold text-green-700">
                                  <Percent className="h-3 w-3" />
                                  {selectedOffer.discount_type === 'percentage' ? `${selectedOffer.discount_value}% Off` : `₹${selectedOffer.discount_value} Off`}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleRemoveOffer}
                                className="text-red-500 hover:text-red-700 cursor-pointer text-xs font-semibold shrink-0 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              >
                                Remove
                              </button>
                            </div>

                            {(selectedOffer.coupon_required || isCouponVerified) && (
                              <div className="mt-2 pt-2 border-t border-green-200">
                                {isCouponVerified ? (
                                  <div className="space-y-1.5">
                                    {verifiedCouponData && (
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600 bg-white/60 rounded-lg p-2.5 mt-1">
                                        <div><span className="font-semibold text-gray-700">Campaign:</span> {verifiedCouponData.campaign_name}</div>
                                        {verifiedCouponData.partner_name && <div><span className="font-semibold text-gray-700">Partner:</span> {verifiedCouponData.partner_name}</div>}
                                        <div><span className="font-semibold text-gray-700">Offer:</span> {verifiedCouponData.offer_name || selectedOffer?.name}</div>
                                        <div><span className="font-semibold text-gray-700">Discount:</span> {selectedOffer?.discount_type === 'percentage' ? `${selectedOffer.discount_value}% Off` : `₹${selectedOffer?.discount_value} Off`}</div>
                                        <div><span className="font-semibold text-gray-700">Uses Left:</span> {verifiedCouponData.remaining_uses}</div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-700">Enter Promo Code to Unlock</p>
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="e.g. PROMO2026"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        className="uppercase font-mono text-sm h-9 bg-white"
                                      />
                                      <Button
                                        type="button"
                                        disabled={verifyingCoupon}
                                        onClick={handleVerifyCoupon}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 shrink-0 cursor-pointer"
                                      >
                                        {verifyingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify'}
                                      </Button>
                                    </div>
                                    {couponError && <p className="text-xs text-red-500 font-semibold">{couponError}</p>}
                                    <p className="text-[10px] text-gray-500">This offer requires a valid coupon code for the customer's phone.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : availableOffers.length > 0 ? (
                          <div className="space-y-2">
                            {availableOffers.map((offer) => (
                              <Card key={offer.id} className="p-3 hover:bg-secondary/50 transition-colors border">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <Tag className="h-4 w-4 text-primary shrink-0" />
                                      <span className="font-medium text-sm capitalize">{offer.name}</span>
                                      {offer.coupon_required && (
                                        <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] py-0.5 px-2 rounded-full font-bold">
                                          Coupon Required
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setOfferDetailsDialog({ open: true, offer })}
                                        className="text-blue-500 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                                        title="View offer details"
                                      >
                                        <Info className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{offer.description}</p>
                                    <Badge2 variant="success" className="mt-1.5">
                                      {offer.discount_type === 'percentage' ? `${offer.discount_value}% Off` : `₹${offer.discount_value} Off`}
                                    </Badge2>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOffer(offer);
                                      if (offer.coupon_required) {
                                        setIsCouponVerified(false);
                                        setCouponCode('');
                                        setVerifiedCouponData(null);
                                        setCouponError('');
                                      }
                                      saveDraft();
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shrink-0 cursor-pointer"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-2 text-center">No active offers available for this subscription.</p>
                        )}
                      </div>
                    </div>

                    {/* Preferred Payment Method Card */}
                    <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
                      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/60">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100">
                            <CreditCard className="h-4 w-4 text-emerald-600" />
                          </div>
                          <span className="font-semibold text-sm">Preferred Payment Method</span>
                        </div>
                        {paymentMethod && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethod('');
                              saveDraft();
                            }}
                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 font-medium px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          {[
                            { value: 'cash', label: 'Cash' },
                            { value: 'upi', label: 'UPI' },
                          ].map((method) => {
                            const isSelected = paymentMethod === method.value;
                            return (
                              <label
                                key={method.value}
                                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 text-primary font-semibold shadow-xs'
                                    : 'border-input hover:bg-accent/40 text-gray-700'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="subscription_preferred_payment_method"
                                  value={method.value}
                                  checked={isSelected}
                                  onChange={() => {
                                    setPaymentMethod(method.value);
                                    saveDraft();
                                  }}
                                  className="h-4 w-4 text-primary accent-primary focus:ring-primary"
                                />
                                <span className="text-xs font-semibold">{method.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        {!paymentMethod ? (
                          <p className="text-xs text-muted-foreground italic">
                            Optional — No payment method pre-selected for this subscription.
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" />
                            Pre-selected: <span className="font-bold uppercase">{paymentMethod}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Payment Record (when editing existing subscription payment) */}
                    {canEditPayment && (
                      <Card className="p-4 rounded-xl shadow-2xs border">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          Payment Record
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="paymentAmount" className="text-xs">Payment Amount</Label>
                            <Input
                              id="paymentAmount"
                              type="number"
                              min="0"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              placeholder="Enter amount"
                              className="h-9 mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="paymentDate" className="text-xs">Payment Date</Label>
                            <div className="mt-1">
                              <DatePicker
                                value={paymentDate}
                                onChange={setPaymentDate}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="paymentMethodSelect" className="text-xs">Payment Method *</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                              <SelectTrigger id="paymentMethodSelect" className="h-9 mt-1">
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
                              <p className="text-xs text-destructive mt-1">{errors.paymentMethod}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="paymentStatusSelect" className="text-xs">Payment Status *</Label>
                            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                              <SelectTrigger id="paymentStatusSelect" className="h-9 mt-1">
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
                              <p className="text-xs text-destructive mt-1">{errors.paymentStatus}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Subscription Notes Card */}
                    <div className="rounded-xl border bg-card p-4 space-y-2 shadow-2xs">
                      <Label htmlFor="subscription_notes" className="text-xs font-semibold text-gray-700">
                        Subscription Notes (Optional)
                      </Label>
                      <Textarea
                        id="subscription_notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any additional notes or instructions for this subscription..."
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Sticky Subscription Summary */}
                  <div className="space-y-4">
                    <div className="lg:sticky lg:top-4 rounded-xl border bg-card overflow-hidden shadow-2xs">
                      <div className="bg-gradient-to-r from-primary/90 to-primary px-4 py-3">
                        <p className="text-white font-bold text-sm tracking-wide">Subscription Summary</p>
                      </div>

                      {/* Customer & Duration Meta */}
                      <div className="p-3 bg-secondary/35 border-b space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Customer:</span>
                          <span className="font-semibold text-gray-900 capitalize truncate max-w-[190px]">
                            {selectedCustomer?.name || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Vehicle & Duration:</span>
                          <span className="capitalize font-medium text-gray-800">
                            {vehicleType || '—'} · {monthsDuration} {monthsDuration > 1 ? 'months' : 'month'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total Washes:</span>
                          <span className="font-semibold text-primary">
                            {washingSchedules.length} washes
                          </span>
                        </div>
                        {startDate && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Start Date:</span>
                            <span className="font-medium text-gray-700">{startDate}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Packages List */}
                        {packageItems.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Packages</p>
                            {packageItems.map((item, i) => {
                              const pkg = packages.find(p => String(p.id) === String(item.package_id));
                              return (
                                <div key={i} className="flex items-start justify-between gap-2 text-sm">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{pkg?.name || item.package_name || 'Package'}</p>
                                    <p className="text-[10px] text-muted-foreground capitalize">
                                      {item.vehicle_type || vehicleType} · {monthsDuration} mo
                                    </p>
                                  </div>
                                  <span className="font-semibold shrink-0">₹{(item.price || 0).toFixed(0)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add-ons List */}
                        {addonItems.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add-ons</p>
                            {addonItems.map((addon, idx) => {
                              const addonDetails = addons.find(a => String(a.id) === String(addon.addon_id));
                              const washCount = addon.applicable_wash_numbers?.length || 0;
                              return (
                                <div key={idx} className="flex items-start justify-between gap-2 text-sm">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{addonDetails?.name || `Addon ${idx + 1}`}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {addon.application_type === 'all_washes'
                                        ? `All ${washCount} washes`
                                        : `Wash #${addon.applicable_wash_numbers?.join(', #') || 'None'}`}
                                    </p>
                                  </div>
                                  <span className="font-semibold shrink-0">₹{(addon.price || 0).toFixed(0)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Calculation breakdown */}
                        <div className="pt-3 border-t space-y-2 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Packages</span>
                            <span>₹{totals.packages.toFixed(2)}</span>
                          </div>
                          {totals.addons > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>Add-ons</span>
                              <span>₹{totals.addons.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold border-t pt-2">
                            <span>Subtotal</span>
                            <span>₹{totals.subtotal.toFixed(2)}</span>
                          </div>

                          {totals.offerDiscount > 0 && (
                            <>
                              <div className="flex justify-between text-green-600">
                                <span className="flex items-center gap-1.5 capitalize">
                                  <Gift className="h-3.5 w-3.5" />
                                  {selectedOffer?.name ? selectedOffer.name.slice(0, 18) + (selectedOffer.name.length > 18 ? '…' : '') : 'Offer'}
                                </span>
                                <span className="font-semibold">−₹{totals.offerDiscount.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-semibold text-emerald-800 bg-emerald-50/70 px-2 py-1 rounded">
                                <span>After Offer</span>
                                <span>₹{totals.subtotalAfterDiscount.toFixed(2)}</span>
                              </div>
                            </>
                          )}

                          <div className="flex justify-between text-muted-foreground">
                            <span>GST ({totals.gstPercentage}%)</span>
                            <span>₹{totals.gst.toFixed(2)}</span>
                          </div>

                          {totals.roundOff !== 0 && (
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Round Off</span>
                              <span className={totals.roundOff >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {totals.roundOff >= 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Grand Total Box */}
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-gray-800">Grand Total</span>
                            <span className="text-2xl font-black text-primary">₹{totals.total.toFixed(0)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-primary/10">
                            <span>Monthly Average:</span>
                            <span className="font-semibold text-gray-700">₹{totals.perMonth.toFixed(2)} / month</span>
                          </div>
                        </div>

                        {/* Applied Offer Banner */}
                        {selectedOffer && (
                          <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <Gift className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            <span className="text-green-800 font-medium truncate capitalize flex-1">
                              {selectedOffer.name}
                            </span>
                            {isCouponVerified && (
                              <span className="shrink-0 text-green-600 font-bold">✓ Coupon</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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

          {/* Vehicle Identifier Dialog/Drawer */}
          <VehicleIdentifier
            open={identifyDialog.open}
            onOpenChange={(open) => setIdentifyDialog({ open })}
            onApply={(type) => {
              setVehicleType(type);
            }}
          />

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

          {/* Available Customer Coupons Dialog (Desktop) */}
          <Dialog open={!isMobile && isCustomerCouponsOpen} onOpenChange={setIsCustomerCouponsOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Available Coupons
                </DialogTitle>
                <DialogDescription>
                  Active promo coupons linked to {selectedCustomer?.name || 'this customer'}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                {renderCustomerCouponsList()}
              </div>
            </DialogContent>
          </Dialog>

          {/* Available Customer Coupons Drawer (Mobile) */}
          <Drawer open={isMobile && isCustomerCouponsOpen} onOpenChange={setIsCustomerCouponsOpen}>
            <DrawerContent>
              <DrawerHeader className="text-left px-4">
                <DrawerTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Available Coupons
                </DrawerTitle>
                <DrawerDescription>
                  Active promo coupons linked to {selectedCustomer?.name || 'this customer'}
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-4 overflow-y-auto max-h-[55vh]">
                {renderCustomerCouponsList()}
              </div>
              <DrawerFooter className="pt-3 border-t px-4 pb-6">
                <DrawerClose asChild>
                  <Button className="w-full">
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

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
