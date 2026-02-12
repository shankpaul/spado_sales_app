import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { ComboBox } from './ui/combobox';
import { toast } from 'sonner';
import customerService from '../services/customerService';
import locationService from '../services/locationService';
import {
  Loader2,
  User,
  Phone,
  MapPin,
  Map,
  MessageSquare,
  Globe,
  Navigation,
  Check
} from 'lucide-react';

/**
 * CustomerForm Component
 * Reusable form for creating/editing customers
 * Props: customer (for edit), onSuccess, onCancel
 */
const CustomerForm = forwardRef(({ customer = null, onSuccess, onCancel, showActions = true }, ref) => {
  useImperativeHandle(ref, () => ({
    submit: () => {
      handleSubmit();
    },
    isLoading: formLoading
  }));

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
    if (!formData.area || !formData.area.trim()) {
      errors.area = 'Area / Locality is required';
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
    if (e) e.preventDefault();

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary/70" />
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Full name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setFormErrors({ ...formErrors, name: '' });
              }}
              className={`${formErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {formErrors.name && (
              <p className="text-xs text-destructive font-medium pl-1">{formErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary/70" />
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 border rounded-md bg-muted text-muted-foreground text-sm font-medium">
                +91
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
                  className={`${formErrors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
              </div>
            </div>
            {formErrors.phone && (
              <p className="text-xs text-destructive font-medium pl-1">{formErrors.phone}</p>
            )}
          </div>
        </div>

        {/* WhatsApp Toggle - Sleeker look */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${formData.has_whatsapp ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">WhatsApp Available</p>
              <p className="text-xs text-muted-foreground">Is this phone number on WhatsApp?</p>
            </div>
          </div>
          <Switch
            id="whatsapp"
            checked={formData.has_whatsapp}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, has_whatsapp: checked })
            }
          />
        </div>
      </div>

      {/* Location Section */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Location Details</h3>

        <div className="space-y-2">
          <Label htmlFor="map_link" className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary/70" />
            Google Maps Link
          </Label>
          <div className="relative">
            <Textarea
              id="map_link"
              value={formData.map_link}
              onChange={(e) => handleMapLinkChange(e.target.value)}
              placeholder="Paste maps link to auto-fill location..."
              className="min-h-[80px] pr-10 resize-none bg-blue-50/10 border-blue-100 focus-visible:border-blue-400 focus-visible:ring-blue-100"
              disabled={mapLinkLoading}
            />
            {mapLinkLoading ? (
              <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-primary" />
            ) : formData.latitude && (
              <Check className="absolute right-3 top-3 h-5 w-5 text-green-500" />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground italic px-1">
            Tip: Long press on Google Maps to drop a pin and copy the link.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary/70" />
              State
            </Label>
            <ComboBox
              value={formData.state}
              onValueChange={(value) => setFormData({ ...formData, state: value })}
              options={states}
              placeholder="Select state"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Map className="h-4 w-4 text-primary/70" />
              District
            </Label>
            <ComboBox
              value={formData.district}
              onValueChange={(value) => setFormData({ ...formData, district: value })}
              options={districts}
              placeholder="Select district"
              emptyText={formData.state ? 'No districts' : 'Select state first'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary/70" />
              City / Town
            </Label>
            <ComboBox
              value={formData.city}
              onValueChange={(value) => setFormData({ ...formData, city: value })}
              options={cities}
              placeholder="Select city"
              emptyText={formData.state ? 'No cities' : 'Select state first'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="area" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary/70" />
              Area / Locality <span className="text-destructive">*</span>
            </Label>
            <Input
              id="area"
              value={formData.area}
              onChange={(e) => {
                setFormData({ ...formData, area: e.target.value });
                setFormErrors({ ...formErrors, area: '' });
              }}
              placeholder="Local area name"
              className={formErrors.area ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {formErrors.area && (
              <p className="text-xs text-destructive font-medium pl-1">{formErrors.area}</p>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      {showActions && (
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={formLoading}
            className="order-2 sm:order-1 h-12 sm:h-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={formLoading}
            className="order-1 sm:order-2 flex-1 h-12 sm:h-auto shadow-sm"
          >
            {formLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {customer ? 'Update Customer' : 'Save Customer'}
          </Button>
        </div>
      )}
    </form>
  );
});

export default CustomerForm;
