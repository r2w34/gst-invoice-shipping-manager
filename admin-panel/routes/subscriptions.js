const express = require('express');
const router = express.Router();

// Mock subscription data
const getSubscriptions = async (filters = {}) => {
  const mockSubscriptions = [
    {
      id: 1,
      customerId: 1,
      customerName: 'Rajesh Electronics',
      customerEmail: 'rajesh@rajeshelectronics.com',
      plan: 'Premium',
      status: 'active',
      amount: 2999,
      currency: 'INR',
      billingCycle: 'monthly',
      startDate: new Date('2024-01-15'),
      nextBillingDate: new Date('2024-10-15'),
      trialEndsAt: null,
      cancelledAt: null,
      features: ['GST Invoicing', 'Shipping Labels', 'CRM', 'Bulk Operations', 'Priority Support'],
      usage: {
        invoices: 234,
        labels: 187,
        customers: 89,
        apiCalls: 3510,
      },
      limits: {
        invoices: 1000,
        labels: 1000,
        customers: 500,
        apiCalls: 10000,
      },
    },
    {
      id: 2,
      customerId: 2,
      customerName: 'Delhi Traders',
      customerEmail: 'amit@delhitraders.com',
      plan: 'Standard',
      status: 'active',
      amount: 1999,
      currency: 'INR',
      billingCycle: 'monthly',
      startDate: new Date('2024-02-20'),
      nextBillingDate: new Date('2024-10-20'),
      trialEndsAt: null,
      cancelledAt: null,
      features: ['GST Invoicing', 'Shipping Labels', 'CRM', 'Email Support'],
      usage: {
        invoices: 156,
        labels: 124,
        customers: 67,
        apiCalls: 2340,
      },
      limits: {
        invoices: 500,
        labels: 500,
        customers: 200,
        apiCalls: 5000,
      },
    },
    {
      id: 3,
      customerId: 3,
      customerName: 'Chennai Exports',
      customerEmail: 'priya@chennaiexports.com',
      plan: 'Basic',
      status: 'trial',
      amount: 999,
      currency: 'INR',
      billingCycle: 'monthly',
      startDate: new Date('2024-09-10'),
      nextBillingDate: new Date('2024-10-10'),
      trialEndsAt: new Date('2024-09-24'),
      cancelledAt: null,
      features: ['GST Invoicing', 'Basic Support'],
      usage: {
        invoices: 23,
        labels: 18,
        customers: 12,
        apiCalls: 345,
      },
      limits: {
        invoices: 100,
        labels: 100,
        customers: 50,
        apiCalls: 1000,
      },
    },
    {
      id: 4,
      customerId: 4,
      customerName: 'Bangalore Wholesale',
      customerEmail: 'suresh@bangalorewholesale.com',
      plan: 'Premium',
      status: 'past_due',
      amount: 2999,
      currency: 'INR',
      billingCycle: 'monthly',
      startDate: new Date('2024-03-10'),
      nextBillingDate: new Date('2024-09-10'),
      trialEndsAt: null,
      cancelledAt: null,
      features: ['GST Invoicing', 'Shipping Labels', 'CRM', 'Bulk Operations', 'Priority Support'],
      usage: {
        invoices: 189,
        labels: 151,
        customers: 78,
        apiCalls: 2835,
      },
      limits: {
        invoices: 1000,
        labels: 1000,
        customers: 500,
        apiCalls: 10000,
      },
    },
    {
      id: 5,
      customerId: 5,
      customerName: 'Kolkata Imports',
      customerEmail: 'debashish@kolkataimports.com',
      plan: 'Standard',
      status: 'cancelled',
      amount: 1999,
      currency: 'INR',
      billingCycle: 'monthly',
      startDate: new Date('2024-01-05'),
      nextBillingDate: null,
      trialEndsAt: null,
      cancelledAt: new Date('2024-08-30'),
      features: ['GST Invoicing', 'Shipping Labels', 'CRM', 'Email Support'],
      usage: {
        invoices: 98,
        labels: 78,
        customers: 45,
        apiCalls: 1470,
      },
      limits: {
        invoices: 500,
        labels: 500,
        customers: 200,
        apiCalls: 5000,
      },
    },
  ];

  let filteredSubscriptions = mockSubscriptions;

  if (filters.status) {
    filteredSubscriptions = filteredSubscriptions.filter(s => s.status === filters.status);
  }

  if (filters.plan) {
    filteredSubscriptions = filteredSubscriptions.filter(s => s.plan === filters.plan);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filteredSubscriptions = filteredSubscriptions.filter(s => 
      s.customerName.toLowerCase().includes(search) ||
      s.customerEmail.toLowerCase().includes(search) ||
      s.plan.toLowerCase().includes(search)
    );
  }

  return {
    subscriptions: filteredSubscriptions,
    total: filteredSubscriptions.length,
    stats: {
      total: mockSubscriptions.length,
      active: mockSubscriptions.filter(s => s.status === 'active').length,
      trial: mockSubscriptions.filter(s => s.status === 'trial').length,
      pastDue: mockSubscriptions.filter(s => s.status === 'past_due').length,
      cancelled: mockSubscriptions.filter(s => s.status === 'cancelled').length,
      monthlyRevenue: mockSubscriptions
        .filter(s => s.status === 'active' && s.billingCycle === 'monthly')
        .reduce((sum, s) => sum + s.amount, 0),
      annualRevenue: mockSubscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.billingCycle === 'monthly' ? s.amount * 12 : s.amount), 0),
    },
  };
};

// Subscription plans configuration
const subscriptionPlans = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 999,
    currency: 'INR',
    billingCycle: 'monthly',
    features: [
      'GST-compliant invoice generation',
      'Up to 100 invoices/month',
      'Up to 100 shipping labels/month',
      'Up to 50 customers',
      'Basic support',
      'PDF download',
    ],
    limits: {
      invoices: 100,
      labels: 100,
      customers: 50,
      apiCalls: 1000,
    },
  },
  {
    id: 'standard',
    name: 'Standard Plan',
    price: 1999,
    currency: 'INR',
    billingCycle: 'monthly',
    features: [
      'All Basic features',
      'Up to 500 invoices/month',
      'Up to 500 shipping labels/month',
      'Up to 200 customers',
      'Bulk operations',
      'Email sharing',
      'CRM features',
      'Email support',
    ],
    limits: {
      invoices: 500,
      labels: 500,
      customers: 200,
      apiCalls: 5000,
    },
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: 2999,
    currency: 'INR',
    billingCycle: 'monthly',
    features: [
      'All Standard features',
      'Up to 1000 invoices/month',
      'Up to 1000 shipping labels/month',
      'Up to 500 customers',
      'WhatsApp sharing',
      'Advanced reports',
      'Multi-user access',
      'Priority support',
      'Custom branding',
    ],
    limits: {
      invoices: 1000,
      labels: 1000,
      customers: 500,
      apiCalls: 10000,
    },
  },
];

// Subscriptions listing page
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      plan: req.query.plan,
      search: req.query.search,
    };

    const { subscriptions, total, stats } = await getSubscriptions(filters);

    res.render('subscriptions/index', {
      title: 'Subscription Management',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      subscriptions,
      total,
      stats,
      filters,
      plans: subscriptionPlans,
      currentPage: 'subscriptions',
    });
  } catch (error) {
    console.error('Subscriptions page error:', error);
    res.status(500).render('error', {
      title: 'Subscriptions Error',
      message: 'Failed to load subscriptions data',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Individual subscription details
router.get('/:id', async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const { subscriptions } = await getSubscriptions();
    const subscription = subscriptions.find(s => s.id === subscriptionId);

    if (!subscription) {
      return res.status(404).render('error', {
        title: 'Subscription Not Found',
        message: 'The requested subscription could not be found',
        error: {},
      });
    }

    // Mock billing history
    const billingHistory = [
      {
        id: 1,
        date: new Date('2024-09-15'),
        amount: subscription.amount,
        status: 'paid',
        invoiceNumber: 'INV-2024-09-001',
        paymentMethod: 'Credit Card',
      },
      {
        id: 2,
        date: new Date('2024-08-15'),
        amount: subscription.amount,
        status: 'paid',
        invoiceNumber: 'INV-2024-08-001',
        paymentMethod: 'Credit Card',
      },
      {
        id: 3,
        date: new Date('2024-07-15'),
        amount: subscription.amount,
        status: 'paid',
        invoiceNumber: 'INV-2024-07-001',
        paymentMethod: 'Credit Card',
      },
    ];

    res.render('subscriptions/detail', {
      title: `${subscription.customerName} - Subscription Details`,
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      subscription,
      billingHistory,
      plans: subscriptionPlans,
      currentPage: 'subscriptions',
    });
  } catch (error) {
    console.error('Subscription detail error:', error);
    res.status(500).render('error', {
      title: 'Subscription Detail Error',
      message: 'Failed to load subscription details',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Update subscription plan
router.post('/:id/plan', async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const { planId, reason } = req.body;

    const plan = subscriptionPlans.find(p => p.id === planId);
    if (!plan) {
      return res.status(400).json({ success: false, error: 'Invalid plan selected' });
    }

    // In production, update database and handle billing changes
    console.log(`Updating subscription ${subscriptionId} to plan ${planId}`, { reason });

    res.json({ 
      success: true, 
      message: `Subscription updated to ${plan.name}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update subscription plan error:', error);
    res.status(500).json({ success: false, error: 'Failed to update subscription plan' });
  }
});

// Cancel subscription
router.post('/:id/cancel', async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const { reason, immediate } = req.body;

    // In production, handle cancellation logic
    console.log(`Cancelling subscription ${subscriptionId}`, { reason, immediate });

    const message = immediate 
      ? 'Subscription cancelled immediately'
      : 'Subscription will be cancelled at the end of current billing period';

    res.json({ 
      success: true, 
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
router.post('/:id/reactivate', async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const { reason } = req.body;

    // In production, handle reactivation logic
    console.log(`Reactivating subscription ${subscriptionId}`, { reason });

    res.json({ 
      success: true, 
      message: 'Subscription reactivated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to reactivate subscription' });
  }
});

// Apply discount/coupon
router.post('/:id/discount', async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const { discountType, discountValue, duration, reason } = req.body;

    // In production, apply discount logic
    console.log(`Applying discount to subscription ${subscriptionId}`, { 
      discountType, 
      discountValue, 
      duration, 
      reason 
    });

    res.json({ 
      success: true, 
      message: 'Discount applied successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(500).json({ success: false, error: 'Failed to apply discount' });
  }
});

// Export subscriptions data
router.get('/export/csv', async (req, res) => {
  try {
    const { subscriptions } = await getSubscriptions();
    
    // Generate CSV
    const csvHeader = 'Customer Name,Email,Plan,Status,Amount,Billing Cycle,Start Date,Next Billing,Usage (Invoices),Usage (Labels)\n';
    const csvData = subscriptions.map(s => 
      `"${s.customerName}","${s.customerEmail}","${s.plan}","${s.status}",${s.amount},"${s.billingCycle}","${s.startDate.toISOString().split('T')[0]}","${s.nextBillingDate ? s.nextBillingDate.toISOString().split('T')[0] : 'N/A'}",${s.usage.invoices},${s.usage.labels}`
    ).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export subscriptions error:', error);
    res.status(500).json({ success: false, error: 'Failed to export subscriptions data' });
  }
});

// API endpoints
router.get('/api/list', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      plan: req.query.plan,
      search: req.query.search,
    };

    const result = await getSubscriptions(filters);
    res.json(result);
  } catch (error) {
    console.error('Subscriptions API error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions data' });
  }
});

router.get('/api/stats', async (req, res) => {
  try {
    const { stats } = await getSubscriptions();
    res.json(stats);
  } catch (error) {
    console.error('Subscription stats API error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription stats' });
  }
});

router.get('/api/plans', (req, res) => {
  res.json(subscriptionPlans);
});

module.exports = router;