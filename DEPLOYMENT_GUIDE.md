# GST Invoice & Shipping Manager - Production Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- Server: 194.164.149.183 (root access)
- Domain: invoiceo.indigenservices.com (DNS A record pointing to server IP)
- Shopify Partner App created with API credentials

### Step 1: SSH to Server
```bash
ssh root@194.164.149.183
# Password: Kalilinux@2812 (change this after deployment!)
```

### Step 2: Download and Run Deployment Script
```bash
curl -fsSL https://raw.githubusercontent.com/r2w34/gst-invoice-shipping-manager/main/deploy.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
```

### Step 3: Configure Environment Variables
The script will pause for you to edit `.env.production`. You MUST update:

```bash
nano /opt/gst-app/app/.env.production
```

**Required changes:**
```env
SHOPIFY_API_KEY=your_actual_shopify_api_key
SHOPIFY_API_SECRET=your_actual_shopify_secret
SESSION_SECRET=$(openssl rand -hex 32)  # Generate random 32-char string
```

### Step 4: Update Shopify Partner App Settings
In your Shopify Partner dashboard:
- **App URL**: `https://invoiceo.indigenservices.com`
- **Allowed redirection URLs**: `https://invoiceo.indigenservices.com/auth/callback`
- **Embedded App**: Enabled
- **Scopes**: `write_products,read_orders,write_orders,read_customers,write_customers`

## 🔧 Manual Deployment (Alternative)

If you prefer manual steps:

### 1. System Setup
```bash
# Update system
apt update -y && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Nginx and Certbot
apt install -y nginx certbot python3-certbot-nginx git
```

### 2. Application Setup
```bash
# Create app directory
mkdir -p /opt/gst-app && cd /opt/gst-app

# Clone repository
git clone https://github.com/r2w34/gst-invoice-shipping-manager.git app
cd app

# Create production environment file
cp .env.production.example .env.production
nano .env.production  # Edit with your credentials
```

### 3. Docker Deployment
```bash
# Build and start containers
docker compose -f docker-compose.production.yml up -d --build

# Verify containers are running
docker ps
```

### 4. Nginx Configuration
```bash
# Create Nginx site config
cat > /etc/nginx/sites-available/invoiceo.conf << 'EOF'
server {
    listen 80;
    server_name invoiceo.indigenservices.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Shopify embedding headers
        add_header Content-Security-Policy "frame-ancestors https://*.myshopify.com https://admin.shopify.com" always;
        add_header X-Frame-Options "ALLOWALL" always;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/invoiceo.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 5. SSL Setup
```bash
# Obtain Let's Encrypt certificate
certbot --nginx -d invoiceo.indigenservices.com --non-interactive --agree-tos -m your-email@example.com

# Set up auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## 🧪 Testing & Verification

### Health Check
```bash
curl https://invoiceo.indigenservices.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

### OAuth Flow Test
1. Visit: `https://invoiceo.indigenservices.com/auth/login?shop=yourshop.myshopify.com`
2. Complete Shopify OAuth
3. Verify app loads in Shopify Admin

### Feature Testing
- **Invoices**: Create, view, download PDF (single & bulk)
- **Labels**: Create, view, download/print PDF
- **Settings**: Configure seller details, GST info
- **WhatsApp**: Verify only share buttons appear (no server sends)

## 📊 Monitoring & Logs

### Application Logs
```bash
# View app logs
docker logs -f gst-invoice-app

# View all container logs
docker compose -f docker-compose.production.yml logs -f
```

### Nginx Logs
```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

### System Status
```bash
# Check all services
systemctl status nginx docker
docker ps
```

## 🔄 Updates & Maintenance

### Update Application
```bash
cd /opt/gst-app/app
git pull
docker compose -f docker-compose.production.yml up -d --build
```

### Database Backup (SQLite)
```bash
# Backup database
docker exec gst-invoice-app cp /app/prisma/dev.db /app/backup-$(date +%Y%m%d).db

# Copy backup to host
docker cp gst-invoice-app:/app/backup-$(date +%Y%m%d).db ./
```

### SSL Certificate Renewal
```bash
# Manual renewal (automatic via cron)
certbot renew --nginx
```

## 🔒 Security Checklist

- [ ] Change root password from default
- [ ] Set up SSH key authentication
- [ ] Configure UFW firewall (ports 22, 80, 443)
- [ ] Regular system updates
- [ ] Monitor application logs
- [ ] Backup database regularly

## 🆘 Troubleshooting

### App Won't Start
```bash
# Check container logs
docker logs gst-invoice-app

# Check environment variables
docker exec gst-invoice-app env | grep SHOPIFY

# Restart containers
docker compose -f docker-compose.production.yml restart
```

### SSL Issues
```bash
# Check certificate status
certbot certificates

# Test SSL configuration
nginx -t
systemctl status nginx
```

### Shopify OAuth Issues
1. Verify App URL and redirect URLs in Partner dashboard
2. Check SHOPIFY_API_KEY and SHOPIFY_API_SECRET in .env.production
3. Ensure domain DNS is correctly configured

### PDF Generation Issues
```bash
# Check if fonts are available in container
docker exec gst-invoice-app ls -la /usr/share/fonts/

# Test PDF endpoint directly
curl -X POST https://invoiceo.indigenservices.com/api/pdf/invoice \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 📞 Support

For issues or questions:
1. Check application logs first
2. Verify Shopify Partner app configuration
3. Test individual API endpoints
4. Review Nginx configuration for embedding headers

---

**Production URL**: https://invoiceo.indigenservices.com
**Health Check**: https://invoiceo.indigenservices.com/health
**Repository**: https://github.com/r2w34/gst-invoice-shipping-manager