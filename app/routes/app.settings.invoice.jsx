import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  Text,
  Banner,
  Checkbox,
  Divider,
} from "@shopify/polaris";
import { useState, useEffect } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";
import { validateGSTIN, INDIAN_STATES } from "../utils/gst-calculator.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  return json({
    shop,
    indianStates: Object.keys(INDIAN_STATES)
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  try {
    const invoiceSettings = {
      // Company Information
      companyName: formData.get("companyName"),
      gstin: formData.get("gstin"),
      pan: formData.get("pan"),
      
      // Address Information
      address1: formData.get("address1"),
      address2: formData.get("address2"),
      city: formData.get("city"),
      state: formData.get("state"),
      pincode: formData.get("pincode"),
      country: formData.get("country") || "India",
      
      // Contact Information
      phone: formData.get("phone"),
      email: formData.get("email"),
      website: formData.get("website"),
      
      // Invoice Configuration
      invoicePrefix: formData.get("invoicePrefix"),
      invoiceStartNumber: parseInt(formData.get("invoiceStartNumber")) || 1,
      financialYearStart: formData.get("financialYearStart"),
      
      // Tax Settings
      defaultGstRate: parseFloat(formData.get("defaultGstRate")) || 18,
      enableReverseCharge: formData.get("enableReverseCharge") === "true",
      
      // Display Settings
      showCompanyLogo: formData.get("showCompanyLogo") === "true",
      invoiceFooterText: formData.get("invoiceFooterText"),
      invoiceTermsConditions: formData.get("invoiceTermsConditions"),
      
      // Automation Settings
      autoGenerateInvoices: formData.get("autoGenerateInvoices") === "true",
      autoSendInvoices: formData.get("autoSendInvoices") === "true",
      invoiceEmailTemplate: formData.get("invoiceEmailTemplate")
    };

    // Validate GSTIN if provided
    if (invoiceSettings.gstin) {
      const gstinValidation = validateGSTIN(invoiceSettings.gstin);
      if (!gstinValidation.isValid) {
        return json({ 
          error: `Invalid GSTIN: ${gstinValidation.error}`,
          formData: invoiceSettings
        }, { status: 400 });
      }
      invoiceSettings.gstin = gstinValidation.gstin;
    }

    // Validate required fields
    if (!invoiceSettings.companyName) {
      return json({ 
        error: "Company name is required",
        formData: invoiceSettings
      }, { status: 400 });
    }

    if (!invoiceSettings.state) {
      return json({ 
        error: "State is required for GST compliance",
        formData: invoiceSettings
      }, { status: 400 });
    }

    // Update shop with invoice settings
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        companyName: invoiceSettings.companyName,
        gstin: invoiceSettings.gstin,
        pan: invoiceSettings.pan,
        address1: invoiceSettings.address1,
        address2: invoiceSettings.address2,
        city: invoiceSettings.city,
        state: invoiceSettings.state,
        pincode: invoiceSettings.pincode,
        country: invoiceSettings.country,
        phone: invoiceSettings.phone,
        email: invoiceSettings.email,
        website: invoiceSettings.website,
        invoicePrefix: invoiceSettings.invoicePrefix,
        invoiceStartNumber: invoiceSettings.invoiceStartNumber,
        financialYearStart: invoiceSettings.financialYearStart,
        defaultGstRate: invoiceSettings.defaultGstRate,
        enableReverseCharge: invoiceSettings.enableReverseCharge,
        showCompanyLogo: invoiceSettings.showCompanyLogo,
        invoiceFooterText: invoiceSettings.invoiceFooterText,
        invoiceTermsConditions: invoiceSettings.invoiceTermsConditions,
        autoGenerateInvoices: invoiceSettings.autoGenerateInvoices,
        autoSendInvoices: invoiceSettings.autoSendInvoices,
        invoiceEmailTemplate: invoiceSettings.invoiceEmailTemplate
      }
    });

    return json({ 
      success: true,
      message: "Invoice settings updated successfully!"
    });

  } catch (error) {
    console.error("Error updating invoice settings:", error);
    return json({ 
      error: "Failed to update invoice settings. Please try again.",
      formData: Object.fromEntries(formData)
    }, { status: 500 });
  }
};

export default function InvoiceSettings() {
  const { shop, indianStates } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Form state - initialize with existing shop data
  const [companyName, setCompanyName] = useState(actionData?.formData?.companyName || shop.companyName || "");
  const [gstin, setGstin] = useState(actionData?.formData?.gstin || shop.gstin || "");
  const [pan, setPan] = useState(actionData?.formData?.pan || shop.pan || "");
  const [address1, setAddress1] = useState(actionData?.formData?.address1 || shop.address1 || "");
  const [address2, setAddress2] = useState(actionData?.formData?.address2 || shop.address2 || "");
  const [city, setCity] = useState(actionData?.formData?.city || shop.city || "");
  const [state, setState] = useState(actionData?.formData?.state || shop.state || "");
  const [pincode, setPincode] = useState(actionData?.formData?.pincode || shop.pincode || "");
  const [phone, setPhone] = useState(actionData?.formData?.phone || shop.phone || "");
  const [email, setEmail] = useState(actionData?.formData?.email || shop.email || "");
  const [website, setWebsite] = useState(actionData?.formData?.website || shop.website || "");
  
  const [invoicePrefix, setInvoicePrefix] = useState(actionData?.formData?.invoicePrefix || shop.invoicePrefix || "INV");
  const [invoiceStartNumber, setInvoiceStartNumber] = useState(actionData?.formData?.invoiceStartNumber || shop.invoiceStartNumber || 1);
  const [financialYearStart, setFinancialYearStart] = useState(actionData?.formData?.financialYearStart || shop.financialYearStart || "April");
  const [defaultGstRate, setDefaultGstRate] = useState(actionData?.formData?.defaultGstRate || shop.defaultGstRate || 18);
  const [enableReverseCharge, setEnableReverseCharge] = useState(actionData?.formData?.enableReverseCharge || shop.enableReverseCharge || false);
  
  const [showCompanyLogo, setShowCompanyLogo] = useState(actionData?.formData?.showCompanyLogo || shop.showCompanyLogo || false);
  const [invoiceFooterText, setInvoiceFooterText] = useState(actionData?.formData?.invoiceFooterText || shop.invoiceFooterText || "");
  const [invoiceTermsConditions, setInvoiceTermsConditions] = useState(actionData?.formData?.invoiceTermsConditions || shop.invoiceTermsConditions || "");
  
  const [autoGenerateInvoices, setAutoGenerateInvoices] = useState(actionData?.formData?.autoGenerateInvoices || shop.autoGenerateInvoices || false);
  const [autoSendInvoices, setAutoSendInvoices] = useState(actionData?.formData?.autoSendInvoices || shop.autoSendInvoices || false);
  const [invoiceEmailTemplate, setInvoiceEmailTemplate] = useState(actionData?.formData?.invoiceEmailTemplate || shop.invoiceEmailTemplate || "default");

  // GSTIN validation state
  const [gstinValidation, setGstinValidation] = useState(null);

  // Validate GSTIN in real-time
  useEffect(() => {
    if (gstin && gstin.length >= 15) {
      const validation = validateGSTIN(gstin);
      setGstinValidation(validation);
    } else {
      setGstinValidation(null);
    }
  }, [gstin]);

  const stateOptions = [
    { label: "Select state", value: "" },
    ...indianStates.map(state => ({ label: state, value: state }))
  ];

  const gstRateOptions = [
    { label: "0%", value: "0" },
    { label: "5%", value: "5" },
    { label: "12%", value: "12" },
    { label: "18%", value: "18" },
    { label: "28%", value: "28" }
  ];

  const financialYearOptions = [
    { label: "April", value: "April" },
    { label: "January", value: "January" }
  ];

  const emailTemplateOptions = [
    { label: "Default Template", value: "default" },
    { label: "Professional Template", value: "professional" },
    { label: "Minimal Template", value: "minimal" }
  ];

  return (
    <Page
      title="Invoice Settings"
      backAction={{ url: "/app/settings" }}
      primaryAction={{
        content: "Save Settings",
        loading: isSubmitting,
        onAction: () => {
          document.getElementById("invoice-settings-form").requestSubmit();
        }
      }}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner status="critical">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.success && (
          <Layout.Section>
            <Banner status="success">
              <p>{actionData.message}</p>
            </Banner>
          </Layout.Section>
        )}

        <Form method="post" id="invoice-settings-form">
          <input type="hidden" name="enableReverseCharge" value={enableReverseCharge} />
          <input type="hidden" name="showCompanyLogo" value={showCompanyLogo} />
          <input type="hidden" name="autoGenerateInvoices" value={autoGenerateInvoices} />
          <input type="hidden" name="autoSendInvoices" value={autoSendInvoices} />

          {/* Company Information */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Company Information</Text>
                
                <FormLayout>
                  <TextField
                    label="Company Name"
                    name="companyName"
                    value={companyName}
                    onChange={setCompanyName}
                    required
                    helpText="Legal name of your company as per GST registration"
                  />
                  
                  <FormLayout.Group>
                    <TextField
                      label="GSTIN"
                      name="gstin"
                      value={gstin}
                      onChange={setGstin}
                      placeholder="27AAPFU0939F1ZV"
                      helpText="15-character GST Identification Number"
                    />
                    <TextField
                      label="PAN"
                      name="pan"
                      value={pan}
                      onChange={setPan}
                      placeholder="AAPFU0939F"
                      helpText="10-character PAN number"
                    />
                  </FormLayout.Group>
                  
                  {gstinValidation && !gstinValidation.isValid && (
                    <Banner status="critical">
                      <p>{gstinValidation.error}</p>
                    </Banner>
                  )}
                  
                  {gstinValidation && gstinValidation.isValid && (
                    <Banner status="success">
                      <p>
                        Valid GSTIN for {gstinValidation.stateName} 
                        (State Code: {gstinValidation.stateCode})
                      </p>
                    </Banner>
                  )}
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Address Information */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Business Address</Text>
                
                <FormLayout>
                  <TextField
                    label="Address Line 1"
                    name="address1"
                    value={address1}
                    onChange={setAddress1}
                    required
                  />
                  
                  <TextField
                    label="Address Line 2"
                    name="address2"
                    value={address2}
                    onChange={setAddress2}
                  />
                  
                  <FormLayout.Group>
                    <TextField
                      label="City"
                      name="city"
                      value={city}
                      onChange={setCity}
                      required
                    />
                    <Select
                      label="State"
                      name="state"
                      options={stateOptions}
                      value={state}
                      onChange={setState}
                      required
                    />
                  </FormLayout.Group>
                  
                  <FormLayout.Group>
                    <TextField
                      label="Pincode"
                      name="pincode"
                      value={pincode}
                      onChange={setPincode}
                      required
                    />
                    <TextField
                      label="Country"
                      name="country"
                      value="India"
                      disabled
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Contact Information */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Contact Information</Text>
                
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      label="Phone"
                      name="phone"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder="+91 98765 43210"
                    />
                    <TextField
                      label="Email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="business@company.com"
                    />
                  </FormLayout.Group>
                  
                  <TextField
                    label="Website"
                    name="website"
                    type="url"
                    value={website}
                    onChange={setWebsite}
                    placeholder="https://www.company.com"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Invoice Configuration */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Invoice Configuration</Text>
                
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      label="Invoice Prefix"
                      name="invoicePrefix"
                      value={invoicePrefix}
                      onChange={setInvoicePrefix}
                      placeholder="INV"
                      helpText="Prefix for invoice numbers (e.g., INV001)"
                    />
                    <TextField
                      label="Starting Number"
                      name="invoiceStartNumber"
                      type="number"
                      value={invoiceStartNumber}
                      onChange={setInvoiceStartNumber}
                      min="1"
                      helpText="Starting number for invoice sequence"
                    />
                  </FormLayout.Group>
                  
                  <FormLayout.Group>
                    <Select
                      label="Financial Year Starts"
                      name="financialYearStart"
                      options={financialYearOptions}
                      value={financialYearStart}
                      onChange={setFinancialYearStart}
                    />
                    <Select
                      label="Default GST Rate"
                      name="defaultGstRate"
                      options={gstRateOptions}
                      value={defaultGstRate.toString()}
                      onChange={(value) => setDefaultGstRate(parseFloat(value))}
                    />
                  </FormLayout.Group>
                  
                  <Checkbox
                    label="Enable Reverse Charge Mechanism"
                    checked={enableReverseCharge}
                    onChange={setEnableReverseCharge}
                    helpText="For B2B transactions where buyer pays GST"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Display Settings */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Invoice Display Settings</Text>
                
                <FormLayout>
                  <Checkbox
                    label="Show company logo on invoices"
                    checked={showCompanyLogo}
                    onChange={setShowCompanyLogo}
                    helpText="Display your company logo on generated invoices"
                  />
                  
                  <TextField
                    label="Invoice Footer Text"
                    name="invoiceFooterText"
                    value={invoiceFooterText}
                    onChange={setInvoiceFooterText}
                    multiline={2}
                    placeholder="Thank you for your business!"
                    helpText="Text to display at the bottom of invoices"
                  />
                  
                  <TextField
                    label="Terms & Conditions"
                    name="invoiceTermsConditions"
                    value={invoiceTermsConditions}
                    onChange={setInvoiceTermsConditions}
                    multiline={4}
                    placeholder="1. Payment due within 30 days..."
                    helpText="Terms and conditions to include on invoices"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Automation Settings */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Automation Settings</Text>
                
                <FormLayout>
                  <Checkbox
                    label="Auto-generate invoices for new orders"
                    checked={autoGenerateInvoices}
                    onChange={setAutoGenerateInvoices}
                    helpText="Automatically create invoices when orders are placed"
                  />
                  
                  <Checkbox
                    label="Auto-send invoices to customers"
                    checked={autoSendInvoices}
                    onChange={setAutoSendInvoices}
                    helpText="Automatically email invoices to customers"
                  />
                  
                  <Select
                    label="Email Template"
                    name="invoiceEmailTemplate"
                    options={emailTemplateOptions}
                    value={invoiceEmailTemplate}
                    onChange={setInvoiceEmailTemplate}
                    helpText="Template to use for invoice emails"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Form>

        {/* Preview Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Invoice Preview</Text>
              
              <div style={{
                border: '1px solid #e1e3e5',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#fafbfb'
              }}>
                <BlockStack gap="300">
                  <Text variant="headingLg" as="h3">
                    {companyName || 'Your Company Name'}
                  </Text>
                  
                  <Text variant="bodyMd" as="p">
                    {address1 && `${address1}, `}
                    {address2 && `${address2}, `}
                    {city && `${city}, `}
                    {state} {pincode}
                  </Text>
                  
                  {gstin && (
                    <Text variant="bodyMd" as="p">
                      <strong>GSTIN:</strong> {gstin}
                    </Text>
                  )}
                  
                  <Divider />
                  
                  <Text variant="headingMd" as="h4">
                    Invoice #{invoicePrefix}000001
                  </Text>
                  
                  <Text variant="bodySm" as="p" tone="subdued">
                    This is a preview of how your invoice header will appear.
                  </Text>
                </BlockStack>
              </div>
              
              <InlineStack align="center">
                <Button url="/app/invoices/preview" external>
                  View Full Invoice Preview
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}