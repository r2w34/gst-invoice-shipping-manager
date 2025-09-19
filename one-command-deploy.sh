#!/bin/bash

# GST Invoice & Shipping Manager - One Command Deployment
# Run this script on your VPS server: curl -sSL https://raw.githubusercontent.com/r2w34/gst-invoice-shipping-manager/main/one-command-deploy.sh | sudo bash

set -e

echo "🚀 GST Invoice & Shipping Manager - One Command Deployment"
echo "Domain: invoiceo.indigenservices.com"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="invoiceo.indigenservices.com"
REPO_URL="https://github.com/r2w34/gst-invoice-shipping-manager.git"
APP_DIR="/opt/gst-invoice-manager"
COMPOSE_PROJECT_NAME="gst-invoice-manager"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    echo "Please run: curl -sSL https://raw.githubusercontent.com/r2w34/gst-invoice-shipping-manager/main/one-command-deploy.sh | sudo bash"
    exit 1
fi

echo -e "${BLUE}📦 Installing system dependencies...${NC}"
apt update
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw htop

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}🐳 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose if not present
if ! docker compose version &> /dev/null; then
    echo -e "${BLUE}🐳 Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo -e "${BLUE}🔥 Setting up firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw allow 56842/tcp
ufw --force enable

echo -e "${BLUE}📁 Setting up application directory...${NC}"
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo -e "${BLUE}⚙️ Creating environment configuration...${NC}"
cat > .env << EOF
# GST Invoice & Shipping Manager - Production Environment
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}

# Application Configuration
NODE_ENV=production
DOMAIN=${DOMAIN}

# Shopify App Configuration
SHOPIFY_API_KEY=7a6fca531dee436fcecd8536fc3cb72e
SHOPIFY_API_SECRET=bf7ee31d9491a158d2b410a1c5849681
SCOPES=write_products,read_orders,write_orders,read_customers,write_customers
HOST=https://${DOMAIN}
SHOPIFY_APP_URL=https://${DOMAIN}

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

echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.production.yml -p "$COMPOSE_PROJECT_NAME" down 2>/dev/null || true

echo -e "${BLUE}🚀 Building and starting containers...${NC}"
docker-compose -f docker-compose.production.yml -p "$COMPOSE_PROJECT_NAME" up -d --build

echo -e "${BLUE}🌐 Setting up Nginx configuration...${NC}"
cat > /etc/nginx/sites-available/gst-invoice-manager << 'EOF'
server {
    listen 80;
    server_name invoiceo.indigenservices.com www.invoiceo.indigenservices.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name invoiceo.indigenservices.com www.invoiceo.indigenservices.com;
    
    # SSL Configuration (Let's Encrypt will manage these)
    ssl_certificate /etc/letsencrypt/live/invoiceo.indigenservices.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/invoiceo.indigenservices.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self' https://*.shopify.com https://admin.shopify.com;" always;
    
    # Main Shopify App
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
        
        # CORS headers for Shopify App Bridge
        add_header Access-Control-Allow-Origin "https://admin.shopify.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    }
    
    # Admin Panel
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
        proxy_read_timeout 86400;
    }
    
    # Health checks
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
    
    location /admin/health {
        proxy_pass http://localhost:56842/health;
        access_log off;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        proxy_pass http://localhost:3000;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/x-javascript
        application/xml+rss
        application/javascript
        application/json
        application/xml
        image/svg+xml;
    
    client_max_body_size 50M;
    
    access_log /var/log/nginx/gst-invoice-manager.access.log;
    error_log /var/log/nginx/gst-invoice-manager.error.log;
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/gst-invoice-manager /etc/nginx/sites-enabled/
nginx -t
systemctl enable nginx
systemctl restart nginx

echo -e "${BLUE}🔒 Setting up SSL certificate...${NC}"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@indigenservices.com

# Setup auto-renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo -e "${YELLOW}⏳ Waiting for containers to be ready...${NC}"
sleep 30

echo -e "${BLUE}📊 Deployment Status:${NC}"
docker-compose -f docker-compose.production.yml -p "$COMPOSE_PROJECT_NAME" ps

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}🔗 Application URLs:${NC}"
echo -e "Main App: https://${DOMAIN}"
echo -e "Admin Panel: https://${DOMAIN}/admin"
echo -e "Health Check: https://${DOMAIN}/health"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "1. Update email and WhatsApp credentials in ${APP_DIR}/.env"
echo -e "2. Configure Shopify app settings with the new domain"
echo -e "3. Test all functionality"
echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo -e "View logs: docker-compose -f docker-compose.production.yml -p ${COMPOSE_PROJECT_NAME} logs"
echo -e "Restart: docker-compose -f docker-compose.production.yml -p ${COMPOSE_PROJECT_NAME} restart"
echo -e "Status: docker-compose -f docker-compose.production.yml -p ${COMPOSE_PROJECT_NAME} ps"
echo ""
echo -e "${GREEN}🎉 Your GST Invoice & Shipping Manager is now live!${NC}"