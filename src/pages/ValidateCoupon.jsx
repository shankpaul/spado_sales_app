import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Tag,
  Gift,
  User,
  Phone,
  Mail,
  ShoppingBag,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Building,
  Hash
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import campaignService from '../services/campaignService';
import offerService from '../services/offerService';
import { toast } from 'sonner';

export default function ValidateCoupon() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const initialMobile = searchParams.get('mobile') || '';

  const [couponCode, setCouponCode] = useState(initialCode);
  const [mobileNumber, setMobileNumber] = useState(initialMobile);
  const [customerId, setCustomerId] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialCode) {
      handleValidate(initialCode, initialMobile);
    }
  }, []);

  const handleValidate = async (codeToTest = couponCode, mobileToTest = mobileNumber) => {
    const cleanCode = (codeToTest || '').trim();
    if (!cleanCode) {
      toast.error('Please enter a coupon code or offer code to validate.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    // Update URL query params
    setSearchParams({ code: cleanCode, ...(mobileToTest ? { mobile: mobileToTest } : {}) });

    try {
      // 1. First try campaign coupon validation API
      const response = await campaignService.validateCoupon(cleanCode, customerId || undefined, mobileToTest || undefined);
      if (response && response.data) {
        setResult({
          type: 'campaign_coupon',
          valid: true,
          message: response.message || 'Coupon code is valid and available for redemption.',
          coupon: response.data
        });
        toast.success('Coupon code is valid!');
      } else {
        throw new Error(response.message || 'Invalid coupon code');
      }
    } catch (err) {
      const serverMessage = err.response?.data?.errors?.[0] || err.message || 'Invalid coupon code';

      // 2. Try searching in general coupons list or offers list as fallback lookup
      try {
        const couponsRes = await campaignService.getAllCoupons({ search: cleanCode, per_page: 1 });
        if (couponsRes?.data && couponsRes.data.length > 0 && couponsRes.data[0].code.toUpperCase() === cleanCode.toUpperCase()) {
          const c = couponsRes.data[0];
          setResult({
            type: 'campaign_coupon',
            valid: false,
            message: serverMessage,
            coupon: c
          });
          setErrorMsg(serverMessage);
          setLoading(false);
          return;
        }

        // 3. Check if it matches a direct Offer Code (from promotional offers table)
        let offersRes = await offerService.getAllOffers({ search: cleanCode, per_page: 20 });
        let matchedOffer = offersRes?.data?.find(
          o => o.coupon_code && o.coupon_code.trim().toUpperCase() === cleanCode.toUpperCase()
        );

        if (!matchedOffer) {
          // Fetch all offers list if query search didn't return coupon_code match
          const allOffersRes = await offerService.getAllOffers({ per_page: 100 });
          matchedOffer = allOffersRes?.data?.find(
            o => o.coupon_code && o.coupon_code.trim().toUpperCase() === cleanCode.toUpperCase()
          );
        }

        if (matchedOffer) {
          const isExpired = matchedOffer.end_date && new Date(matchedOffer.end_date) < new Date();
          const isMaxReached = matchedOffer.max_usage > 0 && matchedOffer.current_usage >= matchedOffer.max_usage;
          const isValidNow = matchedOffer.is_active && !isExpired && !isMaxReached;

          setResult({
            type: 'offer_code',
            valid: isValidNow,
            message: isValidNow
              ? 'Promotional Offer Coupon Code is active and valid.'
              : isExpired ? 'Offer has expired.' : isMaxReached ? 'Offer maximum total redemptions reached.' : 'Offer is inactive.',
            offer: matchedOffer
          });

          if (isValidNow) {
            toast.success('Promotional Offer Code is valid!');
          } else {
            setErrorMsg('Offer is not valid for use');
          }
          setLoading(false);
          return;
        }

      } catch (fallbackErr) {
        console.error('Fallback lookup error:', fallbackErr);
      }

      setResult({
        type: 'invalid',
        valid: false,
        message: serverMessage || 'Invalid coupon code. Please check the code and try again.',
        codeTried: cleanCode
      });
      setErrorMsg(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Coupon code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCouponCode('');
    setMobileNumber('');
    setCustomerId('');
    setResult(null);
    setErrorMsg(null);
    setSearchParams({});
  };

  const coupon = result?.coupon;
  const offer = result?.offer;

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Validate Coupon</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
            Check coupon code validity, discount structure, and remaining balance
          </p>
        </div>
      </div>

      {/* Input Search Card */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleValidate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="coupon_code_input" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Enter Coupon Code
            </Label>
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <div className="relative flex-1">
                <Input
                  id="coupon_code_input"
                  type="text"
                  placeholder="e.g. SUMMER-1001 or SAVE20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="h-11 sm:h-12 font-mono uppercase font-semibold text-sm sm:text-base tracking-wider pr-10 border-gray-300 focus:border-primary focus:ring-primary"
                />
                <Search className="h-5 w-5 text-gray-400 absolute right-3 top-3 sm:top-3.5 pointer-events-none" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading || !couponCode}
                  className="h-11 sm:h-12 text-xs px-3.5 sm:px-4 border-gray-300 text-gray-700 flex-1 sm:flex-initial"
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !couponCode.trim()}
                  className="h-11 sm:h-12 text-xs sm:text-sm px-5 sm:px-6 font-semibold bg-primary hover:bg-primary/95 text-white shadow-md flex-1 sm:flex-initial"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Validate Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Validation Result Banner */}
      {result && (
        <div className={`p-4 sm:p-6 rounded-2xl border transition-all duration-200 shadow-sm ${result.valid
          ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
          : 'bg-rose-50/90 border-rose-200 text-rose-950'
          }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${result.valid ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                {result.valid ? <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" /> : <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight">
                    {result.valid ? 'Valid Coupon Code' : 'Invalid or Restricted Coupon'}
                  </h2>
                  <Badge className={`text-[10px] sm:text-xs ${result.valid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                    {result.valid ? 'USABLE NOW' : 'NOT APPLICABLE'}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium opacity-90 leading-snug">
                  {result.message}
                </p>
              </div>
            </div>

            {result.valid && (coupon?.code || offer?.coupon_code) && (
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-200 shrink-0">
                <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-gray-800">
                  {coupon?.code || offer?.coupon_code}
                </span>
                <button
                  onClick={() => handleCopy(coupon?.code || offer?.coupon_code)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                  title="Copy code"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coupon / Offer Details Breakdown */}
      {(coupon || offer) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Core Configuration & Discount */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 sm:space-y-5 lg:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Offer & Discount Structure</h3>
              </div>
              <Badge variant="outline" className="capitalize text-[10px] sm:text-xs font-semibold">
                {coupon ? `Status: ${coupon.status}` : offer ? `Type: ${offer.offer_type}` : ''}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Discount Type</span>
                <p className="text-xs sm:text-sm font-bold text-gray-900 capitalize">
                  {coupon?.discount_type || offer?.discount_type || 'Fixed'}
                </p>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-wider">Discount Value</span>
                <p className="text-base sm:text-lg font-black text-blue-700">
                  {(coupon?.discount_type || offer?.discount_type) === 'percentage'
                    ? `${coupon?.discount_value || offer?.discount_value || 0}% OFF`
                    : `₹${coupon?.discount_value || offer?.discount_value || 0}`
                  }
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Remaining Uses</span>
                <p className="text-base sm:text-lg font-black text-emerald-600">
                  {coupon ? coupon.remaining_uses : offer ? (offer.max_usage > 0 ? Math.max(0, offer.max_usage - offer.current_usage) : 'Unlimited') : 0}
                </p>
              </div>
            </div>

            {/* Campaign / Offer Source Details */}
            <div className="space-y-2.5 sm:space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-0.5 sm:gap-4">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 shrink-0" /> Campaign / Offer Name:
                </span>
                <span className="font-bold text-gray-900 truncate">
                  {coupon?.campaign_name || coupon?.offer_name || offer?.name || 'N/A'}
                </span>
              </div>

              {coupon?.campaign_code && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-0.5 sm:gap-4">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 shrink-0" /> Campaign Code:
                  </span>
                  <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs self-start sm:self-auto">
                    {coupon.campaign_code}
                  </span>
                </div>
              )}

              {coupon?.partner_name && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-0.5 sm:gap-4">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 shrink-0" /> Partner Location:
                  </span>
                  <span className="font-semibold text-gray-800 truncate">
                    {coupon.partner_name} {coupon?.location_name ? `(${coupon.location_name})` : ''}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-0.5 sm:gap-4">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 shrink-0" /> Expiry Date:
                </span>
                <span className="font-semibold text-gray-800">
                  {(coupon?.expiry_date || offer?.end_date)
                    ? new Date(coupon?.expiry_date || offer?.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'No Expiry Set'
                  }
                </span>
              </div>
            </div>

            {/* Campaign Navigation Link */}
            {coupon?.campaign_id && (
              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <Link
                  to={`/campaigns/${coupon.campaign_id}`}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  View Full Campaign Details <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Card 2: Assignment & Redemption Stats */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 sm:space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Usage & Assignment</h3>
            </div>

            {/* Customer Details */}
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Customer</span>
                {coupon?.assigned_customer || coupon?.assigned_mobile ? (
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">
                      {coupon.assigned_customer || 'Guest / Unnamed'}
                    </p>
                    {coupon.assigned_mobile && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-gray-400 shrink-0" /> {coupon.assigned_mobile}
                      </p>
                    )}
                    {coupon.customer_email && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="h-3 w-3 text-gray-400 shrink-0" /> {coupon.customer_email}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-gray-500 italic">
                    Unassigned (Open for any eligible customer)
                  </p>
                )}
              </div>

              {/* Redemption Limits & Order Details */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Allowed Redemptions:</span>
                  <span className="font-bold text-gray-900">{coupon?.allowed_uses || offer?.per_use_count || 1} per customer</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Total Times Redeemed:</span>
                  <span className="font-bold text-gray-900">{coupon?.redemption_count || offer?.current_usage || 0} times</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Remaining Balance:</span>
                  <span className="font-bold text-emerald-600">
                    {coupon ? `${coupon.remaining_uses} uses left` : offer ? (offer.max_usage > 0 ? `${offer.max_usage - offer.current_usage} left` : 'Unlimited') : 'N/A'}
                  </span>
                </div>

                {/* Linked Order Details if already redeemed */}
                {(coupon?.order_id || (coupon && coupon.redemption_count > 0) || (offer && offer.current_usage > 0)) && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-1 mt-2">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Usage Order Reference</span>
                    {coupon?.order_id ? (
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-xs font-semibold text-gray-700">Order ID: #{coupon.order_id}</span>
                        <Link
                          to={`/orders/${coupon.order_id}`}
                          className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 shadow-xs"
                        >
                          View Order <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-xs font-semibold text-gray-700">Redeemed in Sales Orders</span>
                        <Link
                          to={`/orders?search=${encodeURIComponent(coupon?.code || offer?.coupon_code || '')}`}
                          className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 shadow-xs"
                        >
                          Search Orders <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
