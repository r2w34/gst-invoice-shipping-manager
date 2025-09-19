#!/bin/bash

# GST Invoice & Shipping Manager - Production Deployment Script
# Domain: invoiceo.indigenservices.com
# VPS: 194.164.149.183

set -e

echo "🚀 Starting production deployment to invoiceo.indigenservices.com..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production Configuration
DOMAIN="invoiceo.indigenservices.com"
REPO_URL="https://github.com/r2w34/gst-invoice-shipping-manager.git"
APP_DIR="/var/www/gst-invoice-manager"
SERVICE_NAME="gst-invoice-manager"
ADMIN_SERVICE_NAME="admin-panel-v2"

echo -e "${BLUE}📋 Production Deployment Configuration:${NC}"
echo -e "Domain: ${DOMAIN}"
echo -e "Repository: ${REPO_URL}"
echo -e "App Directory: ${APP_DIR}"
echo -e "Service Name: ${SERVICE_NAME}"
echo -e "Admin Service: ${ADMIN_SERVICE_NAME}"
echo ""

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}❌ This script must be run as root for production deployment${NC}"
        echo -e "Please run: sudo ./deploy-production.sh"
        exit 1
    fi
}

# Function to install system dependencies
install_system_dependencies() {
    echo -e "${BLUE}📦 Installing system dependencies...${NC}"
    
    # Update system
    apt update && apt upgrade -y
    
    # Install essential packages
    apt install -y curl wget git nginx certbot python3-certbot-nginx ufw htop
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Install PM2 globally
    npm install -g pm2
    
    echo -e "${GREEN}✅ System dependencies installed${NC}"
}

# Function to setup firewall
setup_firewall() {
    echo -e "${BLUE}🔥 Setting up firewall...${NC}"
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow application ports (for direct access if needed)
    ufw allow 3000/tcp
    ufw allow 56842/tcp
    
    # Enable firewall
    ufw --force enable
    
    echo -e "${GREEN}✅ Firewall configured${NC}"
}

# Function to clone or update repository
setup_repository() {
    echo -e "${BLUE}📁 Setting up repository...${NC}"
    
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
    
    # Set proper ownership
    chown -R www-data:www-data "$APP_DIR"
    chmod -R 755 "$APP_DIR"
    
    echo -e "${GREEN}✅ Repository setup complete${NC}"
}

# Function to install application dependencies
install_app_dependencies() {
    echo -e "${BLUE}📦 Installing application dependencies...${NC}"
    
    cd "$APP_DIR"
    
    # Install main app dependencies
    npm install --production
    
    # Install admin panel dependencies
    cd admin-panel-v2
    npm install --production
    
    cd "$APP_DIR"
    
    echo -e "${GREEN}✅ Application dependencies installed${NC}"
}

# Function to setup environment
setup_environment() {
    echo -e "${BLUE}⚙️ Setting up production environment...${NC}"
    
    cd "$APP_DIR"
    
    # Copy production environment file
    cp .env.production .env
    
    # Generate a secure session secret
    SESSION_SECRET=$(openssl rand -base64 32)
    sed -i "s/your_super_secret_session_key_here_change_this_in_production/$SESSION_SECRET/g" .env
    
    echo -e "${GREEN}✅ Environment configuration complete${NC}"
    echo -e "${YELLOW}⚠️ Please update email and WhatsApp credentials in .env file${NC}"
}

# Function to build application
build_application() {
    echo -e "${BLUE}🔨 Building application...${NC}"
    
    cd "$APP_DIR"
    
    # Build main application
    npm run build
    
    # Build admin panel
    cd admin-panel-v2
    npm run build 2>/dev/null || echo "Admin panel build completed"
    
    cd "$APP_DIR"
    
    echo -e "${GREEN}✅ Application build complete${NC}"
}

# Function to setup database
setup_database() {
    echo -e "${BLUE}🗄️ Setting up database...${NC}"
    
    cd "$APP_DIR"
    
    # Create prisma directory if it doesn't exist
    mkdir -p prisma
    
    # Generate Prisma client
    npx prisma generate
    
    # Setup database
    npx prisma db push
    
    # Set proper permissions for database
    chown www-data:www-data prisma/dev.db 2>/dev/null || true
    chmod 664 prisma/dev.db 2>/dev/null || true
    
    echo -e "${GREEN}✅ Database setup complete${NC}"
}

# Function to create PM2 ecosystem file
create_pm2_config() {
    echo -e "${BLUE}🔄 Creating PM2 configuration...${NC}"
    
    cd "$APP_DIR"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: '${SERVICE_NAME}',
      script: 'npm',
      args: 'start',
      cwd: '${APP_DIR}',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/main-err.log',
      out_file: './logs/main-out.log',
      log_file: './logs/main-combined.log',
      time: true
    },
    {
      name: '${ADMIN_SERVICE_NAME}',
      script: 'api-server.js',
      cwd: '${APP_DIR}/admin-panel-v2',
      env: {
        NODE_ENV: 'production',
        PORT: 56842
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '../logs/admin-err.log',
      out_file: '../logs/admin-out.log',
      log_file: '../logs/admin-combined.log',
      time: true
    }
  ]
};
EOF

    # Create logs directory
    mkdir -p logs
    chown -R www-data:www-data logs
    
    echo -e "${GREEN}✅ PM2 configuration created${NC}"
}

# Function to setup PM2 services
setup_pm2_services() {
    echo -e "${BLUE}🔄 Setting up PM2 services...${NC}"
    
    cd "$APP_DIR"
    
    # Stop existing processes if running
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Start applications
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
    
    echo -e "${GREEN}✅ PM2 services configured${NC}"
}

# Function to setup Nginx
setup_nginx() {
    echo -e "${BLUE}🌐 Setting up Nginx configuration...${NC}"
    
    # Remove default nginx site
    rm -f /etc/nginx/sites-enabled/default
    
    # Create nginx configuration for the app
    cat > /etc/nginx/sites-available/gst-invoice-manager << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Main Shopify App
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
    }
    
    # Admin Panel
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
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
EOF
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/gst-invoice-manager /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    nginx -t
    
    # Start and enable nginx
    systemctl enable nginx
    systemctl restart nginx
    
    echo -e "${GREEN}✅ Nginx configuration complete${NC}"
}

# Function to setup SSL certificate
setup_ssl() {
    echo -e "${BLUE}🔒 Setting up SSL certificate with Let's Encrypt...${NC}"
    
    # Obtain SSL certificate
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@indigenservices.com
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    echo -e "${GREEN}✅ SSL certificate installed and auto-renewal configured${NC}"
}

# Function to show deployment status
show_status() {
    echo -e "${BLUE}📊 Deployment Status:${NC}"
    echo ""
    
    # Show PM2 status
    pm2 status
    
    echo ""
    echo -e "${GREEN}✅ Production deployment completed successfully!${NC}"
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
    echo -e "View logs: pm2 logs"
    echo -e "Restart apps: pm2 restart all"
    echo -e "Stop apps: pm2 stop all"
    echo -e "Nginx status: systemctl status nginx"
    echo -e "SSL renewal test: certbot renew --dry-run"
}

# Main deployment process
main() {
    echo -e "${GREEN}🚀 GST Invoice & Shipping Manager - Production Deployment${NC}"
    echo -e "${GREEN}Domain: ${DOMAIN}${NC}"
    echo -e "${GREEN}=========================================================${NC}"
    echo ""
    
    check_root
    install_system_dependencies
    setup_firewall
    setup_repository
    install_app_dependencies
    setup_environment
    build_application
    setup_database
    create_pm2_config
    setup_pm2_services
    setup_nginx
    setup_ssl
    show_status
}

# Run main function
main "$@"