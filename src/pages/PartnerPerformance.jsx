import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Award,
  TrendingUp,
  Calendar,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  ChevronRight,
  Filter,
  Sliders,
  FileCheck,
  ShieldAlert,
  ArrowUpRight,
  User,
  Check,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronDown
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
  Legend
} from 'recharts';
import { format, parseISO, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';

import performanceService from '../services/performanceService';
import PartnerScoreHistoryDialog from '../components/PartnerScoreHistoryDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge2 } from '@/components/ui/badge2';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

const WEEKS_PRESETS = [
  { label: 'Past 4 Weeks', value: 4 },
  { label: 'Past 8 Weeks', value: 8 },
  { label: 'Past 12 Weeks', value: 12 },
  { label: 'Past 26 Weeks', value: 26 },
];

export default function PartnerPerformance() {
  const [weeksFilter, setWeeksFilter] = useState(8);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, draft, finalized

  // Modals state
  const [calculating, setCalculating] = useState(false);
  const [calculateModalOpen, setCalculateModalOpen] = useState(false);
  const [customCycleDates, setCustomCycleDates] = useState({ start: '', end: '' });

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState(null);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingRecord, setAdjustingRecord] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    metric_name: 'acceptance',
    adjusted_value: '',
    adjusted_score: '',
    exception_type: 'emergency',
    reason: '',
    evidence_url: '',
  });
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmingRecord, setConfirmingRecord] = useState(null);
  const [confirmingLoading, setConfirmingLoading] = useState(false);

  const [batchConfirmLoading, setBatchConfirmLoading] = useState(false);

  // Partner Score History Dialog State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);

  // Dynamic Scoring Rules / Config State from Backend API
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configData, setConfigData] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);

  // Fetch scoring metrics configuration dynamically from backend API
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await performanceService.getConfig();
      if (res && res.data) {
        setConfigData(res.data);
      }
    } catch (err) {
      console.error('Failed to load performance metrics config from API:', err);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // Fetch config on initial mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Dynamic Metric Weights from API (with standard fallbacks)
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

  // Total Max Score (Sum of weights, standard 100)
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

  // Dynamic Metrics List for overrides and breakdowns
  const metricsList = useMemo(() => [
    { key: 'acceptance', name: 'Acceptance Rate', max: metricWeights.acceptance_rate, unit: '%' },
    { key: 'last_minute_rejection', name: 'Last-Minute Rejection', max: metricWeights.last_minute_rejection, unit: 'rej' },
    { key: 'rescheduling', name: 'Partner Rescheduling', max: metricWeights.agent_rescheduling, unit: 'resch' },
    { key: 'on_time_arrival', name: 'On-Time Arrival', max: metricWeights.on_time_arrival, unit: '%' },
    { key: 'rework', name: 'Rework Rate', max: metricWeights.rework_rate, unit: 'rwk' },
    { key: 'availability', name: 'Availability', max: metricWeights.availability, unit: '%' },
  ], [metricWeights]);

  const handleOpenConfigModal = async () => {
    setConfigModalOpen(true);
    if (!configData) {
      await fetchConfig();
    }
  };

  // 1. Fetch Cycles list
  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await performanceService.getCycles(weeksFilter);
      const cycleList = res.data || [];
      setCycles(cycleList);
      if (cycleList.length > 0) {
        // Default to the first cycle if none selected or if previous selected not in list
        setSelectedCycle((prev) => {
          if (!prev) return cycleList[0];
          const exists = cycleList.find(
            (c) => c.cycle_start === prev.cycle_start && c.cycle_end === prev.cycle_end
          );
          return exists || cycleList[0];
        });
      } else {
        setSelectedCycle(null);
        setPerformances([]);
      }
    } catch (err) {
      console.error('Failed to load performance cycles:', err);
      toast.error('Failed to load performance cycles');
    } finally {
      setLoading(false);
    }
  }, [weeksFilter]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  // 2. Fetch Performances for Selected Cycle
  const fetchCyclePerformances = useCallback(async () => {
    if (!selectedCycle) return;
    setLoading(true);
    try {
      const res = await performanceService.getCyclePerformances(
        selectedCycle.cycle_start,
        selectedCycle.cycle_end
      );
      setPerformances(res.data || []);
    } catch (err) {
      console.error('Failed to load cycle scores:', err);
      toast.error('Failed to load cycle performance scores');
    } finally {
      setLoading(false);
    }
  }, [selectedCycle]);

  useEffect(() => {
    fetchCyclePerformances();
  }, [fetchCyclePerformances]);

  // 3. Filtered Performances
  const filteredPerformances = useMemo(() => {
    return performances.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' ? true : item.status === statusFilter;
      const empName = item.employee?.name || item.employee?.user?.name || '';
      const empCode = item.employee?.employee_number || '';
      const phone = item.employee?.contact_number || '';
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        empName.toLowerCase().includes(q) ||
        empCode.toLowerCase().includes(q) ||
        phone.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [performances, statusFilter, searchQuery]);

  // 4. Trend Chart Data (from cycles summary)
  const chartData = useMemo(() => {
    if (!cycles || cycles.length === 0) return [];
    // Sort chronological for chart
    return [...cycles]
      .reverse()
      .map((c) => {
        const startStr = format(parseISO(c.cycle_start), 'dd MMM');
        const endStr = format(parseISO(c.cycle_end), 'dd MMM');
        return {
          cycleLabel: `${startStr} - ${endStr}`,
          'Avg Score': Math.round((c.average_score || 0) * 10) / 10,
          'Total Bonus (₹)': Math.round(c.total_bonus_amount || 0),
          Partners: c.total_partners_evaluated || 0,
        };
      });
  }, [cycles]);

  // 5. Summary metrics for current cycle
  const currentSummary = useMemo(() => {
    const totalCount = performances.length;
    const avgScore =
      totalCount > 0
        ? performances.reduce((acc, p) => acc + p.total_score, 0) / totalCount
        : 0;
    const totalBonus = performances.reduce((acc, p) => acc + (p.bonus_amount || 0), 0);
    const finalizedCount = performances.filter((p) => p.status === 'finalized').length;
    return {
      totalCount,
      avgScore: Math.round(avgScore * 10) / 10,
      totalBonus: Math.round(totalBonus * 100) / 100,
      finalizedCount,
    };
  }, [performances]);

  // Tier Color Helper (Dynamic based on total max points & config bonus tiers)
  const getTierBadge = useCallback((score, percentage) => {
    // Check if backend config specifies bonus tiers
    const tiers = configData?.bonus_tiers || [];
    const matchedTier = tiers.find((t) => score >= t.min_score && score <= t.max_score);
    const bonusPct = matchedTier !== undefined ? matchedTier.bonus_percentage : percentage;

    if (score >= 90) {
      return {
        label: `${score} / ${totalMaxPoints} (${bonusPct}% Bonus)`,
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        scoreColor: 'text-emerald-700',
      };
    }
    if (score >= 80) {
      return {
        label: `${score} / ${totalMaxPoints} (${bonusPct}% Bonus)`,
        bg: 'bg-teal-100 text-teal-800 border-teal-300',
        scoreColor: 'text-teal-700',
      };
    }
    if (score >= 70) {
      return {
        label: `${score} / ${totalMaxPoints} (${bonusPct}% Bonus)`,
        bg: 'bg-blue-100 text-blue-800 border-blue-300',
        scoreColor: 'text-blue-700',
      };
    }
    if (score >= 60) {
      return {
        label: `${score} / ${totalMaxPoints} (${bonusPct}% Bonus)`,
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
        scoreColor: 'text-amber-700',
      };
    }
    if (score >= 50) {
      return {
        label: `${score} / ${totalMaxPoints} (${bonusPct}% Bonus)`,
        bg: 'bg-orange-100 text-orange-800 border-orange-300',
        scoreColor: 'text-orange-700',
      };
    }
    return {
      label: `${score} / ${totalMaxPoints} (0% Bonus)`,
      bg: 'bg-rose-100 text-rose-800 border-rose-300',
      scoreColor: 'text-rose-700',
    };
  }, [configData, totalMaxPoints]);

  // Run Manual Calculation
  const handleRunCalculation = async () => {
    setCalculating(true);
    try {
      const res = await performanceService.calculateCycle(
        customCycleDates.start || undefined,
        customCycleDates.end || undefined
      );
      toast.success(res.message || 'Performance scores calculated successfully');
      setCalculateModalOpen(false);
      await fetchCycles();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to calculate performance scores');
    } finally {
      setCalculating(false);
    }
  };

  // Open Adjust Modal
  const handleOpenAdjust = (rec) => {
    setAdjustingRecord(rec);
    setAdjustForm({
      metric_name: 'acceptance',
      adjusted_value: rec.acceptance_rate || '',
      adjusted_score: rec.acceptance_score || '',
      exception_type: 'emergency',
      reason: '',
      evidence_url: '',
    });
    setAdjustModalOpen(true);
  };

  // Submit Adjustment
  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustForm.reason.trim()) {
      toast.error('Please provide a reason for the manual adjustment');
      return;
    }
    setSubmittingAdjust(true);
    try {
      const payload = {
        metric_name: adjustForm.metric_name,
        adjusted_value: parseFloat(adjustForm.adjusted_value) || 0,
        adjusted_score: parseInt(adjustForm.adjusted_score, 10) || 0,
        exception_type: adjustForm.exception_type,
        reason: adjustForm.reason,
        evidence_url: adjustForm.evidence_url || '',
      };
      await performanceService.submitAdjustment(adjustingRecord.id, payload);
      toast.success('Performance score override saved successfully');
      setAdjustModalOpen(false);
      fetchCyclePerformances();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to adjust score');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // Confirm Single Performance & Credit Wallet
  const handleConfirmSingle = async () => {
    if (!confirmingRecord) return;
    setConfirmingLoading(true);
    try {
      await performanceService.confirmPerformance(confirmingRecord.id);
      toast.success(
        `Score confirmed! Bonus of ₹${confirmingRecord.bonus_amount.toFixed(2)} credited to wallet.`
      );
      setConfirmModalOpen(false);
      fetchCyclePerformances();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to confirm score');
    } finally {
      setConfirmingLoading(false);
    }
  };

  // Batch Confirm All
  const handleBatchConfirm = async () => {
    if (!selectedCycle) return;
    const unconfirmed = performances.filter((p) => p.status !== 'finalized');
    if (unconfirmed.length === 0) {
      toast.info('All partner performance scores for this cycle are already confirmed');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to confirm all ${unconfirmed.length} scores and credit their bonuses directly to employee wallets?`
      )
    ) {
      return;
    }

    setBatchConfirmLoading(true);
    try {
      const res = await performanceService.confirmCycleBatch(
        selectedCycle.cycle_start,
        selectedCycle.cycle_end
      );
      toast.success(`Successfully confirmed ${res.count} partner scores and updated wallets`);
      fetchCyclePerformances();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to batch confirm');
    } finally {
      setBatchConfirmLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6  space-y-5">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Partner Performance Bonus
            </h1>
            <Badge2 variant='outline' className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
              Commission Scheme
            </Badge2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Evaluate weekly 100-point scores across all operational metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchCycles();
              fetchCyclePerformances();
              fetchConfig();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenConfigModal}
            className="text-gray-700"
          >
            <Info className="h-4 w-4 mr-1.5 text-blue-600" />
            Scoring Config {configData?.version ? `(v${configData.version})` : ''}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCustomCycleDates({ start: '', end: '' });
              setCalculateModalOpen(true);
            }}
          >
            <Sliders className="h-4 w-4 mr-2 text-blue-600" />
            Run Calculation
          </Button>

          <Button
            size="sm"
            onClick={handleBatchConfirm}
            disabled={
              batchConfirmLoading ||
              !selectedCycle ||
              performances.filter((p) => p.status !== 'finalized').length === 0
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirm All ({performances.filter((p) => p.status !== 'finalized').length})
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm border-gray-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
            {/* X-Weeks Presets */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                Historical Window
              </Label>
              <div className="flex rounded-md shadow-sm">
                {WEEKS_PRESETS.map((p) => {
                  const isSelected = weeksFilter === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setWeeksFilter(p.value)}
                      className={`flex-1 cursor-pointer py-1.5 text-xs font-medium border first:rounded-l-md last:rounded-r-md transition-colors ${isSelected
                        ? 'bg-primary text-primary-foreground border-primary z-10 font-semibold shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      {p.value}w
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cycle Selector */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                Select Weekly Cycle (Sun – Sat)
              </Label>
              <div className="relative">
                <select
                  value={
                    selectedCycle
                      ? `${selectedCycle.cycle_start}|${selectedCycle.cycle_end}`
                      : ''
                  }
                  onChange={(e) => {
                    const [s, end] = e.target.value.split('|');
                    const c = cycles.find(
                      (item) => item.cycle_start === s && item.cycle_end === end
                    );
                    setSelectedCycle(c || null);
                  }}
                  className="w-full text-xs h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {cycles.length === 0 ? (
                    <option value="">No calculated cycles found</option>
                  ) : (
                    cycles.map((c) => {
                      const sStr = format(parseISO(c.cycle_start), 'MMM dd');
                      const eStr = format(parseISO(c.cycle_end), 'MMM dd, yyyy');
                      return (
                        <option
                          key={`${c.cycle_start}|${c.cycle_end}`}
                          value={`${c.cycle_start}|${c.cycle_end}`}
                        >
                          {sStr} – {eStr} ({c.total_partners_evaluated || 0} evaluated)
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                Confirmation Status
              </Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Pending Confirmation (Draft)</option>
                <option value="finalized">Confirmed & Credited (Finalized)</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                Search Partner
              </Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Name, phone, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Evaluated Partners</CardTitle>
            <User className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{currentSummary.totalCount}</div>
            <p className="text-xs text-gray-500 mt-1">Active commission-based partners</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm bg-gradient-to-br from-white to-blue-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Average Performance Score</CardTitle>
            <Award className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {currentSummary.avgScore} <span className="text-sm font-normal text-gray-500">/ {totalMaxPoints}</span>
            </div>
            <p className="text-xs text-blue-600 font-medium mt-1">
              Across 6 operational metrics {configData?.version ? `(Config v${configData.version})` : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Total Weekly Bonus Pool</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              ₹{currentSummary.totalBonus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">Earned performance incentives</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm bg-gradient-to-br from-white to-amber-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Confirmation Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {currentSummary.finalizedCount} <span className="text-sm font-normal text-gray-500">/ {currentSummary.totalCount} Confirmed</span>
            </div>
            <p className="text-xs text-amber-700 font-medium mt-1">
              {currentSummary.totalCount - currentSummary.finalizedCount} pending wallet credit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs: Trend Chart & Partner Scores */}
      <Tabs defaultValue="scores" className="w-full space-y-4">
        <TabsList className="grid grid-cols-1 sm:grid-cols-2 w-full sm:w-[650px] h-11 p-1 bg-gray-100 rounded-xl">
          <TabsTrigger
            value="trend"
            className="text-xs font-semibold flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all"
          >
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span>Weekly Performance Score & Bonus Trend ({weeksFilter} Weeks)</span>
          </TabsTrigger>
          <TabsTrigger
            value="scores"
            className="text-xs font-semibold flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all"
          >
            <Award className="h-4 w-4 text-blue-600" />
            <span>Partner Scores & Overrides ({filteredPerformances.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Trend Chart */}
        <TabsContent value="trend" className="mt-0">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Weekly Performance Score & Bonus Trend ({weeksFilter} Weeks)
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Track historical weekly score progression alongside total bonus distributions.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-gray-400 text-xs">
                  <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
                  No performance cycle data found for the selected {weeksFilter}-week window.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="cycleLabel"
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="left"
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        unit=" pts"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#10b981', fontSize: 11 }}
                        unit=" ₹"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar
                        yAxisId="right"
                        dataKey="Total Bonus (₹)"
                        fill="#10b981"
                        opacity={0.3}
                        radius={[4, 4, 0, 0]}
                        barSize={24}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="Avg Score"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Partner Scores Table */}
        <TabsContent value="scores" className="mt-0">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600" />
                    Partner Scores & Overrides ({filteredPerformances.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    {selectedCycle
                      ? `Showing scores for cycle ${format(parseISO(selectedCycle.cycle_start), 'dd MMM yyyy')} to ${format(parseISO(selectedCycle.cycle_end), 'dd MMM yyyy')}`
                      : 'Select a cycle above'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Partner</th>
                      <th className="py-3 px-3 text-center">Score / Tier</th>
                      <th className="py-3 px-3 text-right">Eligible Earnings</th>
                      <th className="py-3 px-3 text-right">Bonus Amount</th>
                      <th className="py-3 px-3 text-center">Acceptance ({metricWeights.acceptance_rate}p)</th>
                      <th className="py-3 px-3 text-center">Rejection ({metricWeights.last_minute_rejection}p)</th>
                      <th className="py-3 px-3 text-center">Reschedule ({metricWeights.agent_rescheduling}p)</th>
                      <th className="py-3 px-3 text-center">Arrival ({metricWeights.on_time_arrival}p)</th>
                      <th className="py-3 px-3 text-center">Rework ({metricWeights.rework_rate}p)</th>
                      <th className="py-3 px-3 text-center">Availability ({metricWeights.availability}p)</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="12" className="text-center py-12 text-gray-500">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary-500 mb-2" />
                          Loading performance records...
                        </td>
                      </tr>
                    ) : filteredPerformances.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="text-center py-12 text-gray-500">
                          <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          No performance scores found for this cycle or filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPerformances.map((rec) => {
                        const badge = getTierBadge(rec.total_score, rec.bonus_percentage);
                        const partnerName =
                          rec.employee?.name || rec.employee?.user?.name || 'Partner';
                        const partnerCode = rec.employee?.employee_number || `EMP-${rec.employee_id}`;
                        const isFinalized = rec.status === 'finalized';

                        return (
                          <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                            {/* Partner */}
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setHistoryEmployee(
                                    rec.employee || {
                                      id: rec.employee_id,
                                      name: partnerName,
                                      employee_number: partnerCode,
                                    }
                                  );
                                  setHistoryModalOpen(true);
                                }}
                                className="text-left group cursor-pointer focus:outline-none"
                                title="Click to view weekly partner performance history"
                              >
                                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                  <span>{partnerName}</span>
                                  <TrendingUp className="h-3.5 w-3.5 text-blue-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-[11px] text-gray-500 group-hover:text-blue-500/80 transition-colors">
                                  {partnerCode} {rec.employee?.contact_number && `• ${rec.employee.contact_number}`}
                                </div>
                              </button>
                            </td>

                            {/* Total Score & Tier */}
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}
                              >
                                {rec.total_score} pts ({rec.bonus_percentage}%)
                              </span>
                            </td>

                            {/* Eligible Earnings */}
                            <td className="py-3 px-3 text-right font-medium text-gray-700">
                              ₹{rec.eligible_earnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Bonus Amount */}
                            <td className="py-3 px-3 text-right font-bold text-emerald-600">
                              ₹{rec.bonus_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* 6 Metrics Breakdown */}
                            <td className="py-3 px-3 text-center">
                              <span className="font-semibold text-gray-900">{rec.acceptance_score}</span>
                              <span className="text-[10px] text-gray-400">/{metricWeights.acceptance_rate}</span>
                              <div className="text-[10px] text-gray-500">{rec.acceptance_rate.toFixed(0)}%</div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-semibold text-gray-900">{rec.rejection_score}</span>
                              <span className="text-[10px] text-gray-400">/{metricWeights.last_minute_rejection}</span>
                              <div className="text-[10px] text-gray-500">{rec.qualifying_rejections} rej</div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-semibold text-gray-900">{rec.rescheduling_score}</span>
                              <span className="text-[10px] text-gray-400">/{metricWeights.agent_rescheduling}</span>
                              <div className="text-[10px] text-gray-500">{rec.partner_reschedules} resch</div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-semibold text-gray-900">{rec.arrival_score}</span>
                              <span className="text-[10px] text-gray-400">/{metricWeights.on_time_arrival}</span>
                              <div className="text-[10px] text-gray-500">{rec.on_time_arrival_rate.toFixed(0)}%</div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-semibold text-gray-900">{rec.rework_score}</span>
                              <span className="text-[10px] text-gray-400">/{metricWeights.rework_rate}</span>
                              <div className="text-[10px] text-gray-500">{rec.verified_reworks} rwk</div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-semibold text-gray-900">{rec.availability_score}</span>
                              <span className="text-[10px] text-gray-400">/{metricWeights.availability}</span>
                              <div className="text-[10px] text-gray-500">{rec.availability_rate.toFixed(0)}%</div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 text-center">
                              {isFinalized ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                  Finalized
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="h-3 w-3 text-amber-500" />
                                  Draft
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2 text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                  setHistoryEmployee(
                                    rec.employee || {
                                      id: rec.employee_id,
                                      name: partnerName,
                                      employee_number: partnerCode,
                                    }
                                  );
                                  setHistoryModalOpen(true);
                                }}
                                title="View Score History & Trend"
                              >
                                <TrendingUp className="h-3 w-3 mr-1" />
                                History
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => {
                                  setSelectedPerformance(rec);
                                  setDetailModalOpen(true);
                                }}
                              >
                                Details
                              </Button>

                              {!isFinalized && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs px-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                                    onClick={() => handleOpenAdjust(rec)}
                                  >
                                    Override
                                  </Button>

                                  <Button
                                    size="sm"
                                    className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => {
                                      setConfirmingRecord(rec);
                                      setConfirmModalOpen(true);
                                    }}
                                  >
                                    Confirm
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: Run Calculation */}
      <Dialog open={calculateModalOpen} onOpenChange={setCalculateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Calculate Weekly Performance Scores</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Run performance calculations across all active commission-based partners for a Sunday to Saturday cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-xs flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Leave dates empty to automatically calculate for the <strong>previous completed cycle</strong> (Sunday 00:00 to Saturday 23:59 IST).
              </span>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Cycle Start (Sunday 00:00)</Label>
              <Input
                type="date"
                value={customCycleDates.start}
                onChange={(e) =>
                  setCustomCycleDates((prev) => ({ ...prev, start: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Cycle End (Saturday 23:59)</Label>
              <Input
                type="date"
                value={customCycleDates.end}
                onChange={(e) =>
                  setCustomCycleDates((prev) => ({ ...prev, end: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalculateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRunCalculation}
              disabled={calculating}
            >
              {calculating && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {calculating ? 'Calculating...' : 'Run Calculation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Manual Override / Adjustment */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manual Score Override & Adjustment</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Override an operational metric score with documented evidence and justification. The total score and bonus tier will automatically recalculate.
            </DialogDescription>
          </DialogHeader>

          {adjustingRecord && (
            <form onSubmit={handleSubmitAdjustment} className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-gray-50 rounded-md border text-xs">
                <div className="font-semibold text-gray-800">
                  {adjustingRecord.employee?.name || 'Partner'} ({adjustingRecord.employee?.employee_number})
                </div>
                <div className="text-gray-500 mt-0.5">
                  Current Score: <strong>{adjustingRecord.total_score} / {totalMaxPoints}</strong> • Current Tier: <strong>{adjustingRecord.bonus_percentage}%</strong>
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Metric to Override</Label>
                <select
                  value={adjustForm.metric_name}
                  onChange={(e) => {
                    const m = e.target.value;
                    let val = '';
                    let sc = '';
                    if (m === 'acceptance') {
                      val = adjustingRecord.acceptance_rate;
                      sc = adjustingRecord.acceptance_score;
                    } else if (m === 'last_minute_rejection' || m === 'rejection') {
                      val = adjustingRecord.qualifying_rejections;
                      sc = adjustingRecord.rejection_score;
                    } else if (m === 'rescheduling') {
                      val = adjustingRecord.partner_reschedules;
                      sc = adjustingRecord.rescheduling_score;
                    } else if (m === 'on_time_arrival' || m === 'arrival') {
                      val = adjustingRecord.on_time_arrival_rate;
                      sc = adjustingRecord.arrival_score;
                    } else if (m === 'rework') {
                      val = adjustingRecord.verified_reworks;
                      sc = adjustingRecord.rework_score;
                    } else if (m === 'availability') {
                      val = adjustingRecord.availability_rate;
                      sc = adjustingRecord.availability_score;
                    }
                    setAdjustForm((prev) => ({
                      ...prev,
                      metric_name: m,
                      adjusted_value: val,
                      adjusted_score: sc,
                    }));
                  }}
                  className="w-full text-xs h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none"
                >
                  {metricsList.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.name} (Max {m.max} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Adjusted Value (Rate % / Count)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    required
                    value={adjustForm.adjusted_value}
                    onChange={(e) =>
                      setAdjustForm((prev) => ({ ...prev, adjusted_value: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">
                    Adjusted Score (Max {metricsList.find((m) => m.key === adjustForm.metric_name)?.max || 25} pts)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={metricsList.find((m) => m.key === adjustForm.metric_name)?.max || 100}
                    required
                    value={adjustForm.adjusted_score}
                    onChange={(e) =>
                      setAdjustForm((prev) => ({ ...prev, adjusted_score: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Exception Category</Label>
                <select
                  value={adjustForm.exception_type}
                  onChange={(e) =>
                    setAdjustForm((prev) => ({ ...prev, exception_type: e.target.value }))
                  }
                  className="w-full text-xs h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="emergency">Emergency / Medical</option>
                  <option value="breakdown">Vehicle Breakdown</option>
                  <option value="customer_request">Customer Request / Dispute</option>
                  <option value="force_majeure">Force Majeure / Weather</option>
                  <option value="other">Other Validated Reason</option>
                </select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Reason & Justification (Required)</Label>
                <Textarea
                  required
                  rows={2}
                  placeholder="Explain why this score is being adjusted..."
                  value={adjustForm.reason}
                  onChange={(e) =>
                    setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Evidence / Ticket URL (Optional)</Label>
                <Input
                  type="url"
                  placeholder="https://spado.in/tickets/..."
                  value={adjustForm.evidence_url}
                  onChange={(e) =>
                    setAdjustForm((prev) => ({ ...prev, evidence_url: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingAdjust}
                >
                  {submittingAdjust ? 'Saving Override...' : 'Apply Override'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Detail Breakdown Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              Scorecard Breakdown: {selectedPerformance?.employee?.name || 'Partner'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Weekly Performance Assessment Cycle: {selectedPerformance && format(parseISO(selectedPerformance.cycle_start), 'dd MMM yyyy')} to {selectedPerformance && format(parseISO(selectedPerformance.cycle_end), 'dd MMM yyyy')}
            </DialogDescription>
          </DialogHeader>

          {selectedPerformance && (
            <div className="space-y-4 py-2 text-xs">
              {/* Top Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-800 font-medium">Final Partner Performance Score</div>
                  <div className="text-3xl font-extrabold text-blue-950 mt-1">
                    {selectedPerformance.total_score} <span className="text-sm font-normal text-blue-700">/ {totalMaxPoints}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-800 font-medium">Bonus Tier Percentage</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {selectedPerformance.bonus_percentage}% Bonus
                  </div>
                  <div className="text-xs font-medium text-emerald-800">
                    Payout: ₹{selectedPerformance.bonus_amount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* 6 Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 border rounded-md bg-white space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>1. Acceptance Rate ({metricWeights.acceptance_rate} pts)</span>
                    <span className="text-blue-600">{selectedPerformance.acceptance_score} / {metricWeights.acceptance_rate}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {selectedPerformance.accepted_bookings} of {selectedPerformance.assigned_bookings} accepted ({selectedPerformance.acceptance_rate.toFixed(1)}%)
                  </p>
                </div>

                <div className="p-3 border rounded-md bg-white space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>2. Last-Minute Rejection ({metricWeights.last_minute_rejection} pts)</span>
                    <span className="text-blue-600">{selectedPerformance.rejection_score} / {metricWeights.last_minute_rejection}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {selectedPerformance.qualifying_rejections} qualifying cancellations
                  </p>
                </div>

                <div className="p-3 border rounded-md bg-white space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>3. Partner Rescheduling ({metricWeights.agent_rescheduling} pts)</span>
                    <span className="text-blue-600">{selectedPerformance.rescheduling_score} / {metricWeights.agent_rescheduling}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {selectedPerformance.partner_reschedules} rescheduling events
                  </p>
                </div>

                <div className="p-3 border rounded-md bg-white space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>4. On-Time Arrival ({metricWeights.on_time_arrival} pts)</span>
                    <span className="text-blue-600">{selectedPerformance.arrival_score} / {metricWeights.on_time_arrival}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {selectedPerformance.on_time_services} of {selectedPerformance.scheduled_services} on time ({selectedPerformance.on_time_arrival_rate.toFixed(1)}%)
                  </p>
                </div>

                <div className="p-3 border rounded-md bg-white space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>5. Rework Rate ({metricWeights.rework_rate} pts)</span>
                    <span className="text-blue-600">{selectedPerformance.rework_score} / {metricWeights.rework_rate}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {selectedPerformance.verified_reworks} verified reworks / rework complaints
                  </p>
                </div>

                <div className="p-3 border rounded-md bg-white space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>6. Working Hours Availability ({metricWeights.availability} pts)</span>
                    <span className="text-blue-600">{selectedPerformance.availability_score} / {metricWeights.availability}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {selectedPerformance.online_availability_minutes} mins online of {selectedPerformance.required_availability_minutes} required ({selectedPerformance.availability_rate.toFixed(1)}%)
                  </p>
                </div>
              </div>

              {/* Earnings & Wallet Info */}
              <div className="p-3 bg-gray-50 rounded-md border space-y-1 text-xs">
                <div className="font-semibold text-gray-800">Financial Summary</div>
                <div className="grid grid-cols-2 gap-2 text-gray-600 mt-2">
                  <div>Eligible Service Earnings: <strong>₹{selectedPerformance.eligible_earnings.toFixed(2)}</strong></div>
                  <div>Bonus Multiplier: <strong>{selectedPerformance.bonus_percentage}%</strong></div>
                  <div>Calculated Performance Bonus: <strong className="text-emerald-700">₹{selectedPerformance.bonus_amount.toFixed(2)}</strong></div>
                  <div>Status: <strong className="capitalize">{selectedPerformance.status}</strong></div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Confirm Score & Credit Wallet */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Confirm Performance Score & Credit Wallet
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              This action finalizes the score and immediately creates an immutable bonus transaction in the partner's wallet.
            </DialogDescription>
          </DialogHeader>

          {confirmingRecord && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-900 space-y-1">
                <div>Partner: <strong>{confirmingRecord.employee?.name}</strong></div>
                <div>Performance Score: <strong>{confirmingRecord.total_score} / {totalMaxPoints}</strong></div>
                <div>Bonus Percentage: <strong>{confirmingRecord.bonus_percentage}%</strong></div>
                <div className="text-sm font-bold text-emerald-700 pt-1">
                  Bonus Amount to Credit: ₹{confirmingRecord.bonus_amount.toFixed(2)}
                </div>
              </div>

              <p className="text-gray-500 text-xs">
                Once confirmed, this score will be locked to <strong>finalized</strong>. The employee's wallet balance will update immediately, and the transaction will be tied to this performance cycle.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={confirmingLoading}
              onClick={handleConfirmSingle}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {confirmingLoading && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {confirmingLoading ? 'Crediting Wallet...' : 'Confirm & Credit Bonus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Scoring Rules & Active Configuration Info */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Award className="h-5 w-5 text-blue-600" />
                Partner Score Calculation Rules & Configuration
              </DialogTitle>
              {configData && (
                <Badge2 variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Version {configData.version} Active
                </Badge2>
              )}
            </div>
            <DialogDescription className="text-xs text-gray-500">
              Live scoring weights, thresholds, operational rules, and weekly performance bonus tiers applied to all partners.
            </DialogDescription>
          </DialogHeader>

          {configLoading ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
              Loading configuration details...
            </div>
          ) : !configData ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              <AlertCircle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
              Failed to load scoring configuration.
            </div>
          ) : (
            <div className="space-y-4 py-1 text-xs">
              <Tabs defaultValue="weights" className="w-full">
                <TabsList className="grid grid-cols-4 w-full h-9 mb-3">
                  <TabsTrigger value="weights" className="text-xs">Weights (100 Pts)</TabsTrigger>
                  <TabsTrigger value="bonus" className="text-xs">Bonus Tiers</TabsTrigger>
                  <TabsTrigger value="thresholds" className="text-xs">Scoring Scales</TabsTrigger>
                  <TabsTrigger value="rules" className="text-xs">Operational Rules</TabsTrigger>
                </TabsList>

                {/* Tab 1: Weights & Overview */}
                <TabsContent value="weights" className="space-y-3 mt-0">
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-blue-900 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-blue-900">100-Point Performance Scoring Formula</div>
                      <div className="text-[11px] text-blue-700 mt-0.5">
                        Total Score = Acceptance + Rejection + Rescheduling + Arrival + Rework + Availability
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-blue-950">100</span>
                      <span className="text-xs text-blue-700"> Max Pts</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 border rounded-md bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-900">1. Acceptance Rate</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                          {configData.metric_weights?.acceptance_rate || 25} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Evaluates the percentage of assigned bookings accepted by the partner. Partners with zero assigned bookings receive {configData.operational_rules?.zero_booking_acceptance_score || 0} pts.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-900">2. Last-Minute Rejections</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                          {configData.metric_weights?.last_minute_rejection || 20} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Measures cancellations initiated by partner within {configData.operational_rules?.rejection_window_hours || 24} hours of booking start. Zero rejections achieves full points.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-900">3. Partner Rescheduling</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                          {configData.metric_weights?.agent_rescheduling || 10} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Tracks bookings rescheduled by partner after acceptance. Emergency and customer-initiated reschedules are exempt.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-900">4. On-Time Arrival</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                          {configData.metric_weights?.on_time_arrival || 20} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Measures punctuality arriving within {configData.operational_rules?.arrival_grace_minutes || 30} minutes grace period of scheduled start.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-900">5. Rework Rate</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                          {configData.metric_weights?.rework_rate || 20} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Reflects service quality and customer complaints verified by operational audits. Full points requires 0 rework incidents.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-900">6. Availability</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                          {configData.metric_weights?.availability || 5} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Percentage of mandatory working hours ({configData.operational_rules?.availability_start_time || '07:00'} - {configData.operational_rules?.availability_end_time || '18:00'}) partner is online and available.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Bonus Tiers */}
                <TabsContent value="bonus" className="space-y-3 mt-0">
                  <div className="border rounded-md overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b text-gray-600 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Performance Score Range</th>
                          <th className="py-2.5 px-3">Weekly Bonus Payout</th>
                          <th className="py-2.5 px-3">Evaluation Tier</th>
                          <th className="py-2.5 px-3">Booking Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(configData.bonus_tiers || []).map((b, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3 font-semibold text-gray-900">
                              {b.min_score} – {b.max_score} Points
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs ${b.bonus_percentage >= 8
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : b.bonus_percentage >= 4
                                      ? 'bg-blue-100 text-blue-800'
                                      : b.bonus_percentage > 0
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-gray-100 text-gray-600'
                                  }`}
                              >
                                +{b.bonus_percentage}% Bonus
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-600">
                              {b.bonus_percentage >= 10
                                ? 'Elite Top Performer'
                                : b.bonus_percentage >= 8
                                  ? 'High Reliability'
                                  : b.bonus_percentage >= 6
                                    ? 'Standard Achiever'
                                    : b.bonus_percentage >= 4
                                      ? 'Moderate Performer'
                                      : b.bonus_percentage >= 2
                                        ? 'Below Average'
                                        : 'Needs Improvement'}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-gray-700">
                              {b.bonus_percentage >= 8
                                ? 'Highest Priority'
                                : b.bonus_percentage >= 6
                                  ? 'Normal Priority'
                                  : 'Review & Monitoring'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-gray-500 italic">
                    * Bonus percentage is applied to total eligible service earnings for the completed settlement week.
                  </p>
                </TabsContent>

                {/* Tab 3: Metric Scoring Scales */}
                <TabsContent value="thresholds" className="space-y-3 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Acceptance Tiers */}
                    <div className="border rounded-md p-3 bg-white">
                      <div className="font-semibold text-gray-900 mb-1.5 flex justify-between">
                        <span>Acceptance Rate</span>
                        <span className="text-gray-500 font-normal text-[11px]">Max {configData.metric_weights?.acceptance_rate} pts</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        {(configData.acceptance_rate_tiers || []).map((t, i) => (
                          <div key={i} className="flex justify-between py-0.5 border-b border-gray-50 last:border-0">
                            <span className="text-gray-600">≥ {t.min_percentage}% Acceptance:</span>
                            <span className="font-semibold text-gray-900">{t.points} Points</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Last Minute Rejection Tiers */}
                    <div className="border rounded-md p-3 bg-white">
                      <div className="font-semibold text-gray-900 mb-1.5 flex justify-between">
                        <span>Last-Minute Rejection</span>
                        <span className="text-gray-500 font-normal text-[11px]">Max {configData.metric_weights?.last_minute_rejection} pts</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        {(configData.last_minute_rejection_tiers || []).map((t, i) => (
                          <div key={i} className="flex justify-between py-0.5 border-b border-gray-50 last:border-0">
                            <span className="text-gray-600">
                              {t.max_count >= 999 ? '≥ 4 Cancellations' : `${t.max_count} Cancellation(s)`}:
                            </span>
                            <span className="font-semibold text-gray-900">{t.points} Points</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rescheduling Tiers */}
                    <div className="border rounded-md p-3 bg-white">
                      <div className="font-semibold text-gray-900 mb-1.5 flex justify-between">
                        <span>Partner Rescheduling</span>
                        <span className="text-gray-500 font-normal text-[11px]">Max {configData.metric_weights?.agent_rescheduling} pts</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        {(configData.agent_rescheduling_tiers || []).map((t, i) => (
                          <div key={i} className="flex justify-between py-0.5 border-b border-gray-50 last:border-0">
                            <span className="text-gray-600">
                              {t.max_count >= 999 ? '≥ 3 Reschedules' : `${t.max_count} Reschedule(s)`}:
                            </span>
                            <span className="font-semibold text-gray-900">{t.points} Points</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* On-Time Arrival Tiers */}
                    <div className="border rounded-md p-3 bg-white">
                      <div className="font-semibold text-gray-900 mb-1.5 flex justify-between">
                        <span>On-Time Arrival</span>
                        <span className="text-gray-500 font-normal text-[11px]">Max {configData.metric_weights?.on_time_arrival} pts</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        {(configData.on_time_arrival_tiers || []).map((t, i) => (
                          <div key={i} className="flex justify-between py-0.5 border-b border-gray-50 last:border-0">
                            <span className="text-gray-600">≥ {t.min_percentage}% On-Time:</span>
                            <span className="font-semibold text-gray-900">{t.points} Points</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rework Rate Tiers */}
                    <div className="border rounded-md p-3 bg-white">
                      <div className="font-semibold text-gray-900 mb-1.5 flex justify-between">
                        <span>Rework Rate</span>
                        <span className="text-gray-500 font-normal text-[11px]">Max {configData.metric_weights?.rework_rate} pts</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        {(configData.rework_rate_tiers || []).map((t, i) => (
                          <div key={i} className="flex justify-between py-0.5 border-b border-gray-50 last:border-0">
                            <span className="text-gray-600">
                              {t.max_count >= 999 ? '≥ 2 Reworks' : `${t.max_count} Rework(s)`}:
                            </span>
                            <span className="font-semibold text-gray-900">{t.points} Points</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Availability Tiers */}
                    <div className="border rounded-md p-3 bg-white">
                      <div className="font-semibold text-gray-900 mb-1.5 flex justify-between">
                        <span>Availability</span>
                        <span className="text-gray-500 font-normal text-[11px]">Max {configData.metric_weights?.availability} pts</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        {(configData.availability_tiers || []).map((t, i) => (
                          <div key={i} className="flex justify-between py-0.5 border-b border-gray-50 last:border-0">
                            <span className="text-gray-600">≥ {t.min_percentage}% Available:</span>
                            <span className="font-semibold text-gray-900">{t.points} Points</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 4: Operational Rules */}
                <TabsContent value="rules" className="space-y-3 mt-0">
                  <div className="border rounded-md p-4 bg-white space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 block text-[11px]">Mandatory Daily Working Hours</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {configData.operational_rules?.availability_start_time || '07:00'} to {configData.operational_rules?.availability_end_time || '18:00'} (11 Hours/Day)
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[11px]">Arrival Grace Period</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {configData.operational_rules?.arrival_grace_minutes || 30} Minutes
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[11px]">Last-Minute Rejection Window</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          Within {configData.operational_rules?.rejection_window_hours || 24} Hours of Booking Start
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[11px]">Mandatory Working Days</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {configData.operational_rules?.required_working_days || 6} Days / Week (3,960 min base)
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[11px]">Zero Booking Acceptance Policy</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {configData.operational_rules?.zero_booking_acceptance_score || 0} Points awarded if 0 bookings assigned
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[11px]">Weekly Settlement Cycle</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          Sunday 00:00 to Saturday 23:59 IST
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfigModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: Employee Partner Score History Dialog */}
      <PartnerScoreHistoryDialog
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        employee={historyEmployee}
        configData={configData}
      />
    </div>
  );
}
