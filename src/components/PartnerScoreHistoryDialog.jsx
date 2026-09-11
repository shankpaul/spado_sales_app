import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Award,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  User,
  BarChart3,
  Table as TableIcon,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import performanceService from '../services/performanceService';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

const TIMELINE_PRESETS = [
  { label: 'Past 4 Weeks', value: 4 },
  { label: 'Past 8 Weeks', value: 8 },
  { label: 'Past 12 Weeks', value: 12 },
  { label: 'Past 26 Weeks', value: 26 },
];

/**
 * PartnerScoreHistoryDialog
 * Modal component showing historical partner scores, metric breakdowns, and trend charts
 * for an individual agent / service partner.
 */
export default function PartnerScoreHistoryDialog({
  open,
  onOpenChange,
  employee,
  configData: externalConfigData = null,
}) {
  const [timelineWeeks, setTimelineWeeks] = useState(12);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chart');
  const [configData, setConfigData] = useState(externalConfigData);

  // Sync external config if passed
  useEffect(() => {
    if (externalConfigData) {
      setConfigData(externalConfigData);
    }
  }, [externalConfigData]);

  // Load config from API if not already available
  useEffect(() => {
    if (open && !configData) {
      performanceService.getConfig()
        .then((res) => {
          if (res?.data) setConfigData(res.data);
        })
        .catch((err) => console.error('Error loading performance config in dialog:', err));
    }
  }, [open, configData]);

  // Fetch employee history when opened or timeline changes
  const fetchHistory = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const res = await performanceService.getEmployeeHistory(employee.id, timelineWeeks);
      setRecords(res?.data || []);
    } catch (err) {
      console.error('Failed to load employee partner score history:', err);
      toast.error('Failed to load performance score history');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [employee?.id, timelineWeeks]);

  useEffect(() => {
    if (open && employee?.id) {
      fetchHistory();
    }
  }, [open, employee?.id, fetchHistory]);

  // Metric weights from backend config
  const metricWeights = useMemo(() => {
    const weights = configData?.metric_weights;
    return {
      acceptance_rate: weights?.acceptance_rate ?? 25,
      last_minute_rejection: weights?.last_minute_rejection ?? 20,
      agent_rescheduling: weights?.agent_rescheduling ?? 10,
      on_time_arrival: weights?.on_time_arrival ?? 20,
      rework_rate: weights?.rework_rate ?? 20,
      availability: weights?.availability ?? 5,
    };
  }, [configData]);

  const totalMaxPoints = useMemo(() => {
    return (
      (metricWeights.acceptance_rate || 0) +
      (metricWeights.last_minute_rejection || 0) +
      (metricWeights.agent_rescheduling || 0) +
      (metricWeights.on_time_arrival || 0) +
      (metricWeights.rework_rate || 0) +
      (metricWeights.availability || 0)
    ) || 100;
  }, [metricWeights]);

  // Dynamic Tier Badge Helper
  const getTierBadge = useCallback(
    (score, percentage) => {
      const tiers = configData?.bonus_tiers || [];
      const matchedTier = tiers.find((t) => score >= t.min_score && score <= t.max_score);
      const bonusPct = matchedTier !== undefined ? matchedTier.bonus_percentage : percentage;

      if (score >= 90) {
        return {
          label: `${score} / ${totalMaxPoints} (${bonusPct}% Bonus)`,
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
      }
      if (score >= 80) {
        return {
          label: `${score} / ${totalMaxPoints} (${bonusPct}% Bonus)`,
          bg: 'bg-teal-100 text-teal-800 border-teal-300',
        };
      }
      if (score >= 70) {
        return {
          label: `${score} / ${totalMaxPoints} (${bonusPct}% Bonus)`,
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      }
      if (score >= 60) {
        return {
          label: `${score} / ${totalMaxPoints} (${bonusPct}% Bonus)`,
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      }
      if (score >= 50) {
        return {
          label: `${score} / ${totalMaxPoints} (${bonusPct}% Bonus)`,
          bg: 'bg-orange-100 text-orange-800 border-orange-300',
        };
      }
      return {
        label: `${score} / ${totalMaxPoints} (0% Bonus)`,
        bg: 'bg-rose-100 text-rose-800 border-rose-300',
      };
    },
    [configData, totalMaxPoints]
  );

  // Summary statistics across the historical window
  const summaryStats = useMemo(() => {
    if (!records || records.length === 0) {
      return {
        avgScore: 0,
        highestScore: 0,
        totalBonus: 0,
        totalCycles: 0,
        finalizedCycles: 0,
      };
    }

    const totalScoreSum = records.reduce((acc, r) => acc + (r.total_score || 0), 0);
    const highestScore = Math.max(...records.map((r) => r.total_score || 0));
    const totalBonus = records.reduce((acc, r) => acc + (r.bonus_amount || 0), 0);
    const finalizedCycles = records.filter((r) => r.status === 'finalized').length;

    return {
      avgScore: Math.round((totalScoreSum / records.length) * 10) / 10,
      highestScore,
      totalBonus: Math.round(totalBonus * 100) / 100,
      totalCycles: records.length,
      finalizedCycles,
    };
  }, [records]);

  // Chart Data (Chronological: oldest to newest)
  const chartData = useMemo(() => {
    if (!records || records.length === 0) return [];
    return [...records].reverse().map((r) => {
      const sDate = r.cycle_start ? format(parseISO(r.cycle_start), 'dd MMM') : '';
      const eDate = r.cycle_end ? format(parseISO(r.cycle_end), 'dd MMM') : '';
      return {
        cycle: `${sDate} - ${eDate}`,
        'Total Score': r.total_score || 0,
        'Bonus (₹)': Math.round(r.bonus_amount || 0),
        'Acceptance Pts': r.acceptance_score || 0,
        'Arrival Pts': r.arrival_score || 0,
        'Rejection Pts': r.rejection_score || 0,
        'Rework Pts': r.rework_score || 0,
        'Reschedule Pts': r.rescheduling_score || 0,
        'Availability Pts': r.availability_score || 0,
      };
    });
  }, [records]);

  const partnerName =
    employee?.name || employee?.user?.name || 'Partner';
  const partnerCode =
    employee?.employee_number || (employee?.id ? `EMP-${employee.id}` : '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Award className="h-5 w-5 text-blue-600" />
                <span>Partner Performance History: {partnerName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                {partnerCode} {employee?.contact_number && `• ${employee.contact_number}`}{' '}
                {employee?.job_title && `• ${employee.job_title}`}
              </DialogDescription>
            </div>

            {/* Timeline Filter Selector */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {TIMELINE_PRESETS.map((p) => {
                const isSelected = timelineWeeks === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setTimelineWeeks(p.value)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      isSelected
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    {p.value}w
                  </button>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        {/* Summary KPI Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <Card className="border border-blue-100 bg-blue-50/30 shadow-none">
            <CardContent className="p-3">
              <div className="text-[11px] font-medium text-blue-700">Average Score</div>
              <div className="text-xl font-bold text-blue-900 mt-0.5">
                {summaryStats.avgScore}{' '}
                <span className="text-xs font-normal text-blue-600">/ {totalMaxPoints}</span>
              </div>
              <div className="text-[10px] text-blue-600/80 mt-0.5">
                Across {summaryStats.totalCycles} weekly cycles
              </div>
            </CardContent>
          </Card>

          <Card className="border border-emerald-100 bg-emerald-50/30 shadow-none">
            <CardContent className="p-3">
              <div className="text-[11px] font-medium text-emerald-700">Highest Score</div>
              <div className="text-xl font-bold text-emerald-900 mt-0.5">
                {summaryStats.highestScore}{' '}
                <span className="text-xs font-normal text-emerald-600">/ {totalMaxPoints}</span>
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5">
                Peak assessment in period
              </div>
            </CardContent>
          </Card>

          <Card className="border border-indigo-100 bg-indigo-50/30 shadow-none">
            <CardContent className="p-3">
              <div className="text-[11px] font-medium text-indigo-700">Total Bonus Earned</div>
              <div className="text-xl font-bold text-indigo-900 mt-0.5">
                ₹{summaryStats.totalBonus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-indigo-600/80 mt-0.5">
                Performance incentives
              </div>
            </CardContent>
          </Card>

          <Card className="border border-amber-100 bg-amber-50/30 shadow-none">
            <CardContent className="p-3">
              <div className="text-[11px] font-medium text-amber-700">Finalized Settlements</div>
              <div className="text-xl font-bold text-amber-900 mt-0.5">
                {summaryStats.finalizedCycles}{' '}
                <span className="text-xs font-normal text-amber-600">
                  / {summaryStats.totalCycles}
                </span>
              </div>
              <div className="text-[10px] text-amber-600/80 mt-0.5">
                Credited to wallet ledger
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Chart and Table */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-3">
            <TabsList className="grid grid-cols-2 w-56 h-9">
              <TabsTrigger value="chart" className="text-xs flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Score Trend
              </TabsTrigger>
              <TabsTrigger value="table" className="text-xs flex items-center gap-1.5">
                <TableIcon className="h-3.5 w-3.5" />
                Points Table ({records.length})
              </TabsTrigger>
            </TabsList>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchHistory}
              disabled={loading}
              className="text-xs h-8 text-gray-500 hover:text-gray-900"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* TAB 1: CHART */}
          <TabsContent value="chart" className="mt-0 space-y-4">
            {loading ? (
              <div className="h-72 flex flex-col items-center justify-center text-gray-400 text-xs">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mb-2" />
                Loading performance trend data...
              </div>
            ) : records.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-gray-400 text-xs border rounded-lg border-dashed">
                <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
                No weekly score history recorded in the past {timelineWeeks} weeks.
              </div>
            ) : (
              <div className="p-4 border rounded-xl bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="font-semibold text-gray-800">
                    Weekly Score & Bonus Progression (Past {timelineWeeks} Weeks)
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block" />
                      Partner Score (0–{totalMaxPoints} pts)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" />
                      Weekly Bonus (₹)
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="cycle"
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="score"
                        domain={[0, totalMaxPoints]}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        unit=" pts"
                      />
                      <YAxis
                        yAxisId="bonus"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#10b981', fontSize: 11 }}
                        unit=" ₹"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.96)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Bar
                        yAxisId="bonus"
                        dataKey="Bonus (₹)"
                        fill="#10b981"
                        opacity={0.35}
                        radius={[4, 4, 0, 0]}
                        barSize={24}
                      />
                      <Line
                        yAxisId="score"
                        type="monotone"
                        dataKey="Total Score"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#2563eb', strokeWidth: 1.5, stroke: '#ffffff' }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: TABLE */}
          <TabsContent value="table" className="mt-0">
            <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-600 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3.5">Weekly Cycle</th>
                      <th className="py-3 px-3 text-center">Score / Tier</th>
                      <th className="py-3 px-3 text-right">Eligible Earnings</th>
                      <th className="py-3 px-3 text-right">Bonus Amount</th>
                      <th className="py-3 px-2.5 text-center">
                        Acceptance ({metricWeights.acceptance_rate}p)
                      </th>
                      <th className="py-3 px-2.5 text-center">
                        Rejection ({metricWeights.last_minute_rejection}p)
                      </th>
                      <th className="py-3 px-2.5 text-center">
                        Reschedule ({metricWeights.agent_rescheduling}p)
                      </th>
                      <th className="py-3 px-2.5 text-center">
                        Arrival ({metricWeights.on_time_arrival}p)
                      </th>
                      <th className="py-3 px-2.5 text-center">
                        Rework ({metricWeights.rework_rate}p)
                      </th>
                      <th className="py-3 px-2.5 text-center">
                        Availability ({metricWeights.availability}p)
                      </th>
                      <th className="py-3 px-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="11" className="text-center py-12 text-gray-500">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                          Loading performance history...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="text-center py-12 text-gray-500">
                          <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          No weekly records found for this partner in the past {timelineWeeks} weeks.
                        </td>
                      </tr>
                    ) : (
                      records.map((rec) => {
                        const badge = getTierBadge(rec.total_score, rec.bonus_percentage);
                        const sDate = rec.cycle_start
                          ? format(parseISO(rec.cycle_start), 'dd MMM')
                          : '';
                        const eDate = rec.cycle_end
                          ? format(parseISO(rec.cycle_end), 'dd MMM yyyy')
                          : '';
                        const isFinalized = rec.status === 'finalized';

                        return (
                          <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                            {/* Cycle Date */}
                            <td className="py-3 px-3.5 font-medium text-gray-900">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                <span>
                                  {sDate} – {eDate}
                                </span>
                              </div>
                            </td>

                            {/* Total Score & Tier */}
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                              >
                                {rec.total_score} pts ({rec.bonus_percentage}%)
                              </span>
                            </td>

                            {/* Eligible Earnings */}
                            <td className="py-3 px-3 text-right font-medium text-gray-700">
                              ₹
                              {(rec.eligible_earnings || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}
                            </td>

                            {/* Bonus Amount */}
                            <td className="py-3 px-3 text-right font-bold text-emerald-600">
                              ₹
                              {(rec.bonus_amount || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}
                            </td>

                            {/* Metric 1: Acceptance */}
                            <td className="py-3 px-2.5 text-center">
                              <span className="font-semibold text-gray-900">
                                {rec.acceptance_score}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                /{metricWeights.acceptance_rate}
                              </span>
                              <div className="text-[10px] text-gray-500">
                                {(rec.acceptance_rate || 0).toFixed(0)}%
                              </div>
                            </td>

                            {/* Metric 2: Rejections */}
                            <td className="py-3 px-2.5 text-center">
                              <span className="font-semibold text-gray-900">
                                {rec.rejection_score}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                /{metricWeights.last_minute_rejection}
                              </span>
                              <div className="text-[10px] text-gray-500">
                                {rec.qualifying_rejections || 0} rej
                              </div>
                            </td>

                            {/* Metric 3: Rescheduling */}
                            <td className="py-3 px-2.5 text-center">
                              <span className="font-semibold text-gray-900">
                                {rec.rescheduling_score}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                /{metricWeights.agent_rescheduling}
                              </span>
                              <div className="text-[10px] text-gray-500">
                                {rec.partner_reschedules || 0} resch
                              </div>
                            </td>

                            {/* Metric 4: On-Time Arrival */}
                            <td className="py-3 px-2.5 text-center">
                              <span className="font-semibold text-gray-900">
                                {rec.arrival_score}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                /{metricWeights.on_time_arrival}
                              </span>
                              <div className="text-[10px] text-gray-500">
                                {(rec.on_time_arrival_rate || 0).toFixed(0)}%
                              </div>
                            </td>

                            {/* Metric 5: Rework Rate */}
                            <td className="py-3 px-2.5 text-center">
                              <span className="font-semibold text-gray-900">
                                {rec.rework_score}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                /{metricWeights.rework_rate}
                              </span>
                              <div className="text-[10px] text-gray-500">
                                {rec.verified_reworks || 0} rwk
                              </div>
                            </td>

                            {/* Metric 6: Availability */}
                            <td className="py-3 px-2.5 text-center">
                              <span className="font-semibold text-gray-900">
                                {rec.availability_score}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                /{metricWeights.availability}
                              </span>
                              <div className="text-[10px] text-gray-500">
                                {(rec.availability_rate || 0).toFixed(0)}%
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3.5 text-center">
                              {isFinalized ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                  Finalized
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="h-3 w-3 text-amber-500" />
                                  Draft
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
