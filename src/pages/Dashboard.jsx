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
  MapPin,
  Clock10,
  Bell,
  Search,
  ArrowRight,
  ChevronRight,
  Repeat,
  Plus,
  Loader2,
  X
} from 'lucide-react';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  getStatusLabel,
  getStatusColor,
} from '../lib/constants';
import LetterAvatar from '../components/LetterAvatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatTime } from '@/lib/utilities';

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
  const [upcomingOrders, setUpcomingOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
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
          per_page: 100 // Increased per_page to ensure we get all today's orders
        });

        const allTodayOrders = response.orders || [];

        // Filter for confirmed or in_progress orders (Upcoming)
        const upcoming = allTodayOrders.filter(
          order => order.status === 'confirmed' || order.status === 'in_progress'
        );

        // Filter for completed orders
        const completed = allTodayOrders.filter(
          order => order.status === 'completed'
        );

        setUpcomingOrders(upcoming);
        setCompletedOrders(completed);
      } catch (error) {
        console.error('Error fetching today orders:', error);
        setUpcomingOrders([]);
        setCompletedOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchTodayOrders();
  }, []);



  // Admin Dashboard
  const AdminDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
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
      {/* this feature will enabled later */}
      {/* <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
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
      </div> */}

      <div className="border-none flex flex-col gap-4">
        <div className="text-lg flex items-center justify-between">
          <span className="font-semibold text-xl text-gray-900 flex items-center gap-2">
            Upcoming Orders
            <span className="text-sm font-medium text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{upcomingOrders.length}</span>
          </span>
        </div>
        <div>
          {loadingOrders ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : upcomingOrders.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {upcomingOrders.map((order) => (
                <BookingItem
                  key={order.id}
                  order={order}
                  onClick={() => handleOpenOrderDetail(order.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-muted-foreground font-medium">No upcoming orders for today</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-none flex flex-col gap-4">
        <div className="text-lg flex items-center justify-between">
          <span className="font-semibold text-xl text-gray-900 flex items-center gap-2">
            Completed Today
            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{completedOrders.length}</span>
          </span>
        </div>
        <div>
          {loadingOrders ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : completedOrders.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 pb-2">
              {completedOrders.map((order) => (
                <BookingItem
                  key={order.id}
                  order={order}
                  onClick={() => handleOpenOrderDetail(order.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
              <UserCheck className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-muted-foreground font-medium">No orders completed yet today</p>
            </div>
          )}
        </div>
      </div>
    </div >
  );

  // Accountant Dashboard
  const AccountantDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
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
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b md:hidden">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LetterAvatar name={user?.name} size="md" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Welcome back,</p>
              <h2 className="text-sm font-bold truncate max-w-[150px]">{user?.name || user?.email}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Desktop Header - Hidden on Mobile */}
        <div className="hidden md:block">
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
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, change, icon, isLoading }) => (
  <Card className="overflow-hidden border-none shadow-sm md:border-1 md:shadow-none active:scale-[0.98] transition-all duration-200">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white">
      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      <div className="p-2 bg-primary/5 rounded-lg">
        {icon}
      </div>
    </CardHeader>
    <CardContent className="bg-white">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn(
              "text-[11px] font-bold px-1.5 py-0.5 rounded-md",
              change.startsWith('+') ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
            )}>
              {change}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">vs last month</span>
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

const ActivityItem = ({ text, time }) => (
  <div className="flex items-start space-x-3 p-3 rounded-xl bg-white border border-gray-100/50 active:bg-gray-50 transition-colors shadow-sm mb-2">
    <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-900 leading-tight">{text}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{time}</p>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
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


  return (
    <div
      className="group p-4 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-[0.98] active:bg-gray-50 transition-all duration-200 cursor-pointer overflow-hidden relative"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-bold text-gray-900 truncate pr-2">
              {order.customer_name || 'Unnamed Customer'}
            </h3>
            <span className="text-sm font-extrabold text-primary whitespace-nowrap">
              {formatCurrency(order.total_amount)}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">#{order.order_number}</span>
            <Badge2
              variant={order.status === 'completed' ? 'success' : order.status === 'confirmed' ? 'info' : 'warning'}
              className="text-[9px] h-4.5 px-1.5 leading-none font-bold"
            >
              {getStatusLabel(order.status)}
            </Badge2>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <Clock10 className="text-muted-foreground/70" size={11} />
                <span className="text-[11px] text-muted-foreground font-semibold">
                  {formatTime(order.booking_time_from)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="text-muted-foreground/70" size={11} />
                <span className="text-[11px] text-muted-foreground font-semibold truncate max-w-[80px]">
                  {order.area || 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pl-2">
              {order.assigned_agent_name ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100">
                  <LetterAvatar name={order.assigned_agent_name} size="xs" />
                  <span className="text-[10px] font-bold text-gray-600 truncate max-w-[50px]">
                    {order.assigned_agent_name.split(' ')[0]}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-destructive/80 bg-red-50 px-2 py-0.5 rounded-full border border-red-100/50">
                  Unassigned
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground/20 ml-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PerformanceBar = ({ label, value }) => (
  <div className="mb-4">
    <div className="flex justify-between text-xs font-semibold mb-1.5 uppercase tracking-wider text-muted-foreground">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const TransactionItem = ({ amount, customer, status }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm mb-2 active:bg-gray-50 transition-colors">
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
        <DollarSign size={14} />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">{customer}</p>
        <p className="text-[11px] text-muted-foreground font-medium">{amount}</p>
      </div>
    </div>
    <Badge2 variant={status === 'Completed' ? 'success' : 'warning'} className="text-[10px] h-5">
      {status}
    </Badge2>
  </div>
);

const SummaryItem = ({ label, value, percentage }) => (
  <div className="space-y-2 mb-4">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full">
      <div
        className="h-full bg-primary rounded-full transition-all duration-1000"
        style={{ width: percentage }}
      />
    </div>
  </div>
);

export default Dashboard;
