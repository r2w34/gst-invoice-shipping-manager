# 🚀 Manual Deployment Steps for GST Invoice Manager

## Current Server Status
- ✅ **DNS**: invoiceo.indigenservices.com → 194.164.149.183 (Working)
- ✅ **SSH**: Port 22 is open and accessible
- ❌ **HTTP**: Port 80 is filtered (blocked/not running)
- ❌ **HTTPS**: Port 443 is filtered (blocked/not running)
- ❌ **App**: Not deployed yet

## 🔧 Step-by-Step Deployment

### Step 1: Connect to Your Server
```bash
ssh root@194.164.149.183
# Password: Kalilinux@2812
```

### Step 2: Check Current System State
```bash
# Check if anything is already installed
ls -la /opt/
docker --version 2>/dev/null || echo "Docker not installed"
nginx -v 2>/dev/null || echo "Nginx not installed"
ufw status
```

### Step 3: Install Required Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw net-tools

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
nginx -v
```

### Step 4: Configure Firewall
```bash
# Reset and configure firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Verify firewall
ufw status verbose
```

### Step 5: Clone and Setup Application
```bash
# Create application directory
mkdir -p /opt/gst-invoice-manager
cd /opt/gst-invoice-manager

# Clone the repository
git clone https://github.com/r2w34/gst-invoice-shipping-manager.git .

# Create production environment file
cat > .env << 'EOF'
NODE_ENV=production
DOMAIN=invoiceo.indigenservices.com
SHOPIFY_API_KEY=7a6fca531dee436fcecd8536fc3cb72e
SHOPIFY_API_SECRET=bf7ee31d9491a158d2b410a1c5849681
SCOPES=write_products,read_orders,write_orders,read_customers,write_customers
HOST=https://invoiceo.indigenservices.com
SHOPIFY_APP_URL=https://invoiceo.indigenservices.com
DATABASE_URL=file:./prisma/dev.db
MAIN_APP_PORT=3000
ADMIN_PANEL_PORT=56842
SESSION_SECRET=$(openssl rand -base64 32)
EOF

# Set proper permissions
chmod 600 .env
```

### Step 6: Start Docker Containers
```bash
# Build and start containers
docker-compose -f docker-compose.production.yml -p gst-invoice-manager up -d --build

# Wait for containers to start
sleep 30

# Check container status
docker-compose -f docker-compose.production.yml -p gst-invoice-manager ps

# Check logs if needed
docker-compose -f docker-compose.production.yml -p gst-invoice-manager logs
```

### Step 7: Configure Nginx
```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/gst-invoice-manager << 'EOF'
server {
    listen 80;
    server_name invoiceo.indigenservices.com www.invoiceo.indigenservices.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Main application
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
        
        # Shopify specific headers
        add_header Access-Control-Allow-Origin "https://admin.shopify.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://admin.shopify.com";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain charset=UTF-8";
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # Admin panel
    location /admin {
        proxy_pass http://localhost:56842;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
    
    # Static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/gst-invoice-manager /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start and enable Nginx
systemctl enable nginx
systemctl restart nginx
```

### Step 8: Test HTTP Access
```bash
# Test local connections
curl -I http://localhost:3000/health
curl -I http://localhost:56842/health
curl -I http://localhost

# Test external access
curl -I http://invoiceo.indigenservices.com

# Check what's listening on ports
netstat -tulpn | grep -E ':(80|443|3000|56842) '
```

### Step 9: Setup SSL Certificate
```bash
# Install SSL certificate
certbot --nginx -d invoiceo.indigenservices.com --non-interactive --agree-tos --email admin@indigenservices.com

# Test SSL renewal
certbot renew --dry-run

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### Step 10: Final Verification
```bash
# Test HTTPS access
curl -I https://invoiceo.indigenservices.com
curl -I https://invoiceo.indigenservices.com/health
curl -I https://invoiceo.indigenservices.com/admin

# Check all services
systemctl status nginx
systemctl status docker
docker-compose -f /opt/gst-invoice-manager/docker-compose.production.yml -p gst-invoice-manager ps
```

## 🔧 Troubleshooting Commands

### If containers won't start:
```bash
cd /opt/gst-invoice-manager
docker-compose -f docker-compose.production.yml -p gst-invoice-manager logs
docker-compose -f docker-compose.production.yml -p gst-invoice-manager down
docker-compose -f docker-compose.production.yml -p gst-invoice-manager up -d --build
```

### If Nginx won't start:
```bash
nginx -t
systemctl status nginx
journalctl -u nginx -f
```

### If ports are still filtered:
```bash
ufw status verbose
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

### If SSL fails:
```bash
certbot delete --cert-name invoiceo.indigenservices.com
certbot --nginx -d invoiceo.indigenservices.com --non-interactive --agree-tos --email admin@indigenservices.com
```

## 🎯 Expected Results

After successful deployment:
- ✅ https://invoiceo.indigenservices.com - Main Shopify app
- ✅ https://invoiceo.indigenservices.com/admin - Admin panel
- ✅ https://invoiceo.indigenservices.com/health - Health check

## 📞 Need Help?

If you encounter issues, run this diagnostic:
```bash
cd /opt/gst-invoice-manager
echo "=== System Status ==="
docker --version
nginx -v
ufw status
echo "=== Container Status ==="
docker-compose -f docker-compose.production.yml -p gst-invoice-manager ps
echo "=== Port Status ==="
netstat -tulpn | grep -E ':(80|443|3000|56842) '
echo "=== Service Status ==="
systemctl status nginx --no-pager
systemctl status docker --no-pager
echo "=== Test Connections ==="
curl -I http://localhost:3000/health
curl -I http://localhost
curl -I http://invoiceo.indigenservices.com
```

Share the output and I can help you fix any issues!