import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../components/ui/dialog';
import { Badge2 } from '../components/ui/badge2';
import {
  Plus,
  Search,
  Building,
  User,
  MapPin,
  Phone,
  Edit,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import campaignService from '../services/campaignService';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

export default function Partners() {
  const { user } = useAuthStore();
  const [partners, setPartners] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    partner_type: 'retail',
    location: '',
    contact_person: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchPartners();
  }, [page]);

  useEffect(() => {
    if (page === 1) {
      fetchPartners();
    } else {
      setPage(1);
    }
  }, [searchTerm]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await campaignService.getAllPartners({
        search: searchTerm,
        page,
        per_page: 15,
      });
      setPartners(response.data || []);
      setTotal(response.meta?.total || 0);
    } catch (error) {
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setEditingPartner(null);
    setFormData({
      name: '',
      code: '',
      partner_type: 'Retailer',
      location: '',
      contact_person: '',
      active: true,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      code: partner.code,
      partner_type: partner.partner_type || 'Retailer',
      location: partner.location || '',
      contact_person: partner.contact_person || '',
      active: partner.active,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Partner name is required';
    if (!formData.code) newErrors.code = 'Partner code is required';
    if (formData.code && !/^[A-Z0-9]{1,10}$/.test(formData.code)) {
      newErrors.code = 'Code must be uppercase alphanumeric (e.g. LULU, CR1)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingPartner) {
        await campaignService.updatePartner(editingPartner.id, formData);
        toast.success('Partner updated successfully');
      } else {
        await campaignService.createPartner(formData);
        toast.success('Partner created successfully');
      }
      setIsDialogOpen(false);
      fetchPartners();
    } catch (error) {
      const msg = error.response?.data?.errors?.[0] || 'Failed to save partner';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePartner = async (partner) => {
    if (!window.confirm(`Are you sure you want to delete partner "${partner.name}"?`)) return;

    try {
      await campaignService.deletePartner(partner.id);
      toast.success('Partner deleted successfully');
      fetchPartners();
    } catch (error) {
      toast.error('Failed to delete partner');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" strokeWidth={1.5} />
            Campaign Partners
          </h1>
          <p className="text-gray-500 mt-1">Manage your corporate, hypermarket, event, and association marketing partners.</p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={handleOpenAddDialog} className="w-full md:w-auto flex items-center gap-2 cursor-pointer shadow-sm">
            <Plus className="h-4 w-4" /> Add Partner
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-xs border border-gray-100">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search partner by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-500 font-medium">
          Total Partners: {total}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : partners.length === 0 ? (
        <Card className="border-dashed border-2 py-16 flex flex-col items-center justify-center bg-white rounded-xl">
          <Building className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="font-semibold text-lg text-gray-700">No partners found</h3>
          <p className="text-gray-400 text-sm mt-1">Add your first promotional partner to get started</p>
        </Card>
      ) : (
        <Card className="bg-white border border-gray-100 shadow-xs overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Partner Name</th>
                  <th className="p-4">Partner Code</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Contact Person</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Status</th>
                  {user?.role === 'admin' && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                {partners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-semibold text-gray-800">{partner.name}</td>
                    <td className="p-4">
                      <span className="text-xs font-mono font-bold tracking-wider uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {partner.code}
                      </span>
                    </td>
                    <td className="p-4 capitalize">{partner.partner_type || 'Retail'}</td>
                    <td className="p-4">{partner.contact_person || <span className="text-gray-300">-</span>}</td>
                    <td className="p-4">{partner.location || <span className="text-gray-300">-</span>}</td>
                    <td className="p-4">
                      <Badge2 variant={partner.active ? 'success' : 'secondary'}>
                        {partner.active ? 'Active' : 'Inactive'}
                      </Badge2>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditDialog(partner)} className="text-gray-600 hover:text-primary flex items-center gap-1.5 h-8">
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePartner(partner)} className="text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-1.5 h-8">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 15 && (
            <div className="flex justify-end gap-2 p-3 border-t border-gray-50 text-xs">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Prev
              </Button>
              <div className="flex items-center font-medium px-2">
                Page {page} of {Math.ceil(total / 15)}
              </div>
              <Button size="sm" variant="outline" disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingPartner ? 'Edit Partner' : 'Add New Partner'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="name">Partner Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g. Central Hypermarket"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="code">Partner Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                placeholder="e.g. CR1 (Uppercase alphanumeric)"
                disabled={!!editingPartner}
              />
              {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
              <p className="text-[10px] text-gray-400">Used as placeholder `{'{PartnerCode}'}` in coupons generation.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="partner_type">Partner Type</Label>
                <select
                  id="partner_type"
                  value={formData.partner_type}
                  onChange={(e) => handleInputChange('partner_type', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-md p-2 bg-white"
                >
                  <option value="Retail">Retail / Hypermarket</option>
                  <option value="Apartment">Apartment Association</option>
                  <option value="Corporate">Corporate Office</option>
                  <option value="Event">Event Organizer</option>
                  <option value="Fuel Station">Fuel Station</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange('contact_person', e.target.value)}
                  placeholder="Manager / Coordinator"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="location">Location / Office Address</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g. Thrissur City Center"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => handleInputChange('active', e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <Label htmlFor="active" className="text-sm font-medium cursor-pointer">
                Partner Active
              </Label>
            </div>

            <DialogFooter className="pt-4 border-t border-gray-50">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Partner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
