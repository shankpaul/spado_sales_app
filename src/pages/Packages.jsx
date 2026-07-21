import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Badge2 } from '../components/ui/badge2';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import packageService from '../services/packageService';
import useAuthStore from '../store/authStore';
import {
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  CheckCircle2,
  PlusCircle,
  X,
  Package,
  Layers,
  Sparkles,
  Info,
  Eye,
} from 'lucide-react';

const VEHICLE_TYPES = [
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'luxury', label: 'Luxury' },
];

const VEHICLE_BADGES = {
  hatchback: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30',
  sedan: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30',
  suv: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/30',
  luxury: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30',
};

const Packages = () => {
  const { user } = useAuthStore();
  const canManage = user?.role === 'admin';

  // State
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [checklistItems, setChecklistItems] = useState([]);
  const [loadingChecklists, setLoadingChecklists] = useState(false);

  // Form State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit_price: '',
    cost_price: '',
    vehicle_type: 'hatchback',
    active: true,
    subscription_enabled: false,
    subscription_price: '',
    max_washes_per_month: '',
  });
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [selectedChecklists, setSelectedChecklists] = useState([]);

  // Deletion Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState(null);

  // Fetch Packages & Checklist Items
  const fetchData = async () => {
    try {
      setLoading(true);
      const filterParams = {};
      if (vehicleFilter !== 'all') {
        filterParams.vehicle_type = vehicleFilter;
      }

      // Get packages
      const data = await packageService.getPackages(filterParams);
      setPackages(data.packages || []);
    } catch (error) {
      toast.error('Failed to load packages');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklists = async () => {
    try {
      setLoadingChecklists(true);
      const data = await packageService.getChecklistItems();
      setChecklistItems(data.checklist_items || []);
    } catch (error) {
      console.error('Failed to load checklist items:', error);
    } finally {
      setLoadingChecklists(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [vehicleFilter]);

  useEffect(() => {
    fetchChecklists();
  }, []);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      unit_price: '',
      cost_price: '',
      vehicle_type: 'hatchback',
      active: true,
      subscription_enabled: false,
      subscription_price: '',
      max_washes_per_month: '',
    });
    setFeatures([]);
    setSelectedChecklists([]);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name || '',
      description: pkg.description || '',
      unit_price: pkg.unit_price || '',
      cost_price: pkg.cost_price || 0,
      vehicle_type: pkg.vehicle_type || 'hatchback',
      active: pkg.active !== undefined ? pkg.active : true,
      subscription_enabled: pkg.subscription_enabled || false,
      subscription_price: pkg.subscription_price || '',
      max_washes_per_month: pkg.max_washes_per_month || '',
    });
    setFeatures(pkg.features || []);
    setSelectedChecklists(pkg.checklist_items ? pkg.checklist_items.map(x => x.id) : []);
    setIsSheetOpen(true);
  };

  const handleAddFeature = () => {
    if (!canManage) return;
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    if (!canManage) return;
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleChecklistToggle = (id) => {
    if (!canManage) return;
    if (selectedChecklists.includes(id)) {
      setSelectedChecklists(selectedChecklists.filter(x => x !== id));
    } else {
      setSelectedChecklists([...selectedChecklists, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setIsSheetOpen(false);
      return;
    }

    if (!formData.name || !formData.unit_price) {
      toast.error('Please enter name and unit price');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      unit_price: parseFloat(formData.unit_price),
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
      vehicle_type: formData.vehicle_type,
      active: formData.active,
      subscription_enabled: formData.subscription_enabled,
      features,
      checklist_item_ids: selectedChecklists,
    };

    if (formData.subscription_enabled) {
      payload.subscription_price = parseFloat(formData.subscription_price) || 0;
      payload.max_washes_per_month = parseInt(formData.max_washes_per_month) || 0;
    }

    try {
      if (editingPackage) {
        await packageService.updatePackage(editingPackage.id, payload);
        toast.success('Package updated successfully');
      } else {
        await packageService.createPackage(payload);
        toast.success('Package created successfully');
      }
      setIsSheetOpen(false);
      fetchData();
    } catch (error) {
      const errMsg = error.response?.data?.errors?.[0] || 'Failed to save package';
      toast.error(errMsg);
    }
  };

  // Delete Handlers
  const handleDeleteClick = (pkg) => {
    setPackageToDelete(pkg);
    setDeleteDialogOpen(true);
  };

  const performDelete = async () => {
    if (!packageToDelete) return;
    try {
      await packageService.deletePackage(packageToDelete.id);
      toast.success('Package deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete package');
    } finally {
      setDeleteDialogOpen(false);
      setPackageToDelete(null);
    }
  };

  // Filter packages by search query locally and sort by price ascending
  const filteredPackages = packages
    .filter(pkg =>
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pkg.description && pkg.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => (a.unit_price || 0) - (b.unit_price || 0));

  const preChecklists = checklistItems
    .filter(item => item.when === 'pre')
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const postChecklists = checklistItems
    .filter(item => item.when === 'post')
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" strokeWidth={1.5} />
            Service Packages
          </h1>
          <p className="text-gray-500 mt-1">Configure service plans, pricing, subscriptions, and checklists for vehicle wash jobs.</p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} className="w-full md:w-auto flex items-center gap-2 cursor-pointer shadow-sm">
            <Plus className="h-4 w-4" />
            Create Package
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {/* Vehicle Filters */}
        <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-lg self-start lg:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setVehicleFilter('all')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${vehicleFilter === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            All Vehicles
          </button>
          {VEHICLE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setVehicleFilter(type.value)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${vehicleFilter === type.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-gray-500">Loading packages...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2">
          <Package className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No packages found</h3>
          <p className="text-gray-500 max-w-sm mt-1">
            {searchQuery ? 'No packages matches your search criteria.' : 'Create a package to start configuring wash plans.'}
          </p>
          {!searchQuery && canManage && (
            <Button onClick={handleOpenCreate} className="mt-4 cursor-pointer">
              Create First Package
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Package</th>
                    <th className="px-6 py-4">Selling Price</th>
                    <th className="px-6 py-4">Cost Price</th>
                    <th className="px-6 py-4">Subscription</th>
                    <th className="px-6 py-4">Checklists</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {filteredPackages.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{pkg.name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border uppercase ${VEHICLE_BADGES[pkg.vehicle_type] || 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                            {pkg.vehicle_type}
                          </span>
                          {!pkg.active && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100 uppercase">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">
                        ₹{pkg.unit_price}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">
                        ₹{pkg.cost_price || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">
                        {pkg.subscription_enabled ? (
                          <span className="text-primary font-semibold">₹{pkg.subscription_price}/mo</span>
                        ) : (
                          <span className="text-gray-400">Disabled</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-100">
                            {pkg.checklist_items?.filter(x => x.when === 'pre').length || 0} Pre
                          </span>
                          <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-medium border border-blue-100">
                            {pkg.checklist_items?.filter(x => x.when === 'post').length || 0} Post
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {canManage ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(pkg)}
                                className="h-8 text-xs gap-1 cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(pkg)}
                                className="h-8 text-xs gap-1 hover:bg-red-50 hover:text-red-600 text-gray-500 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(pkg)}
                              className="h-8 text-xs gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Details
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-6 md:hidden">
            {filteredPackages.map((pkg) => (
              <Card key={pkg.id} className="bg-white overflow-hidden flex flex-col hover:shadow-md transition-shadow border border-gray-150">
                <div className="p-6 flex-1">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{pkg.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border uppercase ${VEHICLE_BADGES[pkg.vehicle_type] || 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                          {pkg.vehicle_type}
                        </span>
                        {!pkg.active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100 uppercase">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-primary">₹{pkg.unit_price}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Unit Price</span>
                    </div>
                  </div>

                  {/* Costs & Subscription Details */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-900/10 rounded-lg text-xs mb-4">
                    <div>
                      <span className="text-gray-400 block">Cost Price</span>
                      <span className="font-semibold text-gray-700">₹{pkg.cost_price || '0.00'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Subscription</span>
                      <span className={`font-semibold ${pkg.subscription_enabled ? 'text-primary' : 'text-gray-500'}`}>
                        {pkg.subscription_enabled ? `₹${pkg.subscription_price}/mo` : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Checklist Summary */}
                  <div className="border-t border-gray-100 pt-3 flex justify-between text-xs text-gray-500 mt-auto">

                    <div className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-gray-400" />
                      <span>Checklists:</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-100">
                        {pkg.checklist_items?.filter(x => x.when === 'pre').length || 0} Pre
                      </span>
                      <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-medium border border-blue-100">
                        {pkg.checklist_items?.filter(x => x.when === 'post').length || 0} Post
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex justify-end gap-2">
                  {canManage ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(pkg)}
                        className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(pkg)}
                        className="flex items-center gap-1.5 text-xs h-8 hover:bg-red-50 hover:text-red-600 text-gray-500 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(pkg)}
                      className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Details
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Sheet Form */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col h-full p-0 z-[1000]">
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            {/* Fixed Header */}
            <div className="p-6 border-b border-gray-100 shrink-0">
              <SheetHeader className="space-y-1">
                <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                  {canManage ? (editingPackage ? 'Edit Package' : 'Create Package') : 'Package Details'}
                </SheetTitle>
                <SheetDescription>
                  {canManage
                    ? (editingPackage
                      ? 'Update package properties, costs, subscription settings, and associated checklists.'
                      : 'Define a new package, price details, features, and pre/post checklists.')
                    : 'View package details, price configuration, subscription settings, and associated checklists.'}
                </SheetDescription>
              </SheetHeader>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Package Name *</Label>
                <Input
                  id="name"
                  required
                  disabled={!canManage}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Standard Wash"
                />
              </div>

              {/* Vehicle Type & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_type" className="text-sm font-semibold">Vehicle Type *</Label>
                  <Select
                    disabled={!canManage}
                    value={formData.vehicle_type}
                    onValueChange={(val) => setFormData({ ...formData, vehicle_type: val })}
                  >
                    <SelectTrigger id="vehicle_type">
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent className="z-[2000]">
                      {VEHICLE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col justify-end pb-2">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="active" className="text-sm font-semibold cursor-pointer">Active Status</Label>
                    <Switch
                      id="active"
                      disabled={!canManage}
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                <Textarea
                  id="description"
                  disabled={!canManage}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe package details..."
                  rows={3}
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_price" className="text-sm font-semibold">Selling Price (₹) *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    required
                    disabled={!canManage}
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_price" className="text-sm font-semibold">Cost Price (₹)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    disabled={!canManage}
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Subscription Settings */}
              <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <Label htmlFor="subscription_enabled" className="text-sm font-bold cursor-pointer">Enable Subscription Plan</Label>
                  </div>
                  <Switch
                    id="subscription_enabled"
                    disabled={!canManage}
                    checked={formData.subscription_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, subscription_enabled: checked })}
                  />
                </div>

                {formData.subscription_enabled && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="subscription_price" className="text-xs font-semibold">Subscription Price ($/mo)</Label>
                      <Input
                        id="subscription_price"
                        type="number"
                        step="0.01"
                        required
                        disabled={!canManage}
                        value={formData.subscription_price}
                        onChange={(e) => setFormData({ ...formData, subscription_price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_washes" className="text-xs font-semibold">Max Washes/Month</Label>
                      <Input
                        id="max_washes"
                        type="number"
                        required
                        disabled={!canManage}
                        value={formData.max_washes_per_month}
                        onChange={(e) => setFormData({ ...formData, max_washes_per_month: e.target.value })}
                        placeholder="e.g. 4"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Features (postgresql string array) */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Package Features</Label>
                {canManage && (
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Add feature item..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={handleAddFeature}>
                      Add
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {features.map((feature, idx) => (
                    <span key={idx} className="inline-flex items-center text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                      {feature}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="ml-1 text-primary hover:text-red-600 focus:outline-none"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {features.length === 0 && (
                    <span className="text-xs text-gray-400 italic">No features added yet.</span>
                  )}
                </div>
              </div>

              {/* Checklist Associations */}
              <div className="space-y-4 border-t border-gray-150 pt-4">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-gray-500" />
                  Select Job Checklists
                </h4>
                <p className="text-xs text-gray-500 flex items-center gap-1"><Info className="h-3 w-3" /> Select items that operators must check during wash.</p>

                {loadingChecklists ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pre Wash checklists */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 block w-max uppercase">
                        Pre-wash Checklist
                      </Label>
                      <div className="border border-gray-100 rounded-lg p-3 bg-white h-48 overflow-y-auto space-y-2">
                        {preChecklists.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No pre-wash items found</p>
                        ) : (
                          preChecklists.map((item) => (
                            <div key={item.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`check-${item.id}`}
                                disabled={!canManage}
                                checked={selectedChecklists.includes(item.id)}
                                onCheckedChange={() => handleChecklistToggle(item.id)}
                              />
                              <Label
                                htmlFor={`check-${item.id}`}
                                className="text-xs text-gray-700 cursor-pointer font-normal"
                              >
                                {item.name}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Post Wash checklists */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 block w-max uppercase">
                        Post-wash Checklist
                      </Label>
                      <div className="border border-gray-100 rounded-lg p-3 bg-white h-48 overflow-y-auto space-y-2">
                        {postChecklists.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No post-wash items found</p>
                        ) : (
                          postChecklists.map((item) => (
                            <div key={item.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`check-${item.id}`}
                                disabled={!canManage}
                                checked={selectedChecklists.includes(item.id)}
                                onCheckedChange={() => handleChecklistToggle(item.id)}
                              />
                              <Label
                                htmlFor={`check-${item.id}`}
                                className="text-xs text-gray-700 cursor-pointer font-normal"
                              >
                                {item.name}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-6 border-t border-gray-150 bg-gray-50 flex gap-3 justify-end shrink-0">
              {canManage ? (
                <>
                  <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingPackage ? 'Save Changes' : 'Create Package'}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                  Close
                </Button>
              )}
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={performDelete}
        title="Delete Service Package?"
        description={`Are you sure you want to delete the package "${packageToDelete?.name}"? This action is permanent and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default Packages;
