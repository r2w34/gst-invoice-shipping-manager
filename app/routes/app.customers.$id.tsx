import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigate, useSearchParams } from "@remix-run/react";
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
  DataTable,
  EmptyState,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { getCustomer, updateCustomer, deleteCustomer, getCustomerInvoices } from "../models/Customer.server";
import Icon3D from "../components/Icon3D";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const customerId = params.id!;
  
  const customer = await getCustomer(customerId, session.shop);
  
  if (!customer) {
    throw new Response("Customer not found", { status: 404 });
  }

  // Get customer's invoices
  const invoices = await getCustomerInvoices(customerId, session.shop);

  const url = new URL(request.url);
  const created = url.searchParams.get("created") === "true";

  return json({ customer, invoices, created });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const customerId = params.id!;
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    if (action === "updateStatus") {
      const isActive = formData.get("isActive") === "true";
      
      await updateCustomer(customerId, session.shop, { isActive });
      
      return json({ success: true, message: "Customer status updated successfully" });
    }
    
    if (action === "delete") {
      await deleteCustomer(customerId, session.shop);
      return json({ success: true, redirect: "/app/customers" });
    }

    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Error updating customer:", error);
    return json({ success: false, error: "Failed to update customer" });
  }
};

export default function CustomerDetail() {
  const { customer, invoices, created } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State management
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showToast, setShowToast] = useState(created);
  const [toastMessage, setToastMessage] = useState(
    created ? "Customer created successfully!" : ""
  );

  // Handle action results
  if (actionData?.success && actionData.redirect) {
    navigate(actionData.redirect);
  }

  if (actionData?.success && actionData.message) {
    setToastMessage(actionData.message);
    setShowToast(true);
  }

  // Handle status toggle
  const handleStatusToggle = useCallback(async () => {
    const formData = new FormData();
    formData.append("action", "updateStatus");
    formData.append("isActive", (!customer.isActive).toString());
    
    const response = await fetch("", {
      method: "POST",
      body: formData,
    });
    
    const result = await response.json();
    if (result.success) {
      navigate(".", { replace: true }); // Refresh data
    }
  }, [customer.isActive, navigate]);

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
      navigate("/app/customers");
    }
  }, [navigate]);

  // Status badge
  const StatusBadge = () => {
    if (customer.isActive) {
      return <Badge status="success">Active</Badge>;
    }
    return <Badge>Inactive</Badge>;
  };

  // Invoice table for customer's invoices
  const invoiceHeadings = [
    "Invoice Number",
    "Date",
    "Amount",
    "Status",
    "Actions",
  ];

  const invoiceRows = invoices.map((invoice) => [
    <Text as="span" fontWeight="semibold">{invoice.invoiceNumber}</Text>,
    <Text as="span">{new Date(invoice.invoiceDate).toLocaleDateString()}</Text>,
    <Text as="span" fontWeight="medium">₹{invoice.totalAmount.toFixed(2)}</Text>,
    <Badge status={invoice.status === "paid" ? "success" : invoice.status === "sent" ? "attention" : "info"}>
      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
    </Badge>,
    <Button
      size="micro"
      onClick={() => navigate(`/app/invoices/${invoice.id}`)}
      icon={<Icon3D name="view" size="small" />}
    >
      View
    </Button>,
  ]);

  // Calculate customer statistics
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidInvoices = invoices.filter(inv => inv.status === "paid").length;
  const pendingAmount = invoices
    .filter(inv => inv.status !== "paid")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <Frame>
      <Page
        title={customer.name}
        backAction={{
          content: "Back to customers",
          onAction: () => navigate("/app/customers"),
        }}
        primaryAction={{
          content: "Edit Customer",
          icon: <Icon3D name="edit" size="small" />,
          onAction: () => navigate(`/app/customers/${customer.id}/edit`),
        }}
        secondaryActions={[
          {
            content: "Create Invoice",
            icon: <Icon3D name="invoice" size="small" />,
            onAction: () => navigate(`/app/invoices/new?customerId=${customer.id}`),
          },
          {
            content: "Create Label",
            icon: <Icon3D name="shipping" size="small" />,
            onAction: () => navigate(`/app/labels/new?customerId=${customer.id}`),
          },
          {
            content: customer.isActive ? "Deactivate" : "Activate",
            icon: <Icon3D name={customer.isActive ? "pause" : "play"} size="small" />,
            onAction: handleStatusToggle,
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
              {/* Customer Status */}
              <Card>
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">Customer Status</Text>
                    <InlineStack gap="300" align="center">
                      <StatusBadge />
                      <Text as="span" variant="bodyMd" tone="subdued">
                        Member since {new Date(customer.createdAt).toLocaleDateString()}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                  
                  <Icon3D name="customer" size="large" />
                </InlineStack>
              </Card>

              {/* Customer Information */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="info" size="medium" />
                      Contact Information
                    </InlineStack>
                  </Text>
                  
                  <InlineStack gap="600" wrap={false}>
                    <BlockStack gap="300">
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">Name</Text>
                        <Text as="dd" variant="bodyMd" fontWeight="semibold">
                          {customer.name}
                        </Text>
                      </Box>
                      
                      {customer.email && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">Email</Text>
                          <Text as="dd" variant="bodyMd">
                            {customer.email}
                          </Text>
                        </Box>
                      )}
                      
                      {customer.phone && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">Phone</Text>
                          <Text as="dd" variant="bodyMd">
                            {customer.phone}
                          </Text>
                        </Box>
                      )}
                      
                      {customer.gstin && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">GSTIN</Text>
                          <Text as="dd" variant="bodyMd" fontWeight="semibold">
                            {customer.gstin}
                          </Text>
                        </Box>
                      )}
                    </BlockStack>
                    
                    <BlockStack gap="300">
                      {customer.address && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">Address</Text>
                          <Text as="dd" variant="bodyMd">
                            {customer.address}
                          </Text>
                        </Box>
                      )}
                      
                      {(customer.city || customer.state) && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">City, State</Text>
                          <Text as="dd" variant="bodyMd">
                            {[customer.city, customer.state].filter(Boolean).join(", ")}
                          </Text>
                        </Box>
                      )}
                      
                      {customer.pincode && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">Pincode</Text>
                          <Text as="dd" variant="bodyMd">
                            {customer.pincode}
                          </Text>
                        </Box>
                      )}
                      
                      {customer.country && (
                        <Box>
                          <Text as="dt" variant="bodyMd" tone="subdued">Country</Text>
                          <Text as="dd" variant="bodyMd">
                            {customer.country}
                          </Text>
                        </Box>
                      )}
                    </BlockStack>
                  </InlineStack>
                  
                  {customer.notes && (
                    <>
                      <Divider />
                      <Box>
                        <Text as="dt" variant="bodyMd" tone="subdued">Notes</Text>
                        <Text as="dd" variant="bodyMd">
                          {customer.notes}
                        </Text>
                      </Box>
                    </>
                  )}
                </BlockStack>
              </Card>

              {/* Customer Statistics */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="analytics" size="medium" />
                      Order Statistics
                    </InlineStack>
                  </Text>
                  
                  <InlineStack gap="400">
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200" align="center">
                        <Text as="h3" variant="headingMd">Total Invoices</Text>
                        <Text as="p" variant="heading2xl">{totalInvoices}</Text>
                      </BlockStack>
                    </Card>
                    
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200" align="center">
                        <Text as="h3" variant="headingMd">Total Amount</Text>
                        <Text as="p" variant="heading2xl">₹{totalAmount.toFixed(2)}</Text>
                      </BlockStack>
                    </Card>
                    
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200" align="center">
                        <Text as="h3" variant="headingMd">Paid Invoices</Text>
                        <Text as="p" variant="heading2xl">{paidInvoices}</Text>
                      </BlockStack>
                    </Card>
                    
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200" align="center">
                        <Text as="h3" variant="headingMd">Pending Amount</Text>
                        <Text as="p" variant="heading2xl">₹{pendingAmount.toFixed(2)}</Text>
                      </BlockStack>
                    </Card>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* Customer Invoices */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      <InlineStack gap="200" align="center">
                        <Icon3D name="invoice" size="medium" />
                        Recent Invoices
                      </InlineStack>
                    </Text>
                    
                    <Button
                      onClick={() => navigate(`/app/invoices/new?customerId=${customer.id}`)}
                      icon={<Icon3D name="add" size="small" />}
                    >
                      Create Invoice
                    </Button>
                  </InlineStack>
                  
                  {invoices.length === 0 ? (
                    <EmptyState
                      heading="No invoices yet"
                      action={{
                        content: "Create first invoice",
                        onAction: () => navigate(`/app/invoices/new?customerId=${customer.id}`),
                      }}
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Create invoices for this customer to start tracking their orders.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "text", "numeric", "text", "text"]}
                      headings={invoiceHeadings}
                      rows={invoiceRows}
                    />
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
                      icon={<Icon3D name="invoice" size="small" />}
                      onClick={() => navigate(`/app/invoices/new?customerId=${customer.id}`)}
                    >
                      Create Invoice
                    </Button>
                    
                    <Button
                      icon={<Icon3D name="shipping" size="small" />}
                      onClick={() => navigate(`/app/labels/new?customerId=${customer.id}`)}
                    >
                      Create Shipping Label
                    </Button>
                    
                    <Button
                      icon={<Icon3D name="email" size="small" />}
                      onClick={() => console.log("Send email")}
                    >
                      Send Email
                    </Button>
                    
                    <Button
                      icon={<Icon3D name="whatsapp" size="small" />}
                      onClick={() => console.log("Send WhatsApp")}
                    >
                      Send WhatsApp
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Sidebar */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Customer Summary */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="summary" size="medium" />
                      Customer Summary
                    </InlineStack>
                  </Text>
                  
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Status</Text>
                      <StatusBadge />
                    </InlineStack>
                    
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Total Orders</Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {customer.totalOrders || 0}
                      </Text>
                    </InlineStack>
                    
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Total Spent</Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        ₹{(customer.totalSpent || 0).toFixed(2)}
                      </Text>
                    </InlineStack>
                    
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Average Order</Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        ₹{customer.totalOrders > 0 ? ((customer.totalSpent || 0) / customer.totalOrders).toFixed(2) : "0.00"}
                      </Text>
                    </InlineStack>
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
                      onClick={() => navigate(`/app/customers/${customer.id}/edit`)}
                    >
                      Edit Customer
                    </Button>
                    
                    <Button
                      fullWidth
                      icon={<Icon3D name={customer.isActive ? "pause" : "play"} size="small" />}
                      onClick={handleStatusToggle}
                    >
                      {customer.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    
                    <Button
                      fullWidth
                      icon={<Icon3D name="copy" size="small" />}
                      onClick={() => navigate(`/app/customers/new?duplicate=${customer.id}`)}
                    >
                      Duplicate Customer
                    </Button>
                    
                    <Button
                      fullWidth
                      tone="critical"
                      icon={<Icon3D name="delete" size="small" />}
                      onClick={() => setShowDeleteModal(true)}
                    >
                      Delete Customer
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

        {/* Delete Confirmation Modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete customer"
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
              Are you sure you want to delete this customer? This action cannot be undone and will also delete all associated invoices and data.
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