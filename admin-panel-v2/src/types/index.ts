export interface Customer {
  id: string;
  shopDomain: string;
  ownerEmail: string;
  storeName: string;
  subscriptionPlan: 'basic' | 'standard' | 'premium';
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'failed';
  invoicesGenerated: number;
  labelsGenerated: number;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  plan: 'basic' | 'standard' | 'premium';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  amount: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalCustomers: number;
  activeCustomers: number;
  trialCustomers: number;
  churnRate: number;
  invoicesGenerated: number;
  labelsGenerated: number;
  featureUsage: {
    invoiceGeneration: { usage: number; trend: number };
    labelGeneration: { usage: number; trend: number };
    bulkOperations: { usage: number; trend: number };
    whatsappSharing: { usage: number; trend: number };
  };
  revenueByPlan: Array<{ plan: string; revenue: number; customers: number }>;
  geographicData: Array<{ state: string; customers: number; revenue: number }>;
}

export interface Settings {
  id: string;
  companyName: string;
  supportEmail: string;
  maxTrialDays: number;
  defaultPlan: string;
  maintenanceMode: boolean;
  allowNewSignups: boolean;
  emailNotifications: boolean;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}