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
import { reverseGeocode, searchAreas } from '../lib/utilities';
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
    address_line1: '',
    address_line2: '',
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
  const [areaSuggestions, setAreaSuggestions] = useState([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState('bottom'); // 'top' or 'bottom'
  const [isAreaFocused, setIsAreaFocused] = useState(false);

  // Location data
  const [states] = useState(locationService.getStates());
  const [districts, setDistricts] = useState(locationService.getDistricts('Kerala'));
  const [cities, setCities] = useState(locationService.getCities('Kerala'));
  const [areas, setAreas] = useState([]);

  // Initialize form data when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        has_whatsapp: customer.has_whatsapp ?? true,
        address_line1: customer.address_line1 || '',
        address_line2: customer.address_line2 || '',
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
        address_line1: '',
        address_line2: '',
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

  // Update districts when state changes
  useEffect(() => {
    if (formData.state) {
      const newDistricts = locationService.getDistricts(formData.state);
      setDistricts(newDistricts);

      // Reset district if it doesn't exist in new list
      if (!newDistricts.includes(formData.district)) {
        setFormData((prev) => ({ ...prev, district: '', city: '' }));
      }
    }
  }, [formData.state]);

  // Update cities when district changes
  useEffect(() => {
    if (formData.state) {
      const newCities = locationService.getCities(formData.state, formData.district);
      
      // If current city is set but not in the default list, preserve it (could be from reverse geocoding)
      if (formData.city && !newCities.includes(formData.city)) {
        setCities([...newCities, formData.city]);
      } else {
        setCities(newCities);
      }
    }
  }, [formData.state, formData.district, formData.city]);

  // Load areas when district changes (for initial load and existing customers)
  useEffect(() => {
    const loadAreas = async () => {
      if (formData.state) {
        const fetchedAreas = await locationService.getAreas(formData.state, formData.district);
        setAreas(fetchedAreas);
      }
    };
    
    loadAreas();
  }, [formData.state, formData.district]);

  // Search areas from Nominatim API with debounce
  useEffect(() => {
    if (!formData.area || formData.area.length < 1) {
      setAreaSuggestions([]);
      setShowAreaSuggestions(false);
      return;
    }

    // Only search if the field is focused
    if (!isAreaFocused) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setAreaLoading(true);
      try {
        const suggestions = await searchAreas(formData.area, {
          city: formData.city,
          district: formData.district,
          state: formData.state,
          localAreas: areas,
          limit: 8,
        });
        
        console.log('Area suggestions fetched:', suggestions); // Debug log
        setAreaSuggestions(suggestions);
        // Show dropdown if we have suggestions and field is focused
        if (suggestions.length > 0 && isAreaFocused) {
          setShowAreaSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching area suggestions:', error);
        setAreaSuggestions([]);
        setShowAreaSuggestions(false);
      } finally {
        setAreaLoading(false);
      }
    }, 300); // 300ms debounce for faster response

    return () => clearTimeout(timeoutId);
  }, [formData.area, formData.city, formData.district, formData.state, areas, isAreaFocused]);

  // Handle map link paste
  const handleMapLinkChange = async (value) => {
    setFormData((prev) => ({ ...prev, map_link: value }));

    if (value && (value.includes('google.com/maps') || value.includes('goo.gl') || value.includes('maps.app'))) {
      setMapLinkLoading(true);
      try {
        // Backend API handles all parsing, expansion, and geocoding
        const addressData = await reverseGeocode(value);
        
        if (addressData) {
          // If identified city is not in the cities list, add it FIRST
          // This ensures the ComboBox has the option available when we set the value
          if (addressData.city && !cities.includes(addressData.city)) {
            setCities((prev) => [...prev, addressData.city]);
          }

          // If identified area is not in the areas list, add it FIRST
          if (addressData.area && !areas.includes(addressData.area)) {
            setAreas((prev) => [...prev, addressData.area]);
          }

          // Update form data with fetched address
          setFormData((prev) => ({
            ...prev,
            address_line1: addressData.display_name || prev.address_line1,
            area: addressData.area || prev.area,
            city: addressData.city || prev.city,
            district: addressData.district || prev.district,
            state: addressData.state || prev.state,
            country: addressData.country || prev.country,
          }));

          toast.success('Location details fetched successfully');
        } else {
          toast.warning('Could not extract location details from the link');
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

    // if (!formData.name.trim()) {
    //   errors.name = 'Name is required';
    // }
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
      toast.error(error.response?.data?.errors.join('\n') || 'Failed to save customer');
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
              <User className="h-4 w-4 text-primary/70" />Name
              {/* Name <span className="text-destructive">*</span> */}
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
              placeholder="Paste any Google Maps link (regular, shortened, WhatsApp location)..."
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
            Paste any Google Maps link or WhatsApp location.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* <div className="space-y-2">
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
          </div> */}
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
            <div className="relative">
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => {
                  setFormData({ ...formData, area: e.target.value });
                  setFormErrors({ ...formErrors, area: '' });
                }}
                onFocus={(e) => {
                  setIsAreaFocused(true);
                  // Show existing suggestions immediately if available
                  if (areaSuggestions.length > 0) {
                    setShowAreaSuggestions(true);
                  }
                  // Check if there's enough space below for dropdown
                  const rect = e.target.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const spaceAbove = rect.top;
                  const dropdownHeight = 240; // max-h-60 = 240px
                  
                  // Position above if not enough space below
                  setDropdownPosition(spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? 'top' : 'bottom');
                }}
                onBlur={() => {
                  setIsAreaFocused(false);
                  // Delay hiding to allow clicking suggestions
                  setTimeout(() => setShowAreaSuggestions(false), 200);
                }}
                placeholder="Type area/locality name..."
                className={formErrors.area ? 'border-destructive focus-visible:ring-destructive' : ''}
                autoComplete="off"
              />
              {areaLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              
              {/* Suggestions Dropdown */}
              {showAreaSuggestions && areaSuggestions.length > 0 && (
                <div 
                  className={`absolute z-50 w-full bg-popover border rounded-md shadow-md max-h-60 overflow-auto ${
                    dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                  }`}
                >
                  {areaSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, area: suggestion });
                        setFormErrors({ ...formErrors, area: '' });
                        setShowAreaSuggestions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground italic px-1">
              Type to search areas from OpenStreetMap or select from suggestions
            </p>
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
