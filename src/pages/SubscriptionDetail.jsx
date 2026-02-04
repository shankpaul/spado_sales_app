import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { DatePicker } from '../components/ui/date-picker';
import { toast } from 'sonner';
import subscriptionService from '../services/subscriptionService';
import {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_PAYMENT_STATUSES,
  PAYMENT_METHODS,
  ORDER_STATUSES,
  getStatusLabel,
  getStatusColor,
} from '../lib/constants';
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  MapPin,
  Package,
  IndianRupee,
  Edit,
  Pause,
  Play,
  XCircle,
  Loader2,
  Clock,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

/**
 * Subscription Detail Page
 * Displays detailed subscription information with actions
 */
const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  // Dialog states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSubscriptionDetails();
      fetchSubscriptionOrders();
    }
  }, [id]);

  const fetchSubscriptionDetails = async () => {
    setLoading(true);
    try {
      const data = await subscriptionService.getSubscriptionById(id);
      setSubscription(data.subscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionOrders = async () => {
    try {
      const data = await subscriptionService.getSubscriptionOrders(id);
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handlePauseResume = async () => {
    try {
      if (subscription.status === 'active') {
        await subscriptionService.pauseSubscription(id);
        toast.success('Subscription paused successfully');
      } else if (subscription.status === 'paused') {
        await subscriptionService.resumeSubscription(id);
        toast.success('Subscription resumed successfully');
      }
      fetchSubscriptionDetails();
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await subscriptionService.cancelSubscription(id);
      toast.success('Subscription cancelled successfully');
      setIsCancelDialogOpen(false);
      fetchSubscriptionDetails();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
    }
  };

  const handleUpdatePayment = async () => {
    if (!paymentAmount || !paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }

    setPaymentLoading(true);
    try {
      await subscriptionService.updatePayment(id, {
        payment_amount: parseFloat(paymentAmount),
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
      });
      toast.success('Payment updated successfully');
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentDate('');
      setPaymentMethod('');
      fetchSubscriptionDetails();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getBadgeVariant = (status, type = 'status') => {
    if (type === 'order') {
      const color = getStatusColor(status, ORDER_STATUSES);
      const variantMap = {
        gray: 'secondary',
        blue: 'default',
        green: 'success', // Assuming you have a success variant or map to default/secondary
        red: 'destructive',
        yellow: 'warning', // custom variant?
        purple: 'outline',
      };
      // Fallback to standard variants if custom ones don't exist in Badge
      return variantMap[color] || 'outline';
    }

    if (type === 'payment' && status === 'pending') {
      return 'destructive';
    }

    if (type === 'status' && status === 'active') {
      return 'success';
    }

    if (type === 'order' && status === 'completed') {
      return 'secondary';
    }

    const statusArray = type === 'payment' ? SUBSCRIPTION_PAYMENT_STATUSES : SUBSCRIPTION_STATUSES;
    const statusObj = statusArray.find(s => s.value === status);
    return statusObj?.variant || 'outline';
  };

  const canUpdatePayment = subscription && ['pending', 'partial'].includes(subscription.payment_status);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Subscription not found</p>
          <Button onClick={() => navigate('/subscriptions')} className="mt-4">
            Back to Subscriptions
          </Button>
        </div>
      </div>
    );
  }

  const totalAmount = subscription.subscription_amount
  const subscriptionTotal = totalAmount * subscription.months_duration;
  const balance = subscriptionTotal - (subscription.payment_amount || 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/subscriptions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Subscription Details</h1>
            <p className="text-sm text-muted-foreground">ID: {subscription.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(subscription.status === 'active' || subscription.status === 'paused') && (
            <>
              <Button variant="outline" onClick={handlePauseResume}>
                {subscription.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                )}
              </Button>
              <Button variant="destructive" onClick={() => setIsCancelDialogOpen(true)}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={getBadgeVariant(subscription.status)} className="text-sm">
          {getStatusLabel(subscription.status, SUBSCRIPTION_STATUSES)}
        </Badge>
        <Badge variant={getBadgeVariant(subscription.payment_status, 'payment')} className="text-sm">
          Payment: {getStatusLabel(subscription.payment_status, SUBSCRIPTION_PAYMENT_STATUSES)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{subscription.customer?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{subscription.customer?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Service Location</p>
                  <p className="font-medium">{subscription.area}</p>
                  {subscription.map_url && (
                    <a
                      href={subscription.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View on Map
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Subscription Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Subscription Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vehicle Type</p>
                <p className="font-medium capitalize">{subscription.vehicle_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{subscription.months_duration} month(s)</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatDate(subscription.start_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {formatDate(new Date(new Date(subscription.start_date).setMonth(
                    new Date(subscription.start_date).getMonth() + subscription.months_duration
                  )))}
                </p>
              </div>
            </div>
          </Card>

          {/* Packages */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Packages</h2>
            <div className="space-y-3">
              {subscription.subscription_packages?.map((pkg, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{pkg.package.name || `Package ${index + 1}`}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {pkg.quantity} × {formatCurrency(pkg.unit_price)}
                        {pkg.discount_value > 0 && ` - ${formatCurrency(pkg.discount_value)} discount`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(pkg.price)}</p>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Addons */}
          {subscription.addons?.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Add-ons</h2>
              <div className="space-y-3">
                {subscription.addons.map((addon, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{addon.addon_name || `Add-on ${index + 1}`}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {addon.quantity} × {formatCurrency(addon.unit_price)}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(addon.price)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}



          {/* Notes */}
          {subscription.notes && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">Notes</h2>
              <p className="text-muted-foreground">{subscription.notes}</p>
            </Card>
          )}

          {/* Order History */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              Order History ({orders.length})
            </h2>
            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell
                          className="font-medium hover:underline cursor-pointer text-primary"
                          onClick={() => navigate(`/orders?orderId=${order.id}`)}
                        >
                          #{order.order_number}
                        </TableCell>
                        <TableCell>{formatDate(order.booking_date)}</TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(order.status, 'order')}>
                            {getStatusLabel(order.status, ORDER_STATUSES)}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.assigned_agent_name || <Badge variant="destructive">Unassigned</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No orders generated yet.
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Payment Summary</h2>
              {canUpdatePayment && (
                <Button size="sm" variant="outline" onClick={() => setIsPaymentDialogOpen(true)}>
                  <Edit className="h-3 w-3 mr-1" />
                  Update
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Per Month:</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{subscription.months_duration} month(s)</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-semibold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(subscriptionTotal)}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(subscription.payment_amount)}
                </span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className="font-medium text-orange-600">{formatCurrency(balance)}</span>
                </div>
              )}
              {subscription.payment_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Payment:</span>
                  <span className="font-medium">{formatDate(subscription.payment_date)}</span>
                </div>
              )}
              {subscription.payment_method && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Method:</span>
                  <span className="font-medium capitalize">{subscription.payment_method}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Statistics</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Washes:</span>
                <span className="font-medium">{subscription.washing_schedules?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completed:</span>
                <span className="font-medium text-green-600">
                  {orders.filter(o => o.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending:</span>
                <span className="font-medium text-orange-600">
                  {(subscription.washing_schedules?.length || 0) - orders.length}
                </span>
              </div>
            </div>
          </Card>

          {/* Washing Schedules */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              Washing Schedules ({subscription.washing_schedules?.length || 0})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {subscription.washing_schedules?.map((schedule, index) => {
                const order = orders.find(o => o.booking_date === schedule.date);

                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-sm text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{formatDate(schedule.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.time_from} - {schedule.time_to}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {order ? (
                        <>
                          {order.status === 'cancelled' ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancelled
                            </Badge>
                          ) : order.status === 'completed' ? (
                            <Badge variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-transparent">
                              <Clock className="h-3 w-3 mr-1" />
                              Scheduled
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Update Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment</DialogTitle>
            <DialogDescription>
              Record a new payment for this subscription
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="paymentAmount">Payment Amount *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-6 text-xs px-2"
                  onClick={() => setPaymentAmount(Math.max(0, balance).toString())}
                >
                  Max: {formatCurrency(balance)}
                </Button>
              </div>
              <Input
                id="paymentAmount"
                type="number"
                min="0"
                max={balance}
                value={paymentAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > balance) {
                    setPaymentAmount(balance.toString());
                    toast.error(`Amount cannot exceed balance of ${formatCurrency(balance)}`);
                  } else {
                    setPaymentAmount(e.target.value);
                  }
                }}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label htmlFor="paymentDate">Payment Date</Label>
              <DatePicker
                date={paymentDate ? new Date(paymentDate) : null}
                onDateChange={(date) => setPaymentDate(date ? format(date, 'yyyy-MM-dd') : '')}
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
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
                disabled={paymentLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdatePayment} disabled={paymentLoading}>
                {paymentLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Payment'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the subscription and all pending orders. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionDetail;
