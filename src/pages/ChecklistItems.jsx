import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  ClipboardList,
  Layers,
  ArrowUpDown,
  Info,
  GripVertical,
} from 'lucide-react';

const WHEN_BADGES = {
  pre: 'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30',
  post: 'bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30',
};

const ChecklistItems = () => {
  // State
  const [checklistItems, setChecklistItems] = useState([]);
  const [packagesList, setPackagesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all'); // all, pre, post
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Form State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    when: 'pre',
    position: 0,
    active: true,
  });
  const [selectedPackages, setSelectedPackages] = useState([]);

  // Deletion Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    // Clone list
    const items = [...filteredItems];
    const draggedItem = items[draggedIndex];

    // Remove dragged item and insert at target
    items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItem);

    // Update positions locally sequentially
    const reorderedItems = items.map((item, idx) => ({
      ...item,
      position: idx,
    }));

    // Find which items actually changed position
    const changedItems = reorderedItems.filter(item => {
      const originalItem = checklistItems.find(ci => ci.id === item.id);
      return originalItem && originalItem.position !== item.position;
    });

    if (changedItems.length === 0) return;

    // Update main checklistItems state optimistically
    const updatedChecklistItems = checklistItems.map(item => {
      const reordered = reorderedItems.find(ri => ri.id === item.id);
      return reordered ? reordered : item;
    });

    // Sort items so they display properly by wash stage and new positions
    updatedChecklistItems.sort((a, b) => {
      if (a.when !== b.when) {
        return a.when.localeCompare(b.when);
      }
      return a.position - b.position;
    });

    setChecklistItems(updatedChecklistItems);

    const toastId = toast.loading('Saving new order positions...');
    try {
      // Send updates to backend sequentially to avoid concurrent DB transactions/locks
      for (const item of changedItems) {
        await packageService.updateChecklistItem(item.id, {
          name: item.name,
          when: item.when,
          position: item.position,
          active: item.active
        });
      }

      toast.success('Positions saved successfully', { id: toastId });
      fetchChecklistItems();
      fetchPackages(); // Sync package lists
    } catch (err) {
      toast.error('Failed to save checklist positions', { id: toastId });
      fetchChecklistItems(); // Revert state
    }
  };

  // Fetch Checklist Items
  const fetchChecklistItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter === 'active') params.active = true;
      if (statusFilter === 'inactive') params.active = false;

      const data = await packageService.getChecklistItems(params);
      setChecklistItems(data.checklist_items || []);
    } catch (error) {
      toast.error('Failed to load checklist items');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch packages for selection list
  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const data = await packageService.getPackages();
      setPackagesList(data.packages || []);
    } catch (error) {
      console.error('Failed to load packages list:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    fetchChecklistItems();
  }, [statusFilter]);

  useEffect(() => {
    fetchPackages();
  }, []);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      when: 'pre',
      position: 0,
      active: true,
    });
    setSelectedPackages([]);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = async (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      when: item.when || 'pre',
      position: item.position || 0,
      active: item.active !== undefined ? item.active : true,
    });

    // Fetch individual checklist details to get package associations if needed, 
    // or search packages where this checklist ID is registered.
    // Wait! Let's check package details in local state. GORM preloaded package list inside GetChecklistItem:
    try {
      const response = await packageService.getChecklistItems({ package_id: undefined }); // general list
      // Or call GetChecklistItemById endpoint! Is there a `/checklist_items/:id`?
      // Yes: `packageService.getChecklistItemById` could call `/checklist_items/:id`!
      // Let's call /checklist_items/:id to get the detailed list of package associations.
      const responseDetail = await packageService.getChecklistItems(); // fallback if not preloaded.
      // Wait, packageService doesn't have getChecklistItemById but we can easily call apiClient inside or write a quick call.
      // Wait, in `spado-go/services/checklist/service.go`, GetChecklistItem preloads Packages and returns them as PackageSummary.
      // Let's use apiClient inside ChecklistItems.jsx directly or we can query package.checklist_items.
      // Let's see: we have packagesList preloaded. We can filter packagesList where checklist_items contains the current item ID!
      const associatedPackageIds = packagesList
        .filter(pkg => pkg.checklist_items?.some(ci => ci.id === item.id))
        .map(pkg => pkg.id);
      setSelectedPackages(associatedPackageIds);
    } catch (err) {
      setSelectedPackages([]);
    }

    setIsSheetOpen(true);
  };

  const handlePackageToggle = (pkgId) => {
    if (selectedPackages.includes(pkgId)) {
      setSelectedPackages(selectedPackages.filter(id => id !== pkgId));
    } else {
      setSelectedPackages([...selectedPackages, pkgId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Please enter a name');
      return;
    }

    const payload = {
      name: formData.name,
      when: formData.when,
      position: parseInt(formData.position) || 0,
      active: formData.active,
      package_ids: selectedPackages.map(Number),
    };

    try {
      if (editingItem) {
        await packageService.updateChecklistItem(editingItem.id, payload);
        toast.success('Checklist item updated successfully');
      } else {
        await packageService.createChecklistItem(payload);
        toast.success('Checklist item created successfully');
      }
      setIsSheetOpen(false);
      fetchChecklistItems();
      fetchPackages(); // Reload packages to keep cache/associations updated
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Failed to save checklist item';
      toast.error(errMsg);
    }
  };

  // Delete Handlers
  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const performDelete = async () => {
    if (!itemToDelete) return;
    try {
      await packageService.deleteChecklistItem(itemToDelete.id);
      toast.success('Checklist item deleted successfully');
      fetchChecklistItems();
    } catch (error) {
      toast.error('Failed to delete checklist item');
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Local filtering logic
  const filteredItems = checklistItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'all' || item.when === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" strokeWidth={1.5} />
            Checklist Items
          </h1>
          <p className="text-gray-500 mt-1">Configure verification checklist items prompted to wash operators before and after jobs.</p>
        </div>
        <Button onClick={handleOpenCreate} className="w-full md:w-auto flex items-center gap-2 cursor-pointer shadow-sm">
          <Plus className="h-4 w-4" />
          Create Checklist Item
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search checklist items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Stage Filter */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setStageFilter('all')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${stageFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              All Stages
            </button>
            <button
              onClick={() => setStageFilter('pre')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${stageFilter === 'pre'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Pre-Wash
            </button>
            <button
              onClick={() => setStageFilter('post')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${stageFilter === 'post'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Post-Wash
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
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
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${statusFilter === 'inactive'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-gray-500">Loading checklist items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2">
          <ClipboardList className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No checklist items found</h3>
          <p className="text-gray-500 max-w-sm mt-1">
            {searchQuery ? 'No checklist items match your search criteria.' : 'Create a checklist item to prompt verify operations.'}
          </p>
          {!searchQuery && (
            <Button onClick={handleOpenCreate} className="mt-4 cursor-pointer">
              Create First Item
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-white border border-gray-150 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[120px] font-semibold text-gray-900">Position</TableHead>
                  <TableHead className="font-semibold text-gray-900">Checklist Instruction</TableHead>
                  <TableHead className="w-[150px] font-semibold text-gray-900">Wash Stage</TableHead>
                  <TableHead className="w-[120px] font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900">Mapped Packages</TableHead>
                  <TableHead className="w-[180px] font-semibold text-gray-900 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, index) => {
                  const associatedPackages = packagesList.filter(pkg =>
                    pkg.checklist_items?.some(ci => ci.id === item.id)
                  );

                  return (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-gray-50/30 transition-colors ${draggedIndex === index ? 'opacity-40 bg-gray-50' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <TableCell className="text-gray-400 cursor-grab active:cursor-grabbing w-[40px]">
                        <GripVertical className="h-4 w-4" />
                      </TableCell>
                      <TableCell className="font-medium text-gray-700">
                        <span className="flex items-center gap-1">
                          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                          {item.position}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border uppercase ${WHEN_BADGES[item.when] || 'bg-gray-50 text-gray-700'}`}>
                          {item.when === 'pre' ? 'Pre-wash' : 'Post-wash'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {!item.active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100 uppercase">
                            Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {associatedPackages.length === 0 ? (
                          <span className="text-gray-400 italic text-xs">Unmapped</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-250">
                              {associatedPackages.length} package(s)
                            </span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 rounded-full hover:bg-gray-150 cursor-pointer"
                                >
                                  <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="z-[3000] w-64 bg-white p-3.5 shadow-md border border-gray-150 rounded-lg">
                                <div className="space-y-2">
                                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Associated Packages</h4>
                                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                                    {associatedPackages.map(pkg => (
                                      <div key={pkg.id} className="text-xs flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                                        <span className="font-semibold text-gray-850 truncate max-w-[150px]">{pkg.name}</span>
                                        <span className="text-[9px] uppercase bg-gray-50 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded shrink-0">{pkg.vehicle_type}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(item)}
                            className="flex items-center gap-1.5 text-xs h-8 hover:bg-red-50 hover:text-red-600 text-gray-500 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create/Edit Sheet Form */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col h-full p-0 z-[1000]">
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            {/* Fixed Header */}
            <div className="p-6 border-b border-gray-100 shrink-0">
              <SheetHeader className="space-y-1">
                <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                  {editingItem ? 'Edit Checklist Item' : 'Create Checklist Item'}
                </SheetTitle>
                <SheetDescription>
                  {editingItem
                    ? 'Update checklist description parameters, triggers, order index, and package maps.'
                    : 'Define a new checklist prompt, position ordering, and package mappings.'}
                </SheetDescription>
              </SheetHeader>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Checklist Instruction *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Check tyre pressure"
                />
              </div>

              {/* Stage & Position */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="when" className="text-sm font-semibold">Wash Stage *</Label>
                  <Select
                    value={formData.when}
                    onValueChange={(val) => setFormData({ ...formData, when: val })}
                  >
                    <SelectTrigger id="when">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent className="z-[2000]">
                      <SelectItem value="pre">Pre-Wash Stage</SelectItem>
                      <SelectItem value="post">Post-Wash Stage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-sm font-semibold">Order Position</Label>
                  <Input
                    id="position"
                    type="number"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between border border-gray-100 rounded-lg p-4 bg-gray-50">
                <div className="space-y-0.5">
                  <Label htmlFor="active" className="text-sm font-bold cursor-pointer">Active Status</Label>
                  <p className="text-xs text-gray-500">Inactive checklists will not show up in operators dashboard.</p>
                </div>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>

              {/* Packages Associations */}
              <div className="space-y-4 border-t border-gray-150 pt-4">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-gray-500" />
                  Map to Wash Packages
                </h4>
                <p className="text-xs text-gray-500 flex items-center gap-1"><Info className="h-3 w-3" /> Select packages where this checklist will be automatically triggered.</p>

                {loadingPackages ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-lg p-4 bg-white max-h-64 overflow-y-auto space-y-3">
                    {packagesList.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No packages configured yet</p>
                    ) : (
                      packagesList.map((pkg) => (
                        <div key={pkg.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pkg-${pkg.id}`}
                            checked={selectedPackages.includes(pkg.id)}
                            onCheckedChange={() => handlePackageToggle(pkg.id)}
                          />
                          <Label
                            htmlFor={`pkg-${pkg.id}`}
                            className="text-xs text-gray-700 cursor-pointer font-normal flex items-center gap-2"
                          >
                            <span>{pkg.name}</span>
                            <span className="text-[10px] text-gray-400 uppercase">({pkg.vehicle_type})</span>
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-6 border-t border-gray-150 bg-gray-50 flex gap-3 justify-end shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Save Changes' : 'Create Item'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={performDelete}
        title="Delete Checklist Item?"
        description={`Are you sure you want to delete the checklist instruction "${itemToDelete?.name}"? This action is permanent and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default ChecklistItems;
