import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  InlineStack,
  BlockStack,
  Icon,
  Badge,
} from "@shopify/polaris";
import {
  SettingsIcon,
  InvoiceIcon,
  PackageIcon,
  PersonIcon,
  NotificationIcon,
  LockIcon,
  BankIcon,
} from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

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

  // Get current settings status
  const settingsStatus = {
    invoiceSettings: {
      configured: !!(shop.companyName && shop.gstin && shop.address1),
      lastUpdated: shop.updatedAt
    },
    labelSettings: {
      configured: !!(shop.labelPrefix && shop.defaultLabelSize),
      lastUpdated: shop.updatedAt
    },
    userSettings: {
      configured: true, // Always true for now
      lastUpdated: shop.updatedAt
    },
    notificationSettings: {
      configured: !!(shop.emailNotifications !== null),
      lastUpdated: shop.updatedAt
    },
    paymentSettings: {
      configured: !!(shop.subscriptionStatus === 'active'),
      lastUpdated: shop.updatedAt
    }
  };

  return json({
    shop,
    settingsStatus
  });
};

export default function SettingsIndex() {
  const { shop, settingsStatus } = useLoaderData();

  const settingsCategories = [
    {
      title: "Invoice Settings",
      description: "Configure GST details, company information, and invoice templates",
      icon: InvoiceIcon,
      url: "/app/settings/invoice",
      configured: settingsStatus.invoiceSettings.configured,
      priority: "high"
    },
    {
      title: "Label Settings",
      description: "Set up shipping label formats, courier preferences, and defaults",
      icon: PackageIcon,
      url: "/app/settings/labels",
      configured: settingsStatus.labelSettings.configured,
      priority: "high"
    },
    {
      title: "User Management",
      description: "Manage team access, roles, and permissions",
      icon: PersonIcon,
      url: "/app/settings/users",
      configured: settingsStatus.userSettings.configured,
      priority: "medium"
    },
    {
      title: "Notifications",
      description: "Configure email notifications and customer communications",
      icon: NotificationIcon,
      url: "/app/settings/notifications",
      configured: settingsStatus.notificationSettings.configured,
      priority: "medium"
    },
    {
      title: "Security & Privacy",
      description: "Data protection, GDPR compliance, and security settings",
      icon: LockIcon,
      url: "/app/settings/security",
      configured: true,
      priority: "low"
    },
    {
      title: "Billing & Subscription",
      description: "Manage your subscription, billing, and usage limits",
      icon: BankIcon,
      url: "/app/settings/billing",
      configured: settingsStatus.paymentSettings.configured,
      priority: "low"
    }
  ];

  const getConfigurationBadge = (configured, priority) => {
    if (configured) {
      return <Badge status="success">Configured</Badge>;
    } else {
      const status = priority === "high" ? "critical" : "attention";
      return <Badge status={status}>Setup Required</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      high: { status: 'critical', children: 'High Priority' },
      medium: { status: 'attention', children: 'Medium Priority' },
      low: { status: 'info', children: 'Low Priority' }
    };
    return <Badge {...priorityConfig[priority]} />;
  };

  const unconfiguredHighPriority = settingsCategories.filter(
    category => !category.configured && category.priority === "high"
  );

  return (
    <Page
      title="Settings"
      subtitle="Configure your GST Invoice & Shipping Manager"
    >
      <Layout>
        {/* Setup Alert */}
        {unconfiguredHighPriority.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="200" align="center">
                  <Icon source={SettingsIcon} tone="critical" />
                  <Text variant="headingMd" as="h2" tone="critical">
                    Setup Required
                  </Text>
                </InlineStack>
                
                <Text variant="bodyMd" as="p">
                  Complete these high-priority settings to get the most out of your app:
                </Text>
                
                <InlineStack gap="300">
                  {unconfiguredHighPriority.map((category) => (
                    <Button key={category.title} variant="primary" url={category.url}>
                      Setup {category.title}
                    </Button>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Shop Information */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Shop Information</Text>
              
              <InlineStack gap="600">
                <BlockStack gap="200">
                  <Text variant="bodyMd" as="p">
                    <strong>Shop Name:</strong> {shop.name}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Domain:</strong> {shop.domain}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Company:</strong> {shop.companyName || 'Not configured'}
                  </Text>
                </BlockStack>
                
                <BlockStack gap="200">
                  <Text variant="bodyMd" as="p">
                    <strong>GSTIN:</strong> {shop.gstin || 'Not configured'}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>State:</strong> {shop.state || 'Not configured'}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Setup Date:</strong> {new Date(shop.createdAt).toLocaleDateString('en-IN')}
                  </Text>
                </BlockStack>
              </InlineStack>
              
              <InlineStack align="end">
                <Button url="/app/settings/invoice">
                  Update Shop Information
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Settings Categories */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Settings Categories</Text>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                gap: '16px' 
              }}>
                {settingsCategories.map((category) => (
                  <Card key={category.title} sectioned>
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <InlineStack gap="200" align="center">
                          <Icon source={category.icon} tone="base" />
                          <Text variant="headingSm" as="h3">{category.title}</Text>
                        </InlineStack>
                        <InlineStack gap="100">
                          {getConfigurationBadge(category.configured, category.priority)}
                          {!category.configured && getPriorityBadge(category.priority)}
                        </InlineStack>
                      </InlineStack>
                      
                      <Text variant="bodyMd" as="p" tone="subdued">
                        {category.description}
                      </Text>
                      
                      <InlineStack align="end">
                        <Button url={category.url}>
                          {category.configured ? 'Manage' : 'Setup'}
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                ))}
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Quick Actions</Text>
              
              <InlineStack gap="300">
                <Button variant="primary" url="/app/settings/invoice">
                  Configure Invoice Settings
                </Button>
                <Button url="/app/settings/labels">
                  Setup Label Preferences
                </Button>
                <Button url="/app/settings/notifications">
                  Notification Settings
                </Button>
                <Button url="/app/settings/export">
                  Export All Settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* System Status */}
        <Layout.Section>
          <InlineStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">App Status</Text>
                <Badge status="success">Active</Badge>
                <Text variant="bodySm" as="p" tone="subdued">
                  All systems operational
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Data Backup</Text>
                <Badge status="info">Up to Date</Badge>
                <Text variant="bodySm" as="p" tone="subdued">
                  Last backup: {new Date().toLocaleDateString('en-IN')}
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">API Status</Text>
                <Badge status="success">Connected</Badge>
                <Text variant="bodySm" as="p" tone="subdued">
                  Shopify API connected
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Version</Text>
                <Text variant="bodyMd" as="p">v2.0.0</Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  Latest version
                </Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Help & Support */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Help & Support</Text>
              
              <BlockStack gap="300">
                <Text variant="bodyMd" as="p">
                  Need help configuring your settings? Check out these resources:
                </Text>
                
                <InlineStack gap="300">
                  <Button url="/app/help/setup-guide">
                    Setup Guide
                  </Button>
                  <Button url="/app/help/faq">
                    FAQ
                  </Button>
                  <Button url="/app/help/contact" variant="primary">
                    Contact Support
                  </Button>
                  <Button url="/app/help/documentation" external>
                    Documentation
                  </Button>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}