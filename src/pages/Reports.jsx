import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  FileText,
  Award,
  Loader2,
  IndianRupee,
  Star,
  ArrowLeft,
  ClipboardList,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { format, parseISO, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { getStatusLabel, getStatusColor, ORDER_STATUSES, PAYMENT_STATUSES } from '../lib/constants';
import { Badge2 } from '../components/ui/badge2';
import apiClient from '../services/apiClient';
import useAuthStore from '../store/authStore';

const Reports = () => {
  const { user } = useAuthStore();
  const [selectedReport, setSelectedReport] = useState(null); // null, 'orders', 'enquiries'
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [agents, setAgents] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    status: '',
    payment_status: '',
    agent_id: '',
  });

  // Chart granularity
  const [chartGranularity, setChartGranularity] = useState('auto');

  // Load agents for filter dropdown
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await apiClient.get('/users', {
          params: { role: 'agent', per_page: 1000 },
        });
        setAgents(response.data.users || []);
      } catch (error) {
        console.error('Error loading agents:', error);
      }
    };
    loadAgents();
  }, []);

  // Generate chart data based on granularity
  const generateChartData = () => {
    if (!reportData || !reportData.orders || reportData.orders.length === 0) {
      return [];
    }

    const { date_from, date_to } = filters;
    if (!date_from || !date_to) return [];

    const startDate = parseISO(date_from);
    const endDate = parseISO(date_to);
    const daysDiff = differenceInDays(endDate, startDate);

    // Determine granularity
    let granularity = chartGranularity;
    if (granularity === 'auto') {
      if (daysDiff <= 7) {
        granularity = 'daily';
      } else if (daysDiff <= 31) {
        granularity = 'daily';
      } else if (daysDiff <= 90) {
        granularity = 'weekly';
      } else {
        granularity = 'monthly';
      }
    }

    // Generate intervals
    let intervals = [];
    if (granularity === 'daily') {
      intervals = eachDayOfInterval({ start: startDate, end: endDate });
    } else if (granularity === 'weekly') {
      intervals = eachWeekOfInterval({ start: startDate, end: endDate });
    } else if (granularity === 'monthly') {
      intervals = eachMonthOfInterval({ start: startDate, end: endDate });
    }

    // Group orders by interval
    const chartData = intervals.map((intervalDate) => {
      let intervalStart, intervalEnd, label;

      if (granularity === 'daily') {
        intervalStart = intervalDate;
        intervalEnd = intervalDate;
        label = format(intervalDate, 'MMM dd');
      } else if (granularity === 'weekly') {
        intervalStart = startOfWeek(intervalDate);
        intervalEnd = endOfWeek(intervalDate);
        label = `${format(intervalStart, 'MMM dd')} - ${format(intervalEnd, 'MMM dd')}`;
      } else {
        intervalStart = startOfMonth(intervalDate);
        intervalEnd = endOfMonth(intervalDate);
        label = format(intervalDate, 'MMM yyyy');
      }

      const ordersInInterval = reportData.orders.filter((order) => {
        const bookingDate = parseISO(order.booking_date);
        return bookingDate >= intervalStart && bookingDate <= intervalEnd;
      });

      const totalAmount = ordersInInterval.reduce((sum, order) => sum + order.total_amount, 0);
      const profit = ordersInInterval.reduce((sum, order) => sum + order.profit, 0);
      const orderCount = ordersInInterval.length;

      return {
        label,
        'Total Amount': Math.round(totalAmount * 100) / 100,
        'Profit': Math.round(profit * 100) / 100,
        'Orders': orderCount,
      };
    });

    return chartData;
  };

  // Fetch report data
  const fetchReport = async () => {
    if (!filters.date_from || !filters.date_to) {
      toast.error('Please select both from and to dates');
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.status) params.status = filters.status;
      if (filters.payment_status) params.payment_status = filters.payment_status;
      if (filters.agent_id) params.agent_id = filters.agent_id;

      const response = await apiClient.get('/orders/reports/orders', { params });
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!reportData || !reportData.orders || reportData.orders.length === 0) {
      toast.error('No data to export');
      return;
    }

    const excelData = reportData.orders.map((order) => ({
      'Order Number': order.order_number,
      'Customer Name': order.customer?.name || '',
      'Customer Phone': order.customer?.phone || '',
      'Booking Date': format(parseISO(order.booking_date), 'yyyy-MM-dd'),
      'Status': getStatusLabel(order.status),
      'Payment Status': order.payment_status,
      'Subtotal': order.subtotal_amount,
      'Total': order.total_amount,
      'GST': order.gst_amount,
      'Profit': order.profit,
      'Rating': order.rating || 'N/A',
      'Agent Name': order.assigned_to?.name || '',
      'Agent Incentive': order.agent_incentive,
      'Five Star Incentive': order.five_star_incentive,
    }));

    // Add summary row
    excelData.push({});
    excelData.push({
      'Order Number': 'SUMMARY',
      'Customer Name': '',
      'Customer Phone': '',
      'Booking Date': '',
      'Status': '',
      'Payment Status': '',
      'Subtotal': '',
      'Total': reportData.summary.total_amount,
      'GST': reportData.summary.gst_amount,
      'Profit': reportData.summary.profit,
      'Rating': '',
      'Agent Name': '',
      'Agent Incentive': reportData.summary.total_agent_incentive,
      'Five Star Incentive': reportData.summary.total_five_star_incentive,
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders Report');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `orders_report_${filters.date_from}_${filters.date_to}.xlsx`);

    toast.success('Report exported successfully');
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      date_from: '',
      date_to: '',
      status: '',
      payment_status: '',
      agent_id: '',
    });
    setReportData(null);
  };

  const chartData = generateChartData();

  // Report Selection View
  const renderReportSelection = () => (
    <>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Orders Report Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedReport('orders')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <ClipboardList className="h-8 w-8 text-primary" />
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">Orders Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              View detailed reports on orders including revenue, profit, agent incentives, and 5-star bonuses. Filter by date, status, payment status, and agent.
            </p>
          </CardContent>
        </Card>

        {/* Enquiries Report Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => toast.info('Enquiries report coming soon')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <MessageSquare className="h-8 w-8 text-primary" />
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">Enquiries Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Analyze enquiry trends, conversion rates, and follow-up performance. Track enquiry sources and agent response times.
            </p>
            <div className="mt-2">
              <Badge2 variant="secondary">Coming Soon</Badge2>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  // Orders Report View
  const renderOrdersReport = () => (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setSelectedReport(null);
              setReportData(null);
              clearFilters();
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Orders Report</h1>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="date_from">From Date</Label>
              <Input
                id="date_from"
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="date_to">To Date</Label>
              <Input
                id="date_to"
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select
                value={filters.payment_status}
                onValueChange={(value) => setFilters({ ...filters, payment_status: value })}
              >
                <SelectTrigger id="payment_status">
                  <SelectValue placeholder="All Payment Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agent_id">Agent</Label>
              <Select
                value={filters.agent_id}
                onValueChange={(value) => setFilters({ ...filters, agent_id: value })}
              >
                <SelectTrigger id="agent_id">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchReport} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {reportData && reportData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.summary.order_count}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{reportData.summary.total_amount.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GST Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{reportData.summary.gst_amount.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{reportData.summary.profit.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agent Incentives</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{reportData.summary.total_agent_incentive.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">5-Star Incentives</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ₹{reportData.summary.total_five_star_incentive.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for Chart and Table */}
      {reportData && reportData.orders && reportData.orders.length > 0 && (
        <Tabs defaultValue="table" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="table">Orders Table</TabsTrigger>
              <TabsTrigger value="chart">Chart View</TabsTrigger>
            </TabsList>
            <Button onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </div>

          {/* Table Tab */}
          <TabsContent value="table">
            <Card>
          <CardHeader>
            <CardTitle>Orders List ({reportData.orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Order #</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Booking Date</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Payment</th>
                    <th className="text-right p-2">Subtotal</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">GST</th>
                    <th className="text-right p-2">Profit</th>
                    <th className="text-center p-2">Rating</th>
                    <th className="text-left p-2">Agent</th>
                    <th className="text-right p-2">Agent Inc.</th>
                    <th className="text-right p-2">5★ Inc.</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{order.order_number}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{order.customer?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.customer?.phone}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        {format(parseISO(order.booking_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="p-2">
                        <Badge2 variant={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge2>
                      </td>
                      <td className="p-2">
                        <Badge2 variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                          {order.payment_status}
                        </Badge2>
                      </td>
                      <td className="text-right p-2">₹{order.subtotal_amount.toFixed(2)}</td>
                      <td className="text-right p-2 font-medium">
                        ₹{order.total_amount.toFixed(2)}
                      </td>
                      <td className="text-right p-2">₹{order.gst_amount.toFixed(2)}</td>
                      <td className="text-right p-2 text-green-600 font-medium">
                        ₹{order.profit.toFixed(2)}
                      </td>
                      <td className="text-center p-2">
                        {order.rating ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{order.rating}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">{order.assigned_to?.name || '-'}</td>
                      <td className="text-right p-2">₹{order.agent_incentive.toFixed(2)}</td>
                      <td className="text-right p-2 text-yellow-600">
                        ₹{order.five_star_incentive.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Chart Tab */}
      <TabsContent value="chart">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Orders Trend</CardTitle>
              <div className="flex gap-2">
                <Select
                  value={chartGranularity}
                  onValueChange={setChartGranularity}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="Total Amount" fill="#8884d8" />
                <Bar yAxisId="left" dataKey="Profit" fill="#82ca9d" />
                <Bar yAxisId="right" dataKey="Orders" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !reportData && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Report Data</h3>
            <p className="text-muted-foreground">
              Select date range and filters, then click "Apply Filters" to generate report
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && reportData && reportData.orders && reportData.orders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
            <p className="text-muted-foreground">
              No orders match the selected filters
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {!selectedReport && renderReportSelection()}
      {selectedReport === 'orders' && renderOrdersReport()}
    </div>
  );
};

export default Reports;
