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
  Divider,
} from "@shopify/polaris";
import { useState } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  return json({ shop });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  try {
    const notificationSettings = {
      // Email Settings
      emailNotifications: formData.get("emailNotifications") === "true",
      notificationEmail: formData.get("notificationEmail"),
      emailFromName: formData.get("emailFromName"),
      emailFromAddress: formData.get("emailFromAddress"),
      
      // Customer Notifications
      notifyInvoiceCreated: formData.get("notifyInvoiceCreated") === "true",
      notifyInvoicePaid: formData.get("notifyInvoicePaid") === "true",
      notifyLabelCreated: formData.get("notifyLabelCreated") === "true",
      notifyShipmentDispatched: formData.get("notifyShipmentDispatched") === "true",
      notifyShipmentDelivered: formData.get("notifyShipmentDelivered") === "true",
      notifyShipmentException: formData.get("notifyShipmentException") === "true",
      
      // Admin Notifications
      notifyAdminNewOrder: formData.get("notifyAdminNewOrder") === "true",
      notifyAdminPaymentReceived: formData.get("notifyAdminPaymentReceived") === "true",
      notifyAdminShipmentException: formData.get("notifyAdminShipmentException") === "true",
      notifyAdminLowStock: formData.get("notifyAdminLowStock") === "true",
      
      // SMS Settings
      smsNotifications: formData.get("smsNotifications") === "true",
      smsProvider: formData.get("smsProvider"),
      smsApiKey: formData.get("smsApiKey"),
      
      // Customer SMS Notifications
      smsInvoiceCreated: formData.get("smsInvoiceCreated") === "true",
      smsShipmentDispatched: formData.get("smsShipmentDispatched") === "true",
      smsShipmentDelivered: formData.get("smsShipmentDelivered") === "true",
      
      // Webhook Settings
      webhookNotifications: formData.get("webhookNotifications") === "true",
      webhookUrl: formData.get("webhookUrl"),
      webhookSecret: formData.get("webhookSecret"),
      
      // Notification Frequency
      notificationFrequency: formData.get("notificationFrequency"),
      quietHoursStart: formData.get("quietHoursStart"),
      quietHoursEnd: formData.get("quietHoursEnd")
    };

    // Validate email settings if enabled
    if (notificationSettings.emailNotifications) {
      if (!notificationSettings.notificationEmail) {
        return json({ 
          error: "Notification email is required when email notifications are enabled",
          formData: notificationSettings
        }, { status: 400 });
      }
    }

    // Validate SMS settings if enabled
    if (notificationSettings.smsNotifications) {
      if (!notificationSettings.smsProvider || !notificationSettings.smsApiKey) {
        return json({ 
          error: "SMS provider and API key are required when SMS notifications are enabled",
          formData: notificationSettings
        }, { status: 400 });
      }
    }

    // Update shop with notification settings
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        emailNotifications: notificationSettings.emailNotifications,
        notificationEmail: notificationSettings.notificationEmail,
        emailFromName: notificationSettings.emailFromName,
        emailFromAddress: notificationSettings.emailFromAddress,
        notifyInvoiceCreated: notificationSettings.notifyInvoiceCreated,
        notifyInvoicePaid: notificationSettings.notifyInvoicePaid,
        notifyLabelCreated: notificationSettings.notifyLabelCreated,
        notifyShipmentDispatched: notificationSettings.notifyShipmentDispatched,
        notifyShipmentDelivered: notificationSettings.notifyShipmentDelivered,
        notifyShipmentException: notificationSettings.notifyShipmentException,
        notifyAdminNewOrder: notificationSettings.notifyAdminNewOrder,
        notifyAdminPaymentReceived: notificationSettings.notifyAdminPaymentReceived,
        notifyAdminShipmentException: notificationSettings.notifyAdminShipmentException,
        notifyAdminLowStock: notificationSettings.notifyAdminLowStock,
        smsNotifications: notificationSettings.smsNotifications,
        smsProvider: notificationSettings.smsProvider,
        smsApiKey: notificationSettings.smsApiKey,
        smsInvoiceCreated: notificationSettings.smsInvoiceCreated,
        smsShipmentDispatched: notificationSettings.smsShipmentDispatched,
        smsShipmentDelivered: notificationSettings.smsShipmentDelivered,
        webhookNotifications: notificationSettings.webhookNotifications,
        webhookUrl: notificationSettings.webhookUrl,
        webhookSecret: notificationSettings.webhookSecret,
        notificationFrequency: notificationSettings.notificationFrequency,
        quietHoursStart: notificationSettings.quietHoursStart,
        quietHoursEnd: notificationSettings.quietHoursEnd
      }
    });

    return json({ 
      success: true,
      message: "Notification settings updated successfully!"
    });

  } catch (error) {
    console.error("Error updating notification settings:", error);
    return json({ 
      error: "Failed to update notification settings. Please try again.",
      formData: Object.fromEntries(formData)
    }, { status: 500 });
  }
};

export default function NotificationSettings() {
  const { shop } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Form state - initialize with existing shop data
  const [emailNotifications, setEmailNotifications] = useState(actionData?.formData?.emailNotifications || shop.emailNotifications || false);
  const [notificationEmail, setNotificationEmail] = useState(actionData?.formData?.notificationEmail || shop.notificationEmail || shop.email || "");
  const [emailFromName, setEmailFromName] = useState(actionData?.formData?.emailFromName || shop.emailFromName || shop.companyName || "");
  const [emailFromAddress, setEmailFromAddress] = useState(actionData?.formData?.emailFromAddress || shop.emailFromAddress || "");
  
  // Customer Email Notifications
  const [notifyInvoiceCreated, setNotifyInvoiceCreated] = useState(actionData?.formData?.notifyInvoiceCreated || shop.notifyInvoiceCreated || true);
  const [notifyInvoicePaid, setNotifyInvoicePaid] = useState(actionData?.formData?.notifyInvoicePaid || shop.notifyInvoicePaid || true);
  const [notifyLabelCreated, setNotifyLabelCreated] = useState(actionData?.formData?.notifyLabelCreated || shop.notifyLabelCreated || false);
  const [notifyShipmentDispatched, setNotifyShipmentDispatched] = useState(actionData?.formData?.notifyShipmentDispatched || shop.notifyShipmentDispatched || true);
  const [notifyShipmentDelivered, setNotifyShipmentDelivered] = useState(actionData?.formData?.notifyShipmentDelivered || shop.notifyShipmentDelivered || true);
  const [notifyShipmentException, setNotifyShipmentException] = useState(actionData?.formData?.notifyShipmentException || shop.notifyShipmentException || true);
  
  // Admin Notifications
  const [notifyAdminNewOrder, setNotifyAdminNewOrder] = useState(actionData?.formData?.notifyAdminNewOrder || shop.notifyAdminNewOrder || true);
  const [notifyAdminPaymentReceived, setNotifyAdminPaymentReceived] = useState(actionData?.formData?.notifyAdminPaymentReceived || shop.notifyAdminPaymentReceived || true);
  const [notifyAdminShipmentException, setNotifyAdminShipmentException] = useState(actionData?.formData?.notifyAdminShipmentException || shop.notifyAdminShipmentException || true);
  const [notifyAdminLowStock, setNotifyAdminLowStock] = useState(actionData?.formData?.notifyAdminLowStock || shop.notifyAdminLowStock || false);
  
  // SMS Settings
  const [smsNotifications, setSmsNotifications] = useState(actionData?.formData?.smsNotifications || shop.smsNotifications || false);
  const [smsProvider, setSmsProvider] = useState(actionData?.formData?.smsProvider || shop.smsProvider || "");
  const [smsApiKey, setSmsApiKey] = useState(actionData?.formData?.smsApiKey || shop.smsApiKey || "");
  const [smsInvoiceCreated, setSmsInvoiceCreated] = useState(actionData?.formData?.smsInvoiceCreated || shop.smsInvoiceCreated || false);
  const [smsShipmentDispatched, setSmsShipmentDispatched] = useState(actionData?.formData?.smsShipmentDispatched || shop.smsShipmentDispatched || true);
  const [smsShipmentDelivered, setSmsShipmentDelivered] = useState(actionData?.formData?.smsShipmentDelivered || shop.smsShipmentDelivered || true);
  
  // Webhook Settings
  const [webhookNotifications, setWebhookNotifications] = useState(actionData?.formData?.webhookNotifications || shop.webhookNotifications || false);
  const [webhookUrl, setWebhookUrl] = useState(actionData?.formData?.webhookUrl || shop.webhookUrl || "");
  const [webhookSecret, setWebhookSecret] = useState(actionData?.formData?.webhookSecret || shop.webhookSecret || "");
  
  // Other Settings
  const [notificationFrequency, setNotificationFrequency] = useState(actionData?.formData?.notificationFrequency || shop.notificationFrequency || "immediate");
  const [quietHoursStart, setQuietHoursStart] = useState(actionData?.formData?.quietHoursStart || shop.quietHoursStart || "22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState(actionData?.formData?.quietHoursEnd || shop.quietHoursEnd || "08:00");

  const smsProviderOptions = [
    { label: "Select SMS provider", value: "" },
    { label: "Twilio", value: "twilio" },
    { label: "MSG91", value: "msg91" },
    { label: "TextLocal", value: "textlocal" },
    { label: "AWS SNS", value: "aws_sns" }
  ];

  const frequencyOptions = [
    { label: "Immediate", value: "immediate" },
    { label: "Hourly Digest", value: "hourly" },
    { label: "Daily Digest", value: "daily" },
    { label: "Weekly Digest", value: "weekly" }
  ];

  return (
    <Page
      title="Notification Settings"
      backAction={{ url: "/app/settings" }}
      primaryAction={{
        content: "Save Settings",
        loading: isSubmitting,
        onAction: () => {
          document.getElementById("notification-settings-form").requestSubmit();
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

        {actionData?.success && (
          <Layout.Section>
            <Banner status="success">
              <p>{actionData.message}</p>
            </Banner>
          </Layout.Section>
        )}

        <Form method="post" id="notification-settings-form">
          <input type="hidden" name="emailNotifications" value={emailNotifications} />
          <input type="hidden" name="notifyInvoiceCreated" value={notifyInvoiceCreated} />
          <input type="hidden" name="notifyInvoicePaid" value={notifyInvoicePaid} />
          <input type="hidden" name="notifyLabelCreated" value={notifyLabelCreated} />
          <input type="hidden" name="notifyShipmentDispatched" value={notifyShipmentDispatched} />
          <input type="hidden" name="notifyShipmentDelivered" value={notifyShipmentDelivered} />
          <input type="hidden" name="notifyShipmentException" value={notifyShipmentException} />
          <input type="hidden" name="notifyAdminNewOrder" value={notifyAdminNewOrder} />
          <input type="hidden" name="notifyAdminPaymentReceived" value={notifyAdminPaymentReceived} />
          <input type="hidden" name="notifyAdminShipmentException" value={notifyAdminShipmentException} />
          <input type="hidden" name="notifyAdminLowStock" value={notifyAdminLowStock} />
          <input type="hidden" name="smsNotifications" value={smsNotifications} />
          <input type="hidden" name="smsInvoiceCreated" value={smsInvoiceCreated} />
          <input type="hidden" name="smsShipmentDispatched" value={smsShipmentDispatched} />
          <input type="hidden" name="smsShipmentDelivered" value={smsShipmentDelivered} />
          <input type="hidden" name="webhookNotifications" value={webhookNotifications} />

          {/* Email Settings */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Email Notifications</Text>
                
                <FormLayout>
                  <Checkbox
                    label="Enable email notifications"
                    checked={emailNotifications}
                    onChange={setEmailNotifications}
                    helpText="Send email notifications for various events"
                  />
                  
                  {emailNotifications && (
                    <>
                      <TextField
                        label="Notification Email"
                        name="notificationEmail"
                        type="email"
                        value={notificationEmail}
                        onChange={setNotificationEmail}
                        helpText="Email address to receive admin notifications"
                        required
                      />
                      
                      <FormLayout.Group>
                        <TextField
                          label="From Name"
                          name="emailFromName"
                          value={emailFromName}
                          onChange={setEmailFromName}
                          placeholder="Your Company Name"
                          helpText="Name shown in email sender field"
                        />
                        <TextField
                          label="From Email"
                          name="emailFromAddress"
                          type="email"
                          value={emailFromAddress}
                          onChange={setEmailFromAddress}
                          placeholder="noreply@yourstore.com"
                          helpText="Email address shown as sender"
                        />
                      </FormLayout.Group>
                    </>
                  )}
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Customer Email Notifications */}
          {emailNotifications && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Customer Email Notifications</Text>
                  
                  <FormLayout>
                    <BlockStack gap="300">
                      <Text variant="headingSm" as="h3">Send emails to customers when:</Text>
                      
                      <Checkbox
                        label="Invoice is created"
                        checked={notifyInvoiceCreated}
                        onChange={setNotifyInvoiceCreated}
                        helpText="Send invoice PDF to customer email"
                      />
                      
                      <Checkbox
                        label="Invoice is paid"
                        checked={notifyInvoicePaid}
                        onChange={setNotifyInvoicePaid}
                        helpText="Send payment confirmation email"
                      />
                      
                      <Checkbox
                        label="Shipping label is created"
                        checked={notifyLabelCreated}
                        onChange={setNotifyLabelCreated}
                        helpText="Notify when shipping label is generated"
                      />
                      
                      <Checkbox
                        label="Shipment is dispatched"
                        checked={notifyShipmentDispatched}
                        onChange={setNotifyShipmentDispatched}
                        helpText="Send tracking information when shipped"
                      />
                      
                      <Checkbox
                        label="Shipment is delivered"
                        checked={notifyShipmentDelivered}
                        onChange={setNotifyShipmentDelivered}
                        helpText="Confirm delivery to customer"
                      />
                      
                      <Checkbox
                        label="Shipment has exception"
                        checked={notifyShipmentException}
                        onChange={setNotifyShipmentException}
                        helpText="Alert customer about delivery issues"
                      />
                    </BlockStack>
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {/* Admin Email Notifications */}
          {emailNotifications && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Admin Email Notifications</Text>
                  
                  <FormLayout>
                    <BlockStack gap="300">
                      <Text variant="headingSm" as="h3">Send admin emails when:</Text>
                      
                      <Checkbox
                        label="New order is received"
                        checked={notifyAdminNewOrder}
                        onChange={setNotifyAdminNewOrder}
                        helpText="Get notified of new orders"
                      />
                      
                      <Checkbox
                        label="Payment is received"
                        checked={notifyAdminPaymentReceived}
                        onChange={setNotifyAdminPaymentReceived}
                        helpText="Confirm payment receipts"
                      />
                      
                      <Checkbox
                        label="Shipment has exception"
                        checked={notifyAdminShipmentException}
                        onChange={setNotifyAdminShipmentException}
                        helpText="Alert about delivery issues"
                      />
                      
                      <Checkbox
                        label="Low stock alerts"
                        checked={notifyAdminLowStock}
                        onChange={setNotifyAdminLowStock}
                        helpText="Notify when inventory is low"
                      />
                    </BlockStack>
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {/* SMS Settings */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">SMS Notifications</Text>
                
                <FormLayout>
                  <Checkbox
                    label="Enable SMS notifications"
                    checked={smsNotifications}
                    onChange={setSmsNotifications}
                    helpText="Send SMS notifications to customers"
                  />
                  
                  {smsNotifications && (
                    <>
                      <FormLayout.Group>
                        <Select
                          label="SMS Provider"
                          name="smsProvider"
                          options={smsProviderOptions}
                          value={smsProvider}
                          onChange={setSmsProvider}
                          required
                        />
                        <TextField
                          label="API Key"
                          name="smsApiKey"
                          value={smsApiKey}
                          onChange={setSmsApiKey}
                          type="password"
                          helpText="Your SMS provider API key"
                          required
                        />
                      </FormLayout.Group>
                      
                      <Divider />
                      
                      <BlockStack gap="300">
                        <Text variant="headingSm" as="h3">Send SMS when:</Text>
                        
                        <Checkbox
                          label="Invoice is created"
                          checked={smsInvoiceCreated}
                          onChange={setSmsInvoiceCreated}
                          helpText="SMS with invoice details"
                        />
                        
                        <Checkbox
                          label="Shipment is dispatched"
                          checked={smsShipmentDispatched}
                          onChange={setSmsShipmentDispatched}
                          helpText="SMS with tracking information"
                        />
                        
                        <Checkbox
                          label="Shipment is delivered"
                          checked={smsShipmentDelivered}
                          onChange={setSmsShipmentDelivered}
                          helpText="Delivery confirmation SMS"
                        />
                      </BlockStack>
                    </>
                  )}
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Webhook Settings */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Webhook Notifications</Text>
                
                <FormLayout>
                  <Checkbox
                    label="Enable webhook notifications"
                    checked={webhookNotifications}
                    onChange={setWebhookNotifications}
                    helpText="Send HTTP POST requests to your endpoint"
                  />
                  
                  {webhookNotifications && (
                    <>
                      <TextField
                        label="Webhook URL"
                        name="webhookUrl"
                        type="url"
                        value={webhookUrl}
                        onChange={setWebhookUrl}
                        placeholder="https://your-app.com/webhooks/gst-invoice"
                        helpText="URL to receive webhook notifications"
                        required
                      />
                      
                      <TextField
                        label="Webhook Secret"
                        name="webhookSecret"
                        value={webhookSecret}
                        onChange={setWebhookSecret}
                        type="password"
                        helpText="Secret key for webhook verification"
                      />
                    </>
                  )}
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Notification Preferences */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Notification Preferences</Text>
                
                <FormLayout>
                  <Select
                    label="Notification Frequency"
                    name="notificationFrequency"
                    options={frequencyOptions}
                    value={notificationFrequency}
                    onChange={setNotificationFrequency}
                    helpText="How often to send notifications"
                  />
                  
                  <FormLayout.Group>
                    <TextField
                      label="Quiet Hours Start"
                      name="quietHoursStart"
                      type="time"
                      value={quietHoursStart}
                      onChange={setQuietHoursStart}
                      helpText="Don't send notifications after this time"
                    />
                    <TextField
                      label="Quiet Hours End"
                      name="quietHoursEnd"
                      type="time"
                      value={quietHoursEnd}
                      onChange={setQuietHoursEnd}
                      helpText="Resume notifications after this time"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Form>

        {/* Test Notifications */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Test Notifications</Text>
              
              <Text variant="bodyMd" as="p">
                Send test notifications to verify your settings are working correctly.
              </Text>
              
              <InlineStack gap="300">
                <Button 
                  disabled={!emailNotifications}
                  url="/app/settings/notifications/test-email"
                >
                  Send Test Email
                </Button>
                <Button 
                  disabled={!smsNotifications}
                  url="/app/settings/notifications/test-sms"
                >
                  Send Test SMS
                </Button>
                <Button 
                  disabled={!webhookNotifications}
                  url="/app/settings/notifications/test-webhook"
                >
                  Send Test Webhook
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}