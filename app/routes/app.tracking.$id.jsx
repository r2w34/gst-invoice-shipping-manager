import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Badge,
  Text,
  InlineStack,
  BlockStack,
  Divider,
  Timeline,
  EmptyState,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  const trackingLabel = await prisma.shippingLabel.findFirst({
    where: { 
      id: params.id,
      shopId: shop.id 
    },
    include: {
      customer: true,
      order: true,
      trackingEvents: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!trackingLabel) {
    throw new Error("Tracking record not found");
  }

  return json({
    trackingLabel,
    shop
  });
};

export default function TrackingDetail() {
  const { trackingLabel, shop } = useLoaderData();

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
      'shipped': 'Package shipped from origin',
      'in_transit': 'Package in transit',
      'out_for_delivery': 'Out for delivery',
      'delivered': 'Package delivered successfully',
      'exception': 'Delivery exception occurred',
      'returned': 'Package returned to sender',
      'attempted_delivery': 'Delivery attempted'
    };
    
    return descriptions[event.eventType] || event.description || 'Tracking update';
  };

  const getDaysInTransit = () => {
    const created = new Date(trackingLabel.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getEstimatedDelivery = () => {
    // Simple estimation based on courier and distance
    const created = new Date(trackingLabel.createdAt);
    const estimatedDays = trackingLabel.courierName === 'indiapost' ? 7 : 3;
    const estimated = new Date(created);
    estimated.setDate(estimated.getDate() + estimatedDays);
    return estimated;
  };

  const timelineItems = trackingLabel.trackingEvents.map((event, index) => ({
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
    <Page
      title={`Tracking: ${trackingLabel.trackingId}`}
      backAction={{ url: "/app/tracking" }}
      primaryAction={{
        content: 'Update Status',
        url: `/app/tracking/${trackingLabel.id}/update`
      }}
      secondaryActions={[
        {
          content: 'View Label',
          url: `/app/labels/${trackingLabel.id}`
        },
        {
          content: 'Print Label',
          url: `/app/labels/${trackingLabel.id}/print`
        },
        {
          content: 'Customer Portal Link',
          url: `/track/${trackingLabel.trackingId}`,
          external: true
        }
      ]}
    >
      <Layout>
        {/* Tracking Overview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">Shipment Overview</Text>
                {getStatusBadge(trackingLabel.status)}
              </InlineStack>
              
              <InlineStack gap="600">
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Tracking Details</Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Tracking ID:</strong> {trackingLabel.trackingId}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Label Number:</strong> {trackingLabel.labelNumber}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Courier:</strong> {trackingLabel.courierName || 'Not assigned'}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Days in Transit:</strong> {getDaysInTransit()} days
                  </Text>
                </BlockStack>
                
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Recipient Information</Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Name:</strong> {trackingLabel.recipientName}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Phone:</strong> {trackingLabel.recipientPhone || 'Not provided'}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Address:</strong><br />
                    {trackingLabel.shippingAddress1}<br />
                    {trackingLabel.shippingAddress2 && <>{trackingLabel.shippingAddress2}<br /></>}
                    {trackingLabel.shippingCity}, {trackingLabel.shippingState} {trackingLabel.shippingPincode}
                  </Text>
                </BlockStack>
                
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Delivery Information</Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Current Status:</strong> {trackingLabel.status.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Estimated Delivery:</strong> {getEstimatedDelivery().toLocaleDateString('en-IN')}
                  </Text>
                  {trackingLabel.status === 'delivered' && trackingLabel.trackingEvents.length > 0 && (
                    <Text variant="bodyMd" as="p">
                      <strong>Delivered On:</strong> {new Date(trackingLabel.trackingEvents[0].createdAt).toLocaleDateString('en-IN')}
                    </Text>
                  )}
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Customer Information */}
        {trackingLabel.customer && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Customer Information</Text>
                
                <InlineStack gap="600">
                  <BlockStack gap="200">
                    <Text variant="bodyMd" as="p">
                      <strong>Customer:</strong> {`${trackingLabel.customer.firstName || ''} ${trackingLabel.customer.lastName || ''}`.trim()}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      <strong>Email:</strong> {trackingLabel.customer.email || 'Not provided'}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      <strong>GSTIN:</strong> {trackingLabel.customer.gstin || 'Not provided'}
                    </Text>
                  </BlockStack>
                  
                  <InlineStack gap="200">
                    <Button url={`/app/customers/${trackingLabel.customer.id}`}>
                      View Customer
                    </Button>
                    {trackingLabel.order && (
                      <Button url={`/app/orders/${trackingLabel.order.id}`}>
                        View Order
                      </Button>
                    )}
                  </InlineStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Tracking Timeline */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Tracking Timeline</Text>
              
              {timelineItems.length > 0 ? (
                <Timeline items={timelineItems} />
              ) : (
                <EmptyState
                  heading="No tracking events yet"
                  action={{
                    content: 'Add Tracking Event',
                    url: `/app/tracking/${trackingLabel.id}/update`
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Tracking events will appear here as the package moves through the delivery process.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Package Details */}
        {trackingLabel.includeProducts && trackingLabel.productDetails && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Package Contents</Text>
                
                <BlockStack gap="200">
                  {JSON.parse(trackingLabel.productDetails).map((product, index) => (
                    <InlineStack key={index} align="space-between">
                      <Text variant="bodyMd" as="p">{product.name}</Text>
                      <Text variant="bodyMd" as="p">Qty: {product.quantity}</Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Quick Actions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Quick Actions</Text>
              
              <InlineStack gap="300">
                <Button variant="primary" url={`/app/tracking/${trackingLabel.id}/update`}>
                  Update Status
                </Button>
                <Button url={`/app/tracking/${trackingLabel.id}/notify`}>
                  Notify Customer
                </Button>
                <Button url={`/track/${trackingLabel.trackingId}`} external>
                  Customer Tracking Page
                </Button>
                <Button url={`/app/labels/${trackingLabel.id}/print`}>
                  Reprint Label
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}