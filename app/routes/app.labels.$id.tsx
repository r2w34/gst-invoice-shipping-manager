import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigate, useSearchParams, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  ButtonGroup,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Modal,
  Toast,
  Frame,
  Banner,
  Select,
  TextField,
  FormLayout,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { getShippingLabel, updateShippingLabel, deleteShippingLabel } from "../models/ShippingLabel.server";
import Icon3D from "../components/Icon3D";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const labelId = params.id!;
  
  const label = await getShippingLabel(labelId, session.shop);
  
  if (!label) {
    throw new Response("Shipping label not found", { status: 404 });
  }

  const url = new URL(request.url);
  const created = url.searchParams.get("created") === "true";

  return json({ label, created });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const labelId = params.id!;
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    if (action === "updateStatus") {
      const status = formData.get("status")?.toString();
      const trackingId = formData.get("trackingId")?.toString();
      
      if (!status) {
        return json({ success: false, error: "Status is required" });
      }

      await updateShippingLabel(session.shop, labelId, { 
        status,
        ...(trackingId && { trackingId })
      });
      
      return json({ success: true, message: "Label updated successfully" });
    }
    
    if (action === "delete") {
      await deleteShippingLabel(session.shop, labelId);
      return json({ success: true, redirect: "/app/labels" });
    }

    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Error updating shipping label:", error);
    return json({ success: false, error: "Failed to update label" });
  }
};

export default function ShippingLabelDetail() {
  const { label, created } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State management
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(label.status);
  const [trackingId, setTrackingId] = useState(label.trackingId || "");
  const [showToast, setShowToast] = useState(created);
  const [toastMessage, setToastMessage] = useState(
    created ? "Shipping label created successfully!" : ""
  );

  // Handle action results
  if (actionData?.success && actionData.redirect) {
    navigate(actionData.redirect);
  }

  if (actionData?.success && actionData.message) {
    setToastMessage(actionData.message);
    setShowToast(true);
  }

  // Status configuration
  const statusConfig = {
    draft: { 
      status: "info" as const, 
      text: "Draft",
      color: "#6B7280",
      nextActions: ["printed", "shipped"]
    },
    printed: { 
      status: "attention" as const, 
      text: "Printed",
      color: "#F59E0B",
      nextActions: ["shipped"]
    },
    shipped: { 
      status: "success" as const, 
      text: "Shipped",
      color: "#10B981",
      nextActions: ["delivered"]
    },
    delivered: { 
      status: "success" as const, 
      text: "Delivered",
      color: "#059669",
      nextActions: []
    },
  };

  const currentStatusConfig = statusConfig[label.status as keyof typeof statusConfig] || statusConfig.draft;

  // Status options for update
  const statusOptions = [
    { label: "Draft", value: "draft" },
    { label: "Printed", value: "printed" },
    { label: "Shipped", value: "shipped" },
    { label: "Delivered", value: "delivered" },
  ];

  // Handle status update
  const handleStatusUpdate = useCallback(async () => {
    const formData = new FormData();
    formData.append("action", "updateStatus");
    formData.append("status", selectedStatus);
    if (trackingId) {
      formData.append("trackingId", trackingId);
    }
    
    const response = await fetch("", {
      method: "POST",
      body: formData,
    });
    
    const result = await response.json();
    if (result.success) {
      setShowUpdateModal(false);
      navigate(".", { replace: true }); // Refresh data
    }
  }, [selectedStatus, trackingId, navigate]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    const formData = new FormData();
    formData.append("action", "delete");
    
    const response = await fetch("", {
      method: "POST",
      body: formData,
    });
    
    const result = await response.json();
    if (result.success) {
      navigate("/app/labels");
    }
  }, [navigate]);

  // Download handlers
  const handleDownloadPDF = useCallback(() => {
    window.open(`/app/labels/${label.id}/download`, "_blank");
  }, [label.id]);

  const handlePrint = useCallback(() => {
    window.open(`/app/labels/${label.id}/print`, "_blank");
  }, [label.id]);

  return (
    <Frame>
      <Page
        title={`Shipping Label ${label.labelNumber}`}
        backAction={{
          content: "Back to labels",
          onAction: () => navigate("/app/labels"),
        }}
        primaryAction={{
          content: "Download PDF",
          icon: <Icon3D name="download" size="small" />,
          onAction: handleDownloadPDF,
        }}
        secondaryActions={[
          {
            content: "Print Label",
            icon: <Icon3D name="print" size="small" />,
            onAction: handlePrint,
          },
          {
            content: "Update Status",
            icon: <Icon3D name="edit" size="small" />,
            onAction: () => setShowUpdateModal(true),
          },
          {
            content: "Delete",
            icon: <Icon3D name="delete" size="small" />,
            destructive: true,
            onAction: () => setShowDeleteModal(true),
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Status Banner */}
              <Card>
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">Label Status</Text>
                    <InlineStack gap="300" align="center">
                      <Badge status={currentStatusConfig.status}>
                        {currentStatusConfig.text}
                      </Badge>
                      <Text as="span" variant="bodyMd" tone="subdued">
                        Created on {new Date(label.createdAt).toLocaleDateString()}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                  
                  <Icon3D name="shipping" size="large" />
                </InlineStack>
              </Card>

              {/* Order Information */}
              {label.orderId && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      <InlineStack gap="200" align="center">
                        <Icon3D name="package" size="medium" />
                        Order Information
                      </InlineStack>
                    </Text>
                    
                    <InlineStack gap="400">
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">Order ID</Text>
                        <Text as="dd" variant="bodyMd" fontWeight="semibold">
                          {label.orderId}
                        </Text>
                      </Box>
                    </InlineStack>
                  </BlockStack>
                </Card>
              )}

              {/* Customer Information */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="customer" size="medium" />
                      Customer Information
                    </InlineStack>
                  </Text>
                  
                  <InlineStack gap="600" wrap={false}>
                    <BlockStack gap="300">
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">Name</Text>
                        <Text as="dd" variant="bodyMd" fontWeight="semibold">
                          {label.customerName}
                        </Text>
                      </Box>
                      
                      {label.customerEmail && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">Email</Text>
                          <Text as="dd" variant="bodyMd">
                            {label.customerEmail}
                          </Text>
                        </Box>
                      )}
                      
                      {label.customerPhone && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">Phone</Text>
                          <Text as="dd" variant="bodyMd">
                            {label.customerPhone}
                          </Text>
                        </Box>
                      )}
                    </BlockStack>
                    
                    <BlockStack gap="300">
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">Address</Text>
                        <Text as="dd" variant="bodyMd">
                          {label.customerAddress}
                        </Text>
                      </Box>
                      
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">City, State</Text>
                        <Text as="dd" variant="bodyMd">
                          {label.customerCity}, {label.customerState}
                        </Text>
                      </Box>
                      
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">Pincode</Text>
                        <Text as="dd" variant="bodyMd" fontWeight="semibold">
                          {label.customerPincode}
                        </Text>
                      </Box>
                    </BlockStack>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* Shipping Details */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="truck" size="medium" />
                      Shipping Details
                    </InlineStack>
                  </Text>
                  
                  <InlineStack gap="600" wrap={false}>
                    <BlockStack gap="300">
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">Tracking ID</Text>
                        <Text as="dd" variant="bodyMd" fontWeight="semibold">
                          {label.trackingId || "Not assigned"}
                        </Text>
                      </Box>
                      
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">Courier Service</Text>
                        <Text as="dd" variant="bodyMd">
                          {label.courierService || "Not specified"}
                        </Text>
                      </Box>
                      
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">Weight</Text>
                        <Text as="dd" variant="bodyMd">
                          {label.weight} kg
                        </Text>
                      </Box>
                    </BlockStack>
                    
                    <BlockStack gap="300">
                      {label.dimensions && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">Dimensions</Text>
                          <Text as="dd" variant="bodyMd">
                            {label.dimensions} cm
                          </Text>
                        </Box>
                      )}
                      
                      {label.isCod && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">COD Amount</Text>
                          <Text as="dd" variant="bodyMd" fontWeight="semibold">
                            ₹{label.codAmount?.toFixed(2) || "0.00"}
                          </Text>
                        </Box>
                      )}
                      
                      <InlineStack gap="200">
                        {label.isCod && (
                          <Badge status="attention">COD</Badge>
                        )}
                        {label.isFragile && (
                          <Badge status="warning">Fragile</Badge>
                        )}
                      </InlineStack>
                    </BlockStack>
                  </InlineStack>
                  
                  {label.specialInstructions && (
                    <>
                      <Divider />
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">Special Instructions</Text>
                        <Text as="dd" variant="bodyMd">
                          {label.specialInstructions}
                        </Text>
                      </Box>
                    </>
                  )}
                </BlockStack>
              </Card>

              {/* Quick Actions */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Quick Actions</Text>
                  
                  <InlineStack gap="300">
                    <Button
                      variant="primary"
                      icon={<Icon3D name="download" size="small" />}
                      onClick={handleDownloadPDF}
                    >
                      Download PDF
                    </Button>
                    
                    <Button
                      icon={<Icon3D name="print" size="small" />}
                      onClick={handlePrint}
                    >
                      Print Label
                    </Button>
                    
                    <Button
                      icon={<Icon3D name="email" size="small" />}
                      onClick={() => console.log("Email label")}
                    >
                      Email to Customer
                    </Button>
                    
                    <Button
                      icon={<Icon3D name="whatsapp" size="small" />}
                      onClick={() => console.log("WhatsApp label")}
                    >
                      Send via WhatsApp
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Sidebar */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Label Preview */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="barcode" size="medium" />
                      Label Preview
                    </InlineStack>
                  </Text>
                  
                  <Box
                    padding="400"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <BlockStack gap="200" align="center">
                      <Icon3D name="barcode" size="large" />
                      <Text as="p" variant="bodyMd" alignment="center">
                        Label preview will be generated when downloaded
                      </Text>
                      <Button
                        size="micro"
                        onClick={handleDownloadPDF}
                      >
                        Generate Preview
                      </Button>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>

              {/* Status History */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="clock" size="medium" />
                      Status History
                    </InlineStack>
                  </Text>
                  
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="center">
                      <Badge status={currentStatusConfig.status}>
                        {currentStatusConfig.text}
                      </Badge>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Current status
                      </Text>
                    </InlineStack>
                    
                    <Text as="p" variant="bodySm" tone="subdued">
                      Created: {new Date(label.createdAt).toLocaleString()}
                    </Text>
                    
                    {label.updatedAt !== label.createdAt && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Updated: {new Date(label.updatedAt).toLocaleString()}
                      </Text>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Actions */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Actions</Text>
                  
                  <BlockStack gap="200">
                    <Button
                      fullWidth
                      icon={<Icon3D name="edit" size="small" />}
                      onClick={() => setShowUpdateModal(true)}
                    >
                      Update Status
                    </Button>
                    
                    <Button
                      fullWidth
                      icon={<Icon3D name="copy" size="small" />}
                      onClick={() => navigate(`/app/labels/new?duplicate=${label.id}`)}
                    >
                      Duplicate Label
                    </Button>
                    
                    <Button
                      fullWidth
                      tone="critical"
                      icon={<Icon3D name="delete" size="small" />}
                      onClick={() => setShowDeleteModal(true)}
                    >
                      Delete Label
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

        {/* Update Status Modal */}
        <Modal
          open={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          title="Update Label Status"
          primaryAction={{
            content: "Update",
            onAction: handleStatusUpdate,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowUpdateModal(false),
            },
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <Select
                label="Status"
                options={statusOptions}
                value={selectedStatus}
                onChange={setSelectedStatus}
              />
              
              <TextField
                label="Tracking ID"
                value={trackingId}
                onChange={setTrackingId}
                placeholder="Enter tracking ID"
                helpText="Update tracking ID if available"
                autoComplete="off"
              />
            </FormLayout>
          </Modal.Section>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete shipping label"
          primaryAction={{
            content: "Delete",
            destructive: true,
            onAction: handleDelete,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowDeleteModal(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              Are you sure you want to delete this shipping label? This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>

        {/* Toast */}
        {showToast && (
          <Toast
            content={toastMessage}
            onDismiss={() => setShowToast(false)}
          />
        )}
      </Page>
    </Frame>
  );
}