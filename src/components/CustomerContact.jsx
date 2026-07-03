import { useState } from 'react';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Phone, MessageCircle } from 'lucide-react';

/**
 * CustomerContact Component
 * Reusable component for customer contact actions (Call/WhatsApp)
 */
const CustomerContact = ({
  phone,
  customerName = 'Customer',
  variant = 'secondary',
  className = '',
  showIcon = true
}) => {
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  const handleCall = () => {
    window.location.href = `tel:${phone}`;
    setIsContactDialogOpen(false);
  };

  const handleWhatsApp = () => {
    // WhatsApp URL format: https://wa.me/[country_code][phone_number]
    // Remove any special characters and spaces from phone
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
    setIsContactDialogOpen(false);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    const cleanPhone = phone.trim().replace(/[^0-9+]/g, '');
    if (cleanPhone.length === 10 && /^\d+$/.test(cleanPhone)) {
      return `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
    }
    if (cleanPhone.startsWith('+91') && cleanPhone.length === 13) {
      return `+91 ${cleanPhone.slice(3, 8)} ${cleanPhone.slice(8)}`;
    }
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      return `+91 ${cleanPhone.slice(2, 7)} ${cleanPhone.slice(7)}`;
    }
    return phone;
  };

  return (
    <>
      <Badge
        variant={variant}
        className={`justify-between bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer h-auto py-2 px-3 flex gap-2 font-normal group ${className}`}
        onClick={() => setIsContactDialogOpen(true)}
      >
        <span>{formatPhoneNumber(phone)}</span>
        {showIcon && (
          <Phone className="h-3 w-3 transition-opacity" />
        )}
      </Badge>

      <AlertDialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contact {customerName}</AlertDialogTitle>
            <AlertDialogDescription>
              How would you like to contact {customerName} at {formatPhoneNumber(phone)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </AlertDialogAction>
            <AlertDialogAction onClick={handleCall}>
              <Phone className="h-4 w-4 mr-2" />
              Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomerContact;
