import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  PlusCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import walletService from '../services/walletService';
import employeeService from '../services/employeeService';

const EmployeeWallet = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    transaction_type: '',
    payment_method: '',
    settled: '',
    start_date: '',
    end_date: '',
    search: '',
  });

  // Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    transaction_type: 'BONUS',
    amount: '',
    description: '',
  });
  const [submittingManual, setSubmittingManual] = useState(false);

  const [searchParams] = useSearchParams();
  const urlEmployeeId = searchParams.get('employee_id');

  // Fetch employee list for selector
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getAllEmployees();
        const empList = data.employees || [];
        setEmployees(empList);
        if (urlEmployeeId) {
          setSelectedEmployeeId(urlEmployeeId);
        } else if (empList.length > 0) {
          setSelectedEmployeeId(empList[0].id.toString());
        }
      } catch (err) {
        toast.error('Failed to load employees');
      }
    };
    fetchEmployees();
  }, [urlEmployeeId]);

  // Fetch summary and transactions when employee or filters change
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch transactions
      const txData = await walletService.getWalletTransactions({
        employee_id: selectedEmployeeId || undefined,
        ...filters,
        page,
        per_page: 15,
      });

      setTransactions(txData.transactions || []);
      setTotalPages(txData.meta?.total_pages || 1);
      setTotalCount(txData.meta?.total_count || 0);

      // 2. If single employee selected, fetch specific summary
      if (selectedEmployeeId) {
        setSummaryLoading(true);
        const summaryData = await walletService.getEmployeeSummary(selectedEmployeeId);
        setSummary(summaryData.summary);
        setSummaryLoading(false);
      } else {
        setSummary(null);
      }
    } catch (err) {
      toast.error('Error fetching wallet data');
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId, filters, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.employee_id || !manualForm.amount || parseFloat(manualForm.amount) <= 0) {
      toast.error('Please enter valid employee and amount');
      return;
    }

    setSubmittingManual(true);
    try {
      await walletService.createManualTransaction({
        employee_id: parseInt(manualForm.employee_id),
        transaction_type: manualForm.transaction_type,
        amount: parseFloat(manualForm.amount),
        description: manualForm.description,
      });
      toast.success('Manual transaction created successfully');
      setIsManualModalOpen(false);
      setManualForm({
        employee_id: selectedEmployeeId || '',
        transaction_type: 'BONUS',
        amount: '',
        description: '',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0] || 'Failed to create transaction');
    } finally {
      setSubmittingManual(false);
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['ID', 'Date', 'Employee', 'Order #', 'Type', 'Payment Method', 'Amount (₹)', 'Running Balance (₹)', 'Description'];
    const rows = transactions.map(tx => [
      tx.id,
      new Date(tx.created_at).toLocaleString('en-IN'),
      tx.employee_name || '-',
      tx.order_number || '-',
      tx.transaction_type,
      tx.payment_method || '-',
      tx.amount,
      tx.balance_after,
      `"${(tx.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wallet_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" strokeWidth={1.5} />
            Employee Wallet & Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time immutable earnings ledger, commission splits & adjustments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setManualForm(prev => ({ ...prev, employee_id: selectedEmployeeId || (employees[0]?.id || '') }));
              setIsManualModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Manual Entry
          </Button>

          <Button
            variant="outline"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Employee Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <User className="h-5 w-5 text-gray-400" />
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Employee:</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => {
              setSelectedEmployeeId(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-64 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employee_number})
              </option>
            ))}
          </select>
        </div>

        {summary && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Cycle: <strong className="uppercase text-gray-900">{summary.settlement_cycle}</strong></span>
            <span>•</span>
            <span>Last Settled: <strong className="text-gray-900">{summary.last_settlement ? new Date(summary.last_settlement).toLocaleDateString('en-IN') : 'Never'}</strong></span>
            {summary.settlement_due && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Settlement Due
              </span>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {selectedEmployeeId && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Wallet Balance Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Total Wallet Balance</span>
              <Wallet className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              ₹{(summary.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400">Ledger derived balance</p>
          </div>

          {/* Pending Net Payable Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase tracking-wider">
              <span>Net Settlement Payable</span>
              <DollarSign className="h-4 w-4 text-primary-500" />
            </div>
            <div className={`text-3xl font-bold ${summary.net_payable >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ₹{(summary.net_payable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500">Unsettled balance due for payout</p>
          </div>

          {/* Earnings & Commission Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase tracking-wider">
              <span>Pending Earnings / Comm. Due</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">₹{(summary.pending_earnings || 0).toFixed(2)}</span>
              <span className="text-xs text-rose-500 font-semibold">(Comm. ₹{Math.abs(summary.commission_due || 0).toFixed(2)})</span>
            </div>
            <p className="text-xs text-gray-500">Order earnings minus company commission</p>
          </div>

          {/* Company Cash Pending Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase tracking-wider">
              <span>Company Cash Held</span>
              <TrendingDown className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-amber-600">
              ₹{(summary.company_cash_pending || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500">Cash collected from customers to deposit</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search description..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Transaction Type Filter */}
          <select
            value={filters.transaction_type}
            onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All Transaction Types</option>
            <option value="ORDER_EARNING">ORDER_EARNING</option>
            <option value="COMMISSION_DUE">COMMISSION_DUE</option>
            <option value="BONUS">BONUS</option>
            <option value="INCENTIVE">INCENTIVE</option>
            <option value="PENALTY">PENALTY</option>
            <option value="MANUAL_ADJUSTMENT">MANUAL_ADJUSTMENT</option>
            <option value="REFUND">REFUND</option>
            <option value="SETTLEMENT">SETTLEMENT</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={filters.payment_method}
            onChange={(e) => handleFilterChange('payment_method', e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All Payment Methods</option>
            <option value="upi">UPI / Company QR</option>
            <option value="cash">Cash (Agent Collected)</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
          </select>

          {/* Settlement Status Filter */}
          <select
            value={filters.settled}
            onChange={(e) => handleFilterChange('settled', e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All Settlement Statuses</option>
            <option value="no">Unsettled</option>
            <option value="yes">Settled</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">Ledger Transactions</h2>
          <span className="text-xs text-gray-500">Showing {transactions.length} of {totalCount} entries</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-primary-500" />
            <span>Loading ledger entries...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No transactions found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Order / Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-4 text-right">Credit (₹)</th>
                  <th className="py-3 px-4 text-right">Balance (₹)</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => {
                  const isCredit = tx.amount >= 0;
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap text-xs">
                        {new Date(tx.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                        {tx.employee_name || `Emp #${tx.employee_id}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-primary-600 whitespace-nowrap">
                        {tx.order_number ? `#${tx.order_number}` : tx.settlement_id ? `SETTLE-#${tx.settlement_id}` : '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.transaction_type === 'ORDER_EARNING' ? 'bg-emerald-100 text-emerald-800' :
                          tx.transaction_type === 'COMMISSION_DUE' ? 'bg-rose-100 text-rose-800' :
                            tx.transaction_type === 'COMPANY_CASH_RECEIVED' ? 'bg-amber-100 text-amber-800' :
                              tx.transaction_type === 'BONUS' || tx.transaction_type === 'INCENTIVE' ? 'bg-blue-100 text-blue-800' :
                                tx.transaction_type === 'PENALTY' ? 'bg-purple-100 text-purple-800' :
                                  tx.transaction_type === 'SETTLEMENT' ? 'bg-slate-100 text-slate-800' :
                                    'bg-gray-100 text-gray-800'
                          }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-gray-600 uppercase whitespace-nowrap">
                        {tx.payment_method || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-rose-600 whitespace-nowrap">
                        {!isCredit ? `₹${Math.abs(tx.amount).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600 whitespace-nowrap">
                        {isCredit ? `₹${tx.amount.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900 whitespace-nowrap">
                        ₹{(tx.balance_after || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs max-w-xs truncate" title={tx.description}>
                        {tx.description || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1 hover:bg-gray-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Add Manual Wallet Transaction</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Employee</label>
                <select
                  value={manualForm.employee_id}
                  onChange={(e) => setManualForm(prev => ({ ...prev, employee_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Transaction Type</label>
                <select
                  value={manualForm.transaction_type}
                  onChange={(e) => setManualForm(prev => ({ ...prev, transaction_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="BONUS">BONUS (+)</option>
                  <option value="INCENTIVE">INCENTIVE (+)</option>
                  <option value="PENALTY">PENALTY (-)</option>
                  <option value="MANUAL_ADJUSTMENT">MANUAL_ADJUSTMENT (+/-)</option>
                  <option value="REFUND">REFUND (+/-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={manualForm.amount}
                  onChange={(e) => setManualForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Reason for adjustment..."
                  value={manualForm.description}
                  onChange={(e) => setManualForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsManualModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingManual}
                >
                  {submittingManual ? 'Saving...' : 'Create Entry'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeWallet;
