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
  ChevronDown,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

  // Helper to compute default Sunday to Saturday cycle for calculation dialog
  const getCurrentWeekCycle = useCallback(() => {
    const now = new Date();
    // Week starts on Sunday (weekStartsOn: 0) and ends on Saturday
    const sunday = startOfWeek(now, { weekStartsOn: 0 });
    const saturday = endOfWeek(now, { weekStartsOn: 0 });

    // If today is Sunday (settlement day), default to the completed week cycle (Sunday to Saturday)
    const isSunday = now.getDay() === 0;
    const cycleStart = isSunday ? subWeeks(sunday, 1) : sunday;
    const cycleEnd = isSunday ? subWeeks(saturday, 1) : saturday;

    return {
      start: format(cycleStart, 'yyyy-MM-dd'),
      end: format(cycleEnd, 'yyyy-MM-dd'),
    };
  }, []);

  // Helper to compute previous week Sunday to Saturday cycle
  const getPreviousWeekCycle = useCallback(() => {
    const now = new Date();
    const isSunday = now.getDay() === 0;
    const refDate = isSunday ? subWeeks(now, 1) : now;
    const sunday = startOfWeek(subWeeks(refDate, 1), { weekStartsOn: 0 });
    const saturday = endOfWeek(subWeeks(refDate, 1), { weekStartsOn: 0 });
    return {
      start: format(sunday, 'yyyy-MM-dd'),
      end: format(saturday, 'yyyy-MM-dd'),
    };
  }, []);

  // Helper to snap selected date input to Sunday and Saturday bounds
  const handleStartDateChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    try {
      const d = parseISO(val);
      const sunday = startOfWeek(d, { weekStartsOn: 0 });
      const saturday = endOfWeek(d, { weekStartsOn: 0 });
      setCustomCycleDates({
        start: format(sunday, 'yyyy-MM-dd'),
        end: format(saturday, 'yyyy-MM-dd'),
      });
    } catch (err) {
      setCustomCycleDates((prev) => ({ ...prev, start: val }));
    }
  };

  const handleEndDateChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    try {
      const d = parseISO(val);
      const saturday = endOfWeek(d, { weekStartsOn: 0 });
      setCustomCycleDates((prev) => ({
        ...prev,
        end: format(saturday, 'yyyy-MM-dd'),
      }));
    } catch (err) {
      setCustomCycleDates((prev) => ({ ...prev, end: val }));
    }
  };

  // Modals state
  const [calculating, setCalculating] = useState(false);
  const [calculateModalOpen, setCalculateModalOpen] = useState(false);
  const [customCycleDates, setCustomCycleDates] = useState(() => getCurrentWeekCycle());

  // Check if current customCycleDates overlap with any finalized cycle in cycles array
  const hasFinalizedOverlap = useMemo(() => {
    if (!customCycleDates.start || !customCycleDates.end || !cycles.length) return false;
    const selStart = new Date(customCycleDates.start);
    const selEnd = new Date(customCycleDates.end);
    return cycles.some((c) => {
      if ((c.finalized_count || 0) <= 0) return false;
      const cStart = new Date(c.cycle_start);
      const cEnd = new Date(c.cycle_end);
      return selStart <= cEnd && selEnd >= cStart;
    });
  }, [customCycleDates, cycles]);
  const [isDeleteCycleDialogOpen, setIsDeleteCycleDialogOpen] = useState(false);
  const [deletingCycle, setDeletingCycle] = useState(false);
  const [isDeleteRecordDialogOpen, setIsDeleteRecordDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [deletingRecordId, setDeletingRecordId] = useState(null);
  const [isRecalculateDialogOpen, setIsRecalculateDialogOpen] = useState(false);
  const [recalculatingRecord, setRecalculatingRecord] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (calculateModalOpen) {
      setCustomCycleDates(getCurrentWeekCycle());
    }
  }, [calculateModalOpen, getCurrentWeekCycle]);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState(null);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingRecord, setAdjustingRecord] = useState(null);
  const [adjustMetrics, setAdjustMetrics] = useState(null);
  const [adjustFormMeta, setAdjustFormMeta] = useState({
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

  // Delete Draft Cycle Entries
  const handleDeleteDraftCycle = async () => {
    if (!selectedCycle) return;
    setDeletingCycle(true);
    try {
      const res = await performanceService.deleteDraftCycle(
        selectedCycle.cycle_start,
        selectedCycle.cycle_end
      );
      toast.success(res.message || 'Draft cycle performance entries deleted successfully');
      setIsDeleteCycleDialogOpen(false);
      setSelectedCycle(null);
      await fetchCycles();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete draft cycle entries');
    } finally {
      setDeletingCycle(false);
    }
  };

  // Delete Individual Row Performance Entry
  const handleDeleteRecord = async () => {
    if (!deletingRecord?.id) return;
    setDeletingRecordId(deletingRecord.id);
    try {
      await performanceService.deletePerformance(deletingRecord.id);
      toast.success('Draft performance score entry deleted successfully');
      setIsDeleteRecordDialogOpen(false);
      setDeletingRecord(null);
      await fetchCyclePerformances();
      await fetchCycles();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete draft performance entry');
    } finally {
      setDeletingRecordId(null);
    }
  };

  // Recalculate Individual Row Performance Entry
  const handleRecalculateRecord = async () => {
    if (!recalculatingRecord?.id) return;
    setRecalculating(true);
    try {
      await performanceService.recalculatePerformance(recalculatingRecord.id);
      toast.success('Performance score recalculated successfully');
      setIsRecalculateDialogOpen(false);
      setRecalculatingRecord(null);
      await fetchCyclePerformances();
      await fetchCycles();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to recalculate performance score');
    } finally {
      setRecalculating(false);
    }
  };

  // Estimated Total Score for Live Preview in Adjustment Modal
  const estimatedTotalScore = useMemo(() => {
    if (!adjustMetrics) return adjustingRecord?.total_score || 0;
    let sum = 0;
    Object.values(adjustMetrics).forEach((m) => {
      const score = parseInt(m.adjusted_score, 10);
      if (!isNaN(score)) {
        sum += score;
      }
    });
    return Math.min(100, Math.max(0, sum));
  }, [adjustMetrics, adjustingRecord]);

  // Estimated Bonus Percentage for Live Preview in Adjustment Modal
  const estimatedBonusPct = useMemo(() => {
    const tiers = configData?.bonus_tiers || [
      { min_score: 90, max_score: 100, bonus_percentage: 10 },
      { min_score: 80, max_score: 89, bonus_percentage: 8 },
      { min_score: 70, max_score: 79, bonus_percentage: 6 },
      { min_score: 60, max_score: 69, bonus_percentage: 4 },
      { min_score: 50, max_score: 59, bonus_percentage: 2 },
    ];
    const matched = tiers.find(
      (t) => estimatedTotalScore >= t.min_score && estimatedTotalScore <= t.max_score
    );
    return matched !== undefined ? matched.bonus_percentage : 0;
  }, [estimatedTotalScore, configData]);

  // Open Adjust Modal with All Metrics
  const handleOpenAdjust = (rec) => {
    setAdjustingRecord(rec);
    setAdjustFormMeta({
      exception_type: rec.adjustment_status === 'adjusted' ? 'other' : 'emergency',
      reason: rec.adjustment_reason || '',
      evidence_url: '',
    });
    setAdjustMetrics({
      acceptance: {
        key: 'acceptance',
        name: 'Acceptance Rate',
        max: metricWeights.acceptance_rate,
        unit: '%',
        step: '0.1',
        adjusted_value: rec.acceptance_rate ?? 0,
        adjusted_score: rec.acceptance_score ?? 0,
        orig_value: rec.acceptance_rate ?? 0,
        orig_score: rec.acceptance_score ?? 0,
      },
      last_minute_rejection: {
        key: 'last_minute_rejection',
        name: 'Last-Minute Rejection',
        max: metricWeights.last_minute_rejection,
        unit: 'count',
        step: '1',
        adjusted_value: rec.qualifying_rejections ?? 0,
        adjusted_score: rec.rejection_score ?? 0,
        orig_value: rec.qualifying_rejections ?? 0,
        orig_score: rec.rejection_score ?? 0,
      },
      rescheduling: {
        key: 'rescheduling',
        name: 'Partner Rescheduling',
        max: metricWeights.agent_rescheduling,
        unit: 'count',
        step: '1',
        adjusted_value: rec.partner_reschedules ?? 0,
        adjusted_score: rec.rescheduling_score ?? 0,
        orig_value: rec.partner_reschedules ?? 0,
        orig_score: rec.rescheduling_score ?? 0,
      },
      on_time_arrival: {
        key: 'on_time_arrival',
        name: 'On-Time Arrival',
        max: metricWeights.on_time_arrival,
        unit: '%',
        step: '0.1',
        adjusted_value: rec.on_time_arrival_rate ?? 0,
        adjusted_score: rec.arrival_score ?? 0,
        orig_value: rec.on_time_arrival_rate ?? 0,
        orig_score: rec.arrival_score ?? 0,
      },
      rework: {
        key: 'rework',
        name: 'Rework Rate',
        max: metricWeights.rework_rate,
        unit: 'count',
        step: '1',
        adjusted_value: rec.verified_reworks ?? 0,
        adjusted_score: rec.rework_score ?? 0,
        orig_value: rec.verified_reworks ?? 0,
        orig_score: rec.rework_score ?? 0,
      },
      availability: {
        key: 'availability',
        name: 'Availability',
        max: metricWeights.availability,
        unit: '%',
        step: '0.1',
        adjusted_value: rec.availability_rate ?? 0,
        adjusted_score: rec.availability_score ?? 0,
        orig_value: rec.availability_rate ?? 0,
        orig_score: rec.availability_score ?? 0,
      },
    });
    setAdjustModalOpen(true);
  };

  // Helper to calculate Score based on Value & Metric Tiers
  const calculateScoreFromValue = useCallback((key, val) => {
    const numVal = parseFloat(val);
    if (isNaN(numVal)) return 0;

    let score = 0;
    if (key === 'acceptance') {
      const tiers = configData?.acceptance_rate_tiers || [
        { min_percentage: 95, points: 25 },
        { min_percentage: 90, points: 20 },
        { min_percentage: 85, points: 15 },
        { min_percentage: 80, points: 10 },
      ];
      const matched = tiers.find((t) => numVal >= t.min_percentage);
      score = matched ? matched.points : 0;
    } else if (key === 'last_minute_rejection') {
      const tiers = configData?.last_minute_rejection_tiers || [
        { max_count: 0, points: 15 },
        { max_count: 1, points: 10 },
        { max_count: 2, points: 5 },
      ];
      const matched = tiers.find((t) => numVal <= t.max_count);
      score = matched ? matched.points : 0;
    } else if (key === 'rescheduling') {
      const tiers = configData?.agent_rescheduling_tiers || [
        { max_count: 0, points: 10 },
        { max_count: 1, points: 5 },
      ];
      const matched = tiers.find((t) => numVal <= t.max_count);
      score = matched ? matched.points : 0;
    } else if (key === 'on_time_arrival') {
      const tiers = configData?.on_time_arrival_tiers || [
        { min_percentage: 90, points: 25 },
        { min_percentage: 85, points: 20 },
        { min_percentage: 80, points: 15 },
        { min_percentage: 75, points: 10 },
      ];
      const matched = tiers.find((t) => numVal >= t.min_percentage);
      score = matched ? matched.points : 0;
    } else if (key === 'rework') {
      const tiers = configData?.rework_rate_tiers || [
        { max_count: 0, points: 20 },
        { max_count: 1, points: 10 },
        { max_count: 2, points: 5 },
      ];
      const matched = tiers.find((t) => numVal <= t.max_count);
      score = matched ? matched.points : 0;
    } else if (key === 'availability') {
      const tiers = configData?.availability_tiers || [
        { min_percentage: 95, points: 5 },
        { min_percentage: 90, points: 4 },
        { min_percentage: 85, points: 3 },
        { min_percentage: 80, points: 2 },
      ];
      const matched = tiers.find((t) => numVal >= t.min_percentage);
      score = matched ? matched.points : 0;
    }

    const maxPoints = metricWeights[
      key === 'acceptance' ? 'acceptance_rate' :
        key === 'last_minute_rejection' ? 'last_minute_rejection' :
          key === 'rescheduling' ? 'agent_rescheduling' :
            key === 'on_time_arrival' ? 'on_time_arrival' :
              key === 'rework' ? 'rework_rate' : 'availability'
    ] || 25;

    return Math.min(maxPoints, Math.max(0, score));
  }, [configData, metricWeights]);

  // Helper to calculate Value based on Score & Metric Tiers
  const calculateValueFromScore = useCallback((key, sc) => {
    const numScore = parseInt(sc, 10);
    if (isNaN(numScore)) return 0;

    if (key === 'acceptance') {
      const tiers = configData?.acceptance_rate_tiers || [
        { min_percentage: 95, points: 25 },
        { min_percentage: 90, points: 20 },
        { min_percentage: 85, points: 15 },
        { min_percentage: 80, points: 10 },
      ];
      const matched = tiers.find((t) => t.points === numScore);
      if (matched) return matched.min_percentage;
      if (numScore >= 25) return 100;
      return 0;
    } else if (key === 'last_minute_rejection') {
      const tiers = configData?.last_minute_rejection_tiers || [
        { max_count: 0, points: 15 },
        { max_count: 1, points: 10 },
        { max_count: 2, points: 5 },
      ];
      const matched = tiers.find((t) => t.points === numScore);
      if (matched) return matched.max_count;
      if (numScore >= 15) return 0;
      return 3;
    } else if (key === 'rescheduling') {
      const tiers = configData?.agent_rescheduling_tiers || [
        { max_count: 0, points: 10 },
        { max_count: 1, points: 5 },
      ];
      const matched = tiers.find((t) => t.points === numScore);
      if (matched) return matched.max_count;
      if (numScore >= 10) return 0;
      return 2;
    } else if (key === 'on_time_arrival') {
      const tiers = configData?.on_time_arrival_tiers || [
        { min_percentage: 90, points: 25 },
        { min_percentage: 85, points: 20 },
        { min_percentage: 80, points: 15 },
        { min_percentage: 75, points: 10 },
      ];
      const matched = tiers.find((t) => t.points === numScore);
      if (matched) return matched.min_percentage;
      if (numScore >= 25) return 100;
      return 0;
    } else if (key === 'rework') {
      const tiers = configData?.rework_rate_tiers || [
        { max_count: 0, points: 20 },
        { max_count: 1, points: 10 },
        { max_count: 2, points: 5 },
      ];
      const matched = tiers.find((t) => t.points === numScore);
      if (matched) return matched.max_count;
      if (numScore >= 20) return 0;
      return 3;
    } else if (key === 'availability') {
      const tiers = configData?.availability_tiers || [
        { min_percentage: 95, points: 5 },
        { min_percentage: 90, points: 4 },
        { min_percentage: 85, points: 3 },
        { min_percentage: 80, points: 2 },
      ];
      const matched = tiers.find((t) => t.points === numScore);
      if (matched) return matched.min_percentage;
      if (numScore >= 5) return 100;
      return 0;
    }
    return 0;
  }, [configData]);

  // Handle Metric Input Changes with Automatic Cross-Calculation & Clamping
  const handleMetricChange = (key, field, val) => {
    setAdjustMetrics((prev) => {
      if (!prev || !prev[key]) return prev;
      const targetMetric = prev[key];
      const maxScore = targetMetric.max;
      const isPercentage = targetMetric.unit === '%';

      if (val === '') {
        return {
          ...prev,
          [key]: {
            ...targetMetric,
            [field]: '',
          },
        };
      }

      let newAdjustedVal = targetMetric.adjusted_value;
      let newAdjustedScore = targetMetric.adjusted_score;

      if (field === 'adjusted_value') {
        let numVal = parseFloat(val);
        if (isNaN(numVal)) {
          newAdjustedVal = '';
        } else {
          // Clamp value within bounds
          if (isPercentage) {
            numVal = Math.min(100, Math.max(0, numVal));
          } else {
            numVal = Math.min(999, Math.max(0, Math.floor(numVal)));
          }
          newAdjustedVal = numVal;
          // Automatically update score from value
          newAdjustedScore = calculateScoreFromValue(key, numVal);
        }
      } else if (field === 'adjusted_score') {
        let numScore = parseInt(val, 10);
        if (isNaN(numScore)) {
          newAdjustedScore = '';
        } else {
          // Clamp score between 0 and maxScore
          numScore = Math.min(maxScore, Math.max(0, numScore));
          newAdjustedScore = numScore;
          // Automatically update value from score
          newAdjustedVal = calculateValueFromScore(key, numScore);
        }
      }

      return {
        ...prev,
        [key]: {
          ...targetMetric,
          adjusted_value: newAdjustedVal,
          adjusted_score: newAdjustedScore,
        },
      };
    });
  };

  // Submit Adjustment for all edited metrics
  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustFormMeta.reason.trim()) {
      toast.error('Please provide a reason for the manual adjustment');
      return;
    }

    if (!adjustMetrics) return;

    // Find all metrics that have been modified
    const changedMetrics = Object.values(adjustMetrics).filter((m) => {
      const valChanged = parseFloat(m.adjusted_value) !== parseFloat(m.orig_value);
      const scoreChanged = parseInt(m.adjusted_score, 10) !== parseInt(m.orig_score, 10);
      return valChanged || scoreChanged;
    });

    if (changedMetrics.length === 0) {
      toast.info('No metric values or scores were changed');
      return;
    }

    // Validate boundaries before submission
    for (const m of changedMetrics) {
      const scoreNum = parseInt(m.adjusted_score, 10);
      const valNum = parseFloat(m.adjusted_value);

      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > m.max) {
        toast.error(`Adjusted score for ${m.name} must be between 0 and ${m.max} points`);
        return;
      }
      if (isNaN(valNum) || valNum < 0 || (m.unit === '%' && valNum > 100)) {
        toast.error(`Adjusted value for ${m.name} is out of allowed range (${m.unit === '%' ? '0 - 100%' : '0 or positive count'})`);
        return;
      }
    }

    setSubmittingAdjust(true);
    try {
      for (const m of changedMetrics) {
        const payload = {
          metric_name: m.key,
          adjusted_value: parseFloat(m.adjusted_value) || 0,
          adjusted_score: parseInt(m.adjusted_score, 10) || 0,
          exception_type: adjustFormMeta.exception_type,
          reason: adjustFormMeta.reason,
          evidence_url: adjustFormMeta.evidence_url || '',
        };
        await performanceService.submitAdjustment(adjustingRecord.id, payload);
      }
      toast.success(
        `${changedMetrics.length} metric score override${changedMetrics.length > 1 ? 's' : ''} saved successfully`
      );
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

          {/* 3-Dots Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 cursor-pointer"
                title="More Options"
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleOpenConfigModal} className="cursor-pointer">
                <Info className="h-4 w-4 mr-2 text-blue-600" />
                <span>Scoring Config {configData?.version ? `(v${configData.version})` : ''}</span>
              </DropdownMenuItem>

              {selectedCycle && selectedCycle.finalized_count === 0 && (
                <DropdownMenuItem
                  onClick={() => setIsDeleteCycleDialogOpen(true)}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Delete Draft Cycle</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm border-gray-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-center">

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

      {/* Main Content Tabs: Partner Scores & Trend Chart */}
      <Tabs defaultValue="scores" className="w-full space-y-4">
        <TabsList className="grid grid-cols-1 sm:grid-cols-2 w-full sm:w-[650px] h-11 p-1 bg-gray-100 rounded-xl">
          <TabsTrigger
            value="scores"
            className="text-xs font-semibold flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all"
          >
            <Award className="h-4 w-4 text-blue-600" />
            <span>Partner Scores & Overrides ({filteredPerformances.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="trend"
            className="text-xs font-semibold flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all"
          >
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span>Weekly Performance Score & Bonus Trend ({weeksFilter} Weeks)</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Trend Chart */}
        <TabsContent value="trend" className="mt-0">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Weekly Performance Score & Bonus Trend ({weeksFilter} Weeks)
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Track historical weekly score progression alongside total bonus distributions.
                  </CardDescription>
                </div>

                {/* Historical Window Presets */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Historical Window:</span>
                  <div className="flex rounded-md shadow-2xs">
                    {WEEKS_PRESETS.map((p) => {
                      const isSelected = weeksFilter === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setWeeksFilter(p.value)}
                          className={`cursor-pointer px-2.5 py-1 text-xs font-medium border first:rounded-l-md last:rounded-r-md transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary z-10 font-semibold shadow-2xs'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                          }`}
                        >
                          {p.value}w
                        </button>
                      );
                    })}
                  </div>
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
                      <th className="py-3 px-3 text-center">Weekly Cycle</th>
                      <th className="py-3 px-3 text-center">Score / Tier</th>
                      <th className="py-3 px-3 text-right">Order Total</th>
                      <th className="py-3 px-3 text-right">Bonus Amount</th>
                      <th className="py-3 px-3 text-center">Acceptance</th>
                      <th className="py-3 px-3 text-center">Rejection</th>
                      <th className="py-3 px-3 text-center">Reschedule</th>
                      <th className="py-3 px-3 text-center">Arrival</th>
                      <th className="py-3 px-3 text-center">Rework</th>
                      <th className="py-3 px-3 text-center">Availability</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="13" className="text-center py-12 text-gray-500">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary-500 mb-2" />
                          Loading performance records...
                        </td>
                      </tr>
                    ) : filteredPerformances.length === 0 ? (
                      <tr>
                        <td colSpan="13" className="text-center py-12 text-gray-500">
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

                            {/* Weekly Cycle */}
                            <td className="py-3 px-3 text-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span>
                                  {rec.cycle_start && rec.cycle_end
                                    ? `${format(parseISO(rec.cycle_start), 'dd MMM')} – ${format(parseISO(rec.cycle_end), 'dd MMM yyyy')}`
                                    : selectedCycle
                                    ? `${format(parseISO(selectedCycle.cycle_start), 'dd MMM')} – ${format(parseISO(selectedCycle.cycle_end), 'dd MMM yyyy')}`
                                    : 'N/A'}
                                </span>
                              </span>
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
                            <td className="py-3 px-2 text-center">
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
                            <td className="py-3 text-right flex justify-end space-x-1">

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
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                                    onClick={() => {
                                      setRecalculatingRecord(rec);
                                      setIsRecalculateDialogOpen(true);
                                    }}
                                    title="Recalculate score from system metrics"
                                  >
                                    Recalculate
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

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs px-2 text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                                    onClick={() => {
                                      setDeletingRecord(rec);
                                      setIsDeleteRecordDialogOpen(true);
                                    }}
                                    title="Delete draft score entry"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
            {/* Week Shortcuts */}
            <div className="flex items-center justify-between gap-2 p-2 bg-gray-50 border rounded-md">
              <span className="text-xs font-medium text-gray-700">Quick Select:</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="h-7 text-xs"
                  onClick={() => setCustomCycleDates(getCurrentWeekCycle())}
                >
                  Current Week
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="h-7 text-xs"
                  onClick={() => setCustomCycleDates(getPreviousWeekCycle())}
                >
                  Previous Week
                </Button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-xs flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Selecting any date will automatically snap the cycle to <strong>Sunday 00:00</strong> - <strong>Saturday 23:59 IST</strong>.
              </span>
            </div>

            {hasFinalizedOverlap && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Warning:</strong> Selected range overlaps with an already finalized cycle. Order earnings in finalized cycles will be automatically excluded to prevent double payouts.
                </span>
              </div>
            )}

            <div>
              <Label className="text-xs mb-1 block">Cycle Start (Sunday 00:00)</Label>
              <Input
                type="date"
                value={customCycleDates.start}
                onChange={handleStartDateChange}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Cycle End (Saturday 23:59)</Label>
              <Input
                type="date"
                value={customCycleDates.end}
                onChange={handleEndDateChange}
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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 shrink-0">
            <DialogTitle>Manual Score Override & Adjustment</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Override operational metric scores with documented evidence and justification. The total score and bonus tier will automatically recalculate.
            </DialogDescription>
          </DialogHeader>

          {adjustingRecord && adjustMetrics && (
            <form onSubmit={handleSubmitAdjustment} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                {/* Top Banner */}
                <div className="p-3 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {adjustingRecord.employee?.name || 'Partner'} ({adjustingRecord.employee?.employee_number})
                    </div>
                    <div className="text-gray-500 text-[11px] mt-0.5">
                      Original Score: <strong>{adjustingRecord.total_score} / {totalMaxPoints}</strong> • Original Tier: <strong>{adjustingRecord.bonus_percentage}% Bonus</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-md border shadow-sm text-xs">
                    <div>
                      <span className="text-gray-500 text-[10px] block uppercase font-medium">Estimated New Score</span>
                      <span className={`font-bold text-sm ${estimatedTotalScore !== adjustingRecord.total_score ? 'text-blue-600' : 'text-gray-800'}`}>
                        {estimatedTotalScore} / {totalMaxPoints}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-gray-500 text-[10px] block uppercase font-medium">Estimated Bonus</span>
                      <span className={`font-bold text-sm ${estimatedBonusPct !== adjustingRecord.bonus_percentage ? 'text-emerald-600' : 'text-gray-800'}`}>
                        {estimatedBonusPct}% Bonus
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table of All Metrics */}
                <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-gray-600 font-medium">
                        <th className="py-2.5 px-3">Metric Name</th>
                        <th className="py-2.5 px-3 text-center">Max Pts</th>
                        <th className="py-2.5 px-3 text-center">Original Value</th>
                        <th className="py-2.5 px-3 text-center">Original Score</th>
                        <th className="py-2.5 px-3 text-center w-36">Adjusted Value</th>
                        <th className="py-2.5 px-3 text-center w-48">Adjusted Score</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-gray-700">
                      {Object.values(adjustMetrics).map((m) => {
                        const isValChanged = parseFloat(m.adjusted_value) !== parseFloat(m.orig_value);
                        const isScoreChanged = parseInt(m.adjusted_score, 10) !== parseInt(m.orig_score, 10);
                        const isModified = isValChanged || isScoreChanged;
                        const scoreDelta = (parseInt(m.adjusted_score, 10) || 0) - (parseInt(m.orig_score, 10) || 0);

                        return (
                          <tr key={m.key} className={isModified ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'}>
                            <td className="py-2.5 px-3 font-medium text-gray-900">
                              {m.name}
                            </td>
                            <td className="py-2.5 px-3 text-center text-gray-500 font-semibold">
                              {m.max} pts
                            </td>
                            <td className="py-2.5 px-3 text-center text-gray-600">
                              {m.unit === '%' ? `${m.orig_value}%` : `${m.orig_value}`}
                            </td>
                            <td className="py-2.5 px-3 text-center text-gray-600 font-medium">
                              {m.orig_score} / {m.max}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="relative flex items-center">
                                <Input
                                  type="number"
                                  step={m.step}
                                  min={0}
                                  max={m.unit === '%' ? 100 : 999}
                                  placeholder={m.unit === '%' ? '0-100' : '0+'}
                                  title={m.unit === '%' ? 'Allowed value: 0% to 100%' : 'Allowed value: 0 or positive count'}
                                  value={m.adjusted_value}
                                  onChange={(e) => handleMetricChange(m.key, 'adjusted_value', e.target.value)}
                                  className="h-8 text-xs pr-7 text-center font-medium"
                                />
                                <span className="absolute right-2 text-[10px] text-gray-400 pointer-events-none">
                                  {m.unit}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex-1 flex items-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={m.max}
                                    placeholder={`0-${m.max}`}
                                    title={`Allowed score: 0 to ${m.max} points`}
                                    value={m.adjusted_score}
                                    onChange={(e) => handleMetricChange(m.key, 'adjusted_score', e.target.value)}
                                    className="h-8 text-xs text-center font-semibold pr-7"
                                  />
                                  <span className="absolute right-2 text-[10px] text-gray-400 pointer-events-none">
                                    pts
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  onClick={() => handleMetricChange(m.key, 'adjusted_score', m.max)}
                                  className="h-8 text-[11px] px-2 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 font-medium whitespace-nowrap shrink-0 shadow-xs"
                                  title={`Set max score for ${m.name} (${m.max} pts)`}
                                >
                                  Set Max
                                </Button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isModified ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${scoreDelta > 0 ? 'bg-emerald-100 text-emerald-800' : scoreDelta < 0 ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {scoreDelta > 0 ? `+${scoreDelta} pts` : scoreDelta < 0 ? `${scoreDelta} pts` : 'Modified'}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[11px]">Unchanged</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Exception Category, Evidence & Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-xs mb-1 block">Exception Category</Label>
                    <select
                      value={adjustFormMeta.exception_type}
                      onChange={(e) => setAdjustFormMeta((prev) => ({ ...prev, exception_type: e.target.value }))}
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
                    <Label className="text-xs mb-1 block">Evidence / Ticket URL (Optional)</Label>
                    <Input
                      type="url"
                      placeholder="https://spado.in/tickets/..."
                      value={adjustFormMeta.evidence_url}
                      onChange={(e) => setAdjustFormMeta((prev) => ({ ...prev, evidence_url: e.target.value }))}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Reason & Justification (Required)</Label>
                  <Textarea
                    required
                    rows={2}
                    placeholder="Explain why score(s) are being adjusted..."
                    value={adjustFormMeta.reason}
                    onChange={(e) => setAdjustFormMeta((prev) => ({ ...prev, reason: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <DialogFooter className="p-4 px-6 border-t border-gray-100 bg-gray-50/80 shrink-0 gap-2 sm:gap-0">
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
                  {submittingAdjust ? 'Saving Overrides...' : 'Apply Overrides'}
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

      {/* MODAL 6: Confirm Delete Draft Cycle Dialog */}
      <Dialog open={isDeleteCycleDialogOpen} onOpenChange={setIsDeleteCycleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Draft Cycle Entries
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 pt-1">
              Are you sure you want to delete all draft performance score entries for the cycle{' '}
              <strong>
                {selectedCycle &&
                  `${format(parseISO(selectedCycle.cycle_start), 'dd MMM')} – ${format(
                    parseISO(selectedCycle.cycle_end),
                    'dd MMM yyyy'
                  )}`}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              This will remove all draft score records and remove this cycle from the selection menu. You can re-run performance calculations afterwards.
            </span>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteCycleDialogOpen(false)}
              disabled={deletingCycle}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteDraftCycle}
              disabled={deletingCycle}
            >
              {deletingCycle && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {deletingCycle ? 'Deleting...' : 'Delete Draft Entries'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 7: Confirm Delete Single Row Draft Record Dialog */}
      <Dialog open={isDeleteRecordDialogOpen} onOpenChange={setIsDeleteRecordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Draft Score Entry
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 pt-1">
              Are you sure you want to delete the draft performance score entry for{' '}
              <strong>
                {deletingRecord?.employee?.name || deletingRecord?.employee?.user?.name || 'this partner'}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              This will remove this partner's draft score record from the current cycle evaluation list.
            </span>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteRecordDialogOpen(false)}
              disabled={Boolean(deletingRecordId)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteRecord}
              disabled={Boolean(deletingRecordId)}
            >
              {deletingRecordId && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {deletingRecordId ? 'Delete Draft Entry' : 'Delete Draft Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 8: Confirm Recalculate Single Row Draft Record Dialog */}
      <Dialog open={isRecalculateDialogOpen} onOpenChange={setIsRecalculateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <RefreshCw className="h-5 w-5 text-amber-600" />
              Recalculate Performance Score
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 pt-1">
              Are you sure you want to recalculate the performance score for{' '}
              <strong>
                {recalculatingRecord?.employee?.name || recalculatingRecord?.employee?.user?.name || 'this partner'}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              This will re-evaluate raw operational metrics (Acceptance, On-Time Arrival, Rejections, Availability, Reworks) from live system logs and reset any manual score overrides for this record.
            </span>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecalculateDialogOpen(false)}
              disabled={recalculating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleRecalculateRecord}
              disabled={recalculating}
            >
              {recalculating && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {recalculating ? 'Recalculating...' : 'Confirm Recalculate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 7: Employee Partner Score History Dialog */}
      <PartnerScoreHistoryDialog
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        employee={historyEmployee}
        configData={configData}
      />
    </div>
  );
}
