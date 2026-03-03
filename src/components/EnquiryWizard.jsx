import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Badge2 } from './ui/badge2';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Sheet,
  SheetContent,
} from './ui/sheet';
import { toast } from 'sonner';
import useEnquiryStore from '../store/enquiryStore';
import customerService from '../services/customerService';
import orderService from '../services/orderService';
import CustomerForm from './CustomerForm';
import {
  SENTIMENT_OPTIONS,
  SENTIMENT_EMOJIS,
  SENTIMENT_LABELS,
  ENQUIRY_SOURCE_LABELS,
  ENQUIRY_STATUS_OPTIONS,
  ENQUIRY_STATUS_LABELS,
  LOST_REASON_OPTIONS,
  LOST_REASON_LABELS,
} from '../constants/enquiryConstants';
import { getVehicleTypes } from '../lib/vehicleData';
import { Loader2, User, Phone, MapPin, MessageSquare, Calendar, Bell, Plus, X, ArrowLeft, Check, Package, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Enquiry Wizard Component
 * Redesigned app-page-like form for creating new enquiries
 */
const EnquiryWizard = ({ open, onOpenChange, onSuccess }) => {
  const { createEnquiry, isLoading } = useEnquiryStore();

  // Customer search states
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerInitialData, setNewCustomerInitialData] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Packages and addons
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [vehicleType, setVehicleType] = useState('');
  
  // Confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const customerSearchRef = useRef(null);
  const customerFormRef = useRef(null);
  const phoneInputRef = useRef(null);

  // Quick select sources
  const QUICK_SOURCES = [
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'phone_call', label: 'Call', icon: Phone },
    { value: 'website', label: 'Website', icon: MapPin },
  ];

  // Form state
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_phone: '',
    source: 'whatsapp',
    sentiment: 'interested',
    status: 'new',
    lost_reason: '',
    area: '',
    requirements: '',
    preferred_date: '',
    needs_followup: false,
    followup_date: '',
  });

  // Fetch packages and addons
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [packagesRes, addonsRes] = await Promise.all([
          orderService.getPackages(),
          orderService.getAddons(),
        ]);
        setPackages(packagesRes.packages || packagesRes || []);
        setAddons(addonsRes.addons || addonsRes || []);
      } catch (error) {
        console.error('Error fetching packages/addons:', error);
      }
    };
    
    if (open) {
      fetchData();
    }
  }, [open]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Auto-focus on phone input
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    } else {
      setFormData({
        contact_name: '',
        contact_phone: '',
        source: 'whatsapp',
        sentiment: 'interested',
        status: 'contacted',
        lost_reason: '',
        area: '',
        requirements: '',
        preferred_date: '',
        needs_followup: false,
        followup_date: '',
      });
      setSelectedCustomer(null);
      setCustomers([]);
      setSelectedPackageIds([]);
      setSelectedAddonIds([]);
      setVehicleType('');
      setShowConfirmDialog(false);
    }
  }, [open]);

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Debounced customer search by phone - auto-assign when found
  useEffect(() => {
    if (!formData.contact_phone || formData.contact_phone.length < 3) {
      setCustomers([]);
      setShowCustomerSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const response = await customerService.getAllCustomers({
          search: formData.contact_phone,
          limit: 20,
        });
        const foundCustomers = response.customers || [];
        setCustomers(foundCustomers);
        
        // Auto-assign to first customer if exact phone match
        if (foundCustomers.length === 1) {
          const customer = foundCustomers[0];
          if (customer.phone === formData.contact_phone) {
            setSelectedCustomer(customer);
            setFormData(prev => ({
              ...prev,
              contact_name: customer.name || prev.contact_name,
              area: customer.area || prev.area,
            }));
            toast.success(`Auto-linked to ${customer.name}`);
            setShowCustomerSuggestions(false);
            return;
          }
        }
        
        setShowCustomerSuggestions(foundCustomers.length > 0);
      } catch (error) {
        console.error('Error searching customers:', error);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.contact_phone]);

  // Click outside handler for customer suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target)) {
        setShowCustomerSuggestions(false);
      }
    };

    if (showCustomerSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerSuggestions]);

  // Handle input change
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.contact_phone) {
      toast.error('Contact phone is required');
      return false;
    }
    if (!formData.source) {
      toast.error('Source is required');
      return false;
    }
    
    // Validate preferred date is future
    if (formData.preferred_date) {
      const preferredDate = new Date(formData.preferred_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (preferredDate < today) {
        toast.error('Preferred date must be in the future');
        return false;
      }
    }
    
    return true;
  };

  // Validate status and follow-up (in dialog)
  const validateStatusAndFollowup = () => {
    if (!formData.status) {
      toast.error('Status is required');
      return false;
    }
    
    // Validate lost reason if status is lost
    if (formData.status === 'lost' && !formData.lost_reason) {
      toast.error('Please select a reason for marking this enquiry as lost');
      return false;
    }
    
    // Validate follow-up date is future if required
    if (formData.needs_followup) {
      if (!formData.followup_date) {
        toast.error('Follow-up date is required when follow-up is needed');
        return false;
      }
      
      const followupDate = new Date(formData.followup_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (followupDate < today) {
        toast.error('Follow-up date must be in the future');
        return false;
      }
    }
    
    return true;
  };

  // Show confirmation dialog
  const handlePrepareSubmit = () => {
    if (!validateForm()) return;
    setShowConfirmDialog(true);
  };

  // Handle actual submit after confirmation
  const handleSubmit = async () => {
    // Validate status and follow-up in dialog
    if (!validateStatusAndFollowup()) return;
    
    setShowConfirmDialog(false);

    try {
      // Prepare requirements with packages and addons
      let requirementsText = formData.requirements || '';
      
      if (vehicleType) {
        requirementsText += `\n\nVehicle Type: ${vehicleType}`;
      }
      
      if (selectedPackageIds.length > 0) {
        const packageNames = selectedPackageIds
          .map(id => packages.find(p => p.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        requirementsText += `\n\nPackages: ${packageNames}`;
      }
      
      if (selectedAddonIds.length > 0) {
        const addonNames = selectedAddonIds
          .map(id => addons.find(a => a.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        requirementsText += `\n\nAdd-ons: ${addonNames}`;
      }
      
      // Prepare data for API
      const submitData = {
        ...formData,
        customer_id: selectedCustomer ? selectedCustomer.id : undefined,
        area: formData.area || undefined,
        requirements: requirementsText.trim() || undefined,
        preferred_date: formData.preferred_date || undefined,
        followup_date: (formData.needs_followup && formData.followup_date) ? formData.followup_date : undefined,
      };

      await createEnquiry(submitData);
      toast.success('Enquiry created successfully');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating enquiry:', error);
      toast.error(error.response?.data?.error || 'Failed to create enquiry');
    }
  };

  const WrapperComponent = isMobile ? Sheet : Dialog;
  const ContentComponent = isMobile ? SheetContent : DialogContent;

  return (
    <>
      <WrapperComponent open={open} onOpenChange={onOpenChange}>
        <ContentComponent 
          side={isMobile ? "bottom" : undefined}
          className={isMobile ? "h-full p-0 flex flex-col" : "max-w-2xl max-h-[90vh] flex flex-col p-0"}
        >
          {/* Header */}
          {isMobile ? (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-20 shadow-sm">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => onOpenChange(false)}
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                  <h2 className="font-bold text-lg leading-none">New Enquiry</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Track new lead</p>
                </div>
              </div>

              <Button
                onClick={handlePrepareSubmit}
                disabled={isLoading}
                className="px-6 h-9 rounded-full shadow-sm"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </div>
          ) : (
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>New Enquiry</DialogTitle>
              <DialogDescription>
                Create a new customer enquiry to track leads
              </DialogDescription>
            </DialogHeader>
          )}

          {/* Form Content */}
          <div className={isMobile ? "flex-1 overflow-y-auto p-4 pb-24 bg-gray-50" : "flex-1 overflow-y-auto px-6 py-4 space-y-6"}>
            {/* Mobile Number - Primary Field with Auto-focus */}
            <Card className={isMobile ? "p-4 bg-white" : "p-4"}>
              <div className="space-y-2" ref={customerSearchRef}>
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    ref={phoneInputRef}
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.contact_phone}
                    onChange={(e) => {
                      handleChange('contact_phone', e.target.value);
                      setSelectedCustomer(null);
                    }}
                    onFocus={() => {
                      if (formData.contact_phone.length >= 3 && customers.length > 0) {
                        setShowCustomerSuggestions(true);
                      }
                    }}
                    className={isMobile ? "text-base h-11" : ""}
                    required
                  />
                  {customerSearchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Customer Auto-Link Badge */}
                {selectedCustomer && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <Check className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">Linked to {selectedCustomer.name}</p>
                      <p className="text-xs text-green-700">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                )}

                {/* Customer Suggestions Dropdown */}
                {showCustomerSuggestions && customers.length > 0 && !selectedCustomer && (
                  <Card className="absolute bg-white z-50 w-full mt-1 max-h-48 overflow-y-auto shadow-lg border-2">
                    <div className="p-2 bg-muted/50 border-b">
                      <p className="text-xs text-muted-foreground font-medium">
                        {customers.length} customer{customers.length > 1 ? 's' : ''} found
                      </p>
                    </div>
                    <div className="py-1">
                      {customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-secondary active:bg-secondary/80 transition-all border-b last:border-b-0"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setFormData(prev => ({
                              ...prev,
                              contact_name: customer.name || prev.contact_name,
                              area: customer.area || prev.area,
                            }));
                            setShowCustomerSuggestions(false);
                            toast.success(`Linked to ${customer.name}`);
                          }}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {customer.phone}
                            {customer.area && (
                              <>
                                <span>•</span>
                                {customer.area}
                              </>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Create New Customer prompt */}
                {!customerSearchLoading && formData.contact_phone.length >= 3 && customers.length === 0 && !selectedCustomer && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">No customer found</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewCustomerInitialData({ phone: formData.contact_phone });
                        setShowCustomerForm(true);
                      }}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Create Customer
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium">
                  Customer Name <span className="text-muted-foreground">(Optional)</span>
                </label>
                <Input
                  placeholder="Enter name"
                  value={selectedCustomer ? selectedCustomer.name : formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  disabled={!!selectedCustomer}
                  className={isMobile ? "text-base h-11" : ""}
                />
              </div>
            </Card>

            {/* Source - Badge Radio Buttons */}
            <Card className={isMobile ? "p-4 bg-white" : "p-4"}>
              <label className="text-sm font-medium flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4" />
                Source <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_SOURCES.map((source) => {
                  const Icon = source.icon;
                  return (
                    <button
                      key={source.value}
                      type="button"
                      onClick={() => handleChange('source', source.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all ${
                        formData.source === source.value
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{source.label}</span>
                      {formData.source === source.value && <Check className="h-4 w-4 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Customer Sentiment - Badge Style */}
            <Card className={isMobile ? "p-4 bg-white" : "p-4"}>
              <label className="text-sm font-medium flex items-center gap-2 mb-3">
                Customer Sentiment
              </label>
              <div className="flex flex-wrap gap-2">
                {SENTIMENT_OPTIONS.map((sentiment) => {
                  const emoji = SENTIMENT_EMOJIS[sentiment.value];
                  return (
                    <button
                      key={sentiment.value}
                      type="button"
                      onClick={() => handleChange('sentiment', sentiment.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all ${
                        formData.sentiment === sentiment.value
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="text-base">{emoji}</span>
                      <span className="font-medium text-sm">{sentiment.label}</span>
                      {formData.sentiment === sentiment.value && <Check className="h-4 w-4 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Vehicle Type and Service Selection */}
            <Card className={isMobile ? "p-4 bg-white" : "p-4"}>
              <label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Package className="h-4 w-4" />
                Service Requirements <span className="text-muted-foreground">(Optional)</span>
              </label>

              {/* Vehicle Type */}
              <div className="space-y-2 mb-4">
                <label className="text-xs text-muted-foreground">Vehicle Type</label>
                <div className="flex flex-wrap gap-2">
                  {getVehicleTypes().map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setVehicleType(type === vehicleType ? '' : type);
                        // Clear package selection when vehicle type changes
                        if (type !== vehicleType) {
                          setSelectedPackageIds([]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-all ${
                        vehicleType === type
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Packages - Multi-select dropdown */}
              <div className="space-y-2 mb-4">
                <label className="text-xs text-muted-foreground">
                  {vehicleType ? `Packages (${vehicleType})` : 'Packages'}
                </label>
                <Select
                  value={selectedPackageIds[selectedPackageIds.length - 1]?.toString() || ''}
                  onValueChange={(value) => {
                    const packageId = parseInt(value);
                    if (!selectedPackageIds.includes(packageId)) {
                      setSelectedPackageIds(prev => [...prev, packageId]);
                    }
                  }}
                  disabled={!vehicleType}
                >
                  <SelectTrigger className={isMobile ? "h-11" : ""}>
                    <SelectValue placeholder={vehicleType ? "Select packages..." : "Select vehicle type first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {packages
                      .filter((p) => !vehicleType || p.vehicle_type?.toLowerCase() === vehicleType?.toLowerCase())
                      .map((pkg) => (
                        <SelectItem key={pkg.id} value={String(pkg.id)}>
                          {pkg.name} - ₹{pkg.unit_price || pkg.price || pkg.base_price}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                {/* Selected packages badges */}
                {selectedPackageIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedPackageIds.map((id) => {
                      const pkg = packages.find(p => p.id === id);
                      return pkg ? (
                        <Badge2 key={id} variant="default" className="text-xs gap-1">
                          {pkg.name}
                          <button
                            type="button"
                            onClick={() => setSelectedPackageIds(prev => prev.filter(pId => pId !== id))}
                            className="ml-1 hover:bg-white/20 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge2>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Add-ons - Multi-select dropdown */}
              <div className="space-y-2 mb-4">
                <label className="text-xs text-muted-foreground">Add-ons</label>
                <Select
                  value={selectedAddonIds[selectedAddonIds.length - 1]?.toString() || ''}
                  onValueChange={(value) => {
                    const addonId = parseInt(value);
                    if (!selectedAddonIds.includes(addonId)) {
                      setSelectedAddonIds(prev => [...prev, addonId]);
                    }
                  }}
                >
                  <SelectTrigger className={isMobile ? "h-11" : ""}>
                    <SelectValue placeholder="Select add-ons..." />
                  </SelectTrigger>
                  <SelectContent>
                    {addons.map((addon) => (
                      <SelectItem key={addon.id} value={String(addon.id)}>
                        {addon.name} - ₹{addon.unit_price || addon.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Selected addons badges */}
                {selectedAddonIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedAddonIds.map((id) => {
                      const addon = addons.find(a => a.id === id);
                      return addon ? (
                        <Badge2 key={id} variant="success" className="text-xs gap-1">
                          {addon.name}
                          <button
                            type="button"
                            onClick={() => setSelectedAddonIds(prev => prev.filter(aId => aId !== id))}
                            className="ml-1 hover:bg-white/20 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge2>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Additional Requirements */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Additional Requirements</label>
                <Textarea
                  placeholder="Any specific requirements or notes..."
                  value={formData.requirements}
                  onChange={(e) => handleChange('requirements', e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </Card>

            {/* Location */}
            <Card className={isMobile ? "p-4 bg-white" : "p-4"}>
              <label className="text-sm font-medium flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4" />
                Area <span className="text-muted-foreground">(Optional)</span>
              </label>
              <Input
                placeholder="E.g., Koramangala, Whitefield"
                value={formData.area}
                onChange={(e) => handleChange('area', e.target.value)}
                className={isMobile ? "text-base h-11" : ""}
              />
            </Card>

            {/* Preferred Service Date */}
            <Card className={isMobile ? "p-4 bg-white" : "p-4"}>
              <label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4" />
                Preferred Service Date <span className="text-muted-foreground">(Optional)</span>
              </label>
              <Input
                type="date"
                value={formData.preferred_date}
                onChange={(e) => handleChange('preferred_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={isMobile ? "text-base h-11" : ""}
              />
              <p className="text-xs text-muted-foreground mt-2">
                When would the customer prefer to have the service?
              </p>
            </Card>
          </div>

          {/* Desktop Footer Actions */}
          {!isMobile && (
            <div className="flex gap-2 justify-end pt-4 pb-6 px-6 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handlePrepareSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Enquiry
              </Button>
            </div>
          )}
        </ContentComponent>
      </WrapperComponent>

      {/* Before Submit Dialog - Status & Follow-up */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Enquiry Status & Follow-up
            </DialogTitle>
            <DialogDescription>
              Set the status and follow-up details before creating the enquiry
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Enquiry Status <span className="text-red-500">*</span>
              </label>
              <Select value={formData.status} onValueChange={(value) => {
                handleChange('status', value);
                if (value !== 'lost') {
                  handleChange('lost_reason', '');
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ENQUIRY_STATUS_OPTIONS.filter(s => s.value !== 'converted').map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lost Reason - Conditional */}
            {formData.status === 'lost' && (
              <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <label className="text-sm font-medium flex items-center gap-2 text-red-900">
                  <X className="h-4 w-4" />
                  Reason for Lost <span className="text-red-500">*</span>
                </label>
                <Select value={formData.lost_reason} onValueChange={(value) => handleChange('lost_reason', value)}>
                  <SelectTrigger className="border-red-300 bg-white">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOST_REASON_OPTIONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Follow-up Section */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Checkbox
                  id="dialog-followup"
                  checked={formData.needs_followup}
                  onCheckedChange={(checked) => {
                    handleChange('needs_followup', checked);
                    if (!checked) {
                      handleChange('followup_date', '');
                    }
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <label
                    htmlFor="dialog-followup"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Bell className="h-4 w-4" />
                    Requires Follow-up
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set a reminder to follow up with this enquiry
                  </p>
                </div>
              </div>

              {/* Follow-up Date */}
              {formData.needs_followup && (
                <div className="space-y-2 pl-3 border-l-2 border-amber-300">
                  <label className="text-xs font-medium text-amber-900">
                    Next Follow-up Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.followup_date}
                    onChange={(e) => handleChange('followup_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="border-amber-300"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isLoading}>
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Enquiry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Form Sheet - for creating new customers */}
      <Sheet open={showCustomerForm} onOpenChange={(open) => {
        setShowCustomerForm(open);
        if (!open) {
          setNewCustomerInitialData(null);
        }
      }}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={`w-full ${isMobile ? 'h-full' : 'sm:max-w-xl'} p-0 flex flex-col bg-gray-50 border-none z-50`}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setShowCustomerForm(false)}
              >
                {isMobile ? <ArrowLeft className="h-6 w-6" /> : <X className="h-5 w-5" />}
              </Button>
              <div>
                <h2 className="font-bold text-lg leading-none">Add Customer</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">New entry</p>
              </div>
            </div>

            <Button
              onClick={() => customerFormRef.current?.submit()}
              className="px-6 h-9 rounded-full shadow-sm"
            >
              Save
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-20">
            <CustomerForm
              ref={customerFormRef}
              customer={newCustomerInitialData}
              showActions={false}
              onSuccess={(newCustomer) => {
                setShowCustomerForm(false);
                setNewCustomerInitialData(null);
                // Auto-select the new customer
                if (newCustomer && newCustomer.customer) {
                  const customer = newCustomer.customer;
                  setSelectedCustomer({
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                  });
                  // Pre-fill form with customer data
                  setFormData(prev => ({
                    ...prev,
                    contact_name: customer.name || prev.contact_name,
                    contact_phone: customer.phone || prev.contact_phone,
                    area: customer.area || prev.area,
                  }));
                  // Add to customers list
                  setCustomers(prev => [...prev, customer]);
                  toast.success(`Customer created and linked: ${customer.name}`);
                }
              }}
              onCancel={() => {
                setShowCustomerForm(false);
                setNewCustomerInitialData(null);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default EnquiryWizard;
