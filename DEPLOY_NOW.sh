#!/bin/bash

echo "🚀 GST Invoice & Shipping Manager - Deployment Script"
echo "====================================================="
echo "Domain: invoiceo.indigenservices.com"
echo "Server: $(hostname -I | awk '{print $1}')"
echo "Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for $service on port $port..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$port/health >/dev/null 2>&1; then
            log_success "$service is responding on port $port"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    log_error "$service failed to start on port $port"
    return 1
}

# Step 1: Update system
log_info "Updating system packages..."
apt update && apt upgrade -y
log_success "System updated"

# Step 2: Install dependencies
log_info "Installing required packages..."
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw net-tools htop

# Step 3: Install Docker
if ! command_exists docker; then
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
    log_success "Docker installed"
else
    log_success "Docker already installed"
fi

# Step 4: Install Docker Compose
if ! command_exists docker-compose; then
    log_info "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose installed"
else
    log_success "Docker Compose already installed"
fi

# Step 5: Configure firewall
log_info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log_success "Firewall configured"

# Step 6: Setup application directory
log_info "Setting up application directory..."
mkdir -p /opt/gst-invoice-manager
cd /opt/gst-invoice-manager

# Remove existing files if any
if [ -d ".git" ]; then
    log_warning "Existing installation found, updating..."
    git pull origin main
else
    log_info "Cloning repository..."
    git clone https://github.com/r2w34/gst-invoice-shipping-manager.git .
fi

log_success "Repository ready"

# Step 7: Create environment file
log_info "Creating environment configuration..."
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

chmod 600 .env
log_success "Environment configured"

# Step 8: Stop existing containers if any
log_info "Stopping any existing containers..."
docker-compose -f docker-compose.production.yml -p gst-invoice-manager down 2>/dev/null || true

# Step 9: Build and start containers
log_info "Building and starting Docker containers..."
docker-compose -f docker-compose.production.yml -p gst-invoice-manager up -d --build

# Wait for containers to be ready
sleep 10

# Check container status
log_info "Checking container status..."
docker-compose -f docker-compose.production.yml -p gst-invoice-manager ps

# Step 10: Configure Nginx
log_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/gst-invoice-manager << 'EOF'
server {
    listen 80;
    server_name invoiceo.indigenservices.com www.invoiceo.indigenservices.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
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
if nginx -t; then
    log_success "Nginx configuration is valid"
else
    log_error "Nginx configuration has errors"
    exit 1
fi

# Start Nginx
systemctl enable nginx
systemctl restart nginx
log_success "Nginx configured and started"

# Step 11: Wait for applications to be ready
wait_for_service "Main App" 3000
wait_for_service "Admin Panel" 56842

# Step 12: Test HTTP access
log_info "Testing HTTP access..."
if curl -s -I http://localhost | grep -q "200\|301\|302"; then
    log_success "HTTP access working"
else
    log_warning "HTTP access may have issues"
fi

# Step 13: Setup SSL certificate
log_info "Setting up SSL certificate..."
if certbot --nginx -d invoiceo.indigenservices.com --non-interactive --agree-tos --email admin@indigenservices.com; then
    log_success "SSL certificate installed"
    
    # Setup auto-renewal
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
    log_success "SSL auto-renewal configured"
else
    log_warning "SSL certificate installation failed, but HTTP should work"
fi

# Step 14: Final verification
log_info "Running final verification..."
echo ""
echo "=== Container Status ==="
docker-compose -f /opt/gst-invoice-manager/docker-compose.production.yml -p gst-invoice-manager ps

echo ""
echo "=== Port Status ==="
netstat -tulpn | grep -E ':(80|443|3000|56842) '

echo ""
echo "=== Service Status ==="
systemctl is-active nginx
systemctl is-active docker

echo ""
echo "=== Testing URLs ==="
echo "HTTP Test:"
curl -s -I http://invoiceo.indigenservices.com | head -1
echo "HTTPS Test:"
curl -s -I https://invoiceo.indigenservices.com | head -1
echo "Health Check:"
curl -s http://localhost:3000/health

echo ""
echo "🎉 DEPLOYMENT COMPLETED!"
echo "========================"
echo ""
echo "Your GST Invoice & Shipping Manager is now deployed:"
echo ""
echo "🌐 Main Application: https://invoiceo.indigenservices.com"
echo "🔧 Admin Panel: https://invoiceo.indigenservices.com/admin"
echo "❤️  Health Check: https://invoiceo.indigenservices.com/health"
echo ""
echo "📋 Next Steps:"
echo "1. Visit https://invoiceo.indigenservices.com to test the app"
echo "2. Update your Shopify app settings with the new URL"
echo "3. Test the GST invoice generation and shipping features"
echo ""
echo "🔧 Useful Commands:"
echo "- Check containers: docker-compose -f /opt/gst-invoice-manager/docker-compose.production.yml -p gst-invoice-manager ps"
echo "- View logs: docker-compose -f /opt/gst-invoice-manager/docker-compose.production.yml -p gst-invoice-manager logs"
echo "- Restart app: systemctl restart nginx && docker-compose -f /opt/gst-invoice-manager/docker-compose.production.yml -p gst-invoice-manager restart"
echo ""
echo "✅ Deployment successful! Your app is ready to use."