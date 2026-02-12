import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { toast } from 'sonner';
import orderService from '../services/orderService';
import { ORDER_STATUSES, PAYMENT_STATUSES, getStatusColor, getStatusLabel } from '../lib/constants';
import {
  Phone,
  MapPin,
  Calendar,
  Loader2,
  MessageCircle,
  ShoppingCart,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import CustomerContact from './CustomerContact';

/**
 * CustomerDetails Component
 * Reusable dialog component to display customer information and order history
 * @param {Object} customer - Customer object with details
 * @param {boolean} open - Dialog open state
 * @param {function} onOpenChange - Callback to handle dialog open/close
 */
const CustomerDetails = ({ customer, open, onOpenChange }) => {
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Fetch customer orders when dialog opens
  useEffect(() => {
    if (open && customer) {
      setLoadingOrders(true);
      orderService.getAllOrders({
        customer_id: customer.id,
        per_page: 100,
      })
        .then((response) => {
          setCustomerOrders(response.orders || []);
        })
        .catch((error) => {
          console.error('Error fetching customer orders:', error);
          toast.error('Failed to load customer orders');
          setCustomerOrders([]);
        })
        .finally(() => {
          setLoadingOrders(false);
        });
    }
  }, [open, customer]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
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

  // Get badge variant for status
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
    
    return variantMap[color] || 'secondary';
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
          <DialogDescription>
            View customer information and order history
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="orders">Orders ({customerOrders.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="flex-1 overflow-y-auto space-y-6 mt-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Total Orders</div>
                <div className="text-2xl font-bold text-primary">{customerOrders.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Last Booked</div>
                <div className="text-base font-semibold">{formatDate(customer.last_booked_at)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Customer Since</div>
                <div className="text-base font-semibold">{formatDate(customer.created_at)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
              </Card>
            </div>

            {/* Contact Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full Name</label>
                    <p className="text-base font-medium mt-1">{customer.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone Number</label>
                    <div className="flex items-center gap-2 mt-1">
                      <CustomerContact
                        phone={customer.phone}
                        customerName={customer.name}
                        variant="outline"
                        className="text-blue-600 border-blue-600"
                      />
                      {customer.has_whatsapp && (
                        <Badge variant="outline" className="text-green-600 border-green-600 ml-2">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          WhatsApp
                        </Badge>
                      )}
                    </div>
                  </div>
                  {customer.email && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email Address</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="text-base">{customer.email}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</label>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-base font-medium">{customer.area}</p>
                      <p className="text-sm text-muted-foreground">
                        {[customer.city, customer.district, customer.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      {customer.pin_code && (
                        <p className="text-sm text-muted-foreground">PIN: {customer.pin_code}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="flex-1 overflow-y-auto mt-4">
            {loadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : customerOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">No orders yet</p>
                <p className="text-sm">This customer hasn't placed any orders</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <span className="text-primary">#{order.order_number}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(order.booking_date)}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(order.status, 'order')}>
                            {getStatusLabel(order.status, ORDER_STATUSES)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(order.payment_status, 'payment')}>
                            {getStatusLabel(order.payment_status, PAYMENT_STATUSES)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetails;
