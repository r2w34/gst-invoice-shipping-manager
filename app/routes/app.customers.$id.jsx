import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Badge,
  Text,
  InlineStack,
  BlockStack,
  Divider,
  EmptyState,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";
import { formatIndianCurrency } from "../utils/gst-calculator.js";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  const customer = await prisma.customer.findFirst({
    where: { 
      id: params.id,
      shopId: shop.id 
    },
    include: {
      invoices: {
        include: {
          items: true
        },
        orderBy: { createdAt: 'desc' }
      },
      labels: {
        orderBy: { createdAt: 'desc' }
      },
      orders: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  // Calculate customer stats
  const stats = {
    totalInvoices: customer.invoices.length,
    totalLabels: customer.labels.length,
    totalOrders: customer.orders.length,
    totalRevenue: customer.invoices.reduce((sum, invoice) => 
      sum + (invoice.status === 'paid' ? invoice.totalAmount : 0), 0
    ),
    pendingAmount: customer.invoices.reduce((sum, invoice) => 
      sum + (invoice.status === 'sent' ? invoice.totalAmount : 0), 0
    ),
    averageOrderValue: customer.invoices.length > 0 
      ? customer.invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0) / customer.invoices.length 
      : 0
  };

  return json({
    customer,
    stats,
    shop
  });
};

export default function CustomerDetail() {
  const { customer, stats, shop } = useLoaderData();

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { status: 'info', children: 'Draft' },
      sent: { status: 'attention', children: 'Sent' },
      paid: { status: 'success', children: 'Paid' },
      cancelled: { status: 'critical', children: 'Cancelled' },
      created: { status: 'info', children: 'Created' },
      printed: { status: 'attention', children: 'Printed' },
      shipped: { status: 'success', children: 'Shipped' }
    };
    return <Badge {...statusConfig[status]} />;
  };

  const getGSTINBadge = () => {
    if (!customer.gstin) {
      return <Badge status="attention">No GSTIN</Badge>;
    }
    if (customer.gstinValidated) {
      return <Badge status="success">GSTIN Verified</Badge>;
    }
    return <Badge status="critical">GSTIN Invalid</Badge>;
  };

  // Invoice rows
  const invoiceRows = customer.invoices.map((invoice) => [
    <Link to={`/app/invoices/${invoice.id}`} style={{ textDecoration: 'none' }}>
      <Text variant="bodyMd" fontWeight="semibold" as="span">
        {invoice.invoiceNumber}
      </Text>
    </Link>,
    new Date(invoice.invoiceDate).toLocaleDateString('en-IN'),
    formatIndianCurrency(invoice.totalAmount),
    getStatusBadge(invoice.status),
    <InlineStack gap="200">
      <Button size="micro" url={`/app/invoices/${invoice.id}`}>
        View
      </Button>
      <Button size="micro" variant="primary" url={`/app/invoices/${invoice.id}/print`}>
        Print
      </Button>
    </InlineStack>
  ]);

  // Label rows
  const labelRows = customer.labels.map((label) => [
    <Link to={`/app/labels/${label.id}`} style={{ textDecoration: 'none' }}>
      <Text variant="bodyMd" fontWeight="semibold" as="span">
        {label.labelNumber}
      </Text>
    </Link>,
    new Date(label.createdAt).toLocaleDateString('en-IN'),
    `${label.shippingCity}, ${label.shippingState}`,
    label.trackingId || '-',
    label.labelSize,
    getStatusBadge(label.status),
    <InlineStack gap="200">
      <Button size="micro" url={`/app/labels/${label.id}`}>
        View
      </Button>
      <Button size="micro" variant="primary" url={`/app/labels/${label.id}/print`}>
        Print
      </Button>
    </InlineStack>
  ]);

  const customerTags = customer.tags ? customer.tags.split(',').map(tag => tag.trim()) : [];

  return (
    <Page
      title={`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unnamed Customer'}
      backAction={{ url: "/app/customers" }}
      primaryAction={{
        content: 'Edit Customer',
        url: `/app/customers/${customer.id}/edit`
      }}
      secondaryActions={[
        {
          content: 'Create Invoice',
          url: `/app/invoices/new?customer=${customer.id}`
        },
        {
          content: 'Create Label',
          url: `/app/labels/new?customer=${customer.id}`
        },
        {
          content: 'Delete Customer',
          destructive: true,
          url: `/app/customers/${customer.id}/delete`
        }
      ]}
    >
      <Layout>
        {/* Customer Information */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Customer Information</Text>
              
              <InlineStack gap="600">
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Contact Details</Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Name:</strong> {`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Not provided'}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Email:</strong> {customer.email || 'Not provided'}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    <strong>Phone:</strong> {customer.phone || 'Not provided'}
                  </Text>
                </BlockStack>
                
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Address</Text>
                  <Text variant="bodyMd" as="p">
                    {customer.address1 && (
                      <>
                        {customer.address1}<br />
                        {customer.address2 && <>{customer.address2}<br /></>}
                        {customer.city}, {customer.state} {customer.pincode}<br />
                        {customer.country}
                      </>
                    )}
                    {!customer.address1 && 'No address provided'}
                  </Text>
                </BlockStack>
                
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">GST Information</Text>
                  <Text variant="bodyMd" as="p">
                    <strong>GSTIN:</strong> {customer.gstin || 'Not provided'}
                  </Text>
                  <div>{getGSTINBadge()}</div>
                </BlockStack>
              </InlineStack>
              
              {customerTags.length > 0 && (
                <>
                  <Divider />
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">Tags</Text>
                    <InlineStack gap="200">
                      {customerTags.map((tag, index) => (
                        <Badge key={index}>{tag}</Badge>
                      ))}
                    </InlineStack>
                  </BlockStack>
                </>
              )}
              
              {customer.notes && (
                <>
                  <Divider />
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">Notes</Text>
                    <Text variant="bodyMd" as="p">{customer.notes}</Text>
                  </BlockStack>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Customer Stats */}
        <Layout.Section>
          <InlineStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Total Revenue</Text>
                <Text variant="heading2xl" as="p">{formatIndianCurrency(stats.totalRevenue)}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Pending Amount</Text>
                <Text variant="heading2xl" as="p" tone="warning">{formatIndianCurrency(stats.pendingAmount)}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Total Invoices</Text>
                <Text variant="heading2xl" as="p">{stats.totalInvoices}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Average Order Value</Text>
                <Text variant="heading2xl" as="p">{formatIndianCurrency(stats.averageOrderValue)}</Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Recent Invoices */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">Recent Invoices</Text>
              {customer.invoices.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
                  headings={['Invoice Number', 'Date', 'Amount', 'Status', 'Actions']}
                  rows={invoiceRows.slice(0, 5)}
                />
              ) : (
                <EmptyState
                  heading="No invoices yet"
                  action={{
                    content: 'Create Invoice',
                    url: `/app/invoices/new?customer=${customer.id}`
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create the first invoice for this customer.</p>
                </EmptyState>
              )}
              {customer.invoices.length > 5 && (
                <InlineStack align="center">
                  <Button url={`/app/invoices?customer=${customer.id}`}>
                    View All Invoices ({customer.invoices.length})
                  </Button>
                </InlineStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Recent Labels */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">Recent Shipping Labels</Text>
              {customer.labels.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                  headings={['Label Number', 'Date', 'Destination', 'Tracking ID', 'Format', 'Status', 'Actions']}
                  rows={labelRows.slice(0, 5)}
                />
              ) : (
                <EmptyState
                  heading="No shipping labels yet"
                  action={{
                    content: 'Create Label',
                    url: `/app/labels/new?customer=${customer.id}`
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create the first shipping label for this customer.</p>
                </EmptyState>
              )}
              {customer.labels.length > 5 && (
                <InlineStack align="center">
                  <Button url={`/app/labels?customer=${customer.id}`}>
                    View All Labels ({customer.labels.length})
                  </Button>
                </InlineStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}