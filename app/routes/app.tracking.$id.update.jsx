import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  Text,
  Banner,
  Checkbox,
} from "@shopify/polaris";
import { useState } from "react";

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
      trackingEvents: {
        orderBy: { createdAt: 'desc' },
        take: 5
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

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

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
    }
  });

  if (!trackingLabel) {
    throw new Error("Tracking record not found");
  }

  try {
    const updateData = {
      eventType: formData.get("eventType"),
      description: formData.get("description"),
      location: formData.get("location"),
      notifyCustomer: formData.get("notifyCustomer") === "true"
    };

    // Validate required fields
    if (!updateData.eventType) {
      return json({ 
        error: "Please select an event type" 
      }, { status: 400 });
    }

    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        shippingLabelId: trackingLabel.id,
        eventType: updateData.eventType,
        description: updateData.description,
        location: updateData.location,
        createdAt: new Date()
      }
    });

    // Update label status based on event type
    const statusMapping = {
      'shipped': 'shipped',
      'in_transit': 'in_transit',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'exception': 'exception',
      'returned': 'returned',
      'attempted_delivery': 'in_transit'
    };

    const newStatus = statusMapping[updateData.eventType];
    if (newStatus) {
      await prisma.shippingLabel.update({
        where: { id: trackingLabel.id },
        data: { status: newStatus }
      });
    }

    // TODO: Send customer notification if requested
    if (updateData.notifyCustomer && trackingLabel.customer?.email) {
      // Implement email notification logic here
      console.log(`Would notify customer ${trackingLabel.customer.email} about tracking update`);
    }

    return redirect(`/app/tracking/${trackingLabel.id}`);

  } catch (error) {
    console.error("Error updating tracking:", error);
    return json({ 
      error: "Failed to update tracking. Please try again." 
    }, { status: 500 });
  }
};

export default function TrackingUpdate() {
  const { trackingLabel, shop } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  const eventTypeOptions = [
    { label: "Select event type", value: "" },
    { label: "📦 Shipped", value: "shipped" },
    { label: "🚛 In Transit", value: "in_transit" },
    { label: "🚐 Out for Delivery", value: "out_for_delivery" },
    { label: "✅ Delivered", value: "delivered" },
    { label: "🔄 Attempted Delivery", value: "attempted_delivery" },
    { label: "⚠️ Exception", value: "exception" },
    { label: "↩️ Returned", value: "returned" }
  ];

  const getEventDescription = (type) => {
    const descriptions = {
      'shipped': 'Package has been shipped from the origin facility',
      'in_transit': 'Package is in transit to the destination',
      'out_for_delivery': 'Package is out for delivery',
      'delivered': 'Package has been delivered successfully',
      'attempted_delivery': 'Delivery was attempted but unsuccessful',
      'exception': 'An exception occurred during delivery',
      'returned': 'Package is being returned to sender'
    };
    return descriptions[type] || '';
  };

  const handleEventTypeChange = (value) => {
    setEventType(value);
    setDescription(getEventDescription(value));
  };

  return (
    <Page
      title={`Update Tracking: ${trackingLabel.trackingId}`}
      backAction={{ url: `/app/tracking/${trackingLabel.id}` }}
      primaryAction={{
        content: "Add Tracking Event",
        loading: isSubmitting,
        onAction: () => {
          document.getElementById("tracking-update-form").requestSubmit();
        }
      }}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner status="critical">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Current Status */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Current Status</Text>
              
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p">
                  <strong>Tracking ID:</strong> {trackingLabel.trackingId}
                </Text>
                <Text variant="bodyMd" as="p">
                  <strong>Current Status:</strong> {trackingLabel.status.replace('_', ' ').toUpperCase()}
                </Text>
                <Text variant="bodyMd" as="p">
                  <strong>Recipient:</strong> {trackingLabel.recipientName}
                </Text>
                <Text variant="bodyMd" as="p">
                  <strong>Destination:</strong> {trackingLabel.shippingCity}, {trackingLabel.shippingState}
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Update Form */}
        <Form method="post" id="tracking-update-form">
          <input type="hidden" name="notifyCustomer" value={notifyCustomer} />
          
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Add Tracking Event</Text>
                
                <FormLayout>
                  <Select
                    label="Event Type"
                    name="eventType"
                    options={eventTypeOptions}
                    value={eventType}
                    onChange={handleEventTypeChange}
                    required
                  />
                  
                  <TextField
                    label="Description"
                    name="description"
                    value={description}
                    onChange={setDescription}
                    multiline={3}
                    helpText="Describe what happened with this shipment"
                  />
                  
                  <TextField
                    label="Location (Optional)"
                    name="location"
                    value={location}
                    onChange={setLocation}
                    placeholder="e.g., Mumbai Sorting Facility, Delhi Hub"
                    helpText="Current location of the package"
                  />
                  
                  <Checkbox
                    label="Notify customer via email"
                    checked={notifyCustomer}
                    onChange={setNotifyCustomer}
                    helpText={
                      trackingLabel.customer?.email 
                        ? `Send notification to ${trackingLabel.customer.email}`
                        : "No customer email available"
                    }
                    disabled={!trackingLabel.customer?.email}
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Form>

        {/* Recent Events */}
        {trackingLabel.trackingEvents.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Recent Tracking Events</Text>
                
                <BlockStack gap="300">
                  {trackingLabel.trackingEvents.map((event) => (
                    <Card key={event.id} sectioned>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" fontWeight="semibold" as="p">
                          {event.eventType.replace('_', ' ').toUpperCase()}
                        </Text>
                        {event.description && (
                          <Text variant="bodyMd" as="p">
                            {event.description}
                          </Text>
                        )}
                        {event.location && (
                          <Text variant="bodySm" as="p" tone="subdued">
                            Location: {event.location}
                          </Text>
                        )}
                        <Text variant="bodySm" as="p" tone="subdued">
                          {new Date(event.createdAt).toLocaleString('en-IN')}
                        </Text>
                      </BlockStack>
                    </Card>
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
              
              <BlockStack gap="300">
                <Text variant="bodyMd" as="p">
                  Common tracking updates for this shipment:
                </Text>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <Button 
                    onClick={() => {
                      setEventType('shipped');
                      setDescription('Package has been shipped from the origin facility');
                    }}
                  >
                    Mark as Shipped
                  </Button>
                  <Button 
                    onClick={() => {
                      setEventType('in_transit');
                      setDescription('Package is in transit to the destination');
                    }}
                  >
                    Mark in Transit
                  </Button>
                  <Button 
                    onClick={() => {
                      setEventType('out_for_delivery');
                      setDescription('Package is out for delivery');
                    }}
                  >
                    Out for Delivery
                  </Button>
                  <Button 
                    onClick={() => {
                      setEventType('delivered');
                      setDescription('Package has been delivered successfully');
                    }}
                  >
                    Mark as Delivered
                  </Button>
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}