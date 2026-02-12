import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
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
import { Textarea } from '../components/ui/textarea';
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
} from 'lucide-react';
import MapPreview from '@/components/MapPreview';
import { formatDate, formatDateTime, formatTime, formatCurrency } from '../lib/utilities';
import { Badge2 } from '@/components/ui/badge2';

/**
 * Order Detail Page
 * Shows comprehensive order information with tabs for overview, items, timeline, reassignments
 */
const OrderDetail = ({ orderId, onClose, onUpdate }) => {
  // Use orderId prop instead of route params, but keep useParams as fallback for direct route access
  const routeParams = useParams();
  const id = orderId || routeParams.id;
  const navigate = useNavigate();

  // Tabs state
  const [activeTab, setActiveTab] = useState('packages');
  const tabsList = ['packages', 'timeline', 'reassignments'];

  // Swipe logic for tabs
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 60;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabsList.indexOf(activeTab);
      if (isLeftSwipe && currentIndex < tabsList.length - 1) {
        setActiveTab(tabsList[currentIndex + 1]);
        // Subtle haptic feedback feel
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
  const [agents, setAgents] = useState([]);
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

  // Fetch order details
  useEffect(() => {
    if (id) {
      fetchOrderDetails();
      fetchTimeline();
      fetchReassignments();
      fetchAgents();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const data = await orderService.getOrderById(id);
      setOrder(data.order);
      setNoteText(data.notes || '');
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const data = await orderService.getOrderTimeline(id);
      setTimeline(data.timeline || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  const fetchReassignments = async () => {
    try {
      const data = await orderService.getOrderReassignments(id);
      setReassignments(data.reassignments || []);
    } catch (error) {
      console.error('Error fetching reassignments:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await orderService.getUsersByRole('agent');
      setAgents(response.users || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    // If changing to completed, show confirmation dialog
    if (newStatus === 'completed') {
      setPendingStatus(newStatus);
      setIsStatusConfirmOpen(true);
      return;
    }

    // For in_progress, change directly
    await performStatusChange(newStatus);
  };

  // Perform the actual status change
  const performStatusChange = async (newStatus) => {
    setChangingStatus(true);
    try {
      await orderService.updateOrderStatus(id, newStatus);
      toast.success('Status updated successfully');
      fetchOrderDetails();
      fetchTimeline();
      setIsStatusConfirmOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setChangingStatus(false);
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
      fetchOrderDetails();
      fetchTimeline();
    } catch (error) {
      console.error('Error cancelling order:', error);
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
      const agentIdToSend = newAgentId === 'unassigned' ? null : newAgentId;
      await orderService.reassignOrder(id, agentIdToSend);
      toast.success(newAgentId === 'unassigned' ? 'Agent unassigned successfully' : 'Agent reassigned successfully');
      setIsReassignDialogOpen(false);
      fetchOrderDetails();
      fetchTimeline();
      fetchReassignments();
    } catch (error) {
      console.error('Error reassigning agent:', error);
      toast.error('Failed to reassign agent');
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
      fetchOrderDetails();
    } catch (error) {
      console.error('Error updating note:', error);
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
      fetchOrderDetails();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
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
                            <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                              <Clock className="h-4 w-4 mr-2" />
                              Mark as In Progress
                            </DropdownMenuItem>
                          )}

                          {(order.status === 'confirmed' || order.status === 'in_progress') && (
                            <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
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

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>Order date <span className="font-medium text-foreground">{formatDate(order.created_at)}</span></span>
                <span>•</span>
                <span>Order from <span className="font-medium text-foreground">{order.customer?.name}</span></span>
                {order.source && (
                  <>
                    <span>•</span>
                    <span>Purchased via <span className="font-medium text-foreground">{order.source}</span></span>
                  </>
                )}
                {order.subscription_id && (
                  <>
                    <span>•</span>
                    <span>Purchased via <button
                      onClick={() => navigate(`/subscriptions/${order.subscription_id}`)}
                      className="font-medium text-primary hover:underline cursor-pointer"
                    >
                      Monthly Subscription
                    </button></span>
                  </>
                )}
              </div>
            </div>

            {/* Service Location */}
            <div className="py-4 px-4 bg-gray-50 rounded-lg border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-3 gap-x-6 mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground opacity-70">Service Location</span>
                    <span className="text-sm font-semibold capitalize text-foreground">{order.area || 'N/A'}, {order.city || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-full flex-shrink-0">
                    <Calendar1Icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground opacity-70">Scheduled Time</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatDate(order.booking_date)} at {formatTime(order.booking_time_from)} - {formatTime(order.booking_time_to)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2 mb-4">
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
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {isEditable && (
                <>
                  {order.status === 'draft' && <Button
                    variant="default"
                    onClick={() => handleStatusChange('confirmed')}
                    className="flex-1"
                  >
                    Confirm
                  </Button>}
                  <Button
                    variant="destructive"
                    onClick={() => setIsCancelDialogOpen(true)}
                    className="flex-1"
                  >
                    Cancel Order
                  </Button>
                  {/* <Button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Edit Order
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button> */}
                </>
              )}

              {/* Feedback Button - show when order is completed and feedback not submitted */}
              {order.status === 'completed' && !order.feedback_submitted_at && (
                <Button
                  onClick={() => setIsFeedbackDialogOpen(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Feedback
                </Button>
              )}
            </div>

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
                className="space-y-6"
              >
                <TabsList className="grid w-full grid-cols-3 bg-transparent border-b rounded-none h-auto p-0">
                  <TabsTrigger
                    value="packages"
                    className="rounded-none border-b-2 cursor-pointer border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
                  >
                    Packages & Addons
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    className="rounded-none border-b-2 cursor-pointer border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
                  >
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger
                    value="reassignments"
                    className="rounded-none border-b-2 cursor-pointer border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
                  >
                    Reassignments
                  </TabsTrigger>
                </TabsList>

                {/* Packages Tab */}
                <TabsContent value="packages" className="space-y-6 mt-6">
                  {/* Packages */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Service Packages</h3>
                      <Badge2 variant="outline" className="text-xs">{order.packages?.length || 0} items</Badge2>
                    </div>
                    <div className="space-y-4">
                      {order.packages && order.packages.length > 0 ? (
                        order.packages.map((item, index) => (
                          <div key={index} className="flex gap-4  border-b last:border-0">
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Car className="h-10 w-10 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium mb-2">{item.package_name}</h4>
                              <div className="text-sm  space-y-1">
                                <div>{item.package.name}</div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="capitalize">{item.vehicle_type}</span>
                                  {item.brand && item.model && (
                                    <>
                                      <span>•</span>
                                      <span>{item.brand} {item.model}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>Quantity {item.quantity}</span>
                                </div>
                                <div className='text-muted-foreground'>{item.notes}</div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-semibold text-lg">{formatCurrency(item.total_price)}</div>
                              {item.discount > 0 && (
                                <div className="text-sm text-destructive mt-1">
                                  Discount -{formatCurrency(item.discount)}
                                </div>
                              )}
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
                        <Badge2 variant="outline" className="text-xs">{order.addons.length} items</Badge2>
                      </div>
                      <div className="space-y-4">
                        {order.addons.map((item, index) => (
                          <div key={index} className="flex gap-4 border-b last:border-0">

                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium mb-2">{item.addon_name}</h4>
                              <div className="text-sm ">
                                {item.addon.name} • Quantity {item.quantity}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-semibold text-lg">{formatCurrency(item.total_price)}</div>
                              {item.discount > 0 && (
                                <div className="text-sm text-destructive mt-1">
                                  Discount -{formatCurrency(item.discount)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="mt-6">
                  <div className="space-y-6">
                    {timeline.length > 0 ? (
                      timeline.map((event, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${event.type === 'created' || event.type === 'status_changed'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gray-100 text-gray-600'
                              }`}>
                              {event.type === 'status_changed' ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : event.type === 'cancelled' ? (
                                <XCircle className="h-5 w-5" />
                              ) : (
                                <Clock className="h-5 w-5" />
                              )}
                            </div>
                            {index < timeline.length - 1 && (
                              <div className="w-0.5 flex-1 bg-gray-200 mt-2" style={{ minHeight: '3rem' }} />
                            )}
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="font-medium mb-1">{event.title}</div>
                            <div className="text-sm text-muted-foreground mb-2">{event.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(event.created_at)}
                              {event.user_name && ` • by ${event.user_name}`}
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
                <TabsContent value="reassignments" className="mt-6">
                  <div className="space-y-4">
                    {reassignments.length > 0 ? (
                      reassignments.map((item, index) => (
                        <div key={index} className="flex items-start gap-4 py-4 border-b last:border-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium mb-1">{item.agent_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Assigned by {item.assigned_by_name}
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

            <div className="p-4 border rounded-lg">
              {/* Payment Details */}
              <div >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Payment Details</h3>
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

                <div className="space-y-3 max-w-md ml-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal ({(order.packages?.length || 0) + (order.addons?.length || 0)} items)
                    </span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>

                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Discount</span>
                      <span>-{formatCurrency(order.discount)}</span>
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

                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold">{formatCurrency(order.total_amount)}</span>
                  </div>
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
          <div className="space-y-6">
            {/* Assigned Agent */}
            <div className="border rounded-lg">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Assigned Agent</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {order.assigned_to?.name || 'Unassigned'}
                    </div>
                    {order.assigned_to?.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {order.assigned_to.email}
                      </div>
                    )}
                  </div>
                </div>

                {(() => {
                  const currentAgentId = order.assigned_to?.id;
                  const availableAgents = agents.filter(agent => agent.id !== currentAgentId);
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
            <div className="border rounded-lg">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Customer</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                    {order.customer?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{order.customer?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Total: {order.customer?.total_orders || 0} order{order.customer?.total_orders !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Address */}
              <div>
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold">Service Address</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4">
                  {order.latitude && order.longitude ? (
                    <div className="mb-4 rounded-sm overflow-hidden border">
                      <MapPreview lat={order.latitude} lng={order.longitude} />
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

                      {order.map_link && (
                        <a
                          href={order.map_link}
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
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
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
            <div className="border rounded-lg">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Order Note</h3>
                {!editingNote ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingNote(true)}>
                    <Edit className="h-4 w-4" />
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
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {order.notes || 'No notes added'}
                  </p>
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
        onSuccess={() => {
          setIsWizardOpen(false);
          fetchOrderDetails();
          fetchTimeline();
          toast.success('Order updated successfully');
          if (onUpdate) onUpdate();
        }}
      />

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

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Order as Completed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this order as completed? This action cannot be undone and will make the order non-editable.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
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
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={changingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => performStatusChange(pendingStatus)}
              disabled={changingStatus}
              className="bg-green-600 hover:bg-green-700"
            >
              {changingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Mark as Completed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <label className="text-sm font-medium mb-2 block">Feedback *</label>
              <Textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Share your feedback about the service quality, agent, timeliness, etc..."
                rows={4}
                className="resize-none"
              />
            </div>
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

      {/* Cancel Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
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
    </div>
  );
};

export default OrderDetail;
