import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Badge,
  Text,
  InlineStack,
  BlockStack,
  Timeline,
  EmptyState,
  Button,
} from "@shopify/polaris";

import { prisma } from "../shopify.server.js";

export const loader = async ({ params }) => {
  const trackingId = params.trackingId;

  if (!trackingId) {
    throw new Error("Tracking ID is required");
  }

  // Find the shipping label by tracking ID
  const trackingLabel = await prisma.shippingLabel.findFirst({
    where: { trackingId: trackingId },
    include: {
      shop: {
        select: {
          name: true,
          companyName: true,
          domain: true
        }
      },
      trackingEvents: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!trackingLabel) {
    return json({ 
      error: "Tracking ID not found",
      trackingId 
    }, { status: 404 });
  }

  // Don't expose sensitive customer information
  const publicTrackingData = {
    trackingId: trackingLabel.trackingId,
    labelNumber: trackingLabel.labelNumber,
    status: trackingLabel.status,
    recipientName: trackingLabel.recipientName,
    shippingCity: trackingLabel.shippingCity,
    shippingState: trackingLabel.shippingState,
    shippingPincode: trackingLabel.shippingPincode,
    courierName: trackingLabel.courierName,
    createdAt: trackingLabel.createdAt,
    trackingEvents: trackingLabel.trackingEvents,
    shop: trackingLabel.shop
  };

  return json({ trackingData: publicTrackingData });
};

export default function PublicTracking() {
  const data = useLoaderData();

  // Handle tracking not found
  if (data.error) {
    return (
      <Page title="Package Tracking">
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Tracking ID not found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  We couldn't find any shipment with tracking ID: <strong>{data.trackingId}</strong>
                </p>
                <p>Please check your tracking ID and try again.</p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const { trackingData } = data;

  const getStatusBadge = (status) => {
    const statusConfig = {
      created: { status: 'info', children: 'Label Created' },
      printed: { status: 'attention', children: 'Label Printed' },
      shipped: { status: 'warning', children: 'Shipped' },
      in_transit: { status: 'attention', children: 'In Transit' },
      out_for_delivery: { status: 'warning', children: 'Out for Delivery' },
      delivered: { status: 'success', children: 'Delivered' },
      exception: { status: 'critical', children: 'Delivery Exception' },
      returned: { status: 'critical', children: 'Returned to Sender' }
    };
    
    const config = statusConfig[status] || { status: 'info', children: status };
    return <Badge {...config} />;
  };

  const getEventIcon = (eventType) => {
    const icons = {
      'label_created': '📋',
      'shipped': '🚚',
      'in_transit': '🚛',
      'out_for_delivery': '🚐',
      'delivered': '✅',
      'exception': '⚠️',
      'returned': '↩️',
      'attempted_delivery': '🔄'
    };
    return icons[eventType] || '📦';
  };

  const formatEventDescription = (event) => {
    const descriptions = {
      'label_created': 'Shipping label created',
      'shipped': 'Package shipped',
      'in_transit': 'Package in transit',
      'out_for_delivery': 'Out for delivery',
      'delivered': 'Package delivered',
      'exception': 'Delivery exception',
      'returned': 'Package returned',
      'attempted_delivery': 'Delivery attempted'
    };
    
    return descriptions[event.eventType] || event.description || 'Tracking update';
  };

  const getProgressPercentage = (status) => {
    const progressMap = {
      'created': 10,
      'printed': 20,
      'shipped': 40,
      'in_transit': 60,
      'out_for_delivery': 80,
      'delivered': 100,
      'exception': 50,
      'returned': 30
    };
    return progressMap[status] || 0;
  };

  const getDaysInTransit = () => {
    const created = new Date(trackingData.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const timelineItems = trackingData.trackingEvents.map((event) => ({
    id: event.id,
    children: (
      <BlockStack gap="200">
        <InlineStack gap="200" align="center">
          <Text variant="bodyMd" fontWeight="semibold" as="span">
            {getEventIcon(event.eventType)} {formatEventDescription(event)}
          </Text>
          {event.location && (
            <Badge tone="info">{event.location}</Badge>
          )}
        </InlineStack>
        {event.description && event.description !== formatEventDescription(event) && (
          <Text variant="bodySm" as="p" tone="subdued">
            {event.description}
          </Text>
        )}
        <Text variant="bodySm" as="p" tone="subdued">
          {new Date(event.createdAt).toLocaleString('en-IN')}
        </Text>
      </BlockStack>
    )
  }));

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f6f6f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e1e3e5',
        padding: '16px 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <InlineStack align="space-between">
            <Text variant="headingLg" as="h1">
              📦 Package Tracking
            </Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              {trackingData.shop.companyName || trackingData.shop.name}
            </Text>
          </InlineStack>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        <Layout>
          {/* Tracking Overview */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h2">Tracking ID: {trackingData.trackingId}</Text>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Label: {trackingData.labelNumber}
                    </Text>
                  </BlockStack>
                  {getStatusBadge(trackingData.status)}
                </InlineStack>
                
                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e1e3e5',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${getProgressPercentage(trackingData.status)}%`,
                    height: '100%',
                    backgroundColor: trackingData.status === 'delivered' ? '#008060' : 
                                   trackingData.status === 'exception' ? '#d72c0d' : '#2271b1',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                
                <InlineStack gap="600">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">Delivery Information</Text>
                    <Text variant="bodyMd" as="p">
                      <strong>Recipient:</strong> {trackingData.recipientName}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      <strong>Destination:</strong> {trackingData.shippingCity}, {trackingData.shippingState} {trackingData.shippingPincode}
                    </Text>
                    {trackingData.courierName && (
                      <Text variant="bodyMd" as="p">
                        <strong>Courier:</strong> {trackingData.courierName}
                      </Text>
                    )}
                  </BlockStack>
                  
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">Shipment Details</Text>
                    <Text variant="bodyMd" as="p">
                      <strong>Status:</strong> {trackingData.status.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      <strong>Days in Transit:</strong> {getDaysInTransit()} days
                    </Text>
                    <Text variant="bodyMd" as="p">
                      <strong>Shipped Date:</strong> {new Date(trackingData.createdAt).toLocaleDateString('en-IN')}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Tracking Timeline */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">📍 Tracking History</Text>
                
                {timelineItems.length > 0 ? (
                  <Timeline items={timelineItems} />
                ) : (
                  <EmptyState
                    heading="No tracking updates yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Your package tracking information will appear here once it's processed by the courier.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Status Explanations */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">📋 Status Guide</Text>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '16px' 
                }}>
                  <BlockStack gap="100">
                    <Badge status="info">Label Created</Badge>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Shipping label has been created
                    </Text>
                  </BlockStack>
                  
                  <BlockStack gap="100">
                    <Badge status="warning">Shipped</Badge>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Package has left the origin facility
                    </Text>
                  </BlockStack>
                  
                  <BlockStack gap="100">
                    <Badge status="attention">In Transit</Badge>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Package is on its way to destination
                    </Text>
                  </BlockStack>
                  
                  <BlockStack gap="100">
                    <Badge status="warning">Out for Delivery</Badge>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Package is out for delivery today
                    </Text>
                  </BlockStack>
                  
                  <BlockStack gap="100">
                    <Badge status="success">Delivered</Badge>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Package has been delivered successfully
                    </Text>
                  </BlockStack>
                  
                  <BlockStack gap="100">
                    <Badge status="critical">Exception</Badge>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Delivery issue - contact courier
                    </Text>
                  </BlockStack>
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Contact Information */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">📞 Need Help?</Text>
                
                <BlockStack gap="300">
                  <Text variant="bodyMd" as="p">
                    If you have questions about your shipment, please contact:
                  </Text>
                  
                  <InlineStack gap="400">
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="semibold" as="p">Merchant</Text>
                      <Text variant="bodyMd" as="p">{trackingData.shop.companyName || trackingData.shop.name}</Text>
                    </BlockStack>
                    
                    {trackingData.courierName && (
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold" as="p">Courier</Text>
                        <Text variant="bodyMd" as="p">{trackingData.courierName}</Text>
                      </BlockStack>
                    )}
                  </InlineStack>
                  
                  <Text variant="bodySm" as="p" tone="subdued">
                    Please have your tracking ID ({trackingData.trackingId}) ready when contacting support.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e1e3e5',
        padding: '24px 0',
        marginTop: '40px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>
          <Text variant="bodySm" as="p" tone="subdued">
            Powered by {trackingData.shop.companyName || trackingData.shop.name} • 
            Last updated: {new Date().toLocaleString('en-IN')}
          </Text>
        </div>
      </div>
    </div>
  );
}