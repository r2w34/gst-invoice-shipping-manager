import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Box,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  People,
  AttachMoney,
  Receipt,
  LocalShipping,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const mockData = {
  totalRevenue: 125000,
  monthlyRevenue: 15000,
  totalCustomers: 450,
  activeCustomers: 380,
  trialCustomers: 70,
  churnRate: 5.2,
  invoicesGenerated: 12500,
  labelsGenerated: 8900,
  revenueByPlan: [
    { plan: 'Basic', revenue: 45000, customers: 200 },
    { plan: 'Standard', revenue: 60000, customers: 180 },
    { plan: 'Premium', revenue: 20000, customers: 70 },
  ],
  monthlyTrend: [
    { month: 'Jan', revenue: 12000, customers: 320 },
    { month: 'Feb', revenue: 13500, customers: 340 },
    { month: 'Mar', revenue: 14200, customers: 365 },
    { month: 'Apr', revenue: 15800, customers: 390 },
    { month: 'May', revenue: 14500, customers: 420 },
    { month: 'Jun', revenue: 15000, customers: 450 },
  ],
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color: string;
}> = ({ title, value, icon, trend, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          {trend !== undefined && (
            <Box display="flex" alignItems="center" mt={1}>
              {trend > 0 ? (
                <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} />
              ) : (
                <TrendingDown sx={{ color: 'error.main', mr: 0.5 }} />
              )}
              <Typography
                variant="body2"
                color={trend > 0 ? 'success.main' : 'error.main'}
              >
                {Math.abs(trend)}%
              </Typography>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const Dashboard: React.FC = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        GST Invoice Admin Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`₹${mockData.totalRevenue.toLocaleString()}`}
            icon={<AttachMoney sx={{ color: 'white' }} />}
            trend={12.5}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Customers"
            value={mockData.activeCustomers}
            icon={<People sx={{ color: 'white' }} />}
            trend={8.2}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Invoices Generated"
            value={mockData.invoicesGenerated.toLocaleString()}
            icon={<Receipt sx={{ color: 'white' }} />}
            trend={15.3}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Labels Generated"
            value={mockData.labelsGenerated.toLocaleString()}
            icon={<LocalShipping sx={{ color: 'white' }} />}
            trend={-2.1}
            color="#9c27b0"
          />
        </Grid>

        {/* Revenue by Plan Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Revenue by Plan" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockData.revenueByPlan}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ plan, revenue }) => `${plan}: ₹${revenue.toLocaleString()}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {mockData.revenueByPlan.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Trend Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Monthly Growth Trend" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1976d2"
                    strokeWidth={2}
                    name="Revenue (₹)"
                  />
                  <Line
                    type="monotone"
                    dataKey="customers"
                    stroke="#2e7d32"
                    strokeWidth={2}
                    name="Customers"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Distribution */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Customer Distribution by Plan" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.revenueByPlan}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="customers" fill="#1976d2" name="Customers" />
                  <Bar dataKey="revenue" fill="#2e7d32" name="Revenue (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};