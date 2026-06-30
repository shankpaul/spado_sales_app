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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import EmployeeForm from '../components/EmployeeForm';

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
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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
  const handleToggleStatus = async (employee) => {
    try {
      if (employee.status === 'active') {
        await employeeService.deactivateEmployee(employee.id);
        toast.success('Employee deactivated successfully');
      } else {
        await employeeService.activateEmployee(employee.id);
        toast.success('Employee activated successfully');
      }
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to update employee status');
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
    return scheme === 'salary'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  };

  // Get scheme label
  const getSchemeLabel = (scheme) => {
    return scheme === 'salary' ? 'Fixed Salary' : 'Commission Based';
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
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500 bg-white">
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
                            {employee.scheme === 'salary' ? 'Fixed Salary' : 'Commission Only'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {employee.scheme === 'salary' && (
                              <div className="font-medium text-gray-900">
                                {formatCurrency(employee.fixed_salary)}/mo
                              </div>
                            )}
                            {employee.scheme === 'commission' && (
                              <div className="text-sm font-medium text-gray-900">
                                {employee.commission_percentage}% Comm.
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              Work: {employee.work_incentive_percentage}% | 5★: {employee.five_star_incentive_percentage}%
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border border-gray-150 rounded-xl shadow-md">
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
                        {employee.scheme === 'salary' ? 'Fixed Salary' : 'Commission Only'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Compensation</span>
                      <span className="font-medium text-gray-800">
                        {employee.scheme === 'salary'
                          ? `${formatCurrency(employee.fixed_salary)}/mo`
                          : `${employee.commission_percentage}% Comm.`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Work: {employee.work_incentive_percentage}% | 5★: {employee.five_star_incentive_percentage}%
                    </div>
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
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Employee Form Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
            </SheetTitle>
            <SheetDescription>
              {selectedEmployee
                ? 'Update employee information and compensation details'
                : 'Add a new employee to the system'}
            </SheetDescription>
          </SheetHeader>
          <EmployeeForm
            employee={selectedEmployee}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setSelectedEmployee(null);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Employee Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedEmployee?.name || selectedEmployee?.employee_number}
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Name</label>
                    <p className="text-sm font-medium">{selectedEmployee.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Employee Number</label>
                    <p className="text-sm font-medium">{selectedEmployee.employee_number}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Job Title</label>
                    <p className="text-sm font-medium">{selectedEmployee.job_title || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge
                        className={
                          selectedEmployee.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {selectedEmployee.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compensation */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Compensation
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Scheme</label>
                    <div className="mt-1">
                      <Badge className={getSchemeBadgeColor(selectedEmployee.scheme)}>
                        {getSchemeLabel(selectedEmployee.scheme)}
                      </Badge>
                    </div>
                  </div>
                  {selectedEmployee.scheme === 'salary' && selectedEmployee.fixed_salary && (
                    <div>
                      <label className="text-xs text-gray-500">Fixed Salary</label>
                      <p className="text-sm font-medium">{formatCurrency(selectedEmployee.fixed_salary)}</p>
                    </div>
                  )}
                  {selectedEmployee.scheme === 'commission' && selectedEmployee.commission_percentage && (
                    <div>
                      <label className="text-xs text-gray-500">Commission Rate</label>
                      <p className="text-sm font-medium">{selectedEmployee.commission_percentage}%</p>
                    </div>
                  )}
                  {selectedEmployee.work_incentive_percentage && (
                    <div>
                      <label className="text-xs text-gray-500">Work Incentive</label>
                      <p className="text-sm font-medium">{selectedEmployee.work_incentive_percentage}%</p>
                    </div>
                  )}
                  {selectedEmployee.five_star_incentive_percentage && (
                    <div>
                      <label className="text-xs text-gray-500">5-Star Incentive</label>
                      <p className="text-sm font-medium">{selectedEmployee.five_star_incentive_percentage}%</p>
                    </div>
                  )}
                  {(selectedEmployee.work_incentive_percentage || selectedEmployee.five_star_incentive_percentage) && (
                    <div>
                      <label className="text-xs text-gray-500">Total Incentive</label>
                      <p className="text-sm font-medium text-primary">{selectedEmployee.total_incentive_percentage}%</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500">Monthly Target Amount</label>
                    <p className="text-sm font-medium text-primary">{formatCurrency(selectedEmployee.monthly_target_amount)}</p>
                  </div>
                </div>
              </div>

              {/* Contact & Dates */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact & Timeline
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Contact Number</label>
                    <p className="text-sm font-medium">{selectedEmployee.contact_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Joining Date</label>
                    <p className="text-sm font-medium">
                      {selectedEmployee.joining_date
                        ? new Date(selectedEmployee.joining_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                        : '-'}
                    </p>
                  </div>
                  {selectedEmployee.resignation_date && (
                    <div>
                      <label className="text-xs text-gray-500">Resignation Date</label>
                      <p className="text-sm font-medium text-red-600">
                        {new Date(selectedEmployee.resignation_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked User */}
              {selectedEmployee.user && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Linked User Account
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">User Name</label>
                      <p className="text-sm font-medium">{selectedEmployee.user.name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Email</label>
                      <p className="text-sm font-medium">{selectedEmployee.user.email}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Role</label>
                      <p className="text-sm font-medium capitalize">{selectedEmployee.user.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t pt-4 flex gap-2">
                <Button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handleEdit(selectedEmployee);
                  }}
                  className="flex-1"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Employee
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleToggleStatus(selectedEmployee)}
                  className="flex-1"
                >
                  {selectedEmployee.status === 'active' ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handleDeleteClick(selectedEmployee);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
    </div>
  );
};

export default Employees;
