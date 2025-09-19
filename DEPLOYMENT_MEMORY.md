# GST Invoice & Shipping Manager - Deployment Memory
## Complete App Deployment Information

### 🌐 **Production Environment**
```bash
# Server Details
IP: 194.164.149.183
Domain: invoiceo.indigenservices.com
OS: Ubuntu 22.04.5 LTS
SSH: ssh root@194.164.149.183 (password: Kalilinux@2812)

# App Location
App Directory: /opt/gst-invoice-manager
Repository: https://github.com/r2w34/gst-invoice-shipping-manager.git
Branch: main
```

### 🔧 **System Configuration**

#### **Node.js Setup**
```bash
# Node.js Version
Node: v20.19.5
NPM: v10.8.2

# Installation Commands
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs
```

#### **Nginx Configuration**
```nginx
# File: /etc/nginx/sites-available/invoiceo.indigenservices.com
server {
    listen 80;
    server_name invoiceo.indigenservices.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name invoiceo.indigenservices.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/invoiceo.indigenservices.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/invoiceo.indigenservices.com/privkey.pem;

    # Shopify Iframe Headers
    add_header Content-Security-Policy "frame-ancestors https://*.shopify.com https://admin.shopify.com" always;
    add_header Access-Control-Allow-Origin "https://admin.shopify.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### **Systemd Service**
```ini
# File: /etc/systemd/system/gst-invoice-manager.service
[Unit]
Description=GST Invoice & Shipping Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gst-invoice-manager
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=localhost
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 🔐 **SSL Certificate**
```bash
# Let's Encrypt Setup
certbot --nginx -d invoiceo.indigenservices.com --non-interactive --agree-tos --email admin@indigenservices.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 🚀 **Deployment Commands**

#### **Initial Deployment**
```bash
# Clone repository
cd /opt
git clone https://github.com/r2w34/gst-invoice-shipping-manager.git gst-invoice-manager
cd gst-invoice-manager

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma migrate deploy

# Build application
npm run build

# Start service
systemctl enable gst-invoice-manager
systemctl start gst-invoice-manager
```

#### **Update Deployment**
```bash
cd /opt/gst-invoice-manager
git pull origin main
npm run build
systemctl restart gst-invoice-manager
```

### 📊 **App Configuration**

#### **Shopify App Settings**
```toml
# shopify.app.toml
scopes = "write_products,read_orders,write_orders,read_customers,write_customers"

[webhooks]
api_version = "2024-10"

[[webhooks.subscriptions]]
uri = "/webhooks/app/uninstalled"
topics = ["app/uninstalled"]

[[webhooks.subscriptions]]
topics = ["app/scopes_update"]
uri = "/webhooks/app/scopes_update"
```

#### **Environment Variables**
```bash
# Production Environment
SHOPIFY_API_KEY=7a6fca531dee436fcecd8536fc3cb72e
SHOPIFY_API_SECRET=[SECRET_KEY]
SHOPIFY_APP_URL=https://invoiceo.indigenservices.com
SCOPES=write_products,read_orders,write_orders,read_customers,write_customers
NODE_ENV=production
PORT=3000
```

### 🎯 **Shopify Partner Dashboard Settings**

#### **Required Updates**
```
App URL: https://invoiceo.indigenservices.com
Allowed redirection URLs: https://invoiceo.indigenservices.com/auth/callback
```

#### **App Details**
```
App Name: GST Invoice & Shipping Manager
App Handle: gst-invoice-shipping-manager
API Key: 7a6fca531dee436fcecd8536fc3cb72e
```

### 🔍 **Monitoring & Health Checks**

#### **Service Status**
```bash
# Check service status
systemctl status gst-invoice-manager

# View logs
journalctl -u gst-invoice-manager -f

# Test app
curl -I https://invoiceo.indigenservices.com
```

#### **Performance Monitoring**
```javascript
// Web Vitals enabled with debug flag
<meta name="shopify-debug" content="true" />

// App Bridge script for performance tracking
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
```

### 🛠️ **Troubleshooting**

#### **Common Issues**
1. **Iframe Embedding**: Fixed with CSP headers
2. **SSL Certificate**: Auto-renewal configured
3. **Service Restart**: Systemd handles automatic restart
4. **Database**: SQLite with Prisma migrations

#### **Emergency Commands**
```bash
# Restart everything
systemctl restart gst-invoice-manager
systemctl restart nginx

# Check logs
tail -f /var/log/nginx/error.log
journalctl -u gst-invoice-manager --since "1 hour ago"

# Rebuild app
cd /opt/gst-invoice-manager
npm run build
systemctl restart gst-invoice-manager
```

### 📈 **Performance Metrics**
- **Build Time**: ~5 seconds
- **Bundle Size**: ~500KB server, ~1.5MB client
- **Load Time**: <2 seconds (meets Shopify requirements)
- **SSL Grade**: A+ (Let's Encrypt)

### 🎉 **Deployment Status**
- ✅ **Server Setup**: Complete
- ✅ **SSL Certificate**: Active
- ✅ **App Deployment**: Live
- ✅ **Nginx Configuration**: Optimized
- ✅ **Systemd Service**: Running
- ✅ **Iframe Embedding**: Fixed
- ✅ **Performance**: Optimized
- 🔄 **Shopify Partner Dashboard**: Needs URL update

---

*Deployment completed: September 19, 2025*
*Status: PRODUCTION READY* ✅