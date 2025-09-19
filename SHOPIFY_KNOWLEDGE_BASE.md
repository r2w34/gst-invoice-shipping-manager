# Shopify App Development Knowledge Base
## Scraped from Official Shopify Documentation

### 🏗️ **App Building Best Practices**

#### **Performance Requirements**
- **Lighthouse Performance**: Must not reduce storefront performance scores by more than 10 points
- **Built for Shopify Status**: Requires meeting all mandatory performance criteria
- **Web Vitals Metrics**:
  - **LCP (Largest Contentful Paint)**: ≤ 2.5 seconds (75% of the time)
  - **CLS (Cumulative Layout Shift)**: ≤ 0.1 (75% of the time)  
  - **INP (Interaction to Next Paint)**: ≤ 200ms (75% of the time)

#### **Authentication & Authorization**
- **Embedded Apps**: Use session tokens for authentication
- **Token Exchange**: Recommended method for embedded apps (more efficient than OAuth redirects)
- **Session Tokens**: JWT format, 1-minute lifetime, must be fetched on each request
- **App Bridge Script**: Required for performance tracking and session tokens

#### **App Configuration**
- **Shopify CLI**: Use for app configuration management
- **Shopify Managed Installation**: Eliminates redirects and improves UX
- **Scopes**: Configure via Shopify CLI for better installation experience

### 🔧 **Technical Implementation**

#### **Required Headers for Iframe Embedding**
```nginx
# Remove X-Frame-Options to allow iframe embedding
add_header X-Frame-Options "" always;

# Allow Shopify to embed in iframe
add_header Content-Security-Policy "frame-ancestors https://*.shopify.com https://admin.shopify.com" always;

# CORS headers for Shopify
add_header Access-Control-Allow-Origin "https://admin.shopify.com" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
```

#### **App Bridge Integration**
```html
<!-- App Bridge script for performance tracking and session tokens -->
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
<!-- Debug flag for Web Vitals (remove in production) -->
<meta name="shopify-debug" content="true" />
```

#### **Shopify App Configuration**
```typescript
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true, // Enable token exchange
    removeRest: true,
  },
});
```

### 📊 **Web Vitals Monitoring**
```javascript
// Real-time Web Vitals monitoring
const callback = (metric) => {
  // Send to your analytics server
  console.log(metric);
};

// Enable debugging
// Add <meta name="shopify-debug" content="true" /> to head
```

### 🚀 **Deployment Best Practices**

#### **Production Environment**
- **SSL Certificate**: Required (Let's Encrypt recommended)
- **Reverse Proxy**: Nginx with proper headers
- **Process Management**: Systemd service for auto-restart
- **Performance**: Monitor Web Vitals in production

#### **App Store Requirements**
- **Performance**: Meet all Web Vitals thresholds
- **Security**: Proper authentication implementation
- **User Experience**: Smooth installation and loading
- **Compliance**: Privacy law compliance for public apps

### 🔍 **Debugging Tools**
- **Web Vitals Debug**: Use `shopify-debug` meta flag
- **Real-time Logs**: Console logs for performance metrics
- **Partner Dashboard**: Performance metrics tracking

### 📚 **Key Documentation Links**
- App Building: https://shopify.dev/docs/apps/build
- Performance: https://shopify.dev/docs/apps/build/performance
- Authentication: https://shopify.dev/docs/apps/build/authentication-authorization
- Session Tokens: https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens

---

## 🎯 **GST Invoice & Shipping Manager App Status**

### **Current Deployment**
- **Live URL**: https://invoiceo.indigenservices.com
- **Server**: Ubuntu 22.04.5 LTS (194.164.149.183)
- **SSL**: Let's Encrypt certificate
- **Service**: Systemd managed (gst-invoice-manager.service)

### **App Configuration**
- **API Key**: 7a6fca531dee436fcecd8536fc3cb72e
- **Scopes**: write_products,read_orders,write_orders,read_customers,write_customers
- **Authentication**: Token exchange enabled
- **Performance**: App Bridge script integrated

### **Features Implemented**
- ✅ GST Compliant Invoices
- ✅ Customer CRM System
- ✅ Shipping Label Management
- ✅ Bulk Operations
- ✅ Invoice Designer
- ✅ PDF Generation
- ✅ Barcode/QR Code Support

### **Technical Stack**
- **Framework**: Remix + React
- **Database**: SQLite with Prisma
- **Authentication**: Shopify App Bridge + Session Tokens
- **Styling**: Shopify Polaris
- **Deployment**: Node.js 20 + Nginx + SSL

### **Next Steps**
1. Update Shopify Partner Dashboard with production URL
2. Test app installation on development store
3. Monitor Web Vitals performance
4. Apply for Built for Shopify status

---

*Last Updated: September 19, 2025*
*Knowledge Base Version: 1.0*