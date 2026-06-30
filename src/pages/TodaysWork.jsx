import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge2 } from '../components/ui/badge2';
import { Sheet, SheetContent } from '../components/ui/sheet';
import useOrderStore from '../store/orderStore';
import OrderDetail from './OrderDetail';
import { formatTime } from '@/lib/utilities';
import { getStatusLabel, PAYMENT_STATUSES } from '../lib/constants';
import LetterAvatar from '../components/LetterAvatar';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock10,
  MapPin,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  IndianRupee
} from 'lucide-react';

const TodaysWork = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOrderId = searchParams.get('orderId');

  const {
    upcomingOrders,
    completedOrders,
    isLoading,
    fetchTodayOrders,
    updateOrder,
  } = useOrderStore();

  useEffect(() => {
    fetchTodayOrders();
  }, [fetchTodayOrders]);

  const handleOpenOrderDetail = (orderId) => {
    setSearchParams({ orderId: orderId.toString() });
  };

  const handleCloseOrderDetail = () => {
    setSearchParams({});
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Calculate stats
  const totalUpcomingCount = upcomingOrders.length;
  const totalCompletedCount = completedOrders.length;
  const totalUpcomingValue = upcomingOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalCompletedValue = completedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  // Today's pending payment stats
  const todaysPendingPaymentOrders = [...upcomingOrders, ...completedOrders].filter(
    order => ['pending', 'partial'].includes(order.payment_status) && order.status !== 'cancelled'
  );
  const pendingCount = todaysPendingPaymentOrders.length;
  const pendingValue = todaysPendingPaymentOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-primary" strokeWidth={1.5} />
          Today's Work
        </h1>
        <p className="text-gray-600 mt-1">
          Manage and track today's service assignments, completed tasks, and payment collections.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white  shadow-sm md:border md:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Upcoming Tasks
            </CardTitle>
            <div className="p-2 bg-primary/5 rounded-lg text-primary">
              <Clock10 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div>
                <div className="text-2xl font-bold">{totalUpcomingCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Pending assignment/in progress</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white  shadow-sm md:border md:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Completed Today
            </CardTitle>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div>
                <div className="text-2xl font-bold">{totalCompletedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Successfully served today</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white  shadow-sm md:border md:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Today's Volume
            </CardTitle>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div>
                <div className="text-2xl font-bold">{formatCurrency(totalUpcomingValue + totalCompletedValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(totalCompletedValue)} achieved / {formatCurrency(totalUpcomingValue)} pending
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-white  shadow-sm md:border md:shadow-none transition-all",
          pendingCount > 0 && "border-red-100 bg-red-50/10"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Today's Pending Payments
            </CardTitle>
            <div className={cn(
              "p-2 rounded-lg",
              pendingCount > 0 ? "bg-red-50 text-red-600 animate-pulse" : "bg-gray-50 text-gray-400"
            )}>
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div>
                <div className={cn("text-2xl font-bold", pendingCount > 0 && "text-red-600")}>{pendingCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingCount > 0 ? `${formatCurrency(pendingValue)} outstanding` : 'All payments collected'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid columns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming column */}
        <div className="space-y-4">
          <h2 className="font-semibold text-xl text-gray-900 flex items-center justify-between">
            Today's Upcoming Works
            <span className="text-sm font-medium text-muted-foreground bg-gray-100 px-2.5 py-0.5 rounded-full">
              {totalUpcomingCount}
            </span>
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : upcomingOrders.length > 0 ? (
            <div className="space-y-3">
              {upcomingOrders.map((order) => (
                <BookingItem
                  key={order.id}
                  order={order}
                  onClick={() => handleOpenOrderDetail(order.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-muted-foreground font-medium">No upcoming orders for today</p>
            </div>
          )}
        </div>

        {/* Completed column */}
        <div className="space-y-4">
          <h2 className="font-semibold text-xl text-gray-900 flex items-center justify-between">
            Completed Today
            <span className="text-sm font-medium text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">
              {totalCompletedCount}
            </span>
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : completedOrders.length > 0 ? (
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <BookingItem
                  key={order.id}
                  order={order}
                  onClick={() => handleOpenOrderDetail(order.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-muted-foreground font-medium">No completed orders today</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrderId} onOpenChange={(open) => !open && handleCloseOrderDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0 overflow-y-auto">
          {selectedOrderId && (
            <OrderDetail
              orderId={selectedOrderId}
              onClose={handleCloseOrderDetail}
              onUpdate={(updatedOrder) => {
                updateOrder(updatedOrder);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const BookingItem = ({ order, onClick }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <Badge2 variant="success" className="text-[9px] h-4.5 px-1.5 leading-none font-bold">
            Paid
          </Badge2>
        );
      case 'partial':
        return (
          <Badge2 variant="warning" className="text-[9px] h-4.5 px-1.5 leading-none font-bold">
            Partial
          </Badge2>
        );
      default:
        return (
          <Badge2 variant="destructive" className="text-[9px] h-4.5 px-1.5 leading-none font-bold bg-red-50 text-red-600 border border-red-100">
            Unpaid
          </Badge2>
        );
    }
  };

  return (
    <div
      className={cn(
        "group p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] active:bg-gray-50 transition-all duration-200 cursor-pointer overflow-hidden relative",
        order.assigned_agent_name ? "bg-white" : "bg-red-50 border-red-100/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-bold text-gray-900 truncate pr-2">
              {order.customer.name || 'Unnamed Customer'}
            </h3>
            <span className="text-sm font-extrabold text-primary whitespace-nowrap">
              {formatCurrency(order.total_amount)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">#{order.order_number}</span>
            <Badge2
              variant={order.status === 'completed' ? 'success' : order.status === 'confirmed' ? 'info' : 'warning'}
              className="text-[9px] h-4.5 px-1.5 leading-none font-bold"
            >
              {getStatusLabel(order.status)}
            </Badge2>
            {getPaymentStatusBadge(order.payment_status)}
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
                <span className="text-[11px] text-muted-foreground font-semibold truncate max-w-[120px]">
                  {order.area || 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pl-2">
              {order.assigned_agent_name ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100">
                  <LetterAvatar name={order.assigned_agent_name} size="xs" />
                  <span className="text-[10px] font-bold text-gray-600 truncate max-w-[70px]">
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

export default TodaysWork;
