import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  People,
  AttachMoney,
  Receipt,
} from '@mui/icons-material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const mockAnalytics = {
  totalRevenue: 125000,
  monthlyRevenue: 15000,
  totalCustomers: 450,
  activeCustomers: 380,
  trialCustomers: 70,
  churnRate: 5.2,
  invoicesGenerated: 12500,
  labelsGenerated: 8900,
  featureUsage: {
    invoiceGeneration: { usage: 12500, trend: 15.3 },
    labelGeneration: { usage: 8900, trend: -2.1 },
    bulkOperations: { usage: 3200, trend: 8.7 },
    whatsappSharing: { usage: 5600, trend: 22.4 },
  },
  revenueByPlan: [
    { plan: 'Basic', revenue: 45000, customers: 200 },
    { plan: 'Standard', revenue: 60000, customers: 180 },
    { plan: 'Premium', revenue: 20000, customers: 70 },
  ],
  geographicData: [
    { state: 'Maharashtra', customers: 85, revenue: 28500 },
    { state: 'Karnataka', customers: 72, revenue: 24200 },
    { state: 'Tamil Nadu', customers: 68, revenue: 22800 },
    { state: 'Gujarat', customers: 55, revenue: 18500 },
    { state: 'Delhi', customers: 48, revenue: 16200 },
    { state: 'Others', customers: 122, revenue: 14800 },
  ],
  monthlyTrend: [
    { month: 'Jan', revenue: 12000, customers: 320, invoices: 2100, labels: 1500 },
    { month: 'Feb', revenue: 13500, customers: 340, invoices: 2300, labels: 1650 },
    { month: 'Mar', revenue: 14200, customers: 365, invoices: 2450, labels: 1720 },
    { month: 'Apr', revenue: 15800, customers: 390, invoices: 2680, labels: 1890 },
    { month: 'May', revenue: 14500, customers: 420, invoices: 2520, labels: 1780 },
    { month: 'Jun', revenue: 15000, customers: 450, invoices: 2600, labels: 1850 },
  ],
  customerRetention: [
    { month: 'Jan', newCustomers: 45, churnedCustomers: 12, retentionRate: 94.2 },
    { month: 'Feb', newCustomers: 52, churnedCustomers: 15, retentionRate: 93.8 },
    { month: 'Mar', newCustomers: 48, churnedCustomers: 18, retentionRate: 92.5 },
    { month: 'Apr', newCustomers: 55, churnedCustomers: 14, retentionRate: 94.1 },
    { month: 'May', newCustomers: 62, churnedCustomers: 16, retentionRate: 93.6 },
    { month: 'Jun', newCustomers: 58, churnedCustomers: 13, retentionRate: 94.8 },
  ],
};

const MetricCard: React.FC<{
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

export const Analytics: React.FC = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Analytics & Insights
      </Typography>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Monthly Revenue"
            value={`₹${mockAnalytics.monthlyRevenue.toLocaleString()}`}
            icon={<AttachMoney sx={{ color: 'white' }} />}
            trend={12.5}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Customers"
            value={mockAnalytics.activeCustomers}
            icon={<People sx={{ color: 'white' }} />}
            trend={8.2}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Invoices This Month"
            value="2,600"
            icon={<Receipt sx={{ color: 'white' }} />}
            trend={15.3}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Churn Rate"
            value={`${mockAnalytics.churnRate}%`}
            icon={<TrendingDown sx={{ color: 'white' }} />}
            trend={-1.2}
            color="#d32f2f"
          />
        </Grid>

        {/* Revenue Trend */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader title="Revenue & Customer Growth Trend" />
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={mockAnalytics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#1976d2"
                    fill="#1976d2"
                    fillOpacity={0.6}
                    name="Revenue (₹)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="customers"
                    stroke="#2e7d32"
                    strokeWidth={3}
                    name="Customers"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Plan Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardHeader title="Revenue by Plan" />
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={mockAnalytics.revenueByPlan}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ plan, revenue }) => `${plan}\n₹${revenue.toLocaleString()}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {mockAnalytics.revenueByPlan.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Feature Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Feature Usage Analytics" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { feature: 'Invoice Gen', usage: mockAnalytics.featureUsage.invoiceGeneration.usage },
                    { feature: 'Label Gen', usage: mockAnalytics.featureUsage.labelGeneration.usage },
                    { feature: 'Bulk Ops', usage: mockAnalytics.featureUsage.bulkOperations.usage },
                    { feature: 'WhatsApp', usage: mockAnalytics.featureUsage.whatsappSharing.usage },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="usage" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Retention */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Customer Retention Rate" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockAnalytics.customerRetention}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[90, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="retentionRate"
                    stroke="#2e7d32"
                    strokeWidth={3}
                    name="Retention Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Geographic Distribution */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Geographic Distribution" />
            <CardContent>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>State</strong></TableCell>
                      <TableCell align="right"><strong>Customers</strong></TableCell>
                      <TableCell align="right"><strong>Revenue (₹)</strong></TableCell>
                      <TableCell align="right"><strong>Avg Revenue per Customer</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockAnalytics.geographicData.map((row) => (
                      <TableRow key={row.state}>
                        <TableCell component="th" scope="row">
                          {row.state}
                        </TableCell>
                        <TableCell align="right">{row.customers}</TableCell>
                        <TableCell align="right">₹{row.revenue.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          ₹{Math.round(row.revenue / row.customers).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};