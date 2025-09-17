#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables
process.env.NODE_ENV = 'development';
process.env.SHOPIFY_APP_URL = 'http://localhost:53785';

// Start the Remix dev server
const remix = spawn('npm', ['run', 'dev:remix'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env
});

remix.on('close', (code) => {
  console.log(`Remix dev server exited with code ${code}`);
});

remix.on('error', (err) => {
  console.error('Failed to start Remix dev server:', err);
});

console.log('Starting GST Invoice & Shipping Manager...');
console.log('App will be available at: http://localhost:53785');