import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Printer,
  Download,
  Search,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import walletService from '../services/walletService';

const Settlements = () => {
  const [activeTab, setActiveTab] = useState('due'); // 'due' or 'history'
  const [dueEmployees, setDueEmployees] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filters for History
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    cycle: '',
    start_date: '',
    end_date: '',
  });

  // Modal / Settlement Confirmation State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [settlementForm, setSettlementForm] = useState({
    notes: '',
    reference_number: '',
    allow_negative_recovery: false,
  });
  const [submittingSettlement, setSubmittingSettlement] = useState(false);

  // Print Modal State
  const [printableSettlement, setPrintableSettlement] = useState(null);

  const fetchDueSettlements = async () => {
    setLoading(true);
    try {
      const data = await walletService.getSettlementsDue();
      setDueEmployees(data.employees || []);
    } catch (err) {
      toast.error('Failed to load due settlements');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettlementHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await walletService.getSettlements({
        ...filters,
        page,
        per_page: 15,
      });
      setSettlements(data.settlements || []);
      setTotalPages(data.meta?.total_pages || 1);
    } catch (err) {
      toast.error('Failed to load settlement history');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (activeTab === 'due') {
      fetchDueSettlements();
    } else {
      fetchSettlementHistory();
    }
  }, [activeTab, fetchSettlementHistory]);

  const handleOpenSettlementModal = async (empId) => {
    setSelectedEmployeeId(empId);
    setPreviewLoading(true);
    try {
      const data = await walletService.getSettlementPreview(empId);
      setPreview(data.preview);
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0] || 'Failed to generate settlement preview');
      setSelectedEmployeeId(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmSettlement = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    setSubmittingSettlement(true);
    try {
      const res = await walletService.createSettlement(selectedEmployeeId, settlementForm);
      toast.success('Settlement processed successfully!');
      setSelectedEmployeeId(null);
      setPreview(null);
      setSettlementForm({ notes: '', reference_number: '', allow_negative_recovery: false });
      fetchDueSettlements();

      // Open print view
      if (res.settlement) {
        setPrintableSettlement(res.settlement);
      }
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0] || 'Failed to process settlement');
    } finally {
      setSubmittingSettlement(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleViewReceipt = async (st) => {
    try {
      const data = await walletService.getSettlementByID(st.id);
      setPrintableSettlement(data.settlement || st);
    } catch (err) {
      setPrintableSettlement(st);
    }
  };

  const renderWorkItemsBreakdown = (items, perfBonusPct) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-gray-800">
          <span>Work Items & Payment Split Breakdown</span>
          <span className="text-[11px] text-gray-500 font-normal">
            {items.length} work entries in cycle
          </span>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-700 font-semibold text-[11px]">
                <th className="py-2 px-2.5">Work / Order #</th>
                <th className="py-2 px-2 text-right">Order Amt</th>
                <th className="py-2 px-2 text-right">Fixed Earning</th>
                <th className="py-2 px-2 text-center">Rating</th>
                <th className="py-2 px-2 text-right">Perf. Bonus</th>
                <th className="py-2 px-2.5 text-right">Work Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {items.map((item, idx) => {
                const isOrder = item.transaction_type === 'ORDER_EARNING' || item.order_number;
                const bonusPct = item.performance_bonus_percentage || perfBonusPct || 0;

                return (
                  <tr key={item.id || idx} className="hover:bg-gray-50/50">
                    <td className="py-2 px-2.5 font-medium text-gray-900">
                      {item.order_number ? (
                        <span className="font-mono font-bold text-blue-700">{item.order_number}</span>
                      ) : (
                        <span className="text-gray-600">{item.description || item.transaction_type}</span>
                      )}
                      <span className="block text-[10px] text-gray-400">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : ''}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {item.order_amount > 0 ? `₹${item.order_amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-emerald-700 font-medium">
                      {isOrder && item.employee_percentage ? (
                        <div>
                          ₹{(item.fixed_earning_amount || 0).toFixed(2)}
                          <span className="block text-[10px] text-gray-500">({item.employee_percentage}%)</span>
                        </div>
                      ) : (
                        `₹${(item.amount || 0).toFixed(2)}`
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {item.review_rating ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 text-[10px]">
                          ★ {item.review_rating}.0
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[10px]">Unrated</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-emerald-700">
                      {item.performance_bonus_amount > 0 ? (
                        <div>
                          +₹{item.performance_bonus_amount.toFixed(2)}
                          <span className="block text-[10px] text-emerald-600 font-semibold">(+{bonusPct}%)</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-900">
                      ₹{(item.total_work_earning || item.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" strokeWidth={1.5} />
            Employee Settlements
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Automated cycle identification, calculations & payout confirmations
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200">
          <button
            onClick={() => setActiveTab('due')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'due'
              ? 'bg-white text-gray-900 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Settlements Due
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'history'
              ? 'bg-white text-gray-900 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Settlement History
          </button>
        </div>
      </div>

      {/* Due Tab Content */}
      {activeTab === 'due' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900">Employees Due For Settlement</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDueSettlements}
              className="text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary-500" />
              <span>Scanning settlement cycles...</span>
            </div>
          ) : dueEmployees.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <UserCheck className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-60" />
              <p className="text-base font-semibold text-gray-700">All Employees Up To Date!</p>
              <p className="text-xs text-gray-500 mt-1">No pending settlement cycles at this time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Cycle</th>
                    <th className="py-3 px-4 text-right">Gross Earnings</th>
                    <th className="py-3 px-4 text-right">Comm. Due</th>
                    <th className="py-3 px-4 text-right">Bonuses</th>
                    <th className="py-3 px-4 text-right">Penalties</th>
                    <th className="py-3 px-4 text-right font-bold text-gray-900">Net Payable (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dueEmployees.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-gray-900 whitespace-nowrap">
                        {emp.employee_name}
                        <div className="text-xs text-gray-500 font-mono">{emp.employee_number}</div>
                      </td>
                      <td className="py-3.5 px-4 uppercase text-xs font-semibold text-gray-600 whitespace-nowrap">
                        {emp.settlement_cycle}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-700 font-medium">
                        ₹{(emp.pending_earnings || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-600 font-medium">
                        -₹{Math.abs(emp.commission_due || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 font-medium">
                        +₹{(emp.bonuses || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-600 font-medium">
                        -₹{Math.abs(emp.penalties || 0).toFixed(2)}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold text-base whitespace-nowrap ${emp.net_payable < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                        ₹{(emp.net_payable || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {emp.net_payable < 0 ? (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-full inline-flex items-center gap-1">
                            Carry Forward (Debt)
                          </span>
                        ) : emp.settlement_due ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full inline-flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Due
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                            Pending Cycle
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSettlementForm({ notes: '', reference_number: '', allow_negative_recovery: false });
                            handleOpenSettlementModal(emp.employee_id);
                          }}
                          className={emp.net_payable < 0
                            ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-medium text-xs shadow-none"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"}
                        >
                          {emp.net_payable < 0 ? 'Review Debt' : 'Create Settlement'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900">Settlement History Records</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading history...</div>
          ) : settlements.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No past settlements recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Settled At</th>
                    <th className="py-3 px-4">Ref #</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Cycle</th>
                    <th className="py-3 px-4 text-right">Net Paid (₹)</th>
                    <th className="py-3 px-4">Settled By</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {settlements.map((st) => (
                    <tr key={st.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap">
                        {new Date(st.settled_at || st.created_at).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-900">
                        {st.reference_number || `#SETTLE-${st.id}`}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-900">
                        {st.employee_name}
                      </td>
                      <td className="py-3.5 px-4 uppercase text-xs text-gray-600 font-semibold">
                        {st.cycle}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        ₹{(st.net_payable || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">
                        {st.settled_by_name || 'Admin'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReceipt(st)}
                          className="flex items-center gap-1 border-gray-300 text-xs"
                        >
                          <Printer className="h-3.5 w-3.5" /> View / Print Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900">Settlement History Records</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSettlementHistory}
              className="text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary-500" />
              <span>Loading settlement history...</span>
            </div>
          ) : settlements.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3 opacity-60" />
              <p className="text-base font-semibold text-gray-700">No Settlement History</p>
              <p className="text-xs text-gray-500 mt-1">Processed settlement records will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Reference #</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Cycle</th>
                    <th className="py-3 px-4 text-right">Net Paid (₹)</th>
                    <th className="py-3 px-4">Settled By</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {settlements.map((st) => (
                    <tr key={st.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap">
                        {new Date(st.settled_at || st.created_at).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-900">
                        {st.reference_number || `#SETTLE-${st.id}`}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-900">
                        {st.employee_name}
                      </td>
                      <td className="py-3.5 px-4 uppercase text-xs text-gray-600 font-semibold">
                        {st.cycle}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        ₹{(st.net_payable || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">
                        {st.settled_by_name || 'Admin'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReceipt(st)}
                          className="flex items-center gap-1 border-gray-300 text-xs"
                        >
                          <Printer className="h-3.5 w-3.5" /> View / Print Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation & Calculation Dialog */}
      {selectedEmployeeId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-gray-100 max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Settlement Confirmation</h3>
              <button
                onClick={() => { setSelectedEmployeeId(null); setPreview(null); }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {previewLoading || !preview ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
                <span>Calculating total payout...</span>
              </div>
            ) : (
              <form onSubmit={handleConfirmSettlement} className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-200 text-sm">
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Employee:</span>
                    <span>{preview.employee_name}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>Settlement Cycle:</span>
                    <span className="uppercase font-mono">{preview.cycle}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>Unsettled Transactions:</span>
                    <span className="font-mono">{preview.transaction_count} entries</span>
                  </div>

                  {preview.performance_bonus_percentage !== undefined && (
                    <div className="flex justify-between text-emerald-700 text-xs font-semibold bg-emerald-50/80 p-2 rounded border border-emerald-200/60">
                      <span>Weekly Performance Score & Tier:</span>
                      <span>{preview.performance_score || 0}/100 pts ({preview.performance_bonus_percentage}% Bonus)</span>
                    </div>
                  )}

                  <hr className="my-2 border-gray-200" />

                  {/* Calculation Breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-700">
                      <span>Gross Order Earnings:</span>
                      <span className="font-medium text-emerald-600">+₹{(preview.gross_earnings || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Commission Due (Company Share):</span>
                      <span className="font-medium text-rose-600">-₹{Math.abs(preview.commission_due || 0).toFixed(2)}</span>
                    </div>
                    {preview.bonuses > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Bonuses & Incentives:</span>
                        <span className="font-medium text-emerald-600">+₹{preview.bonuses.toFixed(2)}</span>
                      </div>
                    )}
                    {preview.penalties < 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Penalties:</span>
                        <span className="font-medium text-rose-600">-₹{Math.abs(preview.penalties).toFixed(2)}</span>
                      </div>
                    )}
                    {preview.adjustments !== 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Manual Adjustments:</span>
                        <span className="font-medium">₹{preview.adjustments.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Work Items Itemized Breakdown */}
                  {renderWorkItemsBreakdown(preview.work_items, preview.performance_bonus_percentage)}

                  <hr className="my-2 border-gray-200" />

                  <div className="flex justify-between items-center text-base font-bold text-gray-900 pt-1">
                    <span>{preview.net_payable < 0 ? 'Net Recoverable from Agent:' : 'Net Payable Payout:'}</span>
                    <span className={`text-xl font-extrabold ${preview.net_payable < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{(preview.net_payable || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {preview.net_payable < 0 && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        Negative Net Balance (Debt Policy)
                      </div>
                      <p>
                        The agent owes <strong>₹{Math.abs(preview.net_payable).toFixed(2)}</strong> to the company.
                        By default, this balance <strong>carries forward</strong> to future cycles to be automatically deducted from future earnings.
                      </p>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settlementForm.allow_negative_recovery}
                          onChange={(e) => setSettlementForm(prev => ({ ...prev, allow_negative_recovery: e.target.checked }))}
                          className="mt-0.5 h-4 w-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                        />
                        <div className="text-xs text-rose-900 leading-tight">
                          <span className="font-semibold block mb-0.5">Confirm Offline Debt Recovery</span>
                          I confirm that this ₹{Math.abs(preview.net_payable).toFixed(2)} debt was collected from the agent offline, and authorize resetting the unsettled ledger to ₹0.
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Payment Reference # / TxID</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-987654321 or Chq #1029"
                    value={settlementForm.reference_number}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, reference_number: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes</label>
                  <textarea
                    rows="2"
                    placeholder="Optional settlement notes..."
                    value={settlementForm.notes}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedEmployeeId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingSettlement || (preview.net_payable < 0 && !settlementForm.allow_negative_recovery)}
                    className={preview.net_payable < 0
                      ? "bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-50"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"}
                  >
                    {submittingSettlement ? 'Processing...' : (preview.net_payable < 0 ? 'Confirm Debt Recovery Settlement' : 'Confirm & Save Settlement')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Printable Receipt View Modal */}
      {printableSettlement && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 space-y-5 shadow-2xl printable-area max-h-[92vh] flex flex-col">
            <div className="text-center border-b pb-4 shrink-0">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">SPADO CAR CARE</h2>
              <p className="text-xs text-gray-500 font-medium">Official Partner Settlement Receipt</p>
            </div>

            <div className="space-y-4 text-sm overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-lg border">
                <div>
                  <span className="text-gray-500 block">Receipt #:</span>
                  <span className="font-mono font-bold text-gray-900">{printableSettlement.reference_number || `#SETTLE-${printableSettlement.id}`}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block">Settlement Date:</span>
                  <span className="font-semibold">{new Date(printableSettlement.settled_at || printableSettlement.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="mt-1">
                  <span className="text-gray-500 block">Partner Name:</span>
                  <span className="font-bold text-gray-900">{printableSettlement.employee_name}</span>
                </div>
                <div className="text-right mt-1">
                  <span className="text-gray-500 block">Payout Cycle:</span>
                  <span className="uppercase font-semibold text-gray-800">{printableSettlement.cycle}</span>
                </div>
              </div>

              {printableSettlement.performance_bonus_percentage !== undefined && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between text-xs text-emerald-900 font-medium">
                  <span>Weekly Performance Score:</span>
                  <span className="font-bold">{printableSettlement.performance_score || 0} / 100 pts (+{printableSettlement.performance_bonus_percentage}% Bonus Tier)</span>
                </div>
              )}

              {/* Itemized Work Breakdown */}
              {renderWorkItemsBreakdown(
                printableSettlement.work_items,
                printableSettlement.performance_bonus_percentage
              )}

              {/* Financial Summary */}
              <div className="border-t border-b py-3 my-3 space-y-1.5 text-xs bg-gray-50/50 p-3 rounded-lg">
                <div className="flex justify-between text-gray-700">
                  <span>Gross Order Earnings:</span>
                  <span className="font-medium">₹{(printableSettlement.gross_earnings || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Commission Due (Company Share):</span>
                  <span className="font-medium text-rose-600">-₹{Math.abs(printableSettlement.commission_due || 0).toFixed(2)}</span>
                </div>
                {printableSettlement.bonuses > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Performance Bonuses & Incentives Total:</span>
                    <span>+₹{printableSettlement.bonuses.toFixed(2)}</span>
                  </div>
                )}
                {printableSettlement.penalties < 0 && (
                  <div className="flex justify-between text-rose-700 font-medium">
                    <span>Penalties:</span>
                    <span>-₹{Math.abs(printableSettlement.penalties).toFixed(2)}</span>
                  </div>
                )}
                {printableSettlement.adjustments !== 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Manual Adjustments:</span>
                    <span>₹{printableSettlement.adjustments.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t">
                  <span>NET PAID AMOUNT:</span>
                  <span className="text-emerald-600 text-lg">₹{(printableSettlement.net_payable || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t shrink-0 print:hidden">
              <Button variant="outline" onClick={() => setPrintableSettlement(null)}>
                Close
              </Button>
              <Button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Printer className="h-4 w-4" /> Print Official Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settlements;
