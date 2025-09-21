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

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Get labels without tracking IDs
  const labelsWithoutTracking = await prisma.shippingLabel.findMany({
    where: { 
      shopId: shop.id,
      trackingId: null
    },
    include: {
      customer: true,
      order: true
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Get all labels for tracking updates
  const allLabels = await prisma.shippingLabel.findMany({
    where: { shopId: shop.id },
    include: {
      customer: true,
      order: true
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Get recent bulk operations
  const recentOperations = await prisma.bulkOperation.findMany({
    where: { 
      shopId: shop.id,
      operationType: { in: ['bulk_tracking_assign', 'bulk_tracking_update', 'bulk_tracking_csv'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return json({
    shop,
    labelsWithoutTracking,
    allLabels,
    recentOperations,
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
    
    if (operationType === "assign_tracking") {
      return await handleAssignTrackingIds(formData, shop);
    } else if (operationType === "update_tracking") {
      return await handleUpdateTrackingStatus(formData, shop);
    } else if (operationType === "csv_tracking") {
      return await handleCSVTrackingImport(formData, shop);
    } else {
      return json({ 
        error: "Invalid operation type" 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Error processing bulk tracking operation:", error);
    return json({ 
      error: "Failed to process bulk tracking operation. Please try again." 
    }, { status: 500 });
  }
};

async function handleAssignTrackingIds(formData, shop) {
  const selectedLabels = JSON.parse(formData.get("selectedLabels") || "[]");
  const trackingData = {
    courierName: formData.get("courierName"),
    trackingPrefix: formData.get("trackingPrefix") || "",
    startingNumber: parseInt(formData.get("startingNumber")) || 1,
    updateStatus: formData.get("updateStatus") === "true"
  };

  if (selectedLabels.length === 0) {
    return json({ 
      error: "Please select at least one label" 
    }, { status: 400 });
  }

  if (!trackingData.courierName) {
    return json({ 
      error: "Please select a courier service" 
    }, { status: 400 });
  }

  // Create bulk operation record
  const bulkOperation = await prisma.bulkOperation.create({
    data: {
      shopId: shop.id,
      operationType: 'bulk_tracking_assign',
      totalItems: selectedLabels.length,
      processedItems: 0,
      status: 'processing',
      metadata: JSON.stringify({
        trackingData,
        selectedLabels
      })
    }
  });

  const results = {
    updated: 0,
    errors: []
  };

  // Process tracking assignments
  for (let i = 0; i < selectedLabels.length; i++) {
    const labelId = selectedLabels[i];
    
    try {
      const label = await prisma.shippingLabel.findUnique({
        where: { id: labelId }
      });

      if (!label) {
        results.errors.push(`Label ${labelId} not found`);
        continue;
      }

      // Generate tracking ID
      const trackingNumber = trackingData.startingNumber + i;
      const trackingId = `${trackingData.trackingPrefix}${trackingNumber.toString().padStart(6, '0')}`;

      // Update label
      const updateData = {
        trackingId,
        courierName: trackingData.courierName
      };

      if (trackingData.updateStatus) {
        updateData.status = 'shipped';
      }

      await prisma.shippingLabel.update({
        where: { id: labelId },
        data: updateData
      });

      results.updated++;

    } catch (error) {
      console.error(`Error updating label ${labelId}:`, error);
      results.errors.push(`Failed to update label ${labelId}: ${error.message}`);
    }
  }

  // Update bulk operation
  await prisma.bulkOperation.update({
    where: { id: bulkOperation.id },
    data: {
      processedItems: results.updated,
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

async function handleUpdateTrackingStatus(formData, shop) {
  const selectedLabels = JSON.parse(formData.get("selectedLabels") || "[]");
  const newStatus = formData.get("newStatus");

  if (selectedLabels.length === 0) {
    return json({ 
      error: "Please select at least one label" 
    }, { status: 400 });
  }

  if (!newStatus) {
    return json({ 
      error: "Please select a status to update" 
    }, { status: 400 });
  }

  // Create bulk operation record
  const bulkOperation = await prisma.bulkOperation.create({
    data: {
      shopId: shop.id,
      operationType: 'bulk_tracking_update',
      totalItems: selectedLabels.length,
      processedItems: 0,
      status: 'processing',
      metadata: JSON.stringify({
        newStatus,
        selectedLabels
      })
    }
  });

  const results = {
    updated: 0,
    errors: []
  };

  // Process status updates
  for (const labelId of selectedLabels) {
    try {
      const label = await prisma.shippingLabel.findUnique({
        where: { id: labelId }
      });

      if (!label) {
        results.errors.push(`Label ${labelId} not found`);
        continue;
      }

      // Update label status
      await prisma.shippingLabel.update({
        where: { id: labelId },
        data: { status: newStatus }
      });

      results.updated++;

    } catch (error) {
      console.error(`Error updating label ${labelId}:`, error);
      results.errors.push(`Failed to update label ${labelId}: ${error.message}`);
    }
  }

  // Update bulk operation
  await prisma.bulkOperation.update({
    where: { id: bulkOperation.id },
    data: {
      processedItems: results.updated,
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

async function handleCSVTrackingImport(formData, shop) {
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
      operationType: 'bulk_tracking_csv',
      totalItems: dataRows.length,
      processedItems: 0,
      status: 'processing',
      metadata: JSON.stringify({ csvData })
    }
  });

  const results = {
    updated: 0,
    errors: []
  };

  // Process each row
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    
    try {
      // Map CSV columns to tracking data
      const trackingData = {};
      headers.forEach((header, index) => {
        const value = row[index];
        
        if (header.includes('label') && header.includes('number')) {
          trackingData.labelNumber = value;
        } else if (header.includes('tracking') && header.includes('id')) {
          trackingData.trackingId = value;
        } else if (header.includes('courier')) {
          trackingData.courierName = value;
        } else if (header.includes('status')) {
          trackingData.status = value;
        }
      });

      // Find label by label number
      const label = await prisma.shippingLabel.findFirst({
        where: {
          shopId: shop.id,
          labelNumber: trackingData.labelNumber
        }
      });

      if (!label) {
        results.errors.push(`Row ${i + 2}: Label ${trackingData.labelNumber} not found`);
        continue;
      }

      // Update label with tracking information
      const updateData = {};
      if (trackingData.trackingId) updateData.trackingId = trackingData.trackingId;
      if (trackingData.courierName) updateData.courierName = trackingData.courierName;
      if (trackingData.status) updateData.status = trackingData.status;

      if (Object.keys(updateData).length === 0) {
        results.errors.push(`Row ${i + 2}: No valid tracking data provided`);
        continue;
      }

      await prisma.shippingLabel.update({
        where: { id: label.id },
        data: updateData
      });

      results.updated++;

    } catch (error) {
      console.error(`Error processing row ${i + 2}:`, error);
      results.errors.push(`Row ${i + 2}: ${error.message}`);
    }
  }

  // Update bulk operation
  await prisma.bulkOperation.update({
    where: { id: bulkOperation.id },
    data: {
      processedItems: results.updated,
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

export default function BulkTracking() {
  const { shop, labelsWithoutTracking, allLabels, recentOperations, courierOptions } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [operationType, setOperationType] = useState("assign_tracking");
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [csvData, setCsvData] = useState("");
  
  // Tracking form data
  const [courierName, setCourierName] = useState("");
  const [trackingPrefix, setTrackingPrefix] = useState("");
  const [startingNumber, setStartingNumber] = useState("1");
  const [updateStatus, setUpdateStatus] = useState(true);
  const [newStatus, setNewStatus] = useState("shipped");

  const operationTypeOptions = [
    { label: "Assign Tracking IDs", value: "assign_tracking" },
    { label: "Update Tracking Status", value: "update_tracking" },
    { label: "CSV Import", value: "csv_tracking" }
  ];

  const statusOptions = [
    { label: "Created", value: "created" },
    { label: "Printed", value: "printed" },
    { label: "Shipped", value: "shipped" },
    { label: "Delivered", value: "delivered" }
  ];

  const handleLabelSelection = useCallback((labelId, checked) => {
    if (checked) {
      setSelectedLabels(prev => [...prev, labelId]);
    } else {
      setSelectedLabels(prev => prev.filter(id => id !== labelId));
    }
  }, []);

  const handleSelectAll = useCallback((checked) => {
    const labelsToUse = operationType === "assign_tracking" ? labelsWithoutTracking : allLabels;
    if (checked) {
      setSelectedLabels(labelsToUse.map(label => label.id));
    } else {
      setSelectedLabels([]);
    }
  }, [operationType, labelsWithoutTracking, allLabels]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { status: 'info', children: 'Pending' },
      processing: { status: 'attention', children: 'Processing' },
      completed: { status: 'success', children: 'Completed' },
      completed_with_errors: { status: 'warning', children: 'Completed with Errors' },
      failed: { status: 'critical', children: 'Failed' },
      created: { status: 'info', children: 'Created' },
      printed: { status: 'attention', children: 'Printed' },
      shipped: { status: 'success', children: 'Shipped' },
      delivered: { status: 'success', children: 'Delivered' }
    };
    return <Badge {...statusConfig[status]} />;
  };

  const labelsToShow = operationType === "assign_tracking" ? labelsWithoutTracking : allLabels;
  
  const labelRows = labelsToShow.map((label) => [
    <Checkbox
      checked={selectedLabels.includes(label.id)}
      onChange={(checked) => handleLabelSelection(label.id, checked)}
    />,
    label.labelNumber,
    label.recipientName,
    `${label.shippingCity}, ${label.shippingState}`,
    label.trackingId || '-',
    label.courierName || '-',
    getStatusBadge(label.status)
  ]);

  const isFormValid = () => {
    if (operationType === "csv_tracking") {
      return csvData.trim().length > 0;
    }
    return selectedLabels.length > 0;
  };

  return (
    <Page
      title="Bulk Tracking Management"
      backAction={{ url: "/app/bulk" }}
      primaryAction={{
        content: "Process Tracking",
        loading: isSubmitting,
        disabled: !isFormValid(),
        onAction: () => {
          document.getElementById("bulk-tracking-form").requestSubmit();
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
                Bulk tracking operation completed! {actionData.results.updated} labels updated.
              </p>
              {actionData.results.errors.length > 0 && (
                <p>
                  {actionData.results.errors.length} errors occurred. Check the operation details for more information.
                </p>
              )}
            </Banner>
          </Layout.Section>
        )}

        <Form method="post" id="bulk-tracking-form">
          <input type="hidden" name="operationType" value={operationType} />
          <input type="hidden" name="selectedLabels" value={JSON.stringify(selectedLabels)} />
          <input type="hidden" name="csvData" value={csvData} />
          <input type="hidden" name="updateStatus" value={updateStatus} />

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Operation Type</Text>
                
                <Select
                  label="Choose operation type"
                  options={operationTypeOptions}
                  value={operationType}
                  onChange={(value) => {
                    setOperationType(value);
                    setSelectedLabels([]);
                  }}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {operationType === "assign_tracking" && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Tracking Assignment Settings</Text>
                  
                  <FormLayout>
                    <Select
                      label="Courier Service"
                      name="courierName"
                      options={courierOptions}
                      value={courierName}
                      onChange={setCourierName}
                      required
                    />
                    
                    <FormLayout.Group>
                      <TextField
                        label="Tracking ID Prefix"
                        name="trackingPrefix"
                        value={trackingPrefix}
                        onChange={setTrackingPrefix}
                        placeholder="TRK"
                        helpText="Optional prefix for tracking IDs"
                      />
                      <TextField
                        label="Starting Number"
                        name="startingNumber"
                        type="number"
                        value={startingNumber}
                        onChange={setStartingNumber}
                        min="1"
                        helpText="Starting number for sequential tracking IDs"
                      />
                    </FormLayout.Group>
                    
                    <Checkbox
                      label="Update label status to 'Shipped'"
                      checked={updateStatus}
                      onChange={setUpdateStatus}
                      helpText="Automatically update label status when assigning tracking IDs"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {operationType === "update_tracking" && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Status Update Settings</Text>
                  
                  <Select
                    label="New Status"
                    name="newStatus"
                    options={statusOptions}
                    value={newStatus}
                    onChange={setNewStatus}
                    helpText="Status to apply to selected labels"
                  />
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {operationType === "csv_tracking" && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">CSV Tracking Import</Text>
                  
                  <Text variant="bodyMd" as="p">
                    Provide CSV data with the following columns: label_number, tracking_id, courier, status
                  </Text>
                  
                  <TextField
                    label="CSV Data"
                    value={csvData}
                    onChange={setCsvData}
                    multiline={10}
                    placeholder="label_number,tracking_id,courier,status
LBL000001,TRK123456,bluedart,shipped
LBL000002,TRK123457,dtdc,shipped"
                    helpText="Include header row with column names"
                  />
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {(operationType === "assign_tracking" || operationType === "update_tracking") && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">
                      Select Labels {operationType === "assign_tracking" ? "(Without Tracking)" : ""}
                    </Text>
                    <Checkbox
                      label={`Select All (${labelsToShow.length})`}
                      checked={selectedLabels.length === labelsToShow.length}
                      indeterminate={selectedLabels.length > 0 && selectedLabels.length < labelsToShow.length}
                      onChange={handleSelectAll}
                    />
                  </InlineStack>
                  
                  <Text variant="bodyMd" as="p" tone="subdued">
                    {selectedLabels.length} of {labelsToShow.length} labels selected
                  </Text>
                  
                  {labelsToShow.length > 0 ? (
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                      headings={['Select', 'Label Number', 'Recipient', 'Destination', 'Tracking ID', 'Courier', 'Status']}
                      rows={labelRows}
                    />
                  ) : (
                    <Text variant="bodyMd" as="p" tone="subdued">
                      {operationType === "assign_tracking" 
                        ? "No labels without tracking IDs found."
                        : "No labels found."
                      }
                    </Text>
                  )}
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