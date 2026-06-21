import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import offerService from '../services/offerService';
import {
  OFFER_TYPE_LABELS,
  OFFER_STATUS_COLORS,
  getOfferStatus,
  formatDiscount,
  formatUsage,
} from '../constants/offerConstants';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Edit,
  Archive,
  ArchiveRestore,
  Trash2,
  Tag,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge2 } from '@/components/ui/badge2';
import { Skeleton } from '../components/ui/skeleton';

/**
 * Offers Page Component
 * Manages promotional offers list with search, filters, pagination
 */
const Offers = () => {
  const navigate = useNavigate();

  // State
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [offerTypeFilter, setOfferTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch offers
  const fetchOffers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        per_page: perPage,
        search: searchQuery || undefined,
        offer_type: offerTypeFilter !== 'all' ? offerTypeFilter : undefined,
        is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        include_archived: includeArchived,
      };

      const response = await offerService.getAllOffers(params);
      setOffers(response.data || []);
      setTotalCount(response.meta?.total || 0);
      setTotalPages(Math.ceil((response.meta?.total || 0) / perPage));
    } catch (error) {
      toast.error('Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  // Effect: Fetch offers when filters or pagination changes
  useEffect(() => {
    fetchOffers();
  }, [page, searchQuery, offerTypeFilter, statusFilter, includeArchived]);

  // Handle search with debounce
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on search
  };

  // Handle filter changes
  const handleOfferTypeChange = (value) => {
    setOfferTypeFilter(value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleToggleArchived = () => {
    setIncludeArchived(!includeArchived);
    setPage(1);
  };

  // Handle archive/unarchive
  const handleArchive = async (offer, e) => {
    e.stopPropagation();
    try {
      if (offer.archived_at) {
        await offerService.unarchiveOffer(offer.id);
        toast.success('Offer unarchived successfully');
      } else {
        await offerService.archiveOffer(offer.id);
        toast.success('Offer archived successfully');
      }
      fetchOffers();
    } catch (error) {
      toast.error('Failed to archive offer');
    }
  };

  // Handle delete
  const handleDelete = async (offerId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
      return;
    }
    try {
      await offerService.deleteOffer(offerId);
      toast.success('Offer deleted successfully');
      fetchOffers();
    } catch (error) {
      toast.error('Failed to delete offer');
    }
  };

  // Navigate to edit page
  const handleEdit = (offerId, e) => {
    e.stopPropagation();
    navigate(`/offers/${offerId}/edit`);
  };

  // Navigate to create page
  const handleCreate = () => {
    navigate('/offers/new');
  };

  // Render offer status badge
  const renderStatusBadge = (offer) => {
    const status = getOfferStatus(offer);
    const colorClass = OFFER_STATUS_COLORS[status];
    return (
      <Badge2 className={colorClass}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge2>
    );
  };

  // Format date range
  const formatDateRange = (startDate, endDate) => {
    try {
      const start = format(new Date(startDate), 'MMM d, yyyy');
      const end = format(new Date(endDate), 'MMM d, yyyy');
      return `${start} - ${end}`;
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Offers</h1>
              <p className="text-gray-600 mt-1">
                Manage promotional offers and discounts
              </p>
            </div>
            <Button onClick={handleCreate} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Offer
            </Button>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name or coupon..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>

              {/* Offer Type Filter */}
              <Select value={offerTypeFilter} onValueChange={handleOfferTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="package_bundle">Package Bundle</SelectItem>
                  <SelectItem value="addon_bundle">Addon Bundle</SelectItem>
                  <SelectItem value="value_discount">Value Discount</SelectItem>
                  <SelectItem value="wash_completion">Wash Completion</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Archived Toggle */}
              <Button
                variant={includeArchived ? 'default' : 'outline'}
                onClick={handleToggleArchived}
                className="w-full"
              >
                <Archive className="h-4 w-4 mr-2" />
                {includeArchived ? 'Hide Archived' : 'Show Archived'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {offers.length} of {totalCount} offer{totalCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Offers Table/Cards */}
        {loading ? (
          <Card className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </Card>
        ) : offers.length === 0 ? (
          <Card className="p-12 text-center">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No offers found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || offerTypeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first promotional offer to get started'}
            </p>
            {!searchQuery && offerTypeFilter === 'all' && statusFilter === 'all' && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Offer
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <Card
                key={offer.id}
                className="p-4 sm:p-6 hover:shadow-lg transition-all cursor-pointer bg-white"
                onClick={() => navigate(`/offers/${offer.id}/edit`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{offer.name}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {renderStatusBadge(offer)}
                        {offer.coupon_code && (
                          <Badge2 className="bg-purple-100 text-purple-800">
                            <Tag className="h-3 w-3 mr-1" />
                            {offer.coupon_code}
                          </Badge2>
                        )}
                      </div>
                    </div>

                    {offer.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2 sm:line-clamp-none">{offer.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t border-gray-50 sm:border-t-0 sm:pt-0">
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Type</span>
                        <span className="font-semibold text-gray-800 mt-0.5 block truncate">
                          {OFFER_TYPE_LABELS[offer.offer_type]}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Discount</span>
                        <span className="font-semibold text-emerald-600 mt-0.5 block truncate">
                          {formatDiscount(offer)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Validity</span>
                        <span className="text-gray-600 text-xs mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{formatDateRange(offer.start_date, offer.end_date)}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Usage</span>
                        <span className="text-gray-600 text-xs mt-0.5 flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{formatUsage(offer)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100 sm:border-t-0 sm:pt-0 sm:mt-0 sm:ml-4 w-full sm:w-auto shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEdit(offer.id, e)}
                      className="h-9 w-9 p-0 rounded-full hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleArchive(offer, e)}
                      className="h-9 w-9 p-0 rounded-full hover:bg-gray-100"
                    >
                      {offer.archived_at ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(offer.id, e)}
                      className="h-9 w-9 p-0 rounded-full hover:bg-red-50 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Offers;
