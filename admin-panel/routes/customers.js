const express = require('express');
const router = express.Router();

// Mock customer data (in production, fetch from shared database)
const getCustomers = async (filters = {}) => {
  const mockCustomers = [
    {
      id: 1,
      shopDomain: 'rajesh-electronics.myshopify.com',
      storeName: 'Rajesh Electronics',
      ownerName: 'Rajesh Kumar',
      ownerEmail: 'rajesh@rajeshelectronics.com',
      phone: '+91 9876543210',
      plan: 'Premium',
      status: 'active',
      subscriptionDate: new Date('2024-01-15'),
      lastLogin: new Date('2024-09-16'),
      totalInvoices: 234,
      totalRevenue: 12450,
      location: 'Mumbai, Maharashtra',
      gstin: '27AAAAA0000A1Z5',
      paymentStatus: 'paid',
      trialEndsAt: null,
      features: ['GST Invoicing', 'Shipping Labels', 'CRM', 'Bulk Operations'],
    },
    {
      id: 2,
      shopDomain: 'delhi-traders.myshopify.com',
      storeName: 'Delhi Traders',
      ownerName: 'Amit Sharma',
      ownerEmail: 'amit@delhitraders.com',
      phone: '+91 9876543211',
      plan: 'Standard',
      status: 'active',
      subscriptionDate: new Date('2024-02-20'),
      lastLogin: new Date('2024-09-15'),
      totalInvoices: 156,
      totalRevenue: 8760,
      location: 'Delhi, Delhi',
      gstin: '07BBBBB1111B2Z6',
      paymentStatus: 'paid',
      trialEndsAt: null,
      features: ['GST Invoicing', 'Shipping Labels', 'CRM'],
    },
    {
      id: 3,
      shopDomain: 'chennai-exports.myshopify.com',
      storeName: 'Chennai Exports',
      ownerName: 'Priya Raman',
      ownerEmail: 'priya@chennaiexports.com',
      phone: '+91 9876543212',
      plan: 'Basic',
      status: 'trial',
      subscriptionDate: new Date('2024-09-10'),
      lastLogin: new Date('2024-09-17'),
      totalInvoices: 23,
      totalRevenue: 1250,
      location: 'Chennai, Tamil Nadu',
      gstin: '33CCCCC2222C3Z7',
      paymentStatus: 'trial',
      trialEndsAt: new Date('2024-09-24'),
      features: ['GST Invoicing'],
    },
    {
      id: 4,
      shopDomain: 'bangalore-wholesale.myshopify.com',
      storeName: 'Bangalore Wholesale',
      ownerName: 'Suresh Reddy',
      ownerEmail: 'suresh@bangalorewholesale.com',
      phone: '+91 9876543213',
      plan: 'Premium',
      status: 'suspended',
      subscriptionDate: new Date('2024-03-10'),
      lastLogin: new Date('2024-09-10'),
      totalInvoices: 189,
      totalRevenue: 9870,
      location: 'Bangalore, Karnataka',
      gstin: '29DDDDD3333D4Z8',
      paymentStatus: 'failed',
      trialEndsAt: null,
      features: ['GST Invoicing', 'Shipping Labels', 'CRM', 'Bulk Operations'],
    },
    {
      id: 5,
      shopDomain: 'kolkata-imports.myshopify.com',
      storeName: 'Kolkata Imports',
      ownerName: 'Debashish Roy',
      ownerEmail: 'debashish@kolkataimports.com',
      phone: '+91 9876543214',
      plan: 'Standard',
      status: 'cancelled',
      subscriptionDate: new Date('2024-01-05'),
      lastLogin: new Date('2024-08-30'),
      totalInvoices: 98,
      totalRevenue: 5430,
      location: 'Kolkata, West Bengal',
      gstin: '19EEEEE4444E5Z9',
      paymentStatus: 'cancelled',
      trialEndsAt: null,
      features: ['GST Invoicing', 'Shipping Labels', 'CRM'],
    },
  ];

  let filteredCustomers = mockCustomers;

  if (filters.status) {
    filteredCustomers = filteredCustomers.filter(c => c.status === filters.status);
  }

  if (filters.plan) {
    filteredCustomers = filteredCustomers.filter(c => c.plan === filters.plan);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filteredCustomers = filteredCustomers.filter(c => 
      c.storeName.toLowerCase().includes(search) ||
      c.ownerName.toLowerCase().includes(search) ||
      c.ownerEmail.toLowerCase().includes(search) ||
      c.shopDomain.toLowerCase().includes(search)
    );
  }

  return {
    customers: filteredCustomers,
    total: filteredCustomers.length,
    stats: {
      total: mockCustomers.length,
      active: mockCustomers.filter(c => c.status === 'active').length,
      trial: mockCustomers.filter(c => c.status === 'trial').length,
      suspended: mockCustomers.filter(c => c.status === 'suspended').length,
      cancelled: mockCustomers.filter(c => c.status === 'cancelled').length,
      totalRevenue: mockCustomers.reduce((sum, c) => sum + c.totalRevenue, 0),
      averageRevenue: mockCustomers.reduce((sum, c) => sum + c.totalRevenue, 0) / mockCustomers.length,
    },
  };
};

// Customers listing page
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      plan: req.query.plan,
      search: req.query.search,
    };

    const { customers, total, stats } = await getCustomers(filters);

    res.render('customers/index', {
      title: 'Customer Management',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      customers,
      total,
      stats,
      filters,
      currentPage: 'customers',
    });
  } catch (error) {
    console.error('Customers page error:', error);
    res.status(500).render('error', {
      title: 'Customers Error',
      message: 'Failed to load customers data',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Individual customer details
router.get('/:id', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const { customers } = await getCustomers();
    const customer = customers.find(c => c.id === customerId);

    if (!customer) {
      return res.status(404).render('error', {
        title: 'Customer Not Found',
        message: 'The requested customer could not be found',
        error: {},
      });
    }

    // Mock additional data for customer details
    const customerDetails = {
      ...customer,
      recentActivity: [
        {
          type: 'invoice',
          description: 'Generated invoice #INV-2024-001234',
          timestamp: new Date('2024-09-16T10:30:00'),
          amount: 2500,
        },
        {
          type: 'payment',
          description: 'Payment received for September',
          timestamp: new Date('2024-09-15T14:20:00'),
          amount: 2999,
        },
        {
          type: 'login',
          description: 'User logged into the app',
          timestamp: new Date('2024-09-15T09:15:00'),
        },
        {
          type: 'support',
          description: 'Support ticket #TKT-001 created',
          timestamp: new Date('2024-09-14T16:45:00'),
          priority: 'medium',
        },
      ],
      invoiceStats: {
        thisMonth: 23,
        lastMonth: 19,
        totalAmount: 45600,
        averageAmount: 1982,
      },
      usageStats: {
        invoicesGenerated: customer.totalInvoices,
        labelsCreated: Math.floor(customer.totalInvoices * 0.8),
        customersManaged: Math.floor(customer.totalInvoices * 0.3),
        apiCalls: customer.totalInvoices * 15,
      },
    };

    res.render('customers/detail', {
      title: `${customer.storeName} - Customer Details`,
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      customer: customerDetails,
      currentPage: 'customers',
    });
  } catch (error) {
    console.error('Customer detail error:', error);
    res.status(500).render('error', {
      title: 'Customer Detail Error',
      message: 'Failed to load customer details',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Update customer status
router.post('/:id/status', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const { status, reason } = req.body;

    // In production, update database
    console.log(`Updating customer ${customerId} status to ${status}`, { reason });

    res.json({ 
      success: true, 
      message: `Customer status updated to ${status}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update customer status' });
  }
});

// Update customer plan
router.post('/:id/plan', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const { plan, reason } = req.body;

    // In production, update database and handle billing
    console.log(`Updating customer ${customerId} plan to ${plan}`, { reason });

    res.json({ 
      success: true, 
      message: `Customer plan updated to ${plan}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update customer plan error:', error);
    res.status(500).json({ success: false, error: 'Failed to update customer plan' });
  }
});

// Send notification to customer
router.post('/:id/notify', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const { type, subject, message } = req.body;

    // In production, send actual notification
    console.log(`Sending ${type} notification to customer ${customerId}`, { subject, message });

    res.json({ 
      success: true, 
      message: 'Notification sent successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

// Export customers data
router.get('/export/csv', async (req, res) => {
  try {
    const { customers } = await getCustomers();
    
    // Generate CSV
    const csvHeader = 'Store Name,Owner Name,Email,Phone,Plan,Status,Revenue,Invoices,Location,GSTIN\n';
    const csvData = customers.map(c => 
      `"${c.storeName}","${c.ownerName}","${c.ownerEmail}","${c.phone}","${c.plan}","${c.status}",${c.totalRevenue},${c.totalInvoices},"${c.location}","${c.gstin}"`
    ).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({ success: false, error: 'Failed to export customers data' });
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

    const result = await getCustomers(filters);
    res.json(result);
  } catch (error) {
    console.error('Customers API error:', error);
    res.status(500).json({ error: 'Failed to fetch customers data' });
  }
});

router.get('/api/stats', async (req, res) => {
  try {
    const { stats } = await getCustomers();
    res.json(stats);
  } catch (error) {
    console.error('Customer stats API error:', error);
    res.status(500).json({ error: 'Failed to fetch customer stats' });
  }
});

module.exports = router;