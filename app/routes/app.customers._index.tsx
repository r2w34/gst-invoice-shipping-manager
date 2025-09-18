import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  ButtonGroup,
  Badge,
  Text,
  Box,
  InlineStack,
  BlockStack,
  TextField,
  Select,
  Pagination,
  Modal,
  Toast,
  Frame,
  EmptyState,
  Spinner,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticateOrBypass } from "../utils/auth.server";
import { getCustomers, deleteCustomer, exportCustomersToCSV } from "../models/Customer.server";
import Icon3D from "../components/Icon3D";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticateOrBypass(request);
  const url = new URL(request.url);
  
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const search = url.searchParams.get("search") || "";
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";

  const offset = (page - 1) * limit;
  const { customers, total } = await getCustomers(session.shop, { 
    limit, 
    offset, 
    search 
  });

  const totalPages = Math.ceil(total / limit);

  // Get customer statistics
  const stats = {
    total,
    thisMonth: customers.filter(c => {
      const createdDate = new Date(c.createdAt);
      const now = new Date();
      return createdDate.getMonth() === now.getMonth() && 
             createdDate.getFullYear() === now.getFullYear();
    }).length,
    withGSTIN: customers.filter(c => c.gstin).length,
    active: customers.filter(c => c.totalOrders > 0).length,
  };

  return json({
    customers,
    total,
    totalPages,
    currentPage: page,
    stats,
    filters: { search, sortBy, sortOrder }
  });
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticateOrBypass(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "delete") {
    const customerId = formData.get("customerId")?.toString();
    if (customerId) {
      await deleteCustomer(customerId, session.shop);
      return json({ success: true, message: "Customer deleted successfully" });
    }
  }

  if (action === "export") {
    const csvData = await exportCustomersToCSV(session.shop);
    return new Response(csvData, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=customers.csv",
      },
    });
  }

  return json({ success: false, message: "Invalid action" });
};

export default function CustomersIndex() {
  const { customers, total, totalPages, currentPage, stats, filters } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState(filters.search);
  const [sortBy, setSortBy] = useState(filters.sortBy);
  const [sortOrder, setSortOrder] = useState(filters.sortOrder);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Update URL params when filters change
  const updateFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (searchValue) params.set("search", searchValue);
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    params.set("page", "1"); // Reset to first page when filtering
    setSearchParams(params);
  }, [searchValue, sortBy, sortOrder, setSearchParams]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue, updateFilters]);

  // Handle sort changes
  const handleSortChange = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    updateFilters();
  }, [sortBy, sortOrder, updateFilters]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Handle customer deletion
  const handleDeleteCustomer = useCallback(async () => {
    if (!customerToDelete) return;
    
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("customerId", customerToDelete);
      
      const response = await fetch("", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      if (result.success) {
        setToastMessage(result.message);
        setToastActive(true);
        navigate(".", { replace: true }); // Refresh data
      }
    } catch (error) {
      setToastMessage("Error deleting customer");
      setToastActive(true);
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setCustomerToDelete(null);
    }
  }, [customerToDelete, navigate]);

  // Handle CSV export
  const handleExportCSV = useCallback(async () => {
    try {
      const formData = new FormData();
      formData.append("action", "export");
      
      const response = await fetch("", {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'customers.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setToastMessage("Customer data exported successfully");
        setToastActive(true);
      }
    } catch (error) {
      setToastMessage("Error exporting customer data");
      setToastActive(true);
    }
  }, []);

  // Customer status badge
  const CustomerStatusBadge = ({ customer }: { customer: any }) => {
    if (customer.totalOrders > 0) {
      return <Badge status="success">Active</Badge>;
    }
    return <Badge>New</Badge>;
  };

  // Table columns
  const headings = [
    { title: "Customer", sortable: true },
    { title: "Email", sortable: true },
    { title: "GSTIN", sortable: false },
    { title: "Orders", sortable: true },
    { title: "Total Spent", sortable: true },
    { title: "Status", sortable: false },
    { title: "Created", sortable: true },
    { title: "Actions", sortable: false },
  ];

  const rows = customers.map((customer) => [
    <BlockStack gap="100">
      <Text as="span" fontWeight="semibold">{customer.name}</Text>
      {customer.phone && (
        <Text as="span" variant="bodySm" tone="subdued">
          {customer.phone}
        </Text>
      )}
    </BlockStack>,
    <Text as="span">{customer.email || "No email"}</Text>,
    <Text as="span" fontWeight="medium">
      {customer.gstin || "Not provided"}
    </Text>,
    <Text as="span" alignment="center">{customer.totalOrders || 0}</Text>,
    <Text as="span" fontWeight="medium">
      ₹{(customer.totalSpent || 0).toFixed(2)}
    </Text>,
    <CustomerStatusBadge customer={customer} />,
    <Text as="span" variant="bodySm">
      {new Date(customer.createdAt).toLocaleDateString()}
    </Text>,
    <ButtonGroup>
      <Button
        size="micro"
        onClick={() => navigate(`/app/customers/${customer.id}`)}
        icon={<Icon3D name="view" size="small" />}
      >
        View
      </Button>
      <Button
        size="micro"
        onClick={() => navigate(`/app/customers/${customer.id}/edit`)}
        icon={<Icon3D name="edit" size="small" />}
      >
        Edit
      </Button>
      <Button
        size="micro"
        tone="critical"
        onClick={() => {
          setCustomerToDelete(customer.id);
          setShowDeleteModal(true);
        }}
        icon={<Icon3D name="delete" size="small" />}
      >
        Delete
      </Button>
    </ButtonGroup>,
  ]);

  const bulkActions = [
    {
      content: "Export selected",
      onAction: () => console.log("Export selected customers"),
    },
    {
      content: "Send email",
      onAction: () => console.log("Send email to selected customers"),
    },
  ];

  return (
    <Frame>
      <Page
        title="Customers"
        primaryAction={{
          content: "Add Customer",
          icon: <Icon3D name="add" size="small" />,
          onAction: () => navigate("/app/customers/new"),
        }}
        secondaryActions={[
          {
            content: "Export CSV",
            icon: <Icon3D name="download" size="small" />,
            onAction: handleExportCSV,
          },
          {
            content: "Import Customers",
            icon: <Icon3D name="upload" size="small" />,
            onAction: () => navigate("/app/customers/import"),
          },
        ]}
      >
        <Layout>
          {/* Statistics Cards */}
          <Layout.Section>
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">Total Customers</Text>
                    <Icon3D name="customer" size="medium" />
                  </InlineStack>
                  <Text as="p" variant="heading2xl">{stats.total}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">This Month</Text>
                    <Icon3D name="calendar" size="medium" />
                  </InlineStack>
                  <Text as="p" variant="heading2xl">{stats.thisMonth}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">With GSTIN</Text>
                    <Icon3D name="document" size="medium" />
                  </InlineStack>
                  <Text as="p" variant="heading2xl">{stats.withGSTIN}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">Active</Text>
                    <Icon3D name="success" size="medium" />
                  </InlineStack>
                  <Text as="p" variant="heading2xl">{stats.active}</Text>
                </BlockStack>
              </Card>
            </InlineStack>
          </Layout.Section>

          {/* Filters */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="400">
                  <Box minWidth="300px">
                    <TextField
                      label="Search customers"
                      value={searchValue}
                      onChange={setSearchValue}
                      placeholder="Search by name, email, GSTIN..."
                      clearButton
                      onClearButtonClick={() => setSearchValue("")}
                      prefix={<Icon3D name="search" size="small" />}
                      autoComplete="off"
                    />
                  </Box>
                  
                  <Select
                    label="Sort by"
                    options={[
                      { label: "Created Date", value: "createdAt" },
                      { label: "Name", value: "name" },
                      { label: "Email", value: "email" },
                      { label: "Total Orders", value: "totalOrders" },
                      { label: "Total Spent", value: "totalSpent" },
                    ]}
                    value={sortBy}
                    onChange={setSortBy}
                  />
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Customers Table */}
          <Layout.Section>
            <Card>
              {customers.length === 0 ? (
                <EmptyState
                  heading="No customers found"
                  action={{
                    content: "Add your first customer",
                    onAction: () => navigate("/app/customers/new"),
                  }}
                  secondaryAction={{
                    content: "Import from CSV",
                    onAction: () => navigate("/app/customers/import"),
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Start building your customer database to manage relationships and track orders.</p>
                </EmptyState>
              ) : (
                <BlockStack gap="400">
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "text", 
                      "text",
                      "numeric",
                      "numeric",
                      "text",
                      "text",
                      "text",
                    ]}
                    headings={headings}
                    rows={rows}
                    bulkActions={bulkActions}
                    selectedItemsCount={selectedCustomers.length}
                    onSelectionChange={setSelectedCustomers}
                    sortable={[true, true, false, true, true, false, true, false]}
                    defaultSortDirection="descending"
                    initialSortColumnIndex={6}
                  />
                  
                  {totalPages > 1 && (
                    <Box paddingBlockStart="400">
                      <InlineStack align="center">
                        <Pagination
                          hasPrevious={currentPage > 1}
                          onPrevious={() => handlePageChange(currentPage - 1)}
                          hasNext={currentPage < totalPages}
                          onNext={() => handlePageChange(currentPage + 1)}
                          label={`Page ${currentPage} of ${totalPages}`}
                        />
                      </InlineStack>
                    </Box>
                  )}
                </BlockStack>
              )}
            </Card>
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
            loading: isLoading,
            onAction: handleDeleteCustomer,
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
        {toastActive && (
          <Toast
            content={toastMessage}
            onDismiss={() => setToastActive(false)}
          />
        )}
      </Page>
    </Frame>
  );
}