import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  ProgressBar,
  Text,
  Box,
  Icon,
  Divider,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { authenticateOrBypass } from "../utils/auth.server";
import { getAppSettings, createOrUpdateAppSettings } from "../models/AppSettings.server";

export const loader = async ({ request }) => {
  const { session } = await authenticateOrBypass(request);
  
  const settings = await getAppSettings(session.shop);
  
  // If settings exist and onboarding is complete, redirect to dashboard
  if (settings && settings.onboardingComplete) {
    return redirect("/app");
  }

  return json({
    shop: session.shop,
    settings: settings || {},
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticateOrBypass(request);
  const formData = await request.formData();
  
  const companyName = formData.get("companyName");
  const gstin = formData.get("gstin");
  const address = formData.get("address");
  const city = formData.get("city");
  const state = formData.get("state");
  const pincode = formData.get("pincode");
  const phone = formData.get("phone");
  const email = formData.get("email");
  const invoicePrefix = formData.get("invoicePrefix");
  
  try {
    await createOrUpdateAppSettings(session.shop, {
      companyName,
      gstin,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      invoicePrefix: invoicePrefix || "INV",
      currentInvoiceNumber: 1,
      onboardingComplete: true,
    });

    return redirect("/app?onboarded=true");
  } catch (error) {
    return json({ error: error.message }, { status: 400 });
  }
};

export default function Onboarding() {
  const { shop, settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: settings.companyName || "",
    gstin: settings.gstin || "",
    address: settings.address || "",
    city: settings.city || "",
    state: settings.state || "",
    pincode: settings.pincode || "",
    phone: settings.phone || "",
    email: settings.email || "",
    invoicePrefix: settings.invoicePrefix || "INV",
  });

  const isSubmitting = navigation.state === "submitting";
  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep1 = () => (
    <Card>
      <Box padding="400">
        <Text variant="headingMd" as="h2">Company Information</Text>
        <Box paddingBlockStart="400">
          <FormLayout>
            <TextField
              label="Company Name"
              value={formData.companyName}
              onChange={(value) => handleInputChange("companyName", value)}
              placeholder="Enter your company name"
              autoComplete="organization"
              requiredIndicator
            />
            <TextField
              label="GSTIN"
              value={formData.gstin}
              onChange={(value) => handleInputChange("gstin", value)}
              placeholder="22AAAAA0000A1Z5"
              helpText="15-digit GST Identification Number"
              requiredIndicator
            />
            <TextField
              label="Phone Number"
              value={formData.phone}
              onChange={(value) => handleInputChange("phone", value)}
              placeholder="+91 9876543210"
              type="tel"
              requiredIndicator
            />
            <TextField
              label="Email Address"
              value={formData.email}
              onChange={(value) => handleInputChange("email", value)}
              placeholder="company@example.com"
              type="email"
              requiredIndicator
            />
          </FormLayout>
        </Box>
      </Box>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <Box padding="400">
        <Text variant="headingMd" as="h2">Business Address</Text>
        <Box paddingBlockStart="400">
          <FormLayout>
            <TextField
              label="Address"
              value={formData.address}
              onChange={(value) => handleInputChange("address", value)}
              placeholder="Street address, building name, etc."
              multiline={3}
              requiredIndicator
            />
            <FormLayout.Group>
              <TextField
                label="City"
                value={formData.city}
                onChange={(value) => handleInputChange("city", value)}
                placeholder="City"
                requiredIndicator
              />
              <TextField
                label="State"
                value={formData.state}
                onChange={(value) => handleInputChange("state", value)}
                placeholder="State"
                requiredIndicator
              />
            </FormLayout.Group>
            <TextField
              label="PIN Code"
              value={formData.pincode}
              onChange={(value) => handleInputChange("pincode", value)}
              placeholder="123456"
              requiredIndicator
            />
          </FormLayout>
        </Box>
      </Box>
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <Box padding="400">
        <Text variant="headingMd" as="h2">Invoice Settings</Text>
        <Box paddingBlockStart="400">
          <FormLayout>
            <TextField
              label="Invoice Prefix"
              value={formData.invoicePrefix}
              onChange={(value) => handleInputChange("invoicePrefix", value)}
              placeholder="INV"
              helpText="This will be used as prefix for invoice numbers (e.g., INV-0001)"
            />
            <Banner status="info">
              <p>Your invoice numbering will start from {formData.invoicePrefix || "INV"}-0001</p>
            </Banner>
          </FormLayout>
        </Box>
      </Box>
    </Card>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.companyName && formData.gstin && formData.phone && formData.email;
      case 2:
        return formData.address && formData.city && formData.state && formData.pincode;
      case 3:
        return formData.invoicePrefix;
      default:
        return false;
    }
  };

  return (
    <Page
      title="Welcome to GST Invoice Manager"
      subtitle="Let's set up your company information to get started"
    >
      <Layout>
        <Layout.Section>
          {actionData?.error && (
            <Banner status="critical">
              <p>{actionData.error}</p>
            </Banner>
          )}
          
          <Card>
            <Box padding="400">
              <Box paddingBlockEnd="400">
                <Text variant="headingLg" as="h1">
                  Step {currentStep} of {totalSteps}
                </Text>
                <Box paddingBlockStart="200">
                  <ProgressBar progress={progress} size="small" />
                </Box>
              </Box>
              
              <Box paddingBlockStart="400">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  {[1, 2, 3].map((step) => (
                    <div key={step} style={{ display: "flex", alignItems: "center" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: step <= currentStep ? "#008060" : "#E1E3E5",
                          color: step <= currentStep ? "white" : "#6D7175",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          fontWeight: "600",
                        }}
                      >
                        {step < currentStep ? <Icon source={CheckIcon} /> : step}
                      </div>
                      {step < 3 && (
                        <div
                          style={{
                            width: "40px",
                            height: "2px",
                            backgroundColor: step < currentStep ? "#008060" : "#E1E3E5",
                            margin: "0 8px",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </Box>
            </Box>
          </Card>

          <Box paddingBlockStart="400">
            {renderStepContent()}
          </Box>

          <Box paddingBlockStart="400">
            <Card>
              <Box padding="400">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Button
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    variant="secondary"
                  >
                    Previous
                  </Button>
                  
                  {currentStep < totalSteps ? (
                    <Button
                      onClick={nextStep}
                      disabled={!isStepValid()}
                      variant="primary"
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Form method="post">
                      {Object.entries(formData).map(([key, value]) => (
                        <input key={key} type="hidden" name={key} value={value} />
                      ))}
                      <Button
                        submit
                        loading={isSubmitting}
                        disabled={!isStepValid()}
                        variant="primary"
                      >
                        Complete Setup
                      </Button>
                    </Form>
                  )}
                </div>
              </Box>
            </Card>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}