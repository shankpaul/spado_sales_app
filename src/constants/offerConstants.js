/**
 * Offer Constants
 * Constants for offer types, discount types, and status display
 */

// Offer types
export const OFFER_TYPE_PACKAGE_BUNDLE = 'package_bundle';
export const OFFER_TYPE_ADDON_BUNDLE = 'addon_bundle';
export const OFFER_TYPE_VALUE_DISCOUNT = 'value_discount';
export const OFFER_TYPE_WASH_COMPLETION = 'wash_completion';

export const OFFER_TYPES = [
  OFFER_TYPE_PACKAGE_BUNDLE,
  OFFER_TYPE_VALUE_DISCOUNT,
  OFFER_TYPE_WASH_COMPLETION,
];

export const OFFER_TYPE_LABELS = {
  [OFFER_TYPE_PACKAGE_BUNDLE]: 'Package Bundle',
  [OFFER_TYPE_ADDON_BUNDLE]: 'Addon Bundle',
  [OFFER_TYPE_VALUE_DISCOUNT]: 'Value Discount',
  [OFFER_TYPE_WASH_COMPLETION]: 'Wash Completion',
};

export const OFFER_TYPE_DESCRIPTIONS = {
  [OFFER_TYPE_PACKAGE_BUNDLE]: 'Buy specific package(s), get other package(s) or addon(s) as reward',
  [OFFER_TYPE_ADDON_BUNDLE]: 'Buy specific addon(s), get other addon(s) as reward',
  [OFFER_TYPE_VALUE_DISCOUNT]: 'Spend a certain amount, get percentage or fixed discount',
  [OFFER_TYPE_WASH_COMPLETION]: 'Complete X washes on a package, get reward',
};

export const OFFER_TYPE_OPTIONS = OFFER_TYPES.map((type) => ({
  value: type,
  label: OFFER_TYPE_LABELS[type],
  description: OFFER_TYPE_DESCRIPTIONS[type],
}));

// Discount types
export const DISCOUNT_TYPE_FIXED = 'fixed';
export const DISCOUNT_TYPE_PERCENTAGE = 'percentage';

export const DISCOUNT_TYPES = [
  DISCOUNT_TYPE_FIXED,
  DISCOUNT_TYPE_PERCENTAGE,
];

export const DISCOUNT_TYPE_LABELS = {
  [DISCOUNT_TYPE_FIXED]: 'Fixed Amount',
  [DISCOUNT_TYPE_PERCENTAGE]: 'Percentage',
};

export const DISCOUNT_TYPE_OPTIONS = DISCOUNT_TYPES.map((type) => ({
  value: type,
  label: DISCOUNT_TYPE_LABELS[type],
}));

// Status colors for display
export const OFFER_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  upcoming: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-800',
};

// Helper function to get offer status
export const getOfferStatus = (offer) => {
  if (offer.archived_at) return 'archived';
  if (offer.is_expired) return 'expired';
  if (offer.is_upcoming) return 'upcoming';
  if (offer.is_active) return 'active';
  return 'inactive';
};

// Helper function to format discount display
export const formatDiscount = (offer) => {
  if (offer.discount_type === DISCOUNT_TYPE_PERCENTAGE) {
    return `${offer.discount_value}%`;
  }
  return `₹${offer.discount_value}`;
};

// Helper function to format usage display
export const formatUsage = (offer) => {
  if (offer.max_usage === 0) {
    return `${offer.current_usage} / Unlimited`;
  }
  return `${offer.current_usage} / ${offer.max_usage}`;
};

// Helper function to format per-user limit
export const formatPerUserLimit = (offer) => {
  if (offer.per_use_count === 0) {
    return 'Unlimited';
  }
  return `${offer.per_use_count} per customer`;
};
