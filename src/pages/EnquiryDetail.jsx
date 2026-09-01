import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { toast } from 'sonner';
import ablyClient from '../services/ablyClient';
import useEnquiryStore from '../store/enquiryStore';
import {
  ENQUIRY_SOURCE_LABELS,
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_STATUS_OPTIONS,
  ENQUIRY_STATUS_COLORS,
  SENTIMENT_LABELS,
  SENTIMENT_EMOJIS,
  SENTIMENT_OPTIONS,
  SENTIMENT_COLORS,
  LOST_REASON_OPTIONS,
} from '../constants/enquiryConstants';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Package,
  MessageSquare,
  Bell,
  CheckCircle2,
  UserPlus,
  ExternalLink,
  Loader2,
  Clock,
  TrendingUp,
  Send,
  XCircle,
  AlertCircle,
  Volume2,
  Megaphone,
  ShoppingCart,
  UserX,
  Edit,
  Plus,
  X,
} from 'lucide-react';
import orderService from '../services/orderService';
import customerService from '../services/customerService';
import { formatDate, formatDateTime, formatBookingTime } from '../lib/utilities';
import { sanitizeImageUrl, isValidUrl } from '../lib/security';
import { Badge2 } from '@/components/ui/badge2';
import LetterAvatar from '@/components/LetterAvatar';
import CustomerContact from '@/components/CustomerContact';
import CustomerDetails from '../components/CustomerDetails';
import VoiceNoteRecorder from '@/components/VoiceNoteRecorder';
import WaveformPlayer from '@/components/WaveformPlayer';
import OrderWizard from '../components/OrderWizard';
import enquiryService from '../services/enquiryService';

/**
 * Enquiry Detail Page
 * Shows comprehensive enquiry information with status timeline
 */
const EnquiryDetail = ({ enquiryId, onClose, onUpdate }) => {
  // Use enquiryId prop instead of route params, but keep useParams as fallback for direct route access
  const routeParams = useParams();
  const id = enquiryId || routeParams.id;
  const navigate = useNavigate();

  const {
    selectedEnquiry: enquiry,
    isLoading: loading,
    fetchEnquiryById,
    updateEnquiryStatus,
    assignEnquiry,
    convertToOrder,
  } = useEnquiryStore();

  // Quick status update (no dialog)
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Assign dialog state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignToId, setAssignToId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Convert to order confirmation
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  // Follow-up dialog state
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [addingFollowUp, setAddingFollowUp] = useState(false);

  // Lost reason dialog state
  const [isLostReasonDialogOpen, setIsLostReasonDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [updatingLostStatus, setUpdatingLostStatus] = useState(false);

  // Convert status confirmation dialog
  const [isConvertStatusDialogOpen, setIsConvertStatusDialogOpen] = useState(false);

  // Order Wizard state
  const [isOrderWizardOpen, setIsOrderWizardOpen] = useState(false);
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState(null);

  // Customer details dialog state
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);

  // Customer statistics & location state
  const [customerInfo, setCustomerInfo] = useState(null);
  const [customerOrdersCount, setCustomerOrdersCount] = useState(null);
  const [lastBookingInfo, setLastBookingInfo] = useState(null);
  const [loadingCustomerStats, setLoadingCustomerStats] = useState(false);

  useEffect(() => {
    const custId = enquiry?.customer?.id || enquiry?.customer_id;
    const phone = enquiry?.contact_phone;

    if (custId || phone) {
      setLoadingCustomerStats(true);

      const fetchCustomerData = async () => {
        try {
          let cData = enquiry?.customer || null;
          if (custId) {
            try {
              cData = await customerService.getCustomerById(custId);
            } catch (err) { }
          }
          setCustomerInfo(cData);

          // Fetch orders to calculate total bookings and last booking date/time
          const ordersRes = await orderService.getAllOrders(
            custId ? { customer_id: custId, per_page: 50 } : { search: phone, per_page: 50 }
          );
          const ordersList = ordersRes?.orders || ordersRes || [];
          setCustomerOrdersCount(ordersList.length);

          if (ordersList.length > 0) {
            const sortedOrders = [...ordersList].sort((a, b) =>
              new Date(b.booking_date || b.created_at) - new Date(a.booking_date || a.created_at)
            );
            setLastBookingInfo(sortedOrders[0]);
          } else {
            setLastBookingInfo(null);
          }
        } catch (error) {
          console.error('Error fetching customer statistics:', error);
        } finally {
          setLoadingCustomerStats(false);
        }
      };

      fetchCustomerData();
    } else {
      setCustomerInfo(null);
      setCustomerOrdersCount(0);
      setLastBookingInfo(null);
    }
  }, [enquiry?.id, enquiry?.customer_id, enquiry?.customer?.id, enquiry?.contact_phone]);

  // Requirements edit dialog state (matching New Enquiry fields)
  const [isRequirementsDialogOpen, setIsRequirementsDialogOpen] = useState(false);
  const [reqVehicleType, setReqVehicleType] = useState('');
  const [reqSelectedPackageIds, setReqSelectedPackageIds] = useState([]);
  const [reqSelectedAddonIds, setReqSelectedAddonIds] = useState([]);
  const [reqNotes, setReqNotes] = useState('');
  const [availablePackages, setAvailablePackages] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [loadingPackagesAddons, setLoadingPackagesAddons] = useState(false);
  const [savingRequirements, setSavingRequirements] = useState(false);

  // Fetch packages and addons when requirements dialog opens
  useEffect(() => {
    if (isRequirementsDialogOpen) {
      setLoadingPackagesAddons(true);
      Promise.all([
        orderService.getPackages(),
        orderService.getAddons(),
      ])
        .then(([packagesRes, addonsRes]) => {
          const loadedPackages = packagesRes.packages || packagesRes || [];
          loadedPackages.sort((a, b) => a.name.localeCompare(b.name));
          setAvailablePackages(loadedPackages);
          const loadedAddons = addonsRes.addons || addonsRes || [];
          setAvailableAddons(loadedAddons);

          // Parse existing requirements
          if (enquiry?.requirements) {
            const lines = enquiry.requirements.split('\n').filter(line => line.trim());
            const parsedVehicleType = lines.find(line => line.startsWith('Vehicle Type:'))?.replace('Vehicle Type:', '').trim() || '';
            const parsedPackagesStr = lines.find(line => line.startsWith('Packages:'))?.replace('Packages:', '').trim() || '';
            const parsedAddonsStr = lines.find(line => line.startsWith('Add-ons:'))?.replace('Add-ons:', '').trim() || '';
            const otherReqs = lines.filter(line =>
              !line.startsWith('Vehicle Type:') &&
              !line.startsWith('Packages:') &&
              !line.startsWith('Add-ons:')
            ).join('\n').trim();

            setReqVehicleType(parsedVehicleType);
            setReqNotes(otherReqs);

            // Match package names to IDs
            if (parsedPackagesStr) {
              const names = parsedPackagesStr.split(',').map(s => s.trim().toLowerCase());
              const matchedPkgIds = loadedPackages
                .filter(p => names.includes(p.name.toLowerCase()))
                .map(p => p.id);
              setReqSelectedPackageIds(matchedPkgIds);
            } else {
              setReqSelectedPackageIds([]);
            }

            // Match addon names to IDs
            if (parsedAddonsStr) {
              const names = parsedAddonsStr.split(',').map(s => s.trim().toLowerCase());
              const matchedAddonIds = loadedAddons
                .filter(a => names.includes(a.name.toLowerCase()))
                .map(a => a.id);
              setReqSelectedAddonIds(matchedAddonIds);
            } else {
              setReqSelectedAddonIds([]);
            }
          } else {
            setReqVehicleType('');
            setReqSelectedPackageIds([]);
            setReqSelectedAddonIds([]);
            setReqNotes('');
          }
        })
        .catch(() => {
          toast.error('Failed to load packages and add-ons');
        })
        .finally(() => {
          setLoadingPackagesAddons(false);
        });
    }
  }, [isRequirementsDialogOpen, enquiry?.requirements]);

  const handleSaveRequirements = async () => {
    setSavingRequirements(true);
    try {
      let requirementsText = reqNotes.trim();

      if (reqVehicleType) {
        requirementsText += `\n\nVehicle Type: ${reqVehicleType}`;
      }

      if (reqSelectedPackageIds.length > 0) {
        const packageNames = reqSelectedPackageIds
          .map(id => availablePackages.find(p => p.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        if (packageNames) {
          requirementsText += `\n\nPackages: ${packageNames}`;
        }
      }

      if (reqSelectedAddonIds.length > 0) {
        const addonNames = reqSelectedAddonIds
          .map(id => availableAddons.find(a => a.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        if (addonNames) {
          requirementsText += `\n\nAdd-ons: ${addonNames}`;
        }
      }

      const finalReqs = requirementsText.trim();
      await enquiryService.updateEnquiry(id, {
        requirements: finalReqs,
      });
      toast.success(finalReqs ? 'Requirements updated successfully' : 'Requirements cleared');
      setIsRequirementsDialogOpen(false);
      await fetchEnquiryById(id);
      if (onUpdate && enquiry) {
        onUpdate({ ...enquiry, requirements: finalReqs });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to update requirements');
    } finally {
      setSavingRequirements(false);
    }
  };

  // Exclude from enquiries (non-customer) dialog state
  const [isExcludeDialogOpen, setIsExcludeDialogOpen] = useState(false);
  const [excluding, setExcluding] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isCustomerResponse, setIsCustomerResponse] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  // Voice note state
  const [voiceNoteBlob, setVoiceNoteBlob] = useState(null);
  const [voiceNoteDuration, setVoiceNoteDuration] = useState(0);
  const [voiceRecorderKey, setVoiceRecorderKey] = useState(0);
  const [isRecordingInProgress, setIsRecordingInProgress] = useState(false);

  // Follow-ups state
  const [followUps, setFollowUps] = useState([]);

  // Shared audio playing state
  const [activeAudioUrl, setActiveAudioUrl] = useState(null);

  const handleAudioPlay = (url) => {
    setActiveAudioUrl(url);
  };

  const handleAudioPause = (url) => {
    if (activeAudioUrl === url) {
      setActiveAudioUrl(null);
    }
  };

  const handleAudioFinish = (finishedUrl) => {
    const finishedCommentIndex = comments.findIndex(c => c.voice_note_url === finishedUrl);
    if (finishedCommentIndex === -1) {
      setActiveAudioUrl(null);
      return;
    }

    // Find next comment with voice note (moving from oldest to newest, which is down in indices)
    let nextCommentWithAudio = null;
    for (let i = finishedCommentIndex - 1; i >= 0; i--) {
      if (comments[i].voice_note_url) {
        nextCommentWithAudio = comments[i];
        break;
      }
    }

    if (nextCommentWithAudio) {
      setActiveAudioUrl(nextCommentWithAudio.voice_note_url);
    } else {
      setActiveAudioUrl(null);
    }
  };

  // Automatically scroll to the playing audio comment
  useEffect(() => {
    if (activeAudioUrl) {
      const playingComment = comments.find(c => c.voice_note_url === activeAudioUrl);
      if (playingComment) {
        const element = document.getElementById(`comment-${playingComment.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }, [activeAudioUrl, comments]);

  // Fetch enquiry details
  useEffect(() => {
    if (id) {
      fetchEnquiryById(id);
      fetchComments();
      fetchFollowUps();
    }
  }, [id, fetchEnquiryById]);

  // Subscribe to real-time enquiry updates - only when viewing this specific enquiry
  useEffect(() => {
    if (!id) return;


    let unsubscribe = null;

    // Initialize Ably client and subscribe
    const setupSubscription = async () => {
      try {
        await ablyClient.initialize();

        // Subscribe to specific enquiry channel
        unsubscribe = ablyClient.subscribeToEnquiry(id, (eventName, eventData) => {

          // Handle different event types
          if (eventName === 'enquiry.updated' || eventName === 'enquiry.status_changed') {
            fetchEnquiryById(id);
          } else if (eventName === 'enquiry.assigned') {
            fetchEnquiryById(id);
          } else if (eventName === 'enquiry.comment_added') {
            fetchComments();
          }
        });
      } catch (err) {
      }
    };

    setupSubscription();

    // Cleanup on unmount - unsubscribe when closing enquiry detail
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id]); // Only re-subscribe if enquiry ID changes

  // Fetch comments
  const fetchComments = async () => {
    try {
      const data = await enquiryService.getComments(id);
      setComments(data.comments || []);
    } catch (error) {
      // Gracefully fail - start with empty comments
      setComments([]);
    }
  };

  // Fetch follow-ups
  const fetchFollowUps = async () => {
    try {
      const data = await enquiryService.getFollowUps(id);
      setFollowUps(data.follow_ups || []);
    } catch (error) {
      setFollowUps([]);
    }
  };

  // Get next pending follow-up
  const getNextFollowUp = () => {
    if (!followUps || followUps.length === 0) return null;

    const pending = followUps.filter(f => f.status === 'pending');
    if (pending.length === 0) return null;

    // Sort by follow_up_at and return the earliest
    return pending.sort((a, b) => new Date(a.follow_up_at) - new Date(b.follow_up_at))[0];
  };

  // Get last completed follow-up
  const getLastCompletedFollowUp = () => {
    if (!followUps || followUps.length === 0) return null;

    const done = followUps.filter(f => f.status === 'done');
    if (done.length === 0) return null;

    // Sort by follow_up_at DESC and return the most recent
    return done.sort((a, b) => new Date(b.follow_up_at) - new Date(a.follow_up_at))[0];
  };

  // Handle quick status update
  const handleQuickStatusUpdate = async (newStatus) => {
    if (!newStatus || newStatus === enquiry.status) return;

    // If status is "lost", show dialog to collect reason
    if (newStatus === 'lost') {
      setIsLostReasonDialogOpen(true);
      return;
    }

    // If status is "needs_followup", show follow-up scheduling dialog
    if (newStatus === 'needs_followup') {
      setIsFollowUpDialogOpen(true);
      return;
    }

    // If status is "converted", show confirmation dialog
    if (newStatus === 'converted') {
      setIsConvertStatusDialogOpen(true);
      return;
    }

    setUpdatingStatus(true);
    try {
      await updateEnquiryStatus(id, newStatus, '');
      toast.success('Status updated successfully');

      // Refresh enquiry data to show updated status logs and timestamps
      await fetchEnquiryById(id);

      // Notify parent if provided
      if (onUpdate && enquiry) {
        onUpdate({ ...enquiry, status: newStatus });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle lost status with reason
  const handleLostStatusUpdate = async () => {
    if (!lostReason) {
      toast.error('Please select a reason for marking as lost');
      return;
    }

    // Get the label for the selected reason value
    const reasonLabel = LOST_REASON_OPTIONS.find(r => r.value === lostReason)?.label || lostReason;

    setUpdatingLostStatus(true);
    try {
      await updateEnquiryStatus(id, 'lost', reasonLabel);
      toast.success('Enquiry marked as lost');
      setIsLostReasonDialogOpen(false);
      setLostReason('');

      // Refresh enquiry data to show updated status logs and timestamps
      await fetchEnquiryById(id);

      // Notify parent if provided
      if (onUpdate && enquiry) {
        onUpdate({ ...enquiry, status: 'lost' });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingLostStatus(false);
    }
  };

  // Handle adding phone number to exception/non-customers list
  const handleAddToNonCustomers = async () => {
    if (!enquiry || !enquiry.contact_phone) return;

    setExcluding(true);
    try {
      // Reason as name if any, otherwise "not a user"
      const reason = enquiry.customer?.name || enquiry.contact_name || 'not a user';

      await enquiryService.addExceptionPhone(enquiry.contact_phone, reason);

      toast.success('Added to non-customers list successfully');
      setIsExcludeDialogOpen(false);

      // Refresh enquiry data
      await fetchEnquiryById(id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add to non-customers list');
    } finally {
      setExcluding(false);
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim() && !voiceNoteBlob) {
      toast.error('Please add a comment or voice note');
      return;
    }

    setAddingComment(true);
    try {
      let result;

      // If there's a voice note, add it as a voice comment
      if (voiceNoteBlob) {

        // Create FormData to upload audio file
        const formData = new FormData();
        formData.append('audio', voiceNoteBlob, 'voice-note.webm');
        formData.append('duration', voiceNoteDuration.toString());
        formData.append('is_customer_response', isCustomerResponse.toString());

        // If there's also text, include it
        if (newComment.trim()) {
          formData.append('text', newComment);
        }

        // Call API to upload voice note
        result = await enquiryService.addVoiceComment(id, formData);

        // Clear voice note state and reset recorder
        setVoiceNoteBlob(null);
        setVoiceNoteDuration(0);
        setVoiceRecorderKey(prev => prev + 1);
      } else {
        // Text comment only
        result = await enquiryService.addComment(id, {
          text: newComment,
          is_customer_response: isCustomerResponse
        });
      }

      // Add the new comment to the list
      setComments(prev => [result.comment, ...prev]);

      setNewComment('');
      setIsCustomerResponse(false);
      toast.success('Comment added successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  // Handle voice note upload
  const handleVoiceNoteComplete = (audioBlob, duration) => {
    // Store the voice note blob instead of immediately adding it as a comment
    setVoiceNoteBlob(audioBlob);
    setVoiceNoteDuration(duration);
    setIsRecordingInProgress(false);
  };

  const handleVoiceNoteDelete = () => {
    // Clear voice note state when user deletes the recording
    setVoiceNoteBlob(null);
    setVoiceNoteDuration(0);
    setIsRecordingInProgress(false);
  };

  const handleRecordingStateChange = ({ isRecording, isPaused, hasRecording }) => {
    // Update recording state
    setIsRecordingInProgress(isRecording || isPaused);
    if (!hasRecording) {
      // Clear blob if no recording available
      setVoiceNoteBlob(null);
      setVoiceNoteDuration(0);
    }
  };

  // Handle convert to order
  const handleConvertToOrder = async () => {
    setConverting(true);
    try {
      const result = await convertToOrder(id);
      toast.success(`Enquiry converted to order #${result.order.order_number}`);
      setIsConvertDialogOpen(false);

      // Notify parent if provided (for list page update)
      if (onUpdate && enquiry) {
        onUpdate({ ...enquiry, status: 'converted', converted_to_order_id: result.order.id });
      }

      // Navigate to the new order
      navigate(`/orders?orderId=${result.order.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to convert to order');
    } finally {
      setConverting(false);
    }
  };

  // Handle assign
  const handleAssign = async () => {
    if (!assignToId) {
      toast.error('Please select a user to assign');
      return;
    }

    setAssigning(true);
    try {
      await assignEnquiry(id, assignToId);
      toast.success('Enquiry assigned successfully');
      setIsAssignDialogOpen(false);
      setAssignToId('');

      // Refresh enquiry data to show updated assignment
      await fetchEnquiryById(id);

      // Notify parent if provided
      if (onUpdate && enquiry) {
        onUpdate({ ...enquiry, assigned_to_id: assignToId });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign enquiry');
    } finally {
      setAssigning(false);
    }
  };

  // Handle add follow-up
  const handleAddFollowUp = async () => {
    if (!followUpDate) {
      toast.error('Please select a follow-up date');
      return;
    }

    setAddingFollowUp(true);
    try {
      await enquiryService.addFollowUp(id, {
        follow_up_at: followUpDate,
        notes: followUpNotes
      });

      toast.success('Follow-up scheduled successfully');
      setIsFollowUpDialogOpen(false);
      setFollowUpDate('');
      setFollowUpNotes('');

      // Refresh enquiry to get updated status
      await fetchEnquiryById(id);
      // Refresh follow-ups list
      await fetchFollowUps();

      // Notify parent if provided
      if (onUpdate && enquiry) {
        onUpdate({ ...enquiry, followup_date: followUpDate, status: 'needs_followup' });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to schedule follow-up');
    } finally {
      setAddingFollowUp(false);
    }
  };

  // Get badge variant for status
  const getBadgeVariant = (statusValue) => {
    const color = ENQUIRY_STATUS_COLORS[statusValue] || 'gray';
    return color || 'secondary';
  };

  // Get Badge2 variant for sentiment
  const getSentimentBadgeVariant = (sentimentValue) => {
    const color = SENTIMENT_COLORS[sentimentValue] || 'gray';
    return color || 'secondary';
  };

  // Check if follow-up is needed (follow-up date in the past or today)
  const isFollowUpNeeded = (followupDate) => {
    if (!followupDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followup = new Date(followupDate);
    followup.setHours(0, 0, 0, 0);
    return followup <= today;
  };

  const isInitialLoading = !enquiry || (loading && String(enquiry.id) !== String(id));

  if (isInitialLoading) {
    return (
      <div className="md:p-6">
        {/* Header Skeleton - Mobile App Style */}
        <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0 mb-4 md:mb-6">
          <div className="flex items-center gap-2 p-3 md:p-0 md:py-0">
            <Skeleton className="h-9 w-9 md:h-10 md:w-10 rounded-md shrink-0" />
            <Skeleton className="h-6 md:h-8 flex-1 max-w-50" />
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="px-4 md:px-0 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="md:p-6">
      {/* Mobile App-Style Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-b shadow-sm md:relative md:border-0 md:shadow-none mb-4 md:mb-6">
        <div className="flex items-center justify-between gap-2 p-3 md:p-0 md:py-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            {onClose ? (
              <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-9 w-9 md:h-10 md:w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => navigate('/enquiries')} className="shrink-0 h-9 w-9 md:h-10 md:w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-base md:text-2xl font-bold truncate flex items-center flex-wrap gap-2">
                <span>Enquiry Details</span>
              </h1>
              <p className="text-[10px] md:text-sm text-muted-foreground truncate  md:block">
                Updated {formatDateTime(enquiry.updated_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="px-4 pb-20 md:px-0 md:pb-0 space-y-4 md:space-y-6">
        {/* Next Follow-up Alert */}
        {(() => {
          const nextFollowUp = getNextFollowUp();
          if (!nextFollowUp) return null;

          const followUpDate = new Date(nextFollowUp.follow_up_at);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          followUpDate.setHours(0, 0, 0, 0);

          const isOverdue = followUpDate < today;
          const isToday = followUpDate.getTime() === today.getTime();

          return (
            <Card className={`p-3 md:p-4 border-l-4 ${isOverdue ? 'border-l-red-500 bg-red-50' : isToday ? 'border-l-orange-500 bg-orange-50' : 'border-l-blue-500 bg-blue-50'}`}>
              <div className="flex items-center justify-between gap-2 md:gap-3">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <div className={`p-1.5 md:p-2 rounded-full shrink-0 ${isOverdue ? 'bg-red-100' : isToday ? 'bg-orange-100' : 'bg-blue-100'}`}>
                    <Bell className={`h-4 w-4 md:h-5 md:w-5 ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs md:text-sm">
                      {isOverdue ? 'Overdue Follow-up' : isToday ? 'Follow-up Today' : 'Upcoming Follow-up'}
                    </p>
                    <p className="text-xs md:text-sm text-gray-700 truncate">
                      <span className="font-medium">{formatDate(nextFollowUp.follow_up_at)}</span>
                      {nextFollowUp.notes && <span className="hidden sm:inline text-gray-600"> • {nextFollowUp.notes}</span>}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isOverdue || isToday ? 'default' : 'outline'}
                  onClick={() => setIsFollowUpDialogOpen(true)}
                  className="shrink-0 text-xs md:text-sm"
                >
                  <span className="hidden sm:inline">Update Follow-up</span>
                  <span className="sm:hidden">Update</span>
                </Button>
              </div>
            </Card>
          );
        })()}

        {/* Status and Sentiment Badges */}
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          <Badge2 variant={getBadgeVariant(enquiry.status)} className="px-2 md:px-3 py-1 text-xs md:text-sm">
            {ENQUIRY_STATUS_LABELS[enquiry.status]}
          </Badge2>
          <Badge2 variant="info" className="px-2 md:px-3 py-1 text-xs md:text-sm">
            <Megaphone strokeWidth={2} className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
            {ENQUIRY_SOURCE_LABELS[enquiry.source]}
          </Badge2>
          {enquiry?.converted_to_order_number && (
            <Badge2
              variant="success"
              className="text-[10px] md:text-xs bg-green-100 hover:bg-green-200 text-green-800 border-green-200 rounded-full px-2.5 py-0.5 cursor-pointer font-semibold shrink-0"
              onClick={() => {
                if (onClose) onClose();
                navigate(`/orders/${enquiry.converted_to_order_id}`);
              }}
            >
              Order #{enquiry.converted_to_order_number}
            </Badge2>
          )}
          {enquiry.followup_date && isFollowUpNeeded(enquiry.followup_date) && (
            <Badge2 variant="destructive" className="px-2 md:px-3 py-1 text-xs md:text-sm">
              <Bell className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
              <span className="hidden sm:inline">Follow-up Needed</span>
              <span className="sm:hidden">Follow-up</span>
            </Badge2>
          )}
        </div>

        <div className="grid gap-4 md:gap-6">
          {/* Contact Information Card */}
          <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold">Customer Details</h2>
              {loadingCustomerStats ? (
                <Skeleton className="h-6 w-24 rounded-full shrink-0" />
              ) : customerOrdersCount !== null ? (
                <Badge2 variant="secondary" className="text-xs font-semibold gap-1 bg-gray-100 text-gray-700">
                  <ShoppingCart className="h-3 w-3 text-primary" />
                  {customerOrdersCount} {customerOrdersCount === 1 ? 'Booking' : 'Bookings'}
                </Badge2>
              ) : null}
            </div>

            <div className="flex items-start gap-2 md:gap-4">

              <div className="flex-1 space-y-2.5 min-w-0">
                <div>
                  <h2 className="text-sm md:text-md font-semibold capitalize truncate flex justify-between items-center gap-2">
                    <span className='flex gap-2'>
                      <LetterAvatar
                        name={enquiry.customer?.name || enquiry.contact_name || 'Unknown'}
                        size="sm"
                        className="cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                        onClick={() => {
                          if (enquiry.customer || enquiry.customer_id) {
                            setIsCustomerDetailsOpen(true);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (enquiry.customer || enquiry.customer_id) {
                            setIsCustomerDetailsOpen(true);
                          }
                        }}
                        className={`text-left capitalize underline font-bold text-foreground ${(enquiry.customer || enquiry.customer_id) ? 'hover:text-primary hover:underline cursor-pointer' : ''}`}
                      >
                        {enquiry.customer?.name || enquiry.contact_name || 'N/A'}
                      </button>
                    </span>
                    {
                      enquiry.sentiment && <Badge2 variant={getSentimentBadgeVariant(enquiry.sentiment)}>
                        {SENTIMENT_EMOJIS[enquiry.sentiment]} {SENTIMENT_LABELS[enquiry.sentiment]}
                      </Badge2>
                    }
                  </h2>
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mt-1.5 text-xs md:text-sm">
                    <CustomerContact
                      phone={enquiry.contact_phone}
                      customerName={enquiry.customer?.name || enquiry.contact_name || 'Customer'}
                    />
                    {enquiry.preferred_date && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                        Preferred: {formatDate(enquiry.preferred_date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Customer Location & Booking Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t text-xs">
                  {/* Total Bookings & Last Booked */}
                  <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3 text-primary" />
                        Booking History
                      </span>
                      {loadingCustomerStats ? (
                        <Skeleton className="h-4 w-12 rounded" />
                      ) : (
                        <span className="font-bold text-primary">
                          {customerOrdersCount || 0} Total
                        </span>
                      )}
                    </div>

                    {loadingCustomerStats ? (
                      <div className="pt-1.5 space-y-1.5">
                        <Skeleton className="h-3.5 w-32 rounded" />
                        <Skeleton className="h-3 w-24 rounded" />
                      </div>
                    ) : lastBookingInfo ? (
                      <div className="pt-1 text-gray-700">
                        <div className="flex items-center gap-1 font-medium text-xs">
                          <Clock className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>Last Booked:</span>
                          <span className="font-semibold">{formatDate(lastBookingInfo.booking_date || lastBookingInfo.created_at)}</span>
                        </div>
                        {formatBookingTime(lastBookingInfo.booking_time_from, lastBookingInfo.booking_time_to) && (
                          <p className="text-[11px] text-muted-foreground pl-4">
                            Slot: {formatBookingTime(lastBookingInfo.booking_time_from, lastBookingInfo.booking_time_to)}
                          </p>
                        )}
                      </div>
                    ) : (customerInfo?.last_booked_at || enquiry?.customer?.last_booked_at) ? (
                      <div className="pt-1 text-gray-700">
                        <div className="flex items-center gap-1 font-medium text-xs">
                          <Clock className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>Last Booked:</span>
                          <span className="font-semibold">{formatDate(customerInfo?.last_booked_at || enquiry?.customer?.last_booked_at)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic pt-0.5">
                        No previous bookings recorded
                      </p>
                    )}
                  </div>

                  {/* Customer Location */}
                  <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-rose-500" />
                        Customer Location
                      </span>
                      {(customerInfo?.map_link || enquiry?.map_link) && (
                        <a
                          href={customerInfo?.map_link || enquiry?.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
                        >
                          Map <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>

                    {loadingCustomerStats ? (
                      <div className="pt-1.5 space-y-1">
                        <Skeleton className="h-3.5 w-full rounded" />
                      </div>
                    ) : (
                      (() => {
                        const area = customerInfo?.area || enquiry?.area;
                        const city = customerInfo?.city || enquiry?.city;
                        const addressLine = customerInfo?.address_line1 || enquiry?.address;
                        const locationStr = [addressLine, area, city].filter(Boolean).join(', ');

                        if (locationStr) {
                          return (
                            <p className="text-xs font-medium text-gray-700 leading-tight pt-0.5 truncate" title={locationStr}>
                              {locationStr}
                            </p>
                          );
                        }
                        return (
                          <p className="text-[11px] text-muted-foreground italic pt-0.5">
                            No location specified
                          </p>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Enquiry Details Card */}
          {/* Contact Information Card */}
          <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold">Enquiry Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsRequirementsDialogOpen(true);
                }}
                className="h-8 px-2.5 text-xs font-semibold gap-1 text-primary hover:text-primary/80 hover:bg-primary/5 cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" />
                {enquiry.requirements ? 'Edit Requirements' : '+ Add Requirements'}
              </Button>
            </div>

            <div className="space-y-2.5 md:space-y-3">
              {/* Parse requirements to show structured data */}
              {enquiry.requirements && (() => {
                const lines = enquiry.requirements.split('\n').filter(line => line.trim());
                const vehicleType = lines.find(line => line.startsWith('Vehicle Type:'))?.replace('Vehicle Type:', '').trim();
                const packages = lines.find(line => line.startsWith('Packages:'))?.replace('Packages:', '').trim();
                const addons = lines.find(line => line.startsWith('Add-ons:'))?.replace('Add-ons:', '').trim();
                const otherRequirements = lines.filter(line =>
                  !line.startsWith('Vehicle Type:') &&
                  !line.startsWith('Packages:') &&
                  !line.startsWith('Add-ons:')
                ).join('\n');

                return (
                  <>
                    {vehicleType && (
                      <div className="flex items-start gap-2 md:gap-3">
                        <Package className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 md:mt-1 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm text-muted-foreground">Vehicle Type</div>
                          <Badge2 variant="outline" className="mt-1 text-xs">{vehicleType}</Badge2>
                        </div>
                      </div>
                    )}

                    {packages && (
                      <div className="flex items-start gap-2 md:gap-3">
                        <Package className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 md:mt-1 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm text-muted-foreground">Packages</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {packages.split(',').map((pkg, idx) => (
                              <Badge2 key={idx} variant="default" className="text-[10px] md:text-xs">
                                {pkg.trim()}
                              </Badge2>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {addons && (
                      <div className="flex items-start gap-2 md:gap-3">
                        <Package className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 md:mt-1 text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm text-muted-foreground">Add-ons</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {addons.split(',').map((addon, idx) => (
                              <Badge2 key={idx} variant="success" className="text-[10px] md:text-xs">
                                {addon.trim()}
                              </Badge2>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {otherRequirements && (
                      <div className="flex items-start gap-2 md:gap-3">
                        <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 md:mt-1 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm text-muted-foreground">Additional Requirements</div>
                          <div className="text-sm md:font-medium whitespace-pre-wrap mt-1">
                            {otherRequirements}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {!enquiry.requirements && (
                <div className="flex items-start gap-2 md:gap-3 p-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs md:text-sm font-semibold text-gray-700">Requirements</div>
                      <div className="text-xs text-muted-foreground">
                        No requirements specified yet
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsRequirementsDialogOpen(true);
                      }}
                      className="h-8 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/5 shrink-0 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Requirements
                    </Button>
                  </div>
                </div>
              )}

              {enquiry.followup_date && (
                <div className="flex items-start gap-2 md:gap-3">
                  <Bell className={`h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 md:mt-1 shrink-0 ${isFollowUpNeeded(enquiry.followup_date) ? 'text-red-500' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs md:text-sm text-muted-foreground">Follow-up Date</div>
                    <div className={`text-sm font-medium ${isFollowUpNeeded(enquiry.followup_date) ? 'text-red-500' : ''}`}>
                      {formatDate(enquiry.followup_date)}
                      {isFollowUpNeeded(enquiry.followup_date) && ' (Overdue)'}
                    </div>
                    <div className='text-muted-foreground text-xs md:text-sm'>
                      Last followed up on {(() => {
                        const lastFollowUp = getLastCompletedFollowUp();
                        return lastFollowUp ? formatDateTime(lastFollowUp.follow_up_at) : 'N/A';
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {enquiry.assigned_to && (
                <div className="flex items-start gap-2 md:gap-3">
                  <UserPlus className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 md:mt-1 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs md:text-sm text-muted-foreground">Assigned To</div>
                    <div className="text-sm font-medium truncate">{enquiry.assigned_to.name}</div>
                  </div>
                </div>
              )}

              {enquiry.created_by && (
                <div className="flex items-start gap-2 md:gap-3">
                  <User className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 md:mt-1 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs md:text-sm text-muted-foreground">Created By</div>
                    <div className="text-sm font-medium flex flex-col">
                      <span className="truncate">{enquiry.created_by.name}</span>
                      <span className='text-muted-foreground text-xs'>{formatDateTime(enquiry.created_at)}</span>
                    </div>
                  </div>
                </div>
              )}

              {enquiry.converted_to_order && (
                <div className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 md:mt-1 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs md:text-sm text-muted-foreground">Converted to Order</div>
                    <a
                      href={`/orders?orderId=${enquiry.converted_to_order.id}`}
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1 truncate"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/orders?orderId=${enquiry.converted_to_order.id}`);
                      }}
                    >
                      #{enquiry.converted_to_order.order_number}
                      <ExternalLink className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                    </a>
                    <div className="text-[10px] md:text-xs text-muted-foreground truncate">
                      by {enquiry.converted_by?.name} on {formatDateTime(enquiry.converted_at)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {/* <div className="pt-4 border-t space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setIsAssignDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {enquiry.assigned_to ? 'Reassign' : 'Assign'} Enquiry
            </Button>
          </div> */}
          </Card>
        </div>

        {/* Quick Status Actions */}
        {enquiry.status !== 'converted' && (
          <Card className="p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Quick Actions</h2>

            {/* Create Order Button */}
            {enquiry.customer?.id && !enquiry.converted_to_order && (
              <div className="mb-4">
                <Button
                  onClick={() => {
                    setSelectedCustomerForOrder(enquiry.customer.id);
                    setIsOrderWizardOpen(true);
                  }}
                  className="w-full md:w-auto gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Create Order
                </Button>
              </div>
            )}

            {/* Status Change Buttons */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Update Status</h3>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {ENQUIRY_STATUS_OPTIONS.filter(s => s.value !== enquiry.status && s.value !== 'new').map((status) => (
                  <Button
                    key={status.value}
                    variant='outline'
                    size="sm"
                    onClick={() => handleQuickStatusUpdate(status.value)}
                    disabled={updatingStatus}
                    className="gap-1 md:gap-2 text-xs md:text-sm"
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : status.value === 'lost' ? (
                      <XCircle className="h-3 w-3" />
                    ) : status.value === 'converted' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : status.value === 'interested' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : status.value === 'needs_followup' ? (
                      <Bell className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Non-Customer Exclusion */}
            <div className="space-y-2 pt-4 border-t mt-4">
              <h3 className="text-sm font-medium text-muted-foreground">Exclusions</h3>
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsExcludeDialogOpen(true)}
                className="gap-1 md:gap-2 text-xs md:text-sm"
              >
                <UserX className="h-3.5 w-3.5" />
                Add to Non-Customers List
              </Button>
            </div>
          </Card>
        )}

        {/* Comments and Timeline Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comments" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Comments</span>
              <span className="sm:hidden">Notes</span>
              {comments.length > 0 && (
                <span className="ml-0.5 sm:ml-1 bg-primary text-primary-foreground rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs">
                  {comments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Status Timeline</span>
              <span className="sm:hidden">Timeline</span>
              {enquiry.status_logs && enquiry.status_logs.length > 0 && (
                <span className="ml-0.5 sm:ml-1 bg-primary text-primary-foreground rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs">
                  {enquiry.status_logs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-4">
            <Card className="p-4 md:p-6">
              {/* Add Comment Form */}
              <div className="space-y-3 mb-4 md:mb-6 pb-4 md:pb-6 border-b">
                <div className="flex gap-2 md:gap-3">
                  <div className="flex-1 space-y-3">
                    <div className='border rounded-lg shadow-sm'>
                      <Textarea
                        placeholder="Add a comment about this enquiry..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={4}
                        className="resize-none border-0 shadow-none focus:ring-0 focus-visible:ring-0 text-sm md:text-base"
                      />

                      {/* Voice Note Recorder */}
                      <div className='border-t p-2 md:p-2'>
                        <VoiceNoteRecorder
                          key={voiceRecorderKey}
                          onRecordingComplete={handleVoiceNoteComplete}
                          onDelete={handleVoiceNoteDelete}
                          onRecordingStateChange={handleRecordingStateChange}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="customer-response"
                          checked={isCustomerResponse}
                          onCheckedChange={setIsCustomerResponse}
                        />
                        <label
                          htmlFor="customer-response"
                          className="text-sm sm:text-sm font-medium cursor-pointer flex items-center gap-1"
                        >
                          <span className="hidden sm:inline">Customer Comment</span>
                          <span className="sm:hidden">Customer Comment</span>
                        </label>
                      </div>

                      {/* {isRecordingInProgress && (
                      <span className="text-sm text-orange-600 font-medium">
                        Click Stop (■) to finish recording
                      </span>
                    )} */}

                      <Button
                        onClick={handleAddComment}
                        disabled={addingComment || (!newComment.trim() && !voiceNoteBlob) || isRecordingInProgress}
                        size="sm"
                        className="gap-1 sm:gap-2 w-full sm:w-auto"
                      >
                        {addingComment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        <span className="text-xs sm:text-sm">Add Comment</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-3 md:space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
                    <p className="text-xs md:text-sm">No comments yet. Add the first comment above.</p>
                  </div>
                ) : (
                  <>
                    <div className="text-xs md:text-sm font-medium text-muted-foreground mb-2 md:mb-3">
                      {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                    </div>
                    {comments.map((comment) => {
                      const isCustomer = comment.is_customer_response;
                      return (
                        <div
                          key={comment.id}
                          id={`comment-${comment.id}`}
                          className="flex w-full justify-start"
                        >
                          <div
                            className={`flex gap-2 md:gap-3 p-3 md:p-4 rounded-lg transition-all w-full hover:shadow-sm ${isCustomer
                              ? 'mr-5 md:mr-10 bg-blue-50 border border-blue-200 text-left'
                              : 'ml-5 md:ml-10 bg-white border border-gray-200 text-left'
                              }`}
                          >
                            <LetterAvatar
                              name={comment.comment_by_customer?.name || comment.comment_by_user?.name || comment.created_by?.name || 'Unknown User'}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2 mb-2">
                                <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                  <span className="font-semibold text-xs md:text-sm">
                                    {comment.comment_by_customer?.name || comment.comment_by_user?.name || comment.created_by?.name || 'Unknown User'}
                                  </span>
                                  {isCustomer && (
                                    <Badge2 variant="info" className="text-xs md:text-xs h-4 md:h-5">
                                      <span className="hidden sm:inline">Customer Comment</span>
                                      <span className="sm:hidden">Customer Comment</span>
                                    </Badge2>
                                  )}
                                  {comment.voice_note_url && (
                                    <Badge2 variant="outline" className="text-[10px] md:text-xs h-4 md:h-5">
                                      <Volume2 className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                                      <span className="hidden sm:inline">Voice Note</span>
                                      <span className="sm:hidden">Voice</span>
                                    </Badge2>
                                  )}
                                  {comment.image_url && (
                                    <Badge2 variant="outline" className="text-[10px] md:text-xs h-4 md:h-5">
                                      <span className="hidden sm:inline">📷 Image</span>
                                      <span className="sm:hidden">📷</span>
                                    </Badge2>
                                  )}
                                </div>
                                <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDateTime(comment.created_at)}
                                </span>
                              </div>
                              {comment.image_url && sanitizeImageUrl(comment.image_url) && (
                                <div className="w-full mt-2 mb-2">
                                  <a
                                    href={isValidUrl(comment.image_url) ? comment.image_url : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                    onClick={(e) => {
                                      if (!isValidUrl(comment.image_url)) {
                                        e.preventDefault();
                                      }
                                    }}
                                  >
                                    <img
                                      src={sanitizeImageUrl(comment.image_url)}
                                      alt="WhatsApp image"
                                      className="max-w-full h-auto rounded-lg border border-gray-200 hover:opacity-90 transition-opacity cursor-pointer max-h-50 object-contain"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EImage not available%3C/text%3E%3C/svg%3E';
                                      }}
                                    />
                                  </a>
                                </div>
                              )}
                              {comment.voice_note_url && (
                                <div className="w-full mt-1 mb-2">
                                  <WaveformPlayer
                                    audioUrl={comment.voice_note_url}
                                    duration={comment.voice_note_duration || 0}
                                    isPlaying={activeAudioUrl === comment.voice_note_url}
                                    onPlay={() => handleAudioPlay(comment.voice_note_url)}
                                    onPause={() => handleAudioPause(comment.voice_note_url)}
                                    onFinish={() => handleAudioFinish(comment.voice_note_url)}
                                  />
                                </div>
                              )}
                              {comment.text && (
                                <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed break-words">
                                  {comment.text}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-4">
            <Card className="p-4 md:p-6">
              <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Status Timeline</h2>
              {enquiry.status_logs && enquiry.status_logs.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {enquiry.status_logs.map((log, index) => (
                    <div key={index} className="flex gap-2.5 md:gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                        {index < enquiry.status_logs.length - 1 && (
                          <div className="w-0.5 h-full bg-muted flex-1 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3 md:pb-4">
                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                          {log.from_status && (
                            <>
                              <Badge2 variant="outline" className="text-[10px] md:text-xs">
                                {ENQUIRY_STATUS_LABELS[log.from_status]}
                              </Badge2>
                              <span className="text-muted-foreground text-xs">→</span>
                            </>
                          )}
                          <Badge2 variant={getBadgeVariant(log.to_status)} className="text-[10px] md:text-xs">
                            {ENQUIRY_STATUS_LABELS[log.to_status]}
                          </Badge2>
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground mt-1">
                          <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 inline mr-1" />
                          {formatDateTime(log.changed_at)}
                        </div>
                        {log.changed_by && (
                          <div className="text-xs md:text-sm text-muted-foreground">
                            <User className="h-2.5 w-2.5 md:h-3 md:w-3 inline mr-1" />
                            {log.changed_by.name}
                          </div>
                        )}
                        {log.notes && (
                          <div className="text-xs md:text-sm mt-2 p-2 bg-muted rounded">
                            {log.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 md:py-8 text-muted-foreground">
                  <Clock className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs md:text-sm">No status changes yet.</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Assign Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Enquiry</DialogTitle>
              <DialogDescription>
                Assign this enquiry to a sales executive
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sales Executive</label>
                <Input
                  type="number"
                  value={assignToId}
                  onChange={(e) => setAssignToId(e.target.value)}
                  placeholder="Enter user ID"
                />
                <p className="text-xs text-muted-foreground">
                  TODO: Replace with user dropdown when users list is available
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssign} disabled={assigning}>
                {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Follow-up Dialog */}
        <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Follow-up</DialogTitle>
              <DialogDescription>
                Set a future date for following up with this enquiry
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Follow-up Date *</label>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Select a future date for the follow-up
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Add any notes about this follow-up..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFollowUpDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddFollowUp} disabled={addingFollowUp || !followUpDate}>
                {addingFollowUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Schedule Follow-up
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lost Reason Dialog */}
        <Dialog open={isLostReasonDialogOpen} onOpenChange={setIsLostReasonDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Enquiry as Lost</DialogTitle>
              <DialogDescription>
                Please provide a reason for marking this enquiry as lost
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason *</label>
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LOST_REASON_OPTIONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This reason will be saved in the status timeline
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsLostReasonDialogOpen(false);
                  setLostReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLostStatusUpdate}
                disabled={updatingLostStatus || !lostReason.trim()}
              >
                {updatingLostStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Mark as Lost
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Convert to Order Confirmation */}
        <AlertDialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Convert to Order?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new order from this enquiry. The enquiry status will be changed to "Converted".
                You can complete the order details after conversion.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConvertToOrder} disabled={converting}>
                {converting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Convert to Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Mark as Converted Confirmation */}
        <AlertDialog open={isConvertStatusDialogOpen} onOpenChange={setIsConvertStatusDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as Converted?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the enquiry status as "Converted" without creating an order.
                Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  setIsConvertStatusDialogOpen(false);
                  setUpdatingStatus(true);
                  try {
                    await updateEnquiryStatus(id, 'converted', '');
                    toast.success('Status updated to converted');

                    // Refresh enquiry data to show updated status logs and timestamps
                    await fetchEnquiryById(id);

                    // Notify parent if provided
                    if (onUpdate && enquiry) {
                      onUpdate({ ...enquiry, status: 'converted' });
                    }
                  } catch (error) {
                    toast.error(error.response?.data?.error || 'Failed to update status');
                  } finally {
                    setUpdatingStatus(false);
                  }
                }}
                disabled={updatingStatus}
              >
                {updatingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Mark as Converted
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Exclude/Non-customer Confirmation */}
        <AlertDialog open={isExcludeDialogOpen} onOpenChange={setIsExcludeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Add to Non-Customers List?</AlertDialogTitle>
              <AlertDialogDescription>
                New chats won't create new enquiries. Are you sure you want to add this number to the non-customers list?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAddToNonCustomers}
                disabled={excluding}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {excluding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add to List
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Order Wizard */}
        <OrderWizard
          open={isOrderWizardOpen}
          onOpenChange={setIsOrderWizardOpen}
          customerId={selectedCustomerForOrder}
          enquiryId={id}
          onSuccess={() => {
            setIsOrderWizardOpen(false);
            setSelectedCustomerForOrder(null);
            // Refresh enquiry data to show updated converted status
            fetchEnquiryById(id);
            toast.success('Order created successfully from enquiry');
          }}
        />

        {/* Customer Details Dialog */}
        <CustomerDetails
          customer={enquiry.customer || { id: enquiry.customer_id, name: enquiry.contact_name, phone: enquiry.contact_phone }}
          open={isCustomerDetailsOpen}
          onOpenChange={setIsCustomerDetailsOpen}
        />

        {/* Add / Edit Requirements Dialog (Same fields as New Enquiry) */}
        <Dialog open={isRequirementsDialogOpen} onOpenChange={setIsRequirementsDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{enquiry?.requirements ? 'Edit Requirements' : 'Add Requirements'}</DialogTitle>
              <DialogDescription>
                Select vehicle type, packages, add-ons, and enter specific requirement notes.
              </DialogDescription>
            </DialogHeader>

            {loadingPackagesAddons ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading packages and add-ons...</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {/* Vehicle Type - Selectable Pills */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Vehicle Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Hatchback', 'Sedan', 'SUV', 'Luxury'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setReqVehicleType(type);
                          setReqSelectedPackageIds([]);
                        }}
                        className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all select-none cursor-pointer ${reqVehicleType?.toLowerCase() === type.toLowerCase()
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Packages - Multi-select dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {reqVehicleType ? `Packages (${reqVehicleType})` : 'Packages'}
                  </label>
                  <Select
                    value={reqSelectedPackageIds[reqSelectedPackageIds.length - 1]?.toString() || ''}
                    onValueChange={(value) => {
                      const packageId = parseInt(value);
                      if (!reqSelectedPackageIds.includes(packageId)) {
                        setReqSelectedPackageIds(prev => [...prev, packageId]);
                      }
                    }}
                    disabled={!reqVehicleType}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={reqVehicleType ? "Select packages..." : "Select vehicle type first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePackages
                        .filter((p) => !reqVehicleType || p.vehicle_type?.toLowerCase() === reqVehicleType?.toLowerCase())
                        .map((pkg) => (
                          <SelectItem key={pkg.id} value={String(pkg.id)}>
                            {pkg.name} - ₹{pkg.unit_price || pkg.price || pkg.base_price}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {/* Selected package badges */}
                  {reqSelectedPackageIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {reqSelectedPackageIds.map((id) => {
                        const pkg = availablePackages.find(p => p.id === id);
                        return pkg ? (
                          <Badge2 key={id} variant="default" className="text-xs gap-1">
                            {pkg.name}
                            <button
                              type="button"
                              onClick={() => setReqSelectedPackageIds(prev => prev.filter(pId => pId !== id))}
                              className="ml-1 hover:bg-white/20 rounded-full cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge2>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Add-ons - Multi-select dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Add-ons</label>
                  <Select
                    value={reqSelectedAddonIds[reqSelectedAddonIds.length - 1]?.toString() || ''}
                    onValueChange={(value) => {
                      const addonId = parseInt(value);
                      if (!reqSelectedAddonIds.includes(addonId)) {
                        setReqSelectedAddonIds(prev => [...prev, addonId]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select add-ons..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAddons.map((addon) => (
                        <SelectItem key={addon.id} value={String(addon.id)}>
                          {addon.name} - ₹{addon.unit_price || addon.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Selected addon badges */}
                  {reqSelectedAddonIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {reqSelectedAddonIds.map((id) => {
                        const addon = availableAddons.find(a => a.id === id);
                        return addon ? (
                          <Badge2 key={id} variant="success" className="text-xs gap-1">
                            {addon.name}
                            <button
                              type="button"
                              onClick={() => setReqSelectedAddonIds(prev => prev.filter(aId => aId !== id))}
                              className="ml-1 hover:bg-white/20 rounded-full cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge2>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Additional Requirements */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Additional Requirements / Notes</label>
                  <Textarea
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    placeholder="Any specific requirements or notes..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsRequirementsDialogOpen(false)}
                disabled={savingRequirements}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRequirements}
                disabled={savingRequirements || loadingPackagesAddons}
                className="gap-1.5 bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                {savingRequirements && <Loader2 className="h-4 w-4 animate-spin" />}
                {enquiry?.requirements ? 'Save Changes' : 'Add Requirements'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EnquiryDetail;
