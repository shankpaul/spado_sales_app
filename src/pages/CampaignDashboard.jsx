import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  Loader2,
  DollarSign,
  TrendingUp,
  Percent,
  Gift,
  Tag,
  Building,
  BarChart3
} from 'lucide-react';
import campaignService from '../services/campaignService';
import { toast } from 'sonner';

export default function CampaignDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalAnalytics();
  }, []);

  const fetchGlobalAnalytics = async () => {
    setLoading(true);
    try {
      const response = await campaignService.getGlobalCampaignAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load global campaign analytics');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto font-sans">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/campaigns')} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Global Campaign Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Cross-campaign overview of generated revenue, discounts applied, conversion metrics, and partner sales
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales Revenue</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-0.5">₹{analytics.total_revenue.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-rose-50 p-2.5 rounded-lg text-rose-600">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Discount Given</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-0.5">₹{analytics.total_discount.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall Conv. Rate</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-0.5">{analytics.conversion_rate}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Coupons Gen</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-0.5">{analytics.total_coupons_generated}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Location */}
        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" /> Revenue Contribution by Location
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {analytics.location_analytics?.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-24">No location data found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.location_analytics} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="location_name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Partner */}
        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" /> Revenue Generated by Marketing Partner
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {analytics.partner_analytics?.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-24">No partner data found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.partner_analytics} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="partner_name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Breakdown Table */}
      <Card className="bg-white border border-gray-100 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-gray-800">Campaign Cost & Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {analytics.campaign_breakdown?.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">No campaigns registered.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-4">Campaign Name (Code)</th>
                    <th className="p-4">Linked Offer</th>
                    <th className="p-4 text-center">Coupons Gen</th>
                    <th className="p-4 text-center">Coupons Redeemed</th>
                    <th className="p-4 text-right">Revenue Generated</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {analytics.campaign_breakdown.map((c) => (
                    <tr key={c.campaign_id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">{c.campaign_name}</div>
                        <div className="text-[10px] font-mono text-primary bg-primary/10 px-1 rounded inline-block mt-0.5">
                          {c.campaign_code}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-700">{c.offer_name}</td>
                      <td className="p-4 text-center font-bold text-gray-700">{c.coupons}</td>
                      <td className="p-4 text-center font-bold text-primary">{c.redeemed}</td>
                      <td className="p-4 text-right text-emerald-600 font-extrabold">₹{c.revenue.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${
                          c.status === 'active' ? 'bg-green-500' :
                          c.status === 'paused' ? 'bg-amber-500' : 'bg-gray-400'
                        }`} />
                        <span className="capitalize text-xs font-semibold text-gray-700">{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
