# Shopify App Development Guide
## GST Invoice & Shipping Manager Implementation

This guide provides comprehensive information for developing and deploying the GST Invoice & Shipping Manager Shopify app, based on official Shopify documentation and best practices.

## 🏗️ App Architecture Overview

### Current Implementation
- **Framework**: Remix (React-based full-stack framework)
- **Database**: Prisma with SQLite (production-ready for single instance)
- **Authentication**: Shopify App Remix (@shopify/shopify-app-remix)
- **UI Framework**: Shopify Polaris
- **Deployment**: Ready for Vercel, Heroku, or Fly.io

### App Structure
```
gst-invoice-manager/
├── app/
│   ├── routes/                 # Remix routes (pages & API endpoints)
│   ├── components/             # React components
│   ├── services/               # Business logic services
│   ├── models/                 # Database models
│   └── shopify.server.js       # Shopify configuration
├── prisma/
│   └── schema.prisma           # Database schema
├── public/                     # Static assets
└── shopify.app.toml           # App configuration
```

## 🔐 Authentication & Authorization

### Shopify App Authentication
Our app uses the official Shopify App Remix package for authentication:

```javascript
// app/shopify.server.js
import { shopifyApp } from "@shopify/shopify-app-remix/server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  scopes: ["read_products", "write_products", "read_orders", "write_orders"],
  appUrl: process.env.SHOPIFY_APP_URL,
});
```

### Route Authentication
All app routes are protected using the authenticate.admin method:

```javascript
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  // Route logic here
};
```

## 📊 Database Schema & Models

### Current Database Models
1. **Session** - Shopify session management
2. **Invoice** - GST-compliant invoice records
3. **Customer** - Customer information with GSTIN
4. **ShippingLabel** - Shipping label data
5. **Order** - Enhanced order information
6. **Subscription** - App subscription management
7. **NotificationLog** - Communication tracking
8. **BulkOperationLog** - Bulk operation analytics

### Database Migration
```bash
# Create new migration
npm run prisma migrate dev --name migration-name

# Apply migrations
npm run prisma migrate deploy

# View database
npm run prisma studio
```

## 🛠️ API Integration

### GraphQL Admin API Usage
```javascript
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query getProducts($first: Int!) {
      products(first: $first) {
        nodes {
          id
          title
          handle
          variants(first: 1) {
            nodes {
              id
              price
            }
          }
        }
      }
    }
  `, {
    variables: { first: 25 }
  });

  const data = await response.json();
  return json(data);
};
```

### Webhook Handling
Webhooks are configured in `shopify.app.toml` and handled in individual route files:

```javascript
// app/routes/webhooks.orders.create.tsx
export const action = async ({ request }) => {
  const { payload } = await authenticate.webhook(request);
  
  // Process order creation
  await processNewOrder(payload);
  
  return new Response();
};
```

## 🎨 UI Components & Polaris

### Using Polaris Components
```javascript
import {
  Page,
  Card,
  Button,
  DataTable,
  Modal,
  Form,
  FormLayout,
  TextField,
} from '@shopify/polaris';

export default function InvoicePage() {
  return (
    <Page title="Invoices">
      <Card>
        <DataTable
          columnContentTypes={['text', 'numeric', 'text']}
          headings={['Invoice #', 'Amount', 'Status']}
          rows={invoices.map(invoice => [
            invoice.invoiceNumber,
            `₹${invoice.totalAmount}`,
            invoice.status
          ])}
        />
      </Card>
    </Page>
  );
}
```

### App Bridge Integration
```javascript
import { useAppBridge } from '@shopify/app-bridge-react';
import { ResourcePicker } from '@shopify/app-bridge/actions';

export function ProductSelector() {
  const app = useAppBridge();
  
  const selectProduct = () => {
    const picker = ResourcePicker.create(app, {
      resourceType: ResourcePicker.ResourceType.Product,
    });
    
    picker.dispatch(ResourcePicker.Action.OPEN);
  };
  
  return <Button onClick={selectProduct}>Select Product</Button>;
}
```

## 📧 Communication Services

### Email Service Implementation
```javascript
// app/services/EmailService.server.js
import sgMail from '@sendgrid/mail';

export class EmailService {
  static async sendInvoiceEmail(invoice, customer) {
    const msg = {
      to: customer.email,
      from: process.env.EMAIL_FROM_ADDRESS,
      subject: `Invoice ${invoice.invoiceNumber}`,
      html: await generateInvoiceEmailTemplate(invoice),
      attachments: [{
        content: invoice.pdfBase64,
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        type: 'application/pdf',
      }]
    };
    
    return await sgMail.send(msg);
  }
}
```

### WhatsApp Integration
```javascript
// app/services/WhatsAppService.server.js
import twilio from 'twilio';

export class WhatsAppService {
  static async sendOrderConfirmation(order, customer) {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    return await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${customer.phone}`,
      body: `Order confirmed! Your order #${order.orderNumber} is being processed.`
    });
  }
}
```

## 🔄 Bulk Operations

### Bulk Processing Implementation
```javascript
// app/services/BulkOperationsService.server.js
export class BulkOperationsService {
  static async bulkGenerateInvoices(orderIds, options = {}) {
    const results = {
      successCount: 0,
      failureCount: 0,
      errors: []
    };
    
    for (const orderId of orderIds) {
      try {
        const invoice = await this.generateInvoiceForOrder(orderId);
        
        if (options.sendNotifications) {
          await NotificationService.sendInvoiceNotification(invoice);
        }
        
        results.successCount++;
      } catch (error) {
        results.failureCount++;
        results.errors.push({ orderId, error: error.message });
      }
    }
    
    return results;
  }
}
```

## 🚀 Deployment Guide

### Environment Variables
```env
# Shopify Configuration
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://your-app-domain.com
SCOPES=read_products,write_products,read_orders,write_orders

# Database
DATABASE_URL=your_database_connection_string

# Email Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# App Configuration
NODE_ENV=production
EMAIL_FROM_ADDRESS=noreply@yourstore.com
EMAIL_FROM_NAME=Your Store Name
```

### Vercel Deployment
1. Install Vercel preset:
```bash
npm install @vercel/remix
```

2. Update `vite.config.js`:
```javascript
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import { vercelPreset } from '@vercel/remix/vite';

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      presets: [vercelPreset()],
    }),
  ],
});
```

3. Deploy to Vercel:
```bash
vercel --prod
```

### Heroku Deployment
1. Create Heroku app:
```bash
heroku create your-app-name
```

2. Set environment variables:
```bash
heroku config:set SHOPIFY_API_KEY=your_key
heroku config:set SHOPIFY_API_SECRET=your_secret
# ... other environment variables
```

3. Deploy:
```bash
git push heroku main
```

## 📱 App Store Submission

### App Store Requirements
1. **Functionality**: App must provide clear value to merchants
2. **Performance**: Fast loading times and responsive UI
3. **Security**: Proper authentication and data protection
4. **User Experience**: Intuitive interface following Shopify design patterns
5. **Documentation**: Clear installation and usage instructions

### Submission Checklist
- [ ] App functionality tested thoroughly
- [ ] All API calls properly authenticated
- [ ] Error handling implemented
- [ ] Performance optimized
- [ ] Security best practices followed
- [ ] App listing content prepared
- [ ] Screenshots and videos created
- [ ] Privacy policy and terms of service ready

## 🔧 Development Best Practices

### Code Organization
```
app/
├── routes/
│   ├── app.tsx                 # Main app layout
│   ├── app._index.tsx          # Dashboard
│   ├── app.invoices._index.tsx # Invoice list
│   ├── app.invoices.$id.tsx    # Invoice detail
│   └── api.*.tsx               # API endpoints
├── components/
│   ├── InvoiceForm.tsx
│   ├── CustomerSelector.tsx
│   └── BulkOperationsCenter.tsx
├── services/
│   ├── EmailService.server.js
│   ├── InvoiceService.server.js
│   └── ShopifyService.server.js
└── models/
    ├── Invoice.server.js
    └── Customer.server.js
```

### Error Handling
```javascript
export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    // Action logic
    return json({ success: true });
  } catch (error) {
    console.error('Action error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};
```

### Performance Optimization
1. **Database Queries**: Use proper indexing and limit results
2. **API Calls**: Batch requests when possible
3. **Caching**: Implement appropriate caching strategies
4. **Bundle Size**: Optimize JavaScript bundle size
5. **Images**: Optimize and compress images

## 🧪 Testing Strategy

### Unit Testing
```javascript
// tests/services/InvoiceService.test.js
import { InvoiceService } from '../app/services/InvoiceService.server.js';

describe('InvoiceService', () => {
  test('should generate GST-compliant invoice', async () => {
    const order = { /* test order data */ };
    const invoice = await InvoiceService.generateInvoice(order);
    
    expect(invoice.gstNumber).toBeDefined();
    expect(invoice.totalAmount).toBeGreaterThan(0);
  });
});
```

### Integration Testing
```javascript
// tests/routes/invoices.test.js
import { createRemixStub } from "@remix-run/testing";

test('invoice creation flow', async () => {
  const RemixStub = createRemixStub([
    {
      path: "/app/invoices/new",
      Component: InvoiceNew,
      loader: invoiceNewLoader,
      action: invoiceNewAction,
    },
  ]);

  render(<RemixStub initialEntries={["/app/invoices/new"]} />);
  // Test invoice creation
});
```

## 📊 Analytics & Monitoring

### Performance Monitoring
```javascript
// app/utils/analytics.js
export function trackEvent(eventName, properties) {
  // Send to analytics service
  analytics.track(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
    shop: session.shop,
  });
}
```

### Error Tracking
```javascript
// app/utils/errorTracking.js
export function reportError(error, context) {
  console.error('Application error:', error);
  
  // Send to error tracking service
  errorTracker.captureException(error, {
    tags: { context },
    user: { shop: session.shop },
  });
}
```

## 🔒 Security Considerations

### Data Protection
1. **Encryption**: Encrypt sensitive data at rest
2. **HTTPS**: Always use HTTPS in production
3. **Input Validation**: Validate all user inputs
4. **SQL Injection**: Use parameterized queries
5. **XSS Protection**: Sanitize user-generated content

### API Security
```javascript
// Rate limiting example
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 📚 Additional Resources

### Official Documentation
- [Shopify App Development](https://shopify.dev/docs/apps)
- [Remix Framework](https://remix.run/docs)
- [Shopify Polaris](https://polaris.shopify.com/)
- [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql)

### Community Resources
- [Shopify Partners Community](https://community.shopify.com/c/partners/ct-p/partners)
- [Remix Discord](https://discord.gg/remix)
- [Shopify Developers Slack](https://shopifypartners.slack.com/)

### Tools & Services
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [GraphiQL App](https://shopify-graphiql-app.shopifycloud.com/)
- [Shopify App Inspector](https://shopify.dev/docs/apps/tools/app-inspector)

---

This guide provides the foundation for developing, deploying, and maintaining the GST Invoice & Shipping Manager Shopify app. Follow these practices to ensure a successful app that meets Shopify's standards and provides excellent value to merchants.