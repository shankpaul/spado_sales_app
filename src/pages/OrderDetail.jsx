import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * Order Detail Page
 * Shows comprehensive order information with tabs for overview, items, timeline, reassignments
 */
const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
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
    try {
      await orderService.updateOrderStatus(id, newStatus);
      toast.success('Status updated successfully');
      fetchOrderDetails();
      fetchTimeline();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
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

  // Format date/time
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
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

  // Get badge variant
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
  const handleReassignAgent = async (newAgentId) => {
    try {
      await orderService.reassignOrder(id, newAgentId);
      toast.success('Agent reassigned successfully');
      fetchOrderDetails();
      fetchTimeline();
      fetchReassignments();
    } catch (error) {
      console.error('Error reassigning agent:', error);
      toast.error('Failed to reassign agent');
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

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <div className="border-b sticky top-0 z-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/orders')}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold">Order-{order.order_number}</h1>
                <Badge variant={getBadgeVariant(order.status, 'order')} className="text-xs">
                  {getStatusLabel(order.status, ORDER_STATUSES)}
                </Badge>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-sm">
             
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              </div>
            </div>

            {/* Service Location */}
            <div className="py-4 px-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Service at</span>
                  <span>{order.area || 'N/A'}, {order.city || 'N/A'}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Booking Date {formatDate(order.booking_date)} at {order.booking_time_from || 'N/A'}
                </span>
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
                        <div className={`text-xs mb-1 ${
                          isActive && !isCancelled ? 'font-semibold text-foreground' : 
                          isCompleted && !isCancelled ? 'font-medium text-foreground' : 
                          'text-muted-foreground'
                        }`}>
                          {stage}
                        </div>
                        <div className={`w-full h-1 rounded-full ${
                          isCancelled ? 'bg-red-200' :
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
                  <Button
                    variant="outline"
                    onClick={() => setIsCancelDialogOpen(true)}
                    className="flex-1"
                  >
                    Cancel Order
                  </Button>
                  <Button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Edit Order
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="packages" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-transparent border-b rounded-none h-auto p-0">
                <TabsTrigger
                  value="packages"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
                >
                  Packages & Addons
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
                >
                  Timeline
                </TabsTrigger>
                <TabsTrigger
                  value="reassignments"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
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
                    <Badge variant="outline" className="text-xs">{order.packages?.length || 0} items</Badge>
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
                      <Badge variant="outline" className="text-xs">{order.addons.length} items</Badge>
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

                {/* Payment Details */}
                <div className="pt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Payment Details</h3>
                    <Badge variant={getBadgeVariant(order.payment_status, 'payment')}>
                      {getStatusLabel(order.payment_status, PAYMENT_STATUSES)}
                    </Badge>
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

                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-bold">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="mt-6">
                <div className="space-y-6">
                  {timeline.length > 0 ? (
                    timeline.map((event, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            event.type === 'created' || event.type === 'status_changed'
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
                
                {!['in_progress', 'completed', 'cancelled'].includes(order.status) && agents.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Reassign to
                    </label>
                    <Select
                      value={order.assigned_agent?.id ? String(order.assigned_agent.id) : ''}
                      onValueChange={handleReassignAgent}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={String(agent.id)}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                <div className="flex items-center gap-3 mb-4">
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
                {order.map_link ? (
                  <div className="mb-4 rounded-lg overflow-hidden border">
                    <iframe
                      src={order.map_link.replace('/maps?', '/maps/embed?').replace('/maps/place/', '/maps/embed?pb=')}
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="mb-4 rounded-lg overflow-hidden bg-gray-50 h-32 flex items-center justify-center border">
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
                  <Badge
                    variant="secondary"
                    className="justify-between bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer h-auto py-2 px-3 font-normal group"
                    onClick={() => copyToClipboard(order.customer.email)}
                  >
                    <span>{order.customer.email}</span>
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Badge>
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
        }}
      />

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
