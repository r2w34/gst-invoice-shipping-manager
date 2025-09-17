import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  LocalShipping as ShippingIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { getAnalytics } from '../../services/ReactAdminDataProvider.client';

interface AnalyticsData {
  totalCustomers: number;
  totalInvoices: number;
  totalOrders: number;
  totalLabels: number;
  recentInvoices: any[];
  monthlyRevenue: any[];
  topCustomers: any[];
}

/**
 * Advanced Analytics Page
 * Comprehensive business intelligence and reporting
 */
export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('6months');
  const [reportType, setReportType] = useState('overview');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await getAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [dateRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading analytics...</Typography>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Error loading analytics data</Typography>
      </Box>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Sample data for advanced charts
  const gstBreakdown = [
    { name: 'CGST', value: 45000, percentage: 35 },
    { name: 'SGST', value: 45000, percentage: 35 },
    { name: 'IGST', value: 38000, percentage: 30 },
  ];

  const monthlyGrowth = [
    { month: 'Jan', revenue: 45000, orders: 120, customers: 25 },
    { month: 'Feb', revenue: 52000, orders: 140, customers: 30 },
    { month: 'Mar', revenue: 48000, orders: 135, customers: 28 },
    { month: 'Apr', revenue: 61000, orders: 160, customers: 35 },
    { month: 'May', revenue: 58000, orders: 155, customers: 32 },
    { month: 'Jun', revenue: 67000, orders: 180, customers: 40 },
  ];

  const invoiceStatusData = [
    { name: 'Paid', value: 65, count: 156 },
    { name: 'Pending', value: 25, count: 60 },
    { name: 'Overdue', value: 10, count: 24 },
  ];

  const topProducts = [
    { name: 'Product A', revenue: 25000, orders: 45 },
    { name: 'Product B', revenue: 18000, orders: 32 },
    { name: 'Product C', revenue: 15000, orders: 28 },
    { name: 'Product D', revenue: 12000, orders: 22 },
    { name: 'Product E', revenue: 10000, orders: 18 },
  ];

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Advanced Analytics
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="1month">Last Month</MenuItem>
              <MenuItem value="3months">Last 3 Months</MenuItem>
              <MenuItem value="6months">Last 6 Months</MenuItem>
              <MenuItem value="1year">Last Year</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Report Type</InputLabel>
            <Select
              value={reportType}
              label="Report Type"
              onChange={(e) => setReportType(e.target.value)}
            >
              <MenuItem value="overview">Overview</MenuItem>
              <MenuItem value="revenue">Revenue</MenuItem>
              <MenuItem value="gst">GST Analysis</MenuItem>
              <MenuItem value="customers">Customers</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => console.log('Export report')}
          >
            Export
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Key Metrics Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    ₹{analytics.monthlyRevenue.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    +12.5% from last period
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4caf50', width: 56, height: 56 }}>
                  <MoneyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Invoices
                  </Typography>
                  <Typography variant="h4">
                    {analytics.totalInvoices}
                  </Typography>
                  <Typography variant="body2" color="info.main">
                    +8.2% from last period
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#2196f3', width: 56, height: 56 }}>
                  <ReceiptIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Customers
                  </Typography>
                  <Typography variant="h4">
                    {analytics.totalCustomers}
                  </Typography>
                  <Typography variant="body2" color="warning.main">
                    +15.3% from last period
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ff9800', width: 56, height: 56 }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Avg. Order Value
                  </Typography>
                  <Typography variant="h4">
                    ₹2,450
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    +5.7% from last period
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#9c27b0', width: 56, height: 56 }}>
                  <TrendingUpIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Revenue & Growth Trend"
              avatar={<TrendingUpIcon />}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={monthlyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === 'revenue' ? `₹${value}` : value,
                    name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : 'New Customers'
                  ]} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Invoice Status Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Invoice Status"
              avatar={<AssessmentIcon />}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* GST Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="GST Tax Breakdown"
              avatar={<ReceiptIcon />}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gstBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Top Performing Products"
              avatar={<ShippingIcon />}
            />
            <CardContent>
              <List>
                {topProducts.map((product, index) => (
                  <ListItem key={index} divider={index < topProducts.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: COLORS[index % COLORS.length] }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={product.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Revenue: ₹{product.revenue.toLocaleString()}
                          </Typography>
                          <Chip
                            label={`${product.orders} orders`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Recent Business Activity"
              avatar={<DateRangeIcon />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="h6" gutterBottom>
                    Today's Summary
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>New Orders:</Typography>
                      <Chip label="12" color="primary" size="small" />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Invoices Generated:</Typography>
                      <Chip label="8" color="success" size="small" />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Labels Created:</Typography>
                      <Chip label="15" color="info" size="small" />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Revenue:</Typography>
                      <Chip label="₹18,500" color="warning" size="small" />
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Button variant="outlined" size="small">
                      Generate GST Report
                    </Button>
                    <Button variant="outlined" size="small">
                      Export Customer Data
                    </Button>
                    <Button variant="outlined" size="small">
                      Bulk Invoice Generation
                    </Button>
                    <Button variant="outlined" size="small">
                      Revenue Forecast
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsPage;