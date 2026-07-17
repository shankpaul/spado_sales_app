import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge2 } from '../components/ui/badge2';
import {
  Plus,
  Search,
  Gift,
  Calendar,
  Percent,
  ChevronRight,
  Loader2,
  Tag,
  BarChart3,
  CheckCircle2,
  Clock,
  PauseCircle,
  FileText
} from 'lucide-react';
import campaignService from '../services/campaignService';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

export default function Campaigns() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    draft: 0,
    expired: 0,
  });

  useEffect(() => {
    fetchCampaigns();
  }, [searchTerm, statusFilter]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await campaignService.getAllCampaigns({
        search: searchTerm,
        status: statusFilter === 'all' ? '' : statusFilter,
        include_archived: false,
        per_page: 50,
      });
      const data = response.data || [];
      setCampaigns(data);

      // Simple stats calculation on client for display cards
      const stats = {
        total: data.length,
        active: data.filter(c => c.status === 'active').length,
        paused: data.filter(c => c.status === 'paused').length,
        draft: data.filter(c => c.status === 'draft').length,
        expired: data.filter(c => c.status === 'expired').length,
      };
      setGlobalStats(stats);
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge2 variant="success">Active</Badge2>;
      case 'paused':
        return <Badge2 variant="warning">Paused</Badge2>;
      case 'draft':
        return <Badge2 variant="outline">Draft</Badge2>;
      case 'expired':
        return <Badge2 variant="destructive">Expired</Badge2>;
      case 'archived':
        return <Badge2 variant="secondary">Archived</Badge2>;
      default:
        return <Badge2 variant="secondary">{status}</Badge2>;
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header - Desktop Only */}
      <div className="hidden md:flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8 text-primary" strokeWidth={1.5} />
            Campaigns
          </h1>
          <p className="text-muted-foreground">Manage marketing campaigns, coupon distribution limits, and redemptions</p>
        </div>
        {user?.role === 'admin' && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/campaigns/analytics')}
              className="flex items-center gap-2 border-primary/20 text-primary hover:bg-primary/5"
            >
              <BarChart3 className="h-4 w-4" /> Global Analytics
            </Button>
            <Button
              onClick={() => navigate('/campaigns/new')}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </div>
        )}
      </div>

      {/* Header - Mobile Only */}
      <div className="block md:hidden space-y-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" strokeWidth={1.5} />
            Campaigns
          </h1>
          <p className="text-muted-foreground text-sm">Manage campaigns and offers ({globalStats.total})</p>
        </div>
        {user?.role === 'admin' && (
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => navigate('/campaigns/analytics')}
              className="flex-1 flex items-center justify-center gap-2 text-xs py-1.5 h-9"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </Button>
            <Button
              onClick={() => navigate('/campaigns/new')}
              className="flex-1 bg-primary text-primary-foreground text-xs py-1.5 h-9 flex items-center justify-center gap-1.5 font-medium"
            >
              <Plus className="h-3.5 w-3.5" /> New Campaign
            </Button>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaigns</p>
              <h3 className="text-xl font-bold text-gray-800 mt-0.5">{globalStats.total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-green-50 p-2.5 rounded-lg text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</p>
              <h3 className="text-xl font-bold text-gray-800 mt-0.5">{globalStats.active}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
              <PauseCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Paused</p>
              <h3 className="text-xl font-bold text-gray-800 mt-0.5">{globalStats.paused}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Drafts</p>
              <h3 className="text-xl font-bold text-gray-800 mt-0.5">{globalStats.draft}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-100 shadow-xs col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-red-50 p-2.5 rounded-lg text-red-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expired</p>
              <h3 className="text-xl font-bold text-gray-800 mt-0.5">{globalStats.expired}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl shadow-xs border border-gray-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search campaigns by name or campaign code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-md p-2 bg-white text-sm w-full md:w-40 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed border-2 py-16 flex flex-col items-center justify-center bg-white rounded-xl">
          <Gift className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="font-semibold text-lg text-gray-700">No campaigns found</h3>
          <p className="text-gray-400 text-sm mt-1">Configure your first marketing campaign to get started</p>
        </Card>
      ) : (
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4"> Name & Code</th>
                  <th className="p-4">Linked Offer</th>
                  <th className="p-4">Campaign Type</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Coupon config</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 flex items-center gap-1">
                      <div className="font-semibold text-gray-800">{c.name}</div>
                      <div className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-block mt-1">
                        {c.code}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-medium text-gray-800">
                        <Tag className="h-3.5 w-3.5 text-gray-400" />
                        {c.offer_name || `Offer ID: ${c.offer_id}`}
                      </div>
                    </td>
                    <td className="p-4 capitalize">{c.campaign_type}</td>
                    <td className="p-4 text-xs font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-medium text-gray-700">
                      <div className="mt-1">Gen qty: <span className="font-bold text-gray-800">{c.coupons_to_generate}</span></div>
                    </td>
                    <td className="p-4">{getStatusBadge(c.status)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/campaigns/${c.id}`)}
                        className="text-primary hover:text-primary/80 font-semibold flex items-center gap-1 ml-auto"
                      >
                        Details <ChevronRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
