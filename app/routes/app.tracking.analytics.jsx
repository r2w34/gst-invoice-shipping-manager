import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  InlineStack,
  BlockStack,
  DataTable,
  Badge,
  Select,
} from "@shopify/polaris";
import { useState } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "30";

  let shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        domain: session.shop,
        name: session.shop.replace('.myshopify.com', ''),
      }
    });
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // Get tracking analytics data
  const trackingLabels = await prisma.shippingLabel.findMany({
    where: {
      shopId: shop.id,
      trackingId: { not: null },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      trackingEvents: true
    }
  });

  // Calculate analytics
  const analytics = {
    totalShipments: trackingLabels.length,
    statusBreakdown: {},
    courierPerformance: {},
    deliveryTimes: [],
    dailyShipments: {},
    exceptionRate: 0,
    onTimeDeliveryRate: 0
  };

  // Status breakdown
  trackingLabels.forEach(label => {
    analytics.statusBreakdown[label.status] = (analytics.statusBreakdown[label.status] || 0) + 1;
  });

  // Courier performance
  trackingLabels.forEach(label => {
    if (label.courierName) {
      if (!analytics.courierPerformance[label.courierName]) {
        analytics.courierPerformance[label.courierName] = {
          total: 0,
          delivered: 0,
          exceptions: 0,
          avgDeliveryTime: 0
        };
      }
      analytics.courierPerformance[label.courierName].total++;
      if (label.status === 'delivered') {
        analytics.courierPerformance[label.courierName].delivered++;
      }
      if (label.status === 'exception') {
        analytics.courierPerformance[label.courierName].exceptions++;
      }
    }
  });

  // Daily shipments
  trackingLabels.forEach(label => {
    const date = label.createdAt.toISOString().split('T')[0];
    analytics.dailyShipments[date] = (analytics.dailyShipments[date] || 0) + 1;
  });

  // Calculate delivery times and rates
  const deliveredLabels = trackingLabels.filter(label => label.status === 'delivered');
  const exceptionLabels = trackingLabels.filter(label => label.status === 'exception');

  analytics.exceptionRate = trackingLabels.length > 0 
    ? ((exceptionLabels.length / trackingLabels.length) * 100).toFixed(1)
    : 0;

  analytics.onTimeDeliveryRate = trackingLabels.length > 0 
    ? ((deliveredLabels.length / trackingLabels.length) * 100).toFixed(1)
    : 0;

  // Calculate average delivery times
  deliveredLabels.forEach(label => {
    const deliveredEvent = label.trackingEvents.find(event => event.eventType === 'delivered');
    if (deliveredEvent) {
      const deliveryTime = Math.ceil((new Date(deliveredEvent.createdAt) - new Date(label.createdAt)) / (1000 * 60 * 60 * 24));
      analytics.deliveryTimes.push(deliveryTime);
    }
  });

  const avgDeliveryTime = analytics.deliveryTimes.length > 0 
    ? (analytics.deliveryTimes.reduce((a, b) => a + b, 0) / analytics.deliveryTimes.length).toFixed(1)
    : 0;

  // Update courier performance with average delivery times
  Object.keys(analytics.courierPerformance).forEach(courier => {
    const courierLabels = deliveredLabels.filter(label => label.courierName === courier);
    const courierDeliveryTimes = [];
    
    courierLabels.forEach(label => {
      const deliveredEvent = label.trackingEvents.find(event => event.eventType === 'delivered');
      if (deliveredEvent) {
        const deliveryTime = Math.ceil((new Date(deliveredEvent.createdAt) - new Date(label.createdAt)) / (1000 * 60 * 60 * 24));
        courierDeliveryTimes.push(deliveryTime);
      }
    });
    
    analytics.courierPerformance[courier].avgDeliveryTime = courierDeliveryTimes.length > 0 
      ? (courierDeliveryTimes.reduce((a, b) => a + b, 0) / courierDeliveryTimes.length).toFixed(1)
      : 0;
  });

  return json({
    analytics: {
      ...analytics,
      avgDeliveryTime
    },
    period,
    shop
  });
};

export default function TrackingAnalytics() {
  const { analytics, period, shop } = useLoaderData();
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  const periodOptions = [
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
    { label: "Last 90 days", value: "90" },
    { label: "Last 365 days", value: "365" }
  ];

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    window.location.href = `/app/tracking/analytics?period=${newPeriod}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      created: { status: 'info', children: 'Created' },
      printed: { status: 'attention', children: 'Printed' },
      shipped: { status: 'warning', children: 'Shipped' },
      in_transit: { status: 'attention', children: 'In Transit' },
      out_for_delivery: { status: 'warning', children: 'Out for Delivery' },
      delivered: { status: 'success', children: 'Delivered' },
      exception: { status: 'critical', children: 'Exception' },
      returned: { status: 'critical', children: 'Returned' }
    };
    
    const config = statusConfig[status] || { status: 'info', children: status };
    return <Badge {...config} />;
  };

  // Prepare courier performance table data
  const courierRows = Object.entries(analytics.courierPerformance).map(([courier, data]) => [
    courier,
    data.total,
    data.delivered,
    data.exceptions,
    `${((data.delivered / data.total) * 100).toFixed(1)}%`,
    `${((data.exceptions / data.total) * 100).toFixed(1)}%`,
    `${data.avgDeliveryTime} days`
  ]);

  // Prepare status breakdown table data
  const statusRows = Object.entries(analytics.statusBreakdown).map(([status, count]) => [
    getStatusBadge(status),
    count,
    `${((count / analytics.totalShipments) * 100).toFixed(1)}%`
  ]);

  return (
    <Page
      title="Tracking Analytics"
      backAction={{ url: "/app/tracking" }}
      secondaryActions={[
        {
          content: 'Export Report',
          url: `/app/bulk/export?type=tracking&format=csv&period=${period}`
        }
      ]}
    >
      <Layout>
        {/* Period Selector */}
        <Layout.Section>
          <Card>
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">Analytics Overview</Text>
              <Select
                label="Time Period"
                options={periodOptions}
                value={selectedPeriod}
                onChange={handlePeriodChange}
              />
            </InlineStack>
          </Card>
        </Layout.Section>

        {/* Key Metrics */}
        <Layout.Section>
          <InlineStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Total Shipments</Text>
                <Text variant="heading2xl" as="p">{analytics.totalShipments}</Text>
                <Text variant="bodySm" as="p" tone="subdued">Last {period} days</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Delivery Rate</Text>
                <Text variant="heading2xl" as="p" tone="success">{analytics.onTimeDeliveryRate}%</Text>
                <Text variant="bodySm" as="p" tone="subdued">Successfully delivered</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Exception Rate</Text>
                <Text variant="heading2xl" as="p" tone="critical">{analytics.exceptionRate}%</Text>
                <Text variant="bodySm" as="p" tone="subdued">Delivery exceptions</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Avg Delivery Time</Text>
                <Text variant="heading2xl" as="p">{analytics.avgDeliveryTime}</Text>
                <Text variant="bodySm" as="p" tone="subdued">Days to deliver</Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Status Breakdown */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Status Breakdown</Text>
              
              {statusRows.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'numeric', 'text']}
                  headings={['Status', 'Count', 'Percentage']}
                  rows={statusRows}
                />
              ) : (
                <Text variant="bodyMd" as="p" tone="subdued">
                  No shipment data available for the selected period.
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Courier Performance */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Courier Performance</Text>
              
              {courierRows.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'numeric', 'numeric', 'numeric', 'text', 'text', 'text']}
                  headings={[
                    'Courier',
                    'Total Shipments',
                    'Delivered',
                    'Exceptions',
                    'Delivery Rate',
                    'Exception Rate',
                    'Avg Delivery Time'
                  ]}
                  rows={courierRows}
                />
              ) : (
                <Text variant="bodyMd" as="p" tone="subdued">
                  No courier data available for the selected period.
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Daily Shipments Chart */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Daily Shipments</Text>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {Object.entries(analytics.dailyShipments)
                  .sort(([a], [b]) => new Date(a) - new Date(b))
                  .map(([date, count]) => (
                    <div key={date} style={{
                      padding: '8px',
                      backgroundColor: '#f6f6f7',
                      borderRadius: '4px',
                      textAlign: 'center'
                    }}>
                      <Text variant="bodySm" as="p" fontWeight="semibold">
                        {count}
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        {new Date(date).toLocaleDateString('en-IN', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </div>
                  ))}
              </div>
              
              {Object.keys(analytics.dailyShipments).length === 0 && (
                <Text variant="bodyMd" as="p" tone="subdued">
                  No daily shipment data available for the selected period.
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Insights and Recommendations */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">📊 Insights & Recommendations</Text>
              
              <BlockStack gap="300">
                {analytics.exceptionRate > 10 && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fef7f0', 
                    borderLeft: '4px solid #d72c0d',
                    borderRadius: '4px'
                  }}>
                    <Text variant="bodyMd" fontWeight="semibold" as="p">
                      ⚠️ High Exception Rate
                    </Text>
                    <Text variant="bodyMd" as="p">
                      Your exception rate is {analytics.exceptionRate}%, which is above the recommended 5%. 
                      Consider reviewing courier performance and addressing common delivery issues.
                    </Text>
                  </div>
                )}
                
                {analytics.avgDeliveryTime > 5 && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fff4e6', 
                    borderLeft: '4px solid #ff8c00',
                    borderRadius: '4px'
                  }}>
                    <Text variant="bodyMd" fontWeight="semibold" as="p">
                      🚚 Slow Delivery Times
                    </Text>
                    <Text variant="bodyMd" as="p">
                      Average delivery time is {analytics.avgDeliveryTime} days. 
                      Consider switching to faster courier services or optimizing your shipping process.
                    </Text>
                  </div>
                )}
                
                {analytics.onTimeDeliveryRate > 90 && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f0f9ff', 
                    borderLeft: '4px solid #008060',
                    borderRadius: '4px'
                  }}>
                    <Text variant="bodyMd" fontWeight="semibold" as="p">
                      ✅ Excellent Performance
                    </Text>
                    <Text variant="bodyMd" as="p">
                      Great job! Your delivery rate is {analytics.onTimeDeliveryRate}%, 
                      which exceeds industry standards. Keep up the excellent work!
                    </Text>
                  </div>
                )}
                
                {analytics.totalShipments === 0 && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f6f6f7', 
                    borderLeft: '4px solid #6d7175',
                    borderRadius: '4px'
                  }}>
                    <Text variant="bodyMd" fontWeight="semibold" as="p">
                      📦 No Shipments
                    </Text>
                    <Text variant="bodyMd" as="p">
                      No shipments found for the selected period. 
                      Start creating shipping labels to see analytics here.
                    </Text>
                  </div>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}