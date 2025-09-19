# 🔧 Troubleshooting GST Invoice Manager Deployment

## Issue: https://invoiceo.indigenservices.com is not working

Let's diagnose and fix the deployment step by step.

## Step 1: Check if you ran the deployment

**SSH into your server:**
```bash
ssh root@194.164.149.183
```

**Check if the application was deployed:**
```bash
ls -la /opt/gst-invoice-manager/
```

If the directory doesn't exist, you need to run the deployment first.

## Step 2: DNS Configuration Check

**Check if domain points to your server:**
```bash
nslookup invoiceo.indigenservices.com
```

**Expected result:** Should show `194.164.149.183`

**If DNS is not configured:**
1. Go to your domain registrar (where you bought indigenservices.com)
2. Add an A record: `invoiceo` → `194.164.149.183`
3. Wait 5-15 minutes for DNS propagation

## Step 3: Run the Deployment

If you haven't deployed yet, run this:

```bash
# SSH into your server first
ssh root@194.164.149.183

# Then run the deployment
curl -sSL https://raw.githubusercontent.com/r2w34/gst-invoice-shipping-manager/main/one-command-deploy.sh | bash
```

## Step 4: Manual Deployment (If automated script fails)

```bash
# 1. Install dependencies
apt update && apt install -y curl wget git nginx certbot python3-certbot-nginx ufw

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# 3. Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. Setup firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 5. Clone repository
git clone https://github.com/r2w34/gst-invoice-shipping-manager.git /opt/gst-invoice-manager
cd /opt/gst-invoice-manager

# 6. Create environment file
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

# 7. Start containers
docker-compose -f docker-compose.production.yml -p gst-invoice-manager up -d --build

# 8. Setup Nginx
cat > /etc/nginx/sites-available/gst-invoice-manager << 'EOF'
server {
    listen 80;
    server_name invoiceo.indigenservices.com www.invoiceo.indigenservices.com;
    
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
        
        # CORS headers for Shopify
        add_header Access-Control-Allow-Origin "https://admin.shopify.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    }
    
    location /admin {
        proxy_pass http://localhost:56842;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
EOF

# 9. Enable Nginx site
ln -sf /etc/nginx/sites-available/gst-invoice-manager /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx
```

## Step 5: Verify Deployment Status

```bash
# Check if containers are running
cd /opt/gst-invoice-manager
docker-compose -f docker-compose.production.yml -p gst-invoice-manager ps

# Check container logs
docker-compose -f docker-compose.production.yml -p gst-invoice-manager logs

# Check if ports are listening
netstat -tulpn | grep -E ':(80|443|3000|56842) '

# Check Nginx status
systemctl status nginx

# Test local connection
curl -I http://localhost:3000/health
curl -I http://localhost:56842/health
```

## Step 6: Test Domain Access

```bash
# Test HTTP access (should work even without SSL)
curl -I http://invoiceo.indigenservices.com

# If HTTP works, setup SSL
certbot --nginx -d invoiceo.indigenservices.com --non-interactive --agree-tos --email admin@indigenservices.com
```

## Step 7: Common Issues and Solutions

### Issue: "Connection refused"
```bash
# Check if Docker containers are running
docker ps

# If not running, start them
cd /opt/gst-invoice-manager
docker-compose -f docker-compose.production.yml -p gst-invoice-manager up -d --build
```

### Issue: "502 Bad Gateway"
```bash
# Check if applications are responding locally
curl http://localhost:3000/health
curl http://localhost:56842/health

# If not responding, check logs
docker-compose -f docker-compose.production.yml -p gst-invoice-manager logs
```

### Issue: "DNS not resolving"
1. Check DNS settings with your domain provider
2. Add A record: `invoiceo` → `194.164.149.183`
3. Wait for DNS propagation (5-15 minutes)

### Issue: "SSL certificate error"
```bash
# Remove existing certificates and retry
certbot delete --cert-name invoiceo.indigenservices.com
certbot --nginx -d invoiceo.indigenservices.com --non-interactive --agree-tos --email admin@indigenservices.com
```

## Step 8: Quick Health Check Script

Create this script to check everything:

```bash
cat > /opt/gst-invoice-manager/health-check.sh << 'EOF'
#!/bin/bash
echo "=== GST Invoice Manager Health Check ==="
echo "1. Checking containers..."
docker-compose -f docker-compose.production.yml -p gst-invoice-manager ps

echo -e "\n2. Checking local app health..."
curl -s http://localhost:3000/health | head -1
curl -s http://localhost:56842/health | head -1

echo -e "\n3. Checking Nginx..."
systemctl is-active nginx

echo -e "\n4. Checking ports..."
netstat -tulpn | grep -E ':(80|443|3000|56842) '

echo -e "\n5. Testing domain..."
curl -I http://invoiceo.indigenservices.com 2>/dev/null | head -1
EOF

chmod +x /opt/gst-invoice-manager/health-check.sh
/opt/gst-invoice-manager/health-check.sh
```

## Step 9: If Nothing Works - Simple HTTP Setup

If you're having issues with SSL, let's get HTTP working first:

```bash
# Simple Nginx config for HTTP only
cat > /etc/nginx/sites-available/gst-invoice-manager << 'EOF'
server {
    listen 80;
    server_name invoiceo.indigenservices.com www.invoiceo.indigenservices.com 194.164.149.183;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /admin {
        proxy_pass http://localhost:56842;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

systemctl restart nginx

# Test with IP address
curl -I http://194.164.149.183
```

## Step 10: Get Help

If you're still having issues, run these commands and share the output:

```bash
# System info
uname -a
docker --version
nginx -v

# Service status
systemctl status nginx
systemctl status docker

# Container status
cd /opt/gst-invoice-manager
docker-compose -f docker-compose.production.yml -p gst-invoice-manager ps
docker-compose -f docker-compose.production.yml -p gst-invoice-manager logs --tail=50

# Network status
netstat -tulpn | grep -E ':(80|443|3000|56842) '

# DNS check
nslookup invoiceo.indigenservices.com

# Test connections
curl -I http://localhost:3000/health
curl -I http://194.164.149.183
```

## Expected Working URLs

Once everything is working:
- **HTTP**: http://invoiceo.indigenservices.com
- **HTTPS**: https://invoiceo.indigenservices.com (after SSL setup)
- **Admin Panel**: https://invoiceo.indigenservices.com/admin
- **Health Check**: https://invoiceo.indigenservices.com/health

Let me know what you find when you run these checks!