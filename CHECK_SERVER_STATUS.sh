#!/bin/bash

echo "🔍 GST Invoice Manager - Server Status Check"
echo "=============================================="
echo "Server: 194.164.149.183"
echo "Domain: invoiceo.indigenservices.com"
echo "Date: $(date)"
echo ""

echo "1. 🌐 Checking DNS Resolution..."
echo "--------------------------------"
nslookup invoiceo.indigenservices.com
echo ""

echo "2. 🔌 Checking Server Connectivity..."
echo "------------------------------------"
echo "Testing SSH (port 22):"
timeout 5 nc -zv 194.164.149.183 22
echo ""
echo "Testing HTTP (port 80):"
timeout 5 nc -zv 194.164.149.183 80
echo ""
echo "Testing HTTPS (port 443):"
timeout 5 nc -zv 194.164.149.183 443
echo ""

echo "3. 🌍 Testing Domain Response..."
echo "-------------------------------"
echo "HTTP test:"
timeout 10 curl -I http://invoiceo.indigenservices.com 2>&1 | head -5
echo ""
echo "HTTPS test:"
timeout 10 curl -I https://invoiceo.indigenservices.com 2>&1 | head -5
echo ""

echo "4. 📊 Port Scan Results..."
echo "-------------------------"
nmap -p 22,80,443,3000,56842 194.164.149.183
echo ""

echo "5. 🔍 Detailed Connection Test..."
echo "--------------------------------"
echo "Testing with verbose curl:"
timeout 15 curl -v http://194.164.149.183 2>&1 | head -20
echo ""

echo "=============================================="
echo "✅ Server check completed!"
echo ""
echo "📋 What to do next:"
echo "1. If ports 80/443 show 'filtered' or 'closed' - the app is not deployed"
echo "2. If SSH works but HTTP doesn't - run the deployment script"
echo "3. If nothing responds - check server status with hosting provider"
echo ""
echo "🚀 To deploy the app, SSH to your server and run:"
echo "curl -sSL https://raw.githubusercontent.com/r2w34/gst-invoice-shipping-manager/main/one-command-deploy.sh | bash"