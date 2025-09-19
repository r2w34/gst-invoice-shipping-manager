#!/bin/bash

# GST Invoice & Shipping Manager - Docker Deployment Script
# Domain: invoiceo.indigenservices.com
# VPS: 194.164.149.183
# This script uses Docker to deploy the app without interfering with other applications

set -e

echo "🚀 Starting Docker deployment to invoiceo.indigenservices.com..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="invoiceo.indigenservices.com"
REPO_URL="https://github.com/r2w34/gst-invoice-shipping-manager.git"
APP_DIR="/opt/gst-invoice-manager"
COMPOSE_PROJECT_NAME="gst-invoice-manager"

echo -e "${BLUE}📋 Docker Deployment Configuration:${NC}"
echo -e "Domain: ${DOMAIN}"
echo -e "Repository: ${REPO_URL}"
echo -e "App Directory: ${APP_DIR}"
echo -e "Docker Project: ${COMPOSE_PROJECT_NAME}"
echo ""

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}❌ This script must be run as root${NC}"
        echo -e "Please run: sudo ./deploy-docker.sh"
        exit 1
    fi
}

# Function to check Docker installation
check_docker() {
    echo -e "${BLUE}🐳 Checking Docker installation...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        echo -e "${YELLOW}⚠️ Docker daemon is not running. Starting Docker...${NC}"
        systemctl start docker
        systemctl enable docker
        sleep 5
    fi
    
    echo -e "${GREEN}✅ Docker is ready${NC}"
}

# Function to setup application directory
setup_directory() {
    echo -e "${BLUE}📁 Setting up application directory...${NC}"
    
    if [ ! -d "$APP_DIR" ]; then
        echo -e "${YELLOW}📁 Creating app directory and cloning repository...${NC}"
        mkdir -p "$APP_DIR"
        git clone "$REPO_URL" "$APP_DIR"
    else
        echo -e "${GREEN}📁 App directory exists. Updating repository...${NC}"
        cd "$APP_DIR"
        git fetch origin
        git reset --hard origin/main
    fi
    
    cd "$APP_DIR"
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p prisma
    
    echo -e "${GREEN}✅ Directory setup complete${NC}"
}

# Function to create production environment file
create_env_file() {
    echo -e "${BLUE}⚙️ Creating production environment file...${NC}"
    
    cd "$APP_DIR"
    
    # Create .env file for Docker
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

# Ports (using non-conflicting ports)
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
    
    echo -e "${GREEN}✅ Environment file created${NC}"
    echo -e "${YELLOW}⚠️ Please update email and WhatsApp credentials in .env file${NC}"
}

# Function to stop existing containers
stop_existing_containers() {
    echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
    
    cd "$APP_DIR"
    
    # Stop and remove existing containers
    docker-compose -f docker-compose.production.yml -p "$COMPOSE_PROJECT_NAME" down 2>/dev/null || true
    
    # Remove any orphaned containers
    docker container prune -f
    
    echo -e "${GREEN}✅ Existing containers stopped${NC}"
}

# Function to build and start containers
start_containers() {
    echo -e "${BLUE}🚀 Building and starting containers...${NC}"
    
    cd "$APP_DIR"
    
    # Build and start containers
    docker-compose -f docker-compose.production.yml -p "$COMPOSE_PROJECT_NAME" up -d --build
    
    # Wait for containers to be healthy
    echo -e "${YELLOW}⏳ Waiting for containers to be healthy...${NC}"
    sleep 30
    
    # Check container status
    docker-compose -f docker-compose.production.yml -p "$COMPOSE_PROJECT_NAME" ps
    
    echo -e "${GREEN}✅ Containers started successfully${NC}"
}

# Function to setup Nginx configuration
setup_nginx() {
    echo -e "${BLUE}🌐 Setting up Nginx configuration...${NC}"
    
    # Check if Nginx is installed
    if ! command -v nginx &> /dev/null; then
        echo -e "${YELLOW}📦 Installing Nginx...${NC}"
        apt update
        apt install -y nginx
    fi
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/gst-invoice-manager << EOF
# GST Invoice & Shipping Manager - Nginx Configuration
# This configuration works alongside other applications

server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # SSL Configuration (Let's Encrypt will manage these)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
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
    
    # Main Shopify App (Docker container)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        
        # CORS headers for Shopify App Bridge
        add_header Access-Control-Allow-Origin "https://admin.shopify.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    }
    
    # Admin Panel (Docker container)
    location /admin {
        proxy_pass http://localhost:56842;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
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
    
    # Client max body size for file uploads
    client_max_body_size 50M;
    
    # Logging
    access_log /var/log/nginx/gst-invoice-manager.access.log;
    error_log /var/log/nginx/gst-invoice-manager.error.log;
}
EOF
    
    # Enable the site (only if it doesn't conflict)
    if [ ! -L /etc/nginx/sites-enabled/gst-invoice-manager ]; then
        ln -s /etc/nginx/sites-available/gst-invoice-manager /etc/nginx/sites-enabled/
    fi
    
    # Test nginx configuration
    nginx -t
    
    # Reload nginx (don't restart to avoid affecting other sites)
    systemctl reload nginx
    
    echo -e "${GREEN}✅ Nginx configuration complete${NC}"
}

# Function to setup SSL certificate
setup_ssl() {
    echo -e "${BLUE}🔒 Setting up SSL certificate with Let's Encrypt...${NC}"
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Obtain SSL certificate
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@indigenservices.com
    
    # Setup auto-renewal (only if not already present)
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    fi
    
    echo -e "${GREEN}✅ SSL certificate installed and auto-renewal configured${NC}"
}

# Function to show deployment status
show_status() {
    echo -e "${BLUE}📊 Deployment Status:${NC}"
    echo ""
    
    cd "$APP_DIR"
    
    # Show Docker container status
    echo -e "${BLUE}🐳 Docker Containers:${NC}"
    docker-compose -f docker-compose.production.yml -p "$COMPOSE_PROJECT_NAME" ps
    
    echo ""
    echo -e "${BLUE}🔍 Container Health:${NC}"
    
    # Check main app health
    if curl -f http://localhost:3000/health &>/dev/null; then
        echo -e "${GREEN}✅ Main App: Healthy${NC}"
    else
        echo -e "${RED}❌ Main App: Unhealthy${NC}"
    fi
    
    # Check admin panel health
    if curl -f http://localhost:56842/health &>/dev/null; then
        echo -e "${GREEN}✅ Admin Panel: Healthy${NC}"
    else
        echo -e "${RED}❌ Admin Panel: Unhealthy${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Docker deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}🔗 Application URLs:${NC}"
    echo -e "Main App: https://${DOMAIN}"
    echo -e "Admin Panel: https://${DOMAIN}/admin"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "1. Update email and WhatsApp credentials in ${APP_DIR}/.env"
    echo -e "2. Configure Shopify app settings with the new domain"
    echo -e "3. Test all functionality"
    echo ""
    echo -e "${BLUE}📝 Useful Commands:${NC}"
    echo -e "View logs: docker-compose -f docker-compose.production.yml -p ${COMPOSE_PROJECT_NAME} logs"
    echo -e "Restart containers: docker-compose -f docker-compose.production.yml -p ${COMPOSE_PROJECT_NAME} restart"
    echo -e "Stop containers: docker-compose -f docker-compose.production.yml -p ${COMPOSE_PROJECT_NAME} down"
    echo -e "Container status: docker-compose -f docker-compose.production.yml -p ${COMPOSE_PROJECT_NAME} ps"
}

# Main deployment process
main() {
    echo -e "${GREEN}🚀 GST Invoice & Shipping Manager - Docker Deployment${NC}"
    echo -e "${GREEN}Domain: ${DOMAIN}${NC}"
    echo -e "${GREEN}Using Docker for isolated deployment${NC}"
    echo -e "${GREEN}=========================================================${NC}"
    echo ""
    
    check_root
    check_docker
    setup_directory
    create_env_file
    stop_existing_containers
    start_containers
    setup_nginx
    setup_ssl
    show_status
}

# Run main function
main "$@"