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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import MapPreview from '../components/MapPreview';
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
import employeeService from '../services/employeeService';
import { ENQUIRY_STATUS_LABELS } from '../constants/enquiryConstants';
import {
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  FileText,
  Award,
  Loader2,
  Eye,
  IndianRupee,
  Star,
  ArrowLeft,
  ClipboardList,
  MessageSquare,
  BarChart3,
  Users,
  Clock,
  PhoneCall,
  Target,
  AlertCircle,
  TrendingDown,
  ChartPie,
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

  // EOD Reports States
  const [employees, setEmployees] = useState([]);
  const [eodReports, setEodReports] = useState([]);
  const [eodLoading, setEodLoading] = useState(false);
  const [eodEmployeeFilter, setEodEmployeeFilter] = useState('all');
  const [eodStartDate, setEodStartDate] = useState('');
  const [eodEndDate, setEodEndDate] = useState('');
  const [selectedEodReport, setSelectedEodReport] = useState(null);
  const [isEodDetailsOpen, setIsEodDetailsOpen] = useState(false);

  const handleViewEodDetails = (report) => {
    setSelectedEodReport(report);
    setIsEodDetailsOpen(true);
  };

  // Fetch employees list for dropdown
  const fetchEmployees = async () => {
    try {
      const response = await employeeService.getAllEmployees({ status: 'active', per_page: 1000 });
      setEmployees(response.employees || response || []);
    } catch (_) {}
  };

  // Fetch EOD Reports
  const fetchEodReports = async () => {
    setEodLoading(true);
    try {
      const filters = {};
      if (eodEmployeeFilter !== 'all') filters.employee_id = eodEmployeeFilter;
      if (eodStartDate) filters.start_date = eodStartDate;
      if (eodEndDate) filters.end_date = eodEndDate;

      const response = await employeeService.getEodReports(filters);
      setEodReports(response || []);
    } catch (error) {
      toast.error('Failed to load EOD reports');
      setEodReports([]);
    } finally {
      setEodLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchEodReports();
  }, [eodEmployeeFilter, eodStartDate, eodEndDate]);

  const formatReportDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatReportTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatHoursWorked = (hours) => {
    if (!hours || isNaN(hours) || hours <= 0) return '-';
    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const formatLocationLink = (lat, lng) => {
    if (!lat || !lng) return '-';
    return (
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium text-xs"
      >
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </a>
    );
  };

  // Filter states
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    status: '',
    payment_status: '',
    agent_id: '',
  });

  // Enquiry filter states
  const [enquiryFilters, setEnquiryFilters] = useState({
    date_from: '',
    date_to: '',
    source: '',
    status: '',
    assigned_to_id: '',
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
      'Payment Type': order.payment_method || '',
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
      'Payment Type': '',
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

  // Enquiry Report Functions
  const fetchEnquiryReport = async () => {
    if (!enquiryFilters.date_from || !enquiryFilters.date_to) {
      toast.error('Please select both from and to dates');
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (enquiryFilters.date_from) params.date_from = enquiryFilters.date_from;
      if (enquiryFilters.date_to) params.date_to = enquiryFilters.date_to;
      if (enquiryFilters.source) params.source = enquiryFilters.source;
      if (enquiryFilters.status) params.status = enquiryFilters.status;
      if (enquiryFilters.assigned_to_id) params.assigned_to_id = enquiryFilters.assigned_to_id;

      const response = await apiClient.get('/enquiries/reports', { params });
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching enquiry report:', error);
      toast.error('Failed to fetch enquiry report data');
    } finally {
      setLoading(false);
    }
  };

  const clearEnquiryFilters = () => {
    setEnquiryFilters({
      date_from: '',
      date_to: '',
      source: '',
      status: '',
      assigned_to_id: '',
    });
    setReportData(null);
  };

  const exportEnquiryToExcel = () => {
    if (!reportData || !reportData.enquiries || reportData.enquiries.length === 0) {
      toast.error('No data to export');
      return;
    }

    const { summary, by_source, by_agent } = reportData;

    // Summary sheet
    const summaryData = [{
      'Total Leads': summary.total_leads,
      'Pending': summary.new_count,
      'Contacted': summary.contacted_count,
      'Converted': summary.converted_count,
      'Interested': summary.interested_count,
      'Needs Follow-up': summary.needs_followup_count,
      'Lost': summary.lost_count,
      'Conversion Rate (%)': summary.conversion_rate.toFixed(2),
      'Lost Rate (%)': summary.lost_rate.toFixed(2),
      'Avg Conversion Time (hours)': summary.avg_conversion_time_hours?.toFixed(2) || 'N/A',
      'Total Revenue': summary.total_revenue,
      'Active Pipeline': summary.active_pipeline,
      'Overdue Follow-ups': summary.overdue_followups,
      'Stale Enquiries': summary.stale_enquiries,
    }];

    // Source performance sheet
    const sourceData = by_source.map(s => ({
      'Source': s.source,
      'Total Leads': s.total_leads,
      'Converted': s.converted,
      'Lost': s.lost,
      'Conversion Rate (%)': s.conversion_rate.toFixed(2),
      'Lost Rate (%)': s.lost_rate.toFixed(2),
      'Avg Conversion Time (hours)': s.avg_conversion_time_hours?.toFixed(2) || 'N/A',
      'Total Revenue': s.total_revenue?.toFixed(2) || '0',
    }));

    // Agent performance sheet
    const agentData = by_agent.map(a => ({
      'Agent Name': a.agent_name,
      'Total Assigned': a.total_assigned,
      'Converted': a.converted,
      'Lost': a.lost,
      'Conversion Rate (%)': a.conversion_rate.toFixed(2),
      'Avg Conversion Time (hours)': a.avg_conversion_time_hours?.toFixed(2) || 'N/A',
      'Avg Response Time (hours)': a.avg_response_time_hours?.toFixed(2) || 'N/A',
      'Total Revenue': a.total_revenue?.toFixed(2) || '0',
    }));

    // Detailed enquiries
    const detailedData = reportData.enquiries.map(enq => ({
      'Contact Name': enq.contact_name || '',
      'Contact Phone': enq.contact_phone,
      'Source': enq.source,
      'Status': enq.status,
      'Created At': format(parseISO(enq.created_at), 'yyyy-MM-dd HH:mm'),
      'Assigned To': enq.assigned_to?.name || '',
      'Area': enq.area || '',
      'City': enq.city || '',
      'Sentiment': enq.sentiment || '',
      'Converted At': enq.converted_at ? format(parseISO(enq.converted_at), 'yyyy-MM-dd HH:mm') : '',
    }));

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const sourceSheet = XLSX.utils.json_to_sheet(sourceData);
    XLSX.utils.book_append_sheet(workbook, sourceSheet, 'Source Performance');

    const agentSheet = XLSX.utils.json_to_sheet(agentData);
    XLSX.utils.book_append_sheet(workbook, agentSheet, 'Agent Performance');

    const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Enquiries');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `enquiries_report_${enquiryFilters.date_from}_${enquiryFilters.date_to}.xlsx`);

    toast.success('Enquiry report exported successfully');
  };

  const chartData = generateChartData();

  // Report Selection View
  const renderReportSelection = () => (
    <>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <ChartPie className="h-8 w-8 text-primary" strokeWidth={1.5} />
          Reports
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Orders Report Card */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedReport('orders')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="mt-4">Orders Report</CardTitle>
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>

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
          onClick={() => setSelectedReport('enquiries')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="mt-4">Enquiries Report</CardTitle>
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Analyze enquiry trends, conversion rates, source performance, and agent response times. Track lead pipeline health and follow-up effectiveness.
            </p>
          </CardContent>
        </Card>

        {/* EOD Reports Card */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedReport('eod')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="mt-4">EOD Reports</CardTitle>
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Review daily end-of-day checkout logs for agents, track distance traveled, cash collected, and checkout notes.
            </p>
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
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
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
                value={filters.payment_status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, payment_status: value === 'all' ? '' : value })}
              >
                <SelectTrigger id="payment_status">
                  <SelectValue placeholder="All Payment Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Statuses</SelectItem>
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
                value={filters.agent_id || 'all'}
                onValueChange={(value) => setFilters({ ...filters, agent_id: value === 'all' ? '' : value })}
              >
                <SelectTrigger id="agent_id">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
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
                        <th className="text-left p-2">Payment Type</th>
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
                          <td className="p-2">
                            {order.payment_method ? (
                              <span className="capitalize">{order.payment_method.replace('_', ' ')}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
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

  // Enquiries Report View
  const renderEnquiriesReport = () => {
    const ENQUIRY_SOURCES = ['whatsapp', 'phone_call', 'walk_in', 'website', 'referral', 'social_media', 'google_ads'];
    const ENQUIRY_STATUSES = ['new', 'contacted', 'converted', 'interested', 'needs_followup', 'lost'];

    return (
      <>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedReport(null);
                setReportData(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Enquiries Report</h1>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div>
                <Label htmlFor="enq-date-from">From Date</Label>
                <Input
                  id="enq-date-from"
                  type="date"
                  value={enquiryFilters.date_from}
                  onChange={(e) =>
                    setEnquiryFilters({ ...enquiryFilters, date_from: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="enq-date-to">To Date</Label>
                <Input
                  id="enq-date-to"
                  type="date"
                  value={enquiryFilters.date_to}
                  onChange={(e) =>
                    setEnquiryFilters({ ...enquiryFilters, date_to: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="enq-source">Source</Label>
                <Select
                  value={enquiryFilters.source || 'all'}
                  onValueChange={(value) =>
                    setEnquiryFilters({ ...enquiryFilters, source: value === 'all' ? '' : value })
                  }
                >
                  <SelectTrigger id="enq-source">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {ENQUIRY_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="enq-status">Status</Label>
                <Select
                  value={enquiryFilters.status || 'all'}
                  onValueChange={(value) =>
                    setEnquiryFilters({ ...enquiryFilters, status: value === 'all' ? '' : value })
                  }
                >
                  <SelectTrigger id="enq-status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ENQUIRY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {ENQUIRY_STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="enq-agent">Agent</Label>
                <Select
                  value={enquiryFilters.assigned_to_id || 'all'}
                  onValueChange={(value) =>
                    setEnquiryFilters({ ...enquiryFilters, assigned_to_id: value === 'all' ? '' : value })
                  }
                >
                  <SelectTrigger id="enq-agent">
                    <SelectValue placeholder="All Agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchEnquiryReport} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Report
              </Button>
              <Button variant="outline" onClick={clearEnquiryFilters}>
                Clear Filters
              </Button>
              {reportData && (
                <Button variant="outline" onClick={exportEnquiryToExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {reportData && reportData.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.total_leads}</div>
                <p className="text-xs text-muted-foreground">
                  Active: {reportData.summary.active_pipeline}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.conversion_rate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.summary.converted_count} converted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Conversion Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.summary.avg_conversion_time_hours
                    ? (reportData.summary.avg_conversion_time_hours / 24).toFixed(1)
                    : '0'}d
                </div>
                <p className="text-xs text-muted-foreground">
                  {reportData.summary.avg_response_time_hours
                    ? reportData.summary.avg_response_time_hours.toFixed(1)
                    : '0'}h response
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Needs Follow-up</CardTitle>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.needs_followup_count}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.summary.overdue_followups} overdue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{(reportData.summary.total_revenue || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: ₹{(reportData.summary.avg_order_value || 0).toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lost Rate</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.lost_rate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.summary.lost_count} lost
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts and Tables Tabs */}
        {reportData && (
          <Tabs defaultValue="volume" className="space-y-4">
            <TabsList>
              <TabsTrigger value="volume">Volume</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
            </TabsList>

            {/* Volume Tab */}
            <TabsContent value="volume">
              <Card>
                <CardHeader>
                  <CardTitle>Enquiries by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: 'Pending', value: reportData.summary.new_count },
                      { name: 'Contacted', value: reportData.summary.contacted_count },
                      { name: 'Converted', value: reportData.summary.converted_count },
                      { name: 'Interested', value: reportData.summary.interested_count },
                      { name: 'Needs Follow-up', value: reportData.summary.needs_followup_count },
                      { name: 'Lost', value: reportData.summary.lost_count },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Enquiries Trend Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.trend_data && reportData.trend_data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={reportData.trend_data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="total_leads" stroke="#8884d8" name="Total" />
                        <Line type="monotone" dataKey="converted" stroke="#82ca9d" name="Converted" />
                        <Line type="monotone" dataKey="lost" stroke="#ff7c7c" name="Lost" />
                        <Line type="monotone" dataKey="active" stroke="#ffc658" name="Active" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No trend data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sources Tab */}
            <TabsContent value="sources">
              <Card>
                <CardHeader>
                  <CardTitle>Source Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Source</th>
                          <th className="text-right p-2">Total Leads</th>
                          <th className="text-right p-2">Converted</th>
                          <th className="text-right p-2">Lost</th>
                          <th className="text-right p-2">Conv. Rate</th>
                          <th className="text-right p-2">Avg Conv. Time</th>
                          <th className="text-right p-2">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.by_source && reportData.by_source.map((source, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">
                              {source.source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </td>
                            <td className="text-right p-2">{source.total_leads}</td>
                            <td className="text-right p-2">{source.converted}</td>
                            <td className="text-right p-2">{source.lost}</td>
                            <td className="text-right p-2">{source.conversion_rate.toFixed(1)}%</td>
                            <td className="text-right p-2">
                              {source.avg_conversion_time_hours
                                ? (source.avg_conversion_time_hours / 24).toFixed(1) + 'd'
                                : 'N/A'}
                            </td>
                            <td className="text-right p-2">
                              ₹{(source.total_revenue || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agents Tab */}
            <TabsContent value="agents">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Agent</th>
                          <th className="text-right p-2">Assigned</th>
                          <th className="text-right p-2">Converted</th>
                          <th className="text-right p-2">Lost</th>
                          <th className="text-right p-2">Conv. Rate</th>
                          <th className="text-right p-2">Avg Response</th>
                          <th className="text-right p-2">Avg Conv. Time</th>
                          <th className="text-right p-2">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.by_agent && reportData.by_agent.map((agent, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{agent.agent_name}</td>
                            <td className="text-right p-2">{agent.total_assigned}</td>
                            <td className="text-right p-2">{agent.converted}</td>
                            <td className="text-right p-2">{agent.lost}</td>
                            <td className="text-right p-2">{agent.conversion_rate.toFixed(1)}%</td>
                            <td className="text-right p-2">
                              {agent.avg_response_time_hours
                                ? agent.avg_response_time_hours.toFixed(1) + 'h'
                                : 'N/A'}
                            </td>
                            <td className="text-right p-2">
                              {agent.avg_conversion_time_hours
                                ? (agent.avg_conversion_time_hours / 24).toFixed(1) + 'd'
                                : 'N/A'}
                            </td>
                            <td className="text-right p-2">
                              ₹{(agent.total_revenue || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Pipeline Health Alert Card */}
        {reportData && reportData.summary && (reportData.summary.stale_enquiries > 0 || reportData.summary.overdue_followups > 0) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <AlertCircle className="h-5 w-5" />
                Pipeline Health Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {reportData.summary.stale_enquiries > 0 && (
                  <p className="text-orange-800">
                    • {reportData.summary.stale_enquiries} enquiries have been stale for over 7 days without status change
                  </p>
                )}
                {reportData.summary.overdue_followups > 0 && (
                  <p className="text-orange-800">
                    • {reportData.summary.overdue_followups} follow-ups are overdue
                  </p>
                )}
                {reportData.summary.leads_aging_15_plus_days > 0 && (
                  <p className="text-orange-800">
                    • {reportData.summary.leads_aging_15_plus_days} leads are aging beyond 15 days
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data Message */}
        {reportData && reportData.summary && reportData.summary.total_leads === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No Enquiries Found</h3>
              <p className="text-muted-foreground">
                No enquiries match the selected filters
              </p>
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  const renderEodReport = () => {
    // Calculate summary statistics
    let totalDistance = 0;
    let totalCash = 0;
    eodReports.forEach(report => {
      totalDistance += report.total_distance || 0;
      totalCash += report.total_cash_in_hand || 0;
    });
    const totalTA = totalDistance * 3;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedReport(null);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">End of Day Reports</h1>
        </div>

        {/* EOD Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Distance Travelled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalDistance.toFixed(1)} km</div>
              <p className="text-xs text-muted-foreground">Across all filtered logs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cash Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totalCash)}</div>
              <p className="text-xs text-muted-foreground">In hand cash submissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Travel Allowance (TA)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalTA)}</div>
              <p className="text-xs text-muted-foreground">Calculated at ₹3 per km</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-gray-100 bg-white">
            <CardTitle>EOD Submissions</CardTitle>
            <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
              <Select value={eodEmployeeFilter} onValueChange={setEodEmployeeFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-white border-gray-200 shadow-xs">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} ({emp.employee_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">From</span>
                <Input
                  type="date"
                  value={eodStartDate}
                  onChange={(e) => setEodStartDate(e.target.value)}
                  className="w-full sm:w-36 bg-white border-gray-200 h-9"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">To</span>
                <Input
                  type="date"
                  value={eodEndDate}
                  onChange={(e) => setEodEndDate(e.target.value)}
                  className="w-full sm:w-36 bg-white border-gray-200 h-9"
                />
              </div>
              {(eodEmployeeFilter !== 'all' || eodStartDate || eodEndDate) && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setEodEmployeeFilter('all');
                    setEodStartDate('');
                    setEodEndDate('');
                  }}
                  className="text-gray-500 hover:text-gray-800 text-xs px-2 h-9"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {eodLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : eodReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No End of Day reports found matching the filters.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-600 font-semibold text-left">
                        <th className="p-2">Date</th>
                        <th className="p-2">Employee</th>
                        <th className="p-2">Check-in Time</th>
                        <th className="p-2">Hours Worked</th>
                        <th className="p-2">Distance Travelled</th>
                        <th className="p-2">Travel Allowance (TA)</th>
                        <th className="p-2">Cash Collected</th>
                        <th className="p-2">Checkout Time</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eodReports.map((report, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-2 font-medium text-gray-900">
                            {formatReportDate(report.date)}
                          </td>
                          <td className="p-2">
                            <div>
                              <div className="font-semibold text-gray-800">{report.employee_name}</div>
                              <div className="text-xs text-gray-500">{report.employee_number}</div>
                            </div>
                          </td>
                          <td className="p-2 text-gray-700">
                            <div className="flex items-center gap-1.5">
                              <span>{report.check_in_time && !new Date(report.check_in_time).getTime() ? '-' : formatReportTime(report.check_in_time)}</span>
                              {report.is_late ? (
                                <span className="px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Late</span>
                              ) : report.check_in_time && new Date(report.check_in_time).getTime() ? (
                                <span className="px-1.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">On Time</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="p-2 font-medium text-gray-900">
                            {formatHoursWorked(report.hours_worked)}
                          </td>
                          <td className="p-2 text-gray-700">
                            {report.total_distance.toFixed(1)} km
                          </td>
                          <td className="p-2 font-semibold text-blue-700">
                            {formatCurrency(report.total_distance * 3)}
                          </td>
                          <td className="p-2 font-semibold text-green-700">
                            {formatCurrency(report.total_cash_in_hand)}
                          </td>
                          <td className="p-2 text-gray-600">
                            {report.check_out_time && !new Date(report.check_out_time).getTime() ? '-' : formatReportTime(report.check_out_time)}
                          </td>
                          <td className="p-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewEodDetails(report)}
                              className="h-8 px-2 flex items-center gap-1 text-primary hover:text-primary-dark ml-auto"
                            >
                              <Eye className="h-4 w-4" />
                              <span>Details</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* EOD Details Dialog */}
                <Dialog open={isEodDetailsOpen} onOpenChange={setIsEodDetailsOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-150 rounded-xl shadow-lg">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">EndOfDay Submission Details</DialogTitle>
                      <DialogDescription>
                        For {selectedEodReport && formatReportDate(selectedEodReport.date)}
                      </DialogDescription>
                    </DialogHeader>

                    {selectedEodReport && (
                      <div className="space-y-6 pt-4">
                        {/* Employee Summary Card */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {selectedEodReport.employee_name ? selectedEodReport.employee_name[0].toUpperCase() : 'E'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{selectedEodReport.employee_name}</div>
                            <div className="text-sm text-gray-500">Number: {selectedEodReport.employee_number}</div>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500">Distance Travelled</div>
                            <div className="text-lg font-bold text-gray-900">{selectedEodReport.total_distance.toFixed(1)} km</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500">Travel Allowance (TA)</div>
                            <div className="text-lg font-bold text-blue-700">{formatCurrency(selectedEodReport.total_distance * 3)}</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500">Cash Collected</div>
                            <div className="text-lg font-bold text-green-700">{formatCurrency(selectedEodReport.total_cash_in_hand)}</div>
                          </div>
                        </div>

                        {/* Checkin / Checkout Split */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Checkin Details */}
                          <div className="space-y-3">
                            <div className="font-semibold text-gray-900 border-b pb-1">Check-in Details</div>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Time:</span>
                                <span className="font-medium">
                                  {selectedEodReport.check_in_time && new Date(selectedEodReport.check_in_time).getTime()
                                    ? formatReportTime(selectedEodReport.check_in_time)
                                    : '-'}
                                  {selectedEodReport.is_late && (
                                    <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Late</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Location:</span>
                                <span>{formatLocationLink(selectedEodReport.check_in_latitude, selectedEodReport.check_in_longitude)}</span>
                              </div>
                            </div>
                            {selectedEodReport.check_in_latitude && selectedEodReport.check_in_longitude ? (
                              <div className="mt-2">
                                <MapPreview lat={selectedEodReport.check_in_latitude} lng={selectedEodReport.check_in_longitude} />
                              </div>
                            ) : null}
                          </div>

                          {/* Checkout Details */}
                          <div className="space-y-3">
                            <div className="font-semibold text-gray-900 border-b pb-1">Check-out Details</div>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Time:</span>
                                <span className="font-medium">
                                  {selectedEodReport.check_out_time && new Date(selectedEodReport.check_out_time).getTime()
                                    ? formatReportTime(selectedEodReport.check_out_time)
                                    : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Location:</span>
                                <span>{formatLocationLink(selectedEodReport.check_out_latitude, selectedEodReport.check_out_longitude)}</span>
                              </div>
                            </div>
                            {selectedEodReport.check_out_latitude && selectedEodReport.check_out_longitude ? (
                              <div className="mt-2">
                                <MapPreview lat={selectedEodReport.check_out_latitude} lng={selectedEodReport.check_out_longitude} />
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2 border-t pt-4">
                          <div className="font-semibold text-gray-900">Checkout Notes</div>
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[60px] whitespace-pre-wrap">
                            {selectedEodReport.notes || 'No checkout notes provided.'}
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {!selectedReport && renderReportSelection()}
      {selectedReport === 'orders' && renderOrdersReport()}
      {selectedReport === 'enquiries' && renderEnquiriesReport()}
      {selectedReport === 'eod' && renderEodReport()}
    </div>
  );
};

export default Reports;
