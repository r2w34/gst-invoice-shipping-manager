import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation, useNavigate } from "@remix-run/react";
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
import { createCustomer, validateCustomerData } from "../models/Customer.server";
import Icon3D from "../components/Icon3D";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    const customerData = {
      shop: session.shop,
      name: formData.get("name")?.toString() || "",
      email: formData.get("email")?.toString() || "",
      phone: formData.get("phone")?.toString() || "",
      gstin: formData.get("gstin")?.toString() || "",
      address: formData.get("address")?.toString() || "",
      city: formData.get("city")?.toString() || "",
      state: formData.get("state")?.toString() || "",
      pincode: formData.get("pincode")?.toString() || "",
      country: formData.get("country")?.toString() || "India",
      notes: formData.get("notes")?.toString() || "",
      isActive: formData.get("isActive") === "on",
    };

    // Validation
    const validation = validateCustomerData(customerData);
    if (validation.hasErrors) {
      return json({ 
        success: false, 
        errors: validation.errors, 
        data: customerData 
      });
    }

    const customer = await createCustomer(customerData);
    
    return redirect(`/app/customers/${customer.id}?created=true`);
  } catch (error) {
    console.error("Error creating customer:", error);
    return json({
      success: false,
      errors: { general: "Failed to create customer. Please try again." },
      data: Object.fromEntries(formData),
    });
  }
};

export default function NewCustomer() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors || {};
  const formData = actionData?.data || {};

  // State management
  const [isActive, setIsActive] = useState(true);
  const [showToast, setShowToast] = useState(false);

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

  return (
    <Frame>
      <Page
        title="Add New Customer"
        backAction={{
          content: "Back to customers",
          onAction: () => navigate("/app/customers"),
        }}
        primaryAction={{
          content: "Save Customer",
          loading: isSubmitting,
          onAction: () => {
            const form = document.querySelector('form') as HTMLFormElement;
            if (form) form.submit();
          },
        }}
        secondaryActions={[
          {
            content: "Save & Add Another",
            loading: isSubmitting,
            onAction: () => {
              const form = document.querySelector('form') as HTMLFormElement;
              if (form) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'saveAndAddAnother';
                input.value = 'true';
                form.appendChild(input);
                form.submit();
              }
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

                {/* Basic Information */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      <InlineStack gap="200" align="center">
                        <Icon3D name="customer" size="medium" />
                        Basic Information
                      </InlineStack>
                    </Text>
                    
                    <FormLayout>
                      <FormLayout.Group>
                        <TextField
                          label="Customer Name"
                          name="name"
                          value={formData.name || ""}
                          error={errors.name}
                          required
                          autoComplete="name"
                          placeholder="Enter customer's full name"
                        />
                        
                        <TextField
                          label="Email Address"
                          name="email"
                          type="email"
                          value={formData.email || ""}
                          error={errors.email}
                          autoComplete="email"
                          placeholder="customer@example.com"
                        />
                      </FormLayout.Group>
                      
                      <FormLayout.Group>
                        <TextField
                          label="Phone Number"
                          name="phone"
                          type="tel"
                          value={formData.phone || ""}
                          error={errors.phone}
                          autoComplete="tel"
                          placeholder="+91 9876543210"
                        />
                        
                        <TextField
                          label="GSTIN (Optional)"
                          name="gstin"
                          value={formData.gstin || ""}
                          error={errors.gstin}
                          placeholder="22AAAAA0000A1Z5"
                          helpText="15-digit GST Identification Number"
                          maxLength={15}
                          autoComplete="off"
                        />
                      </FormLayout.Group>
                    </FormLayout>
                  </BlockStack>
                </Card>

                {/* Address Information */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      <InlineStack gap="200" align="center">
                        <Icon3D name="location" size="medium" />
                        Address Information
                      </InlineStack>
                    </Text>
                    
                    <FormLayout>
                      <TextField
                        label="Address"
                        name="address"
                        value={formData.address || ""}
                        error={errors.address}
                        multiline={2}
                        autoComplete="street-address"
                        placeholder="Enter complete address"
                      />
                      
                      <FormLayout.Group>
                        <TextField
                          label="City"
                          name="city"
                          value={formData.city || ""}
                          error={errors.city}
                          autoComplete="address-level2"
                          placeholder="Enter city name"
                        />
                        
                        <Select
                          label="State"
                          name="state"
                          options={stateOptions}
                          value={formData.state || ""}
                          error={errors.state}
                        />
                        
                        <TextField
                          label="Pincode"
                          name="pincode"
                          value={formData.pincode || ""}
                          error={errors.pincode}
                          autoComplete="postal-code"
                          maxLength={6}
                          placeholder="400001"
                        />
                      </FormLayout.Group>
                      
                      <TextField
                        label="Country"
                        name="country"
                        value={formData.country || "India"}
                        error={errors.country}
                        autoComplete="country"
                        disabled
                      />
                    </FormLayout>
                  </BlockStack>
                </Card>

                {/* Additional Information */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      <InlineStack gap="200" align="center">
                        <Icon3D name="notes" size="medium" />
                        Additional Information
                      </InlineStack>
                    </Text>
                    
                    <FormLayout>
                      <TextField
                        label="Notes"
                        name="notes"
                        value={formData.notes || ""}
                        multiline={3}
                        placeholder="Add any additional notes about this customer..."
                        helpText="Internal notes (not visible to customer)"
                        autoComplete="off"
                      />
                      
                      <Checkbox
                        label="Active Customer"
                        name="isActive"
                        checked={isActive}
                        onChange={setIsActive}
                        helpText="Active customers can place orders and receive communications"
                      />
                    </FormLayout>
                  </BlockStack>
                </Card>

                {/* Action Buttons */}
                <Card>
                  <InlineStack align="end" gap="300">
                    <Button
                      onClick={() => navigate("/app/customers")}
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
                        Save Customer
                      </Button>
                      
                      <Button
                        variant="primary"
                        submit
                        loading={isSubmitting}
                        icon={<Icon3D name="add" size="small" />}
                        onClick={() => {
                          const form = document.querySelector('form') as HTMLFormElement;
                          if (form) {
                            const input = document.createElement('input');
                            input.type = 'hidden';
                            input.name = 'saveAndAddAnother';
                            input.value = 'true';
                            form.appendChild(input);
                          }
                        }}
                      >
                        Save & Add Another
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
                      Customer Tips
                    </InlineStack>
                  </Text>
                  
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      • Email is required for sending invoices
                    </Text>
                    <Text as="p" variant="bodyMd">
                      • GSTIN is needed for B2B transactions
                    </Text>
                    <Text as="p" variant="bodyMd">
                      • Complete address helps with shipping
                    </Text>
                    <Text as="p" variant="bodyMd">
                      • Use notes for special instructions
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="document" size="medium" />
                      GSTIN Format
                    </InlineStack>
                  </Text>
                  
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      Format: 22AAAAA0000A1Z5
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      • First 2 digits: State code
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      • Next 10 characters: PAN
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      • 13th character: Entity number
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      • 14th character: Z (default)
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      • 15th character: Check digit
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    <InlineStack gap="200" align="center">
                      <Icon3D name="success" size="medium" />
                      Next Steps
                    </InlineStack>
                  </Text>
                  
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      After creating the customer:
                    </Text>
                    <Text as="p" variant="bodySm">
                      • Create invoices for this customer
                    </Text>
                    <Text as="p" variant="bodySm">
                      • Generate shipping labels
                    </Text>
                    <Text as="p" variant="bodySm">
                      • Track order history
                    </Text>
                    <Text as="p" variant="bodySm">
                      • Send communications
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
            content="Customer created successfully!"
            onDismiss={() => setShowToast(false)}
          />
        )}
      </Page>
    </Frame>
  );
}