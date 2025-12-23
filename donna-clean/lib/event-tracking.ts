import { track } from '@vercel/analytics';

export const analytics = {
  // Track user actions
  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      track(eventName, properties);
    }
  },

  // Common events
  entryCreated: (entryType: string, amount: number) => {
    track('Entry Created', { entryType, amount });
  },

  settlementCompleted: (type: string, amount: number) => {
    track('Settlement Completed', { type, amount });
  },

  reportExported: (reportType: string) => {
    track('Report Exported', { reportType });
  },

  featureUsed: (featureName: string) => {
    track('Feature Used', { feature: featureName });
  },
};
