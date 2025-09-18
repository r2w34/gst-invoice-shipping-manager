const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 56841;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Mock data
const mockCustomers = [
  {
    id: '1',
    shopDomain: 'test-shop-1.myshopify.com',
    ownerEmail: 'owner1@example.com',
    storeName: 'Fashion Store',
    subscriptionPlan: 'premium',
    subscriptionStatus: 'active',
    paymentStatus: 'paid',
    invoicesGenerated: 245,
    labelsGenerated: 180,
    lastLoginAt: '2024-01-15T10:30:00Z',
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    shopDomain: 'electronics-hub.myshopify.com',
    ownerEmail: 'owner2@example.com',
    storeName: 'Electronics Hub',
    subscriptionPlan: 'standard',
    subscriptionStatus: 'active',
    paymentStatus: 'paid',
    invoicesGenerated: 156,
    labelsGenerated: 120,
    lastLoginAt: '2024-01-14T15:45:00Z',
    createdAt: '2023-11-15T00:00:00Z',
    updatedAt: '2024-01-14T15:45:00Z',
  },
  {
    id: '3',
    shopDomain: 'home-decor.myshopify.com',
    ownerEmail: 'owner3@example.com',
    storeName: 'Home Decor Plus',
    subscriptionPlan: 'basic',
    subscriptionStatus: 'trial',
    paymentStatus: 'pending',
    invoicesGenerated: 45,
    labelsGenerated: 32,
    lastLoginAt: '2024-01-13T09:20:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-13T09:20:00Z',
  },
];

const mockSubscriptions = [
  {
    id: '1',
    customerId: '1',
    plan: 'premium',
    status: 'active',
    currentPeriodStart: '2024-01-01T00:00:00Z',
    currentPeriodEnd: '2024-02-01T00:00:00Z',
    amount: 2999,
    currency: 'INR',
    interval: 'monthly',
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    customerId: '2',
    plan: 'standard',
    status: 'active',
    currentPeriodStart: '2024-01-01T00:00:00Z',
    currentPeriodEnd: '2024-02-01T00:00:00Z',
    amount: 1999,
    currency: 'INR',
    interval: 'monthly',
    createdAt: '2023-11-15T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    customerId: '3',
    plan: 'basic',
    status: 'trial',
    currentPeriodStart: '2024-01-01T00:00:00Z',
    currentPeriodEnd: '2024-01-08T00:00:00Z',
    trialEnd: '2024-01-08T00:00:00Z',
    amount: 999,
    currency: 'INR',
    interval: 'monthly',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockSettings = {
  id: '1',
  companyName: 'GST Invoice Manager',
  supportEmail: 'support@gstinvoice.com',
  maxTrialDays: 7,
  defaultPlan: 'basic',
  maintenanceMode: false,
  allowNewSignups: true,
  emailNotifications: true,
  webhookUrl: 'https://api.gstinvoice.com/webhooks',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

// Helper function to add CORS headers for React Admin
const addCorsHeaders = (res, data, total = null) => {
  if (total !== null) {
    res.set('Content-Range', `items 0-${data.length - 1}/${total}`);
  }
  res.set('Access-Control-Expose-Headers', 'Content-Range');
  return res.json(data);
};

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple auth check
  if (username === 'admin' && password === 'admin123') {
    res.json({
      id: '1',
      fullName: 'Admin User',
      role: 'admin',
      avatar: null,
      token: 'mock-jwt-token',
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Customers endpoints
app.get('/api/customers', (req, res) => {
  const { _start, _end, _sort, _order, q } = req.query;
  
  let filteredCustomers = [...mockCustomers];
  
  // Search filter
  if (q) {
    filteredCustomers = filteredCustomers.filter(customer =>
      customer.storeName.toLowerCase().includes(q.toLowerCase()) ||
      customer.shopDomain.toLowerCase().includes(q.toLowerCase()) ||
      customer.ownerEmail.toLowerCase().includes(q.toLowerCase())
    );
  }
  
  // Sorting
  if (_sort) {
    filteredCustomers.sort((a, b) => {
      const aVal = a[_sort];
      const bVal = b[_sort];
      if (_order === 'DESC') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
  }
  
  // Pagination
  const start = parseInt(_start) || 0;
  const end = parseInt(_end) || filteredCustomers.length;
  const paginatedCustomers = filteredCustomers.slice(start, end);
  
  addCorsHeaders(res, paginatedCustomers, filteredCustomers.length);
});

app.get('/api/customers/:id', (req, res) => {
  const customer = mockCustomers.find(c => c.id === req.params.id);
  if (customer) {
    res.json(customer);
  } else {
    res.status(404).json({ message: 'Customer not found' });
  }
});

app.put('/api/customers/:id', (req, res) => {
  const customerIndex = mockCustomers.findIndex(c => c.id === req.params.id);
  if (customerIndex !== -1) {
    mockCustomers[customerIndex] = { ...mockCustomers[customerIndex], ...req.body, updatedAt: new Date().toISOString() };
    res.json(mockCustomers[customerIndex]);
  } else {
    res.status(404).json({ message: 'Customer not found' });
  }
});

app.post('/api/customers', (req, res) => {
  const newCustomer = {
    id: String(mockCustomers.length + 1),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockCustomers.push(newCustomer);
  res.json(newCustomer);
});

app.delete('/api/customers/:id', (req, res) => {
  const customerIndex = mockCustomers.findIndex(c => c.id === req.params.id);
  if (customerIndex !== -1) {
    const deletedCustomer = mockCustomers.splice(customerIndex, 1)[0];
    res.json(deletedCustomer);
  } else {
    res.status(404).json({ message: 'Customer not found' });
  }
});

// Subscriptions endpoints
app.get('/api/subscriptions', (req, res) => {
  const { _start, _end, _sort, _order } = req.query;
  
  let filteredSubscriptions = [...mockSubscriptions];
  
  // Sorting
  if (_sort) {
    filteredSubscriptions.sort((a, b) => {
      const aVal = a[_sort];
      const bVal = b[_sort];
      if (_order === 'DESC') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
  }
  
  // Pagination
  const start = parseInt(_start) || 0;
  const end = parseInt(_end) || filteredSubscriptions.length;
  const paginatedSubscriptions = filteredSubscriptions.slice(start, end);
  
  addCorsHeaders(res, paginatedSubscriptions, filteredSubscriptions.length);
});

app.get('/api/subscriptions/:id', (req, res) => {
  const subscription = mockSubscriptions.find(s => s.id === req.params.id);
  if (subscription) {
    res.json(subscription);
  } else {
    res.status(404).json({ message: 'Subscription not found' });
  }
});

app.put('/api/subscriptions/:id', (req, res) => {
  const subscriptionIndex = mockSubscriptions.findIndex(s => s.id === req.params.id);
  if (subscriptionIndex !== -1) {
    mockSubscriptions[subscriptionIndex] = { ...mockSubscriptions[subscriptionIndex], ...req.body, updatedAt: new Date().toISOString() };
    res.json(mockSubscriptions[subscriptionIndex]);
  } else {
    res.status(404).json({ message: 'Subscription not found' });
  }
});

// Settings endpoints
app.get('/api/settings/1', (req, res) => {
  res.json(mockSettings);
});

app.put('/api/settings/1', (req, res) => {
  Object.assign(mockSettings, req.body, { updatedAt: new Date().toISOString() });
  res.json(mockSettings);
});

// Serve React app for all other routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin Panel v2 API server running on port ${PORT}`);
  console.log(`Access the admin panel at: http://localhost:${PORT}`);
});