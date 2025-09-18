#!/bin/bash

# GST Invoice & Shipping Manager - VPS Deployment Script
# This script deploys the latest changes to the VPS server

set -e

echo "🚀 Starting deployment to VPS server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/r2w34/gst-invoice-shipping-manager.git"
APP_DIR="/var/www/gst-invoice-manager"
SERVICE_NAME="gst-invoice-manager"
ADMIN_SERVICE_NAME="admin-panel-v2-final"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo -e "Repository: ${REPO_URL}"
echo -e "App Directory: ${APP_DIR}"
echo -e "Service Name: ${SERVICE_NAME}"
echo -e "Admin Service: ${ADMIN_SERVICE_NAME}"
echo ""

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${RED}❌ This script should not be run as root${NC}"
        echo -e "Please run as a regular user with sudo privileges"
        exit 1
    fi
}

# Function to check if directory exists
check_directory() {
    if [ ! -d "$APP_DIR" ]; then
        echo -e "${YELLOW}📁 App directory doesn't exist. Creating and cloning repository...${NC}"
        sudo mkdir -p "$APP_DIR"
        sudo chown $USER:$USER "$APP_DIR"
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    else
        echo -e "${GREEN}📁 App directory exists. Updating repository...${NC}"
        cd "$APP_DIR"
        git fetch origin
        git reset --hard origin/main
    fi
}

# Function to install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
    npm install
    
    echo -e "${BLUE}🔨 Building the application...${NC}"
    npm run build
}

# Function to setup environment
setup_environment() {
    echo -e "${BLUE}⚙️ Setting up environment...${NC}"
    
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}📝 Creating .env file...${NC}"
        cat > .env << EOF
# Shopify App Configuration
SHOPIFY_API_KEY=7a6fca531dee436fcecd8536fc3cb72e
SHOPIFY_API_SECRET=bf7ee31d9491a158d2b410a1c5849681
SCOPES=read_orders,write_orders,read_customers,write_customers,read_products,write_products
HOST=https://your-domain.com

# Database
DATABASE_URL="file:./dev.db"

# Session Storage
SHOPIFY_APP_URL=https://your-domain.com
EOF
        echo -e "${YELLOW}⚠️ Please update the .env file with your actual domain and database URL${NC}"
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi
}

# Function to setup database
setup_database() {
    echo -e "${BLUE}🗄️ Setting up database...${NC}"
    
    # Generate Prisma client
    npx prisma generate
    
    # Run database migrations
    npx prisma db push
    
    echo -e "${GREEN}✅ Database setup complete${NC}"
}

# Function to setup PM2 process
setup_pm2() {
    echo -e "${BLUE}🔄 Setting up PM2 process...${NC}"
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}📦 Installing PM2...${NC}"
        sudo npm install -g pm2
    fi
    
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
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
EOF

    # Create logs directory
    mkdir -p logs
    
    # Stop existing process if running
    pm2 stop "$SERVICE_NAME" 2>/dev/null || true
    pm2 delete "$SERVICE_NAME" 2>/dev/null || true
    
    # Start the application
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    
    echo -e "${GREEN}✅ PM2 process setup complete${NC}"
}

# Function to setup nginx (optional)
setup_nginx() {
    echo -e "${BLUE}🌐 Setting up Nginx configuration...${NC}"
    
    if command -v nginx &> /dev/null; then
        # Create nginx configuration
        sudo tee /etc/nginx/sites-available/gst-invoice-manager << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
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
    }
    
    # Admin panel
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
    }
}
EOF
        
        # Enable the site
        sudo ln -sf /etc/nginx/sites-available/gst-invoice-manager /etc/nginx/sites-enabled/
        
        # Test nginx configuration
        sudo nginx -t
        
        # Reload nginx
        sudo systemctl reload nginx
        
        echo -e "${GREEN}✅ Nginx configuration complete${NC}"
        echo -e "${YELLOW}⚠️ Please update server_name in /etc/nginx/sites-available/gst-invoice-manager with your actual domain${NC}"
    else
        echo -e "${YELLOW}⚠️ Nginx not installed. Skipping nginx configuration.${NC}"
    fi
}

# Function to restart admin panel
restart_admin_panel() {
    echo -e "${BLUE}🔄 Restarting admin panel...${NC}"
    
    # Navigate to admin panel directory
    cd "$APP_DIR/admin-panel-v2"
    
    # Stop existing admin panel process
    pm2 stop "$ADMIN_SERVICE_NAME" 2>/dev/null || true
    pm2 delete "$ADMIN_SERVICE_NAME" 2>/dev/null || true
    
    # Start admin panel
    pm2 start simple-server.js --name "$ADMIN_SERVICE_NAME"
    pm2 save
    
    echo -e "${GREEN}✅ Admin panel restarted${NC}"
}

# Function to show status
show_status() {
    echo -e "${BLUE}📊 Deployment Status:${NC}"
    echo ""
    
    # Show PM2 status
    pm2 status
    
    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}🔗 Application URLs:${NC}"
    echo -e "Main App: http://localhost:3000"
    echo -e "Admin Panel: http://localhost:56842"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "1. Update .env file with your actual domain and database URL"
    echo -e "2. Configure your domain DNS to point to this server"
    echo -e "3. Setup SSL certificate (recommended: Let's Encrypt)"
    echo -e "4. Test all functionality"
    echo ""
    echo -e "${BLUE}📝 Useful Commands:${NC}"
    echo -e "View logs: pm2 logs ${SERVICE_NAME}"
    echo -e "Restart app: pm2 restart ${SERVICE_NAME}"
    echo -e "Stop app: pm2 stop ${SERVICE_NAME}"
    echo -e "Admin logs: pm2 logs ${ADMIN_SERVICE_NAME}"
}

# Main deployment process
main() {
    echo -e "${GREEN}🚀 GST Invoice & Shipping Manager - VPS Deployment${NC}"
    echo -e "${GREEN}=================================================${NC}"
    echo ""
    
    check_root
    check_directory
    install_dependencies
    setup_environment
    setup_database
    setup_pm2
    setup_nginx
    restart_admin_panel
    show_status
}

# Run main function
main "$@"