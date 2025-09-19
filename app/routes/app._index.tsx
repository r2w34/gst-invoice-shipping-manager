import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  ProgressBar,
  EmptyState,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { 
  DashboardIcon, 
  InvoiceIcon, 
  ShippingIcon, 
  CustomerIcon, 
  SettingsIcon, 
  AnalyticsIcon,
  AnimatedIcon3D 
} from "../components/Icon3D";
import { authenticateOrBypass } from "../utils/auth.server";
import { getInvoices } from "../models/Invoice.server";
import { getShippingLabels } from "../models/ShippingLabel.server";
import { getCustomers } from "../models/Customer.server";
import { getAppSettings, getSubscription, initializeAppSettings, initializeSubscription } from "../models/AppSettings.server";
import { SuccessAnimation } from "../components/SuccessAnimation";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticateOrBypass(request);
  const { shop } = session;

  // Initialize app settings and subscription if they don't exist
  await initializeAppSettings(shop);
  await initializeSubscription(shop);

  // Check if onboarding is needed
  const settings = await getAppSettings(shop);
  if (!settings?.onboardingComplete) {
    return redirect("/app/onboarding");
  }

  // Get dashboard data
  const [invoices, labels, customers, subscription] = await Promise.all([
    getInvoices(shop, { limit: 5 }),
    getShippingLabels(shop, { limit: 5 }),
    getCustomers(shop, { limit: 5 }),
    getSubscription(shop),
  ]);

  // Calculate stats
  const totalInvoices = await getInvoices(shop, { limit: 1000 });
  const totalLabels = await getShippingLabels(shop, { limit: 1000 });
  const totalCustomers = await getCustomers(shop, { limit: 1000 });

  return json({
    recentInvoices: invoices,
    recentLabels: labels,
    recentCustomers: customers.customers,
    settings,
    subscription,
    stats: {
      totalInvoices: totalInvoices.length,
      totalLabels: totalLabels.length,
      totalCustomers: totalCustomers.total,
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return json({ success: true });
};

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const { recentInvoices, recentLabels, recentCustomers, settings, subscription, stats } = data;

  // Check if user just completed onboarding
  useEffect(() => {
    if (searchParams.get("onboarded") === "true") {
      setShowSuccessAnimation(true);
    }
  }, [searchParams]);

  const getSubscriptionStatus = () => {
    if (!subscription) return { status: "Unknown", color: "critical" as const };
    
    switch (subscription.status) {
      case "trial":
        return { status: "Trial", color: "warning" as const };
      case "active":
        return { status: "Active", color: "success" as const };
      case "expired":
        return { status: "Expired", color: "critical" as const };
      case "cancelled":
        return { status: "Cancelled", color: "critical" as const };
      default:
        return { status: subscription.status, color: "info" as const };
    }
  };

  const subscriptionStatus = getSubscriptionStatus();

  const needsSetup = !settings?.sellerGSTIN || !settings?.sellerName;

  return (
    <Page>
      <TitleBar title="GST Invoice & Shipping Manager">
        <Button 
          variant="primary" 
          onClick={() => navigate("/app/invoices/new")}
          icon={<InvoiceIcon size="small" />}
        >
          Create Invoice
        </Button>
        <Button 
          onClick={() => navigate("/app/labels/new")}
          icon={<ShippingIcon size="small" />}
        >
          Create Label
        </Button>
      </TitleBar>
      
      <BlockStack gap="500">
        {/* Onboarding Success Banner */}
        {searchParams.get("onboarded") === "true" && (
          <Banner
            title="Welcome to GST Invoice Manager!"
            status="success"
            onDismiss={() => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete("onboarded");
              navigate(`/app?${newSearchParams.toString()}`, { replace: true });
            }}
          >
            <p>Your company information has been set up successfully. You can now start creating GST-compliant invoices and shipping labels.</p>
          </Banner>
        )}
        {needsSetup && (
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd" tone="critical">
                Setup Required
              </Text>
              <Text as="p">
                Please configure your GST settings before creating invoices.
              </Text>
              <InlineStack>
                <Button variant="primary" onClick={() => navigate("/app/settings")}>
                  Configure Settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Stats Cards */}
              <Layout>
                <Layout.Section oneThird>
                  <Card>
                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h3" variant="headingMd">Total Invoices</Text>
                        <InvoiceIcon size="large" />
                      </InlineStack>
                      <Text as="p" variant="heading2xl">{stats.totalInvoices}</Text>
                      <Text variant="bodySm" tone="subdued">
                        GST compliant invoices generated
                      </Text>
                    </BlockStack>
                  </Card>
                </Layout.Section>
                <Layout.Section oneThird>
                  <Card>
                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h3" variant="headingMd">Shipping Labels</Text>
                        <ShippingIcon size="large" />
                      </InlineStack>
                      <Text as="p" variant="heading2xl">{stats.totalLabels}</Text>
                      <Text variant="bodySm" tone="subdued">
                        Labels with barcodes created
                      </Text>
                    </BlockStack>
                  </Card>
                </Layout.Section>
                <Layout.Section oneThird>
                  <Card>
                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h3" variant="headingMd">Customers</Text>
                        <CustomerIcon size="large" />
                      </InlineStack>
                      <Text as="p" variant="heading2xl">{stats.totalCustomers}</Text>
                      <Text variant="bodySm" tone="subdued">
                        Active customer records
                      </Text>
                    </BlockStack>
                  </Card>
                </Layout.Section>
              </Layout>

              {/* Quick Actions */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Quick Actions</Text>
                  <Layout>
                    <Layout.Section oneThird>
                      <div 
                        style={{ 
                          textAlign: 'center', 
                          padding: '24px', 
                          cursor: 'pointer',
                          borderRadius: '12px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: '2px solid transparent',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.2)',
                        }}
                        onClick={() => navigate("/app/invoices/new")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.2)';
                        }}
                      >
                        <BlockStack gap="200" align="center">
                          <AnimatedIcon3D name="create" size="large" hover={true} />
                          <Text variant="bodyMd" tone="inherit">Create Invoice</Text>
                        </BlockStack>
                      </div>
                    </Layout.Section>
                    <Layout.Section oneThird>
                      <div 
                        style={{ 
                          textAlign: 'center', 
                          padding: '24px', 
                          cursor: 'pointer',
                          borderRadius: '12px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: '2px solid transparent',
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          color: 'white',
                          boxShadow: '0 4px 15px rgba(240, 147, 251, 0.2)',
                        }}
                        onClick={() => navigate("/app/labels/new")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(240, 147, 251, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(240, 147, 251, 0.2)';
                        }}
                      >
                        <BlockStack gap="200" align="center">
                          <AnimatedIcon3D name="package" size="large" hover={true} />
                          <Text variant="bodyMd" tone="inherit">Create Label</Text>
                        </BlockStack>
                      </div>
                    </Layout.Section>
                    <Layout.Section oneThird>
                      <div 
                        style={{ 
                          textAlign: 'center', 
                          padding: '24px', 
                          cursor: 'pointer',
                          borderRadius: '12px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: '2px solid transparent',
                          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          color: 'white',
                          boxShadow: '0 4px 15px rgba(79, 172, 254, 0.2)',
                        }}
                        onClick={() => navigate("/app/bulk-operations")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(79, 172, 254, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(79, 172, 254, 0.2)';
                        }}
                      >
                        <BlockStack gap="200" align="center">
                          <AnimatedIcon3D name="digital" size="large" hover={true} pulse={true} />
                          <Text variant="bodyMd" tone="inherit">Bulk Operations</Text>
                        </BlockStack>
                      </div>
                    </Layout.Section>
                  </Layout>
                </BlockStack>
              </Card>

              {/* Recent Invoices */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <InvoiceIcon size="medium" />
                      <Text as="h2" variant="headingMd">Recent Invoices</Text>
                    </InlineStack>
                    <Button onClick={() => navigate("/app/invoices")}>View All</Button>
                  </InlineStack>
                  
                  {recentInvoices.length === 0 ? (
                    <EmptyState
                      heading="No invoices yet"
                      action={{
                        content: "Create your first invoice",
                        onAction: () => navigate("/app/invoices/new"),
                      }}
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Start generating GST-compliant invoices for your orders.</p>
                    </EmptyState>
                  ) : (
                    <BlockStack gap="200">
                      {recentInvoices.map((invoice) => (
                        <Card key={invoice.id} padding="300">
                          <InlineStack align="space-between">
                            <BlockStack gap="100">
                              <Text as="h3" variant="headingSm">{invoice.invoiceNumber}</Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {invoice.customerName} • ₹{invoice.totalValue.toFixed(2)}
                              </Text>
                            </BlockStack>
                            <Button 
                              size="slim" 
                              onClick={() => navigate(`/app/invoices/${invoice.id}`)}
                            >
                              View
                            </Button>
                          </InlineStack>
                        </Card>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              {/* Recent Labels */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <ShippingIcon size="medium" />
                      <Text as="h2" variant="headingMd">Recent Shipping Labels</Text>
                    </InlineStack>
                    <Button onClick={() => navigate("/app/labels")}>View All</Button>
                  </InlineStack>
                  
                  {recentLabels.length === 0 ? (
                    <EmptyState
                      heading="No shipping labels yet"
                      action={{
                        content: "Create your first label",
                        onAction: () => navigate("/app/labels/new"),
                      }}
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Generate shipping labels with barcodes and tracking IDs.</p>
                    </EmptyState>
                  ) : (
                    <BlockStack gap="200">
                      {recentLabels.map((label) => (
                        <Card key={label.id} padding="300">
                          <InlineStack align="space-between">
                            <BlockStack gap="100">
                              <Text as="h3" variant="headingSm">{label.orderName}</Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {label.customerName} • {label.trackingId || "No tracking ID"}
                              </Text>
                            </BlockStack>
                            <Button 
                              size="slim" 
                              onClick={() => navigate(`/app/labels/${label.id}`)}
                            >
                              View
                            </Button>
                          </InlineStack>
                        </Card>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              {/* Subscription Status */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Subscription</Text>
                  <InlineStack gap="200">
                    <Badge tone={subscriptionStatus.color}>{subscriptionStatus.status}</Badge>
                    <Text as="p" variant="bodySm">
                      {subscription?.plan?.charAt(0).toUpperCase() + subscription?.plan?.slice(1)} Plan
                    </Text>
                  </InlineStack>
                  
                  {subscription?.status === "trial" && subscription?.trialEndsAt && (
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}
                      </Text>
                      <ProgressBar 
                        progress={Math.max(0, Math.min(100, 
                          ((new Date().getTime() - new Date(subscription.createdAt).getTime()) / 
                           (new Date(subscription.trialEndsAt).getTime() - new Date(subscription.createdAt).getTime())) * 100
                        ))}
                        size="small"
                      />
                    </BlockStack>
                  )}
                  
                  <Button onClick={() => navigate("/app/subscription")}>
                    Manage Subscription
                  </Button>
                </BlockStack>
              </Card>

              {/* Quick Actions */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Quick Actions</Text>
                  <BlockStack gap="200">
                    <Button 
                      fullWidth 
                      onClick={() => navigate("/app/invoices/new")}
                    >
                      Create Invoice
                    </Button>
                    <Button 
                      fullWidth 
                      onClick={() => navigate("/app/labels/new")}
                    >
                      Create Shipping Label
                    </Button>
                    <Button 
                      fullWidth 
                      onClick={() => navigate("/app/customers")}
                    >
                      Manage Customers
                    </Button>
                    <Button 
                      fullWidth 
                      onClick={() => navigate("/app/settings")}
                    >
                      App Settings
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Recent Customers */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">Recent Customers</Text>
                    <Button onClick={() => navigate("/app/customers")}>View All</Button>
                  </InlineStack>
                  
                  {recentCustomers.length === 0 ? (
                    <Text as="p" variant="bodySm" tone="subdued">
                      No customers yet
                    </Text>
                  ) : (
                    <BlockStack gap="200">
                      {recentCustomers.map((customer) => (
                        <Card key={customer.id} padding="300">
                          <BlockStack gap="100">
                            <Text as="h3" variant="headingSm">{customer.name}</Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {customer.email} • {customer.totalOrders} orders
                            </Text>
                          </BlockStack>
                        </Card>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
      
      {/* Success Animation */}
      <SuccessAnimation
        show={showSuccessAnimation}
        title="Welcome to GST Invoice Manager!"
        message="Your company setup is complete. You're ready to start creating invoices and labels!"
        onComplete={() => {
          setShowSuccessAnimation(false);
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete("onboarded");
          navigate(`/app?${newSearchParams.toString()}`, { replace: true });
        }}
      />
    </Page>
  );
}