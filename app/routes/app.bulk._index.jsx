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
  InvoiceIcon,
  PackageIcon,
  LocationIcon,
  ExportIcon,
  ImportIcon,
  ClockIcon,
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

  // Get bulk operation statistics
  const stats = {
    totalCustomers: await prisma.customer.count({
      where: { shopId: shop.id }
    }),
    totalInvoices: await prisma.invoice.count({
      where: { shopId: shop.id }
    }),
    totalLabels: await prisma.shippingLabel.count({
      where: { shopId: shop.id }
    }),
    pendingInvoices: await prisma.invoice.count({
      where: { 
        shopId: shop.id,
        status: 'draft'
      }
    }),
    recentBulkOperations: await prisma.bulkOperation.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  };

  return json({
    stats,
    shop
  });
};

export default function BulkOperationsIndex() {
  const { stats, shop } = useLoaderData();

  const bulkOperations = [
    {
      title: "Bulk Invoice Generation",
      description: "Generate multiple invoices at once from customer list or CSV data",
      icon: InvoiceIcon,
      url: "/app/bulk/invoices",
      badge: "Popular",
      badgeStatus: "success"
    },
    {
      title: "Bulk Label Creation",
      description: "Create shipping labels in bulk for multiple orders or addresses",
      icon: PackageIcon,
      url: "/app/bulk/labels",
      badge: "New",
      badgeStatus: "info"
    },
    {
      title: "Bulk Tracking Management",
      description: "Import and manage tracking IDs for multiple shipments",
      icon: LocationIcon,
      url: "/app/bulk/tracking",
      badge: null,
      badgeStatus: null
    },
    {
      title: "Bulk Data Export",
      description: "Export invoices, labels, and customer data in various formats",
      icon: ExportIcon,
      url: "/app/bulk/export",
      badge: null,
      badgeStatus: null
    },
    {
      title: "Bulk Data Import",
      description: "Import customers, orders, and tracking data from CSV/Excel files",
      icon: ImportIcon,
      url: "/app/bulk/import",
      badge: null,
      badgeStatus: null
    },
    {
      title: "Scheduled Operations",
      description: "Set up automated bulk operations to run at specific times",
      icon: ClockIcon,
      url: "/app/bulk/scheduled",
      badge: "Coming Soon",
      badgeStatus: "attention"
    }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { status: 'info', children: 'Pending' },
      processing: { status: 'attention', children: 'Processing' },
      completed: { status: 'success', children: 'Completed' },
      failed: { status: 'critical', children: 'Failed' }
    };
    return <Badge {...statusConfig[status]} />;
  };

  return (
    <Page
      title="Bulk Operations"
      subtitle="Manage large-scale operations for invoices, labels, and tracking"
    >
      <Layout>
        {/* Statistics Cards */}
        <Layout.Section>
          <InlineStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Total Customers</Text>
                <Text variant="heading2xl" as="p">{stats.totalCustomers}</Text>
                <Text variant="bodySm" as="p" tone="subdued">Available for bulk operations</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Total Invoices</Text>
                <Text variant="heading2xl" as="p">{stats.totalInvoices}</Text>
                <Text variant="bodySm" as="p" tone="subdued">Generated invoices</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Total Labels</Text>
                <Text variant="heading2xl" as="p">{stats.totalLabels}</Text>
                <Text variant="bodySm" as="p" tone="subdued">Created shipping labels</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Pending Invoices</Text>
                <Text variant="heading2xl" as="p" tone="warning">{stats.pendingInvoices}</Text>
                <Text variant="bodySm" as="p" tone="subdued">Draft invoices ready to send</Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Bulk Operations Grid */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Available Bulk Operations</Text>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '16px' 
              }}>
                {bulkOperations.map((operation, index) => (
                  <Card key={index} sectioned>
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <InlineStack gap="200" align="center">
                          <Icon source={operation.icon} tone="base" />
                          <Text variant="headingSm" as="h3">{operation.title}</Text>
                        </InlineStack>
                        {operation.badge && (
                          <Badge status={operation.badgeStatus}>{operation.badge}</Badge>
                        )}
                      </InlineStack>
                      
                      <Text variant="bodyMd" as="p" tone="subdued">
                        {operation.description}
                      </Text>
                      
                      <InlineStack align="end">
                        <Button 
                          url={operation.url}
                          disabled={operation.badge === "Coming Soon"}
                        >
                          {operation.badge === "Coming Soon" ? "Coming Soon" : "Get Started"}
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                ))}
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Recent Bulk Operations */}
        {stats.recentBulkOperations.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Recent Bulk Operations</Text>
                
                <BlockStack gap="200">
                  {stats.recentBulkOperations.map((operation) => (
                    <Card key={operation.id} sectioned>
                      <InlineStack align="space-between">
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="semibold" as="p">
                            {operation.operationType} - {operation.totalItems} items
                          </Text>
                          <Text variant="bodySm" as="p" tone="subdued">
                            {new Date(operation.createdAt).toLocaleString('en-IN')}
                          </Text>
                        </BlockStack>
                        
                        <InlineStack gap="200" align="center">
                          {getStatusBadge(operation.status)}
                          <Text variant="bodySm" as="p">
                            {operation.processedItems}/{operation.totalItems} processed
                          </Text>
                        </InlineStack>
                      </InlineStack>
                    </Card>
                  ))}
                </BlockStack>
                
                <InlineStack align="center">
                  <Button url="/app/bulk/history">View All Operations</Button>
                </InlineStack>
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
                <Button 
                  variant="primary" 
                  size="large"
                  url="/app/bulk/invoices"
                >
                  Generate Bulk Invoices
                </Button>
                <Button 
                  size="large"
                  url="/app/bulk/labels"
                >
                  Create Bulk Labels
                </Button>
                <Button 
                  size="large"
                  url="/app/bulk/export"
                >
                  Export Data
                </Button>
                <Button 
                  size="large"
                  url="/app/customers/import"
                >
                  Import Customers
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}