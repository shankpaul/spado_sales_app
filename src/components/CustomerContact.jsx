import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Phone, MessageCircle, Copy, Check, PhoneCall, ExternalLink } from 'lucide-react';
import LetterAvatar from './LetterAvatar';

/**
 * CustomerContact Component
 * Premium reusable component for customer contact actions (Call, WhatsApp, Copy)
 */
const CustomerContact = ({
  phone,
  customerName = 'Customer',
  variant = 'secondary',
  className = '',
  showActions = true,
}) => {
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!phone) return <span className="text-xs text-muted-foreground italic">No phone available</span>;

  const cleanPhone = phone.trim().replace(/[^0-9+]/g, '');

  const formatPhoneNumber = (rawPhone) => {
    if (!rawPhone) return 'N/A';
    const cleaned = rawPhone.trim().replace(/[^0-9+]/g, '');
    if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    if (cleaned.startsWith('+91') && cleaned.length === 13) {
      return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
    }
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    return rawPhone;
  };

  const formattedPhone = formatPhoneNumber(phone);

  const getWhatsAppUrl = () => {
    let num = cleanPhone;
    if (num.length === 10 && /^\d+$/.test(num)) {
      num = `91${num}`;
    } else if (num.startsWith('+')) {
      num = num.substring(1);
    }
    return `https://wa.me/${num}`;
  };

  const handleCall = (e) => {
    if (e) e.stopPropagation();
    window.location.href = `tel:${cleanPhone}`;
    setIsContactDialogOpen(false);
  };

  const handleWhatsApp = (e) => {
    if (e) e.stopPropagation();
    window.open(getWhatsAppUrl(), '_blank');
    setIsContactDialogOpen(false);
  };

  const handleCopy = (e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(formattedPhone);
    setIsCopied(true);
    toast.success(`Copied ${formattedPhone} to clipboard`);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
      {/* Contact Badge / Action Bar */}
      <div
        className={`inline-flex items-center gap-1.5 p-1 px-2.5 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 to-indigo-50/60 hover:from-blue-100/90 hover:to-indigo-100/80 transition-all duration-200 shadow-2xs group ${className}`}
      >
        <button
          type="button"
          onClick={() => setIsContactDialogOpen(true)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-900 hover:text-blue-950 transition-colors focus:outline-none"
          title={`Click to contact ${customerName}`}
        >
          <Phone className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span className="font-mono tracking-tight">{formattedPhone}</span>
        </button>

        {showActions && (
          <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-blue-200/80">
            {/* Direct Call Action */}
            <button
              type="button"
              onClick={handleCall}
              className="p-1 rounded-md text-blue-700 hover:text-blue-900 hover:bg-blue-200/60 transition-colors focus:outline-none"
              title={`Call ${customerName} (${formattedPhone})`}
            >
              <PhoneCall className="h-3.5 w-3.5" />
            </button>

            {/* Direct WhatsApp Action */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="p-1 rounded-md text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/80 transition-colors focus:outline-none"
              title={`WhatsApp ${customerName}`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>

            {/* Direct Copy Action */}
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 transition-colors focus:outline-none"
              title="Copy phone number"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Customer Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <DialogHeader className="text-left space-y-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <LetterAvatar name={customerName} size="md" className="text-white shrink-0 shadow-xs" />
              <div>
                <DialogTitle className="text-base font-bold text-gray-900 leading-tight">
                  Contact {customerName}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1.5">
                  <span>{formattedPhone}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-primary hover:underline inline-flex items-center gap-1 text-[11px] font-sans font-medium"
                  >
                    {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Action Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Call Option */}
            <button
              type="button"
              onClick={handleCall}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/90 text-blue-900 transition-all duration-150 group text-left shadow-2xs active:scale-[0.98]"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-blue-950">Phone Call</div>
                <div className="text-[11px] text-blue-700 font-mono truncate">{formattedPhone}</div>
              </div>
            </button>

            {/* WhatsApp Option */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/90 text-emerald-900 transition-all duration-150 group text-left shadow-2xs active:scale-[0.98]"
            >
              <div className="h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-emerald-950 flex items-center gap-1">
                  <span>WhatsApp</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </div>
                <div className="text-[11px] text-emerald-700 truncate">Instant Message</div>
              </div>
            </button>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsContactDialogOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomerContact;
