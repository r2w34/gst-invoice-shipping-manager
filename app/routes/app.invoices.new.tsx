import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  Select,
  DataTable,
  Modal,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { InvoiceIcon, AnimatedIcon3D } from "../components/Icon3D";
import { createInvoice, validateInvoiceData } from "../models/Invoice.server";
import { getAppSettings } from "../models/AppSettings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;

  const settings = await getAppSettings(shop);
  
  if (!settings?.sellerGSTIN) {
    return redirect("/app/settings");
  }

  return json({ settings, shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "fetchOrder") {
    const orderId = formData.get("orderId") as string;
    
    try {
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
      
      if (result.data?.order) {
        return json({ orderData: result.data.order });
      } else {
        return json({ errors: { orderId: "Order not found" } }, { status: 404 });
      }
    } catch (error) {
      return json({ errors: { orderId: "Failed to fetch order" } }, { status: 500 });
    }
  }

  if (action === "createInvoice") {
    const invoiceData = {
      shop,
      orderId: formData.get("orderId") as string,
      orderName: formData.get("orderName") as string,
      customerData: {
        name: formData.get("customerName") as string,
        gstin: formData.get("customerGSTIN") as string,
        billingAddress: JSON.parse(formData.get("billingAddress") as string),
        shippingAddress: JSON.parse(formData.get("shippingAddress") as string),
      },
      items: JSON.parse(formData.get("items") as string),
      sellerGSTIN: formData.get("sellerGSTIN") as string,
      sellerState: formData.get("sellerState") as string,
    };

    const validation = validateInvoiceData(invoiceData);
    
    if (validation.hasErrors) {
      return json({ errors: validation.errors }, { status: 400 });
    }

    try {
      const invoice = await createInvoice(invoiceData);
      return redirect(`/app/invoices/${invoice.id}`);
    } catch (error) {
      return json({ errors: { general: error.message } }, { status: 500 });
    }
  }

  return json({ errors: { general: "Invalid action" } }, { status: 400 });
};

export default function NewInvoice() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [formState, setFormState] = useState({
    orderId: "",
    orderName: "",
    customerName: "",
    customerGSTIN: "",
    billingAddress: null,
    shippingAddress: null,
    items: [],
  });

  const isLoading = navigation.state === "submitting";
  const errors = actionData?.errors || {};

  const handleFetchOrder = () => {
    if (orderIdInput.trim()) {
      const formData = new FormData();
      formData.append("_action", "fetchOrder");
      formData.append("orderId", `gid://shopify/Order/${orderIdInput.trim()}`);
      submit(formData, { method: "post" });
    }
  };

  // Update form state when order data is received
  if (actionData?.orderData && !selectedOrder) {
    const order = actionData.orderData;
    setSelectedOrder(order);
    setFormState({
      orderId: order.id,
      orderName: order.name,
      customerName: order.customer?.displayName || "",
      customerGSTIN: "",
      billingAddress: order.billingAddress,
      shippingAddress: order.shippingAddress,
      items: order.lineItems.edges.map(edge => ({
        id: edge.node.id,
        description: edge.node.title,
        quantity: edge.node.quantity,
        price: edge.node.variant?.price || "0",
        discount: "0",
        category: "default",
      })),
    });
  }

  const handleCreateInvoice = () => {
    const formData = new FormData();
    formData.append("_action", "createInvoice");
    formData.append("orderId", formState.orderId);
    formData.append("orderName", formState.orderName);
    formData.append("customerName", formState.customerName);
    formData.append("customerGSTIN", formState.customerGSTIN);
    formData.append("billingAddress", JSON.stringify(formState.billingAddress));
    formData.append("shippingAddress", JSON.stringify(formState.shippingAddress));
    formData.append("items", JSON.stringify(formState.items));
    formData.append("sellerGSTIN", settings.sellerGSTIN);
    formData.append("sellerState", settings.sellerAddress.province);
    
    submit(formData, { method: "post" });
  };

  const itemRows = formState.items.map((item, index) => [
    item.description,
    item.quantity.toString(),
    `₹${parseFloat(item.price).toFixed(2)}`,
    `₹${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}`,
  ]);

  return (
    <Page>
      <TitleBar title="Create Invoice" />
      
      <BlockStack gap="500">
        {errors.general && (
          <Banner tone="critical">
            {errors.general}
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Order Selection
                </Text>
                
                {!selectedOrder ? (
                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingSm">
                        Enter Order ID
                      </Text>
                      <FormLayout>
                        <TextField
                          label="Order ID"
                          value={orderIdInput}
                          onChange={setOrderIdInput}
                          error={errors.orderId}
                          placeholder="Enter order ID (numbers only, e.g., 1234567890)"
                          helpText="Enter the numeric order ID from your Shopify admin"
                        />
                        <Button
                          onClick={handleFetchOrder}
                          loading={isLoading && navigation.formData?.get("_action") === "fetchOrder"}
                          disabled={!orderIdInput.trim()}
                        >
                          Fetch Order
                        </Button>
                      </FormLayout>
                    </BlockStack>
                  </Card>
                ) : (
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="h3" variant="headingSm">
                          Order {selectedOrder.name}
                        </Text>
                        <Button onClick={() => {
                          setSelectedOrder(null);
                          setOrderIdInput("");
                          setFormState({
                            orderId: "",
                            orderName: "",
                            customerName: "",
                            customerGSTIN: "",
                            billingAddress: null,
                            shippingAddress: null,
                            items: [],
                          });
                        }}>
                          Change Order
                        </Button>
                      </InlineStack>
                      
                      <FormLayout>
                        <TextField
                          label="Customer Name"
                          value={formState.customerName}
                          onChange={(value) => setFormState({ ...formState, customerName: value })}
                          error={errors.customerName}
                        />

                        <TextField
                          label="Customer GSTIN (Optional)"
                          value={formState.customerGSTIN}
                          onChange={(value) => setFormState({ ...formState, customerGSTIN: value })}
                          helpText="Leave blank for B2C customers"
                          placeholder="22BBBBB1111B1Z5"
                        />
                      </FormLayout>

                      {formState.items.length > 0 && (
                        <BlockStack gap="300">
                          <Text as="h3" variant="headingSm">Order Items</Text>
                          <DataTable
                            columnContentTypes={['text', 'numeric', 'numeric', 'numeric']}
                            headings={['Item', 'Quantity', 'Price', 'Total']}
                            rows={itemRows}
                          />
                        </BlockStack>
                      )}

                      <InlineStack align="end">
                        <Button
                          variant="primary"
                          onClick={handleCreateInvoice}
                          loading={isLoading}
                          disabled={!formState.customerName || formState.items.length === 0}
                        >
                          Create Invoice
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Invoice Details
                </Text>
                <Text as="p" variant="bodyMd">
                  The invoice will include:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm">
                    • GST-compliant format
                  </Text>
                  <Text as="p" variant="bodySm">
                    • Automatic tax calculations
                  </Text>
                  <Text as="p" variant="bodySm">
                    • HSN codes for products
                  </Text>
                  <Text as="p" variant="bodySm">
                    • Place of supply determination
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {settings && (
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Seller Information
                  </Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm">
                      <strong>Name:</strong> {settings.sellerName}
                    </Text>
                    <Text as="p" variant="bodySm">
                      <strong>GSTIN:</strong> {settings.sellerGSTIN}
                    </Text>
                    <Text as="p" variant="bodySm">
                      <strong>State:</strong> {settings.sellerAddress.province}
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            )}
          </Layout.Section>
        </Layout>


      </BlockStack>
    </Page>
  );
}