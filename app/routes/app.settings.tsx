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
  Checkbox,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { SettingsIcon, AnimatedIcon3D } from "../components/Icon3D";
import { 
  getAppSettings, 
  updateAppSettings, 
  validateAppSettings,
  initializeAppSettings 
} from "../models/AppSettings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const settings = await getAppSettings(shop) || await initializeAppSettings(shop);

  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const data = {
    sellerGSTIN: formData.get("sellerGSTIN") as string,
    sellerName: formData.get("sellerName") as string,
    sellerAddress: {
      address1: formData.get("address1") as string,
      address2: formData.get("address2") as string,
      city: formData.get("city") as string,
      province: formData.get("province") as string,
      country: formData.get("country") as string,
      zip: formData.get("zip") as string,
    },
    invoicePrefix: formData.get("invoicePrefix") as string,
    invoiceStartNumber: parseInt(formData.get("invoiceStartNumber") as string) || 1,
    termsAndConditions: formData.get("termsAndConditions") as string,
  };

  const validation = validateAppSettings(data);
  
  if (validation.hasErrors) {
    return json({ errors: validation.errors }, { status: 400 });
  }

  try {
    await updateAppSettings(shop, data);
    return json({ success: true });
  } catch (error) {
    return json({ errors: { general: "Failed to save settings" } }, { status: 500 });
  }
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [formState, setFormState] = useState({
    sellerGSTIN: settings?.sellerGSTIN || "",
    sellerName: settings?.sellerName || "",
    address1: settings?.sellerAddress?.address1 || "",
    address2: settings?.sellerAddress?.address2 || "",
    city: settings?.sellerAddress?.city || "",
    province: settings?.sellerAddress?.province || "",
    country: settings?.sellerAddress?.country || "India",
    zip: settings?.sellerAddress?.zip || "",
    invoicePrefix: settings?.invoicePrefix || "INV",
    invoiceStartNumber: settings?.invoiceStartNumber?.toString() || "1",
    termsAndConditions: settings?.termsAndConditions || "",
  });

  const isLoading = navigation.state === "submitting";
  const errors = actionData?.errors || {};

  const handleSubmit = () => {
    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      formData.append(key, value);
    });
    submit(formData, { method: "post" });
  };

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Puducherry",
    "Andaman and Nicobar Islands"
  ];

  return (
    <Page>
      <TitleBar title="App Settings" />
      
      <BlockStack gap="500">
        {actionData?.success && (
          <Banner tone="success">
            Settings saved successfully!
          </Banner>
        )}

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
                  GST Settings
                </Text>
                
                <FormLayout>
                  <TextField
                    label="Seller GSTIN"
                    value={formState.sellerGSTIN}
                    onChange={(value) => setFormState({ ...formState, sellerGSTIN: value })}
                    error={errors.sellerGSTIN}
                    helpText="15-character GST Identification Number"
                    placeholder="22AAAAA0000A1Z5"
                    autoComplete="off"
                  />

                  <TextField
                    label="Seller/Company Name"
                    value={formState.sellerName}
                    onChange={(value) => setFormState({ ...formState, sellerName: value })}
                    error={errors.sellerName}
                    placeholder="Your Company Name"
                    autoComplete="organization"
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Seller Address
                </Text>
                
                <FormLayout>
                  <TextField
                    label="Address Line 1"
                    value={formState.address1}
                    onChange={(value) => setFormState({ ...formState, address1: value })}
                    error={errors.address1}
                    placeholder="Street address"
                    autoComplete="address-line1"
                  />

                  <TextField
                    label="Address Line 2 (Optional)"
                    value={formState.address2}
                    onChange={(value) => setFormState({ ...formState, address2: value })}
                    placeholder="Apartment, suite, etc."
                    autoComplete="address-line2"
                  />

                  <FormLayout.Group>
                    <TextField
                      label="City"
                      value={formState.city}
                      onChange={(value) => setFormState({ ...formState, city: value })}
                      error={errors.city}
                      placeholder="City"
                      autoComplete="address-level2"
                    />

                    <Select
                      label="State"
                      options={[
                        { label: "Select State", value: "" },
                        ...indianStates.map(state => ({ label: state, value: state }))
                      ]}
                      value={formState.province}
                      onChange={(value) => setFormState({ ...formState, province: value })}
                      error={errors.province}
                    />
                  </FormLayout.Group>

                  <FormLayout.Group>
                    <TextField
                      label="Country"
                      value={formState.country}
                      onChange={(value) => setFormState({ ...formState, country: value })}
                      placeholder="India"
                      autoComplete="country"
                      disabled
                    />

                    <TextField
                      label="PIN Code"
                      value={formState.zip}
                      onChange={(value) => setFormState({ ...formState, zip: value })}
                      error={errors.zip}
                      placeholder="110001"
                      autoComplete="postal-code"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Invoice Settings
                </Text>
                
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      label="Invoice Prefix"
                      value={formState.invoicePrefix}
                      onChange={(value) => setFormState({ ...formState, invoicePrefix: value.toUpperCase() })}
                      error={errors.invoicePrefix}
                      placeholder="INV"
                      helpText="1-5 uppercase letters/numbers"
                      maxLength={5}
                    />

                    <TextField
                      label="Starting Invoice Number"
                      type="number"
                      value={formState.invoiceStartNumber}
                      onChange={(value) => setFormState({ ...formState, invoiceStartNumber: value })}
                      error={errors.invoiceStartNumber}
                      placeholder="1"
                      helpText="Next invoice will start from this number"
                      min={1}
                      max={999999}
                    />
                  </FormLayout.Group>

                  <TextField
                    label="Terms and Conditions (Optional)"
                    value={formState.termsAndConditions}
                    onChange={(value) => setFormState({ ...formState, termsAndConditions: value })}
                    multiline={4}
                    placeholder="Enter terms and conditions to appear on invoices"
                    helpText="This will appear at the bottom of your invoices"
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            <InlineStack align="end">
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={isLoading}
                disabled={!formState.sellerGSTIN || !formState.sellerName}
              >
                Save Settings
              </Button>
            </InlineStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  GST Compliance
                </Text>
                <Text as="p" variant="bodyMd">
                  Ensure your invoices are GST compliant by providing accurate seller information.
                </Text>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Required Information:</Text>
                  <Text as="p" variant="bodySm">
                    • Valid GSTIN (15 characters)<br/>
                    • Complete seller address<br/>
                    • Proper invoice numbering<br/>
                    • HSN/SAC codes for products
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Invoice Preview
                </Text>
                <Text as="p" variant="bodyMd">
                  Your invoices will show:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm">
                    <strong>Invoice Number:</strong> {formState.invoicePrefix}-0001
                  </Text>
                  <Text as="p" variant="bodySm">
                    <strong>Seller:</strong> {formState.sellerName || "Your Company Name"}
                  </Text>
                  <Text as="p" variant="bodySm">
                    <strong>GSTIN:</strong> {formState.sellerGSTIN || "Your GSTIN"}
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}