import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  PlusCircle,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  AlertCircle,
  XCircle,
  ShieldCheck,
  CreditCard,
  Building,
  FileText,
  Filter
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import walletService from '../services/walletService';
import employeeService from '../services/employeeService';
import useAuthStore from '../store/authStore';

const CashDeposits = () => {
  const { user } = useAuthStore();
  const isAdminOrAccountant = user?.role === 'admin' || user?.role === 'accountant' || user?.role === 0 || user?.role === 3;

  const [deposits, setDeposits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' (all), 'unverified', 'verified', 'rejected'

  // Modal State for New Deposit Entry
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({
    employee_id: '',
    payment_method: 'cash',
    amount: '',
    transaction_date: '',
    transaction_number: '',
    remarks: ''
  });
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  // Verification / Rejection Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'verify', // 'verify' or 'reject'
    deposit: null,
    remarks: '',
    submitting: false
  });

  // Fetch employees list
  useEffect(() => {
    const fetchEmps = async () => {
      try {
        const data = await employeeService.getAllEmployees();
        setEmployees(data.employees || []);
      } catch (err) {
        console.error('Failed to load employees', err);
      }
    };
    fetchEmps();
  }, []);

  // Fetch deposits history
  const fetchDeposits = useCallback(async () => {
    setLoading(true);
    try {
      const data = await walletService.getCashDeposits({
        employee_id: selectedEmployeeId || undefined,
        status: statusFilter || undefined,
        page,
        per_page: 15,
      });
      setDeposits(data.deposits || []);
      setTotalPages(data.meta?.total_pages || 1);
      setTotalCount(data.meta?.total_count || 0);
    } catch (err) {
      toast.error('Failed to load company cash deposits');
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId, statusFilter, page]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  // Handle deposit form submission
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!isAdminOrAccountant && !depositForm.employee_id && user?.employee_id) {
      depositForm.employee_id = user.employee_id;
    }

    if (isAdminOrAccountant && !depositForm.employee_id) {
      toast.error('Please select an employee');
      return;
    }

    if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setSubmittingDeposit(true);
    try {
      const payload = {
        employee_id: depositForm.employee_id ? parseInt(depositForm.employee_id, 10) : undefined,
        payment_method: depositForm.payment_method || 'cash',
        amount: parseFloat(depositForm.amount),
        transaction_date: depositForm.transaction_date || undefined,
        transaction_number: depositForm.transaction_number || undefined,
        remarks: depositForm.remarks || undefined
      };

      const res = await walletService.createCashDeposit(payload);
      toast.success(res.message || 'Deposit entry recorded successfully');
      setIsDepositModalOpen(false);
      setDepositForm({
        employee_id: '',
        payment_method: 'cash',
        amount: '',
        transaction_date: '',
        transaction_number: '',
        remarks: ''
      });
      fetchDeposits();
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0] || 'Failed to record cash deposit');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Handle Admin Confirmation (Verify or Reject)
  const handleConfirmAction = async () => {
    if (!confirmModal.deposit) return;
    setConfirmModal(prev => ({ ...prev, submitting: true }));

    try {
      if (confirmModal.type === 'verify') {
        const res = await walletService.verifyCashDeposit(confirmModal.deposit.id, {
          remarks: confirmModal.remarks
        });
        toast.success(res.message || 'Deposit verified and applied to wallet!');
      } else {
        const res = await walletService.rejectCashDeposit(confirmModal.deposit.id, {
          remarks: confirmModal.remarks
        });
        toast.info(res.message || 'Deposit entry rejected');
      }

      setConfirmModal({ isOpen: false, type: 'verify', deposit: null, remarks: '', submitting: false });
      fetchDeposits();
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0] || `Failed to ${confirmModal.type} deposit entry`);
      setConfirmModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Stats calculation
  const unverifiedCount = deposits.filter(d => d.status === 'unverified').length;
  const unverifiedSum = deposits.filter(d => d.status === 'unverified').reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-emerald-600" strokeWidth={1.5} />
            Company Cash Handovers & Verification
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track agent cash deposits, verify handover payments, and auto-adjust wallet ledgers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsDepositModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Record Handover / Deposit
          </Button>

          <Button
            onClick={fetchDeposits}
            variant="outline"
            className="text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Unverified Deposits</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              ₹{unverifiedSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-amber-600/80 mt-1 font-medium">
              {unverifiedCount} entry awaiting verification
            </p>
          </div>
          <div className="p-3.5 bg-amber-50 rounded-2xl text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Entries (Filtered)</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Across all payment channels</p>
          </div>
          <div className="p-3.5 bg-indigo-50 rounded-2xl text-indigo-600">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Verification Status</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">Auto Ledger</h3>
            <p className="text-xs text-emerald-600/80 mt-1">Wallet updates upon verification</p>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filters & Tabs Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: '', label: 'All Deposits' },
            { id: 'unverified', label: 'Unverified', count: unverifiedCount },
            { id: 'verified', label: 'Verified' },
            { id: 'rejected', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`flex-1 md:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-bold animate-pulse">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Employee Dropdown Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedEmployeeId}
            onChange={e => {
              setSelectedEmployeeId(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium"
          >
            <option value="">All Employees / Agents</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employee_number})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Employee / Agent</th>
                <th className="py-3.5 px-4">Method & Ref No.</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Submitted By</th>
                <th className="py-3.5 px-4">Remarks</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading cash deposit history...
                  </td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No cash deposit entries found for the selected filters.
                  </td>
                </tr>
              ) : (
                deposits.map(deposit => (
                  <tr key={deposit.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {new Date(deposit.transaction_date || deposit.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {new Date(deposit.transaction_date || deposit.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{deposit.employee_name || '—'}</div>
                      {deposit.employee_number && (
                        <div className="text-[10px] text-slate-400">{deposit.employee_number}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="capitalize font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] inline-block mb-0.5">
                        {deposit.payment_method || 'cash'}
                      </span>
                      {deposit.transaction_number && (
                        <span className="block text-[10px] text-slate-500 font-mono">
                          Ref: {deposit.transaction_number}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm whitespace-nowrap">
                      ₹{deposit.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4">
                      {deposit.status === 'unverified' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Unverified
                        </span>
                      )}
                      {deposit.status === 'verified' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Verified
                        </span>
                      )}
                      {deposit.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                          <XCircle className="h-3 w-3 text-rose-600" />
                          Rejected
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{deposit.created_by_name || 'System User'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={deposit.remarks}>
                      {deposit.remarks || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {deposit.status === 'unverified' && isAdminOrAccountant ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          <Button
                            size="sm"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                type: 'verify',
                                deposit,
                                remarks: '',
                                submitting: false
                              })
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2.5 py-1 h-7 rounded-lg shadow-sm"
                          >
                            Verify & Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                type: 'reject',
                                deposit,
                                remarks: '',
                                submitting: false
                              })
                            }
                            className="text-rose-600 border-rose-200 hover:bg-rose-50 text-[11px] px-2.5 py-1 h-7 rounded-lg"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          {deposit.status === 'verified' && deposit.verified_by_name ? `Verified by ${deposit.verified_by_name}` : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page <span className="font-semibold text-slate-700">{page}</span> of{' '}
              <span className="font-semibold text-slate-700">{totalPages}</span> ({totalCount} total)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(prev => prev - 1)}
                className="h-8 px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(prev => prev + 1)}
                className="h-8 px-3"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Record Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Record Company Cash Handover</h3>
                  <p className="text-xs text-slate-500">
                    {isAdminOrAccountant
                      ? 'Record company cash received from employee (auto-verifies).'
                      : 'Submit cash handover details for admin verification.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              {isAdminOrAccountant && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee / Agent <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={depositForm.employee_id}
                    onChange={e => setDepositForm({ ...depositForm, employee_id: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={depositForm.payment_method}
                    onChange={e => setDepositForm({ ...depositForm, payment_method: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="cash">Cash Handover</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 1000"
                    value={depositForm.amount}
                    onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={depositForm.transaction_date}
                    onChange={e => setDepositForm({ ...depositForm, transaction_date: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / Transaction No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR / URN / Cheque No."
                    value={depositForm.transaction_number}
                    onChange={e => setDepositForm({ ...depositForm, transaction_number: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Additional payment reference or handover notes..."
                  value={depositForm.remarks}
                  onChange={e => setDepositForm({ ...depositForm, remarks: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="rounded-xl px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingDeposit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5 py-2 shadow-md"
                >
                  {submittingDeposit ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Deposit Entry'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Admin Verification/Rejection */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div
                className={`p-3 rounded-xl ${
                  confirmModal.type === 'verify' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}
              >
                {confirmModal.type === 'verify' ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {confirmModal.type === 'verify' ? 'Confirm & Verify Cash Deposit' : 'Reject Cash Deposit Entry'}
                </h3>
                <p className="text-xs text-slate-500">
                  Employee: <span className="font-semibold">{confirmModal.deposit?.employee_name}</span> | Amount: ₹
                  {confirmModal.deposit?.amount}
                </p>
              </div>
            </div>

            {confirmModal.type === 'verify' && (
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                Verifying this entry will automatically clear the agent's pending cash liability and credit the wallet ledger.
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Note / Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder={confirmModal.type === 'verify' ? 'Verified with bank receipt...' : 'Reason for rejection...'}
                value={confirmModal.remarks}
                onChange={e => setConfirmModal({ ...confirmModal, remarks: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmModal({ isOpen: false, type: 'verify', deposit: null, remarks: '', submitting: false })}
                className="rounded-xl text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                disabled={confirmModal.submitting}
                onClick={handleConfirmAction}
                className={`text-white font-semibold rounded-xl text-xs px-5 py-2 ${
                  confirmModal.type === 'verify' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmModal.submitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : confirmModal.type === 'verify' ? (
                  'Confirm Verification'
                ) : (
                  'Confirm Rejection'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashDeposits;
