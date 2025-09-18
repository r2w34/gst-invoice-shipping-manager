import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  TextField,
  Select,
  Checkbox,
  Banner,
  Modal,
  EmptyState,
  Pagination,
  Filters,
  ChoiceList,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { InvoiceIcon, ShippingIcon, AnimatedIcon3D } from "../components/Icon3D";
import { createInvoice } from "../models/Invoice.server";
import { createShippingLabel } from "../models/ShippingLabel.server";
import { getAppSettings } from "../models/AppSettings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "25");
  const status = url.searchParams.get("status") || "";
  const fulfillmentStatus = url.searchParams.get("fulfillment_status") || "";

  try {
    // Build GraphQL query with filters
    let query = `
      query getOrders($first: Int!, $after: String) {
        orders(first: $first, after: $after, reverse: true`;
    
    if (status) {
      query += `, query: "status:${status}"`;
    }
    if (fulfillmentStatus) {
      query += `, query: "fulfillment_status:${fulfillmentStatus}"`;
    }
    
    query += `) {
          edges {
            node {
              id
              name
              email
              createdAt
              updatedAt
              processedAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                id
                displayName
                email
                phone
              }
              fulfillmentStatus
              displayFulfillmentStatus
              displayFinancialStatus
              lineItems(first: 10) {
                edges {
                  node {
                    id
                    title
                    quantity
                    variant {
                      id
                      title
                      price
                    }
                  }
                }
              }
              shippingAddress {
                address1
                address2
                city
                province
                provinceCode
                country
                countryCodeV2
                zip
              }
              billingAddress {
                address1
                address2
                city
                province
                provinceCode
                country
                countryCodeV2
                zip
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { 
        first: limit,
        after: page > 1 ? btoa(`arrayconnection:${(page - 1) * limit - 1}`) : null
      }
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return json({ 
        orders: [], 
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        error: "Failed to fetch orders"
      });
    }

    return json({
      orders: result.data?.orders?.edges || [],
      pageInfo: result.data?.orders?.pageInfo || { hasNextPage: false, hasPreviousPage: false },
      currentPage: page,
      limit,
      filters: { status, fulfillmentStatus }
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return json({ 
      orders: [], 
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
      error: "Failed to fetch orders"
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "bulkCreateInvoices") {
    const selectedOrderIds = JSON.parse(formData.get("selectedOrderIds") as string);
    
    try {
      const settings = await getAppSettings(shop);
      if (!settings?.sellerGSTIN) {
        return json({ 
          success: false, 
          error: "Please configure your GST settings first" 
        }, { status: 400 });
      }

      const results = [];
      const errors = [];

      for (const orderId of selectedOrderIds) {
        try {
          // Fetch order details from Shopify
          const response = await admin.graphql(`
            query getOrder($id: ID!) {
              order(id: $id) {
                id
                name
                email
                createdAt
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                customer {
                  id
                  displayName
                  email
                  phone
                }
                lineItems(first: 100) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      variant {
                        id
                        title
                        price
                      }
                    }
                  }
                }
                shippingAddress {
                  address1
                  address2
                  city
                  province
                  provinceCode
                  country
                  countryCodeV2
                  zip
                }
                billingAddress {
                  address1
                  address2
                  city
                  province
                  provinceCode
                  country
                  countryCodeV2
                  zip
                }
              }
            }
          `, {
            variables: { id: orderId }
          });

          const result = await response.json();
          const order = result.data?.order;

          if (!order) {
            errors.push({ orderId, error: "Order not found" });
            continue;
          }

          // Create invoice data
          const invoiceData = {
            shop,
            orderId: order.id,
            orderName: order.name,
            customerData: {
              name: order.customer?.displayName || order.email || "Guest",
              gstin: "", // This would need to be collected separately
              billingAddress: order.billingAddress || order.shippingAddress,
              shippingAddress: order.shippingAddress || order.billingAddress,
            },
            items: order.lineItems.edges.map(edge => ({
              id: edge.node.id,
              description: edge.node.title,
              quantity: edge.node.quantity,
              price: parseFloat(edge.node.variant?.price || "0"),
              hsnCode: "998314", // Default HSN code
              taxRate: 18, // Default tax rate
            })),
            sellerGSTIN: settings.sellerGSTIN,
            sellerState: settings.sellerState || "Unknown",
          };

          const invoice = await createInvoice(invoiceData);
          results.push({ orderId, status: "success", invoiceId: invoice.id });
        } catch (error) {
          console.error(`Error creating invoice for order ${orderId}:`, error);
          errors.push({ orderId, error: error.message });
        }
      }
      
      return json({ 
        success: true, 
        message: `Successfully created ${results.length} invoices${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
        results,
        errors
      });
    } catch (error) {
      return json({ 
        success: false, 
        error: "Failed to create bulk invoices" 
      }, { status: 500 });
    }
  }

  if (action === "bulkCreateLabels") {
    const selectedOrderIds = JSON.parse(formData.get("selectedOrderIds") as string);
    
    try {
      const results = [];
      const errors = [];

      for (const orderId of selectedOrderIds) {
        try {
          // Fetch order details from Shopify
          const response = await admin.graphql(`
            query getOrder($id: ID!) {
              order(id: $id) {
                id
                name
                email
                createdAt
                customer {
                  id
                  displayName
                  email
                  phone
                }
                lineItems(first: 100) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      variant {
                        id
                        title
                        weight
                        weightUnit
                      }
                    }
                  }
                }
                shippingAddress {
                  address1
                  address2
                  city
                  province
                  provinceCode
                  country
                  countryCodeV2
                  zip
                }
              }
            }
          `, {
            variables: { id: orderId }
          });

          const result = await response.json();
          const order = result.data?.order;

          if (!order) {
            errors.push({ orderId, error: "Order not found" });
            continue;
          }

          if (!order.shippingAddress) {
            errors.push({ orderId, error: "No shipping address found" });
            continue;
          }

          // Calculate total weight
          const totalWeight = order.lineItems.edges.reduce((total, edge) => {
            const weight = edge.node.variant?.weight || 0.5; // Default 0.5kg if no weight
            const quantity = edge.node.quantity;
            return total + (weight * quantity);
          }, 0);

          // Create label data
          const labelData = {
            orderName: order.name,
            customerName: order.customer?.displayName || order.email || "Guest",
            customerEmail: order.customer?.email || order.email || "",
            customerPhone: order.customer?.phone || "",
            customerAddress: `${order.shippingAddress.address1}${order.shippingAddress.address2 ? ', ' + order.shippingAddress.address2 : ''}`,
            customerCity: order.shippingAddress.city || "",
            customerState: order.shippingAddress.province || "",
            customerPincode: order.shippingAddress.zip || "",
            weight: totalWeight,
            trackingId: "", // Will be generated or added later
            courierPartner: "Standard",
            codAmount: 0, // Default to 0, can be updated later
            fragile: false,
            items: order.lineItems.edges.map(edge => ({
              name: edge.node.title,
              quantity: edge.node.quantity,
            })),
          };

          const label = await createShippingLabel(shop, labelData);
          results.push({ orderId, status: "success", labelId: label.id });
        } catch (error) {
          console.error(`Error creating label for order ${orderId}:`, error);
          errors.push({ orderId, error: error.message });
        }
      }
      
      return json({ 
        success: true, 
        message: `Successfully created ${results.length} shipping labels${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
        results,
        errors
      });
    } catch (error) {
      return json({ 
        success: false, 
        error: "Failed to create bulk labels" 
      }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function OrdersIndex() {
  const { orders, pageInfo, currentPage, limit, filters, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<"invoices" | "labels" | null>(null);
  const [statusFilter, setStatusFilter] = useState(filters.status || "");
  const [fulfillmentFilter, setFulfillmentFilter] = useState(filters.fulfillmentStatus || "");

  const isLoading = navigation.state === "submitting";

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleSelectAllOrders = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map(edge => edge.node.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleBulkAction = (action: "invoices" | "labels") => {
    if (selectedOrders.length === 0) return;
    setBulkAction(action);
    setShowBulkModal(true);
  };

  const confirmBulkAction = () => {
    if (!bulkAction || selectedOrders.length === 0) return;

    const formData = new FormData();
    formData.append("_action", bulkAction === "invoices" ? "bulkCreateInvoices" : "bulkCreateLabels");
    formData.append("selectedOrderIds", JSON.stringify(selectedOrders));
    
    submit(formData, { method: "post" });
    setShowBulkModal(false);
    setSelectedOrders([]);
    setBulkAction(null);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (fulfillmentFilter) params.set("fulfillment_status", fulfillmentFilter);
    
    submit(params, { method: "get" });
  };

  const clearFilters = () => {
    setStatusFilter("");
    setFulfillmentFilter("");
    submit(new URLSearchParams(), { method: "get" });
  };

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'INR' ? 'INR' : 'USD',
    }).format(parseFloat(amount));
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'FULFILLED': { tone: 'success' as const, text: 'Fulfilled' },
      'UNFULFILLED': { tone: 'warning' as const, text: 'Unfulfilled' },
      'PARTIALLY_FULFILLED': { tone: 'attention' as const, text: 'Partial' },
      'RESTOCKED': { tone: 'info' as const, text: 'Restocked' },
    };
    
    const statusInfo = statusMap[status] || { tone: 'info' as const, text: status };
    return <Badge tone={statusInfo.tone}>{statusInfo.text}</Badge>;
  };

  const rows = orders.map((edge) => {
    const order = edge.node;
    const isSelected = selectedOrders.includes(order.id);
    
    return [
      <Checkbox
        checked={isSelected}
        onChange={(checked) => handleSelectOrder(order.id, checked)}
      />,
      order.name,
      order.customer?.displayName || order.email || "Guest",
      formatCurrency(order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode),
      getStatusBadge(order.fulfillmentStatus),
      <Badge tone={order.displayFinancialStatus === 'PAID' ? 'success' : 'warning'}>
        {order.displayFinancialStatus}
      </Badge>,
      new Date(order.createdAt).toLocaleDateString(),
      <InlineStack gap="200">
        <Button 
          size="slim" 
          onClick={() => window.open(`/app/invoices/new?orderId=${order.id.split('/').pop()}`, '_blank')}
          icon={<InvoiceIcon size="small" />}
        >
          Invoice
        </Button>
        <Button 
          size="slim" 
          onClick={() => window.open(`/app/labels/new?orderId=${order.id.split('/').pop()}`, '_blank')}
          icon={<ShippingIcon size="small" />}
        >
          Label
        </Button>
      </InlineStack>
    ];
  });

  if (error) {
    return (
      <Page>
        <TitleBar title="Orders" />
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Unable to load orders"
                action={{
                  content: "Retry",
                  onAction: () => window.location.reload(),
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>{error}</p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar title="Orders">
        <Button 
          variant="primary" 
          disabled={selectedOrders.length === 0}
          onClick={() => handleBulkAction("invoices")}
          icon={<InvoiceIcon size="small" />}
        >
          Bulk Invoices ({selectedOrders.length})
        </Button>
        <Button 
          disabled={selectedOrders.length === 0}
          onClick={() => handleBulkAction("labels")}
          icon={<ShippingIcon size="small" />}
        >
          Bulk Labels ({selectedOrders.length})
        </Button>
      </TitleBar>

      <BlockStack gap="500">
        {actionData?.success && (
          <Banner tone="success" onDismiss={() => {}}>
            {actionData.message}
          </Banner>
        )}

        {actionData?.error && (
          <Banner tone="critical" onDismiss={() => {}}>
            {actionData.error}
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                {/* Filters */}
                <InlineStack gap="400" align="space-between">
                  <InlineStack gap="200">
                    <Select
                      label="Order Status"
                      options={[
                        { label: "All Orders", value: "" },
                        { label: "Open", value: "open" },
                        { label: "Closed", value: "closed" },
                        { label: "Cancelled", value: "cancelled" },
                      ]}
                      value={statusFilter}
                      onChange={setStatusFilter}
                    />
                    <Select
                      label="Fulfillment Status"
                      options={[
                        { label: "All", value: "" },
                        { label: "Fulfilled", value: "fulfilled" },
                        { label: "Unfulfilled", value: "unfulfilled" },
                        { label: "Partially Fulfilled", value: "partial" },
                      ]}
                      value={fulfillmentFilter}
                      onChange={setFulfillmentFilter}
                    />
                    <Button onClick={applyFilters}>Apply Filters</Button>
                    <Button variant="plain" onClick={clearFilters}>Clear</Button>
                  </InlineStack>
                  
                  <Text variant="bodySm" tone="subdued">
                    {selectedOrders.length > 0 && `${selectedOrders.length} selected`}
                  </Text>
                </InlineStack>

                {orders.length === 0 ? (
                  <EmptyState
                    heading="No orders found"
                    action={{
                      content: "Refresh",
                      onAction: () => window.location.reload(),
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>No orders match your current filters.</p>
                  </EmptyState>
                ) : (
                  <DataTable
                    columnContentTypes={[
                      'text', // Checkbox
                      'text', // Order
                      'text', // Customer
                      'numeric', // Total
                      'text', // Fulfillment
                      'text', // Payment
                      'text', // Date
                      'text', // Actions
                    ]}
                    headings={[
                      <Checkbox
                        checked={selectedOrders.length === orders.length}
                        indeterminate={selectedOrders.length > 0 && selectedOrders.length < orders.length}
                        onChange={handleSelectAllOrders}
                      />,
                      'Order',
                      'Customer',
                      'Total',
                      'Fulfillment',
                      'Payment',
                      'Date',
                      'Actions',
                    ]}
                    rows={rows}
                  />
                )}

                {/* Pagination */}
                {(pageInfo.hasNextPage || pageInfo.hasPreviousPage) && (
                  <InlineStack align="center">
                    <Pagination
                      hasPrevious={pageInfo.hasPreviousPage}
                      onPrevious={() => {
                        const params = new URLSearchParams(window.location.search);
                        params.set("page", String(Math.max(1, currentPage - 1)));
                        submit(params, { method: "get" });
                      }}
                      hasNext={pageInfo.hasNextPage}
                      onNext={() => {
                        const params = new URLSearchParams(window.location.search);
                        params.set("page", String(currentPage + 1));
                        submit(params, { method: "get" });
                      }}
                    />
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Bulk Action Modal */}
        <Modal
          open={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          title={`Bulk Create ${bulkAction === 'invoices' ? 'Invoices' : 'Shipping Labels'}`}
          primaryAction={{
            content: `Create ${selectedOrders.length} ${bulkAction === 'invoices' ? 'Invoices' : 'Labels'}`,
            onAction: confirmBulkAction,
            loading: isLoading,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowBulkModal(false),
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="300">
              <Text as="p">
                Are you sure you want to create {bulkAction === 'invoices' ? 'GST invoices' : 'shipping labels'} for {selectedOrders.length} selected orders?
              </Text>
              
              {bulkAction === 'invoices' && (
                <Banner tone="info">
                  <p>This will generate GST-compliant invoices for all selected orders. Make sure your GST settings are configured correctly.</p>
                </Banner>
              )}
              
              {bulkAction === 'labels' && (
                <Banner tone="info">
                  <p>This will generate shipping labels with barcodes for all selected orders. You can add tracking IDs later.</p>
                </Banner>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}