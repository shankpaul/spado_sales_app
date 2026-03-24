/**
 * Enquiry Constants
 * Sources, Statuses, and Sentiments for lead tracking
 */

// Enquiry Sources
export const ENQUIRY_SOURCES = {
  WHATSAPP: 'whatsapp',
  PHONE_CALL: 'phone_call',
  WALK_IN: 'walk_in',
  WEBSITE: 'website',
  REFERRAL: 'referral',
  SOCIAL_MEDIA: 'social_media',
  GOOGLE_ADS: 'google_ads',
};

export const ENQUIRY_SOURCE_LABELS = {
  [ENQUIRY_SOURCES.WHATSAPP]: 'WhatsApp',
  [ENQUIRY_SOURCES.PHONE_CALL]: 'Phone Call',
  [ENQUIRY_SOURCES.WALK_IN]: 'Walk-In',
  [ENQUIRY_SOURCES.WEBSITE]: 'Website',
  [ENQUIRY_SOURCES.REFERRAL]: 'Referral',
  [ENQUIRY_SOURCES.SOCIAL_MEDIA]: 'Social Media',
  [ENQUIRY_SOURCES.GOOGLE_ADS]: 'Google Ads',
};

export const ENQUIRY_SOURCE_OPTIONS = Object.entries(ENQUIRY_SOURCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// Enquiry Statuses
export const ENQUIRY_STATUSES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  INTERESTED: 'interested',
  NEEDS_FOLLOWUP: 'needs_followup',
  CONVERTED: 'converted',
  LOST: 'lost',
};

export const ENQUIRY_STATUS_LABELS = {
  [ENQUIRY_STATUSES.NEW]: 'New',
  [ENQUIRY_STATUSES.CONTACTED]: 'Contacted',
  [ENQUIRY_STATUSES.INTERESTED]: 'Interested',
  [ENQUIRY_STATUSES.NEEDS_FOLLOWUP]: 'Needs Follow-up',
  [ENQUIRY_STATUSES.CONVERTED]: 'Converted',
  [ENQUIRY_STATUSES.LOST]: 'Lost',
};

export const ENQUIRY_STATUS_OPTIONS = Object.entries(ENQUIRY_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// Status colors for badges
export const ENQUIRY_STATUS_COLORS = {
  [ENQUIRY_STATUSES.NEW]: 'info',
  [ENQUIRY_STATUSES.CONTACTED]: 'info',
  [ENQUIRY_STATUSES.INTERESTED]: 'info',
  [ENQUIRY_STATUSES.NEEDS_FOLLOWUP]: 'warning',
  [ENQUIRY_STATUSES.CONVERTED]: 'success',
  [ENQUIRY_STATUSES.LOST]: 'destructive',
};

// Customer Sentiments
export const SENTIMENTS = {
  HAPPY: 'happy',
  ANGRY: 'angry',
  BUSY: 'busy',
  THINKING: 'thinking',
  INTERESTED: 'interested',
  NOT_INTERESTED: 'not_interested',
};

export const SENTIMENT_LABELS = {
  [SENTIMENTS.HAPPY]: 'Happy',
  [SENTIMENTS.ANGRY]: 'Angry',
  [SENTIMENTS.BUSY]: 'Busy',
  [SENTIMENTS.THINKING]: 'Thinking',
  [SENTIMENTS.INTERESTED]: 'Interested',
  [SENTIMENTS.NOT_INTERESTED]: 'Not Interested',
};

export const SENTIMENT_OPTIONS = Object.entries(SENTIMENT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// Sentiment colors
export const SENTIMENT_COLORS = {
  [SENTIMENTS.HAPPY]: 'success',
  [SENTIMENTS.ANGRY]: 'destructive',
  [SENTIMENTS.BUSY]: 'warning',
  [SENTIMENTS.THINKING]: 'info',
  [SENTIMENTS.INTERESTED]: 'success',
  [SENTIMENTS.NOT_INTERESTED]: 'secondary',
};

// Sentiment emojis
export const SENTIMENT_EMOJIS = {
  [SENTIMENTS.HAPPY]: '😊',
  [SENTIMENTS.ANGRY]: '😠',
  [SENTIMENTS.BUSY]: '⏰',
  [SENTIMENTS.THINKING]: '🤔',
  [SENTIMENTS.INTERESTED]: '⭐',
  [SENTIMENTS.NOT_INTERESTED]: '🚫',
};

// Lost Reasons
export const LOST_REASONS = {
  TOO_EXPENSIVE: 'too_expensive',
  CHOSE_COMPETITOR: 'chose_competitor',
  NOT_INTERESTED: 'not_interested',
  NO_RESPONSE: 'no_response',
  TIMING_ISSUE: 'timing_issue',
  SERVICE_NOT_AVAILABLE: 'service_not_available',
  OTHER: 'other',
};

export const LOST_REASON_LABELS = {
  [LOST_REASONS.TOO_EXPENSIVE]: 'Too Expensive',
  [LOST_REASONS.CHOSE_COMPETITOR]: 'Chose Competitor',
  [LOST_REASONS.NOT_INTERESTED]: 'Not Interested Anymore',
  [LOST_REASONS.NO_RESPONSE]: 'No Response from Customer',
  [LOST_REASONS.TIMING_ISSUE]: 'Timing Issue',
  [LOST_REASONS.SERVICE_NOT_AVAILABLE]: 'Service Not Available',
  [LOST_REASONS.OTHER]: 'Other Reason',
};

export const LOST_REASON_OPTIONS = Object.entries(LOST_REASON_LABELS).map(([value, label]) => ({
  value,
  label,
}));
