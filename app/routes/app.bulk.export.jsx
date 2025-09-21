import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  Select,
  Button,
  BlockStack,
  Text,
  Banner,
  Checkbox,
  InlineStack,
  Badge,
  DatePicker,
} from "@shopify/polaris";
import { useState, useCallback } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const exportType = url.searchParams.get("type");
  const format = url.searchParams.get("format");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // If export parameters are provided, generate the export
  if (exportType && format) {
    return await generateExport(shop, exportType, format, dateFrom, dateTo);
  }

  // Get statistics for export options
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
    recentExports: await prisma.bulkOperation.findMany({
      where: { 
        shopId: shop.id,
        operationType: { startsWith: 'export_' }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  };

  return json({
    shop,
    stats
  });
};

async function generateExport(shop, exportType, format, dateFrom, dateTo) {
  try {
    let data = [];
    let filename = '';

    // Build date filter
    const dateFilter = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      dateFilter.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    switch (exportType) {
      case 'customers':
        data = await exportCustomers(shop, dateFilter);
        filename = `customers-export-${new Date().toISOString().split('T')[0]}`;
        break;
      
      case 'invoices':
        data = await exportInvoices(shop, dateFilter);
        filename = `invoices-export-${new Date().toISOString().split('T')[0]}`;
        break;
      
      case 'labels':
        data = await exportLabels(shop, dateFilter);
        filename = `labels-export-${new Date().toISOString().split('T')[0]}`;
        break;
      
      case 'tracking':
        data = await exportTracking(shop, dateFilter);
        filename = `tracking-export-${new Date().toISOString().split('T')[0]}`;
        break;
      
      default:
        throw new Error('Invalid export type');
    }

    // Create bulk operation record
    await prisma.bulkOperation.create({
      data: {
        shopId: shop.id,
        operationType: `export_${exportType}`,
        totalItems: data.length,
        processedItems: data.length,
        status: 'completed',
        completedAt: new Date(),
        metadata: JSON.stringify({ exportType, format, dateFrom, dateTo })
      }
    });

    if (format === 'csv') {
      return generateCSVResponse(data, filename);
    } else if (format === 'excel') {
      return generateExcelResponse(data, filename);
    } else {
      throw new Error('Invalid format');
    }

  } catch (error) {
    console.error('Export error:', error);
    return json({ error: 'Failed to generate export' }, { status: 500 });
  }
}

async function exportCustomers(shop, dateFilter) {
  const customers = await prisma.customer.findMany({
    where: { 
      shopId: shop.id,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    },
    include: {
      invoices: {
        select: { totalAmount: true, status: true }
      },
      labels: {
        select: { id: true }
      }
    }
  });

  return customers.map(customer => {
    const totalRevenue = customer.invoices.reduce((sum, invoice) => 
      sum + (invoice.status === 'paid' ? invoice.totalAmount : 0), 0
    );
    
    const pendingAmount = customer.invoices.reduce((sum, invoice) => 
      sum + (invoice.status === 'sent' ? invoice.totalAmount : 0), 0
    );

    return {
      'Customer ID': customer.id,
      'First Name': customer.firstName || '',
      'Last Name': customer.lastName || '',
      'Email': customer.email || '',
      'Phone': customer.phone || '',
      'Address Line 1': customer.address1 || '',
      'Address Line 2': customer.address2 || '',
      'City': customer.city || '',
      'State': customer.state || '',
      'Pincode': customer.pincode || '',
      'Country': customer.country || '',
      'GSTIN': customer.gstin || '',
      'GSTIN Validated': customer.gstinValidated ? 'Yes' : 'No',
      'Tags': customer.tags || '',
      'Notes': customer.notes || '',
      'Total Invoices': customer.invoices.length,
      'Total Labels': customer.labels.length,
      'Total Revenue': totalRevenue,
      'Pending Amount': pendingAmount,
      'Created Date': customer.createdAt.toISOString().split('T')[0],
      'Last Updated': customer.updatedAt.toISOString().split('T')[0]
    };
  });
}

async function exportInvoices(shop, dateFilter) {
  const invoices = await prisma.invoice.findMany({
    where: { 
      shopId: shop.id,
      ...(Object.keys(dateFilter).length > 0 && { invoiceDate: dateFilter })
    },
    include: {
      customer: true
    }
  });

  return invoices.map(invoice => ({
    'Invoice ID': invoice.id,
    'Invoice Number': invoice.invoiceNumber,
    'Invoice Date': invoice.invoiceDate.toISOString().split('T')[0],
    'Customer Name': invoice.customer ? `${invoice.customer.firstName || ''} ${invoice.customer.lastName || ''}`.trim() : '',
    'Customer Email': invoice.customer?.email || '',
    'Customer GSTIN': invoice.customer?.gstin || '',
    'Subtotal': invoice.subtotal,
    'CGST Amount': invoice.cgstAmount,
    'SGST Amount': invoice.sgstAmount,
    'IGST Amount': invoice.igstAmount,
    'Total GST': invoice.totalGst,
    'Total Amount': invoice.totalAmount,
    'Place of Supply': invoice.placeOfSupply,
    'Reverse Charge': invoice.reverseCharge ? 'Yes' : 'No',
    'Status': invoice.status,
    'Items': invoice.items,
    'Created Date': invoice.createdAt.toISOString().split('T')[0],
    'Last Updated': invoice.updatedAt.toISOString().split('T')[0]
  }));
}

async function exportLabels(shop, dateFilter) {
  const labels = await prisma.shippingLabel.findMany({
    where: { 
      shopId: shop.id,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    },
    include: {
      customer: true,
      order: true
    }
  });

  return labels.map(label => ({
    'Label ID': label.id,
    'Label Number': label.labelNumber,
    'Label Size': label.labelSize,
    'Recipient Name': label.recipientName,
    'Recipient Phone': label.recipientPhone || '',
    'Shipping Address 1': label.shippingAddress1,
    'Shipping Address 2': label.shippingAddress2 || '',
    'Shipping City': label.shippingCity,
    'Shipping State': label.shippingState,
    'Shipping Pincode': label.shippingPincode,
    'Shipping Country': label.shippingCountry,
    'Tracking ID': label.trackingId || '',
    'Courier Name': label.courierName || '',
    'Status': label.status,
    'Include Products': label.includeProducts ? 'Yes' : 'No',
    'Product Details': label.productDetails || '',
    'Customer Name': label.customer ? `${label.customer.firstName || ''} ${label.customer.lastName || ''}`.trim() : '',
    'Customer Email': label.customer?.email || '',
    'Order Number': label.order?.orderNumber || '',
    'Created Date': label.createdAt.toISOString().split('T')[0],
    'Last Updated': label.updatedAt.toISOString().split('T')[0]
  }));
}

async function exportTracking(shop, dateFilter) {
  const labels = await prisma.shippingLabel.findMany({
    where: { 
      shopId: shop.id,
      trackingId: { not: null },
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    },
    include: {
      customer: true,
      order: true
    }
  });

  return labels.map(label => ({
    'Label Number': label.labelNumber,
    'Tracking ID': label.trackingId,
    'Courier Name': label.courierName || '',
    'Recipient Name': label.recipientName,
    'Recipient Phone': label.recipientPhone || '',
    'Destination': `${label.shippingCity}, ${label.shippingState} ${label.shippingPincode}`,
    'Status': label.status,
    'Customer Name': label.customer ? `${label.customer.firstName || ''} ${label.customer.lastName || ''}`.trim() : '',
    'Customer Email': label.customer?.email || '',
    'Order Number': label.order?.orderNumber || '',
    'Created Date': label.createdAt.toISOString().split('T')[0],
    'Last Updated': label.updatedAt.toISOString().split('T')[0]
  }));
}

function generateCSVResponse(data, filename) {
  if (data.length === 0) {
    return new Response("No data to export", {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const headers = Object.keys(data[0]);
  let csvContent = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += values.join(',') + '\n';
  });

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`
    }
  });
}

function generateExcelResponse(data, filename) {
  if (data.length === 0) {
    return new Response("No data to export", {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const headers = Object.keys(data[0]);
  let tsvContent = headers.join('\t') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      if (typeof value === 'string') {
        return value.replace(/\t/g, ' ').replace(/\n/g, ' ');
      }
      return value;
    });
    tsvContent += values.join('\t') + '\n';
  });

  return new Response(tsvContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`
    }
  });
}

export default function BulkExport() {
  const { shop, stats } = useLoaderData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [exportType, setExportType] = useState("customers");
  const [format, setFormat] = useState("csv");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [includeFilters, setIncludeFilters] = useState(false);

  const exportTypeOptions = [
    { label: "Customers", value: "customers" },
    { label: "Invoices", value: "invoices" },
    { label: "Shipping Labels", value: "labels" },
    { label: "Tracking Data", value: "tracking" }
  ];

  const formatOptions = [
    { label: "CSV", value: "csv" },
    { label: "Excel", value: "excel" }
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

  const handleExport = () => {
    const params = new URLSearchParams({
      type: exportType,
      format: format
    });

    if (includeFilters && dateFrom) {
      params.append('dateFrom', dateFrom);
    }
    if (includeFilters && dateTo) {
      params.append('dateTo', dateTo);
    }

    window.location.href = `/app/bulk/export?${params.toString()}`;
  };

  const getExportDescription = () => {
    const descriptions = {
      customers: `Export all customer data including contact information, GSTIN details, and transaction history. Total: ${stats.totalCustomers} customers`,
      invoices: `Export all invoice data including GST calculations, customer details, and payment status. Total: ${stats.totalInvoices} invoices`,
      labels: `Export all shipping label data including addresses, tracking information, and courier details. Total: ${stats.totalLabels} labels`,
      tracking: `Export tracking data for all shipped labels including tracking IDs and delivery status.`
    };
    return descriptions[exportType];
  };

  return (
    <Page
      title="Bulk Data Export"
      backAction={{ url: "/app/bulk" }}
      primaryAction={{
        content: "Generate Export",
        loading: isSubmitting,
        onAction: handleExport
      }}
    >
      <Layout>
        {/* Export Configuration */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Export Configuration</Text>
              
              <FormLayout>
                <FormLayout.Group>
                  <Select
                    label="Data Type"
                    options={exportTypeOptions}
                    value={exportType}
                    onChange={setExportType}
                  />
                  <Select
                    label="Format"
                    options={formatOptions}
                    value={format}
                    onChange={setFormat}
                  />
                </FormLayout.Group>
                
                <Text variant="bodyMd" as="p" tone="subdued">
                  {getExportDescription()}
                </Text>
                
                <Checkbox
                  label="Apply date filters"
                  checked={includeFilters}
                  onChange={setIncludeFilters}
                  helpText="Filter data by creation date range"
                />
                
                {includeFilters && (
                  <FormLayout.Group>
                    <div>
                      <Text variant="bodyMd" as="label">From Date</Text>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          marginTop: '4px'
                        }}
                      />
                    </div>
                    <div>
                      <Text variant="bodyMd" as="label">To Date</Text>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          marginTop: '4px'
                        }}
                      />
                    </div>
                  </FormLayout.Group>
                )}
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Export Statistics */}
        <Layout.Section>
          <InlineStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Customers</Text>
                <Text variant="heading2xl" as="p">{stats.totalCustomers}</Text>
                <Button size="micro" url="?type=customers&format=csv">Export CSV</Button>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Invoices</Text>
                <Text variant="heading2xl" as="p">{stats.totalInvoices}</Text>
                <Button size="micro" url="?type=invoices&format=csv">Export CSV</Button>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Labels</Text>
                <Text variant="heading2xl" as="p">{stats.totalLabels}</Text>
                <Button size="micro" url="?type=labels&format=csv">Export CSV</Button>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Quick Export</Text>
                <Text variant="bodyMd" as="p">All Data</Text>
                <InlineStack gap="200">
                  <Button size="micro" url="?type=customers&format=csv">Customers</Button>
                  <Button size="micro" url="?type=invoices&format=excel">Invoices</Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Recent Exports */}
        {stats.recentExports.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Recent Exports</Text>
                
                <BlockStack gap="200">
                  {stats.recentExports.map((operation) => (
                    <Card key={operation.id} sectioned>
                      <InlineStack align="space-between">
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="semibold" as="p">
                            {operation.operationType.replace('export_', '').toUpperCase()} Export - {operation.totalItems} items
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
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Export Templates */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Export Templates</Text>
              
              <Text variant="bodyMd" as="p">
                Pre-configured export templates for common use cases:
              </Text>
              
              <InlineStack gap="300">
                <Button url="?type=customers&format=csv">
                  Customer Database
                </Button>
                <Button url="?type=invoices&format=excel">
                  GST Report
                </Button>
                <Button url="?type=tracking&format=csv">
                  Shipping Report
                </Button>
                <Button url="?type=labels&format=csv">
                  Label Inventory
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}