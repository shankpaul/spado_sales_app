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
      setSettlementForm({ notes: '', reference_number: '' });
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
                      <td className="py-3.5 px-4 text-right font-bold text-base text-gray-900 whitespace-nowrap">
                        ₹{(emp.net_payable || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {emp.settlement_due ? (
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
                          onClick={() => handleOpenSettlementModal(emp.employee_id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                        >
                          Create Settlement
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
                          onClick={() => setPrintableSettlement(st)}
                          className="flex items-center gap-1 border-gray-300 text-xs"
                        >
                          <Printer className="h-3.5 w-3.5" /> Print Receipt
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center border-b pb-3">
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
              <form onSubmit={handleConfirmSettlement} className="space-y-4">
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

                  <hr className="my-2 border-gray-200" />

                  <div className="flex justify-between items-center text-base font-bold text-gray-900 pt-1">
                    <span>Net Payable Payout:</span>
                    <span className="text-xl text-emerald-600 font-extrabold">₹{(preview.net_payable || 0).toFixed(2)}</span>
                  </div>
                </div>

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
                    disabled={submittingSettlement}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {submittingSettlement ? 'Processing...' : 'Confirm & Save Settlement'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Print View Modal */}
      {printableSettlement && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 space-y-6 shadow-2xl printable-area">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">SPADO CAR CARE</h2>
              <p className="text-xs text-gray-500">Official Settlement Receipt</p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Receipt #:</span>
                <span className="font-mono font-bold">{printableSettlement.reference_number || `#SETTLE-${printableSettlement.id}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span>{new Date(printableSettlement.settled_at || printableSettlement.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Employee:</span>
                <span className="font-bold text-gray-900">{printableSettlement.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cycle:</span>
                <span className="uppercase">{printableSettlement.cycle}</span>
              </div>

              <div className="border-t border-b py-3 my-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Gross Earnings:</span>
                  <span>₹{(printableSettlement.gross_earnings || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Commission Due:</span>
                  <span>-₹{Math.abs(printableSettlement.commission_due || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-gray-900 pt-2 border-t">
                  <span>NET PAID:</span>
                  <span className="text-emerald-600">₹{(printableSettlement.net_payable || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 print:hidden">
              <Button variant="outline" onClick={() => setPrintableSettlement(null)}>
                Close
              </Button>
              <Button onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settlements;
