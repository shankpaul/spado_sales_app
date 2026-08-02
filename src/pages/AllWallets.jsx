import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Building2,
  CheckCircle2,
  Filter,
  ArrowRight,
  PlusCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import walletService from '../services/walletService';

const AllWallets = () => {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const data = await walletService.getAllWalletsSummary();
      setWallets(data.wallets || []);
    } catch (err) {
      toast.error('Failed to load employee wallets overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  // Filtered wallets based on search & filter inputs
  const filteredWallets = useMemo(() => {
    return wallets.filter(w => {
      const matchSearch = searchTerm === '' ||
        (w.employee_name && w.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (w.employee_number && w.employee_number.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCycle = cycleFilter === 'all' || w.settlement_cycle === cycleFilter;

      const matchDue = dueFilter === 'all' ||
        (dueFilter === 'due' && w.settlement_due) ||
        (dueFilter === 'not_due' && !w.settlement_due);

      return matchSearch && matchCycle && matchDue;
    });
  }, [wallets, searchTerm, cycleFilter, dueFilter]);

  // Aggregate stats across all wallets
  const totals = useMemo(() => {
    return wallets.reduce((acc, w) => {
      acc.totalBalance += w.wallet_balance || 0;
      acc.totalNetPayable += w.net_payable || 0;
      acc.totalPendingEarnings += w.pending_earnings || 0;
      acc.totalCommissionDue += Math.abs(w.commission_due || 0);
      acc.totalCashPending += w.company_cash_pending || 0;
      if (w.settlement_due) acc.dueCount += 1;
      return acc;
    }, {
      totalBalance: 0,
      totalNetPayable: 0,
      totalPendingEarnings: 0,
      totalCommissionDue: 0,
      totalCashPending: 0,
      dueCount: 0,
    });
  }, [wallets]);

  const handleOpenWallet = (employeeId) => {
    navigate(`/wallet?employee_id=${employeeId}`);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" strokeWidth={1.5} />
            All Employee Wallets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete overview of all employee balances, earnings, commissions & payouts in one shot
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchWallets}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={() => navigate('/wallet')}
            className="flex items-center gap-2"
          >
            Ledger View
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Aggregate Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase tracking-wider">
            <span>Total Active Wallets</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {wallets.length}
          </div>
          <p className="text-xs text-gray-500">Employees tracked</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Total System Balance</span>
            <Wallet className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            ₹{totals.totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400">Sum of all wallet balances</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase tracking-wider">
            <span>Total Net Payable</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">
            ₹{totals.totalNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-500">Unsettled payout due</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase tracking-wider">
            <span>Company Cash Held</span>
            <Building2 className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-amber-600">
            ₹{totals.totalCashPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-500">With employees to deposit</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase tracking-wider">
            <span>Settlements Due</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-3xl font-bold text-rose-600">
            {totals.dueCount}
          </div>
          <p className="text-xs text-gray-500">Employees due for payout</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Cycle Filter */}
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">All Cycles</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          {/* Due Status Filter */}
          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="due">Settlement Due</option>
            <option value="not_due">Up to date</option>
          </select>
        </div>
      </div>

      {/* All Wallets Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">All Employee Wallets List</h2>
          <span className="text-xs text-gray-500">Showing {filteredWallets.length} of {wallets.length} employees</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-primary-500" />
            <span>Loading employee wallets...</span>
          </div>
        ) : filteredWallets.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No employee wallets found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-4 text-right">Total Balance (₹)</th>
                  <th className="py-3 px-4 text-right">Pending Earnings</th>
                  <th className="py-3 px-4 text-right">Comm. Due</th>
                  <th className="py-3 px-4 text-right">Cash Held</th>
                  <th className="py-3 px-4 text-right font-bold text-gray-900">Net Payable (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredWallets.map((w) => (
                  <tr key={w.employee_id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-sm">
                          {w.employee_name ? w.employee_name[0].toUpperCase() : 'E'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{w.employee_name}</div>
                          <div className="text-xs text-gray-500 font-mono">{w.employee_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {w.settlement_cycle || 'monthly'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-gray-900 whitespace-nowrap">
                      ₹{(w.wallet_balance || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-medium whitespace-nowrap">
                      ₹{(w.pending_earnings || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-rose-600 font-medium whitespace-nowrap">
                      -₹{Math.abs(w.commission_due || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-amber-600 font-medium whitespace-nowrap">
                      ₹{(w.company_cash_pending || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-base whitespace-nowrap">
                      <span className={w.net_payable >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        ₹{(w.net_payable || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {w.settlement_due ? (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Due
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                          Up to date
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenWallet(w.employee_id)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View Wallet
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllWallets;
