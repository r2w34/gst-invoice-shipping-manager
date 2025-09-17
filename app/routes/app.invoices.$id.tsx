import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  ButtonGroup,
  InlineStack,
  BlockStack,
  Text,
  Badge,
  Divider,
  DataTable,
  Modal,
  Banner,
  TextField,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getInvoiceById, updateInvoice, deleteInvoice } from "../models/Invoice.server";
import { getAppSettings } from "../models/AppSettings.server";
import { InvoiceIcon, AnimatedIcon3D } from "../components/Icon3D";
import PDFGenerator from "../services/PDFGenerator.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const invoiceId = params.id;
  
  if (!invoiceId) {
    throw new Response("Invoice ID is required", { status: 400 });
  }
  
  const invoice = await getInvoiceById(invoiceId);
  const settings = await getAppSettings(session.shop);
  
  if (!invoice) {
    throw new Response("Invoice not found", { status: 404 });
  }
  
  return json({ invoice, settings });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const invoiceId = params.id;
  
  try {
    if (action === "updateStatus") {
      const status = formData.get("status");
      await updateInvoice(invoiceId, { status });
      return json({ success: true, message: "Invoice status updated successfully" });
    }
    
    if (action === "delete") {
      await deleteInvoice(invoiceId);
      return redirect("/app/invoices");
    }
    
    if (action === "downloadPDF") {
      const invoice = await getInvoiceById(invoiceId);
      const settings = await getAppSettings(session.shop);
      
      const pdfGenerator = new PDFGenerator();
      const pdfBuffer = await pdfGenerator.generateInvoicePDF(invoice, settings);
      
      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="invoice_${invoice.invoiceNumber}.pdf"`
        }
      });
    }
    
    if (action === "sendEmail") {
      // TODO: Implement email sending
      return json({ success: true, message: "Email sent successfully (feature coming soon)" });
    }
    
    if (action === "sendWhatsApp") {
      // TODO: Implement WhatsApp sending
      return json({ success: true, message: "WhatsApp sent successfully (feature coming soon)" });
    }
    
  } catch (error) {
    console.error("Invoice action error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
  
  return json({ success: false, error: "Invalid action" }, { status: 400 });
};

export default function InvoiceDetail() {
  const { invoice, settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(invoice.status);

  const isLoading = navigation.state === "loading" || navigation.state === "submitting";

  const handleDownloadPDF = () => {
    const formData = new FormData();
    formData.append("action", "downloadPDF");
    submit(formData, { method: "post" });
  };

  const handleSendEmail = () => {
    const formData = new FormData();
    formData.append("action", "sendEmail");
    submit(formData, { method: "post" });
  };

  const handleSendWhatsApp = () => {
    const formData = new FormData();
    formData.append("action", "sendWhatsApp");
    submit(formData, { method: "post" });
  };

  const handleUpdateStatus = () => {
    const formData = new FormData();
    formData.append("action", "updateStatus");
    formData.append("status", newStatus);
    submit(formData, { method: "post" });
    setStatusModalOpen(false);
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("action", "delete");
    submit(formData, { method: "post" });
  };

  const getStatusBadgeTone = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'overdue': return 'critical';
      case 'draft': return 'attention';
      default: return 'info';
    }
  };

  // Prepare items table data
  const itemRows = invoice.items.map((item, index) => [
    (index + 1).toString(),
    item.description || item.name,
    item.hsnCode || 'N/A',
    item.quantity.toString(),
    `₹${item.rate.toFixed(2)}`,
    `₹${(item.quantity * item.rate).toFixed(2)}`
  ]);

  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' },
  ];

  return (
    <Page
      backAction={{
        content: 'Invoices',
        onAction: () => window.location.href = '/app/invoices',
      }}
    >
      <TitleBar title={`Invoice ${invoice.invoiceNumber}`} />
      
      <BlockStack gap="500">
        {actionData?.success === false && (
          <Banner tone="critical" title="Error">
            {actionData.error}
          </Banner>
        )}
        
        {actionData?.success === true && (
          <Banner tone="success" title="Success">
            {actionData.message}
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                {/* Header */}
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="300" blockAlign="center">
                    <InvoiceIcon size="large" />
                    <BlockStack gap="100">
                      <Text as="h1" variant="headingLg">
                        Invoice {invoice.invoiceNumber}
                      </Text>
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone={getStatusBadgeTone(invoice.status)}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Created on {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                        </Text>
                      </InlineStack>
                    </BlockStack>
                  </InlineStack>
                  
                  <ButtonGroup>
                    <Button onClick={handleDownloadPDF} loading={isLoading}>
                      <InlineStack gap="100" blockAlign="center">
                        <AnimatedIcon3D name="download" size="small" />
                        Download PDF
                      </InlineStack>
                    </Button>
                    <Button onClick={handleSendEmail} loading={isLoading}>
                      <InlineStack gap="100" blockAlign="center">
                        <AnimatedIcon3D name="notification" size="small" />
                        Email
                      </InlineStack>
                    </Button>
                    <Button onClick={handleSendWhatsApp} loading={isLoading}>
                      <InlineStack gap="100" blockAlign="center">
                        <AnimatedIcon3D name="contact" size="small" />
                        WhatsApp
                      </InlineStack>
                    </Button>
                    <Button onClick={() => setStatusModalOpen(true)}>
                      Update Status
                    </Button>
                    <Button 
                      tone="critical" 
                      onClick={() => setDeleteModalOpen(true)}
                    >
                      Delete
                    </Button>
                  </ButtonGroup>
                </InlineStack>

                <Divider />

                {/* Invoice Details */}
                <Layout>
                  <Layout.Section oneHalf>
                    <Card>
                      <BlockStack gap="300">
                        <Text as="h2" variant="headingMd">Invoice Details</Text>
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <Text as="dt" variant="bodyMd" tone="subdued">Invoice Number:</Text>
                            <Text as="dd" variant="bodyMd">{invoice.invoiceNumber}</Text>
                          </InlineStack>
                          <InlineStack align="space-between">
                            <Text as="dt" variant="bodyMd" tone="subdued">Invoice Date:</Text>
                            <Text as="dd" variant="bodyMd">
                              {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                            </Text>
                          </InlineStack>
                          <InlineStack align="space-between">
                            <Text as="dt" variant="bodyMd" tone="subdued">Place of Supply:</Text>
                            <Text as="dd" variant="bodyMd">{invoice.placeOfSupply}</Text>
                          </InlineStack>
                          {invoice.orderId && (
                            <InlineStack align="space-between">
                              <Text as="dt" variant="bodyMd" tone="subdued">Order ID:</Text>
                              <Text as="dd" variant="bodyMd">{invoice.orderId}</Text>
                            </InlineStack>
                          )}
                        </BlockStack>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                  
                  <Layout.Section oneHalf>
                    <Card>
                      <BlockStack gap="300">
                        <Text as="h2" variant="headingMd">Customer Details</Text>
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <Text as="dt" variant="bodyMd" tone="subdued">Name:</Text>
                            <Text as="dd" variant="bodyMd">{invoice.customerName}</Text>
                          </InlineStack>
                          {invoice.customerGstin && (
                            <InlineStack align="space-between">
                              <Text as="dt" variant="bodyMd" tone="subdued">GSTIN:</Text>
                              <Text as="dd" variant="bodyMd">{invoice.customerGstin}</Text>
                            </InlineStack>
                          )}
                          {invoice.billingAddress && (
                            <BlockStack gap="100">
                              <Text as="dt" variant="bodyMd" tone="subdued">Billing Address:</Text>
                              <Text as="dd" variant="bodySm">
                                {invoice.billingAddress.address1}<br />
                                {invoice.billingAddress.address2 && <>{invoice.billingAddress.address2}<br /></>}
                                {invoice.billingAddress.city} - {invoice.billingAddress.pincode}<br />
                                {invoice.billingAddress.state}
                              </Text>
                            </BlockStack>
                          )}
                        </BlockStack>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                </Layout>

                {/* Items Table */}
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">Items</Text>
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'numeric', 'numeric', 'numeric']}
                      headings={['S.No', 'Description', 'HSN Code', 'Quantity', 'Rate', 'Amount']}
                      rows={itemRows}
                    />
                  </BlockStack>
                </Card>

                {/* Tax Calculations */}
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">Tax Calculations</Text>
                    <Layout>
                      <Layout.Section oneHalf>
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <Text as="dt" variant="bodyMd">Subtotal:</Text>
                            <Text as="dd" variant="bodyMd">₹{invoice.subtotal.toFixed(2)}</Text>
                          </InlineStack>
                          {invoice.discount > 0 && (
                            <InlineStack align="space-between">
                              <Text as="dt" variant="bodyMd">Discount:</Text>
                              <Text as="dd" variant="bodyMd">₹{invoice.discount.toFixed(2)}</Text>
                            </InlineStack>
                          )}
                          <InlineStack align="space-between">
                            <Text as="dt" variant="bodyMd">Taxable Amount:</Text>
                            <Text as="dd" variant="bodyMd">₹{invoice.taxableAmount.toFixed(2)}</Text>
                          </InlineStack>
                        </BlockStack>
                      </Layout.Section>
                      
                      <Layout.Section oneHalf>
                        <BlockStack gap="200">
                          {invoice.cgst > 0 && (
                            <>
                              <InlineStack align="space-between">
                                <Text as="dt" variant="bodyMd">CGST ({invoice.cgstRate}%):</Text>
                                <Text as="dd" variant="bodyMd">₹{invoice.cgst.toFixed(2)}</Text>
                              </InlineStack>
                              <InlineStack align="space-between">
                                <Text as="dt" variant="bodyMd">SGST ({invoice.sgstRate}%):</Text>
                                <Text as="dd" variant="bodyMd">₹{invoice.sgst.toFixed(2)}</Text>
                              </InlineStack>
                            </>
                          )}
                          {invoice.igst > 0 && (
                            <InlineStack align="space-between">
                              <Text as="dt" variant="bodyMd">IGST ({invoice.igstRate}%):</Text>
                              <Text as="dd" variant="bodyMd">₹{invoice.igst.toFixed(2)}</Text>
                            </InlineStack>
                          )}
                          <Divider />
                          <InlineStack align="space-between">
                            <Text as="dt" variant="headingMd">Total Amount:</Text>
                            <Text as="dd" variant="headingMd">₹{invoice.totalValue.toFixed(2)}</Text>
                          </InlineStack>
                        </BlockStack>
                      </Layout.Section>
                    </Layout>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Status Update Modal */}
        <Modal
          open={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title="Update Invoice Status"
          primaryAction={{
            content: 'Update',
            onAction: handleUpdateStatus,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setStatusModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <Select
              label="Status"
              options={statusOptions}
              value={newStatus}
              onChange={setNewStatus}
            />
          </Modal.Section>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Invoice"
          primaryAction={{
            content: 'Delete',
            destructive: true,
            onAction: handleDelete,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setDeleteModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              Are you sure you want to delete this invoice? This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}