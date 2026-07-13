import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import CustomerContact from '../components/CustomerContact';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '../components/ui/drawer';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../components/ui/popover';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { DatePicker } from '../components/ui/date-picker';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import orderService from '../services/orderService';
import OrderWizard from '../components/OrderWizard';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  CANCELLATION_REASONS,
  getStatusColor,
  getStatusLabel,
} from '../lib/constants';
import {
  ArrowLeft,
  Edit,
  Ban,
  Loader2,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Package,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Mail,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
  Car,
  ExternalLink,
  Copy,
  MoreVertical,
  Star,
  Calendar1Icon,
  Repeat,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  X as XIcon,
  ChevronLeft,
  Paperclip,
  AlertTriangle,
  CalendarClock,
  BadgePlus,
  BadgePercent,
  Plus,
} from 'lucide-react';
import MapPreview from '@/components/MapPreview';
import VehicleIcon from '../components/VehicleIcon';
import { formatDate, formatDateTime, formatTime, formatCurrency, reverseGeocode } from '../lib/utilities';
import { Badge2 } from '@/components/ui/badge2';
import LetterAvatar from '@/components/LetterAvatar';
import useOrderStore from '../store/orderStore';
import ablyClient from '../services/ablyClient';

/**
 * Order Detail Page
 * Shows comprehensive order information with tabs for overview, items, timeline, reassignments
 * Real-time updates via Ably WebSocket for live order changes
 */
const OrderDetail = ({ orderId, onClose, onUpdate }) => {
  // Use orderId prop instead of route params, but keep useParams as fallback for direct route access
  const routeParams = useParams();
  const id = orderId || routeParams.id;
  const navigate = useNavigate();

  // Get agents from store
  const { agents, fetchAgents } = useOrderStore();

  // Tabs state
  const [activeTab, setActiveTab] = useState('packages');
  const tabsList = ['packages', 'images', 'timeline', 'reassignments'];

  // Add Location states
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [mapLink, setMapLink] = useState('');
  const [detectedArea, setDetectedArea] = useState('');
  const [detectedCity, setDetectedCity] = useState('');
  const [reverseGeocodingLoading, setReverseGeocodingLoading] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState(null);

  // Debounced reverse geocoding on mapLink input change
  useEffect(() => {
    if (!mapLink || mapLink.trim() === '') {
      setDetectedArea('');
      setDetectedCity('');
      setGeocodedAddress(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setReverseGeocodingLoading(true);
      try {
        const addressDetails = await reverseGeocode(mapLink);
        if (addressDetails) {
          setDetectedArea(addressDetails.area || '');
          setDetectedCity(addressDetails.city || '');
          setGeocodedAddress(addressDetails);
          toast.success('Location details identified successfully!');
        }
      } catch (error) {
        toast.error('Failed to parse location from map link.');
      } finally {
        setReverseGeocodingLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [mapLink]);

  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageType, setCurrentImageType] = useState(null); // 'before', 'after', 'payment_proof', 'google_review'
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Swipe logic for tabs
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const minSwipeDistance = 45;

  const onTouchStart = (e) => {
    setTouchEnd({ x: 0, y: 0 });
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart.x || !touchEnd.x) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;

    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
      const isLeftSwipe = distanceX > 0;
      const isRightSwipe = distanceX < 0;
      const currentIndex = tabsList.indexOf(activeTab);

      if (isLeftSwipe && currentIndex < tabsList.length - 1) {
        setActiveTab(tabsList[currentIndex + 1]);
        if (window.navigator?.vibrate) window.navigator.vibrate(10);
      } else if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabsList[currentIndex - 1]);
        if (window.navigator?.vibrate) window.navigator.vibrate(10);
      }
    }
  };

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [reassignments, setReassignments] = useState([]);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Edit wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Cancel dialog state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Status change confirmation dialog
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  // Record payment dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [recordPaymentMethod, setRecordPaymentMethod] = useState('');
  const [recordPaymentVerified, setRecordPaymentVerified] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Quick booking edit dialog state
  const [isBookingEditOpen, setIsBookingEditOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTimeFrom, setBookingTimeFrom] = useState('');
  const [bookingTimeTo, setBookingTimeTo] = useState('');
  const [updatingBooking, setUpdatingBooking] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Ref for scrolling to assigned agent section
  const assignedAgentRef = useRef(null);

  // Track screen size for responsive drawer/dialog
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reassign agent dialog state
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [newAgentId, setNewAgentId] = useState(null);
  const [reassigning, setReassigning] = useState(false);

  // Feedback dialog state
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Feedback comments view dialog
  const [isFeedbackViewOpen, setIsFeedbackViewOpen] = useState(false);

  // Helper: Generate time options in 30-minute intervals (6 AM to 8:30 PM)
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

  // Helper: Extract time in HH:MM format from datetime string
  const extractTimeFromDateTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return '';
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        hourCycle: 'h23',
        timeZone: 'Asia/Kolkata'
      });
      return formatter.format(date);
    } catch {
      return '';
    }
  };

  // Fetch order details - prioritize main order data
  useEffect(() => {
    if (id) {
      // Load main order data first (blocks UI until loaded)
      fetchOrderDetails();

      // Load secondary data in background (non-blocking)
      // These run independently and don't affect the loading state

    }
  }, [id]);

  // Subscribe to real-time updates for this specific order
  useEffect(() => {
    if (!id) return;

    // Subscribe to this specific order's channel
    ablyClient.subscribeToOrder(id, (eventName, eventData) => {

      // Reload order data when updates come in
      fetchOrderDetails(true); // true = should call onUpdate callback
    });

    // Cleanup subscription when component unmounts or orderId changes
    return () => {
      ablyClient.unsubscribe(`orders:${id}`);
    };
  }, [id]); // Re-subscribe if orderId changes

  const fetchOrderDetails = async (shouldCallUpdate = false) => {
    if (!order) {
      setLoading(true);
    }
    try {
      const data = await orderService.getOrderById(id);
      setOrder(data.order);
      setNoteText(data.notes || '');
      setTimeout(() => {
        fetchTimeline();
        fetchReassignments();
        // Only fetch agents if not already loaded in store
        if (agents.length === 0) {
          fetchAgents();
        }
      }, 10);
      // If this is called after an update, notify parent with the updated order
      if (shouldCallUpdate && onUpdate) {
        onUpdate(data.order);
      }

    } catch (error) {
      toast.error('Failed to load order details');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!geocodedAddress) {
      toast.error('No valid location resolved yet. Please enter a valid map link.');
      return;
    }

    try {
      setLoading(true);
      await orderService.updateOrder(id, {
        area: geocodedAddress.area,
        city: geocodedAddress.city,
        district: geocodedAddress.district,
        state: geocodedAddress.state,
        map_link: mapLink,
        latitude: geocodedAddress.latitude,
        longitude: geocodedAddress.longitude,
      });
      toast.success('Location attached to order successfully');
      setIsAddLocationOpen(false);
      setMapLink('');
      setDetectedArea('');
      setDetectedCity('');
      setGeocodedAddress(null);
      await fetchOrderDetails(true);
    } catch (error) {
      toast.error('Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const data = await orderService.getOrderTimeline(id);
      setTimeline(data.timeline || []);
    } catch (error) {
      // Silently fail - this is background data
    }
  };

  const fetchReassignments = async () => {
    try {
      const data = await orderService.getOrderReassignments(id);
      setReassignments(data.reassignments || []);
    } catch (error) {
      // Silently fail - this is background data
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    // Validate assignee for in_progress and completed status
    if ((newStatus === 'in_progress' || newStatus === 'completed') && !order?.assigned_to) {
      toast.error('Please assign an agent before changing status to ' + (newStatus === 'in_progress' ? 'In Progress' : 'Completed'));
      return;
    }

    // If changing to completed, show confirmation dialog
    if (newStatus === 'completed') {
      setPendingStatus(newStatus);
      setPaymentReceived(false); // Reset checkbox
      setIsStatusConfirmOpen(true);
      return;
    }

    // For in_progress, change directly
    await performStatusChange(newStatus);
  };

  // Perform the actual status change
  const performStatusChange = async (newStatus) => {
    if (newStatus === 'completed' && !paymentMethod) {
      toast.error('Payment method is mandatory');
      return;
    }

    setChangingStatus(true);
    try {
      await orderService.updateOrderStatus(id, newStatus, newStatus === 'completed' ? paymentMethod : '');
      toast.success('Status updated successfully');
      await fetchOrderDetails(true); // Pass true to trigger onUpdate
      // Fetch timeline in background without blocking
      setTimeout(() => fetchTimeline(), 0);
      setIsStatusConfirmOpen(false);
      setPaymentReceived(false); // Reset checkbox
      setPaymentMethod(''); // Reset payment method
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setChangingStatus(false);
    }
  };

  // Open booking edit dialog with current values
  const handleOpenBookingEdit = () => {
    setBookingDate(order?.booking_date || '');
    setBookingTimeFrom(extractTimeFromDateTime(order?.booking_time_from));
    setBookingTimeTo(extractTimeFromDateTime(order?.booking_time_to));
    setIsBookingEditOpen(true);
  };

  // Save booking changes
  const handleSaveBooking = async () => {
    // Validate booking fields
    if (!bookingDate) {
      toast.error('Please select a booking date');
      return;
    }
    if (!bookingTimeFrom) {
      toast.error('Please select start time');
      return;
    }
    if (!bookingTimeTo) {
      toast.error('Please select end time');
      return;
    }

    setUpdatingBooking(true);
    try {
      // Convert to ISO format for API
      const bookingDateISO = new Date(bookingDate).toISOString().split('T')[0];
      const bookingTimeFromISO = bookingTimeFrom ? `${bookingDateISO}T${bookingTimeFrom}:00+05:30` : null;
      const bookingTimeToISO = bookingTimeTo ? `${bookingDateISO}T${bookingTimeTo}:00+05:30` : null;

      await orderService.updateOrder(id, {
        booking_date: bookingDateISO,
        booking_time_from: bookingTimeFromISO,
        booking_time_to: bookingTimeToISO,
      });

      toast.success('Booking time updated successfully');
      setIsBookingEditOpen(false);
      await fetchOrderDetails(true);
      setTimeout(() => fetchTimeline(), 0);
    } catch (error) {
      toast.error('Failed to update booking time');
    } finally {
      setUpdatingBooking(false);
    }
  };

  // Handle cancel
  const handleCancelOrder = async () => {
    const reason = cancelReason === 'Other' ? customReason : cancelReason;

    if (!reason) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    setCancelling(true);
    try {
      await orderService.cancelOrder(id, reason);
      toast.success('Order cancelled successfully');
      setIsCancelDialogOpen(false);
      await fetchOrderDetails(true); // Pass true to trigger onUpdate
      // Fetch timeline in background without blocking
      setTimeout(() => fetchTimeline(), 0);
    } catch (error) {
      toast.error('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  // Calculate subtotal from packages and addons
  const calculateSubtotal = () => {
    const packagesTotal = order.packages?.reduce((sum, item) => {
      const price = parseFloat(item.total_price) || 0;
      return sum + price;
    }, 0) || 0;
    const addonsTotal = order.addons?.reduce((sum, item) => {
      const price = parseFloat(item.total_price) || 0;
      return sum + price;
    }, 0) || 0;
    return packagesTotal + addonsTotal;
  };

  // Get Badge2 variant
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

    return variantMap[color] || 'default';
  };

  // Handle reassign agent
  const handleReassignAgent = (selectedAgentId) => {
    setNewAgentId(selectedAgentId);
    setIsReassignDialogOpen(true);
  };

  // Confirm reassign agent
  const confirmReassignAgent = async () => {
    if (!newAgentId) return;

    setReassigning(true);
    try {
      const agentIdToSend = newAgentId === 'unassigned' ? null : parseInt(newAgentId, 10);
      await orderService.reassignOrder(id, agentIdToSend);
      // toast.success(newAgentId === 'unassigned' ? 'Agent unassigned successfully' : 'Agent reassigned successfully');
      setIsReassignDialogOpen(false);
      await fetchOrderDetails(true); // Pass true to trigger onUpdate
      // Fetch timeline and reassignments in background without blocking
      setTimeout(() => {
        fetchTimeline();
        fetchReassignments();
      }, 0);
    } catch (error) {
      const errorMessage = error.response?.data?.errors.join('\n') || 'Failed to reassign agent';
      toast.error(errorMessage);
    } finally {
      setReassigning(false);
    }
  };

  // Handle save note
  const handleSaveNote = async () => {
    try {
      await orderService.updateOrderNote(id, noteText);
      toast.success('Note updated successfully');
      setEditingNote(false);
      await fetchOrderDetails(true); // Pass true to trigger onUpdate
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  // Handle feedback submission
  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await orderService.submitOrderFeedback(id, {
        rating: feedbackRating,
        comments: feedbackComment
      });
      toast.success('Feedback submitted successfully');
      setIsFeedbackDialogOpen(false);
      setFeedbackRating(0);
      setFeedbackComment('');
      await fetchOrderDetails(true); // Pass true to trigger onUpdate
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Handle record payment
  const handleRecordPayment = async () => {
    if (!recordPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (!recordPaymentVerified) {
      toast.error('Please confirm the amount has been verified');
      return;
    }

    setRecordingPayment(true);
    try {
      await orderService.updatePaymentStatus(id, recordPaymentMethod, recordPaymentVerified);
      toast.success('Payment recorded successfully');
      setIsPaymentDialogOpen(false);
      setRecordPaymentMethod('');
      setRecordPaymentVerified(false);
      await fetchOrderDetails(true);
      setTimeout(() => fetchTimeline(), 0);
    } catch (error) {
      console.log(error)
      toast.error(error.response?.data?.errors?.join('\n') || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const isInitialLoading = !order || (loading && String(order.id) !== String(id));

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header Skeleton */}
        <div className="border-b sticky top-0 z-10 bg-white">
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Meta Info */}
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>

              {/* Tabs Skeleton */}
              <div className="space-y-4">
                <div className="flex gap-2 border-b">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>

                {/* Content Area */}
                <div className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Customer Info Card */}
              <div className="border rounded-lg p-4 space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Order Summary Card */}
              <div className="border rounded-lg p-4 space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Card */}
              <div className="border rounded-lg p-4 space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 text-center">
        <p>Order not found</p>
        <Link to="/orders">
          <Button className="mt-4">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const isEditable = order.status !== 'completed' && order.status !== 'cancelled';

  // Get order status progress
  const getOrderProgress = () => {
    const statusOrder = ['draft', 'confirmed', 'in_progress', 'completed'];
    const currentIndex = statusOrder.indexOf(order.status);
    return statusOrder.map((status, index) => ({
      status,
      label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      completed: index <= currentIndex,
      active: status === order.status,
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b sticky top-0 z-30 bg-white">
        <div className="px-4 sm:px-6">
          <div className="flex flex-col py-2 sm:h-16 justify-center">
            {/* Top Row: Navigation and Actions */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onClose ? onClose() : navigate(-1)}
                  className="rounded-full flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl sm:text-2xl font-semibold truncate">#{order.order_number}</h1>
                <Badge2 variant={getBadgeVariant(order.status, 'order')} className="text-[10px] sm:text-xs">
                  {getStatusLabel(order.status, ORDER_STATUSES)}
                </Badge2>

                {order.subscription_id && (
                  <Badge2
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80 text-[10px] sm:text-xs h-5 sm:h-6 px-1.5"
                    onClick={() => navigate(`/subscriptions/${order.subscription_id}`)}
                  >
                    <Repeat className="h-3 w-3" />
                    Sub
                  </Badge2>
                )}
              </div>

              {isEditable && (
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isEditable && (
                        <>
                          <DropdownMenuItem onClick={() => setIsWizardOpen(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Order
                          </DropdownMenuItem>

                          {order.status === 'confirmed' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange('in_progress')}
                              disabled={!order?.assigned_to}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Mark as In Progress
                            </DropdownMenuItem>
                          )}

                          {(order.status === 'confirmed' || order.status === 'in_progress') && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange('completed')}
                              disabled={!order?.assigned_to}
                              className="text-green-600 focus:text-green-600"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Mark as Completed
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => setIsCancelDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Cancel Order
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Bottom Row: Badges and Ratings (Mobile mostly) */}
            <div className="flex items-center gap-2 sm:mt-0 px-1 sm:px-0 flex-wrap sm:ml-12">


              {/* Star Rating Display */}
              {order.rating && (
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${star <= order.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-medium text-yellow-700">
                    {order.rating}
                  </span>
                  {order.feedback_comments && (
                    <button
                      onClick={() => setIsFeedbackViewOpen(true)}
                      className="ml-1 text-blue-600 hover:text-blue-700 transition-colors"
                      title="View feedback comments"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unassigned Alert */}
      {!order.assigned_to && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-1">Order Unassigned</h3>
              <p className="text-sm text-yellow-800">
                This order has not been assigned to any agent yet. Please assign an agent to proceed with the order.
              </p>
              {isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    assignedAgentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="mt-3 bg-white hover:bg-yellow-100 text-yellow-900 border-yellow-300"
                >
                  Assign Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Meta Strip */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground bg-gray-50 border rounded-xl px-4 py-2.5">
              <span>Ordered <span className="font-semibold text-foreground">{formatDate(order.created_at)}</span></span>
              <span className="text-gray-300">•</span>
              <span>Customer <span className="font-semibold text-foreground">{order.customer?.name}</span></span>
              {order.converted_from_enquiry_id && (
                <>
                  <span className="text-gray-300">•</span>
                  <Link
                    to={`/enquiries/${order.converted_from_enquiry_id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    Enquiry #{order.converted_from_enquiry_id}
                  </Link>
                </>
              )}
              {order.source && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>Via <span className="font-semibold text-foreground">{order.source}</span></span>
                </>
              )}
              {order.subscription_id && (
                <>
                  <span className="text-gray-300">•</span>
                  <button
                    onClick={() => navigate(`/subscriptions/${order.subscription_id}`)}
                    className="font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Monthly Subscription
                  </button>
                </>
              )}
            </div>

            {/* Service Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location Card */}
              <div className="bg-white border rounded-xl p-4 shadow-xs flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-full flex-shrink-0 text-primary">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground opacity-70 block mb-1">
                    Service Location
                  </span>
                  {(!order.address || (!order.address.area && !order.address.city && !order.address.map_link)) ? (
                    <div className="mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-primary border-primary/30 hover:bg-primary/5 cursor-pointer"
                        onClick={() => setIsAddLocationOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Location
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold capitalize text-foreground leading-tight truncate">
                        {order.address.area || 'N/A'}, {order.address.city || 'N/A'}
                      </p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {order.address.map_link && (
                          <a
                            href={order.address.map_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-md transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" /> View Map
                          </a>
                        )}
                        {isEditable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary gap-1"
                            onClick={() => setIsAddLocationOpen(true)}
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Scheduled Time Card */}
              <div className="bg-white border rounded-xl p-4 shadow-xs flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-full flex-shrink-0 text-blue-600">
                  <Calendar1Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground opacity-70 block mb-1">
                        Scheduled Time
                      </span>
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {formatDate(order.booking_date)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {formatTime(order.booking_time_from)} - {formatTime(order.booking_time_to)}
                      </p>
                    </div>
                    {isEditable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenBookingEdit}
                        className="h-8 text-xs font-semibold px-2 gap-1 text-primary border-primary/20 hover:bg-primary/5 cursor-pointer flex-shrink-0"
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>Reschedule</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {/* <div className="flex items-center gap-2 mb-4">
                {['Order Confirmed', 'In Progress', 'Completed'].map((stage, index) => {
                  // Map stages to order statuses
                  const stageStatusMap = ['confirmed', 'in_progress', 'completed'];
                  const currentStatusIndex = stageStatusMap.indexOf(order.status);
                  const isCompleted = index < currentStatusIndex;
                  const isActive = index === currentStatusIndex;
                  const isCancelled = order.status === 'cancelled';

                  return (
                    <div key={stage} className="flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`text-xs mb-1 ${isActive && !isCancelled ? 'font-semibold text-foreground' :
                          isCompleted && !isCancelled ? 'font-medium text-foreground' :
                            'text-muted-foreground'
                          }`}>
                          {stage}
                        </div>
                        <div className={`w-full h-1 rounded-full ${isCancelled ? 'bg-red-200' :
                          isActive ? 'bg-foreground' :
                            isCompleted ? 'bg-green-500' :
                              'bg-gray-200'
                          }`} />
                      </div>
                    </div>
                  );
                })}
              </div> */}

            {/* Action Buttons */}
            {(isEditable || (order.status === 'completed' && !order.feedback_submitted_at)) && (
              <div className="flex flex-row gap-2.5">
                {isEditable && (
                  <>
                    {order.status === 'draft' && (
                      <Button
                        variant="success"
                        onClick={() => handleStatusChange('confirmed')}
                        className="flex-1 gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Order
                      </Button>
                    )}
                    {(order.status === 'confirmed' || order.status === 'in_progress') && (
                      <Button
                        variant="success"
                        onClick={() => handleStatusChange('completed')}
                        className="flex-1 gap-1.5"
                        disabled={!order?.assigned_to}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Complete Order
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => setIsCancelDialogOpen(true)}
                      className="flex-1 gap-1.5"
                    >
                      <Ban className="h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                )}
                {order.status === 'completed' && !order.feedback_submitted_at && (
                  <Button
                    onClick={() => setIsFeedbackDialogOpen(true)}
                    className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Add Feedback
                  </Button>
                )}
              </div>
            )}

            {/* Swipable Tabs Section */}
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className="touch-pan-y" // Allow vertical scrolling while swiping
            >
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-6 border rounded-xl p-4 bg-white shadow-xs"
              >
                <TabsList className="flex w-full overflow-x-auto no-scrollbar bg-gray-100 p-1 rounded-lg h-10 gap-1">
                  <TabsTrigger
                    value="packages"
                    className="rounded-md py-1 text-sm font-semibold capitalize transition-all cursor-pointer data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center justify-center gap-1 sm:gap-1.5 flex-1 min-w-[115px] sm:min-w-0 flex-shrink-0 whitespace-nowrap"
                  >
                    <span className="truncate">Packages</span>
                    <Badge2 variant="secondary" className="px-1.5 py-0.5 text-[9px] sm:text-[10px] leading-none rounded-full flex-shrink-0">
                      {(order.packages?.length || 0) + (order.addons?.length || 0)}
                    </Badge2>
                  </TabsTrigger>
                  <TabsTrigger
                    value="images"
                    className="rounded-md py-1 text-sm font-semibold capitalize transition-all cursor-pointer data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center justify-center gap-1 sm:gap-1.5 flex-1 min-w-[115px] sm:min-w-0 flex-shrink-0 whitespace-nowrap"
                  >
                    <span className="truncate">Images</span>
                    <Badge2 variant="secondary" className="px-1.5 py-0.5 text-[9px] sm:text-[10px] leading-none rounded-full flex-shrink-0">
                      {(order.image_urls?.before_images?.length || 0) + (order.image_urls?.after_images?.length || 0)}
                    </Badge2>
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    className="rounded-md py-1 text-sm font-semibold capitalize transition-all cursor-pointer data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center justify-center gap-1 sm:gap-1.5 flex-1 min-w-[115px] sm:min-w-0 flex-shrink-0 whitespace-nowrap"
                  >
                    <span className="truncate">Timeline</span>
                    <Badge2 variant="secondary" className="px-1.5 py-0.5 text-[9px] sm:text-[10px] leading-none rounded-full flex-shrink-0">
                      {timeline?.length || 0}
                    </Badge2>
                  </TabsTrigger>
                  <TabsTrigger
                    value="reassignments"
                    className="rounded-md py-1 text-sm font-semibold capitalize transition-all cursor-pointer data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center justify-center gap-1 sm:gap-1.5 flex-1 min-w-[115px] sm:min-w-0 flex-shrink-0 whitespace-nowrap"
                  >
                    <span className="truncate">Assignments</span>
                    <Badge2 variant="secondary" className="px-1.5 py-0.5 text-[9px] sm:text-[10px] leading-none rounded-full flex-shrink-0">
                      {reassignments?.length || 0}
                    </Badge2>
                  </TabsTrigger>
                </TabsList>

                {/* Packages Tab */}
                <TabsContent value="packages" className="space-y-6 mt-6 px-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-right-4 data-[state=active]:duration-300 data-[state=active]:ease-out">
                  {/* Packages */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Service Packages</h3>
                      <Badge2 variant="outline" className="text-xs">{order.packages?.length || 0} items</Badge2>
                    </div>
                    <div className="space-y-3">
                      {order.packages && order.packages.length > 0 ? (
                        order.packages.map((item, index) => (
                          <div key={index} className="flex gap-3 p-3 rounded-xl border bg-white hover:bg-gray-50/50 transition-colors">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100">
                              <VehicleIcon vehicleType={item.vehicle_type} size={28} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm leading-tight">{item.package_name}</h4>
                                <div className="text-right flex-shrink-0">
                                  <div className="font-bold text-base">{formatCurrency(item.total_price)}</div>
                                  {item.discount > 0 && (
                                    <span className="text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 rounded-full px-1.5 py-0.5">
                                      -{formatCurrency(item.price - item.total_price)} off
                                    </span>
                                  )}
                                </div>
                              </div>
                              {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                                <span className="text-xs capitalize bg-secondary px-2 py-0.5 rounded-full font-medium">{item.vehicle_type}</span>
                                {item.brand && item.model && (
                                  <span className="text-xs text-muted-foreground">{item.brand} {item.model}</span>
                                )}
                                <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                              </div>
                              {item.notes && <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No packages added</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add-ons */}
                  {order.addons && order.addons.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">Add-on Services</h3>
                        <Badge2 variant="secondary" className="text-xs">{order.addons.length} items</Badge2>
                      </div>
                      <div className="space-y-3">
                        {order.addons.map((item, index) => (
                          <div key={index} className="flex gap-3 p-3 rounded-xl border bg-white hover:bg-gray-50/50 transition-colors">
                            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-green-100">
                              <BadgePlus size={22} className="text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm capitalize leading-tight">{item.addon_name}</h4>
                                <div className="text-right flex-shrink-0">
                                  <div className="font-bold text-base">{formatCurrency(item.total_price)}</div>
                                  {item.discount > 0 && (
                                    <span className="text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 rounded-full px-1.5 py-0.5">
                                      -{formatCurrency(item.price - item.total_price)} off
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground mt-1 block">Qty: {item.quantity}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images" className="space-y-6 mt-6 px-2 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-right-4 data-[state=active]:duration-300 data-[state=active]:ease-out">
                  {/* Before Images */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Before Images</h3>
                      <Badge2 variant="outline" className="text-xs">
                        {order.image_urls?.before_images?.length || 0} images
                      </Badge2>
                    </div>
                    {order.image_urls?.before_images && order.image_urls.before_images.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {order.image_urls.before_images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setCurrentImageType('before');
                              setCurrentImageIndex(index);
                              setImageViewerOpen(true);
                              setImageZoom(1);
                              setImagePosition({ x: 0, y: 0 });
                            }}
                            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-colors group cursor-pointer"
                          >
                            <img
                              src={image}
                              alt={`Before ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No before images</p>
                      </div>
                    )}
                  </div>

                  {/* After Images */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">After Images</h3>
                      <Badge2 variant="outline" className="text-xs">
                        {order.image_urls?.after_images?.length || 0} images
                      </Badge2>
                    </div>
                    {order.image_urls?.after_images && order.image_urls.after_images.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {order.image_urls.after_images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setCurrentImageType('after');
                              setCurrentImageIndex(index);
                              setImageViewerOpen(true);
                              setImageZoom(1);
                              setImagePosition({ x: 0, y: 0 });
                            }}
                            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-colors group cursor-pointer"
                          >
                            <img
                              src={image}
                              alt={`After ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No after images</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="mt-6 px-2 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-right-4 data-[state=active]:duration-300 data-[state=active]:ease-out">
                  <div className="space-y-2">
                    {timeline.length > 0 ? (
                      timeline.map((event, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-5 h-5 text-muted-foreground rounded-full flex items-center justify-center flex-shrink-0 ">
                              {event.type === 'status_changed' ? (
                                <CheckCircle2 size={14} />
                              ) : event.type === 'cancelled' ? (
                                <XCircle size={14} />
                              ) : (
                                <Clock size={14} />
                              )}
                            </div>
                            {index < timeline.length - 1 && (
                              <div className="w-0.5 flex-1 bg-gray-200 mt-2" style={{ minHeight: '1rem' }} />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="text-sm mb-1">{event.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(event.changed_at)}
                              {` • by ${event.changed_by || event.assigned_by}`}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No timeline events yet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Reassignments Tab */}
                <TabsContent value="reassignments" className="mt-6 px-2 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-right-4 data-[state=active]:duration-300 data-[state=active]:ease-out">
                  <div className="space-y-2">
                    {reassignments.length > 0 ? (
                      reassignments.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 py-2 border-b last:border-0">
                          <LetterAvatar name={item.assigned_to} size="sm" className="text-white" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{item.assigned_to}</span>
                              {item.assigned_to === order.assigned_to?.name && (
                                <Badge2 variant="default" className="text-[10px] h-5 px-1.5">
                                  Current
                                </Badge2>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Assigned by {item.assigned_by}
                            </div>
                            {item.notes && (
                              <div className="text-sm text-muted-foreground mt-2 p-3 bg-gray-50 rounded-lg">
                                {item.notes}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-2">
                              {formatDateTime(item.assigned_at)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No reassignments yet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

              </Tabs>
            </div>

            {order.offer && <div className="p-4 border flex  items-center gap-2 rounded-lg bg-green-50">
              <BadgePercent className='text-green-600' />
              <span className="text-sm text-green-700">{order.offer.name} applied
              </span>
            </div>
            }

            <div className="rounded-xl border bg-white shadow-xs overflow-hidden">
              {/* Payment Details */}
              <div>
                <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gray-50/60">
                  <h3 className="font-semibold text-base">Payment Details</h3>
                  <div className="flex items-center gap-2">
                    {order.payment_method && (
                      <Badge2 variant="outline" className="text-xs uppercase">
                        {order.payment_method.replace('_', ' ')}
                      </Badge2>
                    )}
                    <Badge2 variant={getBadgeVariant(order.payment_status, 'payment')}>
                      {getStatusLabel(order.payment_status, PAYMENT_STATUSES)}
                    </Badge2>
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal ({(order.packages?.length || 0) + (order.addons?.length || 0)} items)
                    </span>
                    <span className="font-medium">
                      {formatCurrency(order.subtotal_amount || calculateSubtotal())}
                    </span>
                  </div>

                  {/* Legacy discount field (old orders) */}
                  {order.discount > 0 && !order.offer_discount && !order.points_discount && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Discount</span>
                      <span>-{formatCurrency(order.discount)}</span>
                    </div>
                  )}

                  {/* Offer discount with offer details */}
                  {order.offer_discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <div className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>
                          {order.offer ? `${order.offer.name} Discount` : 'Offer Discount'}
                        </span>
                      </div>
                      <span className="font-medium">-{formatCurrency(order.offer_discount)}</span>
                    </div>
                  )}

                  {/* Points discount */}
                  {(order.points_discount > 0 || order.points_redeemed > 0) && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <div className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Points Redeemed ({order.points_redeemed || 0} pts)
                        </span>
                      </div>
                      <span className="font-medium">-{formatCurrency(order.points_discount || order.points_redeemed || 0)}</span>
                    </div>
                  )}

                  {order.gst_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        GST {order.gst_percentage ? `(${order.gst_percentage}%)` : ''}
                      </span>
                      <span className="font-medium">{formatCurrency(order.gst_amount)}</span>
                    </div>
                  )}

                  {order.round_off != null && order.round_off !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Round Off</span>
                      <span className={`font-medium ${order.round_off >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {order.round_off >= 0 ? '+' : ''}{formatCurrency(Math.abs(order.round_off))}
                      </span>
                    </div>
                  )}

                  <div className="border-t pt-3 mt-1 flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold">{formatCurrency(order.total_amount)}</span>
                  </div>

                  {order.payment_status !== 'paid' && (
                    <Button
                      className="w-full mt-2 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setRecordPaymentMethod('');
                        setRecordPaymentVerified(false);
                        setIsPaymentDialogOpen(true);
                      }}
                    >
                      <span className="font-bold text-base">₹</span>
                      Record Payment
                    </Button>
                  )}

                  {/* Payment Proof */}
                  {order.image_urls?.payment_proof && (
                    <div className="pt-3 border-t">
                      <button
                        onClick={() => {
                          setCurrentImageType('payment_proof');
                          setCurrentImageIndex(0);
                          setImageViewerOpen(true);
                          setImageZoom(1);
                          setImagePosition({ x: 0, y: 0 });
                        }}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="underline">Payment Proof Attached</span>
                        <ImageIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>



            {/* Customer Feedback */}
            {(order.rating || order.feedback_comments) && (
              <div className="border rounded-lg">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Customer Feedback</h3>
                </div>

                <div className="p-4 space-y-4">
                  {order.rating && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Rating</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-6 w-6 ${star <= order.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                              }`}
                          />
                        ))}
                        <span className="text-sm text-muted-foreground ml-2">
                          {order.rating} out of 5
                        </span>
                      </div>
                    </div>
                  )}

                  {order.feedback_comments && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Comments</label>
                      <div className="bg-gray-50 rounded-lg p-4 border text-sm text-foreground">
                        {order.feedback_comments}
                      </div>
                    </div>
                  )}

                  {order.feedback_submitted_at && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Submitted on {formatDateTime(order.feedback_submitted_at)}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Assigned Agent */}
            <div ref={assignedAgentRef} className="rounded-xl border bg-white shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50/60 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Assigned Agent</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <LetterAvatar name={order.assigned_to?.name} size="md" className="text-white flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">
                      {
                        order.assigned_to?.name ? <>
                          {order.assigned_to?.name}
                          <Badge2 variant="info" className="mx-2 capitalize">{order.assignee_response}</Badge2></> :
                          <span className="text-muted-foreground italic">Unassigned</span>
                      }
                    </div>
                    {order.assigned_to?.email && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {order.assigned_to.email}
                      </div>
                    )}
                  </div>
                </div>

                {(() => {
                  const currentAgentId = order.assigned_to?.id;
                  const availableAgents = agents.filter(agent => agent.id !== currentAgentId && !agent.locked);
                  const canReassign = !['in_progress', 'completed', 'cancelled'].includes(order.status);

                  return canReassign && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">
                        Reassign to
                      </label>
                      <Select
                        value=""
                        onValueChange={handleReassignAgent}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select agent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {availableAgents.map((agent) => (
                            <SelectItem key={agent.id} value={String(agent.id)}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Customer */}
            <div className="rounded-xl border bg-white shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50/60 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Customer</h3>
                {order.image_urls?.customer_signature && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Badge2
                        variant="success"
                        className="flex items-center gap-1 cursor-pointer select-none py-0.5 px-2 bg-green-100 hover:bg-green-200 text-green-800 border-green-200 rounded-full text-[11px] font-semibold"
                      >
                        Signed
                        <CheckCircle2 className="h-3 w-3 text-green-700" />
                      </Badge2>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 bg-white border shadow-md rounded-lg z-50">
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Customer Signature</div>
                      <div className="bg-gray-50 p-2 rounded border flex items-center justify-center">
                        <img
                          src={order.image_urls.customer_signature}
                          alt="Customer Signature"
                          className="max-h-24 object-contain"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <LetterAvatar name={order.customer?.name} size="md" className="text-white" />
                  <div className="flex-1">
                    <div className="font-medium">{order.customer?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.customer?.phone}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Address */}
              <div>
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold">Service Address</h3>
                </div>
                <div className="p-4">
                  {order.address.latitude && order.address.longitude ? (
                    <div className="mb-4 rounded-sm overflow-hidden border">
                      <MapPreview lat={order.address.latitude} lng={order.address.longitude} />
                    </div>
                  ) : (
                    <div className="mb-4 rounded-lg overflow-hidden bg-gray-50 h-[200px] flex items-center justify-center border">
                      <MapPin className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="space-y-1 text-sm">
                    <div className='flex justify-between items-center'>
                      {order.customer?.name && (
                        <div className="font-medium">{order.customer.name}</div>
                      )}

                      {order.address.map_link && (
                        <a
                          href={order.address.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-sm underline flex items-center gap-1  inline-flex"
                        >
                          View on Map <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {order.full_address ? (
                      <div>{order.full_address}</div>
                    ) : (
                      <div className="text-muted-foreground">No address provided</div>
                    )}
                  </div>

                </div>
              </div>

              {/* Contact Information */}
              <div>
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold">Contact Information</h3>
                </div>
                <div className="p-4 space-y-2">
                  {order.customer?.email && (
                    <Badge2
                      variant="secondary"
                      className="justify-between bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer h-auto py-2 px-3 font-normal group"
                      onClick={() => copyToClipboard(order.customer.email)}
                    >
                      <span>{order.customer.email}</span>
                      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Badge2>
                  )}
                  {order.customer?.phone && (
                    <CustomerContact
                      phone={order.customer.phone}
                      customerName={order.customer.name}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Order Note */}
            <div className="rounded-xl border bg-white shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50/60 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Order Note</h3>
                {isEditable && !editingNote ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    setNoteText(order.notes || '');
                    setEditingNote(true);
                  }}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              <div className="p-4">
                {editingNote ? (
                  <div className="space-y-3">
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add a note..."
                      rows={4}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingNote(false);
                        setNoteText(order.notes || '');
                      }}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveNote}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 border min-h-[64px]">
                    <p className="text-sm font-mono whitespace-pre-wrap text-foreground">
                      {order.notes || <span className="text-muted-foreground italic">No notes added</span>}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Edit Wizard */}
      <OrderWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        orderId={id}
        onSuccess={async () => {
          setIsWizardOpen(false);
          await fetchOrderDetails(true); // Pass true to trigger onUpdate
          // Fetch timeline in background without blocking
          setTimeout(() => fetchTimeline(), 0);
        }}
      />

      {/* Record Payment Dialog - Desktop */}
      <Dialog open={isPaymentDialogOpen && !isMobile} onOpenChange={(open) => {
        setIsPaymentDialogOpen(open);
        if (!open) {
          setRecordPaymentMethod('');
          setRecordPaymentVerified(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Select the payment method and confirm the amount received from the customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Amount Summary */}
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-900">Amount Due:</span>
                <span className="text-xl font-bold text-orange-900">{formatCurrency(order?.total_amount || 0)}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="p-4 border rounded-lg bg-white space-y-3">
              <Label className="text-sm font-semibold text-gray-900 block">
                Payment Method *
              </Label>
              <RadioGroup
                value={recordPaymentMethod}
                onValueChange={setRecordPaymentMethod}
                className="flex gap-4 flex-wrap"
                disabled={recordingPayment}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="cash" id="record-payment-cash" />
                  <Label htmlFor="record-payment-cash" className="text-sm font-medium cursor-pointer select-none">
                    Cash
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="upi" id="record-payment-upi" />
                  <Label htmlFor="record-payment-upi" className="text-sm font-medium cursor-pointer select-none">
                    UPI
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="card" id="record-payment-card" />
                  <Label htmlFor="record-payment-card" className="text-sm font-medium cursor-pointer select-none">
                    Card
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Amount Verification Checkbox */}
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-white">
              <Checkbox
                id="record-amount-verified"
                checked={recordPaymentVerified}
                onCheckedChange={setRecordPaymentVerified}
                disabled={recordingPayment}
              />
              <label
                htmlFor="record-amount-verified"
                className="text-sm font-medium leading-none cursor-pointer select-none"
              >
                I confirm that the payment of {formatCurrency(order?.total_amount || 0)} has been received for this order
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
              disabled={recordingPayment}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={recordingPayment || !recordPaymentMethod || !recordPaymentVerified}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              {recordingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Drawer - Mobile */}
      <Drawer open={isPaymentDialogOpen && isMobile} onOpenChange={(open) => {
        setIsPaymentDialogOpen(open);
        if (!open) {
          setRecordPaymentMethod('');
          setRecordPaymentVerified(false);
        }
      }}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="px-4 text-left">
            <DrawerTitle>Record Payment</DrawerTitle>
            <DrawerDescription>
              Select the payment method and confirm the amount received from the customer.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto">
            {/* Amount Summary */}
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-900">Amount Due:</span>
                <span className="text-xl font-bold text-orange-900">{formatCurrency(order?.total_amount || 0)}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="p-4 border rounded-lg bg-white space-y-3">
              <Label className="text-sm font-semibold text-gray-900 block">
                Payment Method *
              </Label>
              <RadioGroup
                value={recordPaymentMethod}
                onValueChange={setRecordPaymentMethod}
                className="flex gap-4 flex-wrap"
                disabled={recordingPayment}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="cash" id="mobile-record-payment-cash" />
                  <Label htmlFor="mobile-record-payment-cash" className="text-sm font-medium cursor-pointer select-none">
                    Cash
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="upi" id="mobile-record-payment-upi" />
                  <Label htmlFor="mobile-record-payment-upi" className="text-sm font-medium cursor-pointer select-none">
                    UPI
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="card" id="mobile-record-payment-card" />
                  <Label htmlFor="mobile-record-payment-card" className="text-sm font-medium cursor-pointer select-none">
                    Card
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Amount Verification Checkbox */}
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-white">
              <Checkbox
                id="mobile-record-amount-verified"
                checked={recordPaymentVerified}
                onCheckedChange={setRecordPaymentVerified}
                disabled={recordingPayment}
              />
              <label
                htmlFor="mobile-record-amount-verified"
                className="text-sm font-medium leading-none cursor-pointer select-none"
              >
                I confirm that the payment of {formatCurrency(order?.total_amount || 0)} has been received for this order
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
                disabled={recordingPayment}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecordPayment}
                disabled={recordingPayment || !recordPaymentMethod || !recordPaymentVerified}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                {recordingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Payment
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Agent Reassignment Confirmation Dialog */}
      <AlertDialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reassign Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reassign this order?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium">{order?.assigned_to?.name || 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">
                  {newAgentId === 'unassigned' ? 'Unassigned' : agents.find(agent => String(agent.id) === String(newAgentId))?.name || 'Unknown Agent'}
                </span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={reassigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReassignAgent} disabled={reassigning}>
              {reassigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Reassignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog - Desktop */}
      <AlertDialog open={isStatusConfirmOpen && !isMobile} onOpenChange={(open) => {
        setIsStatusConfirmOpen(open);
        if (!open) {
          setPaymentReceived(false);
          setPaymentMethod(''); // Reset payment method when dialog closes
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Order as Completed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this order as completed? This action cannot be undone and will make the order non-editable.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>You will not be able to edit this order after completion</li>
                    <li>This action cannot be reversed</li>
                    <li>The order will be marked as finalized</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Order Amount:</span>
                <span className="text-lg font-bold text-blue-900">{formatCurrency(order?.total_amount || 0)}</span>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-white space-y-3">
              <Label className="text-sm font-semibold text-gray-900 block">
                Payment Method *
              </Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className="flex gap-4"
                disabled={changingStatus}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="cash" id="payment-cash" />
                  <Label htmlFor="payment-cash" className="text-sm font-medium cursor-pointer select-none">
                    Cash
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="upi" id="payment-upi" />
                  <Label htmlFor="payment-upi" className="text-sm font-medium cursor-pointer select-none">
                    UPI
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg bg-white">
              <Checkbox
                id="payment-received"
                checked={paymentReceived}
                onCheckedChange={setPaymentReceived}
                disabled={changingStatus}
              />
              <label
                htmlFor="payment-received"
                className="text-sm font-medium leading-none cursor-pointer select-none"
              >
                I confirm that the payment of {formatCurrency(order?.total_amount || 0)} has been received for this order
              </label>
            </div>


          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={changingStatus}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => performStatusChange(pendingStatus)}
              disabled={changingStatus || !paymentReceived || (pendingStatus === 'completed' && !paymentMethod)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              {changingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Mark as Completed
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Drawer - Mobile */}
      <Drawer open={isStatusConfirmOpen && isMobile} onOpenChange={(open) => {
        setIsStatusConfirmOpen(open);
        if (!open) {
          setPaymentReceived(false);
          setPaymentMethod(''); // Reset payment method when drawer closes
        }
      }}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="px-4 text-left">
            <DrawerTitle>Mark Order as Completed</DrawerTitle>
            <DrawerDescription>
              Are you sure you want to mark this order as completed? This action cannot be undone and will make the order non-editable.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto">
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>You will not be able to edit this order after completion</li>
                    <li>This action cannot be reversed</li>
                    <li>The order will be marked as finalized</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Order Amount:</span>
                <span className="text-lg font-bold text-blue-900">{formatCurrency(order?.total_amount || 0)}</span>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-white space-y-3">
              <Label className="text-sm font-semibold text-gray-900 block">
                Payment Method *
              </Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className="flex gap-4"
                disabled={changingStatus}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="cash" id="mobile-payment-cash" />
                  <Label htmlFor="mobile-payment-cash" className="text-sm font-medium cursor-pointer select-none">
                    Cash
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="upi" id="mobile-payment-upi" />
                  <Label htmlFor="mobile-payment-upi" className="text-sm font-medium cursor-pointer select-none">
                    UPI
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg bg-white">
              <Checkbox
                id="mobile-payment-received"
                checked={paymentReceived}
                onCheckedChange={setPaymentReceived}
                disabled={changingStatus}
              />
              <label
                htmlFor="mobile-payment-received"
                className="text-sm font-medium leading-none cursor-pointer select-none"
              >
                I confirm that the payment of {formatCurrency(order?.total_amount || 0)} has been received for this order
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsStatusConfirmOpen(false)}
                disabled={changingStatus}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => performStatusChange(pendingStatus)}
                disabled={changingStatus || !paymentReceived || (pendingStatus === 'completed' && !paymentMethod)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                {changingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Yes, Mark as Completed
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Quick Booking Edit - Mobile (Drawer) */}
      <Drawer open={isBookingEditOpen && isMobile} onOpenChange={setIsBookingEditOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="px-4">
            <DrawerTitle>Edit Booking Time</DrawerTitle>
            <DrawerDescription>
              Update the scheduled date and time for this order
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto">
            <div>
              <Label className="mb-2">Booking Date *</Label>
              <DatePicker
                value={bookingDate}
                onChange={setBookingDate}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2">From *</Label>
                <Select
                  value={bookingTimeFrom}
                  onValueChange={(value) => {
                    setBookingTimeFrom(value);
                    // Auto-calculate toTime (60 minutes later)
                    if (value) {
                      const [hours, minutes] = value.split(':').map(Number);
                      const fromDate = new Date();
                      fromDate.setHours(hours, minutes);
                      fromDate.setMinutes(fromDate.getMinutes() + 60);
                      const toHours = String(fromDate.getHours()).padStart(2, '0');
                      const toMinutes = String(fromDate.getMinutes()).padStart(2, '0');
                      setBookingTimeTo(`${toHours}:${toMinutes}`);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time">
                      {bookingTimeFrom ? generateTimeOptions().find(t => t.value === bookingTimeFrom)?.label || bookingTimeFrom : "Select time"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {generateTimeOptions().map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2">To *</Label>
                <Select
                  value={bookingTimeTo}
                  onValueChange={setBookingTimeTo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time">
                      {bookingTimeTo ? generateTimeOptions().find(t => t.value === bookingTimeTo)?.label || bookingTimeTo : "Select time"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {generateTimeOptions()
                      .filter((time) => {
                        if (!bookingTimeFrom) return true;
                        const [hours, minutes] = time.value.split(':').map(Number);
                        const [fromHours, fromMinutes] = bookingTimeFrom.split(':').map(Number);
                        const timeInMinutes = hours * 60 + minutes;
                        const fromTimeInMinutes = fromHours * 60 + fromMinutes;
                        return timeInMinutes > fromTimeInMinutes;
                      })
                      .map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsBookingEditOpen(false)}
                disabled={updatingBooking}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBooking}
                disabled={updatingBooking}
                className="flex-1"
              >
                {updatingBooking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Quick Booking Edit - Desktop (Dialog) */}
      <Dialog open={isBookingEditOpen && !isMobile} onOpenChange={setIsBookingEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Booking Time</DialogTitle>
            <DialogDescription>
              Update the scheduled date and time for this order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2">Booking Date *</Label>
              <DatePicker
                value={bookingDate}
                onChange={setBookingDate}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2">From *</Label>
                <Select
                  value={bookingTimeFrom}
                  onValueChange={(value) => {
                    setBookingTimeFrom(value);
                    // Auto-calculate toTime (60 minutes later)
                    if (value) {
                      const [hours, minutes] = value.split(':').map(Number);
                      const fromDate = new Date();
                      fromDate.setHours(hours, minutes);
                      fromDate.setMinutes(fromDate.getMinutes() + 60);
                      const toHours = String(fromDate.getHours()).padStart(2, '0');
                      const toMinutes = String(fromDate.getMinutes()).padStart(2, '0');
                      setBookingTimeTo(`${toHours}:${toMinutes}`);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time">
                      {bookingTimeFrom ? generateTimeOptions().find(t => t.value === bookingTimeFrom)?.label || bookingTimeFrom : "Select time"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {generateTimeOptions().map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2">To *</Label>
                <Select
                  value={bookingTimeTo}
                  onValueChange={setBookingTimeTo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time">
                      {bookingTimeTo ? generateTimeOptions().find(t => t.value === bookingTimeTo)?.label || bookingTimeTo : "Select time"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {generateTimeOptions()
                      .filter((time) => {
                        if (!bookingTimeFrom) return true;
                        const [hours, minutes] = time.value.split(':').map(Number);
                        const [fromHours, fromMinutes] = bookingTimeFrom.split(':').map(Number);
                        const timeInMinutes = hours * 60 + minutes;
                        const fromTimeInMinutes = fromHours * 60 + fromMinutes;
                        return timeInMinutes > fromTimeInMinutes;
                      })
                      .map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsBookingEditOpen(false)}
                disabled={updatingBooking}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBooking}
                disabled={updatingBooking}
                className="flex-1"
              >
                {updatingBooking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Comments View Dialog */}
      <AlertDialog open={isFeedbackViewOpen} onOpenChange={setIsFeedbackViewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Customer Feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Feedback submitted for this order
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 cursor-pointer ${star <= (order.rating || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                      }`}
                  />
                ))}
                <span className="text-sm text-muted-foreground ml-2">
                  {order.rating} out of 5
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Comments</label>
              <div className="bg-gray-50 rounded-lg p-4 border text-sm">
                {order.feedback_comments || 'No comments provided'}
              </div>
            </div>

            {order.feedback_submitted_at && (
              <div className="text-xs text-muted-foreground">
                Submitted on {formatDateTime(order.feedback_submitted_at)}
              </div>
            )}

            {order.image_urls?.google_review_image && (
              <div className="pt-4 border-t">
                <label className="text-sm font-medium mb-2 block">Google Review Proof</label>
                <button
                  onClick={() => {
                    setCurrentImageType('google_review');
                    setCurrentImageIndex(0);
                    setImageViewerOpen(true);
                    setImageZoom(1);
                    setImagePosition({ x: 0, y: 0 });
                    setIsFeedbackViewOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary transition-colors group w-full"
                >
                  <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 border border-gray-300">
                    <img
                      src={order.image_urls.google_review_image}
                      alt="Google Review Proof"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Proof Attached</div>
                    <div className="text-xs text-muted-foreground">Click to view full image</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsFeedbackViewOpen(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Dialog */}
      <AlertDialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Please share your experience with this service order.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-3 block">Rating *</label>
              <div
                className="flex gap-2 justify-center"
                onMouseLeave={() => setHoveredRating(0)}
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFeedbackRating(rating)}
                    onMouseEnter={() => setHoveredRating(rating)}
                    className="transition-all hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`h-10 w-10 cursor-pointer ${(hoveredRating > 0 ? hoveredRating : feedbackRating) >= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                        } transition-colors`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Click to rate from 1 (Poor) to 5 (Excellent)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Feedback (Optional)</label>
              <Textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Add customer feedback about the service quality, agent, timeliness, etc... (Optional)"
                rows={4}
                className="resize-none"
              />
            </div>

            {order.image_urls?.google_review_image && (
              <div className="pt-4 border-t">
                <label className="text-sm font-medium mb-2 block">Google Review Proof</label>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentImageType('google_review');
                    setCurrentImageIndex(0);
                    setImageViewerOpen(true);
                    setImageZoom(1);
                    setImagePosition({ x: 0, y: 0 });
                  }}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary transition-colors group w-full"
                >
                  <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 border border-gray-300">
                    <img
                      src={order.image_urls.google_review_image}
                      alt="Google Review Proof"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Proof Attached</div>
                    <div className="text-xs text-muted-foreground">Click to view full image</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingFeedback}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitFeedback}
              disabled={submittingFeedback || feedbackRating === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submittingFeedback && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Feedback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Viewer Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 bg-black border-0">
          <div className="relative w-full h-full flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <div className="text-sm">
                  {currentImageType === 'before' && `Before Image ${currentImageIndex + 1} of ${order.image_urls?.before_images?.length || 0}`}
                  {currentImageType === 'after' && `After Image ${currentImageIndex + 1} of ${order.image_urls?.after_images?.length || 0}`}
                  {currentImageType === 'payment_proof' && 'Payment Proof'}
                  {currentImageType === 'google_review' && 'Google Review'}
                </div>
                <button
                  onClick={() => setImageViewerOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <div
                className="relative cursor-move"
                style={{
                  transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                }}
                onMouseDown={(e) => {
                  if (imageZoom > 1) {
                    setIsDragging(true);
                    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
                  }
                }}
                onMouseMove={(e) => {
                  if (isDragging) {
                    setImagePosition({
                      x: e.clientX - dragStart.x,
                      y: e.clientY - dragStart.y,
                    });
                  }
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={(e) => {
                  if (imageZoom > 1 && e.touches.length === 1) {
                    setIsDragging(true);
                    setDragStart({
                      x: e.touches[0].clientX - imagePosition.x,
                      y: e.touches[0].clientY - imagePosition.y,
                    });
                  }
                }}
                onTouchMove={(e) => {
                  if (isDragging && e.touches.length === 1) {
                    setImagePosition({
                      x: e.touches[0].clientX - dragStart.x,
                      y: e.touches[0].clientY - dragStart.y,
                    });
                  }
                }}
                onTouchEnd={() => setIsDragging(false)}
              >
                {currentImageType === 'before' && order.image_urls?.before_images?.[currentImageIndex] && (
                  <img
                    src={order.image_urls.before_images[currentImageIndex]}
                    alt={`Before ${currentImageIndex + 1}`}
                    className="max-h-[80vh] max-w-[90vw] object-contain"
                    draggable={false}
                  />
                )}
                {currentImageType === 'after' && order.image_urls?.after_images?.[currentImageIndex] && (
                  <img
                    src={order.image_urls.after_images[currentImageIndex]}
                    alt={`After ${currentImageIndex + 1}`}
                    className="max-h-[80vh] max-w-[90vw] object-contain"
                    draggable={false}
                  />
                )}
                {currentImageType === 'payment_proof' && order.image_urls?.payment_proof && (
                  <img
                    src={order.image_urls.payment_proof}
                    alt="Payment Proof"
                    className="max-h-[80vh] max-w-[90vw] object-contain"
                    draggable={false}
                  />
                )}
                {currentImageType === 'google_review' && order.image_urls?.google_review_image && (
                  <img
                    src={order.image_urls.google_review_image}
                    alt="Google Review"
                    className="max-h-[80vh] max-w-[90vw] object-contain"
                    draggable={false}
                  />
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-center gap-6">
                {/* Navigation - only show for arrays */}
                {(currentImageType === 'before' || currentImageType === 'after') && (
                  <>
                    <button
                      onClick={() => {
                        const images = currentImageType === 'before' ? order.image_urls?.before_images : order.image_urls?.after_images;
                        if (currentImageIndex > 0) {
                          setCurrentImageIndex(currentImageIndex - 1);
                          setImageZoom(1);
                          setImagePosition({ x: 0, y: 0 });
                        }
                      }}
                      disabled={currentImageIndex === 0}
                      className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Zoom Controls */}
                <button
                  onClick={() => setImageZoom(Math.max(1, imageZoom - 0.5))}
                  disabled={imageZoom <= 1}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-white text-sm min-w-[3rem] text-center">{Math.round(imageZoom * 100)}%</span>
                <button
                  onClick={() => setImageZoom(Math.min(3, imageZoom + 0.5))}
                  disabled={imageZoom >= 3}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                {imageZoom > 1 && (
                  <button
                    onClick={() => {
                      setImageZoom(1);
                      setImagePosition({ x: 0, y: 0 });
                    }}
                    className="text-white text-sm hover:bg-white/20 px-3 py-2 rounded transition-colors"
                  >
                    Reset
                  </button>
                )}

                {/* Navigation - only show for arrays */}
                {(currentImageType === 'before' || currentImageType === 'after') && (
                  <>
                    <button
                      onClick={() => {
                        const images = currentImageType === 'before' ? order.image_urls?.before_images : order.image_urls?.after_images;
                        if (images && currentImageIndex < images.length - 1) {
                          setCurrentImageIndex(currentImageIndex + 1);
                          setImageZoom(1);
                          setImagePosition({ x: 0, y: 0 });
                        }
                      }}
                      disabled={currentImageIndex >= (currentImageType === 'before' ? order.image_urls?.before_images?.length : order.image_urls?.after_images?.length) - 1}
                      className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog - Desktop */}
      <AlertDialog open={isCancelDialogOpen && !isMobile} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a reason for cancelling this order. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Cancellation Reason *</label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cancelReason === 'Other' && (
              <div>
                <label className="text-sm font-medium">Please specify *</label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter cancellation reason..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={cancelling || !cancelReason || (cancelReason === 'Other' && !customReason.trim())}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Drawer - Mobile */}
      <Drawer open={isCancelDialogOpen && isMobile} onOpenChange={setIsCancelDialogOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="px-4 text-left">
            <DrawerTitle>Cancel Order</DrawerTitle>
            <DrawerDescription>
              Please select a reason for cancelling this order. This action cannot be undone.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto">
            <div>
              <label className="text-sm font-medium">Cancellation Reason *</label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cancelReason === 'Other' && (
              <div>
                <label className="text-sm font-medium">Please specify *</label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter cancellation reason..."
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsCancelDialogOpen(false)}
                disabled={cancelling}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCancelOrder}
                disabled={cancelling || !cancelReason || (cancelReason === 'Other' && !customReason.trim())}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-medium"
              >
                {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Add Location Dialog - Desktop */}
      <Dialog open={isAddLocationOpen && !isMobile} onOpenChange={setIsAddLocationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Service Location</DialogTitle>
            <DialogDescription>
              Enter a Google Maps link to automatically resolve the service address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="map-link-desktop" className="text-sm font-medium">Google Maps Link</label>
              <Input
                id="map-link-desktop"
                type="text"
                placeholder="Paste Google Maps URL here..."
                value={mapLink}
                onChange={(e) => setMapLink(e.target.value)}
                className="w-full"
              />
            </div>

            {reverseGeocodingLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 justify-center bg-gray-50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Identifying area details...</span>
              </div>
            )}

            {detectedArea && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
                <div className="font-semibold text-green-800">Identified Location:</div>
                <div className="text-green-700">{detectedArea}, {detectedCity}</div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddLocationOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={!geocodedAddress || loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Location Drawer - Mobile */}
      <Drawer open={isAddLocationOpen && isMobile} onOpenChange={setIsAddLocationOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="px-4 text-left">
            <DrawerTitle>Add Service Location</DrawerTitle>
            <DrawerDescription>
              Enter a Google Maps link to automatically resolve the service address.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <label htmlFor="map-link-mobile" className="text-sm font-medium">Google Maps Link</label>
              <Input
                id="map-link-mobile"
                type="text"
                placeholder="Paste Google Maps URL here..."
                value={mapLink}
                onChange={(e) => setMapLink(e.target.value)}
                className="w-full"
              />
            </div>

            {reverseGeocodingLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 justify-center bg-gray-50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Identifying area details...</span>
              </div>
            )}

            {detectedArea && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
                <div className="font-semibold text-green-800">Identified Location:</div>
                <div className="text-green-700">{detectedArea}, {detectedCity}</div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsAddLocationOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLocation}
                disabled={!geocodedAddress || loading}
                className="flex-1"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default OrderDetail;
