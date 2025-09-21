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
  DataTable,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { useState, useCallback } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";
import { INDIAN_STATES } from "../utils/gst-calculator.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Get customers and orders for bulk label generation
  const customers = await prisma.customer.findMany({
    where: { shopId: shop.id },
    include: {
      labels: {
        select: { id: true, status: true }
      }
    },
    orderBy: { firstName: 'asc' }
  });

  const orders = await prisma.order.findMany({
    where: { shopId: shop.id },
    include: {
      customer: true,
      labels: {
        select: { id: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Get recent bulk operations
  const recentOperations = await prisma.bulkOperation.findMany({
    where: { 
      shopId: shop.id,
      operationType: { in: ['bulk_label', 'bulk_label_csv'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return json({
    shop,
    customers,
    orders,
    recentOperations,
    indianStates: Object.keys(INDIAN_STATES),
    courierOptions: [
      { label: 'Select Courier', value: '' },
      { label: 'Blue Dart', value: 'bluedart' },
      { label: 'DTDC', value: 'dtdc' },
      { label: 'FedEx', value: 'fedex' },
      { label: 'DHL', value: 'dhl' },
      { label: 'India Post', value: 'indiapost' },
      { label: 'Ecom Express', value: 'ecom' },
      { label: 'Xpressbees', value: 'xpressbees' }
    ]
  });
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
    const operationType = formData.get("operationType");
    
    if (operationType === "selected_customers") {
      return await handleSelectedCustomersBulkLabels(formData, shop);
    } else if (operationType === "selected_orders") {
      return await handleSelectedOrdersBulkLabels(formData, shop);
    } else if (operationType === "csv_data") {
      return await handleCSVBulkLabels(formData, shop);
    } else {
      return json({ 
        error: "Invalid operation type" 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Error processing bulk label operation:", error);
    return json({ 
      error: "Failed to process bulk label operation. Please try again." 
    }, { status: 500 });
  }
};

async function handleSelectedCustomersBulkLabels(formData, shop) {
  const selectedCustomers = JSON.parse(formData.get("selectedCustomers") || "[]");
  const labelData = {
    labelSize: formData.get("labelSize") || "4x6",
    courierName: formData.get("courierName"),
    includeProducts: formData.get("includeProducts") === "true"
  };

  if (selectedCustomers.length === 0) {
    return json({ 
      error: "Please select at least one customer" 
    }, { status: 400 });
  }

  // Create bulk operation record
  const bulkOperation = await prisma.bulkOperation.create({
    data: {
      shopId: shop.id,
      operationType: 'bulk_label',
      totalItems: selectedCustomers.length,
      processedItems: 0,
      status: 'processing',
      metadata: JSON.stringify({
        labelData,
        selectedCustomers
      })
    }
  });

  const results = {
    created: 0,
    errors: []
  };

  // Process labels
  for (const customerId of selectedCustomers) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        results.errors.push(`Customer ${customerId} not found`);
        continue;
      }

      if (!customer.address1 || !customer.city || !customer.state || !customer.pincode) {
        results.errors.push(`Customer ${customer.firstName} ${customer.lastName} has incomplete address`);
        continue;
      }

      // Generate label number
      const labelCount = await prisma.shippingLabel.count({
        where: { shopId: shop.id }
      });
      const labelNumber = `LBL${(labelCount + results.created + 1).toString().padStart(6, '0')}`;

      // Create shipping label
      await prisma.shippingLabel.create({
        data: {
          shopId: shop.id,
          customerId: customer.id,
          labelNumber,
          labelSize: labelData.labelSize,
          recipientName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
          recipientPhone: customer.phone,
          shippingAddress1: customer.address1,
          shippingAddress2: customer.address2,
          shippingCity: customer.city,
          shippingState: customer.state,
          shippingPincode: customer.pincode,
          shippingCountry: customer.country || 'India',
          courierName: labelData.courierName,
          includeProducts: labelData.includeProducts,
          status: 'created',
          bulkOperationId: bulkOperation.id
        }
      });

      results.created++;

    } catch (error) {
      console.error(`Error creating label for customer ${customerId}:`, error);
      results.errors.push(`Failed to create label for customer ${customerId}: ${error.message}`);
    }
  }

  // Update bulk operation
  await prisma.bulkOperation.update({
    where: { id: bulkOperation.id },
    data: {
      processedItems: results.created,
      status: results.errors.length === 0 ? 'completed' : 'completed_with_errors',
      completedAt: new Date(),
      results: JSON.stringify(results)
    }
  });

  return json({ 
    success: true,
    results,
    bulkOperationId: bulkOperation.id
  });
}

async function handleSelectedOrdersBulkLabels(formData, shop) {
  const selectedOrders = JSON.parse(formData.get("selectedOrders") || "[]");
  const labelData = {
    labelSize: formData.get("labelSize") || "4x6",
    courierName: formData.get("courierName"),
    includeProducts: formData.get("includeProducts") === "true"
  };

  if (selectedOrders.length === 0) {
    return json({ 
      error: "Please select at least one order" 
    }, { status: 400 });
  }

  // Create bulk operation record
  const bulkOperation = await prisma.bulkOperation.create({
    data: {
      shopId: shop.id,
      operationType: 'bulk_label_orders',
      totalItems: selectedOrders.length,
      processedItems: 0,
      status: 'processing',
      metadata: JSON.stringify({
        labelData,
        selectedOrders
      })
    }
  });

  const results = {
    created: 0,
    errors: []
  };

  // Process labels
  for (const orderId of selectedOrders) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true }
      });

      if (!order) {
        results.errors.push(`Order ${orderId} not found`);
        continue;
      }

      if (!order.shippingAddress1 || !order.shippingCity || !order.shippingState || !order.shippingPincode) {
        results.errors.push(`Order ${order.orderNumber} has incomplete shipping address`);
        continue;
      }

      // Generate label number
      const labelCount = await prisma.shippingLabel.count({
        where: { shopId: shop.id }
      });
      const labelNumber = `LBL${(labelCount + results.created + 1).toString().padStart(6, '0')}`;

      // Create shipping label
      await prisma.shippingLabel.create({
        data: {
          shopId: shop.id,
          customerId: order.customerId,
          orderId: order.id,
          labelNumber,
          labelSize: labelData.labelSize,
          recipientName: order.shippingName,
          recipientPhone: order.shippingPhone,
          shippingAddress1: order.shippingAddress1,
          shippingAddress2: order.shippingAddress2,
          shippingCity: order.shippingCity,
          shippingState: order.shippingState,
          shippingPincode: order.shippingPincode,
          shippingCountry: order.shippingCountry || 'India',
          courierName: labelData.courierName,
          includeProducts: labelData.includeProducts,
          productDetails: order.lineItems,
          status: 'created',
          bulkOperationId: bulkOperation.id
        }
      });

      results.created++;

    } catch (error) {
      console.error(`Error creating label for order ${orderId}:`, error);
      results.errors.push(`Failed to create label for order ${orderId}: ${error.message}`);
    }
  }

  // Update bulk operation
  await prisma.bulkOperation.update({
    where: { id: bulkOperation.id },
    data: {
      processedItems: results.created,
      status: results.errors.length === 0 ? 'completed' : 'completed_with_errors',
      completedAt: new Date(),
      results: JSON.stringify(results)
    }
  });

  return json({ 
    success: true,
    results,
    bulkOperationId: bulkOperation.id
  });
}

async function handleCSVBulkLabels(formData, shop) {
  const csvData = formData.get("csvData");
  
  if (!csvData) {
    return json({ 
      error: "Please provide CSV data" 
    }, { status: 400 });
  }

  // Parse CSV data
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return json({ 
      error: "CSV must contain at least a header row and one data row" 
    }, { status: 400 });
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const dataRows = lines.slice(1);

  // Create bulk operation record
  const bulkOperation = await prisma.bulkOperation.create({
    data: {
      shopId: shop.id,
      operationType: 'bulk_label_csv',
      totalItems: dataRows.length,
      processedItems: 0,
      status: 'processing',
      metadata: JSON.stringify({ csvData })
    }
  });

  const results = {
    created: 0,
    errors: []
  };

  // Process each row
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    
    try {
      // Map CSV columns to label data
      const labelData = {};
      headers.forEach((header, index) => {
        const value = row[index];
        
        if (header.includes('name')) {
          labelData.recipientName = value;
        } else if (header.includes('phone')) {
          labelData.recipientPhone = value;
        } else if (header.includes('address') && header.includes('1')) {
          labelData.shippingAddress1 = value;
        } else if (header.includes('address') && header.includes('2')) {
          labelData.shippingAddress2 = value;
        } else if (header.includes('city')) {
          labelData.shippingCity = value;
        } else if (header.includes('state')) {
          labelData.shippingState = value;
        } else if (header.includes('pincode') || header.includes('zip')) {
          labelData.shippingPincode = value;
        } else if (header.includes('tracking')) {
          labelData.trackingId = value;
        } else if (header.includes('courier')) {
          labelData.courierName = value;
        }
      });

      // Validate required fields
      if (!labelData.recipientName || !labelData.shippingAddress1 || !labelData.shippingCity || !labelData.shippingState || !labelData.shippingPincode) {
        results.errors.push(`Row ${i + 2}: Missing required address fields`);
        continue;
      }

      // Generate label number
      const labelCount = await prisma.shippingLabel.count({
        where: { shopId: shop.id }
      });
      const labelNumber = `LBL${(labelCount + results.created + 1).toString().padStart(6, '0')}`;

      // Create shipping label
      await prisma.shippingLabel.create({
        data: {
          shopId: shop.id,
          labelNumber,
          labelSize: '4x6',
          recipientName: labelData.recipientName,
          recipientPhone: labelData.recipientPhone,
          shippingAddress1: labelData.shippingAddress1,
          shippingAddress2: labelData.shippingAddress2,
          shippingCity: labelData.shippingCity,
          shippingState: labelData.shippingState,
          shippingPincode: labelData.shippingPincode,
          shippingCountry: 'India',
          trackingId: labelData.trackingId,
          courierName: labelData.courierName,
          status: 'created',
          bulkOperationId: bulkOperation.id
        }
      });

      results.created++;

    } catch (error) {
      console.error(`Error processing row ${i + 2}:`, error);
      results.errors.push(`Row ${i + 2}: ${error.message}`);
    }
  }

  // Update bulk operation
  await prisma.bulkOperation.update({
    where: { id: bulkOperation.id },
    data: {
      processedItems: results.created,
      status: results.errors.length === 0 ? 'completed' : 'completed_with_errors',
      completedAt: new Date(),
      results: JSON.stringify(results)
    }
  });

  return json({ 
    success: true,
    results,
    bulkOperationId: bulkOperation.id
  });
}

export default function BulkLabels() {
  const { shop, customers, orders, recentOperations, courierOptions } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [operationType, setOperationType] = useState("selected_customers");
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [csvData, setCsvData] = useState("");
  
  // Label form data
  const [labelSize, setLabelSize] = useState("4x6");
  const [courierName, setCourierName] = useState("");
  const [includeProducts, setIncludeProducts] = useState(false);

  const operationTypeOptions = [
    { label: "Selected Customers", value: "selected_customers" },
    { label: "Selected Orders", value: "selected_orders" },
    { label: "CSV Data", value: "csv_data" }
  ];

  const labelSizeOptions = [
    { label: "4×6 Thermal (100×150mm)", value: "4x6" },
    { label: "A5 (2 per A4)", value: "A5" },
    { label: "A4 Single (Full Page)", value: "A4_single" },
    { label: "A4 Multi (4 per Page)", value: "A4_multi" }
  ];

  const handleCustomerSelection = useCallback((customerId, checked) => {
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    }
  }, []);

  const handleOrderSelection = useCallback((orderId, checked) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  }, []);

  const handleSelectAllCustomers = useCallback((checked) => {
    if (checked) {
      setSelectedCustomers(customers.map(customer => customer.id));
    } else {
      setSelectedCustomers([]);
    }
  }, [customers]);

  const handleSelectAllOrders = useCallback((checked) => {
    if (checked) {
      setSelectedOrders(orders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  }, [orders]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { status: 'info', children: 'Pending' },
      processing: { status: 'attention', children: 'Processing' },
      completed: { status: 'success', children: 'Completed' },
      completed_with_errors: { status: 'warning', children: 'Completed with Errors' },
      failed: { status: 'critical', children: 'Failed' }
    };
    return <Badge {...statusConfig[status]} />;
  };

  const customerRows = customers.map((customer) => [
    <Checkbox
      checked={selectedCustomers.includes(customer.id)}
      onChange={(checked) => handleCustomerSelection(customer.id, checked)}
    />,
    `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unnamed',
    customer.email || '-',
    `${customer.city || ''}, ${customer.state || ''}`.replace(/^, |, $/, '') || '-',
    customer.labels.length,
    customer.address1 ? 'Complete' : 'Incomplete'
  ]);

  const orderRows = orders.map((order) => [
    <Checkbox
      checked={selectedOrders.includes(order.id)}
      onChange={(checked) => handleOrderSelection(order.id, checked)}
    />,
    order.orderNumber,
    order.shippingName || '-',
    `${order.shippingCity || ''}, ${order.shippingState || ''}`.replace(/^, |, $/, '') || '-',
    order.labels.length,
    order.shippingAddress1 ? 'Complete' : 'Incomplete'
  ]);

  const isFormValid = () => {
    if (operationType === "selected_customers") {
      return selectedCustomers.length > 0;
    } else if (operationType === "selected_orders") {
      return selectedOrders.length > 0;
    } else if (operationType === "csv_data") {
      return csvData.trim().length > 0;
    }
    return false;
  };

  return (
    <Page
      title="Bulk Label Generation"
      backAction={{ url: "/app/bulk" }}
      primaryAction={{
        content: "Generate Labels",
        loading: isSubmitting,
        disabled: !isFormValid(),
        onAction: () => {
          document.getElementById("bulk-label-form").requestSubmit();
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
              <p>
                Bulk label generation completed! {actionData.results.created} labels created.
              </p>
              {actionData.results.errors.length > 0 && (
                <p>
                  {actionData.results.errors.length} errors occurred. Check the operation details for more information.
                </p>
              )}
            </Banner>
          </Layout.Section>
        )}

        <Form method="post" id="bulk-label-form">
          <input type="hidden" name="operationType" value={operationType} />
          <input type="hidden" name="selectedCustomers" value={JSON.stringify(selectedCustomers)} />
          <input type="hidden" name="selectedOrders" value={JSON.stringify(selectedOrders)} />
          <input type="hidden" name="csvData" value={csvData} />
          <input type="hidden" name="includeProducts" value={includeProducts} />

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Operation Type</Text>
                
                <Select
                  label="Choose operation type"
                  options={operationTypeOptions}
                  value={operationType}
                  onChange={setOperationType}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {(operationType === "selected_customers" || operationType === "selected_orders") && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Label Settings</Text>
                  
                  <FormLayout>
                    <FormLayout.Group>
                      <Select
                        label="Label Size"
                        name="labelSize"
                        options={labelSizeOptions}
                        value={labelSize}
                        onChange={setLabelSize}
                        helpText="Choose the format that matches your printer"
                      />
                      <Select
                        label="Courier Service"
                        name="courierName"
                        options={courierOptions}
                        value={courierName}
                        onChange={setCourierName}
                      />
                    </FormLayout.Group>
                    
                    <Checkbox
                      label="Include product details on labels"
                      checked={includeProducts}
                      onChange={setIncludeProducts}
                      helpText="Show package contents on the shipping labels"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {operationType === "selected_customers" && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">Select Customers</Text>
                    <Checkbox
                      label={`Select All (${customers.length})`}
                      checked={selectedCustomers.length === customers.length}
                      indeterminate={selectedCustomers.length > 0 && selectedCustomers.length < customers.length}
                      onChange={handleSelectAllCustomers}
                    />
                  </InlineStack>
                  
                  <Text variant="bodyMd" as="p" tone="subdued">
                    {selectedCustomers.length} of {customers.length} customers selected
                  </Text>
                  
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'numeric', 'text']}
                    headings={['Select', 'Name', 'Email', 'Location', 'Labels', 'Address']}
                    rows={customerRows}
                  />
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {operationType === "selected_orders" && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">Select Orders</Text>
                    <Checkbox
                      label={`Select All (${orders.length})`}
                      checked={selectedOrders.length === orders.length}
                      indeterminate={selectedOrders.length > 0 && selectedOrders.length < orders.length}
                      onChange={handleSelectAllOrders}
                    />
                  </InlineStack>
                  
                  <Text variant="bodyMd" as="p" tone="subdued">
                    {selectedOrders.length} of {orders.length} orders selected
                  </Text>
                  
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'numeric', 'text']}
                    headings={['Select', 'Order Number', 'Customer', 'Shipping Location', 'Labels', 'Address']}
                    rows={orderRows}
                  />
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {operationType === "csv_data" && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">CSV Data</Text>
                  
                  <Text variant="bodyMd" as="p">
                    Provide CSV data with the following columns: name, phone, address_1, address_2, city, state, pincode, tracking_id, courier
                  </Text>
                  
                  <TextField
                    label="CSV Data"
                    value={csvData}
                    onChange={setCsvData}
                    multiline={10}
                    placeholder="name,phone,address_1,city,state,pincode,tracking_id,courier
John Doe,+919876543210,123 Main St,Mumbai,Maharashtra,400001,TRK123,bluedart
Jane Smith,+919876543211,456 Oak Ave,Delhi,Delhi,110001,TRK124,dtdc"
                    helpText="Include header row with column names"
                  />
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Form>

        {/* Recent Operations */}
        {recentOperations.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Recent Bulk Operations</Text>
                
                <BlockStack gap="200">
                  {recentOperations.map((operation) => (
                    <Card key={operation.id} sectioned>
                      <InlineStack align="space-between">
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="semibold" as="p">
                            {operation.operationType.replace('_', ' ').toUpperCase()} - {operation.totalItems} items
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
      </Layout>
    </Page>
  );
}