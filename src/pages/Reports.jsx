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
import MapReportViewer from '../components/MapReportViewer';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Checkbox } from '../components/ui/checkbox';
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
import orderService from '../services/orderService';
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
  Car,
  MapPin,
  Flame,
  Layers,
  Map,
} from 'lucide-react';
import { format, parseISO, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { getStatusLabel, getStatusColor, ORDER_STATUSES, SELECTABLE_ORDER_STATUSES, PAYMENT_STATUSES } from '../lib/constants';
import { Badge2 } from '../components/ui/badge2';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../services/apiClient';
import useAuthStore from '../store/authStore';

const Reports = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedReport = searchParams.get('type') || null;

  const setSelectedReport = (reportType) => {
    if (reportType) {
      setSearchParams({ type: reportType });
    } else {
      setSearchParams({});
    }
  };

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

  // Repeat Customer Reports State
  const [repeatFilters, setRepeatFilters] = useState({
    date_from: '',
    date_to: '',
    min_orders: 2,
    page: 1,
    per_page: 50,
  });
  const [repeatReportData, setRepeatReportData] = useState(null);
  const [repeatLoading, setRepeatLoading] = useState(false);

  const fetchRepeatCustomersReport = async () => {
    setRepeatLoading(true);
    try {
      const params = {};
      if (repeatFilters.date_from) params.date_from = repeatFilters.date_from;
      if (repeatFilters.date_to) params.date_to = repeatFilters.date_to;
      if (repeatFilters.min_orders) params.min_orders = repeatFilters.min_orders;
      if (repeatFilters.page) params.page = repeatFilters.page;
      if (repeatFilters.per_page) params.per_page = repeatFilters.per_page;

      const data = await orderService.getRepeatCustomersReport(params);
      setRepeatReportData(data);
    } catch (error) {
      console.error('Error fetching repeat customers report:', error);
      toast.error('Failed to fetch repeat customers report');
    } finally {
      setRepeatLoading(false);
    }
  };

  // Orders Map Report State
  const [ordersMapFilters, setOrdersMapFilters] = useState({
    date_from: '',
    date_to: '',
    statuses: ['confirmed', 'completed', 'in_progress', 'tentative', 'cancelled'],
  });
  const [ordersMapData, setOrdersMapData] = useState(null);
  const [ordersMapLoading, setOrdersMapLoading] = useState(false);
  const [ordersMapViewMode, setOrdersMapViewMode] = useState('markers');

  const fetchOrdersMapReport = async () => {
    setOrdersMapLoading(true);
    try {
      const params = {};
      if (ordersMapFilters.date_from) params.date_from = ordersMapFilters.date_from;
      if (ordersMapFilters.date_to) params.date_to = ordersMapFilters.date_to;
      if (ordersMapFilters.statuses && ordersMapFilters.statuses.length > 0) {
        params.status = ordersMapFilters.statuses.join(',');
      }

      const data = await orderService.getOrdersMapReport(params);
      setOrdersMapData(data);
    } catch (error) {
      console.error('Error fetching orders map report:', error);
      toast.error('Failed to fetch orders map report');
    } finally {
      setOrdersMapLoading(false);
    }
  };

  // Enquiries Map Report State
  const [enquiriesMapFilters, setEnquiriesMapFilters] = useState({
    date_from: '',
    date_to: '',
    statuses: ['new', 'contacted', 'interested', 'needs_followup', 'converted', 'lost'],
    source: '',
  });
  const [enquiriesMapData, setEnquiriesMapData] = useState(null);
  const [enquiriesMapLoading, setEnquiriesMapLoading] = useState(false);
  const [enquiriesMapViewMode, setEnquiriesMapViewMode] = useState('markers');

  const fetchEnquiriesMapReport = async () => {
    setEnquiriesMapLoading(true);
    try {
      const params = {};
      if (enquiriesMapFilters.date_from) params.date_from = enquiriesMapFilters.date_from;
      if (enquiriesMapFilters.date_to) params.date_to = enquiriesMapFilters.date_to;
      if (enquiriesMapFilters.statuses && enquiriesMapFilters.statuses.length > 0) {
        params.status = enquiriesMapFilters.statuses.join(',');
      }
      if (enquiriesMapFilters.source) params.source = enquiriesMapFilters.source;

      const data = await orderService.getEnquiriesMapReport(params);
      setEnquiriesMapData(data);
    } catch (error) {
      console.error('Error fetching enquiries map report:', error);
      toast.error('Failed to fetch enquiries map report');
    } finally {
      setEnquiriesMapLoading(false);
    }
  };

  // Peak & Off-Peak Demand State
  const [peakDemandFilters, setPeakDemandFilters] = useState({
    date_from: '',
    date_to: '',
    area: '',
  });
  const [peakDemandData, setPeakDemandData] = useState(null);
  const [peakDemandLoading, setPeakDemandLoading] = useState(false);

  const fetchPeakDemandReport = async () => {
    setPeakDemandLoading(true);
    try {
      const params = {};
      if (peakDemandFilters.date_from) params.date_from = peakDemandFilters.date_from;
      if (peakDemandFilters.date_to) params.date_to = peakDemandFilters.date_to;
      if (peakDemandFilters.area) params.area = peakDemandFilters.area;

      const data = await orderService.getPeakDemandReport(params);
      setPeakDemandData(data);
    } catch (error) {
      console.error('Error fetching peak demand report:', error);
      toast.error('Failed to fetch peak demand report');
    } finally {
      setPeakDemandLoading(false);
    }
  };

  // Auto-fetch report data on mount or when selectedReport changes via URL query param
  useEffect(() => {
    if (selectedReport === 'orders_map' && !ordersMapData) {
      fetchOrdersMapReport();
    } else if (selectedReport === 'enquiries_map' && !enquiriesMapData) {
      fetchEnquiriesMapReport();
    } else if (selectedReport === 'repeat_customers' && !repeatReportData) {
      fetchRepeatCustomersReport();
    } else if (selectedReport === 'peak_demand' && !peakDemandData) {
      fetchPeakDemandReport();
    }
  }, [selectedReport]);

  const handleExportRepeatReport = () => {
    if (!repeatReportData || !repeatReportData.customers || repeatReportData.customers.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const { summary, customers } = repeatReportData;

    const summaryData = [
      { Metric: 'Total Distinct Customers', Value: summary.total_customers },
      { Metric: 'Repeat Customers Count', Value: summary.repeat_customers_count },
      { Metric: 'Repeat Customer Rate (%)', Value: `${summary.repeat_customer_rate}%` },
      { Metric: 'Total Orders Count', Value: summary.total_orders_count },
      { Metric: 'Repeat Orders Count', Value: summary.repeat_orders_count },
      { Metric: 'Total Revenue (₹)', Value: summary.total_revenue },
      { Metric: 'Repeat Orders Revenue (₹)', Value: summary.repeat_orders_revenue },
      { Metric: 'Avg Orders / Repeat Customer', Value: summary.avg_orders_per_repeat_customer },
    ];

    const customerRows = customers.map((c) => ({
      'Customer ID': c.customer_id,
      'Customer Name': c.customer_name || 'N/A',
      'Phone': c.customer_phone || 'N/A',
      'Email': c.customer_email || 'N/A',
      'City': c.city || 'N/A',
      'Total Orders': c.total_orders,
      'Total Spent (₹)': c.total_spent,
      'First Order Date': formatReportDate(c.first_order_date),
      'Last Order Date': formatReportDate(c.last_order_date),
    }));

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    const detailSheet = XLSX.utils.json_to_sheet(customerRows);

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Repeat Customers');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `repeat_customers_report_${repeatFilters.date_from || 'all'}_to_${repeatFilters.date_to || 'all'}.xlsx`);
    toast.success('Repeat Customers report exported successfully');
  };

  const handleViewEodDetails = (report) => {
    setSelectedEodReport(report);
    setIsEodDetailsOpen(true);
  };

  // Fetch employees list for dropdown
  const fetchEmployees = async () => {
    try {
      const response = await employeeService.getAllEmployees({ status: 'active', per_page: 1000 });
      setEmployees(response.employees || response || []);
    } catch (_) { }
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

  const formatCardNumber = (value) => {
    const num = Number(value || 0);
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  };

  const calculateOrderProfit = (order) => {
    if (!order) return 0;
    if (order.profit !== undefined && order.profit !== null && !isNaN(order.profit)) {
      return order.profit;
    }
    const total = Number(order.total_amount || 0);
    const agentIncentive = Number(order.agent_incentive || 0);
    const ta = Number(order.travel_allowance || 0);
    const fiveStarIncentive = Number(order.five_star_incentive || 0);
    return total - agentIncentive - ta - fiveStarIncentive;
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
      const profit = ordersInInterval.reduce((sum, order) => sum + calculateOrderProfit(order), 0);
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

    const excelData = reportData.orders.map((order) => {
      const discount = order.discount !== undefined
        ? order.discount
        : (order.offer_discount || 0) + (order.points_discount || 0);
      return {
        'Order Number': order.order_number,
        'Customer Name': order.customer?.name || '',
        'Customer Phone': order.customer?.phone || '',
        'Booking Date': format(parseISO(order.booking_date), 'yyyy-MM-dd'),
        'Status': getStatusLabel(order.status),
        'Payment Status': order.payment_status,
        'Payment Type': order.payment_method || '',
        'Distance (km)': order.travelled_distance,
        'TA Amount': order.travel_allowance,
        'Subtotal': order.subtotal_amount,
        'Discount': discount,
        'Total': order.total_amount,
        'GST': order.gst_amount,
        'Rating': order.rating || 'N/A',
        'Agent Name': order.assigned_to?.name || '',
        'Agent Incentive': order.agent_incentive,
        'Five Star Incentive': order.five_star_incentive,
        'Profit': calculateOrderProfit(order),
      };
    });

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
      'Distance (km)': reportData.summary.total_travelled_distance,
      'TA Amount': reportData.summary.total_travel_allowance,
      'Subtotal': '',
      'Discount': reportData.summary.total_discount !== undefined
        ? reportData.summary.total_discount
        : reportData.orders.reduce((sum, o) => sum + (o.discount !== undefined ? o.discount : (o.offer_discount || 0) + (o.points_discount || 0)), 0),
      'Total': reportData.summary.total_amount,
      'GST': reportData.summary.gst_amount,
      'Rating': '',
      'Agent Name': '',
      'Agent Incentive': reportData.summary.total_agent_incentive,
      'Five Star Incentive': reportData.summary.total_five_star_incentive,
      'Profit': reportData.summary.profit !== undefined ? reportData.summary.profit : reportData.orders.reduce((sum, o) => sum + calculateOrderProfit(o), 0),
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

        {/* Repeat Customers & Orders Report Card */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSelectedReport('repeat_customers');
            fetchRepeatCustomersReport();
          }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="mt-4">Repeat Customers & Orders</CardTitle>
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Analyze customer retention metrics, repeat order rate, revenue generated from repeat buyers, and customer frequency breakdown.
            </p>
          </CardContent>
        </Card>

        {/* Orders Map & Heatmap Report Card */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSelectedReport('orders_map');
            fetchOrdersMapReport();
          }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="mt-4">Orders Map & Heatmap</CardTitle>
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Visualize orders geographically on an interactive map. Pinpoint locations, view area demand heatmaps, and analyze revenue by neighborhood.
            </p>
          </CardContent>
        </Card>

        {/* Enquiries Map & Heatmap Report Card */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSelectedReport('enquiries_map');
            fetchEnquiriesMapReport();
          }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="mt-4">Enquiries Map & Heatmap</CardTitle>
              <Map className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Visualize prospective customer enquiries geographically. Identify high-demand lead areas, conversion hotspots, and source distributions.
            </p>
          </CardContent>
        </Card>

        {/* Peak & Off-Peak Demand Report Card */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setSelectedReport('peak_demand');
            fetchPeakDemandReport();
          }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="mt-4">Peak & Off-Peak Demand</CardTitle>
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Analyze booking volume trends by day of week and time slot. Identify peak operational bottlenecks and quiet slots to launch targeted off-peak discount campaigns.
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
          <h1 className="text-2xl font-bold">Orders Report</h1>
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
                  {SELECTABLE_ORDER_STATUSES.map((status) => (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                ₹{formatCardNumber(reportData.summary.total_amount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sum of Discounts</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">
                ₹{formatCardNumber(
                  reportData.summary.total_discount !== undefined
                    ? reportData.summary.total_discount
                    : reportData.orders
                    ? reportData.orders.reduce(
                        (sum, o) =>
                          sum +
                          (o.discount !== undefined
                            ? o.discount
                            : (o.offer_discount || 0) + (o.points_discount || 0)),
                        0
                      )
                    : 0
                )}
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
                ₹{formatCardNumber(reportData.summary.gst_amount)}
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
                ₹{formatCardNumber(reportData.summary.profit)}
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
                ₹{formatCardNumber(reportData.summary.total_agent_incentive)}
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
                ₹{formatCardNumber(reportData.summary.total_five_star_incentive)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCardNumber(reportData.summary.total_travelled_distance)} km
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total TA Amount</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ₹{formatCardNumber(reportData.summary.total_travel_allowance)}
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
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Order #</th>
                        <th className="text-left p-2">Customer</th>
                        <th className="text-left p-2">Booking Date</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Payment</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-right p-2">Distance</th>
                        <th className="text-right p-2">TA Amount</th>
                        <th className="text-right p-2">Subtotal</th>
                        <th className="text-right p-2">Discount</th>
                        <th className="text-right p-2">Total</th>
                        <th className="text-right p-2">GST</th>
                        <th className="text-center p-2">Rating</th>
                        <th className="text-left p-2">Agent</th>
                        <th className="text-right p-2">Agent Inc.</th>
                        <th className="text-right p-2">5★ Inc.</th>
                        <th className="text-right p-2">Profit</th>
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
                          <td className="text-right p-2 font-medium">
                            {order.travelled_distance !== undefined && order.travelled_distance !== null ? `${order.travelled_distance.toFixed(2)} km` : '0.00 km'}
                          </td>
                          <td className="text-right p-2 font-medium text-slate-700">
                            {order.travel_allowance !== undefined && order.travel_allowance !== null ? `₹${order.travel_allowance.toFixed(2)}` : '₹0.00'}
                          </td>
                          <td className="text-right p-2">₹{order.subtotal_amount.toFixed(2)}</td>
                          <td className="text-right p-2 text-rose-600 font-medium">
                            ₹{(order.discount !== undefined ? order.discount : (order.offer_discount || 0) + (order.points_discount || 0)).toFixed(2)}
                          </td>
                          <td className="text-right p-2 font-medium">
                            ₹{order.total_amount.toFixed(2)}
                          </td>
                          <td className="text-right p-2">₹{order.gst_amount.toFixed(2)}</td>
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
                          <td className="text-right p-2 text-green-600 font-medium">
                            ₹{calculateOrderProfit(order).toFixed(2)}
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
            <h1 className="text-2xl font-bold">Enquiries Report</h1>
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
          <h1 className="text-2xl font-bold">End of Day Reports</h1>
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

  // Repeat Customers Report View
  const renderRepeatCustomersReport = () => (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedReport(null);
              setRepeatReportData(null);
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Repeat Customers & Orders Report</h1>
            <p className="text-sm text-muted-foreground">Analyze repeat customer frequency, retention rate, and revenue contributions.</p>
          </div>
        </div>
        {repeatReportData && repeatReportData.customers && repeatReportData.customers.length > 0 && (
          <Button onClick={handleExportRepeatReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        )}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="repeat_date_from">Date From</Label>
              <Input
                id="repeat_date_from"
                type="date"
                value={repeatFilters.date_from}
                onChange={(e) => setRepeatFilters((prev) => ({ ...prev, date_from: e.target.value, page: 1 }))}
              />
            </div>
            <div>
              <Label htmlFor="repeat_date_to">Date To</Label>
              <Input
                id="repeat_date_to"
                type="date"
                value={repeatFilters.date_to}
                onChange={(e) => setRepeatFilters((prev) => ({ ...prev, date_to: e.target.value, page: 1 }))}
              />
            </div>
            <div>
              <Label htmlFor="min_orders">Min Orders Threshold</Label>
              <Select
                value={String(repeatFilters.min_orders)}
                onValueChange={(val) => setRepeatFilters((prev) => ({ ...prev, min_orders: parseInt(val), page: 1 }))}
              >
                <SelectTrigger id="min_orders">
                  <SelectValue placeholder="Select min orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2+ Orders (Repeat)</SelectItem>
                  <SelectItem value="3">3+ Orders</SelectItem>
                  <SelectItem value="5">5+ Orders (VIP)</SelectItem>
                  <SelectItem value="10">10+ Orders (Loyal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={fetchRepeatCustomersReport} className="w-full" disabled={repeatLoading}>
                {repeatLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRepeatFilters({ date_from: '', date_to: '', min_orders: 2, page: 1, per_page: 50 });
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      {repeatLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* KPI Cards */}
      {!repeatLoading && repeatReportData && repeatReportData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repeat Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{repeatReportData.summary.repeat_customers_count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Out of {repeatReportData.summary.total_customers} total distinct customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repeat Customer Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {repeatReportData.summary.repeat_customer_rate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Customer retention metric</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repeat Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{formatCardNumber(repeatReportData.summary.repeat_orders_revenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {repeatReportData.summary.repeat_orders_count} orders placed by repeat customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Orders / Customer</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {repeatReportData.summary.avg_orders_per_repeat_customer}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Average order frequency</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Repeat Customers Data Table */}
      {!repeatLoading && repeatReportData && repeatReportData.customers && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Repeat Customers Directory ({repeatReportData.total_repeat_customers})</CardTitle>
          </CardHeader>
          <CardContent>
            {repeatReportData.customers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No repeat customers found matching the selected criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 text-center">Total Orders</th>
                      <th className="px-4 py-3 text-right">Total Spent</th>
                      <th className="px-4 py-3">First Order</th>
                      <th className="px-4 py-3">Last Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {repeatReportData.customers.map((c) => (
                      <tr key={c.customer_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {c.customer_name || 'N/A'}
                          {c.city ? <span className="block text-xs text-muted-foreground font-normal">{c.city}</span> : null}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div>{c.customer_phone || '-'}</div>
                          {c.customer_email && <div className="text-muted-foreground">{c.customer_email}</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge2 variant="outline" className="font-bold text-primary">
                            {c.total_orders} Orders
                          </Badge2>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          ₹{formatCardNumber(c.total_spent)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatReportDate(c.first_order_date)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatReportDate(c.last_order_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {repeatReportData.total_pages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <span className="text-xs text-muted-foreground">
                  Page {repeatReportData.current_page} of {repeatReportData.total_pages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={repeatReportData.current_page <= 1 || repeatLoading}
                    onClick={() => {
                      setRepeatFilters((prev) => ({ ...prev, page: prev.page - 1 }));
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={repeatReportData.current_page >= repeatReportData.total_pages || repeatLoading}
                    onClick={() => {
                      setRepeatFilters((prev) => ({ ...prev, page: prev.page + 1 }));
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );

  // Orders Map Report View
  const renderOrdersMapReport = () => {
    const orderStatusesList = [
      { id: 'tentative', label: 'Tentative', color: 'bg-amber-500' },
      { id: 'confirmed', label: 'Confirmed', color: 'bg-blue-500' },
      { id: 'in_progress', label: 'In Progress', color: 'bg-purple-500' },
      { id: 'completed', label: 'Completed', color: 'bg-emerald-500' },
      { id: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
    ];

    const toggleOrderStatus = (statusId) => {
      setOrdersMapFilters((prev) => {
        const current = prev.statuses || [];
        const updated = current.includes(statusId)
          ? current.filter((s) => s !== statusId)
          : [...current, statusId];
        return { ...prev, statuses: updated };
      });
    };

    const summary = ordersMapData?.summary || { total_orders: 0, total_revenue: 0, mapped_orders: 0, unmapped_orders: 0, top_area: '-' };

    return (
      <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedReport(null);
                setOrdersMapData(null);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Orders Map & Heatmap Report</h1>
              <p className="text-sm text-muted-foreground">Geographical demand visualization, order pinpoints, and area revenue analysis.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchOrdersMapReport} disabled={ordersMapLoading} className="flex items-center gap-2">
              {ordersMapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Filter className="h-4 w-4 text-primary" />
              Filter Map & Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="orders_map_date_from">Date From</Label>
                <Input
                  id="orders_map_date_from"
                  type="date"
                  value={ordersMapFilters.date_from}
                  onChange={(e) => setOrdersMapFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="orders_map_date_to">Date To</Label>
                <Input
                  id="orders_map_date_to"
                  type="date"
                  value={ordersMapFilters.date_to}
                  onChange={(e) => setOrdersMapFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                />
              </div>
              <div>
                <Label>Order Statuses (Multi-Select)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal text-left truncate h-9">
                      <span>
                        {ordersMapFilters.statuses?.length === 0
                          ? 'Select Statuses'
                          : ordersMapFilters.statuses?.length === orderStatusesList.length
                            ? 'All Statuses'
                            : `${ordersMapFilters.statuses?.length} Statuses Selected`}
                      </span>
                      <Filter className="h-3.5 w-3.5 opacity-50 shrink-0 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-xs font-semibold text-gray-700">Filter Statuses</span>
                      <button
                        type="button"
                        onClick={() =>
                          setOrdersMapFilters((prev) => ({
                            ...prev,
                            statuses: prev.statuses?.length === orderStatusesList.length ? [] : orderStatusesList.map((s) => s.id),
                          }))
                        }
                        className="text-[11px] text-primary hover:underline font-semibold"
                      >
                        {ordersMapFilters.statuses?.length === orderStatusesList.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                      {orderStatusesList.map((st) => (
                        <label key={st.id} className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                          <Checkbox
                            checked={ordersMapFilters.statuses?.includes(st.id)}
                            onCheckedChange={() => toggleOrderStatus(st.id)}
                          />
                          <span className={`w-2 h-2 rounded-full ${st.color}`} />
                          <span className="capitalize">{st.label}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchOrdersMapReport} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={ordersMapLoading}>
                  {ordersMapLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total_orders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">₹{summary.total_revenue?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Mapped Coordinates</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.mapped_orders} <span className="text-xs font-normal text-slate-500">/ {summary.total_orders}</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Top Demand Area</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 truncate">{summary.top_area || '-'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Map Header & View Mode Switcher */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-card border rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-sm">Geographical Map View</span>
            <span className="text-xs text-muted-foreground">({ordersMapData?.points?.length || 0} locations plotted)</span>
          </div>
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
            <Button
              variant={ordersMapViewMode === 'markers' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setOrdersMapViewMode('markers')}
              className="h-7 text-xs gap-1.5"
            >
              <MapPin className="h-3.5 w-3.5" />
              Pin Markers
            </Button>
            <Button
              variant={ordersMapViewMode === 'heatmap' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setOrdersMapViewMode('heatmap')}
              className="h-7 text-xs gap-1.5"
            >
              <Flame className="h-3.5 w-3.5" />
              Heatmap
            </Button>
            <Button
              variant={ordersMapViewMode === 'both' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setOrdersMapViewMode('both')}
              className="h-7 text-xs gap-1.5"
            >
              <Layers className="h-3.5 w-3.5" />
              Combined
            </Button>
          </div>
        </div>

        {/* Leaflet Map Rendering */}
        {ordersMapLoading ? (
          <Skeleton className="w-full h-[480px] rounded-xl" />
        ) : (
          <MapReportViewer
            points={ordersMapData?.points || []}
            viewMode={ordersMapViewMode}
            reportType="orders"
            onNavigateDetail={(id) => window.open(`/orders/${id}`, '_blank')}
          />
        )}

        {/* Area Breakdown Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Area Order Breakdown & Revenue</span>
              <span className="text-xs font-normal text-muted-foreground">({ordersMapData?.area_breakdown?.length || 0} Areas)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersMapData?.area_breakdown && ordersMapData.area_breakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                    <tr>
                      <th className="px-4 py-3">Area</th>
                      <th className="px-4 py-3 text-right">Orders Count</th>
                      <th className="px-4 py-3 text-right">Completed Orders</th>
                      <th className="px-4 py-3 text-right">Total Revenue (₹)</th>
                      <th className="px-4 py-3 text-right">% of Total Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ordersMapData.area_breakdown.map((row, idx) => {
                      const percentage = summary.total_orders > 0
                        ? ((row.order_count / summary.total_orders) * 100).toFixed(1)
                        : 0;

                      return (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800 capitalize flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            {row.area}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">{row.order_count}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{row.completed_count}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-900">₹{row.total_revenue?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded border border-emerald-200">
                              {percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-6 text-sm text-muted-foreground">No area data available for the selected filters.</p>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  // Enquiries Map Report View
  const renderEnquiriesMapReport = () => {
    const enquiryStatusesList = [
      { id: 'new', label: 'New', color: 'bg-sky-500' },
      { id: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
      { id: 'interested', label: 'Interested', color: 'bg-indigo-500' },
      { id: 'needs_followup', label: 'Needs Followup', color: 'bg-amber-500' },
      { id: 'converted', label: 'Converted', color: 'bg-emerald-500' },
      { id: 'lost', label: 'Lost', color: 'bg-rose-500' },
    ];

    const toggleEnquiryStatus = (statusId) => {
      setEnquiriesMapFilters((prev) => {
        const current = prev.statuses || [];
        const updated = current.includes(statusId)
          ? current.filter((s) => s !== statusId)
          : [...current, statusId];
        return { ...prev, statuses: updated };
      });
    };

    const summary = enquiriesMapData?.summary || { total_enquiries: 0, converted_count: 0, conversion_rate: 0, mapped_enquiries: 0, unmapped_enquiries: 0, top_area: '-' };

    return (
      <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedReport(null);
                setEnquiriesMapData(null);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Enquiries Map & Heatmap Report</h1>
              <p className="text-sm text-muted-foreground">Geographical lead generation, conversion hotspots, and area lead density analysis.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchEnquiriesMapReport} disabled={enquiriesMapLoading} className="flex items-center gap-2">
              {enquiriesMapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Filter className="h-4 w-4 text-primary" />
              Filter Map & Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="enquiries_map_date_from">Date From</Label>
                <Input
                  id="enquiries_map_date_from"
                  type="date"
                  value={enquiriesMapFilters.date_from}
                  onChange={(e) => setEnquiriesMapFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="enquiries_map_date_to">Date To</Label>
                <Input
                  id="enquiries_map_date_to"
                  type="date"
                  value={enquiriesMapFilters.date_to}
                  onChange={(e) => setEnquiriesMapFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                />
              </div>
              <div>
                <Label>Enquiry Statuses (Multi-Select)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal text-left truncate h-9">
                      <span>
                        {enquiriesMapFilters.statuses?.length === 0
                          ? 'Select Statuses'
                          : enquiriesMapFilters.statuses?.length === enquiryStatusesList.length
                            ? 'All Statuses'
                            : `${enquiriesMapFilters.statuses?.length} Statuses Selected`}
                      </span>
                      <Filter className="h-3.5 w-3.5 opacity-50 shrink-0 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-xs font-semibold text-gray-700">Filter Statuses</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEnquiriesMapFilters((prev) => ({
                            ...prev,
                            statuses: prev.statuses?.length === enquiryStatusesList.length ? [] : enquiryStatusesList.map((s) => s.id),
                          }))
                        }
                        className="text-[11px] text-primary hover:underline font-semibold"
                      >
                        {enquiriesMapFilters.statuses?.length === enquiryStatusesList.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                      {enquiryStatusesList.map((st) => (
                        <label key={st.id} className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                          <Checkbox
                            checked={enquiriesMapFilters.statuses?.includes(st.id)}
                            onCheckedChange={() => toggleEnquiryStatus(st.id)}
                          />
                          <span className={`w-2 h-2 rounded-full ${st.color}`} />
                          <span className="capitalize">{st.label}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchEnquiriesMapReport} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={enquiriesMapLoading}>
                  {enquiriesMapLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Total Enquiries</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total_enquiries}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Converted Leads</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.converted_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.conversion_rate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Top Lead Area</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 truncate">{summary.top_area || '-'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Map Header & View Mode Switcher */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-card border rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-sm">Geographical Lead Map View</span>
            <span className="text-xs text-muted-foreground">({enquiriesMapData?.points?.length || 0} lead points plotted)</span>
          </div>
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
            <Button
              variant={enquiriesMapViewMode === 'markers' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEnquiriesMapViewMode('markers')}
              className="h-7 text-xs gap-1.5"
            >
              <MapPin className="h-3.5 w-3.5" />
              Pin Markers
            </Button>
            <Button
              variant={enquiriesMapViewMode === 'heatmap' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEnquiriesMapViewMode('heatmap')}
              className="h-7 text-xs gap-1.5"
            >
              <Flame className="h-3.5 w-3.5" />
              Heatmap
            </Button>
            <Button
              variant={enquiriesMapViewMode === 'both' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEnquiriesMapViewMode('both')}
              className="h-7 text-xs gap-1.5"
            >
              <Layers className="h-3.5 w-3.5" />
              Combined
            </Button>
          </div>
        </div>

        {/* Leaflet Map Rendering */}
        {enquiriesMapLoading ? (
          <Skeleton className="w-full h-[480px] rounded-xl" />
        ) : (
          <MapReportViewer
            points={enquiriesMapData?.points || []}
            viewMode={enquiriesMapViewMode}
            reportType="enquiries"
            onNavigateDetail={(id) => window.open(`/enquiries/${id}`, '_blank')}
          />
        )}

        {/* Area Breakdown Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Area Lead Breakdown & Conversion Rates</span>
              <span className="text-xs font-normal text-muted-foreground">({enquiriesMapData?.area_breakdown?.length || 0} Areas)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enquiriesMapData?.area_breakdown && enquiriesMapData.area_breakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                    <tr>
                      <th className="px-4 py-3">Area</th>
                      <th className="px-4 py-3 text-right">Enquiry Count</th>
                      <th className="px-4 py-3 text-right">Converted Count</th>
                      <th className="px-4 py-3 text-right">Conversion Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {enquiriesMapData.area_breakdown.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800 capitalize flex items-center gap-2">
                          <Map className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          {row.area}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{row.enquiry_count}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{row.converted_count}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                          <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded border border-indigo-200">
                            {row.conversion_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-6 text-sm text-muted-foreground">No area lead data available for the selected filters.</p>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  // Peak & Off-Peak Demand Report View
  const renderPeakDemandReport = () => {
    const summary = peakDemandData?.summary || {
      total_orders: 0,
      total_revenue: 0,
      busiest_day: '-',
      busiest_hour: '-',
      quietest_day: '-',
      quietest_hour: '-',
      weekend_order_share: 0,
      weekday_order_share: 0,
    };

    const daysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hoursList = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    const getMatrixCell = (dayIdx, hour) => {
      if (!peakDemandData?.demand_matrix) return { order_count: 0, total_revenue: 0, is_peak: false };
      return peakDemandData.demand_matrix.find((m) => m.day_of_week === dayIdx && m.hour === hour) || {
        order_count: 0,
        total_revenue: 0,
        is_peak: false,
      };
    };

    return (
      <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedReport(null);
                setPeakDemandData(null);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Peak & Off-Peak Demand Report</h1>
              <p className="text-sm text-muted-foreground">Analyze booking volume trends by day of week and time slot to optimize ad schedules and off-peak promotions.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchPeakDemandReport} disabled={peakDemandLoading} className="flex items-center gap-2">
              {peakDemandLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Filter className="h-4 w-4 text-primary" />
              Filter Demand Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="peak_date_from">Date From</Label>
                <Input
                  id="peak_date_from"
                  type="date"
                  value={peakDemandFilters.date_from}
                  onChange={(e) => setPeakDemandFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="peak_date_to">Date To</Label>
                <Input
                  id="peak_date_to"
                  type="date"
                  value={peakDemandFilters.date_to}
                  onChange={(e) => setPeakDemandFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="peak_area">Area / Location Filter</Label>
                <Input
                  id="peak_area"
                  type="text"
                  placeholder="e.g. Cochin, Kakkanad"
                  value={peakDemandFilters.area}
                  onChange={(e) => setPeakDemandFilters((prev) => ({ ...prev, area: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchPeakDemandReport} className="w-full bg-primary text-white" disabled={peakDemandLoading}>
                  {peakDemandLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Busiest Day</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.busiest_day}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Peak Time Slot</p>
              <p className="text-xl font-bold text-emerald-700 mt-1 truncate">{summary.busiest_hour}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Quietest Off-Peak Slot</p>
              <p className="text-xl font-bold text-amber-700 mt-1 truncate">{summary.quietest_hour}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Weekend vs Weekday Share</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {summary.weekend_order_share}% <span className="text-xs font-normal text-slate-500">Weekend / {summary.weekday_order_share}% Weekday</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 7x24 Demand Heatmap Grid */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Hourly Demand Matrix (7 Days × 12 Operating Hours)
              </CardTitle>
              <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Peak Demand</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Moderate Demand</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-200" /> Off-Peak / Quiet</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {peakDemandLoading ? (
              <Skeleton className="w-full h-64 rounded-xl" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Day \ Hour</th>
                      {hoursList.map((h) => (
                        <th key={h} className="px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap">
                          {h % 12 === 0 ? 12 : h % 12}{h >= 12 ? 'pm' : 'am'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {daysList.map((dayName, dIdx) => (
                      <tr key={dayName} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-left text-slate-800 bg-muted/30 whitespace-nowrap">{dayName}</td>
                        {hoursList.map((h) => {
                          const cell = getMatrixCell(dIdx, h);
                          const count = cell.order_count;
                          const isPeak = cell.is_peak;

                          let cellBg = 'bg-gray-50/50 text-slate-400 border-gray-100';
                          if (isPeak) {
                            cellBg = 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold shadow-xs';
                          } else if (count > 0) {
                            cellBg = 'bg-blue-50 text-blue-900 border-blue-200 font-bold';
                          }

                          return (
                            <td key={h} className={`px-2 py-2 border text-center transition-all ${cellBg}`} title={`${dayName} ${h}:00 - ${count} orders (₹${cell.total_revenue})`}>
                              <div className="flex flex-col items-center justify-center">
                                <span>{count > 0 ? count : '-'}</span>
                                {count > 0 && <span className="text-[10px] opacity-75 font-normal">₹{cell.total_revenue}</span>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Day of Week Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Orders by Day of Week</CardTitle>
            </CardHeader>
            <CardContent>
              {peakDemandData?.day_of_week_breakdown ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakDemandData.day_of_week_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day_name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [name === 'total_revenue' ? `₹${value}` : value, name === 'total_revenue' ? 'Revenue' : 'Orders']} />
                      <Bar dataKey="order_count" name="Orders" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Skeleton className="w-full h-64" />
              )}
            </CardContent>
          </Card>

          {/* Time Block Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Orders by Time Block</CardTitle>
            </CardHeader>
            <CardContent>
              {peakDemandData?.time_block_breakdown ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakDemandData.time_block_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="block_name" tick={{ fontSize: 10 }} interval={0} />
                      <YAxis />
                      <Tooltip formatter={(value) => [value, 'Orders']} />
                      <Bar dataKey="order_count" name="Orders" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Skeleton className="w-full h-64" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Off-Peak Marketing Opportunities Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Off-Peak Marketing Opportunities & Recommendations</span>
              <span className="text-xs font-normal text-muted-foreground">Actionable Campaign Suggestions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {peakDemandData?.recommendations && peakDemandData.recommendations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                    <tr>
                      <th className="px-4 py-3">Day</th>
                      <th className="px-4 py-3">Time Slot</th>
                      <th className="px-4 py-3 text-center">Current Bookings</th>
                      <th className="px-4 py-3">Suggested Marketing Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {peakDemandData.recommendations.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">{rec.day_name}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{rec.time_slot}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded border border-amber-200">
                            {rec.current_count} Bookings
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                          {rec.suggested_strategy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-6 text-sm text-muted-foreground">No off-peak recommendation data available for the selected filters.</p>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {!selectedReport && renderReportSelection()}
      {selectedReport === 'orders' && renderOrdersReport()}
      {selectedReport === 'enquiries' && renderEnquiriesReport()}
      {selectedReport === 'eod' && renderEodReport()}
      {selectedReport === 'repeat_customers' && renderRepeatCustomersReport()}
      {selectedReport === 'orders_map' && renderOrdersMapReport()}
      {selectedReport === 'enquiries_map' && renderEnquiriesMapReport()}
      {selectedReport === 'peak_demand' && renderPeakDemandReport()}
    </div>
  );
};

export default Reports;
