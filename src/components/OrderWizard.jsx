import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
  Sheet,
  SheetContent,
} from './ui/sheet';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { calculateBookingDuration, reverseGeocode, formatDate } from '../lib/utilities';
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from './ui/drawer';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import VehicleIcon from './VehicleIcon';
import { toast } from 'sonner';
import orderService from '../services/orderService';
import customerService from '../services/customerService';
import LetterAvatar from './LetterAvatar';
import offerService from '../services/offerService';
import loyaltyService from '../services/loyaltyService';
import enquiryService from '../services/enquiryService';
import campaignService from '../services/campaignService';
import useOrderStore from '../store/orderStore';
import VehicleIdentifier from './VehicleIdentifier';
import { getVehicleType } from '../lib/vehicleData';
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
  Clock,
  FileText,
  User,
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

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [isCouponVerified, setIsCouponVerified] = useState(false);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [verifiedCouponData, setVerifiedCouponData] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isCustomerCouponsOpen, setIsCustomerCouponsOpen] = useState(false);
  const [customerCoupons, setCustomerCoupons] = useState([]);
  const [loadingCustomerCoupons, setLoadingCustomerCoupons] = useState(false);

  // Loyalty points states
  const [loyaltySummary, setLoyaltySummary] = useState(null);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [maxRedeemablePoints, setMaxRedeemablePoints] = useState(0);

  // Form refs
  const customerFormRef = useRef(null);
  const appliedOfferRef = useRef(null); // Track which offer has been applied to prevent duplicates
  const skipMapLinkDecodeRef = useRef(false); // Flag to bypass reverse geocoding when last order location is selected

  // Data states
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);

  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [packageItems, setPackageItems] = useState([]);
  const [addonItems, setAddonItems] = useState([]);
  const [bookingDate, setBookingDate] = useState(getTodayDateString());
  const [bookingTimeFrom, setBookingTimeFrom] = useState('');
  const [bookingTimeTo, setBookingTimeTo] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [address, setAddress] = useState({
    area: '',
    city: '',
    district: '',
    state: '',
    map_link: '',
    latitude: 0,
    longitude: 0,
  });
  const [customerPhone, setCustomerPhone] = useState(''); // Order-specific customer phone
  const [notes, setNotes] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [customerHistoryLoading, setCustomerHistoryLoading] = useState(false);
  const [customerStats, setCustomerStats] = useState({
    totalBookings: 0,
    lastBookedAt: null,
    lastArea: '',
    lastMapLink: '',
    lastCity: '',
    lastLatitude: 0,
    lastLongitude: 0,
  });

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

  // Fetch customer booking history and stats when customer is selected
  useEffect(() => {
    if (!selectedCustomer?.id) {
      setCustomerStats({
        totalBookings: 0,
        lastBookedAt: null,
        lastArea: '',
        lastMapLink: '',
        lastCity: '',
        lastLatitude: 0,
        lastLongitude: 0,
      });
      return;
    }

    setCustomerHistoryLoading(true);
    orderService.getAllOrders({ customer_id: selectedCustomer.id, limit: 50 })
      .then((response) => {
        const orders = response.orders || response.data || [];
        const totalBookings = response.meta?.total !== undefined ? response.meta.total : orders.length;

        // Find latest order by booking_date / created_at
        let lastOrder = null;
        if (orders.length > 0) {
          lastOrder = [...orders].sort((a, b) => new Date(b.booking_date || b.created_at) - new Date(a.booking_date || a.created_at))[0];
        }

        const lastArea = lastOrder?.area || lastOrder?.address?.area || selectedCustomer.area || '';
        const lastMapLink = lastOrder?.map_link || lastOrder?.address?.map_link || selectedCustomer.map_link || '';
        const lastCity = lastOrder?.city || lastOrder?.address?.city || selectedCustomer.city || '';
        const lastDistrict = lastOrder?.district || lastOrder?.address?.district || selectedCustomer.district || '';
        const lastState = lastOrder?.state || lastOrder?.address?.state || selectedCustomer.state || '';
        const lastLatitude = lastOrder?.latitude !== undefined && lastOrder?.latitude !== 0 ? lastOrder.latitude : (lastOrder?.address?.latitude !== undefined ? lastOrder.address.latitude : (selectedCustomer.latitude || 0));
        const lastLongitude = lastOrder?.longitude !== undefined && lastOrder?.longitude !== 0 ? lastOrder.longitude : (lastOrder?.address?.longitude !== undefined ? lastOrder.address.longitude : (selectedCustomer.longitude || 0));
        const lastBookedAt = lastOrder?.booking_date || lastOrder?.created_at || selectedCustomer.last_booked_at || null;

        setCustomerStats({
          totalBookings,
          lastBookedAt,
          lastArea,
          lastMapLink,
          lastCity,
          lastDistrict,
          lastState,
          lastLatitude,
          lastLongitude,
        });
      })
      .catch((err) => {
        setCustomerStats({
          totalBookings: selectedCustomer.orders_count || 0,
          lastBookedAt: selectedCustomer.last_booked_at || null,
          lastArea: selectedCustomer.area || '',
          lastMapLink: selectedCustomer.map_link || '',
          lastCity: selectedCustomer.city || '',
          lastDistrict: selectedCustomer.district || '',
          lastState: selectedCustomer.state || '',
          lastLatitude: selectedCustomer.latitude || 0,
          lastLongitude: selectedCustomer.longitude || 0,
        });
      })
      .finally(() => {
        setCustomerHistoryLoading(false);
      });
  }, [selectedCustomer?.id]);

  // Handle using last booked area in order location (uses last order's coordinates & map link directly without re-decoding)
  const handleUseLastArea = () => {
    const areaToUse = customerStats.lastArea || selectedCustomer?.area || '';
    const mapLinkToUse = customerStats.lastMapLink || selectedCustomer?.map_link || '';
    const cityToUse = customerStats.lastCity || selectedCustomer?.city || '';
    const districtToUse = customerStats.lastDistrict || selectedCustomer?.district || '';
    const stateToUse = customerStats.lastState || selectedCustomer?.state || '';
    const latToUse = customerStats.lastLatitude !== undefined ? customerStats.lastLatitude : (selectedCustomer?.latitude || 0);
    const lngToUse = customerStats.lastLongitude !== undefined ? customerStats.lastLongitude : (selectedCustomer?.longitude || 0);

    if (!areaToUse && !mapLinkToUse) {
      toast.error('No previous location recorded for this customer');
      return;
    }

    // Set flag to skip reverse geocoding map link when state updates
    skipMapLinkDecodeRef.current = true;

    setAddress({
      area: areaToUse,
      map_link: mapLinkToUse,
      city: cityToUse,
      district: districtToUse,
      state: stateToUse,
      latitude: latToUse,
      longitude: lngToUse,
    });
    setMapLinkError(false);
    setMapLinkLoading(false);
    saveDraft();
    toast.success(areaToUse ? `Applied last order's location (${areaToUse})` : 'Applied last order\'s location');
  };

  // Handle map link changes with reverse geocoding
  useEffect(() => {
    if (!address.map_link || address.map_link.trim() === '') {
      return;
    }

    // Skip decoding if populated directly from last order's coordinates & link
    if (skipMapLinkDecodeRef.current) {
      skipMapLinkDecodeRef.current = false;
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
            latitude: addressDetails.latitude !== undefined ? addressDetails.latitude : prev.latitude,
            longitude: addressDetails.longitude !== undefined ? addressDetails.longitude : prev.longitude,
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

  // Fetch available offers when step 5 is reached
  useEffect(() => {
    const fetchOffers = async () => {
      // Only fetch when on step 5
      if (currentStep !== 5) {
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
          // Protect offer if it was applied via a verified coupon code (either coupon_required or any coupon-applied offer)
          const isCouponLinked = isCouponVerified;
          if (!isCouponLinked) {
            const isStillValid = offers.some(offer => offer.id === selectedOffer.id);
            if (!isStillValid) {
              // Remove offer if no longer valid
              removeOfferRewards(selectedOffer.id);
              setSelectedOffer(null);
            }
          }
        }
      } catch (error) {
        setAvailableOffers([]);
        if (selectedOffer) {
          // Protect offer if it was applied via a verified coupon code
          const isCouponLinked = isCouponVerified;
          if (!isCouponLinked) {
            removeOfferRewards(selectedOffer.id);
            setSelectedOffer(null);
          }
        }
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, [currentStep, selectedCustomer, packageItems, addonItems]);

  // Fetch loyalty points when customer is selected or step 5 is reached
  useEffect(() => {
    const fetchLoyaltyData = async () => {
      // Only fetch when on step 5
      if (currentStep !== 5) {
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
    if (currentStep !== 5 || loadingOffers) return;

    // If an offer is selected but not in available offers, it was already removed in fetchOffers
    // This useEffect is now mainly for edge cases
    if (selectedOffer && availableOffers.length > 0) {
      // Protect offer if it was applied via a verified coupon code
      const isCouponLinked = isCouponVerified;
      if (!isCouponLinked) {
        const isStillAvailable = availableOffers.some(offer => offer.id === selectedOffer.id);
        if (!isStillAvailable) {
          removeOfferRewards(selectedOffer.id);
          setSelectedOffer(null);
        }
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
      } else {
        if (customerId) {
          // If no draft but customerId provided, pre-select customer
          fetchCustomerById(customerId);
        }
        if (enquiryId) {
          // If no draft but enquiryId provided, load enquiry details
          fetchEnquiryById(enquiryId);
        }
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
    setBookingDate(data.bookingDate || getTodayDateString());
    setBookingTimeFrom(data.bookingTimeFrom || '');
    setBookingTimeTo(data.bookingTimeTo || '');
    setSelectedAgent(data.selectedAgent || '');
    setAddress(data.address || { area: '', city: '', district: '', state: '', map_link: '' });
    setCustomerPhone(data.customerPhone || '');
    setNotes(data.notes || '');
    setSelectedOffer(data.selectedOffer || null);
    setCouponCode(data.couponCode || '');
    setIsCouponVerified(data.isCouponVerified || false);
    setVerifiedCouponData(data.verifiedCouponData || null);
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
      couponCode,
      isCouponVerified,
      verifiedCouponData,
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
      const phone = customerPhone || selectedCustomer.phone || '';
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
              // Build fallback offer from coupon data
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
            // Offer fetch failed — build minimal offer object from coupon data
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

  const fetchCustomerCoupons = async () => {
    if (!selectedCustomer) return;
    setLoadingCustomerCoupons(true);
    try {
      const phone = customerPhone || selectedCustomer.phone || '';
      if (!phone) {
        setCustomerCoupons([]);
        return;
      }
      const response = await campaignService.getAllCoupons({ search: phone });
      const coupons = response.data || [];
      // Filter usable coupons: status !== 'cancelled', 'completed', 'expired' and has remaining uses
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

  const handleRemoveOffer = () => {
    if (selectedOffer) {
      removeOfferRewards(selectedOffer.id);
    }
    setSelectedOffer(null);
    setCouponCode('');
    setIsCouponVerified(false);
    setVerifiedCouponData(null);
    setCouponError('');
    saveDraft();
  };

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      const [packagesRes, addonsRes] = await Promise.all([
        orderService.getPackages(),
        orderService.getAddons(),
      ]);
      const loadedPackages = packagesRes.packages || packagesRes || [];
      loadedPackages.sort((a, b) => a.name.localeCompare(b.name));
      setPackages(loadedPackages);
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
        const lat = customer.latitude || 0;
        const lng = customer.longitude || 0;
        const mapLink = customer.map_link || (lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '');
        setAddress({
          area: customer.area || '',
          city: customer.city || '',
          district: customer.district || '',
          state: customer.state || '',
          map_link: mapLink,
          latitude: lat,
          longitude: lng,
        });
      }
    } catch (error) {
    }
  };

  // Fetch enquiry by ID
  const fetchEnquiryById = async (id) => {
    try {
      const enquiry = await enquiryService.getEnquiryById(id);
      if (enquiry) {
        const lat = enquiry.latitude || 0;
        const lng = enquiry.longitude || 0;
        const mapLink = enquiry.map_link || (lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '');
        setAddress(prev => ({
          ...prev,
          area: enquiry.area || '',
          city: enquiry.city || '',
          district: enquiry.district || '',
          state: enquiry.state || '',
          map_link: mapLink,
          latitude: lat,
          longitude: lng,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch enquiry details:', error);
    }
  };

  // Extract time in HH:MM format from datetime string
  const extractTimeFromDateTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    try {
      if (typeof dateTimeString === 'string' && dateTimeString.includes('T')) {
        const timePart = dateTimeString.split('T')[1];
        if (timePart && timePart.length >= 5) {
          return timePart.substring(0, 5);
        }
      }
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
      if (typeof dateTimeString === 'string' && dateTimeString.includes('T')) {
        return dateTimeString.split('T')[0];
      }
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
        const orderPackages = order.packages?.map(pkg => {
          const discountVal = parseFloat(pkg.discount) || 0;
          return {
            package_id: String(pkg.package_id), // Convert to string for Select component
            package_name: pkg.package_name || pkg.name,
            vehicle_type: pkg.vehicle_type,
            quantity: pkg.quantity || 1,
            unit_price: parseFloat(pkg.price) || 0,
            discount_value: discountVal,
            discount_type: pkg.discount_type,
            total_price: parseFloat(pkg.total_price) || 0,
            notes: pkg.notes || '',
            package: pkg, // Include full package details
            enable_custom_discount: discountVal > 0,
          };
        }) || [];
        setPackageItems(orderPackages);

        // Set addons
        const orderAddons = order.addons?.map(addon => {
          const discountVal = parseFloat(addon.discount) || 0;
          return {
            addon_id: String(addon.addon_id), // Convert to string for Select component
            addon_name: addon.addon_name,
            quantity: addon.quantity || 1,
            unit_price: parseFloat(addon.price) || 0,
            discount_value: discountVal,
            discount_type: addon.discount_type,
            total_price: parseFloat(addon.total_price) || 0,
            addon: addon.addon, // Include full addon details
            enable_custom_discount: discountVal > 0,
          };
        }) || [];
        setAddonItems(orderAddons);

        // Set booking details
        setBookingDate(extractDateFromDateTime(order.booking_date));
        setBookingTimeFrom(extractTimeFromDateTime(order.booking_time_from));
        setBookingTimeTo(extractTimeFromDateTime(order.booking_time_to));

        // Set agent
        setSelectedAgent(order.assigned_to?.id?.toString() || '');

        // Set address from order.address object
        const lat = order.address?.latitude || 0;
        const lng = order.address?.longitude || 0;
        const mapLink = order.address?.map_link || (lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '');
        setAddress({
          area: order.address?.area || '',
          city: order.address?.city || '',
          district: order.address?.district || '',
          state: order.address?.state || '',
          map_link: mapLink,
          latitude: lat,
          longitude: lng,
        });

        // Set notes
        setNotes(order.notes || '');

        // Set redeemed points if any
        if (order.points_redeemed) {
          setPointsToRedeem(order.points_redeemed);
        }

        // Set offer and coupon code if present
        if (order.offer) {
          setSelectedOffer(order.offer);
        }
        if (order.coupon_code) {
          setCouponCode(order.coupon_code);
          setIsCouponVerified(true);

          // Prefill verifiedCouponData with fallback placeholder
          setVerifiedCouponData({
            code: order.coupon_code,
            offer_id: order.offer_id,
            offer_name: order.offer?.name,
            campaign_name: 'Campaign Offer',
            remaining_uses: 0,
          });

          const phone = order.customer_phone || order.customer?.phone || '';
          campaignService.validateCoupon(
            order.coupon_code.trim().toUpperCase(),
            order.customer_id,
            phone
          ).then((couponRes) => {
            if (couponRes && couponRes.valid && couponRes.data) {
              setVerifiedCouponData(couponRes.data);
            }
          }).catch(() => {
            // Keep fallback on error
          });
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
    setBookingDate(getTodayDateString());
    setBookingTimeFrom('');
    setBookingTimeTo('');
    setCustomerPhone('');
    setSelectedAgent('');
    setAddress({ area: '', city: '', district: '', state: '', map_link: '', latitude: 0, longitude: 0 });
    setNotes('');
    setOrderStatus('');
    setSubmitError('');
    setErrors({});
    setOtherStepErrors([]);
    setSubmitAttempted(false);
    setSelectedOffer(null);
    setAvailableOffers([]);
    appliedOfferRef.current = null;
    setCouponCode('');
    setIsCouponVerified(false);
    setVerifiedCouponData(null);
    setCouponError('');
    setPointsToRedeem('');
    setLoyaltySummary(null);
    setMaxRedeemablePoints(0);
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

    if (step === 5) {
      // Validate coupon requirements
      if (selectedOffer && selectedOffer.coupon_required && !isCouponVerified) {
        stepErrors.coupon = 'A verified coupon is required for the selected offer';
      }
    }

    return stepErrors;
  };

  // Check errors in all other steps and collect them
  const checkOtherStepsErrors = (activeStep = currentStep) => {
    const errorMessages = [];

    // Only check other steps if submit has been attempted
    if (!submitAttempted) {
      setOtherStepErrors([]);
      return;
    }

    for (let step = 1; step <= 5; step++) {
      if (step === activeStep) continue; // Skip active step

      const stepErrors = getStepErrors(step);
      const errorCount = Object.keys(stepErrors).length;

      if (errorCount > 0) {
        const stepName = ['Customer', 'Packages', 'Add-ons', 'Booking schedule', 'Offers & Summary'][step - 1];
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
        checkOtherStepsErrors(step);
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  // Validate all steps and show errors
  const validateAllSteps = () => {
    let allValid = true;
    let firstInvalidStep = null;

    // Check all steps
    for (let step = 1; step <= 5; step++) {
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
      checkOtherStepsErrors(firstInvalidStep);
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
    checkOtherStepsErrors(nextStep);

    saveDraft(nextStep);
  };

  const handleBack = () => {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    setSubmitError(''); // Clear submit errors when navigating back

    // If submit was attempted, re-validate to show/update errors for the new step
    if (submitAttempted) {
      const prevStepErrors = getStepErrors(prevStep);
      setErrors(prevStepErrors);
      checkOtherStepsErrors(prevStep);
    } else {
      setOtherStepErrors([]);
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
        enable_custom_discount: false,
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

    // Apply offer discount if selected (and verified if coupon is required)
    let offerDiscount = 0;
    if (selectedOffer) {
      const isEligible = !selectedOffer.coupon_required || isCouponVerified;
      if (isEligible) {
        if (selectedOffer.discount_type === 'fixed') {
          offerDiscount = selectedOffer.discount_value;
        } else if (selectedOffer.discount_type === 'percentage') {
          offerDiscount = (subtotal * selectedOffer.discount_value) / 100;
        }
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
        enable_custom_discount: false,
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
      const bookingDateISO = bookingDate ? `${bookingDate}T00:00:00+05:30` : null;
      const bookingTimeFromISO = bookingTimeFrom ? `${bookingDate}T${bookingTimeFrom}:00+05:30` : null;
      const bookingTimeToISO = bookingTimeTo ? `${bookingDate}T${bookingTimeTo}:00+05:30` : null;

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
        coupon_code: isCouponVerified ? couponCode.trim().toUpperCase() : undefined,
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
      case 5:
        return renderStep5();
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

      {/* Customer Search */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">Select Customer</span>
          <span className="text-red-500 text-xs font-bold ml-0.5">*</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative" ref={customerSearchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={selectedCustomer ? `${selectedCustomer.name} — ${selectedCustomer.phone}` : customerSearchTerm}
                onChange={(e) => { setCustomerSearchTerm(e.target.value); setSelectedCustomer(null); }}
                onFocus={() => { if (customerSearchTerm.length >= 2) setShowCustomerSuggestions(true); }}
                className="pl-10 h-11 text-sm"
                disabled={!!orderId}
              />
              {customerSearchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {showCustomerSuggestions && customerSearchTerm.length >= 2 && (
              <Card className="absolute bg-white z-50 w-full mt-1 max-h-64 overflow-y-auto shadow-lg border border-gray-100">
                {customerSearchLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Searching...
                  </div>
                ) : customers.length > 0 ? (
                  <div className="py-1">
                    {(() => {
                      const getScore = (c, term) => {
                        const t = term.toLowerCase().trim();
                        const n = (c.name || '').toLowerCase();
                        const p = (c.phone || '').toLowerCase();
                        if (n === t || p === t) return 100;
                        if (n.startsWith(t) || p.startsWith(t)) return 80;
                        if (n.includes(t) || p.includes(t)) return 50;
                        return 10;
                      };
                      const scored = customers.map(c => ({ ...c, score: getScore(c, customerSearchTerm) }));
                      const best = scored.filter(c => c.score >= 80);
                      const others = scored.filter(c => c.score < 80);
                      const renderRow = (customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full px-4 py-2.5 text-left hover:bg-secondary active:bg-secondary/80 transition-all flex items-center gap-3 border-b last:border-b-0 border-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerPhone(customer.phone || '');
                            setCustomerSearchTerm('');
                            setShowCustomerSuggestions(false);
                            setAddress({ area: customer.area || '', city: customer.city || '', district: customer.district || '', state: customer.state || '', map_link: customer.map_link || '' });
                            saveDraft();
                          }}
                        >
                          <LetterAvatar name={customer.name} size="sm" className="shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm truncate capitalize">{customer.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                              <span>{customer.phone}</span>
                              {customer.area && <><span>•</span><MapPin className="h-3 w-3 text-gray-400 shrink-0" /><span className="truncate">{customer.area}</span></>}
                            </div>
                          </div>
                        </button>
                      );
                      return (
                        <>
                          {best.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50/70 uppercase tracking-wider">Best Matches</div>
                              {best.map(renderRow)}
                            </div>
                          )}
                          {others.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[10px] font-bold text-gray-500 bg-gray-50 uppercase tracking-wider border-t border-gray-100">Other Matches</div>
                              {others.map(renderRow)}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">No customers found for "{customerSearchTerm}"</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setShowCustomerSuggestions(false);
                        const isPhone = /^[\d\s+\-()]+$/.test(customerSearchTerm.trim());
                        setNewCustomerInitialData(isPhone ? { phone: customerSearchTerm.trim() } : null);
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
          {errors.customer && <p className="text-xs text-destructive font-medium">{errors.customer}</p>}

          {/* Selected Customer Inline display */}
          {selectedCustomer && (
            <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50/90 rounded-2xl border border-blue-100/80 shadow-xs mt-3 overflow-hidden transition-all duration-200">
              {/* Main Customer Info Header */}
              <div className="p-3.5 sm:p-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <LetterAvatar name={selectedCustomer.name} size="md" className="shrink-0 font-bold shadow-xs" />
                  <div className="min-w-0 flex-1">
                    {editingCustomer ? (
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Phone (Order-specific)</Label>
                        <div className="flex gap-1.5 items-center">
                          <Input
                            value={editCustomerData.phone}
                            onChange={(e) => setEditCustomerData({ ...editCustomerData, phone: e.target.value })}
                            placeholder="Phone number"
                            className="h-8 text-xs flex-1 bg-white"
                          />
                          <Button type="button" size="sm" className="h-8 text-xs px-2.5" onClick={() => { setCustomerPhone(editCustomerData.phone); setAddress({ ...address, area: editCustomerData.area || address.area, city: editCustomerData.city || address.city }); setEditingCustomer(false); saveDraft(); toast.success('Updated'); }}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="h-8 text-xs px-2.5 bg-white" onClick={() => { setEditingCustomer(false); setEditCustomerData({ phone: '', area: '', city: '' }); }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-base text-gray-900 truncate tracking-tight capitalize">{selectedCustomer.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-medium bg-white/80 px-2 py-0.5 rounded-md border border-gray-200/60 shadow-2xs">
                            <Phone className="h-3 w-3 text-blue-600 shrink-0" />
                            {customerPhone || selectedCustomer.phone}
                          </span>
                          {customerPhone && customerPhone !== selectedCustomer.phone && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-semibold border border-amber-200 shrink-0">
                              Order-specific
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {!editingCustomer && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-white/80 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                      onClick={() => { setEditCustomerData({ phone: customerPhone || selectedCustomer.phone || '', area: address.area || selectedCustomer.area || '', city: address.city || selectedCustomer.city || '' }); setEditingCustomer(true); }}
                      title="Edit phone number">
                      <PenIcon className="h-3.5 w-3.5" />
                    </Button>
                    {!orderId && (
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        onClick={() => { setSelectedCustomer(null); setCustomerSearchTerm(''); setEditingCustomer(false); }}
                        title="Remove customer">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Booking History Stat Chips & Location Quick-Fill */}
              {!editingCustomer && (
                <div className="bg-white/70 backdrop-blur-xs px-3.5 py-3 border-t border-blue-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs">
                    {/* Total Bookings Chip */}
                    <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200/70 shadow-2xs">
                      <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-medium leading-none">Total Orders</span>
                        <span className="font-semibold text-gray-900 text-xs mt-0.5">
                          {customerHistoryLoading ? '...' : `${customerStats.totalBookings} ${customerStats.totalBookings === 1 ? 'booking' : 'bookings'}`}
                        </span>
                      </div>
                    </div>

                    {/* Last Booked Date Chip */}
                    <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200/70 shadow-2xs">
                      <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-medium leading-none">Last Booked</span>
                        <span className="font-semibold text-gray-800 text-xs mt-0.5">
                          {customerHistoryLoading ? 'Loading...' : formatDate(customerStats.lastBookedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Last Area Chip */}
                    <div className="col-span-2 sm:col-auto flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200/70 shadow-2xs max-w-full">
                      <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-orange-600" />
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-[10px] text-gray-500 font-medium leading-none">Last Area</span>
                        <span className="font-semibold text-gray-800 text-xs mt-0.5 truncate max-w-[160px]">
                          {customerHistoryLoading ? '...' : (customerStats.lastArea || selectedCustomer.area || 'N/A')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(customerStats.lastArea || customerStats.lastMapLink || selectedCustomer.area || selectedCustomer.map_link) && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUseLastArea}
                      className="h-8 text-xs px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-lg shadow-2xs hover:shadow-xs gap-1.5 transition-all shrink-0 cursor-pointer border-0 w-full sm:w-auto"
                      title="Use last booked area for service address"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>Use Last Booked Area</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-100">
            <MapPin className="h-4 w-4 text-orange-600" />
          </div>
          <span className="font-semibold text-sm">Service Address</span>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground font-medium mb-1 block">Map Link</Label>
            <div className="relative">
              <Input
                value={address.map_link}
                onChange={(e) => setAddress({ ...address, map_link: e.target.value })}
                placeholder="Paste Google Maps link..."
                disabled={mapLinkLoading}
                className={address.map_link ? "pr-10" : ""}
              />
              {mapLinkLoading ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : address.map_link ? (
                <button type="button"
                  onClick={() => { setAddress({ ...address, map_link: '', latitude: 0, longitude: 0, area: '', city: '', district: '', state: '' }); saveDraft(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {mapLinkLoading && (
              <span className="text-blue-500 text-xs flex items-center gap-1 mt-1.5">
                <LoaderCircle className="h-3 w-3 animate-spin" /> Identifying location from map link…
              </span>
            )}
            {mapLinkError && !mapLinkLoading && (
              <span className="text-amber-500 text-xs mt-1.5 block">Unable to find location — please update manually</span>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">Paste a Google Maps link to auto-fill area</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-medium mb-1 block">Area / Locality</Label>
            <Input
              value={address.area}
              onChange={(e) => { setAddress({ ...address, area: e.target.value }); setMapLinkError(false); saveDraft(); }}
              placeholder="e.g. Kakkanad, Ernakulam"
            />
            {errors.area && <p className="text-xs text-destructive mt-1">{errors.area}</p>}
          </div>
        </div>
      </div>
    </div>
  );


  // Step 2: Package Selection (simplified for now)
  const renderStep2 = () => {
    const hasRewardPackages = packageItems.some(item => item.is_reward);

    return (
      <div className="space-y-4">
        {renderOtherStepErrors()}

        {hasRewardPackages && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm">
            <Info className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div className="text-green-800">
              <span className="font-semibold">Offer rewards included:</span> Items marked with the "Offer Reward" badge are complimentary and cannot be modified or removed.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Service Packages</p>
            <p className="text-[11px] text-muted-foreground">Add one or more wash packages</p>
          </div>
          <Button type="button" size="sm" onClick={addPackageItem} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Package
          </Button>
        </div>

        {errors.packages && <p className="text-xs text-destructive font-medium">{errors.packages}</p>}

        {packageItems.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 p-10 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground mb-1">No packages added</p>
            <p className="text-xs text-muted-foreground mb-4">Add a service package to continue</p>
            <Button type="button" variant="outline" size="sm" onClick={addPackageItem} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Service Package
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="space-y-3 md:hidden">
              {packageItems.map((item, index) => {
                const hasError = errors[`package_${index}_vehicle_type`] || errors[`package_${index}_package`];
                return (
                  <div key={index} className={`rounded-xl border bg-card overflow-hidden ${item.is_reward ? 'border-green-200' : ''}`}>
                    <div className={`flex items-center gap-2 px-4 pt-3.5 pb-3 border-b ${item.is_reward ? 'bg-green-50' : 'bg-muted/30'}`}>
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Service {index + 1}</span>
                      {item.is_reward && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-[10px] rounded-full font-bold">
                          <Gift className="h-3 w-3" /> Offer Reward
                        </span>
                      )}
                      <div className="ml-auto flex gap-1">
                        {!item.is_reward && (
                          <>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => { setIdentifyDialog({ open: true, index }); setIdentifyBrand(''); setIdentifyModel(''); }}>
                              <Search className="h-3 w-3" />
                              <span className="hidden sm:inline">Identify</span>
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => setDeletePackageDialog({ open: true, index })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {hasError && (
                        <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 px-3 py-2 rounded-lg">
                          <X className="h-3.5 w-3.5 shrink-0" />
                          {errors[`package_${index}_vehicle_type`] && 'Vehicle type is required. '}
                          {errors[`package_${index}_package`] && 'Package selection is required.'}
                        </div>
                      )}

                      <div>
                        <Label className="text-xs text-muted-foreground font-medium mb-2 block">Vehicle Type</Label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {['hatchback', 'sedan', 'suv', 'luxury'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => updatePackageItem(index, 'vehicle_type', type)}
                              disabled={item.is_reward}
                              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all active:scale-95 ${item.vehicle_type === type
                                ? 'border-primary bg-primary text-white shadow-md'
                                : 'border-muted-foreground/20 bg-background hover:border-primary/40'
                                }`}
                            >
                              <VehicleIcon vehicleType={type} size={28} className={item.vehicle_type === type ? 'text-white' : 'text-foreground'} />
                              <span className="text-[10px] font-bold capitalize leading-none">{type}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-end gap-3">
                        <div className="flex-1 min-w-0">
                          <Label className="text-xs text-muted-foreground font-medium mb-1 block">Package *</Label>
                          <Select
                            value={item.package_id}
                            onValueChange={(v) => updatePackageItem(index, 'package_id', v)}
                            disabled={!item.vehicle_type || item.is_reward}
                          >
                            <SelectTrigger className="h-9 text-sm w-full">
                              <SelectValue placeholder={item.vehicle_type ? "Select package" : "Select vehicle type first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {packages.filter((p) => p.vehicle_type?.toLowerCase() === item.vehicle_type?.toLowerCase())
                                .map((pkg) => (
                                  <SelectItem key={pkg.id} value={String(pkg.id)}>
                                    {pkg.name} — ₹{pkg.unit_price || pkg.price || pkg.base_price}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="shrink-0">
                          <Label className="text-xs text-muted-foreground font-medium mb-1 block">Qty</Label>
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" className="h-9 w-9 rounded-full"
                              onClick={() => updatePackageItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1 || item.is_reward}>
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                            <Button type="button" size="icon" className="h-9 w-9 rounded-full"
                              onClick={() => updatePackageItem(index, 'quantity', item.quantity + 1)}
                              disabled={item.is_reward}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Checkbox
                              id={`pkg-discount-enable-${index}`}
                              checked={item.enable_custom_discount || false}
                              disabled={item.is_reward}
                              onCheckedChange={(checked) => { updatePackageItem(index, 'enable_custom_discount', !!checked); if (!checked) updatePackageItem(index, 'discount_value', 0); }}
                            />
                            <label htmlFor={`pkg-discount-enable-${index}`} className="text-[10px] font-medium text-gray-600 cursor-pointer">Custom Discount</label>
                          </div>
                          <div className="flex gap-1">
                            <Input type="number" min="0" placeholder="0"
                              value={item.discount_value || ''}
                              onChange={(e) => { const v = e.target.value; const n = v === '' ? 0 : parseFloat(v); updatePackageItem(index, 'discount_value', isNaN(n) ? 0 : n); }}
                              className="h-8 text-sm"
                              disabled={item.is_reward || !item.enable_custom_discount}
                            />
                            <Select value={item.discount_type} onValueChange={(v) => updatePackageItem(index, 'discount_type', v)} disabled={item.is_reward || !item.enable_custom_discount}>
                              <SelectTrigger className="h-8 w-14 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={DISCOUNT_TYPES.FIXED}>₹</SelectItem>
                                <SelectItem value={DISCOUNT_TYPES.PERCENTAGE}>%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Amount</p>
                          <p className="text-2xl font-black text-primary leading-none">₹{calculateLineTotal(item).toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block border rounded-xl overflow-hidden bg-card">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="p-3 w-40">Vehicle Type</th>
                    <th className="p-3">Package *</th>
                    <th className="p-3 w-36">Quantity *</th>
                    <th className="p-3 w-56">Custom Discount</th>
                    <th className="p-3 text-right w-28">Amount</th>
                    <th className="p-3 text-center w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {packageItems.map((item, index) => {
                    const hasError = errors[`package_${index}_vehicle_type`] || errors[`package_${index}_package`];
                    return (
                      <tr key={index} className={`hover:bg-secondary/20 transition-colors ${item.is_reward ? 'bg-green-50/50' : ''} ${hasError ? 'bg-destructive/5' : ''}`}>
                        <td className="p-3 align-middle">
                          <Select
                            value={item.vehicle_type}
                            onValueChange={(val) => updatePackageItem(index, 'vehicle_type', val)}
                            disabled={item.is_reward}
                          >
                            <SelectTrigger className="h-9 w-32 border-gray-300 text-sm">
                              <SelectValue placeholder="Vehicle Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hatchback">Hatchback</SelectItem>
                              <SelectItem value="sedan">Sedan</SelectItem>
                              <SelectItem value="suv">SUV</SelectItem>
                              <SelectItem value="luxury">Luxury</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        <td className="p-3 align-middle">
                          <Select
                            value={item.package_id}
                            onValueChange={(v) => updatePackageItem(index, 'package_id', v)}
                            disabled={!item.vehicle_type || item.is_reward}
                          >
                            <SelectTrigger className="h-9 w-full border-gray-300 text-sm">
                              <SelectValue placeholder={item.vehicle_type ? "Select package" : "Choose vehicle type first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {packages
                                .filter((p) => p.vehicle_type?.toLowerCase() === item.vehicle_type?.toLowerCase())
                                .map((pkg) => (
                                  <SelectItem key={pkg.id} value={String(pkg.id)}>
                                    {pkg.name} — ₹{pkg.unit_price || pkg.price || pkg.base_price}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </td>

                        <td className="p-3 align-middle">
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" className="h-8 w-8 rounded-full border" variant="outline"
                              onClick={() => updatePackageItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1 || item.is_reward}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                            <Button type="button" size="icon" className="h-8 w-8 rounded-full border" variant="outline"
                              onClick={() => updatePackageItem(index, 'quantity', item.quantity + 1)}
                              disabled={item.is_reward}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>

                        <td className="p-3 align-middle">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`pkg-discount-enable-desktop-${index}`}
                                checked={item.enable_custom_discount || false}
                                disabled={item.is_reward}
                                onCheckedChange={(checked) => {
                                  updatePackageItem(index, 'enable_custom_discount', !!checked);
                                  if (!checked) updatePackageItem(index, 'discount_value', 0);
                                }}
                              />
                              <label htmlFor={`pkg-discount-enable-desktop-${index}`} className="text-[10px] font-medium text-gray-600 cursor-pointer select-none">
                                Enable Discount
                              </label>
                            </div>
                            {item.enable_custom_discount && (
                              <div className="flex gap-1">
                                <Input type="number" min="0" placeholder="0"
                                  value={item.discount_value || ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const n = v === '' ? 0 : parseFloat(v);
                                    updatePackageItem(index, 'discount_value', isNaN(n) ? 0 : n);
                                  }}
                                  className="h-8 text-sm w-20 border-gray-300"
                                />
                                <Select value={item.discount_type} onValueChange={(v) => updatePackageItem(index, 'discount_type', v)}>
                                  <SelectTrigger className="h-8 w-12 text-xs border-gray-300"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={DISCOUNT_TYPES.FIXED}>₹</SelectItem>
                                    <SelectItem value={DISCOUNT_TYPES.PERCENTAGE}>%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-3 align-middle text-right">
                          <span className="font-bold text-base text-primary">₹{calculateLineTotal(item).toFixed(0)}</span>
                        </td>

                        <td className="p-3 align-middle text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!item.is_reward ? (
                              <>
                                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs gap-1 border border-primary/20 text-primary hover:bg-primary/5 px-2 cursor-pointer"
                                  onClick={() => { setIdentifyDialog({ open: true, index }); setIdentifyBrand(''); setIdentifyModel(''); }}>
                                  <Search className="h-3 w-3" />
                                  <span>Identify</span>
                                </Button>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 border border-destructive/20 text-destructive hover:bg-destructive/5 cursor-pointer"
                                  onClick={() => setDeletePackageDialog({ open: true, index })}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">Reward</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
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
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm">
            <Info className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div className="text-green-800">
              <span className="font-semibold">Offer rewards included:</span> Items marked with the "Offer Reward" badge are complimentary and cannot be modified or removed.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Add-on Services</p>
            <p className="text-[11px] text-muted-foreground">Optional extra services</p>
          </div>
          <Button type="button" size="sm" onClick={addAddonItem} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Add-on
          </Button>
        </div>

        {addonItems.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 p-10 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground mb-1">No add-ons selected</p>
            <p className="text-xs text-muted-foreground mb-4">Add-ons are optional — you can skip this step</p>
            <Button type="button" variant="outline" size="sm" onClick={addAddonItem} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Add-on
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="space-y-3 md:hidden">
              {addonItems.map((item, index) => {
                const hasError = errors[`addon_${index}_addon`];
                return (
                  <div key={index} className={`rounded-xl border bg-card overflow-hidden ${item.is_reward ? 'border-green-200' : ''}`}>
                    <div className={`flex items-center gap-2 px-4 pt-3.5 pb-3 border-b ${item.is_reward ? 'bg-green-50' : 'bg-muted/30'}`}>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Add-on {index + 1}</span>
                      {item.is_reward && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-[10px] rounded-full font-bold">
                          <Gift className="h-3 w-3" /> Offer Reward
                        </span>
                      )}
                      {!item.is_reward && (
                        <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 w-7 p-0"
                          onClick={() => removeAddonItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      {hasError && (
                        <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 px-3 py-2 rounded-lg">
                          <X className="h-3.5 w-3.5 shrink-0" />
                          Add-on selection is required
                        </div>
                      )}

                      <div className="flex items-end gap-3">
                        <div className="flex-1 min-w-0">
                          <Label className="text-xs text-muted-foreground font-medium mb-1 block">Add-on Service *</Label>
                          <Select value={item.addon_id} onValueChange={(v) => updateAddonItem(index, 'addon_id', v)} disabled={item.is_reward}>
                            <SelectTrigger className="h-9 text-sm w-full">
                              <SelectValue placeholder="Select add-on" />
                            </SelectTrigger>
                            <SelectContent>
                              {addons.map((addon) => (
                                <SelectItem key={addon.id} value={String(addon.id)}>
                                  {addon.name} — ₹{addon.unit_price || addon.price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="shrink-0">
                          <Label className="text-xs text-muted-foreground font-medium mb-1 block">Qty</Label>
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" className="h-9 w-9 rounded-full"
                              onClick={() => updateAddonItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1 || item.is_reward}>
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                            <Button type="button" size="icon" className="h-9 w-9 rounded-full"
                              onClick={() => updateAddonItem(index, 'quantity', item.quantity + 1)}
                              disabled={item.is_reward}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Checkbox
                              id={`addon-discount-enable-${index}`}
                              checked={item.enable_custom_discount || false}
                              disabled={item.is_reward}
                              onCheckedChange={(checked) => { updateAddonItem(index, 'enable_custom_discount', !!checked); if (!checked) updateAddonItem(index, 'discount_value', 0); }}
                            />
                            <label htmlFor={`addon-discount-enable-${index}`} className="text-[10px] font-medium text-gray-600 cursor-pointer">Custom Discount</label>
                          </div>
                          <div className="flex gap-1">
                            <Input type="number" min="0" placeholder="0"
                              value={item.discount_value || ''}
                              onChange={(e) => { const v = e.target.value; const n = v === '' ? 0 : parseFloat(v); updateAddonItem(index, 'discount_value', isNaN(n) ? 0 : n); }}
                              className="h-8 text-sm"
                              disabled={item.is_reward || !item.enable_custom_discount}
                            />
                            <Select value={item.discount_type} onValueChange={(v) => updateAddonItem(index, 'discount_type', v)} disabled={item.is_reward || !item.enable_custom_discount}>
                              <SelectTrigger className="h-8 w-14 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={DISCOUNT_TYPES.FIXED}>₹</SelectItem>
                                <SelectItem value={DISCOUNT_TYPES.PERCENTAGE}>%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Amount</p>
                          <p className="text-2xl font-black text-primary leading-none">₹{calculateLineTotal(item).toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block border rounded-xl overflow-hidden bg-card">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="p-3">Add-on Service *</th>
                    <th className="p-3 w-36">Quantity *</th>
                    <th className="p-3 w-56">Custom Discount</th>
                    <th className="p-3 text-right w-28">Amount</th>
                    <th className="p-3 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {addonItems.map((item, index) => {
                    const hasError = errors[`addon_${index}_addon`];
                    return (
                      <tr key={index} className={`hover:bg-secondary/20 transition-colors ${item.is_reward ? 'bg-green-50/50' : ''} ${hasError ? 'bg-destructive/5' : ''}`}>
                        <td className="p-3 align-middle">
                          <Select value={item.addon_id} onValueChange={(v) => updateAddonItem(index, 'addon_id', v)} disabled={item.is_reward}>
                            <SelectTrigger className="h-9 w-full border-gray-300 text-sm">
                              <SelectValue placeholder="Select add-on" />
                            </SelectTrigger>
                            <SelectContent>
                              {addons.map((addon) => (
                                <SelectItem key={addon.id} value={String(addon.id)}>
                                  {addon.name} — ₹{addon.unit_price || addon.price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        <td className="p-3 align-middle">
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" className="h-8 w-8 rounded-full border" variant="outline"
                              onClick={() => updateAddonItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1 || item.is_reward}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                            <Button type="button" size="icon" className="h-8 w-8 rounded-full border" variant="outline"
                              onClick={() => updateAddonItem(index, 'quantity', item.quantity + 1)}
                              disabled={item.is_reward}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>

                        <td className="p-3 align-middle">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`addon-discount-enable-desktop-${index}`}
                                checked={item.enable_custom_discount || false}
                                disabled={item.is_reward}
                                onCheckedChange={(checked) => {
                                  updateAddonItem(index, 'enable_custom_discount', !!checked);
                                  if (!checked) updateAddonItem(index, 'discount_value', 0);
                                }}
                              />
                              <label htmlFor={`addon-discount-enable-desktop-${index}`} className="text-[10px] font-medium text-gray-600 cursor-pointer select-none">
                                Enable Discount
                              </label>
                            </div>
                            {item.enable_custom_discount && (
                              <div className="flex gap-1">
                                <Input type="number" min="0" placeholder="0"
                                  value={item.discount_value || ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const n = v === '' ? 0 : parseFloat(v);
                                    updateAddonItem(index, 'discount_value', isNaN(n) ? 0 : n);
                                  }}
                                  className="h-8 text-sm w-20 border-gray-300"
                                />
                                <Select value={item.discount_type} onValueChange={(v) => updateAddonItem(index, 'discount_type', v)}>
                                  <SelectTrigger className="h-8 w-12 text-xs border-gray-300"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={DISCOUNT_TYPES.FIXED}>₹</SelectItem>
                                    <SelectItem value={DISCOUNT_TYPES.PERCENTAGE}>%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-3 align-middle text-right">
                          <span className="font-bold text-base text-primary">₹{calculateLineTotal(item).toFixed(0)}</span>
                        </td>

                        <td className="p-3 align-middle text-center">
                          <div className="flex items-center justify-center">
                            {!item.is_reward ? (
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 border border-destructive/20 text-destructive hover:bg-destructive/5 cursor-pointer"
                                onClick={() => removeAddonItem(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">Reward</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };


  // Step 4: Booking Details
  const renderStep4 = () => {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {renderOtherStepErrors()}
        {submitError && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Submission Error</p>
              <p className="text-sm text-destructive/80 mt-0.5">{submitError}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSubmitError('')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Booking Date & Time */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Booking Schedule</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 items-start">
              <div className="sm:w-44">
                <Label className="text-xs text-muted-foreground font-medium mb-1 block">Date *</Label>
                <DatePicker
                  value={bookingDate}
                  onChange={(value) => { setBookingDate(value); saveDraft(); }}
                />
                {errors.bookingDate && <p className="text-xs text-destructive mt-1">{errors.bookingDate}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground font-medium mb-1 block">From *</Label>
                  <Select value={bookingTimeFrom} onValueChange={(value) => {
                    setBookingTimeFrom(value);
                    if (value) {
                      const [hours, minutes] = value.split(':').map(Number);
                      const fromDate = new Date();
                      fromDate.setHours(hours, minutes);
                      fromDate.setMinutes(fromDate.getMinutes() + 120);
                      setBookingTimeTo(`${String(fromDate.getHours()).padStart(2, '0')}:${String(fromDate.getMinutes()).padStart(2, '0')}`);
                    }
                    saveDraft();
                  }}>
                    <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {generateTimeOptions().map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.bookingTimeFrom && <p className="text-xs text-destructive mt-1">{errors.bookingTimeFrom}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium mb-1 block">To *</Label>
                  <Select value={bookingTimeTo} onValueChange={(value) => { setBookingTimeTo(value); saveDraft(); }}>
                    <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {generateTimeOptions().filter((time) => {
                        if (bookingTimeFrom) {
                          const [h, m] = time.value.split(':').map(Number);
                          const [fh, fm] = bookingTimeFrom.split(':').map(Number);
                          return (h * 60 + m) > (fh * 60 + fm);
                        }
                        return true;
                      }).map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.bookingTimeTo && <p className="text-xs text-destructive mt-1">{errors.bookingTimeTo}</p>}
                </div>
              </div>
            </div>
            {bookingTimeFrom && bookingTimeTo && (
              <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 rounded-lg px-3 py-2">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {calculateBookingDuration(bookingTimeFrom, bookingTimeTo)}
              </div>
            )}
          </div>
        </div>

        {/* Agent Assignment */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100">
              <User className="h-4 w-4 text-violet-600" />
            </div>
            <span className="font-semibold text-sm">Assign Agent</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">Optional</span>
          </div>
          <div className="p-4">
            <Select value={selectedAgent || "unassigned"} onValueChange={(value) => {
              setSelectedAgent(value === "unassigned" ? "" : value);
              saveDraft();
            }}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {agents.filter(a => !a.locked).map((agent) => (
                  <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100">
              <FileText className="h-4 w-4 text-gray-500" />
            </div>
            <span className="font-semibold text-sm">Notes</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">Optional</span>
          </div>
          <div className="p-4">
            <Textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); saveDraft(); }}
              placeholder="Additional notes or instructions..."
              className="resize-none text-sm"
              rows={isMobile ? 3 : 4}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderStep5 = () => {
    const totals = calculateTotals();

    return (
      <div className="space-y-4">
        {renderOtherStepErrors()}
        {submitError && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Submission Error</p>
              <p className="text-sm text-destructive/80 mt-0.5">{submitError}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSubmitError('')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          {/* LEFT COLUMN: Offers, Coupons & Loyalty */}
          <div className="space-y-4">
            {/* Offers & Coupons */}
            <div className="rounded-xl border bg-card">
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
                    className="h-auto p-0 text-xs font-semibold text-primary cursor-pointer hover:underline"
                    onClick={() => {
                      setIsCustomerCouponsOpen(true);
                      fetchCustomerCoupons();
                    }}
                  >
                    Search Available Coupons
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
                        placeholder="e.g. COCHIN-HYP-DW02-X87F9B"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="uppercase font-mono text-sm h-9 border-gray-300"
                      />
                      <Button type="button" disabled={verifyingCoupon} onClick={handleVerifyCoupon}
                        className="bg-primary hover:bg-primary/90 text-white font-medium h-9 shrink-0">
                        {verifyingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                      </Button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 font-semibold">{couponError}</p>}
                    <p className="text-[10px] text-muted-foreground">Have a promotional code? Enter it here to unlock rewards.</p>
                  </div>
                )}

                {loadingOffers ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => (
                      <div key={i} className="flex items-start justify-between gap-2 p-3 border rounded-lg">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded" /><Skeleton className="h-4 w-32" /></div>
                          <Skeleton className="h-3 w-full" />
                        </div>
                        <Skeleton className="h-8 w-16 rounded" />
                      </div>
                    ))}
                  </div>
                ) : selectedOffer ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Tag className="h-4 w-4 text-green-600 shrink-0" />
                          <span className="font-semibold text-green-800 text-sm">{selectedOffer.name}</span>
                          {selectedOffer.coupon_required && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200">Coupon Required</span>
                          )}
                          {isCouponVerified && !selectedOffer.coupon_required && (
                            <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-indigo-200">Via Coupon</span>
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
                      <button type="button" onClick={handleRemoveOffer}
                        className="text-red-500 hover:text-red-700 cursor-pointer text-xs font-semibold shrink-0 px-2 py-1 rounded hover:bg-red-50 transition-colors">
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
                              <Input placeholder="e.g. THRWDIWALI-A3B9" value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                className="uppercase font-mono text-sm h-9" />
                              <Button type="button" disabled={verifyingCoupon} onClick={handleVerifyCoupon}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 shrink-0">
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
                              <span className="font-medium text-sm">{offer.name}</span>
                              {offer.coupon_required && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] py-0.5 px-2 rounded-full font-bold">Coupon Required</span>
                              )}
                              <button type="button" onClick={() => setOfferDetailsDialog({ open: true, offer })}
                                className="text-blue-500 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50 transition-colors" title="View offer details">
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{offer.description}</p>
                            <div className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-primary">
                              <Percent className="h-3 w-3" />
                              {offer.discount_type === 'percentage' ? `${offer.discount_value}% Off` : `₹${offer.discount_value} Off`}
                            </div>
                          </div>
                          <button type="button" onClick={() => {
                            setSelectedOffer(offer);
                            if (offer.coupon_required) {
                              setIsCouponVerified(false);
                              setCouponCode('');
                              setVerifiedCouponData(null);
                              setCouponError('');
                            }
                            saveDraft();
                          }} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shrink-0">
                            Apply
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2 text-center">No offers available for the selected items</p>
                )}
              </div>
            </div>

            {/* Loyalty Points */}
            <div className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100">
                  <Coins className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-semibold text-sm">Loyalty Points</span>
              </div>
              <div className="p-4">
                {loadingLoyalty ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : loyaltySummary ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Available Balance</p>
                        <p className="text-xl font-bold text-blue-700">{loyaltySummary.current_balance} <span className="text-xs font-normal">pts</span></p>
                        <p className="text-[11px] text-blue-600/80 mt-0.5">≈ ₹{loyaltySummary.current_value_in_rupees?.toFixed(2)}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                        <Coins className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    {maxRedeemablePoints > 0 && loyaltySummary.current_balance >= (loyaltySummary.min_redeem_points || 100) ? (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Redeem Points (Min: {loyaltySummary.min_redeem_points})</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min={loyaltySummary.min_redeem_points || 100}
                            max={maxRedeemablePoints}
                            value={pointsToRedeem}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const minPoints = loyaltySummary.min_redeem_points || 100;
                              if (val === 0) { setPointsToRedeem(''); return; }
                              if (val < minPoints) { setPointsToRedeem(minPoints); return; }
                              if (val > maxRedeemablePoints) { setPointsToRedeem(maxRedeemablePoints); return; }
                              setPointsToRedeem(val);
                            }}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const minPoints = loyaltySummary.min_redeem_points || 100;
                              if (val > 0 && val < minPoints) { setPointsToRedeem(minPoints); }
                              else if (val === 0) { setPointsToRedeem(''); }
                            }}
                            placeholder="Enter points to redeem"
                            className="flex-1 h-9"
                            disabled={loyaltySummary.current_balance < (loyaltySummary.min_redeem_points || 100)}
                          />
                          <Button type="button" variant="outline" size="sm" onClick={() => setPointsToRedeem(maxRedeemablePoints)} disabled={maxRedeemablePoints === 0}>Max</Button>
                          {pointsToRedeem > 0 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setPointsToRedeem('')}>Clear</Button>
                          )}
                        </div>
                        {pointsToRedeem > 0 && (
                          <p className="text-xs text-green-600 font-semibold">−₹{(pointsToRedeem || 0).toFixed(2)} discount applied</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {loyaltySummary.current_balance < (loyaltySummary.min_redeem_points || 100)
                          ? `Minimum ${loyaltySummary.min_redeem_points || 100} pts required. Customer has ${loyaltySummary.current_balance} pts.`
                          : 'Max redeemable points (50% of order) is 0 for this amount.'}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-1">No loyalty points available</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary */}
          <div className="space-y-4">
            <div className="lg:sticky lg:top-4 rounded-xl border bg-card overflow-hidden">
              <div className="bg-gradient-to-r from-primary/90 to-primary px-4 py-3">
                <p className="text-white font-bold text-sm tracking-wide">Order Summary</p>
              </div>
              <div className="p-4 space-y-3">
                {packageItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Packages</p>
                    {packageItems.map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.package_name || 'Package'}</p>
                          {item.vehicle_type && <p className="text-[10px] text-muted-foreground capitalize">{item.vehicle_type} · qty {item.quantity}</p>}
                        </div>
                        <span className="font-semibold shrink-0">₹{calculateLineTotal(item).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {addonItems.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add-ons</p>
                    {addonItems.map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.addon_name || 'Add-on'}</p>
                          {item.quantity > 1 && <p className="text-[10px] text-muted-foreground">qty {item.quantity}</p>}
                        </div>
                        <span className="font-semibold shrink-0">₹{calculateLineTotal(item).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Packages</span><span>₹{totals.packages.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Add-ons</span><span>₹{totals.addons.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span>
                  </div>

                  {totals.offerDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1.5">
                          <Gift className="h-3.5 w-3.5" />
                          {selectedOffer?.name ? selectedOffer.name.slice(0, 18) + (selectedOffer.name.length > 18 ? '…' : '') : 'Offer'}
                        </span>
                        <span className="font-semibold">−₹{totals.offerDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>After Offer</span><span>₹{totals.subtotalAfterDiscount.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {totals.pointsDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-blue-600">
                        <span className="flex items-center gap-1.5">
                          <Coins className="h-3.5 w-3.5" />
                          Points ({pointsToRedeem} pts)
                        </span>
                        <span className="font-semibold">−₹{totals.pointsDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>After Points</span><span>₹{totals.subtotalAfterPointsDiscount.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-muted-foreground">
                    <span>GST ({totals.gstPercentage}%)</span><span>₹{totals.gst.toFixed(2)}</span>
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

                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="font-bold text-base">Grand Total</span>
                  <span className="text-2xl font-black text-primary">₹{totals.total.toFixed(0)}</span>
                </div>

                {selectedOffer && (
                  <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <Gift className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    <span className="text-green-800 font-medium truncate">{selectedOffer.name}</span>
                    {isCouponVerified && <span className="shrink-0 text-green-600 font-bold">✓ Coupon</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-4 px-2">
      {[1, 2, 3, 4, 5].map((step) => (
        <div key={step} className="flex items-center flex-1">
          <div className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full border-2 text-xs md:text-sm font-medium transition-colors ${step === currentStep
            ? 'border-primary bg-primary text-primary-foreground'
            : step < currentStep
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30 bg-background text-muted-foreground'
            }`}>
            {step < currentStep ? <Check className="h-4 w-4" /> : step}
          </div>
          {step < 5 && (
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
                Step {currentStep} of 5
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

          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between pb-4 border-b mb-4">
            <div>
              <h2 className="text-2xl font-bold">
                {orderId ? 'Edit Order' : 'Create New Order'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Step {currentStep} of 5
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

          <div className="flex-1 overflow-y-auto p-4 md:p-0">
            <div className="space-y-6 px-1">
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

          {/* Vehicle Identifier Dialog/Drawer */}
          <VehicleIdentifier
            open={identifyDialog.open}
            onOpenChange={(open) => setIdentifyDialog({ open, index: open ? identifyDialog.index : null })}
            onApply={(type, brand, model) => {
              if (identifyDialog.index !== null) {
                updatePackageItem(identifyDialog.index, 'brand', brand);
                updatePackageItem(identifyDialog.index, 'model', model);
                updatePackageItem(identifyDialog.index, 'vehicle_type', type);
              }
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
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted my-2" />
              <DrawerHeader className="text-left px-4">
                <DrawerTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Available Coupons
                </DrawerTitle>
                <DrawerDescription>
                  Active promo coupons linked to {selectedCustomer?.name || 'this customer'}
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-8 overflow-y-auto max-h-[60vh]">
                {renderCustomerCouponsList()}
              </div>
            </DrawerContent>
          </Drawer>

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
