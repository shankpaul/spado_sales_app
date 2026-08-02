import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  DollarSign,
  PlusCircle,
  RefreshCw,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import walletService from '../services/walletService';
import employeeService from '../services/employeeService';

const CashReconciliation = () => {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Receive Cash Modal State
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    employee_id: '',
    amount: '',
    remarks: '',
  });
  const [submittingReceive, setSubmittingReceive] = useState(false);

  useEffect(() => {
    const fetchEmps = async () => {
      try {
        const data = await employeeService.getAllEmployees();
        setEmployees(data.employees || []);
      } catch (err) {
        toast.error('Failed to load employees');
      }
    };
    fetchEmps();
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await walletService.getCashReconciliation({
        employee_id: selectedEmployeeId || undefined,
        page,
        per_page: 15,
      });
      setRecords(data.records || []);
      setTotalPages(data.meta?.total_pages || 1);
    } catch (err) {
      toast.error('Failed to load cash reconciliation history');
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId, page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleReceiveCashSubmit = async (e) => {
    e.preventDefault();
    if (!receiveForm.employee_id || !receiveForm.amount || parseFloat(receiveForm.amount) <= 0) {
      toast.error('Please enter a valid employee and amount');
      return;
    }

    setSubmittingReceive(true);
    try {
      await walletService.receiveCompanyCash({
        employee_id: parseInt(receiveForm.employee_id),
        amount: parseFloat(receiveForm.amount),
        remarks: receiveForm.remarks,
      });
      toast.success('Company cash received and recorded successfully!');
      setIsReceiveModalOpen(false);
      setReceiveForm({ employee_id: '', amount: '', remarks: '' });
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0] || 'Failed to record received cash');
    } finally {
      setSubmittingReceive(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" strokeWidth={1.5} />
            Company Cash Reconciliation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track customer cash payments held by employees & record company cash deposits
          </p>
        </div>

        <Button
          onClick={() => {
            setReceiveForm(prev => ({ ...prev, employee_id: selectedEmployeeId || (employees[0]?.id || '') }));
            setIsReceiveModalOpen(true);
          }}
          className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Receive Company Cash
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <User className="h-5 w-5 text-gray-400" />
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter Employee:</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => {
              setSelectedEmployeeId(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-64 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_number})</option>
            ))}
          </select>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchRecords}
          className="text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Cash Records Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Cash Collection Ledger</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
            <span>Loading cash collection records...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No cash reconciliation entries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4 text-right">Cash Received (₹)</th>
                  <th className="py-3 px-4 text-right">Employee Share</th>
                  <th className="py-3 px-4 text-right">Company Share</th>
                  <th className="py-3 px-4 text-right">Cash Deposited</th>
                  <th className="py-3 px-4 text-right font-bold text-gray-900">Remaining Pending (₹)</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((r) => {
                  const isFullyCleared = r.remaining_company_cash === 0;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 text-gray-600 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                        {r.employee_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-primary-600 whitespace-nowrap">
                        {r.order_number ? `#${r.order_number}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        ₹{(r.cash_received || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                        ₹{(r.employee_share || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700 font-medium">
                        ₹{(r.company_share || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-600 font-medium">
                        ₹{(r.company_cash_received || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                        <span className={isFullyCleared ? 'text-emerald-600' : 'text-amber-600'}>
                          ₹{(r.remaining_company_cash || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate" title={r.remarks}>
                        {r.remarks || '-'}
                      </td>
                    </tr>
                  );
                })}
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

      {/* Receive Cash Modal */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Record Company Cash Received</h3>
            <form onSubmit={handleReceiveCashSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Employee</label>
                <select
                  value={receiveForm.employee_id}
                  onChange={(e) => setReceiveForm(prev => ({ ...prev, employee_id: e.target.value }))}
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
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={receiveForm.amount}
                  onChange={(e) => setReceiveForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Remarks / Note</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Deposited cash at office counter..."
                  value={receiveForm.remarks}
                  onChange={(e) => setReceiveForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReceiveModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReceive}
                  className="bg-amber-600 text-white hover:bg-amber-700 font-semibold"
                >
                  {submittingReceive ? 'Recording...' : 'Record Cash Received'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashReconciliation;
