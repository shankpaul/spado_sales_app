import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge2 } from '../components/ui/badge2';
import {
  Sheet,
  SheetContent,
} from '../components/ui/sheet';
import OrderDetail from './OrderDetail';
import useAuthStore from '../store/authStore';
import orderService from '../services/orderService';
import { format, isToday, parseISO } from 'date-fns';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  Car,
  ClipboardList,
  UserCheck,
  BarChart3,
  User,
  CircleUser,
  MapPin,
  Clock10
} from 'lucide-react';

/**
 * Dashboard Page Component
 * Displays role-specific dashboards for:
 * - Admin: Full system overview
 * - Sales Executive: Sales and customer metrics
 * - Accountant: Financial reports and transactions
 */
const Dashboard = () => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [todayOrders, setTodayOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  // Track selected order for detail view
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOrderId = searchParams.get('orderId');
  
  // Handle opening order detail
  const handleOpenOrderDetail = (orderId) => {
    setSearchParams({ orderId: orderId.toString() });
  };
  
  // Handle closing order detail
  const handleCloseOrderDetail = () => {
    setSearchParams({});
  };

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Fetch today's orders
  useEffect(() => {
    const fetchTodayOrders = async () => {
      try {
        setLoadingOrders(true);
        const today = format(new Date(), 'yyyy-MM-dd');
        const response = await orderService.getAllOrders({
          date_from: today,
          date_to: today,
          per_page: 50
        });
        
        // Filter for confirmed or in_progress orders
        const upcomingOrders = (response.orders || []).filter(
          order => order.status === 'confirmed' || order.status === 'in_progress'
        );
        
        setTodayOrders(upcomingOrders);
      } catch (error) {
        console.error('Error fetching today orders:', error);
        setTodayOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchTodayOrders();
  }, []);

  // Admin Dashboard
  const AdminDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="$12,458"
          change="+12.5%"
          icon={<DollarSign className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Customers"
          value="1,248"
          change="+8.2%"
          icon={<Users className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Today's Bookings"
          value="32"
          change="+5.1%"
          icon={<Calendar className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Services"
          value="12"
          change="+2.3%"
          icon={<Car className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <ActivityItem text="New booking from John Doe" time="5 minutes ago" />
                <ActivityItem text="Payment received for #12345" time="15 minutes ago" />
                <ActivityItem text="Service completed for #12344" time="1 hour ago" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <QuickActionButton>New Booking</QuickActionButton>
              <QuickActionButton>Add Customer</QuickActionButton>
              <QuickActionButton>View Reports</QuickActionButton>
              <QuickActionButton>Manage Staff</QuickActionButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Sales Executive Dashboard
  const SalesExecutiveDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Sales Today"
          value="$2,450"
          change="+15.3%"
          icon={<DollarSign className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="New Customers"
          value="24"
          change="+12.0%"
          icon={<UserCheck className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Bookings"
          value="8"
          change="-3.5%"
          icon={<Calendar className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Completed Today"
          value="18"
          change="+7.8%"
          icon={<Car className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Today's Upcoming Orders</span>
              <span className="text-sm font-normal text-gray-500">({todayOrders.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : todayOrders.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {todayOrders.map((order) => (
                  <BookingItem 
                    key={order.id} 
                    order={order}
                    onClick={() => handleOpenOrderDetail(order.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No upcoming orders for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-4">
                <PerformanceBar label="This Week" value={85} />
                <PerformanceBar label="This Month" value={72} />
                <PerformanceBar label="This Quarter" value={68} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Accountant Dashboard
  const AccountantDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value="$3,842"
          change="+18.2%"
          icon={<DollarSign className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Payments"
          value="$1,205"
          change="-5.3%"
          icon={<TrendingUp className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Transactions Today"
          value="48"
          change="+9.7%"
          icon={<BarChart3 className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Monthly Revenue"
          value="$45,230"
          change="+22.1%"
          icon={<DollarSign className="h-4 w-4 text-primary-600" />}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <TransactionItem amount="$125.00" customer="John Doe" status="Completed" />
                <TransactionItem amount="$89.50" customer="Jane Smith" status="Completed" />
                <TransactionItem amount="$250.00" customer="Bob Wilson" status="Pending" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-4">
                <SummaryItem label="Cash Payments" value="$18,450" percentage="41%" />
                <SummaryItem label="Card Payments" value="$22,780" percentage="50%" />
                <SummaryItem label="Online Payments" value="$4,000" percentage="9%" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const getRoleDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'sales_executive':
        return <SalesExecutiveDashboard />;
      case 'accountant':
        return <AccountantDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {user?.role === 'admin' && 'Admin Dashboard'}
          {user?.role === 'sales_executive' && 'Sales Dashboard'}
          {user?.role === 'accountant' && 'Financial Dashboard'}
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {user?.name || user?.email}!
        </p>
      </div>

      {getRoleDashboard()}
      
      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrderId} onOpenChange={(open) => !open && handleCloseOrderDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0 overflow-y-auto">
          {selectedOrderId && (
            <OrderDetail 
              orderId={selectedOrderId} 
              onClose={handleCloseOrderDetail}
              onUpdate={() => {
                // Refresh today's orders after update
                const fetchTodayOrders = async () => {
                  try {
                    setLoadingOrders(true);
                    const today = format(new Date(), 'yyyy-MM-dd');
                    const response = await orderService.getAllOrders({
                      date_from: today,
                      date_to: today,
                      per_page: 50
                    });
                    const upcomingOrders = (response.orders || []).filter(
                      order => order.status === 'confirmed' || order.status === 'in_progress'
                    );
                    setTodayOrders(upcomingOrders);
                  } catch (error) {
                    console.error('Error fetching today orders:', error);
                  } finally {
                    setLoadingOrders(false);
                  }
                };
                fetchTodayOrders();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, change, icon, isLoading }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <>
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-16" />
        </>
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          <p className={`text-xs ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {change} from last month
          </p>
        </>
      )}
    </CardContent>
  </Card>
);

const ActivityItem = ({ text, time }) => (
  <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
    <div className="h-2 w-2 mt-1.5 rounded-full bg-primary-500" />
    <div className="flex-1">
      <p className="text-gray-900">{text}</p>
      <p className="text-xs text-gray-500">{time}</p>
    </div>
  </div>
);

const QuickActionButton = ({ children }) => (
  <button className="w-full text-left px-4 py-2 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-300 transition-colors">
    {children}
  </button>
);

const BookingItem = ({ order, onClick }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="group p-4 rounded-xl bg-white border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={onClick}>
      {/* Header - Order Number, Status, and Amount */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button className="text-base font-bold text-gray-900 hover:text-primary-600 transition-colors">
            #{order.order_number}
          </button>
          <Badge2 variant={order.status === 'confirmed' ? 'info' : 'warning'}>
            {order.status === 'confirmed' ? 'Confirmed' : 'In Progress'}
          </Badge2>
        </div>
        <div className="text-right">
          <span className="text-base font-bold text-primary-600">{formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100 mb-3"></div>

      {/* Customer Name */}
      {/* <div className="flex items-center gap-2 mb-2.5">
        <CircleUser className="text-gray-400" strokeWidth={1.5} size={16} />
        <span className="text-sm font-semibold text-gray-900">{order.customer_name}</span>
      </div> */}

      {/* Area and Time */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-gray-600">
          <MapPin className="text-gray-400" strokeWidth={1.5} size={14} />
          <span className="font-medium">{order.area || 'N/A'}</span>
         {order.assigned_agent_name ? 
                        <div className="flex items-center gap-2">
                          <LetterAvatar name={order.assigned_agent_name} size="xs" />
                          <div className="font-medium">{order.assigned_agent_name}</div>
                        </div>:
                        <Badge2 variant="destructive">Unassigned</Badge2>
                        }
        </div>
        
        <div className="flex items-center gap-1.5 text-gray-600">
          <Clock10 className="text-gray-400" strokeWidth={1.5} size={14} />
          <span className="font-medium">
            {formatTime(order.booking_time_from)} - {formatTime(order.booking_time_to)}
          </span>
        </div>
      </div>
    </div>
  );
};

const PerformanceBar = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}%</span>
    </div>
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="h-full bg-primary-500 rounded-full"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const TransactionItem = ({ amount, customer, status }) => (
  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
    <div>
      <p className="font-medium text-gray-900">{customer}</p>
      <p className="text-sm text-gray-600">{amount}</p>
    </div>
    <span className={`text-xs px-2 py-1 rounded-full ${
      status === 'Completed' 
        ? 'bg-green-100 text-green-700' 
        : 'bg-yellow-100 text-yellow-700'
    }`}>
      {status}
    </span>
  </div>
);

const SummaryItem = ({ label, value, percentage }) => (
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <p className="text-sm text-gray-600">{label}</p>
      <div className="h-2 bg-gray-200 rounded-full mt-1">
        <div 
          className="h-full bg-primary-500 rounded-full"
          style={{ width: percentage }}
        />
      </div>
    </div>
    <span className="ml-4 font-medium text-gray-900">{value}</span>
  </div>
);

export default Dashboard;
