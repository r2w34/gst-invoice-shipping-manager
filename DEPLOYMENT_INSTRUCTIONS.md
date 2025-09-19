# 🚀 GST Invoice & Shipping Manager - Deployment Instructions

## 📋 Overview

This guide will help you deploy the GST Invoice & Shipping Manager Shopify app to your VPS server using Docker. The deployment is designed to work alongside other applications without conflicts.

**Domain**: invoiceo.indigenservices.com  
**VPS**: 194.164.149.183  
**Deployment Method**: Docker containers with Nginx reverse proxy

## 🎯 What You'll Deploy

1. **Main Shopify App** (Port 3000) - GST invoice generation, shipping labels, customer management
2. **Admin Panel** (Port 56842) - Analytics dashboard and management interface
3. **Nginx Configuration** - SSL-enabled reverse proxy
4. **Let's Encrypt SSL** - Automatic HTTPS certificate

## 📦 Pre-Deployment Checklist

### ✅ Server Requirements
- [x] Ubuntu/Debian server with root access
- [x] Docker and Docker Compose installed
- [x] Ports 80, 443, 3000, 56842 available
- [x] Domain DNS pointing to server IP (194.164.149.183)

### ✅ Files Prepared
- [x] `docker-compose.production.yml` - Container orchestration
- [x] `Dockerfile` - Main app container
- [x] `admin-panel-v2/Dockerfile` - Admin panel container
- [x] `deploy-docker.sh` - Automated deployment script
- [x] `nginx-production.conf` - Nginx configuration template
- [x] `.env.production` - Environment variables template

## 🚀 Deployment Steps

### Step 1: Upload Files to Server

```bash
# On your VPS server, create the deployment directory
mkdir -p /opt/gst-invoice-manager
cd /opt/gst-invoice-manager

# Clone the repository
git clone https://github.com/r2w34/gst-invoice-shipping-manager.git .

# Or upload the files manually if you prefer
```

### Step 2: Run the Deployment Script

```bash
# Make the script executable
chmod +x deploy-docker.sh

# Run the deployment (as root)
sudo ./deploy-docker.sh
```

### Step 3: Manual Deployment (Alternative)

If the automated script doesn't work, follow these manual steps:

#### 3.1 Setup Environment

```bash
# Navigate to app directory
cd /opt/gst-invoice-manager

# Create environment file
cp .env.production .env

# Generate secure session secret
SESSION_SECRET=$(openssl rand -base64 32)
sed -i "s/your_super_secret_session_key_here_change_this_in_production/$SESSION_SECRET/g" .env
```

#### 3.2 Start Docker Containers

```bash
# Stop any existing containers
docker-compose -f docker-compose.production.yml -p gst-invoice-manager down

# Build and start containers
docker-compose -f docker-compose.production.yml -p gst-invoice-manager up -d --build

# Check container status
docker-compose -f docker-compose.production.yml -p gst-invoice-manager ps
```

#### 3.3 Configure Nginx

```bash
# Install Nginx if not present
apt update && apt install -y nginx

# Create Nginx configuration
cp nginx-production.conf /etc/nginx/sites-available/gst-invoice-manager

# Enable the site
ln -s /etc/nginx/sites-available/gst-invoice-manager /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

#### 3.4 Setup SSL Certificate

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d invoiceo.indigenservices.com -d www.invoiceo.indigenservices.com --non-interactive --agree-tos --email admin@indigenservices.com

# Setup auto-renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
```

## 🔧 Configuration

### Environment Variables

Update the following in `/opt/gst-invoice-manager/.env`:

```env
# Email Services (Required for notifications)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here

# WhatsApp Services (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

### Shopify App Configuration

1. Go to your Shopify Partner Dashboard
2. Navigate to your app settings
3. Update the App URL to: `https://invoiceo.indigenservices.com`
4. Update the Allowed redirection URL(s) to: `https://invoiceo.indigenservices.com/auth/callback`

## 🔍 Verification

### Check Container Status

```bash
cd /opt/gst-invoice-manager
docker-compose -f docker-compose.production.yml -p gst-invoice-manager ps
```

### Test Application Health

```bash
# Main app health check
curl -f https://invoiceo.indigenservices.com/health

# Admin panel health check
curl -f https://invoiceo.indigenservices.com/admin/health
```

### View Logs

```bash
# View all logs
docker-compose -f docker-compose.production.yml -p gst-invoice-manager logs

# View specific service logs
docker-compose -f docker-compose.production.yml -p gst-invoice-manager logs gst-invoice-app
docker-compose -f docker-compose.production.yml -p gst-invoice-manager logs gst-admin-panel
```

## 🌐 Access URLs

After successful deployment:

- **Main App**: https://invoiceo.indigenservices.com
- **Admin Panel**: https://invoiceo.indigenservices.com/admin
- **Health Check**: https://invoiceo.indigenservices.com/health

## 🔄 Management Commands

### Restart Services

```bash
cd /opt/gst-invoice-manager
docker-compose -f docker-compose.production.yml -p gst-invoice-manager restart
```

### Update Application

```bash
cd /opt/gst-invoice-manager

# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker-compose -f docker-compose.production.yml -p gst-invoice-manager up -d --build
```

### Stop Services

```bash
cd /opt/gst-invoice-manager
docker-compose -f docker-compose.production.yml -p gst-invoice-manager down
```

## 🐛 Troubleshooting

### Container Issues

```bash
# Check container logs
docker-compose -f docker-compose.production.yml -p gst-invoice-manager logs

# Restart specific container
docker-compose -f docker-compose.production.yml -p gst-invoice-manager restart gst-invoice-app

# Check Docker system status
docker system df
docker system prune -f  # Clean up unused resources
```

### Port Conflicts

```bash
# Check what's using ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :56842

# If ports are in use, update docker-compose.production.yml to use different ports
```

### SSL Issues

```bash
# Test SSL certificate
certbot certificates

# Renew certificate manually
certbot renew --dry-run

# Check Nginx configuration
nginx -t
```

### Database Issues

```bash
# Access the main app container
docker exec -it gst-invoice-app bash

# Inside container, check database
npx prisma db push
npx prisma generate
```

## 📞 Support

If you encounter issues:

1. Check the container logs first
2. Verify all environment variables are set correctly
3. Ensure DNS is pointing to the correct IP
4. Test SSL certificate installation
5. Check firewall settings (ports 80, 443 should be open)

## 🎉 Success Indicators

✅ **Deployment Successful When:**
- Both containers are running and healthy
- HTTPS certificate is installed and working
- Main app responds at https://invoiceo.indigenservices.com
- Admin panel responds at https://invoiceo.indigenservices.com/admin
- Health checks return 200 status
- Shopify app authentication works

## 📋 Next Steps After Deployment

1. **Configure Email/WhatsApp credentials** in the .env file
2. **Update Shopify app settings** with the production domain
3. **Test GST invoice generation** functionality
4. **Test shipping label creation** functionality
5. **Verify admin panel** analytics and management features
6. **Setup monitoring** and backup procedures

---

**🚀 Ready to deploy? Follow the steps above and your GST Invoice & Shipping Manager will be live on invoiceo.indigenservices.com!**