import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';
import employeeService from '../services/employeeService';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  UserCheck,
  UserX,
  Briefcase,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  MoreVertical,
  Eye,
  Mail,
  User,
  BoltIcon,
  CogIcon,
  IdCardLanyard,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Badge2 } from '../components/ui/badge2';
import LetterAvatar from '../components/LetterAvatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import EmployeeForm from '../components/EmployeeForm';
import PartnerScoreHistoryDialog from '../components/PartnerScoreHistoryDialog';

/**
 * Employees Management Page (Admin Only)
 * Manages employee records with full CRUD operations
 */
const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [schemeFilter, setSchemeFilter] = useState('all');

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [employeeToDeactivate, setEmployeeToDeactivate] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Partner Score History Dialog State (Agents only)
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);

  // Helper to determine if employee has an agent/commission partner role
  const isAgentEmployee = (emp) => {
    if (!emp) return false;
    const role = emp.user?.role?.toLowerCase() || '';
    const scheme = typeof emp.scheme === 'string' ? emp.scheme.toLowerCase() : emp.scheme;
    const jobTitle = emp.job_title?.toLowerCase() || '';
    return (
      role === 'agent' ||
      scheme === 'commission' ||
      scheme === 1 ||
      jobTitle.includes('agent') ||
      jobTitle.includes('partner')
    );
  };

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (schemeFilter !== 'all') filters.scheme = schemeFilter;

      const response = await employeeService.getAllEmployees(filters);
      setEmployees(response.employees || response || []);
    } catch (error) {
      toast.error('Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter, schemeFilter]);

  // Filter employees based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(
        (employee) =>
          employee.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.contact_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  // Handle add employee
  const handleAdd = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

  // Handle view details
  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setIsDetailsOpen(true);
  };

  // Handle edit employee
  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };

  // Handle delete confirm
  const handleDeleteClick = (employee) => {
    setSelectedEmployee(employee);
    setIsDeleteOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await employeeService.deleteEmployee(selectedEmployee.id);
      toast.success('Employee deleted successfully');
      fetchEmployees();
      setIsDeleteOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete employee');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle activate/deactivate
  const handleToggleStatus = (employee) => {
    const isActive =
      employee.status === 'active' ||
      employee.status === 0 ||
      employee.status === '0';

    if (isActive) {
      setEmployeeToDeactivate(employee);
      setIsDeactivateOpen(true);
      return;
    }

    // Direct activation
    handleActivate(employee);
  };

  // Direct activation handler
  const handleActivate = async (employee) => {
    setActionLoading(true);
    try {
      await employeeService.activateEmployee(employee.id);
      toast.success('Employee activated successfully');
      fetchEmployees();
      if (selectedEmployee && selectedEmployee.id === employee.id) {
        setSelectedEmployee((prev) =>
          prev ? { ...prev, status: 'active' } : null
        );
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to activate employee');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm deactivation handler
  const handleConfirmDeactivate = async () => {
    if (!employeeToDeactivate) return;
    setActionLoading(true);
    try {
      await employeeService.deactivateEmployee(employeeToDeactivate.id);
      toast.success('Employee deactivated successfully');
      fetchEmployees();
      if (selectedEmployee && selectedEmployee.id === employeeToDeactivate.id) {
        setSelectedEmployee((prev) =>
          prev ? { ...prev, status: 'inactive' } : null
        );
      }
      setIsDeactivateOpen(false);
      setEmployeeToDeactivate(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to deactivate employee');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle form submit
  const handleFormSubmit = async (employeeData) => {
    try {
      if (selectedEmployee) {
        await employeeService.updateEmployee(selectedEmployee.id, employeeData);
        toast.success('Employee updated successfully');
      } else {
        await employeeService.createEmployee(employeeData);
        toast.success('Employee created successfully');
      }
      fetchEmployees();
      setIsFormOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      throw error;
    }
  };

  // Get scheme badge color
  const getSchemeBadgeColor = (scheme) => {
    const s = String(scheme ?? '').toLowerCase();
    return (s === 'salary' || s === '0' || s.includes('sal'))
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  };

  // Get scheme label
  const getSchemeLabel = (scheme) => {
    const s = String(scheme ?? '').toLowerCase();
    return (s === 'salary' || s === '0' || s.includes('sal'))
      ? 'Fixed Salary'
      : 'Commission Based';
  };

  // Check if scheme is salary
  const isSalaryScheme = (scheme) => {
    if (scheme === 0 || scheme === '0') return true;
    if (typeof scheme === 'string') return scheme.toLowerCase().includes('sal');
    return scheme !== 1 && scheme !== '1' && scheme !== 'commission';
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <IdCardLanyard className="h-8 w-8 text-primary" strokeWidth={1.5} />
            Employees
          </h1>
          <p className="text-gray-600 mt-1">Manage employee records and compensation</p>
        </div>
        <Button onClick={handleAdd} className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="sticky top-0 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by employee number, name, job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 bg-white border-gray-200 shadow-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-white border-gray-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resigned">Resigned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={schemeFilter} onValueChange={setSchemeFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-white border-gray-200">
            <SelectValue placeholder="Scheme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schemes</SelectItem>
            <SelectItem value="salary">Fixed Salary</SelectItem>
            <SelectItem value="commission">Commission</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employees List */}
      {loading ? (
        <>
          {/* Desktop Loading */}
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Compensation</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Loading */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 space-y-3 bg-white">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Desktop View - Table */}
          <div className="hidden md:block">
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Compensation</TableHead>
                    <TableHead>Settlement Cycle</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500 bg-white">
                        No employees found matching the filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow
                        key={employee.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleViewDetails(employee)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {employee.name ? employee.name[0].toUpperCase() : 'E'}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{employee.name}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {employee.job_title || 'No Title'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              employee.status === 'active'
                                ? 'bg-green-50 text-green-700 hover:bg-green-50 border-green-200'
                                : 'bg-red-50 text-red-700 hover:bg-red-50 border-red-200'
                            }
                          >
                            {employee.status === 'active' ? 'Active' : 'Resigned'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize font-medium text-gray-700">
                            {getSchemeLabel(employee.scheme)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {isSalaryScheme(employee.scheme) ? (
                              <div className="font-medium text-gray-900">
                                {formatCurrency(employee.fixed_salary)}/mo
                              </div>
                            ) : (
                              <div className="text-sm font-medium text-gray-900">
                                {employee.commission_percentage}% Comm.
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {isSalaryScheme(employee.scheme) ? (
                                <>Work: {employee.work_incentive_percentage}% | 5★: {employee.five_star_incentive_percentage}%</>
                              ) : (
                                <>5★ Inc.: {employee.five_star_incentive_percentage}%</>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="uppercase font-mono text-xs bg-slate-50 border-slate-200">
                              {employee.settlement_cycle || 'monthly'}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              Last: {employee.last_settlement_at ? new Date(employee.last_settlement_at).toLocaleDateString('en-IN') : 'Never'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-gray-600">
                            {employee.contact_number && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {employee.contact_number}
                              </div>
                            )}
                            {employee.user && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Mail className="h-3 w-3" />
                                {employee.user.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {isAgentEmployee(employee) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-800 flex items-center gap-1 font-medium"
                                onClick={() => {
                                  setHistoryEmployee(employee);
                                  setHistoryModalOpen(true);
                                }}
                                title="View Weekly Partner Score History"
                              >
                                <Award className="h-3.5 w-3.5 text-blue-600" />
                                Score History
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border border-gray-150 rounded-xl shadow-md">
                                {isAgentEmployee(employee) && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setHistoryEmployee(employee);
                                      setHistoryModalOpen(true);
                                    }}
                                    className="cursor-pointer hover:bg-blue-50 text-blue-700 font-medium"
                                  >
                                    <Award className="mr-2 h-4 w-4 text-blue-600" />
                                    Partner Score History
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(employee)}
                                  className="cursor-pointer hover:bg-gray-50"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(employee)}
                                className="cursor-pointer hover:bg-gray-50"
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit Employee
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(employee)}
                                className="cursor-pointer hover:bg-gray-50"
                              >
                                {employee.status === 'active' ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4 text-red-600" />
                                    <span className="text-red-600">Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                                    <span className="text-green-600">Activate</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(employee)}
                                className="text-red-600 focus:text-red-600 cursor-pointer hover:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile View - Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredEmployees.length === 0 ? (
              <Card className="p-8 text-center text-gray-500 bg-white">
                No employees found matching the filters.
              </Card>
            ) : (
              filteredEmployees.map((employee) => (
                <Card
                  key={employee.id}
                  className="p-4 space-y-4 cursor-pointer hover:shadow-md transition-shadow bg-white border border-gray-200"
                  onClick={() => handleViewDetails(employee)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {employee.name ? employee.name[0].toUpperCase() : 'E'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {employee.job_title || 'No Title'}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={
                        employee.status === 'active'
                          ? 'bg-green-50 text-green-700 hover:bg-green-50 border-green-200'
                          : 'bg-red-50 text-red-700 hover:bg-red-50 border-red-200'
                      }
                    >
                      {employee.status === 'active' ? 'Active' : 'Resigned'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Scheme</span>
                      <span className="capitalize font-medium text-gray-800">
                        {getSchemeLabel(employee.scheme)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Compensation</span>
                      <span className="font-medium text-gray-800">
                        {isSalaryScheme(employee.scheme)
                          ? `${formatCurrency(employee.fixed_salary)}/mo`
                          : `${employee.commission_percentage}% Comm.`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      {isSalaryScheme(employee.scheme) ? (
                        <>Work: {employee.work_incentive_percentage}% | 5★: {employee.five_star_incentive_percentage}%</>
                      ) : (
                        <>5★ Inc.: {employee.five_star_incentive_percentage}%</>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isAgentEmployee(employee) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-blue-700 hover:bg-blue-50 flex items-center gap-1 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistoryEmployee(employee);
                            setHistoryModalOpen(true);
                          }}
                        >
                          <Award className="h-3.5 w-3.5 text-blue-600" />
                          History
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(employee);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Employee Form Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full p-0">
          {/* Fixed Header */}
          <div className="px-6 py-5 border-b border-gray-100 shrink-0 bg-white">
            <SheetHeader className="space-y-1 pr-8 text-left">
              <SheetTitle className="text-xl font-bold text-gray-900">
                {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
              </SheetTitle>
              <SheetDescription className="text-sm text-gray-500">
                {selectedEmployee
                  ? 'Update employee information and compensation details'
                  : 'Add a new employee to the system'}
              </SheetDescription>
            </SheetHeader>
          </div>

          {/* Form with Scrollable Body and Fixed Footer */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <EmployeeForm
              key={selectedEmployee?.id || 'new'}
              employee={selectedEmployee}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedEmployee(null);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Employee Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col bg-white">
          {selectedEmployee && (
            <>
              {/* Pinned Fixed Header */}
              <DialogHeader className="px-6 py-4.5 border-b border-gray-100 bg-slate-50/80 backdrop-blur-sm shrink-0 pr-14 text-left">
                <div className="flex items-center gap-3.5">
                  <LetterAvatar
                    name={selectedEmployee.name || selectedEmployee.employee_number}
                    size="lg"
                    className="h-12 w-12 text-base font-bold shadow-xs ring-2 ring-white shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <DialogTitle className="text-lg font-bold text-gray-900 truncate">
                        {selectedEmployee.name || 'Unnamed Employee'}
                      </DialogTitle>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-gray-700 border border-gray-200 shadow-2xs">
                        #{selectedEmployee.employee_number}
                      </span>
                      <Badge2
                        variant={
                          selectedEmployee.status === 'active' || selectedEmployee.status === 0 || selectedEmployee.status === '0'
                            ? 'success'
                            : 'secondary'
                        }
                      >
                        {selectedEmployee.status === 'active' || selectedEmployee.status === 0 || selectedEmployee.status === '0'
                          ? 'Active'
                          : 'Inactive'}
                      </Badge2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      {selectedEmployee.job_title && (
                        <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                          <Briefcase className="h-3 w-3 text-gray-400" />
                          {selectedEmployee.job_title}
                        </span>
                      )}
                      {selectedEmployee.job_title && <span className="text-gray-300">•</span>}
                      <Badge2
                        variant={isSalaryScheme(selectedEmployee.scheme) ? 'info' : 'amber'}
                        className="text-[11px] py-0 px-2"
                      >
                        {getSchemeLabel(selectedEmployee.scheme)}
                      </Badge2>
                      {selectedEmployee.settlement_cycle && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="uppercase font-mono text-[10px] text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-2xs">
                            {selectedEmployee.settlement_cycle} cycle
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <DialogDescription className="sr-only">
                  Employee profile and compensation details for {selectedEmployee.name || selectedEmployee.employee_number}
                </DialogDescription>
              </DialogHeader>

              {/* Scrollable Dialog Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-145px)] space-y-4 text-sm bg-gray-50/40">
                {/* Employment Information Card */}
                <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Employment Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500 block mb-0.5">Full Name</span>
                      <span className="font-semibold text-gray-900 text-sm">{selectedEmployee.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Employee ID</span>
                      <span className="font-mono font-medium text-gray-900 text-sm">{selectedEmployee.employee_number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Job Designation</span>
                      <span className="font-medium text-gray-900 text-sm">{selectedEmployee.job_title || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Joining Date</span>
                      <span className="font-medium text-gray-900 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {selectedEmployee.joining_date
                          ? new Date(selectedEmployee.joining_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </span>
                    </div>
                    {selectedEmployee.resignation_date && (
                      <div>
                        <span className="text-gray-500 block mb-0.5">Resignation Date</span>
                        <span className="font-medium text-red-600 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-red-400" />
                          {new Date(selectedEmployee.resignation_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 block mb-0.5">Settlement Cycle</span>
                      <span className="capitalize font-medium text-gray-900">
                        {selectedEmployee.settlement_cycle || 'Monthly'}
                      </span>
                    </div>
                    {selectedEmployee.last_settlement_at && (
                      <div>
                        <span className="text-gray-500 block mb-0.5">Last Settlement</span>
                        <span className="font-medium text-gray-700">
                          {new Date(selectedEmployee.last_settlement_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compensation & Incentives Card */}
                <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      Compensation & Incentives
                    </h3>
                    <Badge2 variant={isSalaryScheme(selectedEmployee.scheme) ? 'info' : 'amber'}>
                      {getSchemeLabel(selectedEmployee.scheme)}
                    </Badge2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {isSalaryScheme(selectedEmployee.scheme) ? (
                      <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                        <span className="text-blue-700/80 block text-[11px] font-medium mb-0.5">Fixed Base Salary</span>
                        <span className="text-base font-bold text-blue-900">
                          {formatCurrency(selectedEmployee.fixed_salary)}
                          <span className="text-xs font-normal text-blue-700/70">/mo</span>
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                        <span className="text-amber-800/80 block text-[11px] font-medium mb-0.5">Commission Rate</span>
                        <span className="text-base font-bold text-amber-900">
                          {selectedEmployee.commission_percentage || 0}%
                        </span>
                      </div>
                    )}

                    {isSalaryScheme(selectedEmployee.scheme) && Boolean(selectedEmployee.work_incentive_percentage) && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                        <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Work Incentive</span>
                        <span className="text-base font-bold text-gray-900">
                          {selectedEmployee.work_incentive_percentage}%
                        </span>
                      </div>
                    )}

                    {Boolean(selectedEmployee.five_star_incentive_percentage) && (
                      <div className="p-3 bg-amber-50/40 rounded-lg border border-amber-100">
                        <span className="text-amber-800/80 block text-[11px] font-medium mb-0.5">5-Star Incentive</span>
                        <span className="text-base font-bold text-amber-900">
                          {selectedEmployee.five_star_incentive_percentage}%
                        </span>
                      </div>
                    )}

                    {((isSalaryScheme(selectedEmployee.scheme) && selectedEmployee.work_incentive_percentage) || selectedEmployee.five_star_incentive_percentage) && (
                      <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                        <span className="text-indigo-700/80 block text-[11px] font-medium mb-0.5">Total Incentive</span>
                        <span className="text-base font-bold text-indigo-900">
                          {isSalaryScheme(selectedEmployee.scheme)
                            ? selectedEmployee.total_incentive_percentage
                            : selectedEmployee.five_star_incentive_percentage}%
                        </span>
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                      <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Monthly Target</span>
                      <span className="text-base font-bold text-gray-900">
                        {formatCurrency(selectedEmployee.monthly_target_amount)}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                      <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Travelling Allowance</span>
                      <span className="text-base font-bold text-blue-700">
                        ₹{selectedEmployee.travelling_allowance || 0}
                        <span className="text-xs font-normal text-gray-500">/km</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact & Linked Account Card */}
                <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-blue-600" />
                      Contact & System Account
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500 block mb-1">Phone Number</span>
                      {selectedEmployee.contact_number ? (
                        <a
                          href={`tel:${selectedEmployee.contact_number}`}
                          className="inline-flex items-center gap-1.5 font-semibold text-sm text-primary hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5 text-primary" />
                          {selectedEmployee.contact_number}
                        </a>
                      ) : (
                        <span className="text-gray-400 font-medium">Not provided</span>
                      )}
                    </div>

                    {selectedEmployee.user ? (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 sm:col-span-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-gray-500" />
                            Linked Spado User
                          </span>
                          <Badge2 variant="outline" className="capitalize text-[11px]">
                            {selectedEmployee.user.role?.replace('_', ' ') || 'User'}
                          </Badge2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-gray-500 block">Name</span>
                            <span className="font-medium text-gray-900">{selectedEmployee.user.name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Email</span>
                            <a href={`mailto:${selectedEmployee.user.email}`} className="font-medium text-primary hover:underline truncate block">
                              {selectedEmployee.user.email || '-'}
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="sm:col-span-2 text-xs text-gray-400 italic">
                        No linked Spado user account for this employee.
                      </div>
                    )}
                  </div>
                </div>

                {/* Partner Performance History Banner (Agents Only) */}
                {isAgentEmployee(selectedEmployee) && (
                  <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/70 rounded-xl border border-blue-200/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-semibold text-blue-900 text-sm">
                        <Award className="h-4 w-4 text-blue-600" />
                        Weekly Partner Performance
                      </div>
                      <p className="text-xs text-blue-700/85">
                        Review weekly scorecard, completed orders, 5-star ratings, and incentive history.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 font-medium shadow-xs"
                      onClick={() => {
                        setHistoryEmployee(selectedEmployee);
                        setHistoryModalOpen(true);
                      }}
                    >
                      <Award className="h-3.5 w-3.5 mr-1.5" />
                      View Score History
                    </Button>
                  </div>
                )}
              </div>

              {/* Pinned Fixed Footer */}
              <DialogFooter className="px-6 py-3.5 border-t border-gray-200 bg-white shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full sm:w-auto"
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleDeleteClick(selectedEmployee);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete Employee
                  </Button>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDetailsOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleToggleStatus(selectedEmployee)}
                    className={
                      selectedEmployee.status === 'active' || selectedEmployee.status === 0 || selectedEmployee.status === '0'
                        ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200'
                        : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200'
                    }
                  >
                    {selectedEmployee.status === 'active' || selectedEmployee.status === 0 || selectedEmployee.status === '0' ? (
                      <>
                        <UserX className="h-3.5 w-3.5 mr-1.5" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleEdit(selectedEmployee);
                    }}
                    className="bg-primary hover:bg-primary/90 text-white shadow-xs"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Edit Employee
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete employee {selectedEmployee?.employee_number}
              {selectedEmployee?.job_title && ` (${selectedEmployee.job_title})`}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <AlertDialogContent className="z-[60]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
                <div className="text-xs text-gray-500 font-mono mt-0.5">
                  {employeeToDeactivate?.name ? `${employeeToDeactivate.name} • ` : ''}#{employeeToDeactivate?.employee_number}
                </div>
              </div>
            </div>
            <AlertDialogDescription className="text-sm text-gray-600 pt-2">
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-gray-900">
                {employeeToDeactivate?.name || employeeToDeactivate?.employee_number}
              </span>
              ? They will no longer be able to log in or be assigned to active tasks and schedules until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel
              disabled={actionLoading}
              onClick={() => setEmployeeToDeactivate(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate Employee'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Partner Score History Dialog (Agent / Commission Partners) */}
      <PartnerScoreHistoryDialog
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        employee={historyEmployee}
      />
    </div>
  );
};

export default Employees;
