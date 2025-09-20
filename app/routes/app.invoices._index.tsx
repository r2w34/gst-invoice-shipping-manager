import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  ButtonGroup,
  InlineStack,
  BlockStack,
  Text,
  Badge,
  TextField,
  Select,
  Filters,
  EmptyState,
  Modal,
  Banner,
  Pagination,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getAllInvoices, deleteInvoice, bulkDeleteInvoices, getInvoice } from "../models/Invoice.server";
import { InvoiceIcon, AnimatedIcon3D } from "../components/Icon3D";
import { PDFGenerator } from "../services/pdf.server";
import { getAppSettings } from "../models/AppSettings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  
  // Get query parameters for filtering and pagination
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";
  
  const filters = {
    search,
    status,
    dateFrom,
    dateTo,
    page,
    limit
  };
  
  const { invoices, total, totalPages } = await getAllInvoices(session.shop, filters);
  
  return json({
    invoices,
    total,
    totalPages,
    currentPage: page,
    filters
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  
  try {
    if (action === "delete") {
      const invoiceId = formData.get("invoiceId");
      await deleteInvoice(invoiceId);
      return json({ success: true, message: "Invoice deleted successfully" });
    }
    
    if (action === "bulkDelete") {
      const invoiceIds = JSON.parse(formData.get("invoiceIds"));
      await bulkDeleteInvoices(invoiceIds);
      return json({ success: true, message: `${invoiceIds.length} invoices deleted successfully` });
    }
    
    if (action === "downloadPDF") {
      const invoiceId = formData.get("invoiceId") as string;
      const invoice = await getInvoice(invoiceId, session.shop);
      const settings = await getAppSettings(session.shop);

      if (!invoice) {
        return json({ success: false, error: "Invoice not found" }, { status: 404 });
      }

      const sellerAddress = settings?.sellerAddress ? JSON.parse(settings.sellerAddress) : {
        address1: "",
        city: "",
        state: "",
        pincode: "",
        country: "India"
      };

      const pdfData = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.createdAt).toLocaleDateString('en-IN'),
        customerName: invoice.customerName,
        customerGSTIN: invoice.customerGSTIN,
        billingAddress: invoice.billingAddress,
        shippingAddress: invoice.shippingAddress,
        sellerName: settings?.sellerName || "",
        sellerGSTIN: invoice.sellerGSTIN,
        sellerAddress,
        items: invoice.items.map((item: any) => ({
          description: item.description,
          hsnCode: item.hsnCode || "998314",
          quantity: item.quantity,
          unit: item.unit || "NOS",
          rate: item.rate ?? item.price ?? 0,
          discount: item.discount || 0,
          taxableValue: item.taxableValue,
          cgstRate: item.cgst > 0 ? (item.gstRate / 2) : 0,
          cgstAmount: item.cgst || 0,
          sgstRate: item.sgst > 0 ? (item.gstRate / 2) : 0,
          sgstAmount: item.sgst || 0,
          igstRate: item.igst > 0 ? item.gstRate : 0,
          igstAmount: item.igst || 0,
        })),
        totalTaxableValue: invoice.taxableValue,
        totalCGST: invoice.cgst,
        totalSGST: invoice.sgst,
        totalIGST: invoice.igst,
        totalInvoiceValue: invoice.totalValue,
        placeOfSupply: invoice.placeOfSupply,
        reverseCharge: invoice.reverseCharge || false,
      };

      const pdfBuffer = await PDFGenerator.generateGSTInvoice(pdfData);

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        },
      });
    }
    
    if (action === "bulkDownloadPDF") {
      const invoiceIds = JSON.parse(formData.get("invoiceIds") as string);
      const settings = await getAppSettings(session.shop);

      const sellerAddress = settings?.sellerAddress ? JSON.parse(settings.sellerAddress) : {
        address1: "",
        city: "",
        state: "",
        pincode: "",
        country: "India"
      };

      const invoicesData = [] as any[];
      for (const id of invoiceIds) {
        const invoice = await getInvoice(id, session.shop);
        if (invoice) {
          invoicesData.push({
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: new Date(invoice.createdAt).toLocaleDateString('en-IN'),
            customerName: invoice.customerName,
            customerGSTIN: invoice.customerGSTIN,
            billingAddress: invoice.billingAddress,
            shippingAddress: invoice.shippingAddress,
            sellerName: settings?.sellerName || "",
            sellerGSTIN: invoice.sellerGSTIN,
            sellerAddress,
            items: invoice.items.map((item: any) => ({
              description: item.description,
              hsnCode: item.hsnCode || "998314",
              quantity: item.quantity,
              unit: item.unit || "NOS",
              rate: item.rate ?? item.price ?? 0,
              discount: item.discount || 0,
              taxableValue: item.taxableValue,
              cgstRate: item.cgst > 0 ? (item.gstRate / 2) : 0,
              cgstAmount: item.cgst || 0,
              sgstRate: item.sgst > 0 ? (item.gstRate / 2) : 0,
              sgstAmount: item.sgst || 0,
              igstRate: item.igst > 0 ? item.gstRate : 0,
              igstAmount: item.igst || 0,
            })),
            totalTaxableValue: invoice.taxableValue,
            totalCGST: invoice.cgst,
            totalSGST: invoice.sgst,
            totalIGST: invoice.igst,
            totalInvoiceValue: invoice.totalValue,
            placeOfSupply: invoice.placeOfSupply,
            reverseCharge: invoice.reverseCharge || false,
          });
        }
      }

      const pdfBuffer = await PDFGenerator.generateBulkInvoices(invoicesData);

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="bulk-invoices-${Date.now()}.pdf"`,
        },
      });
    }
    
  } catch (error) {
    console.error("Invoice action error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
  
  return json({ success: false, error: "Invalid action" }, { status: 400 });
};

export default function InvoicesIndex() {
  const { invoices, total, totalPages, currentPage, filters } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(filters.search);
  const [statusFilter, setStatusFilter] = useState(filters.status);
  const [dateFromFilter, setDateFromFilter] = useState(filters.dateFrom);
  const [dateToFilter, setDateToFilter] = useState(filters.dateTo);

  const isLoading = navigation.state === "loading" || navigation.state === "submitting";

  // Handle invoice selection
  const handleSelectionChange = (selectedResources: string[]) => {
    setSelectedInvoices(selectedResources);
  };

  // Handle single invoice deletion
  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("invoiceId", invoiceToDelete);
      submit(formData, { method: "post" });
    }
    setDeleteModalOpen(false);
    setInvoiceToDelete(null);
  };

  // Handle bulk operations
  const handleBulkDelete = () => {
    if (selectedInvoices.length > 0) {
      const formData = new FormData();
      formData.append("action", "bulkDelete");
      formData.append("invoiceIds", JSON.stringify(selectedInvoices));
      submit(formData, { method: "post" });
      setSelectedInvoices([]);
    }
  };

  const handleBulkDownload = () => {
    if (selectedInvoices.length > 0) {
      const formData = new FormData();
      formData.append("action", "bulkDownloadPDF");
      formData.append("invoiceIds", JSON.stringify(selectedInvoices));
      submit(formData, { method: "post" });
    }
  };

  const handleDownloadPDF = (invoiceId: string) => {
    const formData = new FormData();
    formData.append("action", "downloadPDF");
    formData.append("invoiceId", invoiceId);
    submit(formData, { method: "post" });
  };

  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (searchValue) params.set("search", searchValue);
    if (statusFilter) params.set("status", statusFilter);
    if (dateFromFilter) params.set("dateFrom", dateFromFilter);
    if (dateToFilter) params.set("dateTo", dateToFilter);
    params.set("page", "1");
    
    window.location.href = `/app/invoices?${params.toString()}`;
  };

  const clearFilters = () => {
    setSearchValue("");
    setStatusFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    window.location.href = "/app/invoices";
  };

  // Prepare table data
  const rows = invoices.map((invoice) => [
    invoice.invoiceNumber,
    invoice.customerName,
    new Date(invoice.invoiceDate).toLocaleDateString('en-IN'),
    `₹${invoice.totalValue.toFixed(2)}`,
    <Badge key={invoice.id} tone={invoice.status === 'paid' ? 'success' : invoice.status === 'pending' ? 'attention' : 'critical'}>
      {invoice.status}
    </Badge>,
    <ButtonGroup key={invoice.id}>
      <Button 
        size="slim" 
        onClick={() => window.location.href = `/app/invoices/${invoice.id}`}
      >
        View
      </Button>
      <Button 
        size="slim" 
        onClick={() => handleDownloadPDF(invoice.id)}
        loading={isLoading}
      >
        PDF
      </Button>
      <Button 
        size="slim" 
        tone="critical"
        onClick={() => handleDeleteInvoice(invoice.id)}
      >
        Delete
      </Button>
    </ButtonGroup>
  ]);

  const resourceName = {
    singular: 'invoice',
    plural: 'invoices',
  };

  const promotedBulkActions = [
    {
      content: 'Download PDFs',
      onAction: handleBulkDownload,
    },
    {
      content: 'Delete invoices',
      onAction: handleBulkDelete,
      destructive: true,
    },
  ];

  const statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' },
  ];

  const appliedFilters = [];
  if (searchValue) appliedFilters.push({ key: 'search', label: `Search: ${searchValue}`, onRemove: () => setSearchValue('') });
  if (statusFilter) appliedFilters.push({ key: 'status', label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter('') });
  if (dateFromFilter) appliedFilters.push({ key: 'dateFrom', label: `From: ${dateFromFilter}`, onRemove: () => setDateFromFilter('') });
  if (dateToFilter) appliedFilters.push({ key: 'dateTo', label: `To: ${dateToFilter}`, onRemove: () => setDateToFilter('') });

  return (
    <Page>
      <TitleBar title="Invoices" />
      
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
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <InvoiceIcon size="large" />
                    <BlockStack gap="100">
                      <Text as="h1" variant="headingLg">
                        Invoices ({total})
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Manage your GST-compliant invoices
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <Button 
                    variant="primary" 
                    onClick={() => window.location.href = '/app/invoices/new'}
                  >
                    <InlineStack gap="100" blockAlign="center">
                      <AnimatedIcon3D name="create" size="small" />
                      Create Invoice
                    </InlineStack>
                  </Button>
                </InlineStack>

                {/* Filters */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Filters</Text>
                    <Layout>
                      <Layout.Section oneThird>
                        <TextField
                          label="Search"
                          value={searchValue}
                          onChange={setSearchValue}
                          placeholder="Search by invoice number, customer..."
                          clearButton
                          onClearButtonClick={() => setSearchValue('')}
                        />
                      </Layout.Section>
                      <Layout.Section oneThird>
                        <Select
                          label="Status"
                          options={statusOptions}
                          value={statusFilter}
                          onChange={setStatusFilter}
                        />
                      </Layout.Section>
                      <Layout.Section oneThird>
                        <InlineStack gap="200">
                          <TextField
                            label="Date From"
                            type="date"
                            value={dateFromFilter}
                            onChange={setDateFromFilter}
                          />
                          <TextField
                            label="Date To"
                            type="date"
                            value={dateToFilter}
                            onChange={setDateToFilter}
                          />
                        </InlineStack>
                      </Layout.Section>
                    </Layout>
                    <InlineStack gap="200">
                      <Button onClick={applyFilters} variant="primary">
                        Apply Filters
                      </Button>
                      <Button onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>

                {/* Applied Filters */}
                {appliedFilters.length > 0 && (
                  <Filters
                    queryValue={searchValue}
                    filters={[]}
                    appliedFilters={appliedFilters}
                    onQueryChange={setSearchValue}
                    onQueryClear={() => setSearchValue('')}
                    onClearAll={clearFilters}
                  />
                )}

                {/* Data Table */}
                {invoices.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['Invoice #', 'Customer', 'Date', 'Amount', 'Status', 'Actions']}
                    rows={rows}
                    selectable
                    selectedRows={selectedInvoices}
                    onSelectionChange={handleSelectionChange}
                    promotedBulkActions={promotedBulkActions}
                    loading={isLoading}
                  />
                ) : (
                  <EmptyState
                    heading="No invoices found"
                    action={{
                      content: 'Create Invoice',
                      onAction: () => window.location.href = '/app/invoices/new',
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Create your first GST-compliant invoice to get started.</p>
                  </EmptyState>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <InlineStack align="center">
                    <Pagination
                      hasPrevious={currentPage > 1}
                      onPrevious={() => {
                        const params = new URLSearchParams(window.location.search);
                        params.set('page', (currentPage - 1).toString());
                        window.location.href = `/app/invoices?${params.toString()}`;
                      }}
                      hasNext={currentPage < totalPages}
                      onNext={() => {
                        const params = new URLSearchParams(window.location.search);
                        params.set('page', (currentPage + 1).toString());
                        window.location.href = `/app/invoices?${params.toString()}`;
                      }}
                      label={`Page ${currentPage} of ${totalPages}`}
                    />
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Delete Confirmation Modal */}
        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Invoice"
          primaryAction={{
            content: 'Delete',
            destructive: true,
            onAction: confirmDelete,
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