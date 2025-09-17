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
} from 'recharts';
import {
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
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
 * React Admin Dashboard
 * Comprehensive analytics and overview for the GST Invoice & Shipping Manager
 */
export const Dashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Error loading dashboard data</Typography>
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Total Customers',
      value: analytics.totalCustomers,
      icon: <PeopleIcon fontSize="large" />,
      color: '#1976d2',
    },
    {
      title: 'Total Invoices',
      value: analytics.totalInvoices,
      icon: <ReceiptIcon fontSize="large" />,
      color: '#388e3c',
    },
    {
      title: 'Total Orders',
      value: analytics.totalOrders,
      icon: <ShoppingCartIcon fontSize="large" />,
      color: '#f57c00',
    },
    {
      title: 'Shipping Labels',
      value: analytics.totalLabels,
      icon: <LocalShippingIcon fontSize="large" />,
      color: '#7b1fa2',
    },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stat.value.toLocaleString()}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: stat.color, width: 56, height: 56 }}>
                    {stat.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Monthly Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Monthly Revenue Trend"
              avatar={<TrendingUpIcon />}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ fill: '#8884d8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Customers */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Top Customers"
              avatar={<MoneyIcon />}
            />
            <CardContent>
              <List>
                {analytics.topCustomers.map((customer, index) => (
                  <ListItem key={customer.id} divider={index < analytics.topCustomers.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: COLORS[index % COLORS.length] }}>
                        {customer.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={customer.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            ₹{customer.totalValue.toLocaleString()}
                          </Typography>
                          <Chip
                            label={`${customer.invoiceCount} invoices`}
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

        {/* Recent Invoices */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Recent Invoices"
              avatar={<ReceiptIcon />}
            />
            <CardContent>
              <List>
                {analytics.recentInvoices.map((invoice, index) => (
                  <ListItem key={invoice.id} divider={index < analytics.recentInvoices.length - 1}>
                    <ListItemText
                      primary={`Invoice #${invoice.invoiceNumber}`}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {invoice.customer?.name} • ₹{invoice.totalAmount}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(invoice.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <Chip
                      label={invoice.status}
                      size="small"
                      color={invoice.status === 'PAID' ? 'success' : 'warning'}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Invoice Status Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Invoice Status Distribution"
              avatar={<ReceiptIcon />}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Paid', value: 65, color: '#4caf50' },
                      { name: 'Pending', value: 25, color: '#ff9800' },
                      { name: 'Overdue', value: 10, color: '#f44336' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Paid', value: 65, color: '#4caf50' },
                      { name: 'Pending', value: 25, color: '#ff9800' },
                      { name: 'Overdue', value: 10, color: '#f44336' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;