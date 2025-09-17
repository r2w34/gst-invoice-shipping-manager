const express = require('express');
const router = express.Router();

// Mock analytics data
const getAnalyticsData = async (period = 'monthly') => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Revenue data
  const revenueData = {
    monthly: [
      { month: 'Jan', revenue: 156780, customers: 156, invoices: 2340 },
      { month: 'Feb', revenue: 189450, customers: 189, invoices: 2856 },
      { month: 'Mar', revenue: 234560, customers: 234, invoices: 3512 },
      { month: 'Apr', revenue: 267890, customers: 267, invoices: 4023 },
      { month: 'May', revenue: 298340, customers: 298, invoices: 4475 },
      { month: 'Jun', revenue: 334670, customers: 334, invoices: 5020 },
      { month: 'Jul', revenue: 378920, customers: 378, invoices: 5684 },
      { month: 'Aug', revenue: 423150, customers: 423, invoices: 6347 },
      { month: 'Sep', revenue: 456780, customers: 456, invoices: 6851 },
    ],
    weekly: [
      { week: 'Week 1', revenue: 45600, customers: 23, invoices: 342 },
      { week: 'Week 2', revenue: 52300, customers: 28, invoices: 394 },
      { week: 'Week 3', revenue: 48900, customers: 25, invoices: 367 },
      { week: 'Week 4', revenue: 51200, customers: 27, invoices: 385 },
    ],
    daily: [
      { day: 'Mon', revenue: 12300, customers: 6, invoices: 92 },
      { day: 'Tue', revenue: 15600, customers: 8, invoices: 117 },
      { day: 'Wed', revenue: 14200, customers: 7, invoices: 107 },
      { day: 'Thu', revenue: 16800, customers: 9, invoices: 126 },
      { day: 'Fri', revenue: 18900, customers: 10, invoices: 142 },
      { day: 'Sat', revenue: 11400, customers: 6, invoices: 86 },
      { day: 'Sun', revenue: 9800, customers: 5, invoices: 74 },
    ],
  };

  // Customer acquisition data
  const customerAcquisition = {
    organic: 45,
    referral: 23,
    paid: 18,
    social: 14,
  };

  // Plan distribution
  const planDistribution = {
    basic: { count: 234, percentage: 26.2, revenue: 233766 },
    standard: { count: 445, percentage: 49.9, revenue: 889555 },
    premium: { count: 213, percentage: 23.9, revenue: 638787 },
  };

  // Geographic distribution
  const geographicData = [
    { state: 'Maharashtra', customers: 187, revenue: 374000 },
    { state: 'Delhi', customers: 156, revenue: 312000 },
    { state: 'Karnataka', customers: 134, revenue: 268000 },
    { state: 'Tamil Nadu', customers: 123, revenue: 246000 },
    { state: 'Gujarat', customers: 98, revenue: 196000 },
    { state: 'Uttar Pradesh', customers: 87, revenue: 174000 },
    { state: 'West Bengal', customers: 76, revenue: 152000 },
    { state: 'Rajasthan', customers: 65, revenue: 130000 },
  ];

  // Feature usage
  const featureUsage = {
    invoiceGeneration: { usage: 95.6, trend: 'up' },
    shippingLabels: { usage: 78.3, trend: 'up' },
    customerManagement: { usage: 67.8, trend: 'stable' },
    bulkOperations: { usage: 45.2, trend: 'up' },
    whatsappSharing: { usage: 34.7, trend: 'up' },
    emailSharing: { usage: 56.9, trend: 'stable' },
    pdfDownload: { usage: 89.4, trend: 'stable' },
    reports: { usage: 23.8, trend: 'down' },
  };

  // Churn analysis
  const churnData = {
    rate: 2.3,
    reasons: [
      { reason: 'Cost concerns', percentage: 35.2 },
      { reason: 'Feature limitations', percentage: 28.7 },
      { reason: 'Technical issues', percentage: 18.5 },
      { reason: 'Competitor switch', percentage: 12.1 },
      { reason: 'Business closure', percentage: 5.5 },
    ],
    byPlan: {
      basic: 3.8,
      standard: 2.1,
      premium: 1.2,
    },
  };

  // Support metrics
  const supportMetrics = {
    totalTickets: 234,
    openTickets: 23,
    avgResponseTime: 2.4, // hours
    avgResolutionTime: 18.6, // hours
    satisfactionScore: 4.2, // out of 5
    ticketsByCategory: [
      { category: 'Technical Issues', count: 89, percentage: 38.0 },
      { category: 'Billing Questions', count: 67, percentage: 28.6 },
      { category: 'Feature Requests', count: 45, percentage: 19.2 },
      { category: 'Account Management', count: 33, percentage: 14.1 },
    ],
  };

  return {
    revenue: revenueData[period] || revenueData.monthly,
    customerAcquisition,
    planDistribution,
    geographicData,
    featureUsage,
    churnData,
    supportMetrics,
    summary: {
      totalRevenue: 1762108,
      totalCustomers: 892,
      averageRevenuePerUser: 1975,
      monthlyGrowthRate: 8.7,
      customerGrowthRate: 12.3,
      churnRate: 2.3,
    },
  };
};

// Analytics dashboard
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || 'monthly';
    const analytics = await getAnalyticsData(period);

    res.render('analytics/index', {
      title: 'Analytics & Reports',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      analytics,
      period,
      currentPage: 'analytics',
    });
  } catch (error) {
    console.error('Analytics page error:', error);
    res.status(500).render('error', {
      title: 'Analytics Error',
      message: 'Failed to load analytics data',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Revenue analytics
router.get('/revenue', async (req, res) => {
  try {
    const period = req.query.period || 'monthly';
    const analytics = await getAnalyticsData(period);

    res.render('analytics/revenue', {
      title: 'Revenue Analytics',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      revenue: analytics.revenue,
      planDistribution: analytics.planDistribution,
      summary: analytics.summary,
      period,
      currentPage: 'analytics',
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).render('error', {
      title: 'Revenue Analytics Error',
      message: 'Failed to load revenue analytics',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Customer analytics
router.get('/customers', async (req, res) => {
  try {
    const analytics = await getAnalyticsData();

    res.render('analytics/customers', {
      title: 'Customer Analytics',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      customerAcquisition: analytics.customerAcquisition,
      geographicData: analytics.geographicData,
      churnData: analytics.churnData,
      summary: analytics.summary,
      currentPage: 'analytics',
    });
  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).render('error', {
      title: 'Customer Analytics Error',
      message: 'Failed to load customer analytics',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Feature usage analytics
router.get('/usage', async (req, res) => {
  try {
    const analytics = await getAnalyticsData();

    res.render('analytics/usage', {
      title: 'Feature Usage Analytics',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      featureUsage: analytics.featureUsage,
      supportMetrics: analytics.supportMetrics,
      currentPage: 'analytics',
    });
  } catch (error) {
    console.error('Usage analytics error:', error);
    res.status(500).render('error', {
      title: 'Usage Analytics Error',
      message: 'Failed to load usage analytics',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// API endpoints
router.get('/api/revenue', async (req, res) => {
  try {
    const period = req.query.period || 'monthly';
    const analytics = await getAnalyticsData(period);
    
    res.json({
      revenue: analytics.revenue,
      planDistribution: analytics.planDistribution,
      summary: analytics.summary,
    });
  } catch (error) {
    console.error('Revenue API error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

router.get('/api/customers', async (req, res) => {
  try {
    const analytics = await getAnalyticsData();
    
    res.json({
      acquisition: analytics.customerAcquisition,
      geographic: analytics.geographicData,
      churn: analytics.churnData,
    });
  } catch (error) {
    console.error('Customer analytics API error:', error);
    res.status(500).json({ error: 'Failed to fetch customer analytics' });
  }
});

router.get('/api/usage', async (req, res) => {
  try {
    const analytics = await getAnalyticsData();
    
    res.json({
      features: analytics.featureUsage,
      support: analytics.supportMetrics,
    });
  } catch (error) {
    console.error('Usage analytics API error:', error);
    res.status(500).json({ error: 'Failed to fetch usage analytics' });
  }
});

router.get('/api/summary', async (req, res) => {
  try {
    const analytics = await getAnalyticsData();
    res.json(analytics.summary);
  } catch (error) {
    console.error('Summary API error:', error);
    res.status(500).json({ error: 'Failed to fetch summary data' });
  }
});

// Export analytics data
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'csv' } = req.query;
    const analytics = await getAnalyticsData();

    let data, filename;

    switch (type) {
      case 'revenue':
        data = analytics.revenue;
        filename = 'revenue-analytics';
        break;
      case 'customers':
        data = analytics.geographicData;
        filename = 'customer-analytics';
        break;
      case 'usage':
        data = Object.entries(analytics.featureUsage).map(([feature, data]) => ({
          feature,
          usage: data.usage,
          trend: data.trend,
        }));
        filename = 'usage-analytics';
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(',')).join('\n');
      const csv = headers + '\n' + rows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      res.send(csv);
    } else {
      // Return JSON
      res.json(data);
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

module.exports = router;