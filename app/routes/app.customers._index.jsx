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
  EmptyState,
  TextField,
} from "@shopify/polaris";
import { useState } from "react";

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

  // Get customers with related data
  const customers = await prisma.customer.findMany({
    where: { shopId: shop.id },
    include: {
      invoices: {
        select: { id: true, totalAmount: true, status: true }
      },
      labels: {
        select: { id: true, status: true }
      },
      _count: {
        select: {
          invoices: true,
          labels: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Calculate stats
  const stats = {
    total: customers.length,
    withGSTIN: customers.filter(customer => customer.gstin && customer.gstinValidated).length,
    withoutGSTIN: customers.filter(customer => !customer.gstin).length,
    totalInvoices: customers.reduce((sum, customer) => sum + customer._count.invoices, 0),
    totalLabels: customers.reduce((sum, customer) => sum + customer._count.labels, 0),
    totalRevenue: customers.reduce((sum, customer) => 
      sum + customer.invoices.reduce((invoiceSum, invoice) => 
        invoiceSum + (invoice.status === 'paid' ? invoice.totalAmount : 0), 0
      ), 0
    )
  };

  return json({
    customers,
    stats,
    shop
  });
};

export default function CustomersIndex() {
  const { customers, stats, shop } = useLoaderData();
  const [searchTerm, setSearchTerm] = useState("");

  const getGSTINBadge = (customer) => {
    if (!customer.gstin) {
      return <Badge status="attention">No GSTIN</Badge>;
    }
    if (customer.gstinValidated) {
      return <Badge status="success">GSTIN Verified</Badge>;
    }
    return <Badge status="critical">GSTIN Invalid</Badge>;
  };

  const getCustomerValue = (customer) => {
    const totalValue = customer.invoices.reduce((sum, invoice) => 
      sum + (invoice.status === 'paid' ? invoice.totalAmount : 0), 0
    );
    return `₹${totalValue.toLocaleString('en-IN')}`;
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase();
    const email = (customer.email || '').toLowerCase();
    const phone = (customer.phone || '').toLowerCase();
    const gstin = (customer.gstin || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           phone.includes(searchLower) ||
           gstin.includes(searchLower);
  });

  const rows = filteredCustomers.map((customer) => [
    <Link to={`/app/customers/${customer.id}`} style={{ textDecoration: 'none' }}>
      <Text variant="bodyMd" fontWeight="semibold" as="span">
        {`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unnamed Customer'}
      </Text>
    </Link>,
    customer.email || '-',
    customer.phone || '-',
    customer.gstin || '-',
    getGSTINBadge(customer),
    `${customer.city || ''}, ${customer.state || ''}`.replace(/^, |, $/, '') || '-',
    customer._count.invoices,
    customer._count.labels,
    getCustomerValue(customer),
    <InlineStack gap="200">
      <Button size="micro" url={`/app/customers/${customer.id}`}>
        View
      </Button>
      <Button size="micro" variant="primary" url={`/app/customers/${customer.id}/edit`}>
        Edit
      </Button>
      <Button size="micro" url={`/app/invoices/new?customer=${customer.id}`}>
        Invoice
      </Button>
    </InlineStack>
  ]);

  return (
    <Page
      title="Customer CRM"
      primaryAction={{
        content: 'Add Customer',
        url: '/app/customers/new'
      }}
      secondaryActions={[
        {
          content: 'Import Customers',
          url: '/app/customers/import'
        },
        {
          content: 'Export to CSV',
          url: '/app/customers/export?format=csv'
        },
        {
          content: 'Export to Excel',
          url: '/app/customers/export?format=excel'
        }
      ]}
    >
      <Layout>
        {/* Stats Cards */}
        <Layout.Section>
          <InlineStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Total Customers</Text>
                <Text variant="heading2xl" as="p">{stats.total}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">With GSTIN</Text>
                <Text variant="heading2xl" as="p" tone="success">{stats.withGSTIN}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Without GSTIN</Text>
                <Text variant="heading2xl" as="p" tone="warning">{stats.withoutGSTIN}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Total Revenue</Text>
                <Text variant="heading2xl" as="p">₹{stats.totalRevenue.toLocaleString('en-IN')}</Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Search and Filters */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">Search & Filter</Text>
              <TextField
                label="Search customers"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by name, email, phone, or GSTIN..."
                clearButton
                onClearButtonClick={() => setSearchTerm("")}
              />
              <Text variant="bodyMd" as="p" tone="subdued">
                Showing {filteredCustomers.length} of {customers.length} customers
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Customers Table */}
        <Layout.Section>
          <Card>
            {filteredCustomers.length > 0 ? (
              <DataTable
                columnContentTypes={[
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                  'numeric',
                  'numeric',
                  'numeric',
                  'text'
                ]}
                headings={[
                  'Name',
                  'Email',
                  'Phone',
                  'GSTIN',
                  'Status',
                  'Location',
                  'Invoices',
                  'Labels',
                  'Total Value',
                  'Actions'
                ]}
                rows={rows}
                pagination={{
                  hasNext: false,
                  hasPrevious: false,
                  onNext: () => {},
                  onPrevious: () => {}
                }}
              />
            ) : (
              <EmptyState
                heading={searchTerm ? "No customers found" : "Add your first customer"}
                action={{
                  content: searchTerm ? 'Clear search' : 'Add Customer',
                  onAction: searchTerm ? () => setSearchTerm("") : undefined,
                  url: searchTerm ? undefined : '/app/customers/new'
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  {searchTerm 
                    ? `No customers match "${searchTerm}". Try a different search term.`
                    : "Start building your customer database with GSTIN validation and detailed records."
                  }
                </p>
              </EmptyState>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}