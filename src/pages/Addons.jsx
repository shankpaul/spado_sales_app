import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import { toast } from 'sonner';
import addonService from '../services/addonService';
import useAuthStore from '../store/authStore';
import {
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Layers,
  Info,
  Eye,
} from 'lucide-react';

const Addons = () => {
  const { user } = useAuthStore();
  const canManage = user?.role === 'admin';

  // State
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive

  // Form State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost_price: '',
    active: true,
  });

  // Deletion Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addonToDelete, setAddonToDelete] = useState(null);

  // Fetch Addons
  const fetchAddons = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (statusFilter === 'active') filters.active = true;
      if (statusFilter === 'inactive') filters.active = false;

      const data = await addonService.getAddons(filters);
      setAddons(data.addons || []);
    } catch (error) {
      toast.error('Failed to load addons');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, [statusFilter]);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingAddon(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      cost_price: '',
      active: true,
    });
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (addon) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name || '',
      description: addon.description || '',
      price: addon.price || '',
      cost_price: addon.cost_price || 0,
      active: addon.active !== undefined ? addon.active : true,
    });
    setIsSheetOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setIsSheetOpen(false);
      return;
    }

    if (!formData.name || !formData.price) {
      toast.error('Please enter name and price');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
      active: formData.active,
    };

    try {
      if (editingAddon) {
        await addonService.updateAddon(editingAddon.id, payload);
        toast.success('Addon updated successfully');
      } else {
        await addonService.createAddon(payload);
        toast.success('Addon created successfully');
      }
      setIsSheetOpen(false);
      fetchAddons();
    } catch (error) {
      const errMsg = error.response?.data?.errors?.[0] || 'Failed to save addon';
      toast.error(errMsg);
    }
  };

  // Delete Handlers
  const handleDeleteClick = (addon) => {
    setAddonToDelete(addon);
    setDeleteDialogOpen(true);
  };

  const performDelete = async () => {
    if (!addonToDelete) return;
    try {
      await addonService.deleteAddon(addonToDelete.id);
      toast.success('Addon deleted successfully');
      fetchAddons();
    } catch (error) {
      toast.error('Failed to delete addon');
    } finally {
      setDeleteDialogOpen(false);
      setAddonToDelete(null);
    }
  };

  // Local filter for search query
  const filteredAddons = addons.filter(addon =>
    addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (addon.description && addon.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" strokeWidth={1.5} />
            Service Addons
          </h1>
          <p className="text-gray-500 mt-1">Manage extra services, treatments, and options offered alongside wash packages.</p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} className="w-full md:w-auto flex items-center gap-2 cursor-pointer shadow-sm">
            <Plus className="h-4 w-4" />
            Create Addon
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search addons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg self-start lg:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${statusFilter === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            All Status
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${statusFilter === 'active'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${statusFilter === 'inactive'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Inactive Only
          </button>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-gray-500">Loading addons...</p>
        </div>
      ) : filteredAddons.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2">
          <Layers className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No addons found</h3>
          <p className="text-gray-500 max-w-sm mt-1">
            {searchQuery ? 'No addons match your search criteria.' : 'Create an addon to offer extra cleaning treatments.'}
          </p>
          {!searchQuery && canManage && (
            <Button onClick={handleOpenCreate} className="mt-4 cursor-pointer">
              Create First Addon
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
                    <th className="px-6 py-4">Addon Name</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Cost Price</th>
                    <th className="px-6 py-4">Profit Margin</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {filteredAddons.map((addon) => (
                    <tr key={addon.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {addon.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">
                        ₹{addon.price}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">
                        ₹{addon.cost_price || '0.00'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-600">
                        {addon.price && addon.price > 0
                          ? `${Math.round(((addon.price - (addon.cost_price || 0)) / addon.price) * 100)}%`
                          : '0%'}
                      </td>
                      <td className="px-6 py-4">
                        {addon.active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {canManage ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(addon)}
                                className="h-8 text-xs gap-1 cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(addon)}
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
                              onClick={() => handleOpenEdit(addon)}
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
            {filteredAddons.map((addon) => (
              <Card key={addon.id} className="bg-white overflow-hidden flex flex-col hover:shadow-md transition-shadow border border-gray-150">
                <div className="p-6 flex-1">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{addon.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {!addon.active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100 uppercase">
                            Inactive
                          </span>
                        )}
                        {addon.active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-primary">₹{addon.price}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Price</span>
                    </div>
                  </div>

                  {/* Cost tracking info */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/10 rounded-lg text-xs flex justify-between">
                    <div>
                      <span className="text-gray-400 block">Cost Price</span>
                      <span className="font-semibold text-gray-700">₹{addon.cost_price || '0.00'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block">Profit Margin</span>
                      <span className="font-semibold text-emerald-600">
                        {addon.price && addon.price > 0
                          ? `${Math.round(((addon.price - (addon.cost_price || 0)) / addon.price) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex justify-end gap-2">
                  {canManage ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(addon)}
                        className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(addon)}
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
                      onClick={() => handleOpenEdit(addon)}
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
                  {canManage ? (editingAddon ? 'Edit Addon' : 'Create Addon') : 'Addon Details'}
                </SheetTitle>
                <SheetDescription>
                  {canManage
                    ? (editingAddon
                      ? 'Update addon metadata, price configuration, and cost tracking settings.'
                      : 'Define a new addon service, price details, and active status.')
                    : 'View addon metadata, price configuration, and active status.'}
                </SheetDescription>
              </SheetHeader>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Addon Name *</Label>
                <Input
                  id="name"
                  required
                  disabled={!canManage}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Engine Steam Clean"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-semibold">Price (₹) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    required
                    disabled={!canManage}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
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

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                <Textarea
                  id="description"
                  disabled={!canManage}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe addon details..."
                  rows={4}
                />
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between border border-gray-100 rounded-lg p-4 bg-gray-50">
                <div className="space-y-0.5">
                  <Label htmlFor="active" className="text-sm font-bold cursor-pointer">Active Status</Label>
                  <p className="text-xs text-gray-500">Addons will only be visible in orders when active.</p>
                </div>
                <Switch
                  id="active"
                  disabled={!canManage}
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
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
                    {editingAddon ? 'Save Changes' : 'Create Addon'}
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
        title="Delete Service Addon?"
        description={`Are you sure you want to delete the addon "${addonToDelete?.name}"? This action is permanent and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default Addons;
