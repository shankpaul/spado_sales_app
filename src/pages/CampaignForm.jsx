import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Gift,
  Tag,
  Calendar,
  Building,
  Users,
  ArrowLeft,
  Loader2,
  FileText,
  Edit,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/dialog';
import campaignService from '../services/campaignService';
import officeService from '../services/officeService';
import offerService from '../services/offerService';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { toast } from 'sonner';

export default function CampaignForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offers, setOffers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [partners, setPartners] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    offer_id: '',
    campaign_type: 'Supermarket',
    start_date: '',
    end_date: '',
    status: 'draft',
    notes: '',
    service_location_ids: [],
    partner_ids: [],
    coupons_to_generate: 100,
    coupon_code_format: '{LocationCode}{PartnerCode}{CampaignCode}-{Random}',
    code_type: 'alphanumeric', // 'alphanumeric', 'numeric', 'alphabetic'
    generation_mode: 'random', // 'random', 'series'
    random_code_length: 7,
    starting_number: 1001,
    allowed_uses_per_coupon: 1,
    coupon_expiry_date: '',
    coupons_per_customer: 1,
    max_redemptions: '',
  });

  const [errors, setErrors] = useState({});
  const [qtyMode, setQtyMode] = useState('per_combination');
  const [totalQtyInput, setTotalQtyInput] = useState(100);

  // Calculate maximum capacity for series generation considering starting number
  const getMaxSeriesCapacity = (codeType, length, startingNumber) => {
    const len = parseInt(length, 10) || 5;
    if (codeType === 'numeric') {
      const maxVal = Math.pow(10, len);
      const startNum = parseInt(startingNumber, 10) || 0;
      return Math.max(0, maxVal - startNum);
    } else if (codeType === 'alphabetic') {
      return Math.pow(26, len);
    } else {
      return Math.pow(36, len);
    }
  };

  useEffect(() => {
    if (qtyMode === 'total_global') {
      const combs = (formData.service_location_ids.length || 1) * (formData.partner_ids.length || 1);
      const calculatedQty = Math.max(1, Math.floor(totalQtyInput / combs));
      setFormData(prev => ({ ...prev, coupons_to_generate: calculatedQty }));
    }
  }, [formData.service_location_ids, formData.partner_ids, qtyMode, totalQtyInput]);

  const [chips, setChips] = useState([]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [customText, setCustomText] = useState('');
  const [isFormatBuilderOpen, setIsFormatBuilderOpen] = useState(false);

  // Parse format string to chips helper
  const parseFormatToChips = (formatStr) => {
    if (!formatStr) return [];
    const regex = /(\{[a-zA-Z]+\}|[^{}]+)/g;
    const matches = formatStr.match(regex) || [];
    return matches.map((val, idx) => ({
      id: `${val}_${idx}`,
      value: val,
      isToken: val.startsWith('{') && val.endsWith('}')
    }));
  };

  // Sync initial or loaded format to chips
  useEffect(() => {
    if (formData.coupon_code_format && chips.length === 0) {
      setChips(parseFormatToChips(formData.coupon_code_format));
    }
  }, [formData.coupon_code_format]);

  const updateFormatFromChips = (newChips) => {
    const formatStr = newChips.map(c => c.value).join('');
    setFormData(prev => ({ ...prev, coupon_code_format: formatStr }));
  };

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const newChips = [...chips];
    const draggedItem = newChips[draggedIdx];
    newChips.splice(draggedIdx, 1);
    newChips.splice(index, 0, draggedItem);
    
    const formattedChips = newChips.map((c, idx) => ({
      id: `${c.value}_${idx}`,
      value: c.value,
      isToken: c.isToken
    }));

    setChips(formattedChips);
    updateFormatFromChips(formattedChips);
    setDraggedIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleRemoveChip = (index) => {
    const newChips = chips.filter((_, idx) => idx !== index);
    const formattedChips = newChips.map((c, idx) => ({
      id: `${c.value}_${idx}`,
      value: c.value,
      isToken: c.isToken
    }));
    setChips(formattedChips);
    updateFormatFromChips(formattedChips);
  };

  const handleAddToken = (tokenValue) => {
    if (tokenValue === '{Random}' && chips.some(c => c.value === '{Random}')) {
      toast.warning('Random token is already added');
      return;
    }
    const newChips = [...chips, {
      id: `${tokenValue}_${chips.length}`,
      value: tokenValue,
      isToken: true
    }];
    setChips(newChips);
    updateFormatFromChips(newChips);
  };

  const handleAddCustomText = () => {
    if (!customText.trim()) return;
    const newChips = [...chips, {
      id: `${customText}_${chips.length}`,
      value: customText,
      isToken: false
    }];
    setChips(newChips);
    updateFormatFromChips(newChips);
    setCustomText('');
  };

  useEffect(() => {
    loadDependencies();
    if (isEditMode) {
      loadCampaign();
    }
  }, [id]);

  const loadDependencies = async () => {
    try {
      // Load active offers
      const offersRes = await offerService.getActiveOffers();
      setOffers(offersRes.data || []);

      // Load active offices/locations
      const officesRes = await officeService.getAllOffices(true);
      setOffices(officesRes.offices || []);

      // Load active partners
      const partnersRes = await campaignService.getAllPartners({ active_only: true });
      setPartners(partnersRes.data || []);
    } catch (error) {
      toast.error('Failed to load form setup options');
    }
  };

  const [canEditConfig, setCanEditConfig] = useState(true);
  const [initialConfig, setInitialConfig] = useState(null);

  const loadCampaign = async () => {
    setLoading(true);
    try {
      const response = await campaignService.getCampaignById(id);
      // Deep unwrap API response structure (handles { data: { data: ... } }, { data: { campaign: ... } }, { data: ... }, or direct object)
      const camp = response?.data?.data || response?.data?.campaign || response?.data || response?.campaign || response || {};
      const configObj = camp.coupon_config || camp.config || camp.configuration || camp;

      const loadedFormat = camp.coupon_code_format || configObj.coupon_code_format || configObj.format || '';
      const loadedCodeType = camp.code_type || camp.coupon_code_type || configObj.code_type || configObj.coupon_code_type || 'alphanumeric';
      const loadedGenMode = camp.generation_mode || camp.generation_strategy || camp.strategy || configObj.generation_mode || configObj.generation_strategy || configObj.strategy || 'random';
      const loadedCodeLength = parseInt(camp.random_code_length || camp.code_length || camp.length || configObj.random_code_length || configObj.code_length || configObj.length || 7, 10);
      const loadedStartingNumber = parseInt(camp.starting_number || configObj.starting_number || 1001, 10);

      setInitialConfig({
        coupon_code_format: loadedFormat,
        code_type: loadedCodeType,
        generation_mode: loadedGenMode,
        random_code_length: loadedCodeLength,
        starting_number: loadedStartingNumber,
      });

      // Check if all generated coupons are unused (status: created or cancelled)
      try {
        const couponsRes = await campaignService.getAllCoupons({ campaign_id: id, per_page: 100 });
        const couponsList = couponsRes?.data?.data || couponsRes?.data || couponsRes || [];
        const hasUsed = Array.isArray(couponsList) && couponsList.some(c => c.status !== 'created' && c.status !== 'cancelled');
        setCanEditConfig(!hasUsed);
      } catch (err) {
        setCanEditConfig(true);
      }
      
      setFormData({
        name: camp.name || '',
        code: camp.code || '',
        description: camp.description || '',
        offer_id: camp.offer_id || '',
        campaign_type: camp.campaign_type || 'general',
        start_date: camp.start_date ? String(camp.start_date).split('T')[0] : '',
        end_date: camp.end_date ? String(camp.end_date).split('T')[0] : '',
        status: camp.status || 'draft',
        notes: camp.notes || '',
        service_location_ids: camp.service_locations?.map(o => o.id) || camp.service_location_ids || [],
        partner_ids: camp.partners?.map(p => p.id) || camp.partner_ids || [],
        coupons_to_generate: camp.coupons_to_generate || camp.total_coupons || 0,
        coupon_code_format: loadedFormat,
        code_type: loadedCodeType,
        generation_mode: loadedGenMode,
        random_code_length: loadedCodeLength,
        starting_number: loadedStartingNumber,
        allowed_uses_per_coupon: camp.allowed_uses_per_coupon || 1,
        coupon_expiry_date: camp.coupon_expiry_date ? String(camp.coupon_expiry_date).split('T')[0] : '',
        coupons_per_customer: camp.coupons_per_customer || 1,
        max_redemptions: camp.max_redemptions || '',
      });
    } catch (error) {
      toast.error('Failed to load campaign data');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const hasConfigChanged = () => {
    if (!initialConfig) return false;
    return (
      String(formData.coupon_code_format || '') !== String(initialConfig.coupon_code_format || '') ||
      String(formData.code_type || '') !== String(initialConfig.code_type || '') ||
      String(formData.generation_mode || '') !== String(initialConfig.generation_mode || '') ||
      parseInt(formData.random_code_length, 10) !== parseInt(initialConfig.random_code_length, 10) ||
      parseInt(formData.starting_number, 10) !== parseInt(initialConfig.starting_number, 10)
    );
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'code_type' && value !== 'numeric' && next.generation_mode === 'series') {
        next.generation_mode = 'random';
      }
      return next;
    });
  };

  const handleToggleSelect = (field, itemID) => {
    setFormData(prev => {
      const currentList = prev[field] || [];
      const updated = currentList.includes(itemID)
        ? currentList.filter(id => id !== itemID)
        : [...currentList, itemID];
      return { ...prev, [field]: updated };
    });
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name) errs.name = 'Campaign name is required';
    if (!formData.code) errs.code = 'Campaign code is required';
    if (!formData.offer_id) errs.offer_id = 'Linked offer is required';
    if (!formData.start_date) errs.start_date = 'Start date is required';
    if (!formData.end_date) errs.end_date = 'End date is required';
    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      errs.end_date = 'End date must be after start date';
    }
    if (formData.service_location_ids.length === 0) {
      errs.service_location_ids = 'Select at least one service location';
    }
    if (formData.partner_ids.length === 0) {
      errs.partner_ids = 'Select at least one campaign partner';
    }
    if (!isEditMode && (!formData.coupons_to_generate || formData.coupons_to_generate <= 0)) {
      errs.coupons_to_generate = 'Must generate at least 1 coupon';
    }

    // Numeric starting number vs Value length validation check
    if (formData.code_type === 'numeric') {
      const startNum = parseInt(formData.starting_number, 10);
      const len = parseInt(formData.random_code_length, 10) || 7;
      
      if (!formData.starting_number || isNaN(startNum) || startNum < 1) {
        errs.starting_number = 'Starting number must be at least 1';
      } else {
        const numDigits = String(startNum).length;
        if (numDigits > len) {
          errs.starting_number = `Mismatch: Starting number (${startNum.toLocaleString()}) has ${numDigits} digits, which exceeds selected value length of ${len} char${len > 1 ? 's' : ''}.`;
          errs.random_code_length = `Value length (${len}) is too short for starting number ${startNum.toLocaleString()} (${numDigits} digits).`;
        }
      }
    }

    // Series capacity validation check
    const maxCap = getMaxSeriesCapacity(formData.code_type, formData.random_code_length, formData.starting_number);
    if (!isEditMode && formData.coupons_to_generate > maxCap) {
      errs.coupons_to_generate = `Exceeds max capacity (${maxCap.toLocaleString()} codes) for length ${formData.random_code_length}${formData.code_type === 'numeric' && formData.starting_number ? ` starting at ${formData.starting_number}` : ''}.`;
      if (!errs.random_code_length) {
        errs.random_code_length = `Max remaining capacity for length ${formData.random_code_length} is ${maxCap.toLocaleString()} codes. Increase length or switch to Random mode.`;
      }
    }

    if (!formData.coupon_code_format) {
      errs.coupon_code_format = 'Format template is required';
    } else if (!isEditMode && !formData.coupon_code_format.includes('{Random}')) {
      errs.coupon_code_format = 'Format template must contain the "{Random}" placeholder to ensure unique codes';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState(null);

  const formatSafeDate = (d, isEnd = false) => {
    if (!d) return null;
    const cleanStr = String(d).split('T')[0];
    return isEnd ? `${cleanStr}T23:59:59+05:30` : `${cleanStr}T00:00:00+05:30`;
  };

  const executeSaveCampaign = async (payloadToSave = pendingSavePayload, shouldRegenerate = false) => {
    const targetPayload = payloadToSave || pendingSavePayload;
    if (!targetPayload) {
      toast.error('No campaign data to save');
      return;
    }
    setSaving(true);
    try {
      if (isEditMode) {
        if (!canEditConfig) {
          const { coupons_to_generate, coupon_code_format, random_code_length, code_length, code_type, coupon_code_type, generation_mode, generation_strategy, starting_number, ...updatePayload } = targetPayload;
          await campaignService.updateCampaign(id, updatePayload);
        } else {
          const { coupons_to_generate, ...updatePayload } = targetPayload;
          await campaignService.updateCampaign(id, {
            ...updatePayload,
            code_type: targetPayload.code_type,
            coupon_code_type: targetPayload.code_type,
            generation_mode: targetPayload.generation_mode,
            generation_strategy: targetPayload.generation_mode,
            random_code_length: parseInt(targetPayload.random_code_length, 10),
            code_length: parseInt(targetPayload.random_code_length, 10),
            starting_number: targetPayload.code_type === 'numeric' && targetPayload.starting_number ? parseInt(targetPayload.starting_number, 10) : null,
            regenerate_unused_coupons: shouldRegenerate,
          });
        }
        toast.success(shouldRegenerate ? 'Campaign and unused coupons updated successfully' : 'Campaign updated successfully');
      } else {
        await campaignService.createCampaign({
          ...targetPayload,
          coupon_code_type: targetPayload.code_type,
          generation_strategy: targetPayload.generation_mode,
          code_length: parseInt(targetPayload.random_code_length, 10),
          starting_number: targetPayload.code_type === 'numeric' && targetPayload.starting_number ? parseInt(targetPayload.starting_number, 10) : null,
        });
        toast.success('Campaign created and coupons generated successfully');
      }
      setIsRegenerateConfirmOpen(false);
      navigate('/campaigns');
    } catch (error) {
      const msg = error.response?.data?.errors?.[0] || error.response?.data?.message || 'Failed to save campaign';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    // Format start/end dates safely
    const payload = {
      ...formData,
      offer_id: parseInt(formData.offer_id, 10),
      coupons_to_generate: parseInt(formData.coupons_to_generate, 10),
      random_code_length: parseInt(formData.random_code_length, 10),
      allowed_uses_per_coupon: parseInt(formData.allowed_uses_per_coupon, 10),
      coupons_per_customer: parseInt(formData.coupons_per_customer, 10),
      max_redemptions: formData.max_redemptions ? parseInt(formData.max_redemptions, 10) : null,
      start_date: formatSafeDate(formData.start_date, false),
      end_date: formatSafeDate(formData.end_date, true),
      coupon_expiry_date: formatSafeDate(formData.coupon_expiry_date, true),
    };

    if (isEditMode && canEditConfig && hasConfigChanged()) {
      setPendingSavePayload(payload);
      setIsRegenerateConfirmOpen(true);
    } else {
      await executeSaveCampaign(payload, false);
    }
  };

  // Helper preview generator
  const getPreviewCode = () => {
    const loc = offices.find(o => formData.service_location_ids.includes(o.id))?.code || 'T';
    const part = partners.find(p => formData.partner_ids.includes(p.id))?.code || 'C';

    let sampleVal = '';
    const len = formData.random_code_length || 7;
    const startNum = parseInt(formData.starting_number, 10) || 1001;
    if (formData.generation_mode === 'series') {
      sampleVal = String(startNum).padStart(len, '0');
    } else {
      if (formData.code_type === 'numeric') {
        sampleVal = String(startNum).padStart(len, '0');
      } else if (formData.code_type === 'alphabetic') {
        sampleVal = 'KWMXPTQABZ'.slice(0, len).padEnd(len, 'X');
      } else {
        sampleVal = 'A9F37B2C8D'.slice(0, len).padEnd(len, 'X');
      }
    }
    
    let format = formData.coupon_code_format || '{LocationCode}{PartnerCode}{CampaignCode}-{Random}';
    format = format.replace('{LocationCode}', loc);
    format = format.replace('{PartnerCode}', part);
    format = format.replace('{CampaignCode}', formData.code || '01');
    format = format.replace('{BatchNumber}', '1');
    format = format.replace('{Random}', sampleVal);
    
    return format;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/campaigns')} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            {isEditMode ? 'Edit Campaign' : 'Create New Campaign'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditMode ? 'Modify promotional rules and scope' : 'Initialize a marketing campaign and generate unique coupon codes'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Info Card */}
        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardHeader className="border-b border-gray-50 pb-3">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" /> Campaign General Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Lulu Diwali Dhamaka"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                <p className="text-[10px] text-gray-400">Name of the promotional initiative.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="code">Campaign Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  placeholder="e.g. DIWALI (Uppercase, letters/numbers only)"
                  disabled={isEditMode}
                />
                {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
                <p className="text-[10px] text-gray-400">Short unique code (e.g., DW02) used in the code format template.</p>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={2}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Details of the marketing initiative..."
                className="w-full text-sm border border-gray-200 rounded-md p-2 bg-white"
              />
              <p className="text-[10px] text-gray-400">Internal notes on this marketing effort and channels.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="offer_id">Linked Offer *</Label>
                <select
                  id="offer_id"
                  value={formData.offer_id}
                  onChange={(e) => handleInputChange('offer_id', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-md p-2 bg-white h-10"
                >
                  <option value="">-- Select Active Offer --</option>
                  {offers.map(off => (
                    <option key={off.id} value={off.id}>
                      {off.name} (Value: {off.discount_value})
                    </option>
                  ))}
                </select>
                {errors.offer_id && <p className="text-xs text-red-500">{errors.offer_id}</p>}
                <p className="text-[10px] text-gray-400">Offer benefits applied when coupon is validated.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="campaign_type">Campaign Type</Label>
                <select
                  id="campaign_type"
                  value={formData.campaign_type}
                  onChange={(e) => handleInputChange('campaign_type', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-md p-2 bg-white h-10"
                >
                  <option value="Supermarket">Supermarket Promotion</option>
                  <option value="Apartment">Apartment Promotion</option>
                  <option value="Corporate">Corporate Promotion</option>
                  <option value="Fuel Station">Fuel Station Promotion</option>
                  <option value="Event">Event Promotion</option>
                </select>
                <p className="text-[10px] text-gray-400">Promotional category for sorting and reports.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-md p-2 bg-white h-10"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="expired">Expired</option>
                  <option value="archived">Archived</option>
                </select>
                <p className="text-[10px] text-gray-400">Coupons can only be redeemed under Active status.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                />
                {errors.start_date && <p className="text-xs text-red-500">{errors.start_date}</p>}
                <p className="text-[10px] text-gray-400">Start of validation timeframe.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                />
                {errors.end_date && <p className="text-xs text-red-500">{errors.end_date}</p>}
                <p className="text-[10px] text-gray-400">End of validation timeframe.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scope Card (Locations & Partners) */}
        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardHeader className="border-b border-gray-50 pb-3">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" /> Target Locations & Partners
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Service Locations (Offices) *</Label>
              <p className="text-[10px] text-gray-400 -mt-1">Locations where the generated coupons will be accepted for booking.</p>
              {errors.service_location_ids && <p className="text-xs text-red-500">{errors.service_location_ids}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {offices.map(o => (
                  <div 
                    key={o.id}
                    onClick={() => handleToggleSelect('service_location_ids', o.id)}
                    className={`border rounded-lg p-3 cursor-pointer text-center select-none transition-all ${
                      formData.service_location_ids.includes(o.id)
                        ? 'border-primary bg-primary/5 text-primary font-bold'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-sm">{o.name}</div>
                    <div className="text-[10px] uppercase tracking-wider font-mono text-gray-400 mt-0.5">[{o.code || 'NO CODE'}]</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Campaign Partners *</Label>
              <p className="text-[10px] text-gray-400 -mt-1">Partners distributing coupons. Selected partners code prefixes will format coupon codes.</p>
              {errors.partner_ids && <p className="text-xs text-red-500">{errors.partner_ids}</p>}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {partners.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => handleToggleSelect('partner_ids', p.id)}
                    className={`border rounded-lg p-3 cursor-pointer select-none transition-all ${
                      formData.partner_ids.includes(p.id)
                        ? 'border-primary bg-primary/5 text-primary font-bold'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Code: {p.code}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coupons Config Card - Disable editing coupon generation configs as they cannot be updated after create */}
        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardHeader className="border-b border-gray-50 pb-3">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" /> Coupon Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {isEditMode && !canEditConfig && (
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 font-medium">
                🔒 Coupon Configuration parameters (Format, Type, Strategy, Length) are locked because some coupons in this campaign have already been distributed, activated, or redeemed.
              </div>
            )}
            {(!isEditMode || canEditConfig) && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="qty_mode">Coupon Quantity Input Mode</Label>
                    <select
                      id="qty_mode"
                      value={qtyMode}
                      onChange={(e) => {
                        setQtyMode(e.target.value);
                        if (e.target.value === 'total_global') {
                          const combs = (formData.service_location_ids.length || 1) * (formData.partner_ids.length || 1);
                          setTotalQtyInput(formData.coupons_to_generate * combs);
                        } else {
                          const combs = (formData.service_location_ids.length || 1) * (formData.partner_ids.length || 1);
                          handleInputChange('coupons_to_generate', Math.max(1, Math.floor(totalQtyInput / combs)));
                        }
                      }}
                      className="w-full text-sm border border-gray-200 rounded-md p-2 bg-white h-10"
                    >
                      <option value="per_combination">Quantity Per Combination (Location × Partner)</option>
                      <option value="total_global">Total Quantity (Distributed equally)</option>
                    </select>
                    <p className="text-[10px] text-gray-400">Choose how you specify the number of generated coupons.</p>
                  </div>

                  {qtyMode === 'per_combination' ? (
                    <div className="space-y-1">
                      <Label htmlFor="coupons_to_generate">Coupons to Generate *</Label>
                      <Input
                        id="coupons_to_generate"
                        type="number"
                        min="1"
                        value={formData.coupons_to_generate}
                        onChange={(e) => handleInputChange('coupons_to_generate', parseInt(e.target.value) || 0)}
                      />
                      {errors.coupons_to_generate && <p className="text-xs text-red-500 font-semibold">{errors.coupons_to_generate}</p>}
                      <p className="text-[10px] text-gray-400">Number of codes generated per Location-Partner combination.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor="total_qty_input">Total Coupons to Generate *</Label>
                      <Input
                        id="total_qty_input"
                        type="number"
                        min="1"
                        value={totalQtyInput}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setTotalQtyInput(val);
                          const combs = (formData.service_location_ids.length || 1) * (formData.partner_ids.length || 1);
                          const calculatedQty = Math.max(1, Math.floor(val / combs));
                          handleInputChange('coupons_to_generate', calculatedQty);
                        }}
                      />
                      {errors.coupons_to_generate && <p className="text-xs text-red-500 font-semibold">{errors.coupons_to_generate}</p>}
                      <p className="text-[10px] text-gray-400">Total target codes. Each combination gets {Math.max(1, Math.floor(totalQtyInput / ((formData.service_location_ids.length || 1) * (formData.partner_ids.length || 1))))} codes.</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="code_type">Coupon Code Type</Label>
                    <select
                      id="code_type"
                      value={formData.code_type}
                      onChange={(e) => handleInputChange('code_type', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-md p-2 bg-white h-10"
                    >
                      <option value="alphanumeric">Alphanumeric (Letters & Numbers)</option>
                      <option value="numeric">Numeric (Numbers Only: 0-9)</option>
                      <option value="alphabetic">Alphabetic (Letters Only: A-Z)</option>
                    </select>
                    <p className="text-[10px] text-gray-400">Allowed character set for generated token.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="generation_mode">Generation Strategy</Label>
                    <select
                      id="generation_mode"
                      value={formData.generation_mode}
                      onChange={(e) => handleInputChange('generation_mode', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-md p-2 bg-white h-10"
                    >
                      <option value="random">Random (Unique Random Characters)</option>
                      <option value="series" disabled={formData.code_type !== 'numeric'}>
                        Sequential Series {formData.code_type !== 'numeric' ? '(Numeric Code Type Only)' : '(Starts at 101, 1001...)'}
                      </option>
                    </select>
                    <p className="text-[10px] text-gray-400">
                      {formData.code_type !== 'numeric'
                        ? 'Sequential series is only available for Numeric code type. Random mode enabled.'
                        : formData.generation_mode === 'series'
                          ? 'Series numbers start with starting number. Re-generating batches continues the sequence.'
                          : 'Choose between random codes or sequential series numbering.'
                      }
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="starting_number" className={`text-sm ${formData.code_type !== 'numeric' ? 'text-gray-400' : ''}`}>
                      Starting Number {formData.code_type === 'numeric' ? '*' : ''}
                    </Label>
                    <Input
                      id="starting_number"
                      type="number"
                      min="1"
                      value={formData.starting_number}
                      onChange={(e) => handleInputChange('starting_number', e.target.value ? parseInt(e.target.value, 10) : '')}
                      placeholder={formData.code_type === 'numeric' ? 'e.g. 1001' : 'Numeric type only'}
                      disabled={formData.code_type !== 'numeric' || (isEditMode && !canEditConfig)}
                      className={formData.code_type !== 'numeric' ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : ''}
                    />
                    {errors.starting_number && formData.code_type === 'numeric' ? (
                      <p className="text-xs text-red-500 font-semibold">{errors.starting_number}</p>
                    ) : (
                      <p className="text-[10px] text-gray-400">
                        {formData.code_type === 'numeric'
                          ? `Initial number. Remaining capacity for length ${formData.random_code_length}: ${getMaxSeriesCapacity('numeric', formData.random_code_length, formData.starting_number).toLocaleString()} codes.`
                          : 'Only enabled when Coupon Code Type is set to Numeric.'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="random_code_length">Value Length (Characters)</Label>
                    <select
                      id="random_code_length"
                      value={formData.random_code_length}
                      onChange={(e) => handleInputChange('random_code_length', parseInt(e.target.value) || 7)}
                      className="w-full text-sm border border-gray-200 rounded-md p-2 bg-white h-10"
                    >
                      <option value="3">3 Characters</option>
                      <option value="4">4 Characters</option>
                      <option value="5">5 Characters</option>
                      <option value="6">6 Characters</option>
                      <option value="7">7 Characters</option>
                      <option value="8">8 Characters</option>
                      <option value="9">9 Characters</option>
                      <option value="10">10 Characters</option>
                    </select>
                    {errors.random_code_length ? (
                      <p className="text-xs text-red-500 font-semibold">{errors.random_code_length}</p>
                    ) : (
                      <p className="text-[10px] text-gray-400">
                        Max Capacity ({formData.code_type}): <span className="font-semibold text-gray-700">{getMaxSeriesCapacity(formData.code_type, formData.random_code_length, formData.starting_number).toLocaleString()}</span> codes.
                      </p>
                    )}
                  </div>
                </div>

                {/* Generated Preview Card and Edit Button */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="space-y-1 flex-1">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Generated Code Preview</div>
                    <div className="text-lg font-mono font-bold text-gray-800">
                      {getPreviewCode()}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Format Template: <span className="font-mono bg-white px-1.5 py-0.5 border rounded border-gray-200 text-primary font-bold">{formData.coupon_code_format || 'None'}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      This will generate a total of <span className="font-bold text-primary">{(formData.coupons_to_generate * (formData.service_location_ids.length || 0) * (formData.partner_ids.length || 0)) || 0}</span> unique coupon codes ({formData.coupons_to_generate} per location-partner combination).
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormatBuilderOpen(true)}
                    className="flex items-center gap-2 text-xs h-9 font-semibold shrink-0 shadow-2xs hover:bg-white bg-gray-50 border-gray-300 text-primary hover:text-primary/95"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit Format Template
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label htmlFor="allowed_uses_per_coupon" className="whitespace-nowrap text-xs font-semibold">Uses Per Coupon</Label>
                <Input
                  id="allowed_uses_per_coupon"
                  type="number"
                  min="1"
                  value={formData.allowed_uses_per_coupon}
                  onChange={(e) => handleInputChange('allowed_uses_per_coupon', parseInt(e.target.value) || 1)}
                />
                <p className="text-[9px] text-gray-400">Total redemptions allowed per code (e.g., set to 3 to allow 3 uses).</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="coupons_per_customer" className="whitespace-nowrap text-xs font-semibold">Coupons Per Customer</Label>
                <Input
                  id="coupons_per_customer"
                  type="number"
                  min="1"
                  value={formData.coupons_per_customer}
                  onChange={(e) => handleInputChange('coupons_per_customer', parseInt(e.target.value) || 1)}
                />
                <p className="text-[9px] text-gray-400">Max unique coupon codes a customer phone can activate.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="max_redemptions" className="whitespace-nowrap text-xs font-semibold">Max Campaign Redemptions</Label>
                <Input
                  id="max_redemptions"
                  type="number"
                  min="1"
                  value={formData.max_redemptions}
                  onChange={(e) => handleInputChange('max_redemptions', e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Optional"
                />
                <p className="text-[9px] text-gray-400">Limit across all coupon codes. Leave blank for unlimited.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="coupon_expiry_date" className="whitespace-nowrap text-xs font-semibold">Coupon Expiry Date</Label>
                <Input
                  id="coupon_expiry_date"
                  type="date"
                  value={formData.coupon_expiry_date}
                  onChange={(e) => handleInputChange('coupon_expiry_date', e.target.value)}
                />
                <p className="text-[9px] text-gray-400">Expiry date override. Overrides campaign end date.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card className="bg-white border border-gray-100 shadow-xs">
          <CardContent className="pt-4 space-y-2">
            <Label htmlFor="notes">Notes / Terms & Conditions</Label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Terms and conditions, details about the discount distribution..."
              className="w-full text-sm border border-gray-200 rounded-md p-2 bg-white"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/campaigns')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium hover:shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isEditMode ? 'Update Campaign' : 'Save & Generate Coupons'}
          </Button>
        </div>
      </form>

      {/* Coupon Code Format Builder Modal */}
      <Dialog open={isFormatBuilderOpen} onOpenChange={setIsFormatBuilderOpen}>
        <DialogContent className="max-w-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" /> Coupon Code Format Builder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-gray-500">Drag to reorder, click available tags to add, or insert custom separators to design your coupon pattern.</p>
            
            {/* Live Preview Box inside Dialog */}
            <div className="p-3.5 bg-primary/5 border border-primary/10 rounded-xl space-y-1">
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Live Generated Code Preview</div>
              <div className="text-lg font-mono font-bold text-gray-800">
                {getPreviewCode()}
              </div>
              <div className="text-[10px] text-gray-500">
                Template string: <span className="font-mono text-gray-700 bg-white border px-1 rounded border-gray-100">{formData.coupon_code_format || 'None'}</span>
              </div>
            </div>

            {/* Active Chips Area */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Active Code Layout Structure</Label>
              <div 
                className="min-h-12 flex flex-wrap items-center gap-1.5 p-2.5 bg-white border border-dashed border-gray-300 rounded-lg"
              >
                {chips.length === 0 ? (
                  <span className="text-xs text-gray-400 italic px-2">No tokens added. Click available tags below.</span>
                ) : (
                  chips.map((chip, idx) => (
                    <div
                      key={chip.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md cursor-grab active:cursor-grabbing select-none transition-all shadow-xs border ${
                        chip.isToken 
                          ? 'bg-primary/10 text-primary border-primary/20 font-semibold' 
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      } ${draggedIdx === idx ? 'opacity-40 scale-95 border-dashed border-gray-400' : ''}`}
                    >
                      <span className="font-mono">{chip.value}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChip(idx)}
                        className="hover:bg-black/10 rounded-full p-0.5 ml-1 transition-colors text-[10px] h-4 w-4 flex items-center justify-center font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Available Tokens Row */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Available Tags:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '{LocationCode}', desc: 'e.g. BLR' },
                  { label: '{PartnerCode}', desc: 'e.g. CR1' },
                  { label: '{CampaignCode}', desc: 'e.g. DW02' },
                  { label: '{BatchNumber}', desc: 'e.g. 01' },
                  { label: '{Random}', desc: 'e.g. A9F37' }
                ].map((t) => (
                  <button
                    key={t.label}
                    type="button; button"
                    onClick={() => handleAddToken(t.label)}
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 px-2 py-1 rounded border border-gray-200 shadow-2xs hover:border-gray-300 transition-all flex flex-col items-center"
                    title={t.desc}
                  >
                    <span className="font-mono font-semibold text-primary">{t.label}</span>
                    <span className="text-[8px] text-gray-400 font-normal">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Separator Appender */}
            <div className="flex items-center gap-2 max-w-xs pt-1">
              <Input
                placeholder="Custom text (e.g. -, _)"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="h-8 text-xs font-mono"
                maxLength={10}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCustomText}
                className="h-8 text-xs shrink-0 px-3 hover:bg-gray-50"
              >
                Add Custom
              </Button>
            </div>

            {/* Manual Backup Input */}
            <div className="pt-2 border-t border-gray-100 space-y-1">
              <Label htmlFor="coupon_code_format" className="text-[10px] text-gray-400">Template String (Calculated Format)</Label>
              <Input
                id="coupon_code_format"
                value={formData.coupon_code_format}
                onChange={(e) => handleInputChange('coupon_code_format', e.target.value)}
                placeholder="{LocationCode}{PartnerCode}{CampaignCode}-{Random}"
                className="h-8 font-mono text-xs"
              />
              {errors.coupon_code_format && <p className="text-xs text-red-500">{errors.coupon_code_format}</p>}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-gray-50">
            <Button type="button" onClick={() => setIsFormatBuilderOpen(false)} className="bg-primary text-primary-foreground font-semibold px-4">
              Apply Format
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog when updating modified coupon configuration */}
      <Dialog open={isRegenerateConfirmOpen} onOpenChange={(open) => { if (!saving) setIsRegenerateConfirmOpen(open); }}>
        <DialogContent className="max-w-lg rounded-xl p-5 sm:p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-gray-800">
              <RefreshCw className="h-5 w-5 text-red-500 shrink-0" /> Modify Coupon Configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs sm:text-sm text-gray-600">
            <p>
              You modified the coupon code configuration (format template, code type, strategy, or value length).
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 font-medium leading-relaxed">
              Would you like to reformat and regenerate all unused coupon codes (status: created or cancelled) based on the new configuration, or just save the updated campaign details?
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRegenerateConfirmOpen(false)}
              disabled={saving}
              className="text-xs h-9 px-3.5 font-medium shrink-0 whitespace-nowrap"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => executeSaveCampaign(pendingSavePayload, true)}
              disabled={saving}
              className="text-xs h-9 px-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs shrink-0 whitespace-nowrap"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 shrink-0" /> : null}
              Update & Regenerate Codes
            </Button>
            <Button
              type="button"
              onClick={() => executeSaveCampaign(pendingSavePayload, false)}
              disabled={saving}
              className="text-xs h-9 px-3.5 bg-primary hover:bg-primary/95 text-white font-semibold shadow-xs shrink-0 whitespace-nowrap"
            >
              Just Update Campaign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
