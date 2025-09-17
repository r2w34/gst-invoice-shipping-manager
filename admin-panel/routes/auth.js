const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Mock admin users (in production, this would be in database)
const adminUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@ginvoice.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'super_admin',
    name: 'Super Administrator',
  },
  {
    id: 2,
    username: 'support',
    email: 'support@ginvoice.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'support',
    name: 'Support Staff',
  },
];

// Login page
router.get('/login', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/dashboard');
  }
  
  res.render('auth/login', {
    title: 'Admin Login',
    error: req.query.error,
    message: req.query.message,
  });
});

// Login POST
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.redirect('/login?error=Please provide username and password');
    }
    
    // Find user
    const user = adminUsers.find(u => u.username === username || u.email === username);
    
    if (!user) {
      return res.redirect('/login?error=Invalid credentials');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.redirect('/login?error=Invalid credentials');
    }
    
    // Create session
    req.session.adminId = user.id;
    req.session.adminUsername = user.username;
    req.session.adminRole = user.role;
    req.session.adminName = user.name;
    
    // Generate JWT token for API access
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'admin-jwt-secret',
      { expiresIn: '24h' }
    );
    
    req.session.token = token;
    
    console.log(`Admin login: ${user.username} (${user.role})`);
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/login?error=Login failed. Please try again.');
  }
});

// Logout
router.post('/logout', (req, res) => {
  const username = req.session.adminUsername;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/dashboard?error=Logout failed');
    }
    
    console.log(`Admin logout: ${username}`);
    res.redirect('/login?message=Successfully logged out');
  });
});

// Forgot password page
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    message: req.query.message,
    error: req.query.error,
  });
});

// Forgot password POST
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.redirect('/forgot-password?error=Please provide email address');
    }
    
    // Find user by email
    const user = adminUsers.find(u => u.email === email);
    
    if (!user) {
      // Don't reveal if email exists or not
      return res.redirect('/forgot-password?message=If the email exists, password reset instructions have been sent');
    }
    
    // In production, send email with reset link
    console.log(`Password reset requested for: ${email}`);
    
    // For demo purposes, just show success message
    res.redirect('/forgot-password?message=Password reset instructions have been sent to your email');
  } catch (error) {
    console.error('Forgot password error:', error);
    res.redirect('/forgot-password?error=Failed to process request. Please try again.');
  }
});

// API endpoint for token validation
router.get('/api/validate-token', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ valid: false, error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-jwt-secret');
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// Change password page
router.get('/change-password', (req, res) => {
  if (!req.session || !req.session.adminId) {
    return res.redirect('/login');
  }
  
  res.render('auth/change-password', {
    title: 'Change Password',
    user: {
      name: req.session.adminName,
      username: req.session.adminUsername,
      role: req.session.adminRole,
    },
    message: req.query.message,
    error: req.query.error,
  });
});

// Change password POST
router.post('/change-password', async (req, res) => {
  try {
    if (!req.session || !req.session.adminId) {
      return res.redirect('/login');
    }
    
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.redirect('/change-password?error=All fields are required');
    }
    
    if (newPassword !== confirmPassword) {
      return res.redirect('/change-password?error=New passwords do not match');
    }
    
    if (newPassword.length < 6) {
      return res.redirect('/change-password?error=New password must be at least 6 characters');
    }
    
    // Find current user
    const user = adminUsers.find(u => u.id === req.session.adminId);
    
    if (!user) {
      return res.redirect('/login?error=User not found');
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.redirect('/change-password?error=Current password is incorrect');
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password (in production, update database)
    user.password = hashedPassword;
    
    console.log(`Password changed for admin: ${user.username}`);
    
    res.redirect('/change-password?message=Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    res.redirect('/change-password?error=Failed to change password. Please try again.');
  }
});

module.exports = router;