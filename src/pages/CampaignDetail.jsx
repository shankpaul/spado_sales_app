import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/dialog';
import { Badge2 } from '../components/ui/badge2';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Gift,
  Calendar,
  Building,
  Tag,
  ArrowLeft,
  Loader2,
  Plus,
  Download,
  Search,
  CheckCircle,
  FileText,
  UserCheck,
  Edit,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Trash2,
  RefreshCw
} from 'lucide-react';
import campaignService from '../services/campaignService';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [campaign, setCampaign] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics');

  // Coupons search/filter states
  const [couponSearch, setCouponSearch] = useState('');
  const [couponStatusFilter, setCouponStatusFilter] = useState('all');
  const [couponPage, setCouponPage] = useState(1);

  // Dialog States
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [batchData, setBatchData] = useState({ quantity: 100, batch_number: 2 });
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Custom Confirm Dialog State
  const [confirmConfig, setConfirmConfig] = useState({
    open: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    variant: 'default',
    onConfirm: null,
  });

  // Check if coupons are present and all are unused (created or cancelled)
  const canRegenerateUnused = coupons && coupons.length > 0 && coupons.every(c => c.status === 'created' || c.status === 'cancelled');

  const triggerRegenerateUnused = () => {
    setConfirmConfig({
      open: true,
      title: '⚠️ CRITICAL WARNING: Regenerate Unused Coupon Codes',
      description: 'ATTENTION: This action will permanently overwrite and replace ALL unused coupon codes (status: created or cancelled) with new codes generated according to the current campaign pattern. Existing printed or distributed codes that are unused will be invalidated.',
      confirmText: 'Yes, Regenerate Unused Codes',
      variant: 'destructive',
      onConfirm: async () => {
        setRegenerating(true);
        try {
          await campaignService.regenerateUnusedCoupons(id);
          toast.success('Unused coupon codes regenerated successfully');
          fetchCampaignDetails();
          fetchCoupons();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to regenerate unused coupon codes');
        } finally {
          setRegenerating(false);
        }
      },
    });
  };

  const triggerCancelCoupon = (coupon) => {
    setConfirmConfig({
      open: true,
      title: 'Cancel Coupon Code',
      description: `Are you sure you want to cancel coupon code "${coupon.code}"? This action is permanent and cannot be undone.`,
      confirmText: 'Yes, Cancel Coupon',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await campaignService.updateCoupon(coupon.id, { status: 'cancelled' });
          toast.success(`Coupon ${coupon.code} cancelled`);
          fetchCoupons();
          fetchCampaignDetails();
        } catch (error) {
          toast.error('Failed to cancel coupon');
        }
      },
    });
  };

  // Pre-assignment mobile edit states
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [tempMobile, setTempMobile] = useState('');

  useEffect(() => {
    fetchCampaignDetails();
    fetchCoupons();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'coupons' || activeTab === 'batches') {
      fetchCoupons();
    }
  }, [id, activeTab, couponSearch, couponStatusFilter, couponPage]);

  // Helper to extract or derive batches list safely
  const getBatchesList = () => {
    if (campaign?.batches && campaign.batches.length > 0) return campaign.batches;
    if (campaign?.coupon_batches && campaign.coupon_batches.length > 0) return campaign.coupon_batches;
    if (analytics?.batches && analytics.batches.length > 0) return analytics.batches;
    if (analytics?.coupon_batches && analytics.coupon_batches.length > 0) return analytics.coupon_batches;

    // Fallback: Derive batches from loaded coupons list
    if (coupons && coupons.length > 0) {
      const batchMap = {};
      coupons.forEach(c => {
        const batchNum = c.batch_number || 1;
        if (!batchMap[batchNum]) {
          batchMap[batchNum] = {
            id: `batch-${batchNum}`,
            batch_number: batchNum,
            quantity: 0,
            created_at: c.created_at || campaign?.created_at,
          };
        }
        batchMap[batchNum].quantity += 1;
      });
      return Object.values(batchMap).sort((a, b) => a.batch_number - b.batch_number);
    }

    return [];
  };

  const derivedBatches = getBatchesList();

  const fetchCampaignDetails = async () => {
    setLoading(true);
    try {
      const campRes = await campaignService.getCampaignById(id);
      setCampaign(campRes.data);

      const analRes = await campaignService.getCampaignAnalytics(id);
      setAnalytics(analRes.data);

      // Auto-suggest next batch number and continuation sequence start
      const nextBatch = (derivedBatches?.length || campRes.data.batches?.length || 0) + 1;
      const codeLen = campRes.data.random_code_length || 7;
      const baseOffset = Math.pow(10, Math.max(0, codeLen - 1));
      const totalGen = analRes.data?.total_coupons_generated || 0;
      setBatchData({
        quantity: 100,
        batch_number: nextBatch,
        start_sequence_number: baseOffset + totalGen + 1,
      });
    } catch (error) {
      toast.error('Failed to load campaign details');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await campaignService.getAllCoupons({
        campaign_id: id,
        search: couponSearch,
        status: couponStatusFilter === 'all' ? '' : couponStatusFilter,
        page: couponPage,
        per_page: 15,
      });
      setCoupons(response.data || []);
      setTotalCoupons(response.meta?.total || 0);
    } catch (error) {
      toast.error('Failed to load coupons list');
    }
  };

  const handleGenerateBatch = async (e) => {
    e.preventDefault();
    if (batchData.quantity <= 0 || batchData.batch_number <= 0) {
      toast.error('Invalid quantity or batch number');
      return;
    }
    setGeneratingBatch(true);
    try {
      await campaignService.generateCoupons(id, {
        quantity: parseInt(batchData.quantity, 10),
        batch_number: parseInt(batchData.batch_number, 10),
        start_sequence_number: batchData.start_sequence_number ? parseInt(batchData.start_sequence_number, 10) : undefined,
      });
      toast.success('Additional coupon batch generated successfully');
      setIsBatchDialogOpen(false);
      fetchCampaignDetails();
      if (activeTab === 'coupons') fetchCoupons();
    } catch (error) {
      const msg = error.response?.data?.errors?.[0] || 'Failed to generate coupons batch';
      toast.error(msg);
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handleUpdateCouponMobile = async (coupon) => {
    try {
      await campaignService.updateCoupon(coupon.id, {
        assigned_mobile: tempMobile || '',
      });
      toast.success(`Coupon pre-assignment updated`);
      setEditingCouponId(null);
      fetchCoupons();
      fetchCampaignDetails(); // reload stats
    } catch (error) {
      toast.error('Failed to update coupon mobile');
    }
  };

  const handleBulkStatusChange = async (status) => {
    // Collect all loaded coupon codes for bulk update as a simple shortcut
    const codes = coupons.map(c => c.code);
    if (codes.length === 0) return;

    if (!window.confirm(`Mark all ${codes.length} coupons on this page as "${status}"?`)) return;

    try {
      await campaignService.bulkUpdateCouponStatus({ codes, status });
      toast.success(`Bulk updated coupon statuses to ${status}`);
      fetchCoupons();
      fetchCampaignDetails();
    } catch (error) {
      toast.error('Failed to bulk update statuses');
    }
  };

  const handleExportCSV = () => {
    // Generate a simple CSV file using API coupons list
    // Real export would fetch all coupons, but we will write a quick csv download of current dataset
    if (coupons.length === 0) {
      toast.info('No coupons available to export');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Coupon Code,Location,Partner,Batch,Status,Assigned Mobile,Remaining Uses,Redeemed Count\n';

    coupons.forEach(c => {
      csvContent += `"${c.code}","${c.location_name || ''}","${c.partner_name || ''}",${c.batch_number},"${c.status}","${c.assigned_mobile || ''}",${c.remaining_uses},${c.redemption_count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Campaign_Coupons_${campaign.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Coupons list exported to CSV');
  };

  // Pie chart stats configuration
  const getPieChartData = () => {
    if (!analytics) return [];
    return [
      { name: 'Created', value: analytics.created_count, color: '#94a3b8' },
      { name: 'Distributed', value: analytics.distributed_count, color: '#3b82f6' },
      { name: 'Activated', value: analytics.activated_count, color: '#f59e0b' },
      { name: 'Completed', value: analytics.completed_count, color: '#10b981' },
      { name: 'Expired', value: analytics.expired_count, color: '#ef4444' },
    ].filter(item => item.value > 0);
  };

  if (loading || !campaign) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pieData = getPieChartData();

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/campaigns')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-800">{campaign.name}</h1>
              <Badge2 variant="outline" className="font-mono bg-primary/10 text-primary font-bold border-primary/20">
                {campaign.code}
              </Badge2>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5 capitalize">
              {campaign.campaign_type} Campaign • Created on {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <div className="flex gap-2">
            {canRegenerateUnused && (
              <Button
                variant="outline"
                onClick={triggerRegenerateUnused}
                disabled={regenerating}
                className="border-red-300 text-red-700 bg-red-50/90 hover:bg-red-100 hover:text-red-800 flex items-center gap-1.5 text-xs font-bold shadow-2xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-red-600 ${regenerating ? 'animate-spin' : ''}`} />
                Regenerate Unused Codes
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
            >
              Edit Campaign
            </Button>
            <Button
              onClick={() => setIsBatchDialogOpen(true)}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium transition-all"
            >
              <Plus className="h-4 w-4 mr-2" /> Generate Batch
            </Button>
          </div>
        )}
      </div>

      {/* KPI stats bar */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border border-gray-100 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue Generated</p>
                <h3 className="text-xl font-extrabold text-gray-800 mt-0.5">₹{analytics.revenue_generated.toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-rose-50 p-2.5 rounded-lg text-rose-600">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount Given</p>
                <h3 className="text-xl font-extrabold text-gray-800 mt-0.5">₹{analytics.discount_given.toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversion Rate</p>
                <h3 className="text-xl font-extrabold text-gray-800 mt-0.5">{analytics.conversion_rate}%</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Coupons Redeemed</p>
                <h3 className="text-xl font-extrabold text-gray-800 mt-0.5">{analytics.redeemed_count} / {analytics.total_coupons_generated}</h3>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-100 flex gap-4">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 ${activeTab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
        >
          Overview & Charts
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 ${activeTab === 'coupons' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
        >
          Coupons List
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 ${activeTab === 'batches' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
        >
          Generation Batches ({derivedBatches.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Pie Chart */}
            <Card className="bg-white border border-gray-100 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-gray-800">Coupon Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex flex-col justify-center">
                {pieData.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center">No coupons generated yet.</div>
                ) : (
                  <div className="h-full flex items-center justify-between">
                    <div className="w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} Coupons`, 'Count']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 space-y-1.5 pl-4">
                      {pieData.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between text-xs font-semibold text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}</span>
                          </div>
                          <span>{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Performance */}
            <Card className="bg-white border border-gray-100 shadow-xs lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-gray-800">Revenue by Location (Offices)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {analytics.location_analytics?.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-20">No location data found.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.location_analytics} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="location_name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Partner Breakdown list */}
            <Card className="bg-white border border-gray-100 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-gray-800">Partner Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                        <th className="p-3">Partner</th>
                        <th className="p-3 text-center">Generated</th>
                        <th className="p-3 text-center">Redeemed</th>
                        <th className="p-3 text-center">Conv. %</th>
                        <th className="p-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-600">
                      {analytics.partner_analytics?.map((p) => (
                        <tr key={p.partner_id}>
                          <td className="p-3 font-medium text-gray-800">{p.partner_name} ({p.partner_code})</td>
                          <td className="p-3 text-center font-semibold">{p.coupons_generated}</td>
                          <td className="p-3 text-center font-semibold">{p.coupons_redeemed}</td>
                          <td className="p-3 text-center text-amber-600 font-bold">{p.conversion_rate}%</td>
                          <td className="p-3 text-right text-emerald-600 font-bold">₹{p.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Rules & Metadata */}
            <Card className="bg-white border border-gray-100 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-gray-800">Campaign Promotion Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase">Offer Linked</div>
                    <div className="font-semibold text-gray-800 mt-0.5">{campaign.offer?.name}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase">Status</div>
                    <div className="mt-0.5"><Badge2>{campaign.status}</Badge2></div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase">Allowed Uses Per Coupon</div>
                    <div className="font-semibold text-gray-800 mt-0.5">{campaign.allowed_uses_per_coupon} uses</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase">Coupons Per Customer</div>
                    <div className="font-semibold text-gray-800 mt-0.5">{campaign.coupons_per_customer} coupon</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase">Start Date</div>
                    <div className="font-semibold text-gray-800 mt-0.5">{new Date(campaign.start_date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase">End Date</div>
                    <div className="font-semibold text-gray-800 mt-0.5">{new Date(campaign.end_date).toLocaleDateString()}</div>
                  </div>
                  <div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase">Max Campaign Redemptions</div>
                    <div className="font-semibold text-gray-800 mt-0.5">{campaign.max_redemptions || 'Unlimited'}</div>
                  </div>
                </div>
                {campaign.notes && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-xs font-semibold text-gray-400 uppercase">Terms & Notes</div>
                    <p className="text-xs text-gray-500 mt-1">{campaign.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardHeader className="pb-3 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search code or mobile..."
                  value={couponSearch}
                  onChange={(e) => { setCouponSearch(e.target.value); setCouponPage(1); }}
                  className="pl-10 h-9"
                />
              </div>
              <select
                value={couponStatusFilter}
                onChange={(e) => { setCouponStatusFilter(e.target.value); setCouponPage(1); }}
                className="border border-gray-200 rounded-md p-1.5 bg-white text-xs font-medium md:w-36 h-9"
              >
                <option value="all">All Statuses</option>
                <option value="created">Created</option>
                <option value="distributed">Distributed</option>
                <option value="activated">Activated</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex gap-2 shrink-0">
              {user?.role === 'admin' && (
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('distributed')} className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                  Mark Page as Distributed
                </Button>
              )}
              <Button size="sm" onClick={handleExportCSV} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {coupons.length === 0 ? (
              <div className="py-20 text-center text-gray-400 text-sm">No coupons match your search criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="p-3">Coupon Code</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Partner</th>
                      <th className="p-3 text-center">Batch</th>
                      <th className="p-3">Customer Mobile Pre-assignment</th>
                      <th className="p-3 text-center">Remaining Uses</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono font-bold text-gray-800 text-xs">{c.code}</td>
                        <td className="p-3">{c.location_name}</td>
                        <td className="p-3">{c.partner_name}</td>
                        <td className="p-3 text-center font-medium">{c.batch_number}</td>
                        <td className="p-3">
                          {editingCouponId === c.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                size="sm"
                                value={tempMobile}
                                onChange={(e) => setTempMobile(e.target.value)}
                                className="h-8 max-w-[150px] text-xs"
                                placeholder="Phone number"
                              />
                              <Button size="xs" onClick={() => handleUpdateCouponMobile(c)} className="h-8 px-2 text-xs bg-green-600 text-white hover:bg-green-700">Save</Button>
                              <Button size="xs" variant="ghost" onClick={() => setEditingCouponId(null)} className="h-8 px-2 text-xs text-gray-400">Cancel</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700 text-xs">
                                {c.assigned_mobile ? c.assigned_mobile : <span className="text-gray-300 font-normal italic">Unassigned</span>}
                              </span>
                              {c.assigned_customer && (
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded flex items-center gap-0.5"><UserCheck className="h-3 w-3 text-emerald-500" /> {c.assigned_customer}</span>
                              )}
                              {user?.role === 'admin' && c.status !== 'completed' && c.status !== 'cancelled' && (
                                <button
                                  onClick={() => { setEditingCouponId(c.id); setTempMobile(c.assigned_mobile || ''); }}
                                  className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                  title="Assign mobile number"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-gray-700">{c.remaining_uses} / {c.allowed_uses}</td>
                        <td className="p-3">
                          <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${c.status === 'completed' ? 'bg-emerald-500' :
                              c.status === 'activated' ? 'bg-amber-500' :
                                c.status === 'distributed' ? 'bg-blue-500' :
                                  c.status === 'expired' ? 'bg-red-500' : 'bg-gray-400'
                            }`} />
                          <span className="capitalize font-semibold text-xs text-gray-700">{c.status}</span>
                        </td>
                        <td className="p-3 text-right">
                          {user?.role === 'admin' && c.status !== 'cancelled' && c.status !== 'completed' && (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => triggerCancelCoupon(c)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              Cancel Code
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalCoupons > 15 && (
              <div className="flex justify-end gap-2 p-3 border-t border-gray-50 text-xs">
                <Button size="sm" variant="outline" disabled={couponPage === 1} onClick={() => setCouponPage(p => p - 1)}>Prev</Button>
                <div className="flex items-center font-medium px-2">Page {couponPage} of {Math.ceil(totalCoupons / 15)}</div>
                <Button size="sm" variant="outline" disabled={couponPage >= Math.ceil(totalCoupons / 15)} onClick={() => setCouponPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'batches' && (
        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardHeader className="pb-3 border-b border-gray-50 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-gray-800">Coupon Generation Batches</CardTitle>
            <Badge2 variant="secondary" className="font-semibold">
              Total Batches: {derivedBatches.length}
            </Badge2>
          </CardHeader>
          <CardContent className="p-0">
            {derivedBatches.length === 0 ? (
              <div className="py-20 text-center text-gray-400 text-sm">No batches generated yet.</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-4">Batch Number</th>
                    <th className="p-4">Quantity Generated</th>
                    <th className="p-4">Date Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {derivedBatches.map((b, idx) => (
                    <tr key={b.id || idx}>
                      <td className="p-4 font-bold text-gray-800">Batch #{b.batch_number}</td>
                      <td className="p-4 font-semibold">{b.quantity || b.total_coupons || b.count} coupons</td>
                      <td className="p-4">{b.created_at ? new Date(b.created_at).toLocaleString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generate Batch Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Generate Additional Coupon Batch
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerateBatch} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="batch_number">Batch Number *</Label>
              <Input
                id="batch_number"
                type="number"
                min="1"
                value={batchData.batch_number}
                onChange={(e) => setBatchData(prev => ({ ...prev, batch_number: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-[10px] text-gray-400">Must be unique for this campaign (e.g. Batch #2).</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="quantity">Coupons per Location-Partner combination *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={batchData.quantity}
                onChange={(e) => setBatchData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-[10px] text-gray-400">
                With {campaign.service_locations?.length || 0} locations and {campaign.partners?.length || 0} partners, this will generate a total of <span className="font-bold text-primary">{(batchData.quantity * (campaign.service_locations?.length || 0) * (campaign.partners?.length || 0)) || 0}</span> coupons.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="start_sequence_number">Start Sequence Number</Label>
              <Input
                id="start_sequence_number"
                type="number"
                min="1"
                value={batchData.start_sequence_number || ''}
                onChange={(e) => setBatchData(prev => ({ ...prev, start_sequence_number: parseInt(e.target.value) || '' }))}
              />
              <p className="text-[10px] text-gray-400">
                Sequence continuation number (e.g. 101, 1001, 1101...). Auto-calculated to continue from where previous batches ended.
              </p>
            </div>

            <DialogFooter className="pt-4 border-t border-gray-50">
              <Button type="button" variant="outline" onClick={() => setIsBatchDialogOpen(false)} disabled={generatingBatch}>
                Cancel
              </Button>
              <Button type="submit" disabled={generatingBatch} className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium">
                {generatingBatch ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate Coupons
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Reusable Confirmation Dialog */}
      <ConfirmDialog
        open={confirmConfig.open}
        onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, open }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
      />
    </div>
  );
}
