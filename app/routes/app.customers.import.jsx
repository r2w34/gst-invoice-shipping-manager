import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  BlockStack,
  Text,
  Banner,
  List,
  DropZone,
  InlineStack,
} from "@shopify/polaris";
import { useState, useCallback } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";
import { validateGSTIN } from "../utils/gst-calculator.js";

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
    const csvData = formData.get("csvData");
    
    if (!csvData) {
      return json({ 
        error: "Please provide CSV data to import" 
      }, { status: 400 });
    }

    // Parse CSV data
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return json({ 
        error: "CSV must contain at least a header row and one data row" 
      }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dataRows = lines.slice(1);

    // Validate required headers
    const requiredHeaders = ['first_name', 'last_name', 'email'];
    const missingHeaders = requiredHeaders.filter(header => 
      !headers.some(h => h.includes(header.replace('_', ' ')) || h.includes(header))
    );

    if (missingHeaders.length > 0) {
      return json({ 
        error: `Missing required columns: ${missingHeaders.join(', ')}. Please ensure your CSV has columns for first name, last name, and email.` 
      }, { status: 400 });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
      
      if (row.length !== headers.length) {
        results.errors.push(`Row ${i + 2}: Column count mismatch`);
        results.skipped++;
        continue;
      }

      try {
        // Map CSV columns to customer data
        const customerData = {};
        headers.forEach((header, index) => {
          const value = row[index];
          
          if (header.includes('first') && header.includes('name')) {
            customerData.firstName = value;
          } else if (header.includes('last') && header.includes('name')) {
            customerData.lastName = value;
          } else if (header.includes('email')) {
            customerData.email = value;
          } else if (header.includes('phone')) {
            customerData.phone = value;
          } else if (header.includes('address') && header.includes('1')) {
            customerData.address1 = value;
          } else if (header.includes('address') && header.includes('2')) {
            customerData.address2 = value;
          } else if (header.includes('city')) {
            customerData.city = value;
          } else if (header.includes('state')) {
            customerData.state = value;
          } else if (header.includes('pincode') || header.includes('zip')) {
            customerData.pincode = value;
          } else if (header.includes('gstin')) {
            customerData.gstin = value;
          } else if (header.includes('notes')) {
            customerData.notes = value;
          } else if (header.includes('tags')) {
            customerData.tags = value;
          }
        });

        // Validate required fields
        if (!customerData.firstName && !customerData.lastName) {
          results.errors.push(`Row ${i + 2}: First name or last name is required`);
          results.skipped++;
          continue;
        }

        // Check for duplicate email
        if (customerData.email) {
          const existingCustomer = await prisma.customer.findFirst({
            where: {
              shopId: shop.id,
              email: customerData.email
            }
          });

          if (existingCustomer) {
            results.errors.push(`Row ${i + 2}: Customer with email ${customerData.email} already exists`);
            results.skipped++;
            continue;
          }
        }

        // Validate GSTIN if provided
        let gstinValidated = false;
        if (customerData.gstin) {
          const gstinValidation = validateGSTIN(customerData.gstin);
          if (!gstinValidation.isValid) {
            results.errors.push(`Row ${i + 2}: Invalid GSTIN ${customerData.gstin}`);
            results.skipped++;
            continue;
          }
          customerData.gstin = gstinValidation.gstin;
          gstinValidated = true;
        }

        // Create customer
        await prisma.customer.create({
          data: {
            shopId: shop.id,
            firstName: customerData.firstName || '',
            lastName: customerData.lastName || '',
            email: customerData.email || null,
            phone: customerData.phone || null,
            address1: customerData.address1 || null,
            address2: customerData.address2 || null,
            city: customerData.city || null,
            state: customerData.state || null,
            pincode: customerData.pincode || null,
            country: 'India',
            gstin: customerData.gstin || null,
            gstinValidated,
            notes: customerData.notes || null,
            tags: customerData.tags || null
          }
        });

        results.imported++;

      } catch (error) {
        console.error(`Error importing row ${i + 2}:`, error);
        results.errors.push(`Row ${i + 2}: ${error.message}`);
        results.skipped++;
      }
    }

    return json({ 
      success: true,
      results 
    });

  } catch (error) {
    console.error("Error importing customers:", error);
    return json({ 
      error: "Failed to import customers. Please try again." 
    }, { status: 500 });
  }
};

export default function ImportCustomers() {
  const { shop } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [csvData, setCsvData] = useState("");
  const [files, setFiles] = useState([]);

  const handleDropZoneDrop = useCallback(
    (_dropFiles, acceptedFiles, _rejectedFiles) => {
      setFiles(acceptedFiles);
      
      // Read the first file
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          setCsvData(e.target.result);
        };
        reader.readAsText(file);
      }
    },
    [],
  );

  const fileUpload = !files.length && (
    <DropZone.FileUpload actionHint="or drop files to upload" />
  );

  const uploadedFiles = files.length > 0 && (
    <div>
      {files.map((file, index) => (
        <InlineStack key={index} align="center">
          <div>
            <Text variant="bodyMd" as="p">
              {file.name}
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              {file.size} bytes
            </Text>
          </div>
        </InlineStack>
      ))}
    </div>
  );

  return (
    <Page
      title="Import Customers"
      backAction={{ url: "/app/customers" }}
      primaryAction={{
        content: "Import Customers",
        loading: isSubmitting,
        disabled: !csvData.trim(),
        onAction: () => {
          document.getElementById("import-form").requestSubmit();
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
              <p>
                Import completed! {actionData.results.imported} customers imported, {actionData.results.skipped} skipped.
              </p>
              {actionData.results.errors.length > 0 && (
                <List>
                  {actionData.results.errors.slice(0, 10).map((error, index) => (
                    <List.Item key={index}>{error}</List.Item>
                  ))}
                  {actionData.results.errors.length > 10 && (
                    <List.Item>... and {actionData.results.errors.length - 10} more errors</List.Item>
                  )}
                </List>
              )}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">CSV Format Requirements</Text>
              <Text variant="bodyMd" as="p">
                Your CSV file should include the following columns (case-insensitive):
              </Text>
              <List type="bullet">
                <List.Item><strong>first_name</strong> - Customer's first name (required)</List.Item>
                <List.Item><strong>last_name</strong> - Customer's last name (required)</List.Item>
                <List.Item><strong>email</strong> - Customer's email address (required, must be unique)</List.Item>
                <List.Item><strong>phone</strong> - Customer's phone number (optional)</List.Item>
                <List.Item><strong>address_1</strong> - Primary address line (optional)</List.Item>
                <List.Item><strong>address_2</strong> - Secondary address line (optional)</List.Item>
                <List.Item><strong>city</strong> - City name (optional)</List.Item>
                <List.Item><strong>state</strong> - State name (optional)</List.Item>
                <List.Item><strong>pincode</strong> - Postal code (optional)</List.Item>
                <List.Item><strong>gstin</strong> - GST Identification Number (optional, will be validated)</List.Item>
                <List.Item><strong>tags</strong> - Comma-separated tags (optional)</List.Item>
                <List.Item><strong>notes</strong> - Additional notes (optional)</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Form method="post" id="import-form">
          <input type="hidden" name="csvData" value={csvData} />
          
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Upload CSV File</Text>
                
                <DropZone onDrop={handleDropZoneDrop} accept=".csv,text/csv">
                  {uploadedFiles}
                  {fileUpload}
                </DropZone>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Or Paste CSV Data</Text>
                
                <TextField
                  label="CSV Data"
                  value={csvData}
                  onChange={setCsvData}
                  multiline={10}
                  placeholder="first_name,last_name,email,phone,city,state,gstin
John,Doe,john@example.com,+919876543210,Mumbai,Maharashtra,27AAPFU0939F1ZV
Jane,Smith,jane@example.com,+919876543211,Delhi,Delhi,"
                  helpText="Paste your CSV data here, including the header row"
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Form>
      </Layout>
    </Page>
  );
}