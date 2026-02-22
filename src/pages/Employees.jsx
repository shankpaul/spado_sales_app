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
      console.error('Error fetching employees:', error);
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
      console.error('Error deleting employee:', error);
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
      console.error('Error toggling status:', error);
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
      console.error('Error saving employee:', error);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage employee records and compensation</p>
        </div>
        <Button onClick={handleAdd} className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by employee number, name, job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resigned">Resigned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={schemeFilter} onValueChange={setSchemeFilter}>
          <SelectTrigger className="w-full sm:w-40">
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
          <div className="md:hidden grid gap-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : filteredEmployees.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No employees found' : 'No employees yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first employee'}
          </p>
          {!searchTerm && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleViewDetails(employee)}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {employee.name || 'Unnamed Employee'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.employee_number}
                            {employee.job_title && ` • ${employee.job_title}`}
                          </div>
                          {employee.user && (
                            <div className="text-xs text-gray-400 mt-1">
                              {employee.user.name} ({employee.user.role})
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            employee.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSchemeBadgeColor(employee.scheme)}>
                          {getSchemeLabel(employee.scheme)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(employee)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(employee)}>
                              {employee.status === 'active' ? (
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
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(employee)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Card View (Minimal) */}
          <div className="md:hidden grid gap-3">
            {filteredEmployees.map((employee) => (
              <Card 
                key={employee.id} 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewDetails(employee)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {employee.name || 'Unnamed Employee'}
                      </h3>
                      <Badge
                        className={
                          employee.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {employee.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{employee.employee_number}</p>
                    {employee.job_title && (
                      <p className="text-sm text-gray-600 mt-1">{employee.job_title}</p>
                    )}
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
            ))}
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
