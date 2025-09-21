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
  Badge,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";
import { validateGSTIN, INDIAN_STATES } from "../utils/gst-calculator.js";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  const customer = await prisma.customer.findFirst({
    where: { 
      id: params.id,
      shopId: shop.id 
    }
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  return json({
    customer,
    shop,
    indianStates: Object.keys(INDIAN_STATES)
  });
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  const customer = await prisma.customer.findFirst({
    where: { 
      id: params.id,
      shopId: shop.id 
    }
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  try {
    const customerData = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address1: formData.get("address1"),
      address2: formData.get("address2"),
      city: formData.get("city"),
      state: formData.get("state"),
      pincode: formData.get("pincode"),
      country: formData.get("country") || "India",
      gstin: formData.get("gstin"),
      notes: formData.get("notes"),
      tags: formData.get("tags")
    };

    // Validate GSTIN if provided
    let gstinValidated = false;
    if (customerData.gstin) {
      const gstinValidation = validateGSTIN(customerData.gstin);
      if (!gstinValidation.isValid) {
        return json({ 
          error: `Invalid GSTIN: ${gstinValidation.error}`,
          formData: customerData
        }, { status: 400 });
      }
      customerData.gstin = gstinValidation.gstin;
      gstinValidated = true;
    }

    // Validate required fields
    if (!customerData.firstName && !customerData.lastName) {
      return json({ 
        error: "Either first name or last name is required",
        formData: customerData
      }, { status: 400 });
    }

    // Check for duplicate email (excluding current customer)
    if (customerData.email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          shopId: shop.id,
          email: customerData.email,
          id: { not: customer.id }
        }
      });

      if (existingCustomer) {
        return json({ 
          error: "A customer with this email already exists",
          formData: customerData
        }, { status: 400 });
      }
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone,
        address1: customerData.address1,
        address2: customerData.address2,
        city: customerData.city,
        state: customerData.state,
        pincode: customerData.pincode,
        country: customerData.country,
        gstin: customerData.gstin,
        gstinValidated,
        notes: customerData.notes,
        tags: customerData.tags
      }
    });

    return redirect(`/app/customers/${updatedCustomer.id}`);

  } catch (error) {
    console.error("Error updating customer:", error);
    return json({ 
      error: "Failed to update customer. Please try again.",
      formData: Object.fromEntries(formData)
    }, { status: 500 });
  }
};

export default function EditCustomer() {
  const { customer, shop, indianStates } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Form state - initialize with existing customer data
  const [firstName, setFirstName] = useState(actionData?.formData?.firstName || customer.firstName || "");
  const [lastName, setLastName] = useState(actionData?.formData?.lastName || customer.lastName || "");
  const [email, setEmail] = useState(actionData?.formData?.email || customer.email || "");
  const [phone, setPhone] = useState(actionData?.formData?.phone || customer.phone || "");
  const [address1, setAddress1] = useState(actionData?.formData?.address1 || customer.address1 || "");
  const [address2, setAddress2] = useState(actionData?.formData?.address2 || customer.address2 || "");
  const [city, setCity] = useState(actionData?.formData?.city || customer.city || "");
  const [state, setState] = useState(actionData?.formData?.state || customer.state || "");
  const [pincode, setPincode] = useState(actionData?.formData?.pincode || customer.pincode || "");
  const [gstin, setGstin] = useState(actionData?.formData?.gstin || customer.gstin || "");
  const [notes, setNotes] = useState(actionData?.formData?.notes || customer.notes || "");
  const [tags, setTags] = useState(actionData?.formData?.tags || customer.tags || "");

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

  const getGSTINValidationBadge = () => {
    if (!gstin) return null;
    if (!gstinValidation) return <Badge status="attention">Validating...</Badge>;
    if (gstinValidation.isValid) {
      return <Badge status="success">Valid GSTIN</Badge>;
    }
    return <Badge status="critical">Invalid GSTIN</Badge>;
  };

  return (
    <Page
      title={`Edit ${`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer'}`}
      backAction={{ url: `/app/customers/${customer.id}` }}
      primaryAction={{
        content: "Save Changes",
        loading: isSubmitting,
        onAction: () => {
          document.getElementById("customer-form").requestSubmit();
        }
      }}
      secondaryActions={[
        {
          content: 'View Customer',
          url: `/app/customers/${customer.id}`
        }
      ]}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner status="critical">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        <Form method="post" id="customer-form">
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Basic Information</Text>
                
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      label="First Name"
                      name="firstName"
                      value={firstName}
                      onChange={setFirstName}
                      autoComplete="given-name"
                    />
                    <TextField
                      label="Last Name"
                      name="lastName"
                      value={lastName}
                      onChange={setLastName}
                      autoComplete="family-name"
                    />
                  </FormLayout.Group>
                  
                  <FormLayout.Group>
                    <TextField
                      label="Email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      autoComplete="email"
                      helpText="Used for sending invoices and notifications"
                    />
                    <TextField
                      label="Phone"
                      name="phone"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      autoComplete="tel"
                      helpText="Include country code (e.g., +91)"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Address Information</Text>
                
                <FormLayout>
                  <TextField
                    label="Address Line 1"
                    name="address1"
                    value={address1}
                    onChange={setAddress1}
                    autoComplete="address-line1"
                  />
                  
                  <TextField
                    label="Address Line 2"
                    name="address2"
                    value={address2}
                    onChange={setAddress2}
                    autoComplete="address-line2"
                  />
                  
                  <FormLayout.Group>
                    <TextField
                      label="City"
                      name="city"
                      value={city}
                      onChange={setCity}
                      autoComplete="address-level2"
                    />
                    <Select
                      label="State"
                      name="state"
                      options={stateOptions}
                      value={state}
                      onChange={setState}
                    />
                  </FormLayout.Group>
                  
                  <FormLayout.Group>
                    <TextField
                      label="Pincode"
                      name="pincode"
                      value={pincode}
                      onChange={setPincode}
                      autoComplete="postal-code"
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

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">GST Information</Text>
                
                <FormLayout>
                  <TextField
                    label="GSTIN (Optional)"
                    name="gstin"
                    value={gstin}
                    onChange={setGstin}
                    placeholder="27AAPFU0939F1ZV"
                    helpText="15-character GST Identification Number"
                    suffix={getGSTINValidationBadge()}
                  />
                  
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

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Additional Information</Text>
                
                <FormLayout>
                  <TextField
                    label="Tags"
                    name="tags"
                    value={tags}
                    onChange={setTags}
                    placeholder="VIP, Wholesale, Regular (comma-separated)"
                    helpText="Add tags to categorize customers"
                  />
                  
                  <TextField
                    label="Notes"
                    name="notes"
                    value={notes}
                    onChange={setNotes}
                    multiline={4}
                    placeholder="Add any additional notes about this customer..."
                    helpText="Internal notes visible only to your team"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Form>
      </Layout>
    </Page>
  );
}