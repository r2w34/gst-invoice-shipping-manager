# 🚀 Deploy GST Invoice & Shipping Manager on Your VPS

## Quick Deployment (Copy & Paste)

**SSH into your server first:**
```bash
ssh root@194.164.149.183
# Password: Kalilinux@2812
```

**Then run this single command:**
```bash
curl -sSL https://raw.githubusercontent.com/r2w34/gst-invoice-shipping-manager/main/one-command-deploy.sh | bash
```

## Manual Deployment (If above doesn't work)

### Step 1: Connect to your server
```bash
ssh root@194.164.149.183
# Password: Kalilinux@2812
```

### Step 2: Install dependencies
```bash
apt update && apt install -y curl wget git nginx certbot python3-certbot-nginx ufw htop

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Step 3: Setup firewall
```bash
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw allow 56842/tcp
ufw --force enable
```

### Step 4: Clone and setup application
```bash
git clone https://github.com/r2w34/gst-invoice-shipping-manager.git /opt/gst-invoice-manager
cd /opt/gst-invoice-manager
```

### Step 5: Create environment file
```bash
cat > .env << 'EOF'
# GST Invoice & Shipping Manager - Production Environment
COMPOSE_PROJECT_NAME=gst-invoice-manager

# Application Configuration
NODE_ENV=production
DOMAIN=invoiceo.indigenservices.com

# Shopify App Configuration
SHOPIFY_API_KEY=7a6fca531dee436fcecd8536fc3cb72e
SHOPIFY_API_SECRET=bf7ee31d9491a158d2b410a1c5849681
SCOPES=write_products,read_orders,write_orders,read_customers,write_customers
HOST=https://invoiceo.indigenservices.com
SHOPIFY_APP_URL=https://invoiceo.indigenservices.com

# Database Configuration
DATABASE_URL=file:./prisma/dev.db

# Ports
MAIN_APP_PORT=3000
ADMIN_PANEL_PORT=56842

# Email Services (Update with your credentials)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
EMAIL_FROM_ADDRESS=noreply@indigenservices.com
EMAIL_FROM_NAME=GST Invoice Manager

# WhatsApp Services (Update with your Twilio credentials)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Security
SESSION_SECRET=$(openssl rand -base64 32)
EOF
```

### Step 6: Start Docker containers
```bash
docker-compose -f docker-compose.production.yml -p gst-invoice-manager down 2>/dev/null || true
docker-compose -f docker-compose.production.yml -p gst-invoice-manager up -d --build
```

### Step 7: Setup Nginx
```bash
cat > /etc/nginx/sites-available/gst-invoice-manager << 'EOF'
server {
    listen 80;
    server_name invoiceo.indigenservices.com www.invoiceo.indigenservices.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name invoiceo.indigenservices.com www.invoiceo.indigenservices.com;
    
    ssl_certificate /etc/letsencrypt/live/invoiceo.indigenservices.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/invoiceo.indigenservices.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self' https://*.shopify.com https://admin.shopify.com;" always;
    
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
        proxy_read_timeout 86400;
        
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
        proxy_cache_bypass $http_upgrade;
    }
    
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
    
    location /admin/health {
        proxy_pass http://localhost:56842/health;
        access_log off;
    }
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml image/svg+xml;
    
    client_max_body_size 50M;
}
EOF

ln -sf /etc/nginx/sites-available/gst-invoice-manager /etc/nginx/sites-enabled/
nginx -t
systemctl enable nginx
systemctl restart nginx
```

### Step 8: Setup SSL certificate
```bash
certbot --nginx -d invoiceo.indigenservices.com -d www.invoiceo.indigenservices.com --non-interactive --agree-tos --email admin@indigenservices.com

# Setup auto-renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
```

### Step 9: Verify deployment
```bash
docker-compose -f docker-compose.production.yml -p gst-invoice-manager ps
curl -f https://invoiceo.indigenservices.com/health
```

## After Deployment

1. **Update Shopify App Settings:**
   - Go to Shopify Partner Dashboard
   - Update App URL: `https://invoiceo.indigenservices.com`
   - Update Redirect URLs: `https://invoiceo.indigenservices.com/auth/callback`

2. **Configure Email/WhatsApp:**
   - Edit `/opt/gst-invoice-manager/.env`
   - Add your SendGrid API key and Twilio credentials
   - Restart containers: `docker-compose -f docker-compose.production.yml -p gst-invoice-manager restart`

3. **Test the application:**
   - Visit: https://invoiceo.indigenservices.com
   - Admin Panel: https://invoiceo.indigenservices.com/admin

## Troubleshooting

If you encounter issues:
```bash
# Check container logs
docker-compose -f docker-compose.production.yml -p gst-invoice-manager logs

# Check Nginx status
systemctl status nginx

# Check SSL certificate
certbot certificates

# Restart everything
docker-compose -f docker-compose.production.yml -p gst-invoice-manager restart
systemctl restart nginx
```

## Success! 🎉

Your GST Invoice & Shipping Manager should now be live at:
- **Main App**: https://invoiceo.indigenservices.com
- **Admin Panel**: https://invoiceo.indigenservices.com/admin