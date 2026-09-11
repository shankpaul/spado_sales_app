import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Loader2, User, DollarSign, Award, Calendar } from 'lucide-react';
import { toast } from 'sonner';

// Helper to normalize compensation scheme from various backend/legacy representations
export const normalizeScheme = (scheme, employeeObj = null) => {
  if (scheme === 1 || scheme === '1') return 'commission';
  if (scheme === 0 || scheme === '0') return 'salary';
  if (typeof scheme === 'string') {
    const s = scheme.trim().toLowerCase();
    if (s.includes('comm')) return 'commission';
    if (s.includes('sal')) return 'salary';
  }
  if (employeeObj) {
    if (employeeObj.employee_scheme) return normalizeScheme(employeeObj.employee_scheme);
    if (employeeObj.compensation_scheme) return normalizeScheme(employeeObj.compensation_scheme);
    if (employeeObj.commission_percentage && !employeeObj.fixed_salary) return 'commission';
  }
  return 'salary';
};

// Helper to normalize status
export const normalizeStatus = (status) => {
  if (status === 1 || status === '1') return 'resigned';
  if (status === 0 || status === '0') return 'active';
  if (typeof status === 'string') {
    const s = status.trim().toLowerCase();
    if (s.includes('resig') || s.includes('inact')) return 'resigned';
    if (s.includes('act')) return 'active';
  }
  return 'active';
};

// Helper to normalize settlement cycle
export const normalizeSettlementCycle = (cycle) => {
  if (typeof cycle === 'string') {
    const c = cycle.trim().toLowerCase();
    if (['daily', 'weekly', 'monthly'].includes(c)) return c;
  }
  return 'monthly';
};

const getInitialFormData = (emp) => ({
  name: emp?.name || '',
  employee_number: emp?.employee_number || '',
  job_title: emp?.job_title || '',
  scheme: normalizeScheme(emp?.scheme, emp),
  fixed_salary: emp?.fixed_salary !== undefined && emp?.fixed_salary !== null ? emp.fixed_salary : '',
  commission_percentage: emp?.commission_percentage !== undefined && emp?.commission_percentage !== null ? emp.commission_percentage : '',
  work_incentive_percentage: emp?.work_incentive_percentage !== undefined && emp?.work_incentive_percentage !== null ? emp.work_incentive_percentage : '',
  five_star_incentive_percentage: emp?.five_star_incentive_percentage !== undefined && emp?.five_star_incentive_percentage !== null ? emp.five_star_incentive_percentage : '',
  joining_date: emp?.joining_date ? String(emp.joining_date).split('T')[0] : '',
  resignation_date: emp?.resignation_date ? String(emp.resignation_date).split('T')[0] : '',
  contact_number: emp?.contact_number || '',
  status: normalizeStatus(emp?.status),
  monthly_target_amount: emp?.monthly_target_amount !== undefined && emp?.monthly_target_amount !== null ? emp.monthly_target_amount : '',
  travelling_allowance: emp?.travelling_allowance !== undefined && emp?.travelling_allowance !== null ? emp.travelling_allowance : '',
  settlement_cycle: normalizeSettlementCycle(emp?.settlement_cycle),
});

/**
 * Employee Form Component
 * Form for creating and editing employees with all required fields
 */
const EmployeeForm = ({ employee, onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => getInitialFormData(employee));

  const [errors, setErrors] = useState({});

  // Pre-fill form if editing
  useEffect(() => {
    if (employee) {
      setFormData(getInitialFormData(employee));
    }
  }, [employee]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle scheme change
  const handleSchemeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      scheme: value,
      // Clear opposite scheme field
      fixed_salary: value === 'commission' ? '' : prev.fixed_salary,
      commission_percentage: value === 'salary' ? '' : prev.commission_percentage,
      work_incentive_percentage: value === 'commission' ? '' : prev.work_incentive_percentage,
    }));
  };

  // Handle status change
  const handleStatusChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      status: value,
      resignation_date: value === 'resigned' ? prev.resignation_date : '',
    }));
    if (value !== 'resigned') {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.resignation_date;
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Name is required
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Employee name is required';
    }

    // Employee number is auto-generated for new employees
    if (employee && !formData.employee_number) {
      newErrors.employee_number = 'Employee number is required';
    }

    // Scheme-specific validation
    if (formData.scheme === 'salary') {
      if (!formData.fixed_salary) {
        newErrors.fixed_salary = 'Fixed salary is required for salary scheme';
      } else if (parseFloat(formData.fixed_salary) < 0) {
        newErrors.fixed_salary = 'Salary must be a positive number';
      }
    } else if (formData.scheme === 'commission') {
      if (!formData.commission_percentage) {
        newErrors.commission_percentage = 'Commission percentage is required for commission scheme';
      } else {
        const comm = parseFloat(formData.commission_percentage);
        if (isNaN(comm) || comm < 0 || comm > 100) {
          newErrors.commission_percentage = 'Commission must be between 0 and 100';
        }
      }
    }

    // Validate percentages
    if (formData.scheme === 'salary' && formData.work_incentive_percentage) {
      const work = parseFloat(formData.work_incentive_percentage);
      if (isNaN(work) || work < 0 || work > 100) {
        newErrors.work_incentive_percentage = 'Work incentive must be between 0 and 100';
      }
    }

    if (formData.five_star_incentive_percentage) {
      const fiveStar = parseFloat(formData.five_star_incentive_percentage);
      if (isNaN(fiveStar) || fiveStar < 0 || fiveStar > 100) {
        newErrors.five_star_incentive_percentage = '5-star incentive must be between 0 and 100';
      }
    }

    // Date validations: Joining date is mandatory
    if (!formData.joining_date) {
      newErrors.joining_date = 'Joining date is required';
    }

    // Resignation date is mandatory only when status is resigned
    if (formData.status === 'resigned') {
      if (!formData.resignation_date) {
        newErrors.resignation_date = 'Resignation date is required when status is resigned';
      } else if (formData.joining_date && new Date(formData.resignation_date) < new Date(formData.joining_date)) {
        newErrors.resignation_date = 'Resignation date must be after joining date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Prepare data
      const submitData = {
        scheme: formData.scheme,
        status: formData.status,
      };

      // Add required fields
      if (formData.name) submitData.name = formData.name.trim();

      // Add optional fields if provided
      if (formData.employee_number) submitData.employee_number = formData.employee_number.trim();
      if (formData.job_title) submitData.job_title = formData.job_title.trim();
      if (formData.contact_number) submitData.contact_number = formData.contact_number.trim();
      submitData.monthly_target_amount = formData.monthly_target_amount ? parseFloat(formData.monthly_target_amount) : 0;
      submitData.travelling_allowance = formData.travelling_allowance ? parseFloat(formData.travelling_allowance) : 0;
      
      // Add scheme-specific fields
      if (formData.scheme === 'salary' && formData.fixed_salary) {
        submitData.fixed_salary = parseFloat(formData.fixed_salary);
      }
      if (formData.scheme === 'commission' && formData.commission_percentage) {
        submitData.commission_percentage = parseFloat(formData.commission_percentage);
      }

      // Add incentive percentages
      if (formData.scheme === 'salary') {
        if (formData.work_incentive_percentage) {
          submitData.work_incentive_percentage = parseFloat(formData.work_incentive_percentage);
        } else {
          submitData.work_incentive_percentage = 0;
        }
      } else if (formData.scheme === 'commission') {
        submitData.work_incentive_percentage = 0;
      }
      if (formData.five_star_incentive_percentage) {
        submitData.five_star_incentive_percentage = parseFloat(formData.five_star_incentive_percentage);
      }

      // Add dates
      if (formData.joining_date) submitData.joining_date = formData.joining_date;
      if (formData.status === 'resigned' && formData.resignation_date) {
        submitData.resignation_date = formData.resignation_date;
      } else {
        submitData.resignation_date = null;
      }

      await onSubmit(submitData);
    } catch (error) {
      
      // Handle validation errors from server
      if (error.response?.data?.errors) {
        const serverErrors = {};
        const errorMessages = error.response.data.errors;
        
        if (Array.isArray(errorMessages)) {
          errorMessages.forEach((msg) => {
            toast.error(msg);
          });
        } else if (typeof errorMessages === 'object') {
          Object.keys(errorMessages).forEach((key) => {
            serverErrors[key] = Array.isArray(errorMessages[key])
              ? errorMessages[key][0]
              : errorMessages[key];
          });
        }
        
        setErrors(serverErrors);
      } else {
        toast.error(error.response?.data?.error || 'Failed to save employee');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <User className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Employee Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Employee Number */}
            <div className="space-y-2">
              <Label htmlFor="employee_number">Employee Number</Label>
              <Input
                id="employee_number"
                name="employee_number"
                type="text"
                value={formData.employee_number}
                onChange={handleChange}
                disabled={!!employee}
                placeholder={employee ? "" : "Leave blank to auto-generate"}
                className={employee ? "bg-gray-100" : ""}
              />
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                name="job_title"
                type="text"
                value={formData.job_title}
                onChange={handleChange}
                placeholder="Senior Field Agent"
              />
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact Number</Label>
              <Input
                id="contact_number"
                name="contact_number"
                type="tel"
                value={formData.contact_number}
                onChange={handleChange}
                placeholder="+91 9876543210"
              />
            </div>

            {/* Status */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.status} onValueChange={handleStatusChange}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="z-[2000]">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 2: Compensation & Settlement */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">Compensation & Settlement</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scheme */}
            <div className="space-y-2">
              <Label htmlFor="scheme">
                Compensation Scheme <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.scheme} onValueChange={handleSchemeChange}>
                <SelectTrigger id="scheme" className={errors.scheme ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent className="z-[2000]">
                  <SelectItem value="salary">Fixed Salary</SelectItem>
                  <SelectItem value="commission">Commission Based</SelectItem>
                </SelectContent>
              </Select>
              {errors.scheme && <p className="text-sm text-red-500">{errors.scheme}</p>}
            </div>

            {/* Settlement Cycle */}
            <div className="space-y-2">
              <Label htmlFor="settlement_cycle">Settlement Payout Cycle</Label>
              <Select
                value={formData.settlement_cycle}
                onValueChange={(val) => setFormData(prev => ({ ...prev, settlement_cycle: val }))}
              >
                <SelectTrigger id="settlement_cycle">
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent className="z-[2000]">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fixed Salary (only for salary scheme) */}
            {formData.scheme === 'salary' && (
              <div className="space-y-2">
                <Label htmlFor="fixed_salary">
                  Fixed Salary (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fixed_salary"
                  name="fixed_salary"
                  type="number"
                  step="0.01"
                  value={formData.fixed_salary}
                  onChange={handleChange}
                  placeholder="50000"
                  className={errors.fixed_salary ? 'border-red-500' : ''}
                />
                {errors.fixed_salary && (
                  <p className="text-sm text-red-500">{errors.fixed_salary}</p>
                )}
              </div>
            )}

            {/* Commission Percentage (only for commission scheme) */}
            {formData.scheme === 'commission' && (
              <div className="space-y-2">
                <Label htmlFor="commission_percentage">
                  Commission Percentage (%) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="commission_percentage"
                  name="commission_percentage"
                  type="number"
                  step="0.01"
                  value={formData.commission_percentage}
                  onChange={handleChange}
                  placeholder="5.0"
                  className={errors.commission_percentage ? 'border-red-500' : ''}
                />
                {errors.commission_percentage && (
                  <p className="text-sm text-red-500">{errors.commission_percentage}</p>
                )}
              </div>
            )}

            {/* Monthly Target Amount */}
            <div className="space-y-2">
              <Label htmlFor="monthly_target_amount">Monthly Target Amount (₹)</Label>
              <Input
                id="monthly_target_amount"
                name="monthly_target_amount"
                type="number"
                step="0.01"
                value={formData.monthly_target_amount}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Incentives & Allowances */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Award className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">Incentives & Allowances</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Work Incentive Percentage (only for salary scheme) */}
            {formData.scheme === 'salary' && (
              <div className="space-y-2">
                <Label htmlFor="work_incentive_percentage">Work Incentive (%)</Label>
                <Input
                  id="work_incentive_percentage"
                  name="work_incentive_percentage"
                  type="number"
                  step="0.01"
                  value={formData.work_incentive_percentage}
                  onChange={handleChange}
                  placeholder="2.0"
                  className={errors.work_incentive_percentage ? 'border-red-500' : ''}
                />
                {errors.work_incentive_percentage && (
                  <p className="text-sm text-red-500">{errors.work_incentive_percentage}</p>
                )}
              </div>
            )}

            {/* Five Star Incentive Percentage */}
            <div className="space-y-2">
              <Label htmlFor="five_star_incentive_percentage">5-Star Incentive (%)</Label>
              <Input
                id="five_star_incentive_percentage"
                name="five_star_incentive_percentage"
                type="number"
                step="0.01"
                value={formData.five_star_incentive_percentage}
                onChange={handleChange}
                placeholder="1.5"
                className={errors.five_star_incentive_percentage ? 'border-red-500' : ''}
              />
              {errors.five_star_incentive_percentage && (
                <p className="text-sm text-red-500">{errors.five_star_incentive_percentage}</p>
              )}
            </div>

            {/* Travelling Allowance (₹/km) */}
            <div className={`space-y-2 ${formData.scheme === 'commission' ? '' : 'sm:col-span-2'}`}>
              <Label htmlFor="travelling_allowance">Travelling Allowance (₹/km)</Label>
              <Input
                id="travelling_allowance"
                name="travelling_allowance"
                type="number"
                step="0.01"
                value={formData.travelling_allowance}
                onChange={handleChange}
                placeholder="0.00"
                className={errors.travelling_allowance ? 'border-red-500' : ''}
              />
              {errors.travelling_allowance && (
                <p className="text-sm text-red-500">{errors.travelling_allowance}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Employment Timeline */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Calendar className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Employment Timeline</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Joining Date */}
            <div className={`space-y-2 ${formData.status === 'resigned' ? '' : 'sm:col-span-2'}`}>
              <Label htmlFor="joining_date">
                Joining Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="joining_date"
                name="joining_date"
                type="date"
                value={formData.joining_date}
                onChange={handleChange}
                className={errors.joining_date ? 'border-red-500' : ''}
              />
              {errors.joining_date && (
                <p className="text-sm text-red-500">{errors.joining_date}</p>
              )}
            </div>

            {/* Resignation Date - show only when status is resigned */}
            {formData.status === 'resigned' && (
              <div className="space-y-2">
                <Label htmlFor="resignation_date">
                  Resignation Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="resignation_date"
                  name="resignation_date"
                  type="date"
                  value={formData.resignation_date}
                  onChange={handleChange}
                  className={errors.resignation_date ? 'border-red-500' : ''}
                />
                {errors.resignation_date && (
                  <p className="text-sm text-red-500">{errors.resignation_date}</p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
 
       {/* Fixed Footer */}
       <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end shrink-0">
         <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
           Cancel
         </Button>
         <Button type="submit" disabled={loading} className="min-w-[140px]">
           {loading ? (
             <>
               <Loader2 className="h-4 w-4 mr-2 animate-spin" />
               Saving...
             </>
           ) : (
             <>{employee ? 'Update Employee' : 'Create Employee'}</>
           )}
         </Button>
       </div>
     </form>
  );
};

export default EmployeeForm;
