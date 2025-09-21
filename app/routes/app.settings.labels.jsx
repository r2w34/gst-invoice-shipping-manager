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
  RadioButton,
  InlineStack,
} from "@shopify/polaris";
import { useState } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  return json({ shop });
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
    const labelSettings = {
      // Label Configuration
      labelPrefix: formData.get("labelPrefix"),
      labelStartNumber: parseInt(formData.get("labelStartNumber")) || 1,
      defaultLabelSize: formData.get("defaultLabelSize"),
      
      // Courier Settings
      defaultCourier: formData.get("defaultCourier"),
      courierApiKeys: formData.get("courierApiKeys"), // JSON string
      
      // Display Settings
      includeCompanyLogo: formData.get("includeCompanyLogo") === "true",
      includeReturnAddress: formData.get("includeReturnAddress") === "true",
      includeProductDetails: formData.get("includeProductDetails") === "true",
      includeBarcodes: formData.get("includeBarcodes") === "true",
      includeQRCodes: formData.get("includeQRCodes") === "true",
      
      // Return Address
      returnAddress1: formData.get("returnAddress1"),
      returnAddress2: formData.get("returnAddress2"),
      returnCity: formData.get("returnCity"),
      returnState: formData.get("returnState"),
      returnPincode: formData.get("returnPincode"),
      returnPhone: formData.get("returnPhone"),
      
      // Automation Settings
      autoGenerateLabels: formData.get("autoGenerateLabels") === "true",
      autoPrintLabels: formData.get("autoPrintLabels") === "true",
      autoAssignTracking: formData.get("autoAssignTracking") === "true",
      
      // Print Settings
      printerName: formData.get("printerName"),
      printQuality: formData.get("printQuality"),
      labelMargins: formData.get("labelMargins")
    };

    // Validate required fields
    if (!labelSettings.labelPrefix) {
      return json({ 
        error: "Label prefix is required",
        formData: labelSettings
      }, { status: 400 });
    }

    if (!labelSettings.defaultLabelSize) {
      return json({ 
        error: "Default label size is required",
        formData: labelSettings
      }, { status: 400 });
    }

    // Update shop with label settings
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        labelPrefix: labelSettings.labelPrefix,
        labelStartNumber: labelSettings.labelStartNumber,
        defaultLabelSize: labelSettings.defaultLabelSize,
        defaultCourier: labelSettings.defaultCourier,
        courierApiKeys: labelSettings.courierApiKeys,
        includeCompanyLogo: labelSettings.includeCompanyLogo,
        includeReturnAddress: labelSettings.includeReturnAddress,
        includeProductDetails: labelSettings.includeProductDetails,
        includeBarcodes: labelSettings.includeBarcodes,
        includeQRCodes: labelSettings.includeQRCodes,
        returnAddress1: labelSettings.returnAddress1,
        returnAddress2: labelSettings.returnAddress2,
        returnCity: labelSettings.returnCity,
        returnState: labelSettings.returnState,
        returnPincode: labelSettings.returnPincode,
        returnPhone: labelSettings.returnPhone,
        autoGenerateLabels: labelSettings.autoGenerateLabels,
        autoPrintLabels: labelSettings.autoPrintLabels,
        autoAssignTracking: labelSettings.autoAssignTracking,
        printerName: labelSettings.printerName,
        printQuality: labelSettings.printQuality,
        labelMargins: labelSettings.labelMargins
      }
    });

    return json({ 
      success: true,
      message: "Label settings updated successfully!"
    });

  } catch (error) {
    console.error("Error updating label settings:", error);
    return json({ 
      error: "Failed to update label settings. Please try again.",
      formData: Object.fromEntries(formData)
    }, { status: 500 });
  }
};

export default function LabelSettings() {
  const { shop } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Form state - initialize with existing shop data
  const [labelPrefix, setLabelPrefix] = useState(actionData?.formData?.labelPrefix || shop.labelPrefix || "LBL");
  const [labelStartNumber, setLabelStartNumber] = useState(actionData?.formData?.labelStartNumber || shop.labelStartNumber || 1);
  const [defaultLabelSize, setDefaultLabelSize] = useState(actionData?.formData?.defaultLabelSize || shop.defaultLabelSize || "4x6");
  const [defaultCourier, setDefaultCourier] = useState(actionData?.formData?.defaultCourier || shop.defaultCourier || "");
  
  const [includeCompanyLogo, setIncludeCompanyLogo] = useState(actionData?.formData?.includeCompanyLogo || shop.includeCompanyLogo || false);
  const [includeReturnAddress, setIncludeReturnAddress] = useState(actionData?.formData?.includeReturnAddress || shop.includeReturnAddress || true);
  const [includeProductDetails, setIncludeProductDetails] = useState(actionData?.formData?.includeProductDetails || shop.includeProductDetails || false);
  const [includeBarcodes, setIncludeBarcodes] = useState(actionData?.formData?.includeBarcodes || shop.includeBarcodes || true);
  const [includeQRCodes, setIncludeQRCodes] = useState(actionData?.formData?.includeQRCodes || shop.includeQRCodes || false);
  
  const [returnAddress1, setReturnAddress1] = useState(actionData?.formData?.returnAddress1 || shop.returnAddress1 || shop.address1 || "");
  const [returnAddress2, setReturnAddress2] = useState(actionData?.formData?.returnAddress2 || shop.returnAddress2 || shop.address2 || "");
  const [returnCity, setReturnCity] = useState(actionData?.formData?.returnCity || shop.returnCity || shop.city || "");
  const [returnState, setReturnState] = useState(actionData?.formData?.returnState || shop.returnState || shop.state || "");
  const [returnPincode, setReturnPincode] = useState(actionData?.formData?.returnPincode || shop.returnPincode || shop.pincode || "");
  const [returnPhone, setReturnPhone] = useState(actionData?.formData?.returnPhone || shop.returnPhone || shop.phone || "");
  
  const [autoGenerateLabels, setAutoGenerateLabels] = useState(actionData?.formData?.autoGenerateLabels || shop.autoGenerateLabels || false);
  const [autoPrintLabels, setAutoPrintLabels] = useState(actionData?.formData?.autoPrintLabels || shop.autoPrintLabels || false);
  const [autoAssignTracking, setAutoAssignTracking] = useState(actionData?.formData?.autoAssignTracking || shop.autoAssignTracking || false);
  
  const [printerName, setPrinterName] = useState(actionData?.formData?.printerName || shop.printerName || "");
  const [printQuality, setPrintQuality] = useState(actionData?.formData?.printQuality || shop.printQuality || "normal");
  const [labelMargins, setLabelMargins] = useState(actionData?.formData?.labelMargins || shop.labelMargins || "normal");

  const labelSizeOptions = [
    { label: "4×6 Thermal (100×150mm)", value: "4x6" },
    { label: "A5 (2 per A4)", value: "A5" },
    { label: "A4 Single (Full Page)", value: "A4_single" },
    { label: "A4 Multi (4 per Page)", value: "A4_multi" }
  ];

  const courierOptions = [
    { label: "Select default courier", value: "" },
    { label: "Blue Dart", value: "bluedart" },
    { label: "DTDC", value: "dtdc" },
    { label: "FedEx", value: "fedex" },
    { label: "DHL", value: "dhl" },
    { label: "India Post", value: "indiapost" },
    { label: "Ecom Express", value: "ecom" },
    { label: "Xpressbees", value: "xpressbees" }
  ];

  const printQualityOptions = [
    { label: "Draft", value: "draft" },
    { label: "Normal", value: "normal" },
    { label: "High", value: "high" }
  ];

  const marginOptions = [
    { label: "None", value: "none" },
    { label: "Small", value: "small" },
    { label: "Normal", value: "normal" },
    { label: "Large", value: "large" }
  ];

  const copyFromBusinessAddress = () => {
    setReturnAddress1(shop.address1 || "");
    setReturnAddress2(shop.address2 || "");
    setReturnCity(shop.city || "");
    setReturnState(shop.state || "");
    setReturnPincode(shop.pincode || "");
    setReturnPhone(shop.phone || "");
  };

  return (
    <Page
      title="Label Settings"
      backAction={{ url: "/app/settings" }}
      primaryAction={{
        content: "Save Settings",
        loading: isSubmitting,
        onAction: () => {
          document.getElementById("label-settings-form").requestSubmit();
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

        <Form method="post" id="label-settings-form">
          <input type="hidden" name="includeCompanyLogo" value={includeCompanyLogo} />
          <input type="hidden" name="includeReturnAddress" value={includeReturnAddress} />
          <input type="hidden" name="includeProductDetails" value={includeProductDetails} />
          <input type="hidden" name="includeBarcodes" value={includeBarcodes} />
          <input type="hidden" name="includeQRCodes" value={includeQRCodes} />
          <input type="hidden" name="autoGenerateLabels" value={autoGenerateLabels} />
          <input type="hidden" name="autoPrintLabels" value={autoPrintLabels} />
          <input type="hidden" name="autoAssignTracking" value={autoAssignTracking} />

          {/* Label Configuration */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Label Configuration</Text>
                
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      label="Label Prefix"
                      name="labelPrefix"
                      value={labelPrefix}
                      onChange={setLabelPrefix}
                      placeholder="LBL"
                      helpText="Prefix for label numbers (e.g., LBL001)"
                      required
                    />
                    <TextField
                      label="Starting Number"
                      name="labelStartNumber"
                      type="number"
                      value={labelStartNumber}
                      onChange={setLabelStartNumber}
                      min="1"
                      helpText="Starting number for label sequence"
                    />
                  </FormLayout.Group>
                  
                  <FormLayout.Group>
                    <Select
                      label="Default Label Size"
                      name="defaultLabelSize"
                      options={labelSizeOptions}
                      value={defaultLabelSize}
                      onChange={setDefaultLabelSize}
                      helpText="Default format for new labels"
                      required
                    />
                    <Select
                      label="Default Courier"
                      name="defaultCourier"
                      options={courierOptions}
                      value={defaultCourier}
                      onChange={setDefaultCourier}
                      helpText="Default courier service for new labels"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Display Settings */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Label Display Settings</Text>
                
                <FormLayout>
                  <BlockStack gap="300">
                    <Text variant="headingSm" as="h3">Include on Labels</Text>
                    
                    <Checkbox
                      label="Company logo"
                      checked={includeCompanyLogo}
                      onChange={setIncludeCompanyLogo}
                      helpText="Display your company logo on shipping labels"
                    />
                    
                    <Checkbox
                      label="Return address"
                      checked={includeReturnAddress}
                      onChange={setIncludeReturnAddress}
                      helpText="Include return address on labels"
                    />
                    
                    <Checkbox
                      label="Product details"
                      checked={includeProductDetails}
                      onChange={setIncludeProductDetails}
                      helpText="Show package contents on labels"
                    />
                    
                    <Checkbox
                      label="Barcodes"
                      checked={includeBarcodes}
                      onChange={setIncludeBarcodes}
                      helpText="Generate barcodes for tracking IDs"
                    />
                    
                    <Checkbox
                      label="QR codes"
                      checked={includeQRCodes}
                      onChange={setIncludeQRCodes}
                      helpText="Generate QR codes for tracking URLs"
                    />
                  </BlockStack>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Return Address */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h2">Return Address</Text>
                  <Button onClick={copyFromBusinessAddress}>
                    Copy from Business Address
                  </Button>
                </InlineStack>
                
                <FormLayout>
                  <TextField
                    label="Address Line 1"
                    name="returnAddress1"
                    value={returnAddress1}
                    onChange={setReturnAddress1}
                  />
                  
                  <TextField
                    label="Address Line 2"
                    name="returnAddress2"
                    value={returnAddress2}
                    onChange={setReturnAddress2}
                  />
                  
                  <FormLayout.Group>
                    <TextField
                      label="City"
                      name="returnCity"
                      value={returnCity}
                      onChange={setReturnCity}
                    />
                    <TextField
                      label="State"
                      name="returnState"
                      value={returnState}
                      onChange={setReturnState}
                    />
                  </FormLayout.Group>
                  
                  <FormLayout.Group>
                    <TextField
                      label="Pincode"
                      name="returnPincode"
                      value={returnPincode}
                      onChange={setReturnPincode}
                    />
                    <TextField
                      label="Phone"
                      name="returnPhone"
                      type="tel"
                      value={returnPhone}
                      onChange={setReturnPhone}
                    />
                  </FormLayout.Group>
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
                  <BlockStack gap="300">
                    <Checkbox
                      label="Auto-generate labels for new orders"
                      checked={autoGenerateLabels}
                      onChange={setAutoGenerateLabels}
                      helpText="Automatically create shipping labels when orders are placed"
                    />
                    
                    <Checkbox
                      label="Auto-print labels"
                      checked={autoPrintLabels}
                      onChange={setAutoPrintLabels}
                      helpText="Automatically print labels when generated"
                    />
                    
                    <Checkbox
                      label="Auto-assign tracking IDs"
                      checked={autoAssignTracking}
                      onChange={setAutoAssignTracking}
                      helpText="Automatically assign tracking IDs to new labels"
                    />
                  </BlockStack>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Print Settings */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Print Settings</Text>
                
                <FormLayout>
                  <TextField
                    label="Printer Name"
                    name="printerName"
                    value={printerName}
                    onChange={setPrinterName}
                    placeholder="Default printer"
                    helpText="Name of the printer to use for labels"
                  />
                  
                  <FormLayout.Group>
                    <Select
                      label="Print Quality"
                      name="printQuality"
                      options={printQualityOptions}
                      value={printQuality}
                      onChange={setPrintQuality}
                    />
                    <Select
                      label="Label Margins"
                      name="labelMargins"
                      options={marginOptions}
                      value={labelMargins}
                      onChange={setLabelMargins}
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Form>

        {/* Label Preview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Label Preview</Text>
              
              <div style={{
                border: '2px dashed #e1e3e5',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#fafbfb',
                textAlign: 'center'
              }}>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">
                    {defaultLabelSize === '4x6' ? '4×6 Thermal Label' : 
                     defaultLabelSize === 'A5' ? 'A5 Label' : 
                     defaultLabelSize === 'A4_single' ? 'A4 Single Label' : 
                     'A4 Multi Label'}
                  </Text>
                  
                  <Text variant="bodyMd" as="p">
                    Label: {labelPrefix}000001
                  </Text>
                  
                  {includeReturnAddress && returnAddress1 && (
                    <div>
                      <Text variant="bodySm" as="p" fontWeight="semibold">Return Address:</Text>
                      <Text variant="bodySm" as="p">
                        {returnAddress1}, {returnCity}, {returnState} {returnPincode}
                      </Text>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {includeBarcodes && <Text variant="bodySm" as="span">📊 Barcode</Text>}
                    {includeQRCodes && <Text variant="bodySm" as="span">📱 QR Code</Text>}
                    {includeProductDetails && <Text variant="bodySm" as="span">📦 Products</Text>}
                    {includeCompanyLogo && <Text variant="bodySm" as="span">🏢 Logo</Text>}
                  </div>
                  
                  <Text variant="bodySm" as="p" tone="subdued">
                    This is a preview of how your labels will appear.
                  </Text>
                </BlockStack>
              </div>
              
              <InlineStack align="center">
                <Button url="/app/labels/preview" external>
                  View Full Label Preview
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Courier Integration */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Courier Integration</Text>
              
              <Text variant="bodyMd" as="p">
                Connect with courier services to automatically generate tracking IDs and get real-time updates.
              </Text>
              
              <InlineStack gap="300">
                <Button url="/app/settings/couriers">
                  Manage Courier APIs
                </Button>
                <Button url="/app/help/courier-setup">
                  Setup Guide
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}