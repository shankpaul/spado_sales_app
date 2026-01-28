import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { ComboBox } from './ui/combobox';
import { toast } from 'sonner';
import customerService from '../services/customerService';
import locationService from '../services/locationService';
import { Loader2 } from 'lucide-react';

/**
 * CustomerForm Component
 * Reusable form for creating/editing customers
 * Props: customer (for edit), onSuccess, onCancel
 */
const CustomerForm = ({ customer = null, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    has_whatsapp: true,
    area: '',
    city: '',
    district: '',
    state: 'Kerala',
    country: 'India',
    latitude: null,
    longitude: null,
    map_link: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [mapLinkLoading, setMapLinkLoading] = useState(false);

  // Location data
  const [states] = useState(locationService.getStates());
  const [districts, setDistricts] = useState(locationService.getDistricts('Kerala'));
  const [cities, setCities] = useState(locationService.getCities('Kerala'));

  // Initialize form data when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        has_whatsapp: customer.has_whatsapp ?? true,
        area: customer.area || '',
        city: customer.city || '',
        district: customer.district || '',
        state: customer.state || 'Kerala',
        country: 'India',
        latitude: customer.latitude || null,
        longitude: customer.longitude || null,
        map_link: customer.map_link || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        has_whatsapp: true,
        area: '',
        city: '',
        district: '',
        state: 'Kerala',
        country: 'India',
        latitude: null,
        longitude: null,
        map_link: '',
      });
    }
    setFormErrors({});
  }, [customer]);

  // Update districts and cities when state changes
  useEffect(() => {
    if (formData.state) {
      const newDistricts = locationService.getDistricts(formData.state);
      const newCities = locationService.getCities(formData.state);
      setDistricts(newDistricts);
      setCities(newCities);
      
      // Reset district and city if they don't exist in new lists
      if (!newDistricts.includes(formData.district)) {
        setFormData((prev) => ({ ...prev, district: '' }));
      }
      if (!newCities.includes(formData.city)) {
        setFormData((prev) => ({ ...prev, city: '' }));
      }
    }
  }, [formData.state]);

  // Handle map link paste
  const handleMapLinkChange = async (value) => {
    setFormData((prev) => ({ ...prev, map_link: value }));

    if (value && value.includes('google.com/maps')) {
      setMapLinkLoading(true);
      try {
        const { latitude, longitude } = customerService.parseMapLink(value);
        
        if (latitude && longitude) {
          setFormData((prev) => ({ ...prev, latitude, longitude }));
          
          // Fetch address details
          const addressData = await customerService.reverseGeocode(latitude, longitude);
          setFormData((prev) => ({
            ...prev,
            area: addressData.area || prev.area,
            city: addressData.city || prev.city,
            district: addressData.district || prev.district,
            state: addressData.state || prev.state,
            country: addressData.country || prev.country,
          }));
          
          toast.success('Location details fetched successfully');
        } else {
          toast.warning('Could not extract coordinates from the link');
        }
      } catch (error) {
        console.error('Error processing map link:', error);
        toast.error('Failed to process map link');
      } finally {
        setMapLinkLoading(false);
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setFormLoading(true);

    try {
      // Prepare data with country default to India
      const submitData = { ...formData, country: 'India' };
      
      let result;
      if (customer) {
        result = await customerService.updateCustomer(customer.id, submitData);
        toast.success('Customer updated successfully');
      } else {
        result = await customerService.createCustomer(submitData);
        toast.success('Customer created successfully');
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name & Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              setFormErrors({ ...formErrors, name: '' });
            }}
            className={formErrors.name ? 'border-destructive' : ''}
          />
          {formErrors.name && (
            <p className="text-xs text-destructive">{formErrors.name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 border rounded-md bg-muted">
              <span className="text-sm">+91</span>
            </div>
            <div className="flex-1">
              <Input
                id="phone"
                type="tel"
                maxLength={10}
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, phone: value });
                  setFormErrors({ ...formErrors, phone: '' });
                }}
                placeholder="10 digit number"
                className={formErrors.phone ? 'border-destructive' : ''}
              />
            </div>
          </div>
          {formErrors.phone && (
            <p className="text-xs text-destructive">{formErrors.phone}</p>
          )}
        </div>
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label htmlFor="whatsapp" className="flex items-center gap-2">
          Using WhatsApp on this number
        </Label>
        <div className="flex items-center space-x-2 h-9">
          <Switch
            id="whatsapp"
            checked={formData.has_whatsapp}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, has_whatsapp: checked })
            }
          />
          <span className="text-sm text-muted-foreground">
            {formData.has_whatsapp ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Map Link */}
      <div className="space-y-2">
        <Label htmlFor="map_link">Google Maps Link</Label>
        <div className="relative">
          <Textarea
            id="map_link"
            value={formData.map_link}
            onChange={(e) => handleMapLinkChange(e.target.value)}
            placeholder="Paste Google Maps link here to auto-fill location..."
            rows={2}
            disabled={mapLinkLoading}
          />
          {mapLinkLoading && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
          )}
        </div>
      </div>

      {/* State, District, City */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>State</Label>
          <ComboBox
            value={formData.state}
            onValueChange={(value) => setFormData({ ...formData, state: value })}
            options={states}
            placeholder="Select state"
          />
        </div>
        <div className="space-y-2">
          <Label>District</Label>
          <ComboBox
            value={formData.district}
            onValueChange={(value) => setFormData({ ...formData, district: value })}
            options={districts}
            placeholder="Select district"
            emptyText={formData.state ? 'No districts available' : 'Select state first'}
          />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <ComboBox
            value={formData.city}
            onValueChange={(value) => setFormData({ ...formData, city: value })}
            options={cities}
            placeholder="Select city"
            emptyText={formData.state ? 'No cities available' : 'Select state first'}
          />
        </div>
      </div>

      {/* Area */}
      <div className="space-y-2">
        <Label htmlFor="area">Area / Locality</Label>
        <Input
          id="area"
          value={formData.area}
          onChange={(e) => setFormData({ ...formData, area: e.target.value })}
          placeholder="Enter area or locality name"
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-2 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={formLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={formLoading}>
          {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {customer ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};

export default CustomerForm;
