import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import offerService from '../services/offerService';
import orderService from '../services/orderService';
import {
  OFFER_TYPE_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
  OFFER_TYPE_PACKAGE_BUNDLE,
  OFFER_TYPE_ADDON_BUNDLE,
  OFFER_TYPE_VALUE_DISCOUNT,
  OFFER_TYPE_WASH_COMPLETION,
  DISCOUNT_TYPE_FIXED,
  DISCOUNT_TYPE_PERCENTAGE,
} from '../constants/offerConstants';
import {
  ArrowLeft,
  Loader2,
  Save,
  Tag,
  Calendar,
  Package,
  Gift,
  TrendingUp,
  Car,
  Filter,
} from 'lucide-react';

/**
 * Offer Form Component
 * Form for creating and editing offers
 */
const OfferForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    conditions: '',
    offer_type: OFFER_TYPE_PACKAGE_BUNDLE,
    discount_type: DISCOUNT_TYPE_FIXED,
    discount_value: 0,
    wash_count_required: 0,
    start_date: '',
    end_date: '',
    coupon_code: '',
    per_use_count: 0,
    max_usage: 0,
    is_stackable: false,
    is_active: true,
    required_package_ids: [],
    reward_package_ids: [],
    required_addon_ids: [],
    reward_addon_ids: [],
  });

  // Load packages and addons
  useEffect(() => {
    const loadData = async () => {
      try {
        const packagesResp = await orderService.getPackages();
        const addonsResp = await orderService.getAddons();
        setPackages(packagesResp.packages || packagesResp || []);
        setAddons(addonsResp.addons || addonsResp || []);
      } catch (error) {
        console.error('Error loading packages/addons:', error);
        toast.error('Failed to load packages and addons');
      }
    };
    loadData();
  }, []);

  // Load offer if editing
  useEffect(() => {
    if (isEditMode) {
      loadOffer();
    }
  }, [id]);

  // Reset package/addon selections when offer type changes
  useEffect(() => {
    if (!isEditMode) {
      if (formData.offer_type !== OFFER_TYPE_PACKAGE_BUNDLE) {
        setFormData(prev => ({
          ...prev,
          required_package_ids: [],
          reward_package_ids: [],
          reward_addon_ids: [],
        }));
      }
    }
  }, [formData.offer_type, isEditMode]);

  const loadOffer = async () => {
    try {
      setLoading(true);
      const response = await offerService.getOfferById(id);
      const offer = response.data;

      // Extract package and addon IDs
      const required_package_ids = offer.required_packages?.map((p) => p.id) || [];
      const reward_package_ids = offer.reward_packages?.map((p) => p.id) || [];
      const required_addon_ids = offer.required_addons?.map((a) => a.id) || [];
      const reward_addon_ids = offer.reward_addons?.map((a) => a.id) || [];

      setFormData({
        name: offer.name,
        description: offer.description || '',
        conditions: offer.conditions || '',
        offer_type: offer.offer_type,
        discount_type: offer.discount_type,
        discount_value: offer.discount_value,
        wash_count_required: offer.wash_count_required,
        start_date: offer.start_date ? offer.start_date.split('T')[0] : '',
        end_date: offer.end_date ? offer.end_date.split('T')[0] : '',
        coupon_code: offer.coupon_code || '',
        per_use_count: offer.per_use_count,
        max_usage: offer.max_usage,
        is_stackable: offer.is_stackable,
        is_active: offer.is_active,
        required_package_ids,
        reward_package_ids,
        required_addon_ids,
        reward_addon_ids,
      });
    } catch (error) {
      console.error('Error loading offer:', error);
      toast.error('Failed to load offer');
      navigate('/offers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, itemId) => {
    setFormData((prev) => {
      const array = prev[field];
      if (array.includes(itemId)) {
        return { ...prev, [field]: array.filter((id) => id !== itemId) };
      } else {
        return { ...prev, [field]: [...array, itemId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Offer name is required');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error('Start and end dates are required');
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      toast.error('End date must be after start date');
      return;
    }

    // Prepare data
    const data = {
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
      coupon_code: formData.coupon_code || null,
    };

    try {
      setSaving(true);
      if (isEditMode) {
        await offerService.updateOffer(id, data);
        toast.success('Offer updated successfully');
      } else {
        await offerService.createOffer(data);
        toast.success('Offer created successfully');
      }
      navigate('/offers');
    } catch (error) {
      console.error('Error saving offer:', error);
      toast.error(error.response?.data?.errors?.[0] || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/offers')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Offers
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Offer' : 'Create New Offer'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode ? 'Update offer details' : 'Create a new promotional offer'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Card className="p-6 mb-6 bg-white shadow-xs">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Buy 1 Get 1 Free"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Brief description of the offer"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <Textarea
                  value={formData.conditions}
                  onChange={(e) => handleChange('conditions', e.target.value)}
                  placeholder="Terms and conditions for this offer"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Offer Configuration */}
          <Card className="p-6 mb-6 bg-white shadow-xs">
            <h2 className="text-lg font-semibold mb-4">Offer Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.offer_type}
                  onValueChange={(value) => handleChange('offer_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFER_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value) => handleChange('discount_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Value <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => handleChange('discount_value', parseFloat(e.target.value) || 0)}
                  placeholder={formData.discount_type === DISCOUNT_TYPE_PERCENTAGE ? '% off' : '₹ amount'}
                  required
                />
              </div>

              {formData.offer_type === OFFER_TYPE_WASH_COMPLETION && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Wash Count <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.wash_count_required}
                    onChange={(e) => handleChange('wash_count_required', parseInt(e.target.value) || 0)}
                    placeholder="Number of washes"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Date Range */}
          <Card className="p-6 mb-6 bg-white shadow-xs">
            <h2 className="text-lg font-semibold mb-4">
              <Calendar className="inline h-5 w-5 mr-2" />
              Date Range
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Usage Limits */}
          <Card className="p-6 mb-6 bg-white shadow-xs">
            <h2 className="text-lg font-semibold mb-4">
              <TrendingUp className="inline h-5 w-5 mr-2" />
              Usage Limits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usage per Customer (0 = Unlimited)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.per_use_count}
                  onChange={(e) => handleChange('per_use_count', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Usage Limit (0 = Unlimited)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.max_usage}
                  onChange={(e) => handleChange('max_usage', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coupon Code (Optional)
                </label>
                <Input
                  value={formData.coupon_code}
                  onChange={(e) => handleChange('coupon_code', e.target.value.toUpperCase())}
                  placeholder="SAVE20"
                />
              </div>
            </div>
          </Card>

          {/* Package Selection - Only for package bundle offers */}
          {formData.offer_type === OFFER_TYPE_PACKAGE_BUNDLE && (
            <Card className="p-6 mb-6 bg-white shadow-xs">
              <h2 className="text-lg font-semibold mb-4">
                <Package className="inline h-5 w-5 mr-2" />
                Package & Addon Configuration
              </h2>
              
              {/* Vehicle Type Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="inline h-4 w-4 mr-1" />
                  Filter by Vehicle Type
                </label>
                <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="All Vehicle Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicle Types</SelectItem>
                    <SelectItem value="hatchback">Hatchback</SelectItem>
                    <SelectItem value="sedan">Sedan</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                     <SelectItem value="luxury">Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-6">
                {/* Required Packages Row */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Required Packages (Customer must purchase)
                  </label>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-white shadow-xs">
                    {packages
                      .filter(pkg => vehicleTypeFilter === 'all' || pkg.vehicle_type?.toLowerCase() === vehicleTypeFilter.toLowerCase())
                      .length === 0 ? (
                      <p className="text-sm text-gray-500">No packages available</p>
                    ) : (
                      <div className="space-y-2">
                        {packages
                          .filter(pkg => vehicleTypeFilter === 'all' || pkg.vehicle_type?.toLowerCase() === vehicleTypeFilter.toLowerCase())
                          .map((pkg) => (
                            <div key={pkg.id} className="flex items-start space-x-2">
                              <Checkbox
                                id={`req-pkg-${pkg.id}`}
                                checked={formData.required_package_ids.includes(pkg.id)}
                                onCheckedChange={() => handleArrayChange('required_package_ids', pkg.id)}
                              />
                              <label htmlFor={`req-pkg-${pkg.id}`} className="text-sm cursor-pointer flex-1">
                                <div className="font-medium">{pkg.name}</div>
                                <div className="text-xs text-gray-500">
                                  <Car className="inline h-3 w-3 mr-1" />
                                  {pkg.vehicle_type} - ₹{pkg.unit_price}
                                </div>
                              </label>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select packages that customer must purchase to qualify for this offer
                  </p>
                </div>

                {/* Rewards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Reward Packages */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reward Packages (Customer gets free/discounted)
                    </label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-white shadow-xs">
                      {packages
                        .filter(pkg => vehicleTypeFilter === 'all' || pkg.vehicle_type?.toLowerCase() === vehicleTypeFilter.toLowerCase())
                        .length === 0 ? (
                        <p className="text-sm text-gray-500">No packages available</p>
                      ) : (
                        <div className="space-y-2">
                          {packages
                            .filter(pkg => vehicleTypeFilter === 'all' || pkg.vehicle_type?.toLowerCase() === vehicleTypeFilter.toLowerCase())
                            .map((pkg) => (
                              <div key={pkg.id} className="flex items-start space-x-2">
                                <Checkbox
                                  id={`reward-pkg-${pkg.id}`}
                                  checked={formData.reward_package_ids.includes(pkg.id)}
                                  onCheckedChange={() => handleArrayChange('reward_package_ids', pkg.id)}
                                />
                                <label htmlFor={`reward-pkg-${pkg.id}`} className="text-sm cursor-pointer flex-1">
                                  <div className="font-medium">{pkg.name}</div>
                                  <div className="text-xs text-gray-500">
                                    <Car className="inline h-3 w-3 mr-1" />
                                    {pkg.vehicle_type} - ₹{pkg.unit_price}
                                  </div>
                                </label>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Select packages that customer receives as reward
                    </p>
                  </div>

                  {/* Reward Addons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Gift className="inline h-4 w-4 mr-1" />
                      Reward Addons (Customer gets free/discounted)
                    </label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-white shadow-xs">
                      {addons.length === 0 ? (
                        <p className="text-sm text-gray-500">No addons available</p>
                      ) : (
                        <div className="space-y-2">
                          {addons.map((addon) => (
                            <div key={addon.id} className="flex items-start space-x-2">
                              <Checkbox
                                id={`reward-addon-${addon.id}`}
                                checked={formData.reward_addon_ids.includes(addon.id)}
                                onCheckedChange={() => handleArrayChange('reward_addon_ids', addon.id)}
                              />
                              <label htmlFor={`reward-addon-${addon.id}`} className="text-sm cursor-pointer flex-1">
                                <div className="font-medium">{addon.name}</div>
                                <div className="text-xs text-gray-500">₹{addon.price}</div>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Select addons that customer receives as reward
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}


          {/* Settings */
          <Card className="p-6 mb-6 bg-white shadow-xs">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_stackable"
                  checked={formData.is_stackable}
                  onCheckedChange={(checked) => handleChange('is_stackable', checked)}
                />
                <label htmlFor="is_stackable" className="text-sm font-medium">
                  Stackable (Can be combined with other offers)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Active
                </label>
              </div>
            </div>
          </Card>}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/offers')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Update Offer' : 'Create Offer'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfferForm;
