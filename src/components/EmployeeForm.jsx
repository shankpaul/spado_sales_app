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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Employee Form Component
 * Form for creating and editing employees with all required fields
 */
const EmployeeForm = ({ employee, onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    employee_number: '',
    job_title: '',
    scheme: 'salary',
    fixed_salary: '',
    commission_percentage: '',
    work_incentive_percentage: '',
    five_star_incentive_percentage: '',
    joining_date: '',
    resignation_date: '',
    contact_number: '',
    status: 'active',
  });

  const [errors, setErrors] = useState({});

  // Pre-fill form if editing
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        employee_number: employee.employee_number || '',
        job_title: employee.job_title || '',
        scheme: employee.scheme || 'salary',
        fixed_salary: employee.fixed_salary || '',
        commission_percentage: employee.commission_percentage || '',
        work_incentive_percentage: employee.work_incentive_percentage || '',
        five_star_incentive_percentage: employee.five_star_incentive_percentage || '',
        joining_date: employee.joining_date || '',
        resignation_date: employee.resignation_date || '',
        contact_number: employee.contact_number || '',
        status: employee.status || 'active',
      });
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
    }));
  };

  // Handle status change
  const handleStatusChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      status: value,
    }));
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
    if (formData.work_incentive_percentage) {
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

    // Date validations
    if (formData.joining_date && formData.resignation_date) {
      if (new Date(formData.resignation_date) < new Date(formData.joining_date)) {
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
      
      // Add scheme-specific fields
      if (formData.scheme === 'salary' && formData.fixed_salary) {
        submitData.fixed_salary = parseFloat(formData.fixed_salary);
      }
      if (formData.scheme === 'commission' && formData.commission_percentage) {
        submitData.commission_percentage = parseFloat(formData.commission_percentage);
      }

      // Add incentive percentages
      if (formData.work_incentive_percentage) {
        submitData.work_incentive_percentage = parseFloat(formData.work_incentive_percentage);
      }
      if (formData.five_star_incentive_percentage) {
        submitData.five_star_incentive_percentage = parseFloat(formData.five_star_incentive_percentage);
      }

      // Add dates
      if (formData.joining_date) submitData.joining_date = formData.joining_date;
      if (formData.resignation_date) submitData.resignation_date = formData.resignation_date;

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
      
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
    <form onSubmit={handleSubmit} className="space-y-6 pt-6">
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

      {/* Employee Number (readonly for edit, auto-generated for new) */}
      {employee && (
        <div className="space-y-2">
          <Label htmlFor="employee_number">Employee Number</Label>
          <Input
            id="employee_number"
            name="employee_number"
            type="text"
            value={formData.employee_number}
            disabled
            className="bg-gray-100"
          />
        </div>
      )}

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

      {/* Scheme */}
      <div className="space-y-2">
        <Label htmlFor="scheme">
          Compensation Scheme <span className="text-red-500">*</span>
        </Label>
        <Select value={formData.scheme} onValueChange={handleSchemeChange}>
          <SelectTrigger className={errors.scheme ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select scheme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="salary">Fixed Salary</SelectItem>
            <SelectItem value="commission">Commission Based</SelectItem>
          </SelectContent>
        </Select>
        {errors.scheme && <p className="text-sm text-red-500">{errors.scheme}</p>}
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

      {/* Work Incentive Percentage */}
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

      {/* Joining Date */}
      <div className="space-y-2">
        <Label htmlFor="joining_date">Joining Date</Label>
        <Input
          id="joining_date"
          name="joining_date"
          type="date"
          value={formData.joining_date}
          onChange={handleChange}
        />
      </div>

      {/* Resignation Date */}
      <div className="space-y-2">
        <Label htmlFor="resignation_date">Resignation Date</Label>
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
      <div className="space-y-2">
        <Label htmlFor="status">
          Status <span className="text-red-500">*</span>
        </Label>
        <Select value={formData.status} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resigned">Resigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>{employee ? 'Update Employee' : 'Create Employee'}</>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default EmployeeForm;
