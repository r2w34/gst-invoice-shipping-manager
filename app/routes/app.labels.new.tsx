import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  ButtonGroup,
  Text,
  BlockStack,
  InlineStack,
  Checkbox,
  Toast,
  Frame,
  Banner,
  Box,
  Divider,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { createShippingLabel } from "../models/ShippingLabel.server";
import { getCustomers } from "../models/Customer.server";
import { getAppSettings } from "../models/AppSettings.server";
import Icon3D from "../components/Icon3D";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  const customers = await getCustomers(session.shop, { limit: 100 });
  const settings = await getAppSettings(session.shop);

  // Check if orderId is provided in URL parameters
  const url = new URL(request.url);
  const orderIdParam = url.searchParams.get("orderId");
  let orderData = null;

  if (orderIdParam) {
    try {
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
        variables: { id: `gid://shopify/Order/${orderIdParam}` }
      });

      const result = await response.json();
      if (result.data?.order) {
        orderData = result.data.order;
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    }
  }

  return json({
    customers: customers.customers,
    settings,
    orderData,
    orderIdParam,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("_action");

  // Handle order data fetching
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
      
      if (result.data?.order) {
        return json({ orderData: result.data.order });
      } else {
        return json({ errors: { orderId: "Order not found" } }, { status: 404 });
      }
    } catch (error) {
      return json({ errors: { orderId: "Failed to fetch order" } }, { status: 500 });
    }
  }

  try {
    const labelData = {
      orderId: formData.get("orderId")?.toString() || null,
      customerName: formData.get("customerName")?.toString() || "",
      customerEmail: formData.get("customerEmail")?.toString() || "",
      customerPhone: formData.get("customerPhone")?.toString() || "",
      customerAddress: formData.get("customerAddress")?.toString() || "",
      customerCity: formData.get("customerCity")?.toString() || "",
      customerState: formData.get("customerState")?.toString() || "",
      customerPincode: formData.get("customerPincode")?.toString() || "",
      trackingId: formData.get("trackingId")?.toString() || null,
      courierService: formData.get("courierService")?.toString() || "",
      weight: parseFloat(formData.get("weight")?.toString() || "0"),
      dimensions: formData.get("dimensions")?.toString() || "",
      specialInstructions: formData.get("specialInstructions")?.toString() || "",
      codAmount: parseFloat(formData.get("codAmount")?.toString() || "0"),
      isCod: formData.get("isCod") === "on",
      isFragile: formData.get("isFragile") === "on",
      status: "draft",
    };

    // Validation
    const errors: Record<string, string> = {};
    
    if (!labelData.customerName.trim()) {
      errors.customerName = "Customer name is required";
    }
    
    if (!labelData.customerAddress.trim()) {
      errors.customerAddress = "Customer address is required";
    }
    
    if (!labelData.customerCity.trim()) {
      errors.customerCity = "City is required";
    }
    
    if (!labelData.customerState.trim()) {
      errors.customerState = "State is required";
    }
    
    if (!labelData.customerPincode.trim()) {
      errors.customerPincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(labelData.customerPincode)) {
      errors.customerPincode = "Pincode must be 6 digits";
    }
    
    if (labelData.weight <= 0) {
      errors.weight = "Weight must be greater than 0";
    }

    if (Object.keys(errors).length > 0) {
      return json({ success: false, errors, data: labelData });
    }

    const label = await createShippingLabel(session.shop, labelData);
    
    return redirect(`/app/labels/${label.id}?created=true`);
  } catch (error) {
    console.error("Error creating shipping label:", error);
    return json({
      success: false,
      errors: { general: "Failed to create shipping label. Please try again." },
      data: Object.fromEntries(formData),
    });
  }
};

export default function NewShippingLabel() {
  const { customers, settings, orderData, orderIdParam } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors || {};
  const formData = actionData?.data || {};

  // State management
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(orderData);
  const [orderIdInput, setOrderIdInput] = useState(orderIdParam || "");
  const [isCod, setIsCod] = useState(false);
  const [isFragile, setIsFragile] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [autoFilledData, setAutoFilledData] = useState(() => {
    if (orderData && orderData.shippingAddress) {
      const address = orderData.shippingAddress;
      const totalWeight = orderData.lineItems.edges.reduce((total, edge) => {
        const weight = edge.node.variant?.weight || 0;
        const quantity = edge.node.quantity;
        return total + (weight * quantity);
      }, 0);

      return {
        customerName: orderData.customer?.displayName || "",
        customerEmail: orderData.customer?.email || "",
        customerPhone: orderData.customer?.phone || "",
        customerAddress: `${address.address1}${address.address2 ? ', ' + address.address2 : ''}`,
        customerCity: address.city || "",
        customerState: address.province || "",
        customerPincode: address.zip || "",
        weight: totalWeight > 0 ? totalWeight.toString() : "",
      };
    }
    return {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerAddress: "",
      customerCity: "",
      customerState: "",
      customerPincode: "",
      weight: "",
    };
  });

  // Handle order fetching
  const handleFetchOrder = useCallback(() => {
    if (orderIdInput.trim()) {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        const formData = new FormData();
        formData.append("_action", "fetchOrder");
        formData.append("orderId", `gid://shopify/Order/${orderIdInput.trim()}`);
        
        // Submit the form to fetch order data
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  }, [orderIdInput]);

  // Handle customer selection
  const handleCustomerChange = useCallback((customerId: string) => {
    setSelectedCustomer(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setAutoFilledData({
        customerName: customer.name,
        customerEmail: customer.email || '',
        customerPhone: customer.phone || '',
        customerAddress: customer.address || '',
        customerCity: customer.city || '',
        customerState: customer.state || '',
        customerPincode: customer.pincode || '',
        weight: "",
      });
    }
  }, [customers]);

  // Update form state when order data is received
  if (actionData?.orderData && !selectedOrder) {
    const order = actionData.orderData;
    setSelectedOrder(order);
    
    // Calculate total weight from line items
    let totalWeight = 0;
    order.lineItems.edges.forEach(edge => {
      const variant = edge.node.variant;
      if (variant?.weight && variant?.weightUnit) {
        const weight = parseFloat(variant.weight);
        const quantity = parseInt(edge.node.quantity);
        // Convert to kg if needed
        const weightInKg = variant.weightUnit === 'GRAMS' ? weight / 1000 : weight;
        totalWeight += weightInKg * quantity;
      }
    });

    const shippingAddr = order.shippingAddress;
    setAutoFilledData({
      customerName: order.customer?.displayName || "",
      customerEmail: order.customer?.email || "",
      customerPhone: order.customer?.phone || "",
      customerAddress: shippingAddr ? `${shippingAddr.address1}${shippingAddr.address2 ? ', ' + shippingAddr.address2 : ''}` : "",
      customerCity: shippingAddr?.city || "",
      customerState: shippingAddr?.province || "",
      customerPincode: shippingAddr?.zip || "",
      weight: totalWeight > 0 ? totalWeight.toFixed(2) : "",
    });
  }

  // Customer options
  const customerOptions = [
    { label: "Select existing customer", value: "" },
    ...customers.map(customer => ({
      label: `${customer.name} - ${customer.email}`,
      value: customer.id,
    })),
  ];

  // State options (Indian states)
  const stateOptions = [
    { label: "Select State", value: "" },
    { label: "Andhra Pradesh", value: "Andhra Pradesh" },
    { label: "Arunachal Pradesh", value: "Arunachal Pradesh" },
    { label: "Assam", value: "Assam" },
    { label: "Bihar", value: "Bihar" },
    { label: "Chhattisgarh", value: "Chhattisgarh" },
    { label: "Delhi", value: "Delhi" },
    { label: "Goa", value: "Goa" },
    { label: "Gujarat", value: "Gujarat" },
    { label: "Haryana", value: "Haryana" },
    { label: "Himachal Pradesh", value: "Himachal Pradesh" },
    { label: "Jharkhand", value: "Jharkhand" },
    { label: "Karnataka", value: "Karnataka" },
    { label: "Kerala", value: "Kerala" },
    { label: "Madhya Pradesh", value: "Madhya Pradesh" },
    { label: "Maharashtra", value: "Maharashtra" },
    { label: "Manipur", value: "Manipur" },
    { label: "Meghalaya", value: "Meghalaya" },
    { label: "Mizoram", value: "Mizoram" },
    { label: "Nagaland", value: "Nagaland" },
    { label: "Odisha", value: "Odisha" },
    { label: "Punjab", value: "Punjab" },
    { label: "Rajasthan", value: "Rajasthan" },
    { label: "Sikkim", value: "Sikkim" },
    { label: "Tamil Nadu", value: "Tamil Nadu" },
    { label: "Telangana", value: "Telangana" },
    { label: "Tripura", value: "Tripura" },
    { label: "Uttar Pradesh", value: "Uttar Pradesh" },
    { label: "Uttarakhand", value: "Uttarakhand" },
    { label: "West Bengal", value: "West Bengal" },
  ];

  // Courier service options
  const courierOptions = [
    { label: "Select Courier Service", value: "" },
    { label: "India Post", value: "india_post" },
    { label: "Blue Dart", value: "blue_dart" },
    { label: "DTDC", value: "dtdc" },
    { label: "FedEx", value: "fedex" },
    { label: "Delhivery", value: "delhivery" },
    { label: "Ecom Express", value: "ecom_express" },
    { label: "Shiprocket", value: "shiprocket" },
    { label: "Other", value: "other" },
  ];

  return (
    <Frame>
      <Page
        title="Create Shipping Label"
        backAction={{
          content: "Back to labels",
          onAction: () => navigate("/app/labels"),
        }}
        primaryAction={{
          content: "Save & Print",
          loading: isSubmitting,
          onAction: () => {
            const form = document.querySelector('form') as HTMLFormElement;
            if (form) {
              const formData = new FormData(form);
              formData.append("saveAndPrint", "true");
              form.submit();
            }
          },
        }}
        secondaryActions={[
          {
            content: "Save as Draft",
            loading: isSubmitting,
            onAction: () => {
              const form = document.querySelector('form') as HTMLFormElement;
              if (form) form.submit();
            },
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            <Form method="post">
              <BlockStack gap="500">
                {/* Error Banner */}
                {errors.general && (
                  <Banner status="critical">
                    <p>{errors.general}</p>
                  </Banner>
                )}

                {/* Order Information */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      <InlineStack gap="200" align="center">
                        <Icon3D name="package" size="medium" />
                        Order Information
                      </InlineStack>
                    </Text>
                    
                    {!selectedOrder ? (
                      <FormLayout>
                        <TextField
                          label="Order ID (Optional)"
                          value={orderIdInput}
                          onChange={setOrderIdInput}
                          placeholder="Enter order ID (numbers only, e.g., 1234567890)"
                          helpText="Enter the numeric order ID to auto-fill customer and shipping details"
                          error={errors.orderId}
                          autoComplete="off"
                        />
                        <Button
                          onClick={handleFetchOrder}
                          loading={isSubmitting && navigation.formData?.get("_action") === "fetchOrder"}
                          disabled={!orderIdInput.trim()}
                        >
                          Fetch Order Details
                        </Button>
                      </FormLayout>
                    ) : (
                      <BlockStack gap="300">
                        <InlineStack align="space-between">
                          <Text as="h3" variant="headingSm">
                            Order {selectedOrder.name} - Details Auto-Filled
                          </Text>
                          <Button onClick={() => {
                            setSelectedOrder(null);
                            setOrderIdInput("");
                            setAutoFilledData({
                              customerName: "",
                              customerEmail: "",
                              customerPhone: "",
                              customerAddress: "",
                              customerCity: "",
                              customerState: "",
                              customerPincode: "",
                              weight: "",
                            });
                          }}>
                            Change Order
                          </Button>
                        </InlineStack>
                        <input type="hidden" name="orderId" value={selectedOrder.id} />
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>

                {/* Customer Information */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      <InlineStack gap="200" align="center">
                        <Icon3D name="customer" size="medium" />
                        Customer Information
                      </InlineStack>
                    </Text>
                    
                    <FormLayout>
                      <Select
                        label="Existing Customer"
                        options={customerOptions}
                        value={selectedCustomer}
                        onChange={handleCustomerChange}
                        helpText="Select to auto-fill customer details"
                      />
                      
                      <Divider />
                      
                      <FormLayout.Group>
                        <TextField
                          label="Customer Name"
                          name="customerName"
                          value={autoFilledData.customerName || formData.customerName || ""}
                          onChange={(value) => setAutoFilledData({ ...autoFilledData, customerName: value })}
                          error={errors.customerName}
                          required
                          autoComplete="name"
                        />
                        
                        <TextField
                          label="Email"
                          name="customerEmail"
                          type="email"
                          value={autoFilledData.customerEmail || formData.customerEmail || ""}
                          onChange={(value) => setAutoFilledData({ ...autoFilledData, customerEmail: value })}
                          error={errors.customerEmail}
                          autoComplete="email"
                        />
                      </FormLayout.Group>
                      
                      <FormLayout.Group>
                        <TextField
                          label="Phone"
                          name="customerPhone"
                          type="tel"
                          value={autoFilledData.customerPhone || formData.customerPhone || ""}
                          onChange={(value) => setAutoFilledData({ ...autoFilledData, customerPhone: value })}
                          error={errors.customerPhone}
                          autoComplete="tel"
                        />
                      </FormLayout.Group>
                      
                      <TextField
                        label="Address"
                        name="customerAddress"
                        value={autoFilledData.customerAddress || formData.customerAddress || ""}
                        onChange={(value) => setAutoFilledData({ ...autoFilledData, customerAddress: value })}
                        error={errors.customerAddress}
                        multiline={2}
                        required
                        autoComplete="street-address"
                      />
                      
                      <FormLayout.Group>
                        <TextField
                          label="City"
                          name="customerCity"
                          value={autoFilledData.customerCity || formData.customerCity || ""}
                          onChange={(value) => setAutoFilledData({ ...autoFilledData, customerCity: value })}
                          error={errors.customerCity}
                          required
                          autoComplete="address-level2"
                        />
                        
                        <Select
                          label="State"
                          name="customerState"
                          options={stateOptions}
                          value={autoFilledData.customerState || formData.customerState || ""}
                          onChange={(value) => setAutoFilledData({ ...autoFilledData, customerState: value })}
                          error={errors.customerState}
                          required
                        />
                        
                        <TextField
                          label="Pincode"
                          name="customerPincode"
                          value={autoFilledData.customerPincode || formData.customerPincode || ""}
                          onChange={(value) => setAutoFilledData({ ...autoFilledData, customerPincode: value })}
                          error={errors.customerPincode}
                          required
                          autoComplete="postal-code"
                          maxLength={6}
                        />
                      </FormLayout.Group>
                    </FormLayout>
                  </BlockStack>
                </Card>

                {/* Shipping Details */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      <InlineStack gap="200" align="center">
                        <Icon3D name="shipping" size="medium" />
                        Shipping Details
                      </InlineStack>
                    </Text>
                    
                    <FormLayout>
                      <FormLayout.Group>
                        <TextField
                          label="Tracking ID (Optional)"
                          name="trackingId"
                          value={formData.trackingId || ""}
                          placeholder="Will be auto-generated if empty"
                          helpText="Leave empty to auto-generate"
                          autoComplete="off"
                        />
                        
                        <Select
                          label="Courier Service"
                          name="courierService"
                          options={courierOptions}
                          value={formData.courierService || ""}
                          error={errors.courierService}
                        />
                      </FormLayout.Group>
                      
                      <FormLayout.Group>
                        <TextField
                          label="Weight (kg)"
                          name="weight"
                          type="number"
                          value={autoFilledData.weight || formData.weight || ""}
                          onChange={(value) => setAutoFilledData({ ...autoFilledData, weight: value })}
                          error={errors.weight}
                          step="0.1"
                          min="0.1"
                          required
                          autoComplete="off"
                          helpText={selectedOrder ? "Auto-calculated from order items" : "Enter package weight"}
                        />
                        
                        <TextField
                          label="Dimensions (L x W x H cm)"
                          name="dimensions"
                          value={formData.dimensions || ""}
                          placeholder="e.g., 20 x 15 x 10"
                          helpText="Optional: Package dimensions"
                          autoComplete="off"
                        />
                      </FormLayout.Group>
                      
                      <TextField
                        label="Special Instructions"
                        name="specialInstructions"
                        value={formData.specialInstructions || ""}
                        multiline={2}
                        placeholder="Handle with care, fragile items, etc."
                        helpText="Any special handling instructions"
                        autoComplete="off"
                      />
                    </FormLayout>
                  </BlockStack>
                </Card>

                {/* Additional Options */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      <InlineStack gap="200" align="center">
                        <Icon3D name="settings" size="medium" />
                        Additional Options
                      </InlineStack>
                    </Text>
                    
                    <FormLayout>
                      <BlockStack gap="300">
                        <Checkbox
                          label="Cash on Delivery (COD)"
                          name="isCod"
                          checked={isCod}
                          onChange={setIsCod}
                        />
                        
                        {isCod && (
                          <Box paddingInlineStart="600">
                            <TextField
                              label="COD Amount (₹)"
                              name="codAmount"
                              type="number"
                              value={formData.codAmount || ""}
                              step="0.01"
                              min="0"
                              prefix="₹"
                              autoComplete="off"
                            />
                          </Box>
                        )}
                        
                        <Checkbox
                          label="Fragile Item"
                          name="isFragile"
                          checked={isFragile}
                          onChange={setIsFragile}
                          helpText="Mark if package contains fragile items"
                        />
                      </BlockStack>
                    </FormLayout>
                  </BlockStack>
                </Card>

                {/* Action Buttons */}
                <Card>
                  <InlineStack align="end" gap="300">
                    <Button
                      onClick={() => navigate("/app/labels")}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    
                    <ButtonGroup>
                      <Button
                        submit
                        loading={isSubmitting}
                        icon={<Icon3D name="save" size="small" />}
                      >
                        Save as Draft
                      </Button>
                      
                      <Button
                        variant="primary"
                        submit
                        loading={isSubmitting}
                        icon={<Icon3D name="print" size="small" />}
                        onClick={() => {
                          const form = document.querySelector('form') as HTMLFormElement;
                          if (form) {
                            const input = document.createElement('input');
                            input.type = 'hidden';
                            input.name = 'saveAndPrint';
                            input.value = 'true';
                            form.appendChild(input);
                          }
                        }}
                      >
                        Save & Print
                      </Button>
                    </ButtonGroup>
                  </InlineStack>
                </Card>
              </BlockStack>
            </Form>
          </Layout.Section>

          {/* Sidebar with Tips */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="info" size="medium" />
                      Quick Tips
                    </InlineStack>
                  </Text>
                  
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      • Double-check customer address for accurate delivery
                    </Text>
                    <Text as="p" variant="bodyMd">
                      • Weight affects shipping cost calculation
                    </Text>
                    <Text as="p" variant="bodyMd">
                      • Tracking ID will be auto-generated if not provided
                    </Text>
                    <Text as="p" variant="bodyMd">
                      • Use special instructions for fragile items
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="barcode" size="medium" />
                      Label Features
                    </InlineStack>
                  </Text>
                  
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      ✓ Auto-generated barcode
                    </Text>
                    <Text as="p" variant="bodyMd">
                      ✓ QR code for tracking
                    </Text>
                    <Text as="p" variant="bodyMd">
                      ✓ Company logo integration
                    </Text>
                    <Text as="p" variant="bodyMd">
                      ✓ Professional formatting
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

        {/* Toast */}
        {showToast && (
          <Toast
            content="Shipping label created successfully!"
            onDismiss={() => setShowToast(false)}
          />
        )}
      </Page>
    </Frame>
  );
}