#!/bin/bash
set -e

echo "🚀 GST Invoice & Shipping Manager - Production Deployment Script"
echo "Domain: invoiceo.indigenservices.com"
echo "Server: 194.164.149.183"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (or use sudo)${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
apt update -y && apt upgrade -y

echo -e "${YELLOW}Step 2: Installing Docker...${NC}"
# Install Docker if not present
if ! command -v docker &> /dev/null; then
    apt install -y ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") \
      $(. /etc/os-release; echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update -y
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

echo -e "${YELLOW}Step 3: Installing Nginx and Certbot...${NC}"
apt install -y nginx certbot python3-certbot-nginx git

echo -e "${YELLOW}Step 4: Setting up application directory...${NC}"
mkdir -p /opt/gst-app && cd /opt/gst-app

# Clone or update repo
if [ -d "app" ]; then
    echo "Updating existing repository..."
    cd app
    git pull
else
    echo "Cloning repository..."
    git clone https://github.com/r2w34/gst-invoice-shipping-manager.git app
    cd app
fi

echo -e "${YELLOW}Step 5: Creating .env.production file...${NC}"
echo -e "${RED}IMPORTANT: You must edit .env.production with your actual Shopify credentials!${NC}"

cat > .env.production << 'EOF'
# GST Invoice & Shipping Manager - Production Environment Configuration
# Domain: invoiceo.indigenservices.com

# Shopify App Configuration - REPLACE THESE VALUES!
SHOPIFY_API_KEY=REPLACE_WITH_YOUR_SHOPIFY_API_KEY
SHOPIFY_API_SECRET=REPLACE_WITH_YOUR_SHOPIFY_API_SECRET
SCOPES=write_products,read_orders,write_orders,read_customers,write_customers
HOST=https://invoiceo.indigenservices.com
SHOPIFY_APP_URL=https://invoiceo.indigenservices.com

# Database Configuration
DATABASE_URL="file:./prisma/dev.db"

# Application Configuration
NODE_ENV=production
PORT=3000

# Session Secret - REPLACE WITH RANDOM STRING!
SESSION_SECRET=REPLACE_WITH_RANDOM_32_CHAR_STRING

# Email Services (Configure these with your actual credentials)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
EMAIL_FROM_ADDRESS=noreply@indigenservices.com
EMAIL_FROM_NAME=GST Invoice Manager

# WhatsApp Services (DISABLED for MVP - share-only UX)
WHATSAPP_ENABLED=false
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Admin Panel Configuration
ADMIN_PORT=56842
ADMIN_API_URL=http://localhost:3000/api/admin
EOF

echo -e "${RED}STOP! Edit .env.production now with your Shopify credentials:${NC}"
echo "nano .env.production"
echo ""
echo "Required changes:"
echo "1. SHOPIFY_API_KEY=your_actual_api_key"
echo "2. SHOPIFY_API_SECRET=your_actual_secret"
echo "3. SESSION_SECRET=\$(openssl rand -hex 32)"
echo ""
read -p "Press Enter after you've edited .env.production..."

echo -e "${YELLOW}Step 6: Building and starting Docker containers...${NC}"
docker compose -f docker-compose.production.yml down || true
docker compose -f docker-compose.production.yml up -d --build

echo -e "${YELLOW}Step 7: Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/invoiceo.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name invoiceo.indigenservices.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Important for embedded Shopify apps
        add_header Content-Security-Policy "frame-ancestors https://*.myshopify.com https://admin.shopify.com" always;
        add_header X-Frame-Options "ALLOWALL" always;
        
        # Increase timeout for PDF generation
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        access_log off;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/invoiceo.conf /etc/nginx/sites-enabled/invoiceo.conf

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo -e "${GREEN}Nginx configured successfully${NC}"
else
    echo -e "${RED}Nginx configuration failed${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 8: Setting up SSL with Let's Encrypt...${NC}"
echo "You'll need to provide an email address for Let's Encrypt notifications."
read -p "Enter your email address: " EMAIL

certbot --nginx -d invoiceo.indigenservices.com --non-interactive --agree-tos -m "$EMAIL"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}SSL certificate obtained successfully${NC}"
else
    echo -e "${RED}SSL setup failed. You may need to check DNS settings.${NC}"
    echo "Make sure invoiceo.indigenservices.com points to this server's IP."
fi

echo -e "${YELLOW}Step 9: Setting up automatic SSL renewal...${NC}"
# Add cron job for SSL renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo -e "${YELLOW}Step 10: Final verification...${NC}"
echo "Checking services..."

# Check Docker containers
echo "Docker containers:"
docker ps

# Check Nginx
echo -e "\nNginx status:"
systemctl status nginx --no-pager -l

# Test health endpoint
echo -e "\nTesting health endpoint:"
sleep 5
curl -I http://localhost:3000/health || echo "Health check failed - app may still be starting"

echo -e "\n${GREEN}🎉 Deployment completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://invoiceo.indigenservices.com/health to verify the app is running"
echo "2. Update your Shopify Partner app settings:"
echo "   - App URL: https://invoiceo.indigenservices.com"
echo "   - Allowed redirection URLs: https://invoiceo.indigenservices.com/auth/callback"
echo "3. Test OAuth: https://invoiceo.indigenservices.com/auth/login?shop=yourshop.myshopify.com"
echo ""
echo "Logs:"
echo "- App logs: docker logs -f gst-invoice-app"
echo "- Nginx logs: tail -f /var/log/nginx/access.log"
echo ""
echo -e "${YELLOW}Security reminder: Change your root password and consider setting up SSH keys!${NC}"