const express = require('express');
const router = express.Router();

// Mock data for dashboard (in production, fetch from database)
const getDashboardStats = async () => {
  return {
    totalCustomers: 1247,
    activeSubscriptions: 892,
    monthlyRevenue: 178450,
    totalInvoices: 15678,
    newCustomersThisMonth: 89,
    churnRate: 2.3,
    averageRevenuePerUser: 199.95,
    supportTickets: 23,
    recentActivity: [
      {
        id: 1,
        type: 'subscription',
        message: 'New subscription: Premium Plan',
        customer: 'Rajesh Electronics',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        amount: 2999,
      },
      {
        id: 2,
        type: 'invoice',
        message: 'Invoice generated',
        customer: 'Mumbai Traders',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        amount: 1250,
      },
      {
        id: 3,
        type: 'support',
        message: 'Support ticket created',
        customer: 'Delhi Wholesale',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        priority: 'high',
      },
      {
        id: 4,
        type: 'payment',
        message: 'Payment received',
        customer: 'Chennai Exports',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        amount: 1999,
      },
      {
        id: 5,
        type: 'subscription',
        message: 'Subscription cancelled',
        customer: 'Kolkata Imports',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        reason: 'Cost concerns',
      },
    ],
    monthlyGrowth: [
      { month: 'Jan', customers: 156, revenue: 31200 },
      { month: 'Feb', customers: 189, revenue: 37800 },
      { month: 'Mar', customers: 234, revenue: 46800 },
      { month: 'Apr', customers: 267, revenue: 53400 },
      { month: 'May', customers: 298, revenue: 59600 },
      { month: 'Jun', customers: 334, revenue: 66800 },
      { month: 'Jul', customers: 378, revenue: 75600 },
      { month: 'Aug', customers: 423, revenue: 84600 },
      { month: 'Sep', customers: 456, revenue: 91200 },
    ],
    topCustomers: [
      { name: 'Mumbai Mega Store', revenue: 12450, invoices: 89, plan: 'Premium' },
      { name: 'Delhi Electronics Hub', revenue: 9870, invoices: 67, plan: 'Premium' },
      { name: 'Chennai Traders', revenue: 8760, invoices: 54, plan: 'Standard' },
      { name: 'Bangalore Wholesale', revenue: 7650, invoices: 43, plan: 'Premium' },
      { name: 'Hyderabad Exports', revenue: 6540, invoices: 38, plan: 'Standard' },
    ],
    planDistribution: [
      { plan: 'Basic', count: 234, percentage: 26.2 },
      { plan: 'Standard', count: 445, percentage: 49.9 },
      { plan: 'Premium', count: 213, percentage: 23.9 },
    ],
  };
};

// Dashboard home
router.get('/', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    
    res.render('dashboard/index', {
      title: 'Dashboard',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      stats,
      currentPage: 'dashboard',
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', {
      title: 'Dashboard Error',
      message: 'Failed to load dashboard data',
      status: 500,
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// API endpoint for dashboard stats
router.get('/api/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// API endpoint for recent activity
router.get('/api/activity', async (req, res) => {
  try {
    const { limit = 10, type } = req.query;
    const stats = await getDashboardStats();
    
    let activity = stats.recentActivity;
    
    if (type) {
      activity = activity.filter(item => item.type === type);
    }
    
    activity = activity.slice(0, parseInt(limit));
    
    res.json(activity);
  } catch (error) {
    console.error('Activity API error:', error);
    res.status(500).json({ error: 'Failed to fetch activity data' });
  }
});

// API endpoint for growth data
router.get('/api/growth', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const stats = await getDashboardStats();
    
    // In production, this would fetch data based on period
    res.json({
      period,
      data: stats.monthlyGrowth,
    });
  } catch (error) {
    console.error('Growth API error:', error);
    res.status(500).json({ error: 'Failed to fetch growth data' });
  }
});

// System health check
router.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected',
      shopifyApi: 'connected',
      emailService: 'connected',
      webhooks: 'active',
    },
  };
  
  res.json(health);
});

// Quick actions
router.post('/api/quick-action', async (req, res) => {
  try {
    const { action, data } = req.body;
    
    switch (action) {
      case 'send_notification':
        // Send notification to customers
        console.log('Sending notification:', data);
        res.json({ success: true, message: 'Notification sent successfully' });
        break;
        
      case 'generate_report':
        // Generate report
        console.log('Generating report:', data);
        res.json({ success: true, message: 'Report generation started' });
        break;
        
      case 'sync_data':
        // Sync data from Shopify
        console.log('Syncing data:', data);
        res.json({ success: true, message: 'Data sync initiated' });
        break;
        
      default:
        res.status(400).json({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Quick action error:', error);
    res.status(500).json({ success: false, error: 'Action failed' });
  }
});

module.exports = router;