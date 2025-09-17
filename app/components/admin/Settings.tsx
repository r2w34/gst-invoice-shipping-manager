import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Box,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Advanced Settings Page
 * Comprehensive configuration management
 */
export const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState({
    // Business Settings
    businessName: 'Your Business Name',
    gstin: '22AAAAA0000A1Z5',
    address: '123 Business Street, City, State - 123456',
    phone: '+91 9876543210',
    email: 'business@example.com',
    website: 'https://yourbusiness.com',
    
    // Invoice Settings
    invoicePrefix: 'INV',
    invoiceStartNumber: 1001,
    autoGenerateInvoice: true,
    defaultDueDays: 30,
    defaultTaxRate: 18,
    includeHSNCode: true,
    
    // Email Settings
    emailEnabled: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    emailTemplate: 'default',
    
    // WhatsApp Settings
    whatsappEnabled: false,
    whatsappApiKey: '',
    whatsappPhoneNumber: '',
    whatsappTemplate: 'default',
    
    // System Settings
    autoBackup: true,
    backupFrequency: 'daily',
    dataRetention: 365,
    enableLogging: true,
    maintenanceMode: false,
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = () => {
    // Save settings logic
    console.log('Saving settings:', settings);
    // Show success message
  };

  const handleTestEmail = () => {
    console.log('Testing email configuration...');
    // Test email logic
  };

  const handleTestWhatsApp = () => {
    console.log('Testing WhatsApp configuration...');
    // Test WhatsApp logic
  };

  const handleBackupNow = () => {
    console.log('Creating backup...');
    // Backup logic
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Settings & Configuration
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<BusinessIcon />} label="Business" />
          <Tab icon={<ReceiptIcon />} label="Invoicing" />
          <Tab icon={<EmailIcon />} label="Email" />
          <Tab icon={<WhatsAppIcon />} label="WhatsApp" />
          <Tab icon={<SecurityIcon />} label="Security" />
          <Tab icon={<BackupIcon />} label="Backup" />
        </Tabs>

        {/* Business Settings */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Business Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Business Name"
                value={settings.businessName}
                onChange={(e) => handleSettingChange('businessName', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="GSTIN"
                value={settings.gstin}
                onChange={(e) => handleSettingChange('gstin', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Business Address"
                value={settings.address}
                onChange={(e) => handleSettingChange('address', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Phone Number"
                value={settings.phone}
                onChange={(e) => handleSettingChange('phone', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={settings.email}
                onChange={(e) => handleSettingChange('email', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Website"
                value={settings.website}
                onChange={(e) => handleSettingChange('website', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleSaveSettings}>
                Save Business Settings
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Invoice Settings */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Invoice Configuration
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Invoice Prefix"
                value={settings.invoicePrefix}
                onChange={(e) => handleSettingChange('invoicePrefix', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Starting Invoice Number"
                value={settings.invoiceStartNumber}
                onChange={(e) => handleSettingChange('invoiceStartNumber', parseInt(e.target.value))}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Default Due Days"
                value={settings.defaultDueDays}
                onChange={(e) => handleSettingChange('defaultDueDays', parseInt(e.target.value))}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Default Tax Rate (%)"
                value={settings.defaultTaxRate}
                onChange={(e) => handleSettingChange('defaultTaxRate', parseFloat(e.target.value))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoGenerateInvoice}
                    onChange={(e) => handleSettingChange('autoGenerateInvoice', e.target.checked)}
                  />
                }
                label="Auto-generate invoices for new orders"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.includeHSNCode}
                    onChange={(e) => handleSettingChange('includeHSNCode', e.target.checked)}
                  />
                }
                label="Include HSN/SAC codes in invoices"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleSaveSettings}>
                Save Invoice Settings
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Email Settings */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Email Configuration
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailEnabled}
                    onChange={(e) => handleSettingChange('emailEnabled', e.target.checked)}
                  />
                }
                label="Enable Email Integration"
              />
            </Grid>
            
            {settings.emailEnabled && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP Host"
                    value={settings.smtpHost}
                    onChange={(e) => handleSettingChange('smtpHost', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="SMTP Port"
                    value={settings.smtpPort}
                    onChange={(e) => handleSettingChange('smtpPort', parseInt(e.target.value))}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP Username"
                    value={settings.smtpUsername}
                    onChange={(e) => handleSettingChange('smtpUsername', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="SMTP Password"
                    value={settings.smtpPassword}
                    onChange={(e) => handleSettingChange('smtpPassword', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box display="flex" gap={2}>
                    <Button variant="contained" onClick={handleSaveSettings}>
                      Save Email Settings
                    </Button>
                    <Button variant="outlined" onClick={handleTestEmail}>
                      Test Email Configuration
                    </Button>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </TabPanel>

        {/* WhatsApp Settings */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                WhatsApp Integration
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.whatsappEnabled}
                    onChange={(e) => handleSettingChange('whatsappEnabled', e.target.checked)}
                  />
                }
                label="Enable WhatsApp Integration"
              />
            </Grid>
            
            {settings.whatsappEnabled && (
              <>
                <Grid item xs={12}>
                  <Alert severity="info">
                    WhatsApp integration requires a Twilio account or WhatsApp Business API access.
                  </Alert>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="WhatsApp API Key"
                    value={settings.whatsappApiKey}
                    onChange={(e) => handleSettingChange('whatsappApiKey', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="WhatsApp Phone Number"
                    value={settings.whatsappPhoneNumber}
                    onChange={(e) => handleSettingChange('whatsappPhoneNumber', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box display="flex" gap={2}>
                    <Button variant="contained" onClick={handleSaveSettings}>
                      Save WhatsApp Settings
                    </Button>
                    <Button variant="outlined" onClick={handleTestWhatsApp}>
                      Test WhatsApp Configuration
                    </Button>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </TabPanel>

        {/* Security Settings */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Security & Access Control
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    API Access
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Shopify API Key"
                        secondary="Connected and active"
                      />
                      <ListItemSecondaryAction>
                        <Chip label="Active" color="success" size="small" />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="GST API Integration"
                        secondary="Not configured"
                      />
                      <ListItemSecondaryAction>
                        <Button size="small" variant="outlined">
                          Configure
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Data Privacy
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableLogging}
                        onChange={(e) => handleSettingChange('enableLogging', e.target.checked)}
                      />
                    }
                    label="Enable activity logging"
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Logs user activities for security and audit purposes
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Backup Settings */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Backup & Data Management
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Automatic Backup
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoBackup}
                        onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                      />
                    }
                    label="Enable automatic backups"
                  />
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      select
                      fullWidth
                      label="Backup Frequency"
                      value={settings.backupFrequency}
                      onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                      SelectProps={{ native: true }}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </TextField>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Manual Backup
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Create an immediate backup of all your data
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<BackupIcon />}
                    onClick={handleBackupNow}
                    fullWidth
                  >
                    Create Backup Now
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Data Retention
                  </Typography>
                  <TextField
                    type="number"
                    label="Data Retention Period (days)"
                    value={settings.dataRetention}
                    onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
                    helperText="How long to keep deleted records before permanent removal"
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleSaveSettings}>
                Save Backup Settings
              </Button>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SettingsPage;