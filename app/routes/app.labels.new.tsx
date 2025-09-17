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
  const { session } = await authenticate.admin(request);
  
  const customers = await getCustomers(session.shop, { limit: 100 });
  const settings = await getAppSettings(session.shop);

  return json({
    customers: customers.customers,
    settings,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

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
  const { customers, settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors || {};
  const formData = actionData?.data || {};

  // State management
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [isCod, setIsCod] = useState(false);
  const [isFragile, setIsFragile] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Handle customer selection
  const handleCustomerChange = useCallback((customerId: string) => {
    setSelectedCustomer(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      // Auto-fill customer details
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        (form.elements.namedItem('customerName') as HTMLInputElement).value = customer.name;
        (form.elements.namedItem('customerEmail') as HTMLInputElement).value = customer.email || '';
        (form.elements.namedItem('customerPhone') as HTMLInputElement).value = customer.phone || '';
        (form.elements.namedItem('customerAddress') as HTMLInputElement).value = customer.address || '';
        (form.elements.namedItem('customerCity') as HTMLInputElement).value = customer.city || '';
        (form.elements.namedItem('customerState') as HTMLInputElement).value = customer.state || '';
        (form.elements.namedItem('customerPincode') as HTMLInputElement).value = customer.pincode || '';
      }
    }
  }, [customers]);

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
                    
                    <FormLayout>
                      <TextField
                        label="Order ID (Optional)"
                        name="orderId"
                        value={formData.orderId || ""}
                        placeholder="Enter Shopify order ID"
                        helpText="Link this label to a specific order"
                        autoComplete="off"
                      />
                    </FormLayout>
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
                          value={formData.customerName || ""}
                          error={errors.customerName}
                          required
                          autoComplete="name"
                        />
                        
                        <TextField
                          label="Email"
                          name="customerEmail"
                          type="email"
                          value={formData.customerEmail || ""}
                          error={errors.customerEmail}
                          autoComplete="email"
                        />
                      </FormLayout.Group>
                      
                      <FormLayout.Group>
                        <TextField
                          label="Phone"
                          name="customerPhone"
                          type="tel"
                          value={formData.customerPhone || ""}
                          error={errors.customerPhone}
                          autoComplete="tel"
                        />
                      </FormLayout.Group>
                      
                      <TextField
                        label="Address"
                        name="customerAddress"
                        value={formData.customerAddress || ""}
                        error={errors.customerAddress}
                        multiline={2}
                        required
                        autoComplete="street-address"
                      />
                      
                      <FormLayout.Group>
                        <TextField
                          label="City"
                          name="customerCity"
                          value={formData.customerCity || ""}
                          error={errors.customerCity}
                          required
                          autoComplete="address-level2"
                        />
                        
                        <Select
                          label="State"
                          name="customerState"
                          options={stateOptions}
                          value={formData.customerState || ""}
                          error={errors.customerState}
                          required
                        />
                        
                        <TextField
                          label="Pincode"
                          name="customerPincode"
                          value={formData.customerPincode || ""}
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
                          value={formData.weight || ""}
                          error={errors.weight}
                          step="0.1"
                          min="0.1"
                          required
                          autoComplete="off"
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