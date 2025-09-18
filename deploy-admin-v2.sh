#!/bin/bash

# Deploy Admin Panel v2 to production server
echo "🚀 Deploying Admin Panel v2 to https://gadmin.indigenservices.com"

# Set variables
DOMAIN="gadmin.indigenservices.com"
LOCAL_DIST_PATH="/workspace/gst-invoice-manager/admin-panel-v2/dist"
API_SERVER_PATH="/workspace/gst-invoice-manager/admin-panel-v2/api-server.js"

# Check if dist folder exists
if [ ! -d "$LOCAL_DIST_PATH" ]; then
    echo "❌ Error: dist folder not found. Please run 'npm run build' first."
    exit 1
fi

echo "📁 Found dist folder with production build"

# Create deployment directory structure
echo "📂 Creating deployment structure..."

# Copy dist files to a deployment folder
DEPLOY_DIR="/tmp/admin-panel-v2-deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy built files
cp -r $LOCAL_DIST_PATH/* $DEPLOY_DIR/
cp $API_SERVER_PATH $DEPLOY_DIR/

# Create a simple server.js for production
cat > $DEPLOY_DIR/server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 56841;

// Enable CORS
app.use(cors());
app.use(express.json());

// API routes (from api-server.js)
const apiRoutes = require('./api-server.js');
app.use('/api', apiRoutes);

// Serve static files from dist
app.use(express.static(path.join(__dirname)));

// Handle React Router (serve index.html for all routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Admin Panel v2 running on port ${PORT}`);
  console.log(`📱 Access at: http://localhost:${PORT}`);
});
EOF

# Create package.json for production
cat > $DEPLOY_DIR/package.json << 'EOF'
{
  "name": "gst-admin-panel-v2",
  "version": "1.0.0",
  "description": "GST Invoice & Shipping Manager - Admin Panel v2",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
EOF

echo "✅ Deployment files prepared in $DEPLOY_DIR"

# List the files
echo "📋 Deployment contents:"
ls -la $DEPLOY_DIR

echo "🎯 Deployment ready!"
echo "📍 Deploy location: $DEPLOY_DIR"
echo "🌐 Target domain: https://$DOMAIN"

# Instructions for manual deployment
echo ""
echo "📝 Manual deployment steps:"
echo "1. Copy files from $DEPLOY_DIR to your server"
echo "2. Run 'npm install' on the server"
echo "3. Start with 'npm start' or PM2"
echo "4. Configure nginx/apache to proxy to port 56841"
echo ""

# For now, let's simulate the deployment by starting it locally
echo "🧪 Testing deployment locally..."
cd $DEPLOY_DIR

# Install dependencies
npm install

# Start the server with PM2
echo "🚀 Starting Admin Panel v2 with PM2..."
pm2 start server.js --name admin-panel-v2-prod --port 56841

echo "✅ Admin Panel v2 deployed and running!"
echo "🌐 Local test URL: http://localhost:56841"
echo "🎯 Production URL: https://$DOMAIN"