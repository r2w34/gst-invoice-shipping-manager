# 🚀 GST Invoice & Shipping Manager - Deployment Guide

## 📋 Overview

This guide covers the deployment of the GST Invoice & Shipping Manager Shopify app to a VPS server. The app includes:

- **Main Shopify App**: GST-compliant invoice and shipping label generation
- **Admin Panel**: Management dashboard for monitoring and analytics
- **Bulk Processing**: Automated invoice and label creation from Shopify orders
- **PDF Generation**: Professional GST invoices and shipping labels with barcodes

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Shopify App   │    │   Admin Panel   │    │     Database    │
│   (Port 3000)   │    │   (Port 56842)  │    │    (SQLite)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │      Nginx      │
                    │   (Port 80/443) │
                    └─────────────────┘
```

## 🔧 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 20GB SSD
- **CPU**: 2+ cores recommended
- **Network**: Public IP with ports 80, 443, 3000, 56842 accessible

### Software Requirements
- **Node.js**: v18+ (LTS recommended)
- **npm**: v8+
- **PM2**: Process manager
- **Nginx**: Web server (optional but recommended)
- **Git**: Version control

## 📦 Quick Deployment

### Option 1: Automated Deployment Script

```bash
# Clone the repository
git clone https://github.com/r2w34/gst-invoice-shipping-manager.git
cd gst-invoice-shipping-manager

# Make deployment script executable
chmod +x deploy-to-vps.sh

# Run deployment script
./deploy-to-vps.sh
```

### Option 2: Manual Deployment

#### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional)
sudo apt install nginx -y
```

#### Step 2: Clone and Setup Application

```bash
# Clone repository
git clone https://github.com/r2w34/gst-invoice-shipping-manager.git
cd gst-invoice-shipping-manager

# Install dependencies
npm install

# Build application
npm run build
```

#### Step 3: Environment Configuration

```bash
# Create environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```env
# Shopify App Configuration
SHOPIFY_API_KEY=7a6fca531dee436fcecd8536fc3cb72e
SHOPIFY_API_SECRET=bf7ee31d9491a158d2b410a1c5849681
SCOPES=read_orders,write_orders,read_customers,write_customers,read_products,write_products
HOST=https://your-domain.com

# Database
DATABASE_URL="file:./dev.db"

# Session Storage
SHOPIFY_APP_URL=https://your-domain.com
```

#### Step 4: Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Setup database
npx prisma db push
```

#### Step 5: Start Services with PM2

```bash
# Start main application
pm2 start npm --name "gst-invoice-manager" -- start

# Start admin panel
cd admin-panel-v2
pm2 start simple-server.js --name "admin-panel-v2-final"

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

## 🌐 Nginx Configuration

### Basic Configuration

Create `/etc/nginx/sites-available/gst-invoice-manager`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
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
    }
}
```

### Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/gst-invoice-manager /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring and Maintenance

### PM2 Commands

```bash
# View all processes
pm2 status

# View logs
pm2 logs gst-invoice-manager
pm2 logs admin-panel-v2-final

# Restart services
pm2 restart gst-invoice-manager
pm2 restart admin-panel-v2-final

# Stop services
pm2 stop all

# Delete services
pm2 delete all
```

### System Monitoring

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check network connections
netstat -tulpn | grep :3000
netstat -tulpn | grep :56842
```

## 🔄 Updates and Maintenance

### Updating the Application

```bash
# Navigate to app directory
cd /var/www/gst-invoice-shipping-manager

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Restart services
pm2 restart gst-invoice-manager
pm2 restart admin-panel-v2-final
```

### Database Backup

```bash
# Backup SQLite database
cp prisma/dev.db prisma/backup-$(date +%Y%m%d-%H%M%S).db

# Automated backup script
echo "0 2 * * * cp /var/www/gst-invoice-shipping-manager/prisma/dev.db /var/backups/gst-app-$(date +\%Y\%m\%d).db" | crontab -
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :56842

# Kill process if needed
sudo kill -9 <PID>
```

#### 2. Permission Issues
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/gst-invoice-shipping-manager

# Fix permissions
chmod -R 755 /var/www/gst-invoice-shipping-manager
```

#### 3. Database Issues
```bash
# Reset database
rm prisma/dev.db
npx prisma db push
```

#### 4. Memory Issues
```bash
# Increase swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Log Locations

- **Application Logs**: `~/.pm2/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `/var/log/syslog`

## 🔗 Application URLs

After successful deployment:

- **Main App**: `https://your-domain.com`
- **Admin Panel**: `https://your-domain.com/admin`
- **Direct Admin Access**: `http://your-server-ip:56842`

## 📞 Support

For deployment issues or questions:

1. Check the troubleshooting section above
2. Review application logs: `pm2 logs`
3. Check system resources: `htop`, `df -h`
4. Verify network connectivity: `netstat -tulpn`

## 🎯 Post-Deployment Checklist

- [ ] Application accessible via domain
- [ ] Admin panel working
- [ ] SSL certificate installed
- [ ] PM2 processes running
- [ ] Database accessible
- [ ] Shopify app configured
- [ ] Backup system in place
- [ ] Monitoring setup
- [ ] Firewall configured
- [ ] DNS records updated

## 🚀 Performance Optimization

### PM2 Cluster Mode

```bash
# Use cluster mode for better performance
pm2 start ecosystem.config.js --env production
```

### Nginx Caching

Add to Nginx configuration:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Optimization

```bash
# Regular database maintenance
sqlite3 prisma/dev.db "VACUUM;"
sqlite3 prisma/dev.db "ANALYZE;"
```

---

**🎉 Congratulations! Your GST Invoice & Shipping Manager is now deployed and ready to use!**