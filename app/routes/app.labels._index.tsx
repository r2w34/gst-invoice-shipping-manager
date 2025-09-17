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
import { authenticate } from "../shopify.server";
import { getAllShippingLabels, bulkDeleteShippingLabels, getShippingLabelStats } from "../models/ShippingLabel.server";
import Icon3D from "../components/Icon3D";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";

  const { labels, total, totalPages } = await getAllShippingLabels(
    session.shop,
    { page, limit, search, status, sortBy, sortOrder }
  );

  const stats = await getShippingLabelStats(session.shop);

  return json({
    labels,
    total,
    totalPages,
    currentPage: page,
    stats,
    filters: { search, status, sortBy, sortOrder }
  });
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "bulkDelete") {
    const labelIds = formData.get("labelIds")?.toString().split(",") || [];
    await bulkDeleteShippingLabels(session.shop, labelIds);
    return json({ success: true, message: "Labels deleted successfully" });
  }

  return json({ success: false, message: "Invalid action" });
};

export default function ShippingLabelsIndex() {
  const { labels, total, totalPages, currentPage, stats, filters } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState(filters.search);
  const [statusFilter, setStatusFilter] = useState(filters.status);
  const [sortBy, setSortBy] = useState(filters.sortBy);
  const [sortOrder, setSortOrder] = useState(filters.sortOrder);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Update URL params when filters change
  const updateFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (searchValue) params.set("search", searchValue);
    if (statusFilter) params.set("status", statusFilter);
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    params.set("page", "1"); // Reset to first page when filtering
    setSearchParams(params);
  }, [searchValue, statusFilter, sortBy, sortOrder, setSearchParams]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue, updateFilters]);

  // Handle filter changes
  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    updateFilters();
  }, [updateFilters]);

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

  // Handle bulk operations
  const handleBulkDelete = useCallback(async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("action", "bulkDelete");
      formData.append("labelIds", selectedLabels.join(","));
      
      const response = await fetch("", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      if (result.success) {
        setToastMessage(result.message);
        setToastActive(true);
        setSelectedLabels([]);
        navigate(".", { replace: true }); // Refresh data
      }
    } catch (error) {
      setToastMessage("Error deleting labels");
      setToastActive(true);
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
    }
  }, [selectedLabels, navigate]);

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      draft: { status: "info" as const, text: "Draft" },
      printed: { status: "success" as const, text: "Printed" },
      shipped: { status: "success" as const, text: "Shipped" },
      delivered: { status: "success" as const, text: "Delivered" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge status={config.status}>{config.text}</Badge>;
  };

  // Table columns
  const headings = [
    { title: "Label ID", sortable: true },
    { title: "Order ID", sortable: true },
    { title: "Customer", sortable: true },
    { title: "Tracking ID", sortable: false },
    { title: "Status", sortable: true },
    { title: "Created", sortable: true },
    { title: "Actions", sortable: false },
  ];

  const rows = labels.map((label) => [
    <Text as="span" fontWeight="semibold">{label.labelNumber}</Text>,
    <Text as="span">{label.orderId || "N/A"}</Text>,
    <BlockStack gap="100">
      <Text as="span" fontWeight="medium">{label.customerName}</Text>
      <Text as="span" variant="bodySm" tone="subdued">
        {label.customerAddress?.split(",")[0]}
      </Text>
    </BlockStack>,
    <Text as="span" fontWeight="medium">{label.trackingId || "Not assigned"}</Text>,
    <StatusBadge status={label.status} />,
    <Text as="span" variant="bodySm">
      {new Date(label.createdAt).toLocaleDateString()}
    </Text>,
    <ButtonGroup>
      <Button
        size="micro"
        onClick={() => navigate(`/app/labels/${label.id}`)}
        icon={<Icon3D name="view" size="small" />}
      >
        View
      </Button>
      <Button
        size="micro"
        variant="primary"
        onClick={() => window.open(`/app/labels/${label.id}/download`, "_blank")}
        icon={<Icon3D name="download" size="small" />}
      >
        Download
      </Button>
    </ButtonGroup>,
  ]);

  // Filter options
  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Draft", value: "draft" },
    { label: "Printed", value: "printed" },
    { label: "Shipped", value: "shipped" },
    { label: "Delivered", value: "delivered" },
  ];

  const sortOptions = [
    { label: "Created Date", value: "createdAt" },
    { label: "Label Number", value: "labelNumber" },
    { label: "Customer Name", value: "customerName" },
    { label: "Status", value: "status" },
  ];

  const promotedBulkActions = [
    {
      content: "Delete labels",
      onAction: () => setShowDeleteModal(true),
    },
  ];

  const bulkActions = [
    {
      content: "Export selected",
      onAction: () => console.log("Export selected labels"),
    },
    {
      content: "Mark as printed",
      onAction: () => console.log("Mark as printed"),
    },
  ];

  return (
    <Frame>
      <Page
        title="Shipping Labels"
        primaryAction={{
          content: "Create Label",
          icon: <Icon3D name="add" size="small" />,
          onAction: () => navigate("/app/labels/new"),
        }}
        secondaryActions={[
          {
            content: "Bulk Create",
            icon: <Icon3D name="bulk" size="small" />,
            onAction: () => navigate("/app/labels/bulk"),
          },
          {
            content: "Import Labels",
            icon: <Icon3D name="upload" size="small" />,
            onAction: () => navigate("/app/labels/import"),
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
                    <Text as="h3" variant="headingMd">Total Labels</Text>
                    <Icon3D name="shipping" size="medium" />
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
                    <Text as="h3" variant="headingMd">Shipped</Text>
                    <Icon3D name="truck" size="medium" />
                  </InlineStack>
                  <Text as="p" variant="heading2xl">{stats.shipped}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">Pending</Text>
                    <Icon3D name="clock" size="medium" />
                  </InlineStack>
                  <Text as="p" variant="heading2xl">{stats.pending}</Text>
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
                      label="Search labels"
                      value={searchValue}
                      onChange={setSearchValue}
                      placeholder="Search by label number, customer, tracking ID..."
                      clearButton
                      onClearButtonClick={() => setSearchValue("")}
                      prefix={<Icon3D name="search" size="small" />}
                      autoComplete="off"
                    />
                  </Box>
                  
                  <Select
                    label="Status"
                    options={statusOptions}
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                  />
                  
                  <Select
                    label="Sort by"
                    options={sortOptions}
                    value={sortBy}
                    onChange={setSortBy}
                  />
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Labels Table */}
          <Layout.Section>
            <Card>
              {labels.length === 0 ? (
                <EmptyState
                  heading="No shipping labels found"
                  action={{
                    content: "Create your first label",
                    onAction: () => navigate("/app/labels/new"),
                  }}
                  secondaryAction={{
                    content: "Import from CSV",
                    onAction: () => navigate("/app/labels/import"),
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Start creating shipping labels to manage your order fulfillment efficiently.</p>
                </EmptyState>
              ) : (
                <BlockStack gap="400">
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "text", 
                      "text",
                      "text",
                      "text",
                      "text",
                      "text",
                    ]}
                    headings={headings}
                    rows={rows}
                    promotedBulkActions={promotedBulkActions}
                    bulkActions={bulkActions}
                    selectedItemsCount={selectedLabels.length}
                    onSelectionChange={setSelectedLabels}
                    sortable={[true, true, true, false, true, true, false]}
                    defaultSortDirection="descending"
                    initialSortColumnIndex={5}
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
          title="Delete shipping labels"
          primaryAction={{
            content: "Delete",
            destructive: true,
            loading: isLoading,
            onAction: handleBulkDelete,
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
              Are you sure you want to delete {selectedLabels.length} shipping label(s)? 
              This action cannot be undone.
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