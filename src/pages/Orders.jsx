import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';
import orderService from '../services/orderService';
import OrderWizard from '../components/OrderWizard';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  getStatusColor,
  getStatusLabel,
} from '../lib/constants';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Calendar,
  User,
  DollarSign,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * Orders Page Component
 * Manages order list with search, filters, pagination
 */
const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agents, setAgents] = useState([]);
  
  // Filter states
  const [orderNumber, setOrderNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [agentId, setAgentId] = useState('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Fetch agents for filter
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await orderService.getUsersByRole('agent');
        setAgents(response.users || []);
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };
    fetchAgents();
  }, []);

  // Fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
      };

      if (orderNumber) params.order_number = orderNumber;
      if (customerPhone) params.customer_phone = customerPhone;
      if (status && status !== 'all') params.status = status;
      if (paymentStatus && paymentStatus !== 'all') params.payment_status = paymentStatus;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (agentId && agentId !== 'all') params.agent_id = agentId;

      const response = await orderService.getAllOrders(params);
      setOrders(response.orders || []);
      setTotalPages(response.pagination?.total_pages || 1);
    } catch (error) {
      console.error('Error fetching orders:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load orders';
      setError(errorMessage);
      toast.error(errorMessage);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, orderNumber, customerPhone, status, paymentStatus, dateFrom, dateTo, agentId]);

  // Handle search with debounce
  const handleSearchChange = (field, value) => {
    setPage(1);
    if (field === 'orderNumber') setOrderNumber(value);
    if (field === 'customerPhone') setCustomerPhone(value);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  // Handle wizard success
  const handleWizardSuccess = () => {
    setIsWizardOpen(false);
    fetchOrders();
    toast.success('Order created successfully');
  };

  return (
    <div className="p-4 md:p-2 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders and bookings</p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Order
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Order Number Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number..."
              value={orderNumber}
              onChange={(e) => handleSearchChange('orderNumber', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Customer Phone Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone..."
              value={customerPhone}
              onChange={(e) => handleSearchChange('customerPhone', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Payment Status Filter */}
          <Select value={paymentStatus} onValueChange={(value) => { setPaymentStatus(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Status</SelectItem>
              {PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date From */}
          <Input
            type="date"
            placeholder="Date from"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />

          {/* Date To */}
          <Input
            type="date"
            placeholder="Date to"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />

          {/* Agent Filter */}
          <Select value={agentId} onValueChange={(value) => { setAgentId(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents && agents.map((agent) => (
                <SelectItem key={agent.id} value={String(agent.id)}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Orders List */}
      <Card className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load orders</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchOrders} variant="outline">
              Try Again
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or create a new order</p>
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="block md:hidden space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-lg">#{order.order_number}</div>
                        <div className="text-sm text-muted-foreground">{order.customer_name}</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getBadgeVariant(order.status, 'order')}>
                          {getStatusLabel(order.status, ORDER_STATUSES)}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(order.booking_date)}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Payment:</span>
                        <Badge variant={getBadgeVariant(order.payment_status, 'payment')}>
                          {getStatusLabel(order.payment_status, PAYMENT_STATUSES)}
                        </Badge>
                      </div>
                      {order.assigned_agent && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          {order.assigned_agent.name}
                        </div>
                      )}
                    </div>

                    <Link to={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Booking Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(order.booking_date)}</TableCell>
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
                      <TableCell className="font-medium">{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell>{order.assigned_agent_name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <Link to={`/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Order Wizard Dialog */}
      <OrderWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={handleWizardSuccess}
      />
    </div>
  );
};

export default Orders;
