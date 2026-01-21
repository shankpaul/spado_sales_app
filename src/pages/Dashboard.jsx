import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import useAuthStore from '../store/authStore';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  Car,
  ClipboardList,
  UserCheck,
  BarChart3
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

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
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
            <CardTitle className="text-lg">Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <BookingItem customer="Sarah Johnson" time="10:00 AM" service="Premium Wash" />
                <BookingItem customer="Mike Williams" time="11:30 AM" service="Basic Wash" />
                <BookingItem customer="Emma Davis" time="2:00 PM" service="Full Detail" />
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

const BookingItem = ({ customer, time, service }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
    <div>
      <p className="font-medium text-gray-900">{customer}</p>
      <p className="text-sm text-gray-600">{service}</p>
    </div>
    <span className="text-sm font-medium text-primary-600">{time}</span>
  </div>
);

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
