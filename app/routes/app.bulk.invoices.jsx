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
import { useState, useCallback, useEffect } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";
import { calculateGST, INDIAN_STATES } from "../utils/gst-calculator.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Get customers for bulk invoice generation
  const customers = await prisma.customer.findMany({
    where: { shopId: shop.id },
    include: {
      invoices: {
        select: { id: true, status: true }
      }
    },
    orderBy: { firstName: 'asc' }
  });

  // Get recent bulk operations
  const recentOperations = await prisma.bulkOperation.findMany({
    where: { 
      shopId: shop.id,
      operationType: 'bulk_invoice'
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return json({
    shop,
    customers,
    recentOperations,
    indianStates: Object.keys(INDIAN_STATES)
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
      return await handleSelectedCustomersBulkInvoice(formData, shop);
    } else if (operationType === "csv_data") {
      return await handleCSVBulkInvoice(formData, shop);
    } else {
      return json({ 
        error: "Invalid operation type" 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Error processing bulk invoice operation:", error);
    return json({ 
      error: "Failed to process bulk invoice operation. Please try again." 
    }, { status: 500 });
  }
};

async function handleSelectedCustomersBulkInvoice(formData, shop) {
  const selectedCustomers = JSON.parse(formData.get("selectedCustomers") || "[]");
  const invoiceData = {
    itemName: formData.get("itemName"),
    itemDescription: formData.get("itemDescription"),
    quantity: parseInt(formData.get("quantity")) || 1,
    unitPrice: parseFloat(formData.get("unitPrice")) || 0,
    gstRate: parseFloat(formData.get("gstRate")) || 18,
    hsnCode: formData.get("hsnCode"),
    invoiceDate: formData.get("invoiceDate") || new Date().toISOString().split('T')[0]
  };

  if (selectedCustomers.length === 0) {
    return json({ 
      error: "Please select at least one customer" 
    }, { status: 400 });
  }

  if (!invoiceData.itemName || invoiceData.unitPrice <= 0) {
    return json({ 
      error: "Please provide valid item name and unit price" 
    }, { status: 400 });
  }

  // Create bulk operation record
  const bulkOperation = await prisma.bulkOperation.create({
    data: {
      shopId: shop.id,
      operationType: 'bulk_invoice',
      totalItems: selectedCustomers.length,
      processedItems: 0,
      status: 'processing',
      metadata: JSON.stringify({
        invoiceData,
        selectedCustomers
      })
    }
  });

  // Process invoices
  const results = {
    created: 0,
    errors: []
  };

  for (const customerId of selectedCustomers) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        results.errors.push(`Customer ${customerId} not found`);
        continue;
      }

      // Calculate GST
      const gstCalculation = calculateGST(
        invoiceData.unitPrice * invoiceData.quantity,
        invoiceData.gstRate,
        shop.state || 'Maharashtra',
        customer.state || 'Maharashtra'
      );

      // Generate invoice number
      const invoiceCount = await prisma.invoice.count({
        where: { shopId: shop.id }
      });
      const invoiceNumber = `${shop.invoicePrefix || 'INV'}${(invoiceCount + results.created + 1).toString().padStart(6, '0')}`;

      // Create invoice
      await prisma.invoice.create({
        data: {
          shopId: shop.id,
          customerId: customer.id,
          invoiceNumber,
          invoiceDate: new Date(invoiceData.invoiceDate),
          items: JSON.stringify([{
            name: invoiceData.itemName,
            description: invoiceData.itemDescription,
            quantity: invoiceData.quantity,
            unitPrice: invoiceData.unitPrice,
            gstRate: invoiceData.gstRate,
            hsnCode: invoiceData.hsnCode,
            amount: invoiceData.unitPrice * invoiceData.quantity
          }]),
          subtotal: invoiceData.unitPrice * invoiceData.quantity,
          cgstAmount: gstCalculation.cgst,
          sgstAmount: gstCalculation.sgst,
          igstAmount: gstCalculation.igst,
          totalGst: gstCalculation.totalGst,
          totalAmount: gstCalculation.totalAmount,
          placeOfSupply: customer.state || 'Maharashtra',
          reverseCharge: false,
          status: 'draft',
          bulkOperationId: bulkOperation.id
        }
      });

      results.created++;

    } catch (error) {
      console.error(`Error creating invoice for customer ${customerId}:`, error);
      results.errors.push(`Failed to create invoice for customer ${customerId}: ${error.message}`);
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

async function handleCSVBulkInvoice(formData, shop) {
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
      operationType: 'bulk_invoice_csv',
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
      // Map CSV columns to invoice data
      const invoiceData = {};
      headers.forEach((header, index) => {
        const value = row[index];
        
        if (header.includes('customer') && header.includes('email')) {
          invoiceData.customerEmail = value;
        } else if (header.includes('item') && header.includes('name')) {
          invoiceData.itemName = value;
        } else if (header.includes('quantity')) {
          invoiceData.quantity = parseInt(value) || 1;
        } else if (header.includes('price') || header.includes('amount')) {
          invoiceData.unitPrice = parseFloat(value) || 0;
        } else if (header.includes('gst') && header.includes('rate')) {
          invoiceData.gstRate = parseFloat(value) || 18;
        } else if (header.includes('hsn')) {
          invoiceData.hsnCode = value;
        }
      });

      // Find customer by email
      const customer = await prisma.customer.findFirst({
        where: {
          shopId: shop.id,
          email: invoiceData.customerEmail
        }
      });

      if (!customer) {
        results.errors.push(`Row ${i + 2}: Customer with email ${invoiceData.customerEmail} not found`);
        continue;
      }

      if (!invoiceData.itemName || invoiceData.unitPrice <= 0) {
        results.errors.push(`Row ${i + 2}: Invalid item name or price`);
        continue;
      }

      // Calculate GST
      const gstCalculation = calculateGST(
        invoiceData.unitPrice * invoiceData.quantity,
        invoiceData.gstRate,
        shop.state || 'Maharashtra',
        customer.state || 'Maharashtra'
      );

      // Generate invoice number
      const invoiceCount = await prisma.invoice.count({
        where: { shopId: shop.id }
      });
      const invoiceNumber = `${shop.invoicePrefix || 'INV'}${(invoiceCount + results.created + 1).toString().padStart(6, '0')}`;

      // Create invoice
      await prisma.invoice.create({
        data: {
          shopId: shop.id,
          customerId: customer.id,
          invoiceNumber,
          invoiceDate: new Date(),
          items: JSON.stringify([{
            name: invoiceData.itemName,
            quantity: invoiceData.quantity,
            unitPrice: invoiceData.unitPrice,
            gstRate: invoiceData.gstRate,
            hsnCode: invoiceData.hsnCode,
            amount: invoiceData.unitPrice * invoiceData.quantity
          }]),
          subtotal: invoiceData.unitPrice * invoiceData.quantity,
          cgstAmount: gstCalculation.cgst,
          sgstAmount: gstCalculation.sgst,
          igstAmount: gstCalculation.igst,
          totalGst: gstCalculation.totalGst,
          totalAmount: gstCalculation.totalAmount,
          placeOfSupply: customer.state || 'Maharashtra',
          reverseCharge: false,
          status: 'draft',
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

export default function BulkInvoices() {
  const { shop, customers, recentOperations } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [operationType, setOperationType] = useState("selected_customers");
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [csvData, setCsvData] = useState("");
  
  // Invoice form data
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [hsnCode, setHsnCode] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  const operationTypeOptions = [
    { label: "Selected Customers", value: "selected_customers" },
    { label: "CSV Data", value: "csv_data" }
  ];

  const gstRateOptions = [
    { label: "0%", value: "0" },
    { label: "5%", value: "5" },
    { label: "12%", value: "12" },
    { label: "18%", value: "18" },
    { label: "28%", value: "28" }
  ];

  const handleCustomerSelection = useCallback((customerId, checked) => {
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    }
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedCustomers(customers.map(customer => customer.id));
    } else {
      setSelectedCustomers([]);
    }
  }, [customers]);

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
    customer.gstin || '-',
    `${customer.city || ''}, ${customer.state || ''}`.replace(/^, |, $/, '') || '-',
    customer.invoices.length
  ]);

  return (
    <Page
      title="Bulk Invoice Generation"
      backAction={{ url: "/app/bulk" }}
      primaryAction={{
        content: "Generate Invoices",
        loading: isSubmitting,
        disabled: operationType === "selected_customers" ? selectedCustomers.length === 0 : !csvData.trim(),
        onAction: () => {
          document.getElementById("bulk-invoice-form").requestSubmit();
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
                Bulk invoice generation completed! {actionData.results.created} invoices created.
              </p>
              {actionData.results.errors.length > 0 && (
                <p>
                  {actionData.results.errors.length} errors occurred. Check the operation details for more information.
                </p>
              )}
            </Banner>
          </Layout.Section>
        )}

        <Form method="post" id="bulk-invoice-form">
          <input type="hidden" name="operationType" value={operationType} />
          <input type="hidden" name="selectedCustomers" value={JSON.stringify(selectedCustomers)} />
          <input type="hidden" name="csvData" value={csvData} />

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

          {operationType === "selected_customers" && (
            <>
              <Layout.Section>
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">Invoice Details</Text>
                    
                    <FormLayout>
                      <FormLayout.Group>
                        <TextField
                          label="Item Name"
                          name="itemName"
                          value={itemName}
                          onChange={setItemName}
                          required
                        />
                        <TextField
                          label="HSN/SAC Code"
                          name="hsnCode"
                          value={hsnCode}
                          onChange={setHsnCode}
                        />
                      </FormLayout.Group>
                      
                      <TextField
                        label="Item Description"
                        name="itemDescription"
                        value={itemDescription}
                        onChange={setItemDescription}
                        multiline={2}
                      />
                      
                      <FormLayout.Group>
                        <TextField
                          label="Quantity"
                          name="quantity"
                          type="number"
                          value={quantity}
                          onChange={setQuantity}
                          min="1"
                        />
                        <TextField
                          label="Unit Price (₹)"
                          name="unitPrice"
                          type="number"
                          value={unitPrice}
                          onChange={setUnitPrice}
                          step="0.01"
                          min="0"
                          required
                        />
                      </FormLayout.Group>
                      
                      <FormLayout.Group>
                        <Select
                          label="GST Rate"
                          name="gstRate"
                          options={gstRateOptions}
                          value={gstRate}
                          onChange={setGstRate}
                        />
                        <TextField
                          label="Invoice Date"
                          name="invoiceDate"
                          type="date"
                          value={invoiceDate}
                          onChange={setInvoiceDate}
                        />
                      </FormLayout.Group>
                    </FormLayout>
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section>
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text variant="headingMd" as="h2">Select Customers</Text>
                      <Checkbox
                        label={`Select All (${customers.length})`}
                        checked={selectedCustomers.length === customers.length}
                        indeterminate={selectedCustomers.length > 0 && selectedCustomers.length < customers.length}
                        onChange={handleSelectAll}
                      />
                    </InlineStack>
                    
                    <Text variant="bodyMd" as="p" tone="subdued">
                      {selectedCustomers.length} of {customers.length} customers selected
                    </Text>
                    
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'numeric']}
                      headings={['Select', 'Name', 'Email', 'GSTIN', 'Location', 'Invoices']}
                      rows={customerRows}
                    />
                  </BlockStack>
                </Card>
              </Layout.Section>
            </>
          )}

          {operationType === "csv_data" && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">CSV Data</Text>
                  
                  <Text variant="bodyMd" as="p">
                    Provide CSV data with the following columns: customer_email, item_name, quantity, unit_price, gst_rate, hsn_code
                  </Text>
                  
                  <TextField
                    label="CSV Data"
                    value={csvData}
                    onChange={setCsvData}
                    multiline={10}
                    placeholder="customer_email,item_name,quantity,unit_price,gst_rate,hsn_code
john@example.com,Product A,1,1000,18,1234
jane@example.com,Product B,2,500,12,5678"
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