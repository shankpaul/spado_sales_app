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
import officeService from '../services/officeService';
import employeeService from '../services/employeeService';

/**
 * User Form Component
 * Form for creating and editing users with all required fields
 */
const UserForm = ({ user, onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [offices, setOffices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    employee_number: '',
    employee_id: '',
    role: 'agent',
    office_id: '',
    home_latitude: '',
    home_longitude: '',
    password: '',
    password_confirmation: '',
  });

  const [errors, setErrors] = useState({});

  // Fetch offices and employees on component mount
  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const response = await officeService.getAllOffices(true); // active only
        setOffices(response.offices || []);
      } catch (error) {
        console.error('Error fetching offices:', error);
        // Don't show error toast, just log it
      }
    };

    const fetchEmployees = async () => {
      try {
        const response = await employeeService.getAllEmployees({ status: 'active' });
        setEmployees(response.employees || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
        // Don't show error toast, just log it
      }
    };

    fetchOffices();
    fetchEmployees();
  }, []);

  // Pre-fill form if editing
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        employee_number: user.employee_number || '',
        employee_id: user.employee_id ? user.employee_id.toString() : '',
        role: user.role || 'agent',
        office_id: user.office_id ? user.office_id.toString() : '',
        home_latitude: user.home_latitude || '',
        home_longitude: user.home_longitude || '',
        password: '',
        password_confirmation: '',
      });
      // Set existing avatar preview
      if (user.avatar_url) {
        setAvatarPreview(user.avatar_url);
      }
    }
  }, [user]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle role change
  const handleRoleChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
    }));
  };

  // Handle employee change
  const handleEmployeeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      employee_id: value,
    }));
  };

  // Handle office change and auto-fill coordinates
  const handleOfficeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      office_id: value,
    }));

    // Auto-fill coordinates if they are empty
    if (value && (!formData.home_latitude || !formData.home_longitude)) {
      const selectedOffice = offices.find((office) => office.id.toString() === value);
      if (selectedOffice) {
        setFormData((prev) => ({
          ...prev,
          office_id: value,
          home_latitude: selectedOffice.latitude || '',
          home_longitude: selectedOffice.longitude || '',
        }));
        toast.success('Home location set to office location');
      }
    }
  };

  // Handle avatar file change
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Avatar must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove avatar
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(user?.avatar_url || null);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // Password validation (only for new users or if password is provided)
    if (!user || formData.password) {
      if (!formData.password && !user) {
        newErrors.password = 'Password is required for new users';
      } else if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (formData.password !== formData.password_confirmation) {
        newErrors.password_confirmation = 'Passwords do not match';
      }
    }

    // Validate coordinates if provided
    if (formData.home_latitude) {
      const lat = parseFloat(formData.home_latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.home_latitude = 'Latitude must be between -90 and 90';
      }
    }

    if (formData.home_longitude) {
      const lng = parseFloat(formData.home_longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.home_longitude = 'Longitude must be between -180 and 180';
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
      // Prepare FormData for multipart/form-data
      const submitData = new FormData();
      submitData.append('name', formData.name.trim());
      submitData.append('email', formData.email.trim());
      submitData.append('role', formData.role);

      // Add optional fields if provided
      if (formData.phone) submitData.append('phone', formData.phone.trim());
      if (formData.address) submitData.append('address', formData.address.trim());
      if (formData.employee_number) submitData.append('employee_number', formData.employee_number.trim());
      if (formData.employee_id) submitData.append('employee_id', parseInt(formData.employee_id));
      if (formData.office_id) submitData.append('office_id', parseInt(formData.office_id));
      if (formData.home_latitude) submitData.append('home_latitude', parseFloat(formData.home_latitude));
      if (formData.home_longitude) submitData.append('home_longitude', parseFloat(formData.home_longitude));

      // Add password only if provided (for new users it's required, for existing it's optional)
      if (formData.password) {
        submitData.append('password', formData.password);
        submitData.append('password_confirmation', formData.password_confirmation);
      }

      // Add avatar if provided
      if (avatarFile) {
        submitData.append('avatar', avatarFile);
      }

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Handle validation errors from server
      if (error.response?.data?.errors) {
        const serverErrors = {};
        const errorMessages = error.response.data.errors;
        
        if (Array.isArray(errorMessages)) {
          errorMessages.forEach((msg) => {
            if (msg.includes('Email')) serverErrors.email = msg;
            else if (msg.includes('Password')) serverErrors.password = msg;
            else toast.error(msg);
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
        toast.error(error.response?.data?.error || 'Failed to save user');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-6">
      {/* Avatar */}
      <div className="space-y-2">
        <Label>Avatar (Optional)</Label>
        <div className="flex items-center gap-4">
          {avatarPreview && (
            <div className="relative">
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
              {avatarFile && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              )}
            </div>
          )}
          <div className="flex-1">
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              {user ? 'Change avatar (JPEG, PNG, or GIF, max 5MB)' : 'Upload avatar (JPEG, PNG, or GIF, max 5MB)'}
            </p>
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Full Name <span className="text-red-500">*</span>
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

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+91 9876543210"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          type="text"
          value={formData.address}
          onChange={handleChange}
          placeholder="Street address, City, State"
        />
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
          placeholder="EMP001"
        />
      </div>

      {/* Employee Link */}
      <div className="space-y-2">
        <Label htmlFor="employee">Link to Employee Record (Optional)</Label>
        <Select 
          value={formData.employee_id || undefined} 
          onValueChange={handleEmployeeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select employee (optional)" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id.toString()}>
                {employee.name} ({employee.employee_number})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Link this user account to an employee record for compensation tracking
        </p>
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label htmlFor="role">
          Role <span className="text-red-500">*</span>
        </Label>
        <Select value={formData.role} onValueChange={handleRoleChange}>
          <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="sales_executive">Sales Executive</SelectItem>
            <SelectItem value="accountant">Accountant</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
      </div>

      {/* Office */}
      <div className="space-y-2">
        <Label htmlFor="office">Office Location (Optional)</Label>
        <Select 
          value={formData.office_id || undefined} 
          onValueChange={handleOfficeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select office" />
          </SelectTrigger>
          <SelectContent>
            {offices.map((office) => (
              <SelectItem key={office.id} value={office.id.toString()}>
                {office.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Selecting an office will auto-fill home location coordinates
        </p>
      </div>

      {/* Home Location Coordinates */}
      <div className="space-y-4">
        <Label>Home Location (Optional)</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="home_latitude" className="text-sm text-gray-600">
              Latitude
            </Label>
            <Input
              id="home_latitude"
              name="home_latitude"
              type="number"
              step="any"
              value={formData.home_latitude}
              onChange={handleChange}
              placeholder="12.9716"
              className={errors.home_latitude ? 'border-red-500' : ''}
            />
            {errors.home_latitude && (
              <p className="text-sm text-red-500">{errors.home_latitude}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="home_longitude" className="text-sm text-gray-600">
              Longitude
            </Label>
            <Input
              id="home_longitude"
              name="home_longitude"
              type="number"
              step="any"
              value={formData.home_longitude}
              onChange={handleChange}
              placeholder="77.5946"
              className={errors.home_longitude ? 'border-red-500' : ''}
            />
            {errors.home_longitude && (
              <p className="text-sm text-red-500">{errors.home_longitude}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Enter the home location coordinates for route calculation
        </p>
      </div>

      {/* Password Section */}
      <div className="space-y-4 pt-4 border-t">
        <Label className="text-base">
          {user ? 'Change Password (Optional)' : 'Set Password'}
        </Label>
        
        <div className="space-y-2">
          <Label htmlFor="password">
            Password {!user && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={user ? 'Leave blank to keep current password' : 'Enter password'}
            className={errors.password ? 'border-red-500' : ''}
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password_confirmation">
            Confirm Password {!user && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            value={formData.password_confirmation}
            onChange={handleChange}
            placeholder="Confirm password"
            className={errors.password_confirmation ? 'border-red-500' : ''}
          />
          {errors.password_confirmation && (
            <p className="text-sm text-red-500">{errors.password_confirmation}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>{user ? 'Update User' : 'Create User'}</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;
