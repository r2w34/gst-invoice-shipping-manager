#!/bin/bash

# GST Invoice & Shipping Manager - Deployment Verification Script
# This script verifies that the deployment is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="invoiceo.indigenservices.com"
APP_DIR="/opt/gst-invoice-manager"
COMPOSE_PROJECT_NAME="gst-invoice-manager"

echo -e "${BLUE}🔍 GST Invoice & Shipping Manager - Deployment Verification${NC}"
echo -e "${BLUE}Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo ""

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${YELLOW}⚠️ Running as non-root user. Some checks may require sudo.${NC}"
    fi
}

# Function to check Docker containers
check_containers() {
    echo -e "${BLUE}🐳 Checking Docker containers...${NC}"
    
    cd "$APP_DIR" 2>/dev/null || {
        echo -e "${RED}❌ App directory not found: $APP_DIR${NC}"
        return 1
    }
    
    # Check if containers are running
    if docker-compose -f docker-compose.production.yml -p "$COMPOSE_PROJECT_NAME" ps | grep -q "Up"; then
        echo -e "${GREEN}✅ Docker containers are running${NC}"
        docker-compose -f docker-compose.production.yml -p "$COMPOSE_PROJECT_NAME" ps
    else
        echo -e "${RED}❌ Docker containers are not running${NC}"
        return 1
    fi
    
    echo ""
}

# Function to check application health
check_app_health() {
    echo -e "${BLUE}🏥 Checking application health...${NC}"
    
    # Check main app health
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Main App (Port 3000): Healthy${NC}"
        curl -s http://localhost:3000/health | jq . 2>/dev/null || echo "Health check response received"
    else
        echo -e "${RED}❌ Main App (Port 3000): Unhealthy or not responding${NC}"
    fi
    
    # Check admin panel health
    if curl -f -s http://localhost:56842/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Admin Panel (Port 56842): Healthy${NC}"
        curl -s http://localhost:56842/health | jq . 2>/dev/null || echo "Health check response received"
    else
        echo -e "${RED}❌ Admin Panel (Port 56842): Unhealthy or not responding${NC}"
    fi
    
    echo ""
}

# Function to check Nginx configuration
check_nginx() {
    echo -e "${BLUE}🌐 Checking Nginx configuration...${NC}"
    
    if command -v nginx &> /dev/null; then
        if nginx -t &> /dev/null; then
            echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
        else
            echo -e "${RED}❌ Nginx configuration has errors${NC}"
            nginx -t
        fi
        
        if systemctl is-active --quiet nginx; then
            echo -e "${GREEN}✅ Nginx service is running${NC}"
        else
            echo -e "${RED}❌ Nginx service is not running${NC}"
        fi
        
        # Check if our site is enabled
        if [ -L /etc/nginx/sites-enabled/gst-invoice-manager ]; then
            echo -e "${GREEN}✅ GST Invoice Manager site is enabled${NC}"
        else
            echo -e "${YELLOW}⚠️ GST Invoice Manager site is not enabled${NC}"
        fi
    else
        echo -e "${RED}❌ Nginx is not installed${NC}"
    fi
    
    echo ""
}

# Function to check SSL certificate
check_ssl() {
    echo -e "${BLUE}🔒 Checking SSL certificate...${NC}"
    
    if command -v certbot &> /dev/null; then
        if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
            echo -e "${GREEN}✅ SSL certificate exists for $DOMAIN${NC}"
            
            # Check certificate expiry
            if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
                echo -e "${GREEN}✅ SSL certificate is accessible${NC}"
            else
                echo -e "${YELLOW}⚠️ SSL certificate exists but may not be properly configured${NC}"
            fi
        else
            echo -e "${RED}❌ SSL certificate not found for $DOMAIN${NC}"
        fi
    else
        echo -e "${RED}❌ Certbot is not installed${NC}"
    fi
    
    echo ""
}

# Function to check domain accessibility
check_domain_access() {
    echo -e "${BLUE}🌍 Checking domain accessibility...${NC}"
    
    # Check HTTP redirect
    if curl -I -s "http://$DOMAIN" | grep -q "301\|302"; then
        echo -e "${GREEN}✅ HTTP to HTTPS redirect is working${NC}"
    else
        echo -e "${YELLOW}⚠️ HTTP to HTTPS redirect may not be configured${NC}"
    fi
    
    # Check HTTPS access
    if curl -f -s "https://$DOMAIN" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ HTTPS access is working${NC}"
    else
        echo -e "${RED}❌ HTTPS access is not working${NC}"
    fi
    
    # Check admin panel access
    if curl -f -s "https://$DOMAIN/admin" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Admin panel is accessible${NC}"
    else
        echo -e "${RED}❌ Admin panel is not accessible${NC}"
    fi
    
    echo ""
}

# Function to check ports
check_ports() {
    echo -e "${BLUE}🔌 Checking port availability...${NC}"
    
    # Check if ports are listening
    if netstat -tulpn 2>/dev/null | grep -q ":3000 "; then
        echo -e "${GREEN}✅ Port 3000 is listening${NC}"
    else
        echo -e "${RED}❌ Port 3000 is not listening${NC}"
    fi
    
    if netstat -tulpn 2>/dev/null | grep -q ":56842 "; then
        echo -e "${GREEN}✅ Port 56842 is listening${NC}"
    else
        echo -e "${RED}❌ Port 56842 is not listening${NC}"
    fi
    
    if netstat -tulpn 2>/dev/null | grep -q ":80 "; then
        echo -e "${GREEN}✅ Port 80 (HTTP) is listening${NC}"
    else
        echo -e "${RED}❌ Port 80 (HTTP) is not listening${NC}"
    fi
    
    if netstat -tulpn 2>/dev/null | grep -q ":443 "; then
        echo -e "${GREEN}✅ Port 443 (HTTPS) is listening${NC}"
    else
        echo -e "${RED}❌ Port 443 (HTTPS) is not listening${NC}"
    fi
    
    echo ""
}

# Function to check environment configuration
check_environment() {
    echo -e "${BLUE}⚙️ Checking environment configuration...${NC}"
    
    if [ -f "$APP_DIR/.env" ]; then
        echo -e "${GREEN}✅ Environment file exists${NC}"
        
        # Check for required variables
        if grep -q "SHOPIFY_API_KEY" "$APP_DIR/.env"; then
            echo -e "${GREEN}✅ Shopify API key is configured${NC}"
        else
            echo -e "${RED}❌ Shopify API key is missing${NC}"
        fi
        
        if grep -q "HOST=https://$DOMAIN" "$APP_DIR/.env"; then
            echo -e "${GREEN}✅ Domain is correctly configured${NC}"
        else
            echo -e "${YELLOW}⚠️ Domain configuration may need updating${NC}"
        fi
    else
        echo -e "${RED}❌ Environment file not found${NC}"
    fi
    
    echo ""
}

# Function to show summary
show_summary() {
    echo -e "${BLUE}📊 Deployment Verification Summary${NC}"
    echo -e "${BLUE}===================================${NC}"
    echo ""
    
    echo -e "${BLUE}🔗 Application URLs:${NC}"
    echo -e "Main App: https://$DOMAIN"
    echo -e "Admin Panel: https://$DOMAIN/admin"
    echo -e "Health Check: https://$DOMAIN/health"
    echo ""
    
    echo -e "${BLUE}📝 Useful Commands:${NC}"
    echo -e "View logs: docker-compose -f docker-compose.production.yml -p $COMPOSE_PROJECT_NAME logs"
    echo -e "Restart: docker-compose -f docker-compose.production.yml -p $COMPOSE_PROJECT_NAME restart"
    echo -e "Status: docker-compose -f docker-compose.production.yml -p $COMPOSE_PROJECT_NAME ps"
    echo ""
    
    echo -e "${GREEN}✅ Verification completed!${NC}"
}

# Main verification process
main() {
    check_root
    check_containers
    check_app_health
    check_nginx
    check_ssl
    check_domain_access
    check_ports
    check_environment
    show_summary
}

# Run main function
main "$@"