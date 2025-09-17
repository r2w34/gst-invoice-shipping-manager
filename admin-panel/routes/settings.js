const express = require('express');
const router = express.Router();

// Mock settings data
const getSettings = async () => {
  return {
    general: {
      appName: 'GST Invoice & Shipping Manager',
      appVersion: '1.0.0',
      supportEmail: 'support@indigenservices.com',
      supportPhone: '+91 9876543210',
      companyName: 'Indigen Services',
      companyAddress: 'Mumbai, Maharashtra, India',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      dateFormat: 'DD/MM/YYYY',
      maintenanceMode: false,
    },
    billing: {
      stripePublishableKey: 'pk_test_...',
      stripeSecretKey: 'sk_test_...',
      razorpayKeyId: 'rzp_test_...',
      razorpayKeySecret: 'rzp_secret_...',
      webhookSecret: 'whsec_...',
      trialPeriodDays: 7,
      gracePeriodDays: 3,
      autoRetryFailedPayments: true,
      sendPaymentReminders: true,
    },
    email: {
      provider: 'smtp',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: 'noreply@indigenservices.com',
      smtpPassword: '***',
      fromEmail: 'noreply@indigenservices.com',
      fromName: 'GST Invoice Manager',
      enableEmailNotifications: true,
      templates: {
        welcome: 'enabled',
        paymentSuccess: 'enabled',
        paymentFailed: 'enabled',
        trialExpiring: 'enabled',
        subscriptionCancelled: 'enabled',
      },
    },
    security: {
      enableTwoFactor: false,
      sessionTimeout: 24, // hours
      maxLoginAttempts: 5,
      lockoutDuration: 30, // minutes
      passwordMinLength: 8,
      requirePasswordComplexity: true,
      enableAuditLog: true,
      ipWhitelist: [],
    },
    features: {
      enableTrialExtension: true,
      enableCustomBranding: true,
      enableWhatsAppIntegration: true,
      enableBulkOperations: true,
      enableAdvancedReports: true,
      enableApiAccess: true,
      maxApiCallsPerMinute: 100,
    },
    notifications: {
      enableSlackIntegration: false,
      slackWebhookUrl: '',
      enableDiscordIntegration: false,
      discordWebhookUrl: '',
      alertThresholds: {
        highChurnRate: 5.0,
        lowPaymentSuccess: 90.0,
        highSupportTickets: 50,
        serverDowntime: 5, // minutes
      },
    },
    integrations: {
      shopifyAppId: '7a6fca531dee436fcecd8536fc3cb72e',
      shopifyAppSecret: 'bf7ee31d9491a158d2b410a1c5849681',
      googleAnalyticsId: 'GA-XXXXXXXXX',
      facebookPixelId: '',
      hotjarId: '',
      intercomAppId: '',
    },
  };
};

// Settings dashboard
router.get('/', async (req, res) => {
  try {
    const settings = await getSettings();

    res.render('settings/index', {
      title: 'System Settings',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      settings,
      currentPage: 'settings',
    });
  } catch (error) {
    console.error('Settings page error:', error);
    res.status(500).render('error', {
      title: 'Settings Error',
      message: 'Failed to load settings',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// General settings
router.get('/general', async (req, res) => {
  try {
    const settings = await getSettings();

    res.render('settings/general', {
      title: 'General Settings',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      settings: settings.general,
      currentPage: 'settings',
    });
  } catch (error) {
    console.error('General settings error:', error);
    res.status(500).render('error', {
      title: 'General Settings Error',
      message: 'Failed to load general settings',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Billing settings
router.get('/billing', async (req, res) => {
  try {
    const settings = await getSettings();

    res.render('settings/billing', {
      title: 'Billing Settings',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      settings: settings.billing,
      currentPage: 'settings',
    });
  } catch (error) {
    console.error('Billing settings error:', error);
    res.status(500).render('error', {
      title: 'Billing Settings Error',
      message: 'Failed to load billing settings',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Email settings
router.get('/email', async (req, res) => {
  try {
    const settings = await getSettings();

    res.render('settings/email', {
      title: 'Email Settings',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      settings: settings.email,
      currentPage: 'settings',
    });
  } catch (error) {
    console.error('Email settings error:', error);
    res.status(500).render('error', {
      title: 'Email Settings Error',
      message: 'Failed to load email settings',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Security settings
router.get('/security', async (req, res) => {
  try {
    const settings = await getSettings();

    res.render('settings/security', {
      title: 'Security Settings',
      user: {
        name: req.session.adminName,
        username: req.session.adminUsername,
        role: req.session.adminRole,
      },
      settings: settings.security,
      currentPage: 'settings',
    });
  } catch (error) {
    console.error('Security settings error:', error);
    res.status(500).render('error', {
      title: 'Security Settings Error',
      message: 'Failed to load security settings',
      error: process.env.NODE_ENV === 'development' ? error : {},
    });
  }
});

// Update settings
router.post('/update/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const updates = req.body;

    // Validate category
    const validCategories = ['general', 'billing', 'email', 'security', 'features', 'notifications', 'integrations'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid settings category' });
    }

    // In production, validate and save to database
    console.log(`Updating ${category} settings:`, updates);

    // Log the change
    console.log(`Settings updated by admin: ${req.session.adminUsername} - Category: ${category}`);

    res.json({ 
      success: true, 
      message: `${category.charAt(0).toUpperCase() + category.slice(1)} settings updated successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Test email configuration
router.post('/test-email', async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({ success: false, error: 'Test email address is required' });
    }

    // In production, send actual test email
    console.log(`Sending test email to: ${testEmail}`);

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    res.json({ 
      success: true, 
      message: `Test email sent successfully to ${testEmail}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send test email' });
  }
});

// Test webhook
router.post('/test-webhook', async (req, res) => {
  try {
    const { webhookUrl, eventType } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ success: false, error: 'Webhook URL is required' });
    }

    // In production, send actual webhook test
    console.log(`Testing webhook: ${webhookUrl} with event: ${eventType}`);

    // Simulate webhook test
    await new Promise(resolve => setTimeout(resolve, 1500));

    res.json({ 
      success: true, 
      message: 'Webhook test completed successfully',
      response: {
        status: 200,
        responseTime: '145ms',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to test webhook' });
  }
});

// Backup settings
router.post('/backup', async (req, res) => {
  try {
    const settings = await getSettings();
    
    // In production, create actual backup
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      settings,
      createdBy: req.session.adminUsername,
    };

    console.log('Creating settings backup:', backup.timestamp);

    res.json({ 
      success: true, 
      message: 'Settings backup created successfully',
      backup: {
        timestamp: backup.timestamp,
        size: JSON.stringify(backup).length + ' bytes',
      },
    });
  } catch (error) {
    console.error('Backup settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to create settings backup' });
  }
});

// Restore settings
router.post('/restore', async (req, res) => {
  try {
    const { backupData } = req.body;

    if (!backupData) {
      return res.status(400).json({ success: false, error: 'Backup data is required' });
    }

    // In production, validate and restore from backup
    console.log('Restoring settings from backup');

    res.json({ 
      success: true, 
      message: 'Settings restored successfully from backup',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Restore settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to restore settings' });
  }
});

// Reset settings to default
router.post('/reset/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({ success: false, error: 'Confirmation required' });
    }

    // Validate category
    const validCategories = ['general', 'billing', 'email', 'security', 'features', 'notifications', 'integrations'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid settings category' });
    }

    // In production, reset to default values
    console.log(`Resetting ${category} settings to default by admin: ${req.session.adminUsername}`);

    res.json({ 
      success: true, 
      message: `${category.charAt(0).toUpperCase() + category.slice(1)} settings reset to default values`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset settings' });
  }
});

// API endpoints
router.get('/api/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const settings = await getSettings();

    if (!settings[category]) {
      return res.status(404).json({ error: 'Settings category not found' });
    }

    res.json(settings[category]);
  } catch (error) {
    console.error('Settings API error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.get('/api', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    console.error('All settings API error:', error);
    res.status(500).json({ error: 'Failed to fetch all settings' });
  }
});

module.exports = router;