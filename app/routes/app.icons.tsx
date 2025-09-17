import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { IconShowcase, QuickActionCard, FeatureHighlight } from "../components/IconShowcase";
import { AnimatedIcon3D } from "../components/Icon3D";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export default function IconsPage() {
  return (
    <Page>
      <TitleBar title="3D Icons Gallery" />
      
      <BlockStack gap="500">
        {/* Hero Section */}
        <Layout>
          <Layout.Section>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '48px 32px',
              textAlign: 'center',
              color: 'white',
            }}>
              <BlockStack gap="400" align="center">
                <AnimatedIcon3D name="digital" size="xlarge" hover={true} pulse={true} />
                <BlockStack gap="200" align="center">
                  <Text variant="heading2xl" as="h1" alignment="center">
                    Beautiful 3D Icons
                  </Text>
                  <Text variant="bodyLg" alignment="center">
                    Premium 3D icons from Iconscout integrated seamlessly into your GST Invoice & Shipping Manager
                  </Text>
                </BlockStack>
              </BlockStack>
            </div>
          </Layout.Section>
        </Layout>

        {/* Quick Actions */}
        <Layout>
          <Layout.Section>
            <Text variant="headingLg" as="h2">Quick Actions</Text>
          </Layout.Section>
        </Layout>
        
        <Layout>
          <Layout.Section oneThird>
            <QuickActionCard
              icon="invoice"
              title="Create Invoice"
              description="Generate GST-compliant invoices with beautiful 3D icons"
              action={() => window.location.href = '/app/invoices/new'}
              variant="primary"
            />
          </Layout.Section>
          <Layout.Section oneThird>
            <QuickActionCard
              icon="shipping"
              title="Create Label"
              description="Design shipping labels with barcode and QR codes"
              action={() => window.location.href = '/app/labels/new'}
            />
          </Layout.Section>
          <Layout.Section oneThird>
            <QuickActionCard
              icon="customer"
              title="Manage Customers"
              description="Organize your customer database with CRM features"
              action={() => window.location.href = '/app/customers'}
            />
          </Layout.Section>
        </Layout>

        {/* Feature Highlights */}
        <Layout>
          <Layout.Section>
            <Text variant="headingLg" as="h2">Feature Highlights</Text>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section oneHalf>
            <FeatureHighlight
              icon="tax"
              title="GST Compliance"
              features={[
                "Automatic CGST/SGST/IGST calculations",
                "HSN/SAC code mapping",
                "Place of supply determination",
                "Sequential invoice numbering",
                "Digital signature support"
              ]}
            />
          </Layout.Section>
          <Layout.Section oneHalf>
            <FeatureHighlight
              icon="barcode"
              title="Advanced Shipping"
              features={[
                "Barcode generation (Code 128)",
                "QR code with tracking URLs",
                "Bulk label processing",
                "PDF export capabilities",
                "Courier integration ready"
              ]}
            />
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section oneHalf>
            <FeatureHighlight
              icon="analytics"
              title="Business Intelligence"
              features={[
                "Real-time dashboard analytics",
                "GST tax summary reports",
                "Customer behavior insights",
                "Sales performance tracking",
                "Export capabilities"
              ]}
            />
          </Layout.Section>
          <Layout.Section oneHalf>
            <FeatureHighlight
              icon="subscription"
              title="Subscription Management"
              features={[
                "Flexible pricing tiers",
                "Usage tracking and limits",
                "Trial period support",
                "Automatic billing integration",
                "Multi-user access control"
              ]}
            />
          </Layout.Section>
        </Layout>

        {/* Full Icon Showcase */}
        <Layout>
          <Layout.Section>
            <IconShowcase 
              title="Complete 3D Icons Collection"
              showLabels={true}
            />
          </Layout.Section>
        </Layout>

        {/* Technical Details */}
        <Layout>
          <Layout.Section>
            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #e2e8f0',
            }}>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">Technical Implementation</Text>
                <Text variant="bodySm" tone="subdued">
                  These 3D icons are sourced from Iconscout's premium collection and integrated using a custom React component system. 
                  Each icon includes hover animations, size variants, and optimized loading for the best user experience.
                </Text>
                <BlockStack gap="200">
                  <Text variant="bodyMd" as="p">
                    <strong>Features:</strong>
                  </Text>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    <li>High-quality PNG format with transparency</li>
                    <li>Multiple size variants (small, medium, large, xlarge)</li>
                    <li>Hover animations and transitions</li>
                    <li>Lazy loading for performance</li>
                    <li>Fallback handling for failed loads</li>
                    <li>TypeScript support with proper typing</li>
                  </ul>
                </BlockStack>
              </BlockStack>
            </div>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}